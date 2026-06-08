import { Router, type Request, type Response } from 'express';
import { getAlerts, acknowledgeAlert, getAllVehicles } from '../repository/dataStore.js';

const router = Router();

router.get('/', (req: Request, res: Response): void => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const batchNo = req.query.batchNo as string | undefined;

  const result = getAlerts(page, pageSize, batchNo);
  res.status(200).json({
    success: true,
    data: result.data,
    pagination: {
      page,
      pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize),
    },
  });
});

router.put('/:id/acknowledge', (req: Request, res: Response): void => {
  const { id } = req.params;
  const success = acknowledgeAlert(id);
  if (success) {
    res.status(200).json({ success: true });
  } else {
    res.status(404).json({ success: false, error: 'Alert not found' });
  }
});

router.get('/vehicles', (_req: Request, res: Response): void => {
  const vehicles = getAllVehicles();
  res.status(200).json({ success: true, data: vehicles });
});

export default router;
