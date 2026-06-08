import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import iotRoutes from './routes/iot.js'
import sseRoutes from './routes/sse.js'
import alertRoutes from './routes/alerts.js'
import auditRoutes from './routes/audit.js'
import resilienceRoutes from './routes/resilience.js'
import mktRoutes from './routes/mkt.js'
import { initStore } from './repository/dataStore.js'
import { concurrencyLimiter, requestTimeout, poolMetricsLogger } from './middleware/resilience.js'
import { getSystemHealth, startPoolCleanup } from './resilience/TransactionManager.js'
import { isBlockchainException, CircuitBreakerOpenException, TransactionRollbackException } from './errors/BlockchainException.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use(requestTimeout(30000))
app.use(concurrencyLimiter({ maxConcurrent: 100, timeoutMs: 30000 }))
app.use(poolMetricsLogger())

initStore()

app.use('/api/iot', iotRoutes)
app.use('/api/sse', sseRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/resilience', resilienceRoutes)
app.use('/api/mkt', mktRoutes)

app.get('/api/health', (_req: Request, res: Response) => {
  const health = getSystemHealth();
  res.status(200).json({
    success: true,
    message: 'ok',
    resilience: {
      circuitBreaker: {
        state: health.circuitBreaker.state,
        failureCount: health.circuitBreaker.failureCount,
        totalRejected: health.circuitBreaker.totalRejected,
        totalTimeouts: health.circuitBreaker.totalTimeouts,
      },
      connectionPool: {
        active: health.connectionPool.activeConnections,
        idle: health.connectionPool.idleConnections,
        peak: health.connectionPool.peakConnections,
        totalTimeouts: health.connectionPool.totalTimeouts,
      },
    },
  });
});

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  if (isBlockchainException(error)) {
    res.status(502).json({
      success: false,
      error: error.message,
      code: (error as any).code,
      retryable: (error as any).retryable,
    });
    return;
  }

  if (error instanceof CircuitBreakerOpenException) {
    res.status(503).json({
      success: false,
      error: error.message,
      code: error.code,
      retryAfter: 30,
    });
    return;
  }

  if (error instanceof TransactionRollbackException) {
    res.status(502).json({
      success: false,
      error: error.message,
      rollbackSuccess: error.rollbackSuccess,
    });
    return;
  }

  if (error.message && error.message.includes('Connection pool exhausted')) {
    res.status(503).json({
      success: false,
      error: 'Database connection pool exhausted - too many concurrent requests',
    });
    return;
  }

  if (error.message && error.message.includes('Server overloaded')) {
    res.status(503).json({
      success: false,
      error: error.message,
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: 'Server internal error',
  });
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

startPoolCleanup(60000);

export default app
