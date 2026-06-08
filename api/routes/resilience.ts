import { Router, type Request, type Response } from 'express';
import { fabricCircuitBreaker, getSystemHealth } from '../resilience/TransactionManager.js';

const router = Router();

router.get('/status', (_req: Request, res: Response): void => {
  const health = getSystemHealth();
  res.status(200).json({
    success: true,
    data: health,
  });
});

router.post('/circuit-breaker/force-open', (_req: Request, res: Response): void => {
  fabricCircuitBreaker.forceOpen();
  res.status(200).json({
    success: true,
    message: 'Circuit breaker forced to OPEN state',
    state: fabricCircuitBreaker.getMetrics().state,
  });
});

router.post('/circuit-breaker/force-close', (_req: Request, res: Response): void => {
  fabricCircuitBreaker.forceClose();
  res.status(200).json({
    success: true,
    message: 'Circuit breaker forced to CLOSED state',
    state: fabricCircuitBreaker.getMetrics().state,
  });
});

router.post('/circuit-breaker/reset', (_req: Request, res: Response): void => {
  fabricCircuitBreaker.reset();
  res.status(200).json({
    success: true,
    message: 'Circuit breaker reset to CLOSED state with cleared metrics',
    state: fabricCircuitBreaker.getMetrics().state,
  });
});

export default router;
