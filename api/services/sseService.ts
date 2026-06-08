import type { Response } from 'express';
import { submitToChain } from './fabricService.js';
import { getVehicle, updateVehicle, addAlert } from '../repository/dataStore.js';
import type { SSEEvent } from '../../shared/types.js';

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

export function processIoTReport(
  vehicleId: string,
  batchNo: string,
  readings: { timestamp: number; temperature: number; humidity: number; probeId: string }[]
): { hash: string; blockNumber: number; isOverTemp: boolean; consecutiveOverTemp: number } {
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

  const snapshot = submitToChain(tempMin, tempMax, batchNo, vehicleId, avgHumidity, now);

  const isOverTemp = avgTemp < 2 || avgTemp > 8;
  let consecutiveOverTemp = isOverTemp ? vehicle.consecutiveOverTemp + 1 : 0;

  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (consecutiveOverTemp >= 3) {
    status = 'danger';
  } else if (consecutiveOverTemp >= 1) {
    status = 'warning';
  }

  vehicle.lastTemperature = Math.round(avgTemp * 10) / 10;
  vehicle.lastHumidity = Math.round(avgHumidity * 10) / 10;
  vehicle.consecutiveOverTemp = consecutiveOverTemp;
  vehicle.status = status;
  vehicle.lastReportTime = now;
  vehicle.batchNo = batchNo;
  updateVehicle(vehicle);

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
      hash: snapshot.hash,
      blockNumber: snapshot.blockNumber,
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
      hash: snapshot.hash,
      blockNumber: snapshot.blockNumber,
    },
  });

  return {
    hash: snapshot.hash,
    blockNumber: snapshot.blockNumber,
    isOverTemp,
    consecutiveOverTemp,
  };
}
