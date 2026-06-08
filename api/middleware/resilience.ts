import { type Request, type Response, type NextFunction } from 'express';
import { dbConnectionPool } from '../resilience/ConnectionPool.js';

interface ConcurrencyLimiterOptions {
  maxConcurrent: number;
  timeoutMs: number;
}

export function concurrencyLimiter(options: Partial<ConcurrencyLimiterOptions> = {}) {
  const maxConcurrent = options.maxConcurrent || 100;
  const timeoutMs = options.timeoutMs || 30000;
  let activeRequests = 0;
  const queue: Array<{ resolve: () => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> }> = [];

  return (req: Request, res: Response, next: NextFunction): void => {
    const attemptAcquire = () => {
      if (activeRequests < maxConcurrent) {
        activeRequests++;
        res.on('finish', () => {
          activeRequests--;
          if (queue.length > 0) {
            const waiter = queue.shift()!;
            clearTimeout(waiter.timer);
            waiter.resolve();
          }
        });
        next();
        return true;
      }
      return false;
    };

    if (attemptAcquire()) return;

    const promise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = queue.findIndex((w) => w.resolve === resolve);
        if (idx !== -1) {
          queue.splice(idx, 1);
          reject(new Error(`Server overloaded: max concurrent requests (${maxConcurrent}) reached, timeout after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      queue.push({ resolve, reject, timer });
    });

    promise
      .then(() => {
        if (attemptAcquire()) return;
        res.status(503).json({ success: false, error: 'Service temporarily unavailable' });
      })
      .catch((err) => {
        res.status(503).json({ success: false, error: err.message });
      });
  };
}

export function requestTimeout(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: `Request timeout after ${timeoutMs}ms`,
        });
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    next();
  };
}

export function poolMetricsLogger() {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const poolMetrics = dbConnectionPool.getMetrics();
    res.setHeader('X-Pool-Active', poolMetrics.activeConnections.toString());
    res.setHeader('X-Pool-Idle', poolMetrics.idleConnections.toString());
    res.setHeader('X-Pool-Peak', poolMetrics.peakConnections.toString());
    next();
  };
}
