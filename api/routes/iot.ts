import { Router, type Request, type Response } from 'express';
import { processIoTReport } from '../services/sseService.js';
import { getVehicle } from '../repository/dataStore.js';
import type { IoTReportRequest } from '../../shared/types.js';

const router = Router();

router.post('/report', (req: Request, res: Response): void => {
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
    const result = processIoTReport(vehicleId, batchNo, readings);
    res.status(200).json({
      success: true,
      hash: result.hash,
      blockNumber: result.blockNumber,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
