import { dbConnectionPool } from './ConnectionPool.js';
import { CircuitBreaker } from './CircuitBreaker.js';
import { TransactionRollbackException, isBlockchainException } from '../errors/BlockchainException.js';

export const fabricCircuitBreaker = new CircuitBreaker('fabric-endorsement', {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenMaxAttempts: 3,
  monitorIntervalMs: 10000,
  operationTimeoutMs: 10000,
});

let sseBroadcastFn: ((event: { type: string; data: unknown }) => void) | null = null;

export function registerSSEBroadcast(fn: (event: { type: string; data: unknown }) => void): void {
  sseBroadcastFn = fn;
}

fabricCircuitBreaker.onStateChange((from, to) => {
  const metrics = fabricCircuitBreaker.getMetrics();
  if (sseBroadcastFn) {
    sseBroadcastFn({
      type: 'circuit_breaker',
      data: {
        circuitName: 'fabric-endorsement',
        state: to,
        failureCount: metrics.failureCount,
        totalRejected: metrics.totalRejected,
        totalTimeouts: metrics.totalTimeouts,
        timestamp: Date.now(),
      },
    });
  }
});

export interface TransactionContext {
  connectionAcquired: boolean;
  releaseConnection: (() => void) | null;
  committed: boolean;
  rolledBack: boolean;
  operations: Array<{ type: string; data: unknown }>;
}

export function createTransactionContext(): TransactionContext {
  return {
    connectionAcquired: false,
    releaseConnection: null,
    committed: false,
    rolledBack: false,
    operations: [],
  };
}

export async function acquireConnection(ctx: TransactionContext): Promise<void> {
  if (ctx.connectionAcquired) return;
  const release = await dbConnectionPool.acquire();
  ctx.releaseConnection = release;
  ctx.connectionAcquired = true;
}

export function recordOperation(ctx: TransactionContext, type: string, data: unknown): void {
  ctx.operations.push({ type, data });
}

export async function executeWithTransaction<TDb, TFabric>(
  dbOperation: (ctx: TransactionContext) => TDb | Promise<TDb>,
  fabricOperation: (ctx: TransactionContext) => TFabric | Promise<TFabric>,
  rollbackOperation: (ctx: TransactionContext) => void | Promise<void>
): Promise<TFabric> {
  const ctx = createTransactionContext();

  try {
    await acquireConnection(ctx);

    const dbResult = await dbOperation(ctx);

    let fabricResult: TFabric;
    try {
      fabricResult = await fabricCircuitBreaker.execute(async () => fabricOperation(ctx));
    } catch (fabricError) {
      console.error('[TransactionManager] Fabric operation failed, rolling back DB transaction:', (fabricError as Error).message);

      try {
        await rollbackOperation(ctx);
        ctx.rolledBack = true;
      } catch (rollbackError) {
        console.error('[TransactionManager] Rollback ALSO failed!', (rollbackError as Error).message);
        throw new TransactionRollbackException(fabricError as Error, false);
      }

      ctx.rolledBack = true;
      throw new TransactionRollbackException(fabricError as Error, true);
    }

    ctx.committed = true;
    return fabricResult;
  } catch (err) {
    if (!ctx.rolledBack && !ctx.committed) {
      try {
        await rollbackOperation(ctx);
        ctx.rolledBack = true;
      } catch (rollbackError) {
        console.error('[TransactionManager] Emergency rollback failed:', (rollbackError as Error).message);
      }
    }
    throw err;
  } finally {
    if (ctx.releaseConnection) {
      ctx.releaseConnection();
      ctx.connectionAcquired = false;
      ctx.releaseConnection = null;
    }
  }
}

export function getSystemHealth(): {
  circuitBreaker: ReturnType<CircuitBreaker['getMetrics']>;
  connectionPool: ReturnType<typeof dbConnectionPool.getMetrics>;
} {
  return {
    circuitBreaker: fabricCircuitBreaker.getMetrics(),
    connectionPool: dbConnectionPool.getMetrics(),
  };
}

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startPoolCleanup(intervalMs: number = 60000): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const cleaned = dbConnectionPool.cleanupIdle();
    if (cleaned > 0) {
      console.log(`[ConnectionPool] Cleaned up ${cleaned} idle connections`);
    }
  }, intervalMs);
}

export function stopPoolCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
