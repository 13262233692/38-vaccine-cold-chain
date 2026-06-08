export interface ConnectionPoolConfig {
  maxConnections: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
}

export const DEFAULT_POOL_CONFIG: ConnectionPoolConfig = {
  maxConnections: 50,
  acquireTimeoutMs: 5000,
  idleTimeoutMs: 30000,
};

interface PooledConnection {
  id: number;
  acquired: boolean;
  acquiredAt: number | null;
  lastUsed: number;
}

interface PoolMetrics {
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalAcquired: number;
  totalReleased: number;
  totalTimeouts: number;
  peakConnections: number;
}

type ReleaseFunction = () => void;

export class ConnectionPool {
  private config: ConnectionPoolConfig;
  private connections: PooledConnection[] = [];
  private waitQueue: Array<{
    resolve: (release: ReleaseFunction) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];
  private metrics: PoolMetrics = {
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
    totalAcquired: 0,
    totalReleased: 0,
    totalTimeouts: 0,
    peakConnections: 0,
  };
  private nextId = 1;

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };
  }

  async acquire(): Promise<ReleaseFunction> {
    const idleConn = this.connections.find((c) => !c.acquired);
    if (idleConn) {
      idleConn.acquired = true;
      idleConn.acquiredAt = Date.now();
      idleConn.lastUsed = Date.now();
      this.metrics.activeConnections++;
      this.metrics.idleConnections--;
      this.metrics.totalAcquired++;
      this.updatePeak();
      return this.createReleaseFunction(idleConn);
    }

    if (this.connections.length < this.config.maxConnections) {
      const conn: PooledConnection = {
        id: this.nextId++,
        acquired: true,
        acquiredAt: Date.now(),
        lastUsed: Date.now(),
      };
      this.connections.push(conn);
      this.metrics.activeConnections++;
      this.metrics.totalAcquired++;
      this.updatePeak();
      return this.createReleaseFunction(conn);
    }

    return new Promise<ReleaseFunction>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waitQueue.findIndex((w) => w.resolve === resolve);
        if (idx !== -1) {
          this.waitQueue.splice(idx, 1);
          this.metrics.waitingRequests--;
          this.metrics.totalTimeouts++;
          reject(new Error(`Connection pool exhausted: acquire timed out after ${this.config.acquireTimeoutMs}ms (active: ${this.metrics.activeConnections}, max: ${this.config.maxConnections})`));
        }
      }, this.config.acquireTimeoutMs);

      this.waitQueue.push({ resolve, reject, timer });
      this.metrics.waitingRequests++;
    });
  }

  private createReleaseFunction(conn: PooledConnection): ReleaseFunction {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      conn.acquired = false;
      conn.acquiredAt = null;
      conn.lastUsed = Date.now();
      this.metrics.activeConnections--;
      this.metrics.totalReleased++;

      if (this.waitQueue.length > 0) {
        const waiter = this.waitQueue.shift()!;
        clearTimeout(waiter.timer);
        this.metrics.waitingRequests--;
        conn.acquired = true;
        conn.acquiredAt = Date.now();
        conn.lastUsed = Date.now();
        this.metrics.activeConnections++;
        this.metrics.totalAcquired++;
        waiter.resolve(this.createReleaseFunction(conn));
      } else {
        this.metrics.idleConnections++;
      }
    };
  }

  private updatePeak(): void {
    if (this.metrics.activeConnections > this.metrics.peakConnections) {
      this.metrics.peakConnections = this.metrics.activeConnections;
    }
  }

  getMetrics(): Readonly<PoolMetrics> {
    return { ...this.metrics };
  }

  cleanupIdle(): number {
    const now = Date.now();
    let cleaned = 0;
    this.connections = this.connections.filter((c) => {
      if (!c.acquired && c.acquiredAt === null && now - c.lastUsed > this.config.idleTimeoutMs) {
        this.metrics.idleConnections--;
        cleaned++;
        return false;
      }
      return true;
    });
    return cleaned;
  }
}

export const dbConnectionPool = new ConnectionPool({
  maxConnections: 50,
  acquireTimeoutMs: 5000,
  idleTimeoutMs: 30000,
});
