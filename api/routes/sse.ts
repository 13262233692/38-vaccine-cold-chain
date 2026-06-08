import { Router, type Request, type Response } from 'express';
import { addSSEClient } from '../services/sseService.js';

const router = Router();

router.get('/stream', (req: Request, res: Response): void => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', data: { message: 'SSE connection established' } })}\n\n`);

  addSSEClient(res);
});

export default router;
