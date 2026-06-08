import { Router, type Request, type Response } from 'express';
import { calculateMKT, submitInvalidationTransaction, getInvalidations, getInvalidationByBatch } from '../services/mktService.js';
import { getSnapshotsByBatch } from '../services/fabricService.js';
import { executeWithTransaction } from '../resilience/TransactionManager.js';
import { isBlockchainException, TransactionRollbackException } from '../errors/BlockchainException.js';
import { broadcastSSE } from '../services/sseService.js';

const router = Router();

router.post('/calculate', (req: Request, res: Response): void => {
  const { batchNo, readings, threshold } = req.body as {
    batchNo: string;
    readings: { temperature: number; timestamp: number }[];
    threshold?: number;
  };

  if (!batchNo || !readings || !Array.isArray(readings) || readings.length === 0) {
    res.status(400).json({ success: false, error: 'Missing batchNo or readings array' });
    return;
  }

  try {
    const mktResult = calculateMKT(batchNo, readings, threshold || 8);
    res.status(200).json({ success: true, data: mktResult });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

router.post('/evaluate', async (req: Request, res: Response): Promise<void> => {
  const { batchNo, threshold } = req.body as { batchNo: string; threshold?: number };

  if (!batchNo) {
    res.status(400).json({ success: false, error: 'Missing batchNo' });
    return;
  }

  const snapshots = getSnapshotsByBatch(batchNo);
  if (snapshots.length === 0) {
    res.status(404).json({ success: false, error: `No temperature data found for batch ${batchNo}` });
    return;
  }

  const readings = snapshots.map((s) => ({
    temperature: (s.temperatureMin + s.temperatureMax) / 2,
    timestamp: s.timestamp,
  }));

  try {
    const mktResult = calculateMKT(batchNo, readings, threshold || 8);

    if (!mktResult.exceedsThreshold) {
      res.status(200).json({
        success: true,
        data: { mktResult, decision: 'COMPLIANT', message: `MKT ${mktResult.mktCelsius}°C ≤ 阈值 ${mktResult.thresholdCelsius}°C，批次合规有效` },
      });
      return;
    }

    let invalidationRecord;
    let fabricFailed = false;

    try {
      await executeWithTransaction(
        async () => {},
        async () => {
          invalidationRecord = await submitInvalidationTransaction(mktResult);
          return invalidationRecord;
        },
        async () => {
          console.warn(`[MKT Route] Invalidation transaction failed for batch ${batchNo}, DB rollback executed`);
        }
      );
    } catch (err) {
      if (err instanceof TransactionRollbackException || isBlockchainException(err)) {
        fabricFailed = true;
      } else {
        throw err;
      }
    }

    if (fabricFailed || !invalidationRecord) {
      res.status(202).json({
        success: true,
        data: {
          mktResult,
          decision: 'COMPLIANCE_VOIDED_PENDING',
          message: `MKT ${mktResult.mktCelsius}°C > 阈值 ${mktResult.thresholdCelsius}°C，合规作废决定已生成但链上提交失败，待重试`,
          fabricFailed: true,
        },
      });
      return;
    }

    broadcastSSE({
      type: 'mkt_result',
      data: {
        vehicleId: '',
        batchNo,
        temperature: mktResult.mktCelsius,
        humidity: 0,
        timestamp: mktResult.timestamp,
        isOverTemp: true,
        consecutiveOverTemp: 0,
      } as any,
    });

    res.status(200).json({
      success: true,
      data: {
        mktResult,
        decision: 'COMPLIANCE_VOIDED',
        invalidation: invalidationRecord,
        message: `MKT ${mktResult.mktCelsius}°C > 阈值 ${mktResult.thresholdCelsius}°C，合规作废交易已上链，区块 #${invalidationRecord.blockNumber}`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.get('/invalidations', (_req: Request, res: Response): void => {
  const records = getInvalidations();
  res.status(200).json({ success: true, data: records });
});

router.get('/invalidations/:batchNo', (req: Request, res: Response): void => {
  const { batchNo } = req.params;
  const record = getInvalidationByBatch(batchNo);
  if (!record) {
    res.status(404).json({ success: false, error: `No invalidation record for batch ${batchNo}` });
    return;
  }
  res.status(200).json({ success: true, data: record });
});

export default router;
