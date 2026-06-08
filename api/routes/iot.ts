import { Router, type Request, type Response } from 'express';
import { processIoTReport } from '../services/sseService.js';
import { getVehicle } from '../repository/dataStore.js';
import type { IoTReportRequest } from '../../shared/types.js';
import { isBlockchainException, CircuitBreakerOpenException, TransactionRollbackException } from '../errors/BlockchainException.js';

const router = Router();

router.post('/report', async (req: Request, res: Response): Promise<void> => {
  const { vehicleId, batchNo, readings } = req.body as IoTReportRequest;

  if (!vehicleId || !batchNo || !readings || !Array.isArray(readings) || readings.length === 0) {
    res.status(400).json({ success: false, error: 'Missing required fields: vehicleId, batchNo, readings[]' });
    return;
  }

  const vehicle = getVehicle(vehicleId);
  if (!vehicle) {
    res.status(404).json({ success: false, error: `Vehicle ${vehicleId} not found` });
    return;
  }

  try {
    const result = await processIoTReport(vehicleId, batchNo, readings);

    if (result.fabricFailed) {
      res.status(202).json({
        success: true,
        warning: 'Fabric operation failed - data stored locally only, pending retry',
        fabricError: result.fabricError,
        hash: result.hash,
        blockNumber: result.blockNumber,
        timestamp: Date.now(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      hash: result.hash,
      blockNumber: result.blockNumber,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    if (err instanceof CircuitBreakerOpenException) {
      res.status(503).json({
        success: false,
        error: 'Circuit breaker is OPEN - Fabric network unavailable',
        code: err.code,
        retryAfter: 30,
      });
      return;
    }

    if (err instanceof TransactionRollbackException) {
      res.status(502).json({
        success: false,
        error: 'Transaction rolled back due to Fabric network failure',
        rollbackSuccess: err.rollbackSuccess,
        originalError: err.originalError.message,
      });
      return;
    }

    if (isBlockchainException(err)) {
      res.status(502).json({
        success: false,
        error: err.message,
        code: err.code,
        retryable: err.retryable,
      });
      return;
    }

    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
