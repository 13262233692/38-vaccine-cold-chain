import app from './app.js';
import { startSimulator } from './services/iotSimulator.js';
import { registerSSEBroadcast } from './resilience/TransactionManager.js';
import { broadcastSSE } from './services/sseService.js';

const PORT = process.env.PORT || 3001;

registerSSEBroadcast((event) => {
  broadcastSSE(event as any);
});

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
  startSimulator(3000);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
