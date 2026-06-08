import { Router, type Request, type Response } from 'express';
import { getSnapshotsByBatch, verifyHash, getRecentSnapshots, getChainHeight } from '../services/fabricService.js';
import { getAllBatches, getBatch } from '../repository/dataStore.js';

const router = Router();

router.get('/batch/:batchNo', (req: Request, res: Response): void => {
  const { batchNo } = req.params;
  const snapshots = getSnapshotsByBatch(batchNo);
  const batch = getBatch(batchNo);
  res.status(200).json({
    success: true,
    data: {
      batch,
      snapshots,
    },
  });
});

router.post('/verify', (req: Request, res: Response): void => {
  const { originalData, hash } = req.body;
  if (!originalData || !hash) {
    res.status(400).json({ success: false, error: 'Missing originalData or hash' });
    return;
  }
  const result = verifyHash(originalData, hash);
  res.status(200).json({
    success: true,
    valid: result.valid,
    computedHash: result.computedHash,
    providedHash: hash,
  });
});

router.get('/recent', (req: Request, res: Response): void => {
  const count = parseInt(req.query.count as string) || 10;
  const snapshots = getRecentSnapshots(count);
  res.status(200).json({ success: true, data: snapshots });
});

router.get('/chain-info', (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: {
      chainHeight: getChainHeight(),
      network: 'Hyperledger Fabric (Simulated)',
      channel: 'vaccine-cold-chain',
      chaincode: 'temp_audit_cc',
    },
  });
});

router.get('/batches', (_req: Request, res: Response): void => {
  const batches = getAllBatches();
  res.status(200).json({ success: true, data: batches });
});

export default router;
