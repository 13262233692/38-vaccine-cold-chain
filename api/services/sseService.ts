import type { Response } from 'express';
import { submitToChain } from './fabricService.js';
import { getVehicle, updateVehicle, addAlert, removeAlert } from '../repository/dataStore.js';
import type { SSEEvent } from '../../shared/types.js';
import { executeWithTransaction, createTransactionContext, type TransactionContext } from '../resilience/TransactionManager.js';
import { isBlockchainException, TransactionRollbackException, CircuitBreakerOpenException } from '../errors/BlockchainException.js';

const sseClients: Set<Response> = new Set();

export function addSSEClient(res: Response): void {
  sseClients.add(res);
  res.on('close', () => {
    sseClients.delete(res);
  });
}

export function broadcastSSE(event: SSEEvent): void {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(data);
    } catch {
      sseClients.delete(client);
    }
  });
}

interface ProcessingResult {
  hash?: string;
  blockNumber?: number;
  isOverTemp: boolean;
  consecutiveOverTemp: number;
  fabricFailed: boolean;
  fabricError?: string;
}

export async function processIoTReport(
  vehicleId: string,
  batchNo: string,
  readings: { timestamp: number; temperature: number; humidity: number; probeId: string }[]
): Promise<ProcessingResult> {
  const vehicle = getVehicle(vehicleId);
  if (!vehicle) {
    throw new Error(`Vehicle ${vehicleId} not found`);
  }

  const temperatures = readings.map((r) => r.temperature);
  const tempMin = Math.min(...temperatures);
  const tempMax = Math.max(...temperatures);
  const avgTemp = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
  const avgHumidity = readings.reduce((a, b) => a + b.humidity, 0) / readings.length;
  const now = Date.now();

  const isOverTemp = avgTemp < 2 || avgTemp > 8;
  const prevConsecutiveOverTemp = vehicle.consecutiveOverTemp;
  let consecutiveOverTemp = isOverTemp ? vehicle.consecutiveOverTemp + 1 : 0;

  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (consecutiveOverTemp >= 3) {
    status = 'danger';
  } else if (consecutiveOverTemp >= 1) {
    status = 'warning';
  }

  const originalVehicle = { ...vehicle };

  let snapshotHash: string | undefined;
  let snapshotBlock: number | undefined;
  let fabricFailed = false;
  let fabricError: string | undefined;

  try {
    const result = await executeWithTransaction(
      async (ctx) => {
        vehicle.lastTemperature = Math.round(avgTemp * 10) / 10;
        vehicle.lastHumidity = Math.round(avgHumidity * 10) / 10;
        vehicle.consecutiveOverTemp = consecutiveOverTemp;
        vehicle.status = status;
        vehicle.lastReportTime = now;
        vehicle.batchNo = batchNo;
        updateVehicle(vehicle);
      },
      async (ctx) => {
        const snapshot = await submitToChain(tempMin, tempMax, batchNo, vehicleId, avgHumidity, now);
        snapshotHash = snapshot.hash;
        snapshotBlock = snapshot.blockNumber;
        return snapshot;
      },
      async (ctx) => {
        vehicle.lastTemperature = originalVehicle.lastTemperature;
        vehicle.lastHumidity = originalVehicle.lastHumidity;
        vehicle.consecutiveOverTemp = originalVehicle.consecutiveOverTemp;
        vehicle.status = originalVehicle.status;
        vehicle.lastReportTime = originalVehicle.lastReportTime;
        vehicle.batchNo = originalVehicle.batchNo;
        updateVehicle(vehicle);

        console.warn(`[TransactionManager] Rolled back vehicle ${vehicleId} DB state (Fabric call failed)`);
      }
    );
  } catch (err) {
    if (err instanceof TransactionRollbackException || isBlockchainException(err)) {
      fabricFailed = true;
      fabricError = (err as Error).message;

      if (isBlockchainException(err) && !fabricFailed) {
        vehicle.lastTemperature = Math.round(avgTemp * 10) / 10;
        vehicle.lastHumidity = Math.round(avgHumidity * 10) / 10;
        vehicle.lastReportTime = now;
        updateVehicle(vehicle);
      }

      console.warn(`[SSE Service] Fabric operation failed for ${vehicleId}: ${fabricError}`);
    } else {
      throw err;
    }
  }

  if (!fabricFailed) {
    broadcastSSE({
      type: 'temperature',
      data: {
        vehicleId,
        batchNo,
        temperature: vehicle.lastTemperature,
        humidity: vehicle.lastHumidity,
        timestamp: now,
        isOverTemp,
        consecutiveOverTemp,
        hash: snapshotHash,
        blockNumber: snapshotBlock,
      },
    });

    if (consecutiveOverTemp >= 3) {
      const alertReadings = readings.slice(-3).map((r) => ({
        temperature: r.temperature,
        timestamp: r.timestamp,
      }));

      addAlert({
        id: `alert_${now}_${vehicleId}`,
        vehicleId,
        batchNo,
        readings: alertReadings,
        triggeredAt: now,
        acknowledged: false,
      });

      broadcastSSE({
        type: 'alert',
        data: {
          vehicleId,
          batchNo,
          temperature: vehicle.lastTemperature,
          humidity: vehicle.lastHumidity,
          timestamp: now,
          isOverTemp: true,
          consecutiveOverTemp,
        },
      });
    }

    broadcastSSE({
      type: 'blockchain',
      data: {
        vehicleId,
        batchNo,
        temperature: vehicle.lastTemperature,
        humidity: vehicle.lastHumidity,
        timestamp: now,
        isOverTemp,
        consecutiveOverTemp,
        hash: snapshotHash,
        blockNumber: snapshotBlock,
      },
    });
  } else {
    broadcastSSE({
      type: 'temperature',
      data: {
        vehicleId,
        batchNo,
        temperature: vehicle.lastTemperature,
        humidity: vehicle.lastHumidity,
        timestamp: now,
        isOverTemp,
        consecutiveOverTemp: vehicle.consecutiveOverTemp,
      },
    });
  }

  return {
    hash: snapshotHash,
    blockNumber: snapshotBlock,
    isOverTemp,
    consecutiveOverTemp: vehicle.consecutiveOverTemp,
    fabricFailed,
    fabricError,
  };
}
