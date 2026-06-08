import { processIoTReport } from '../services/sseService.js';
import { getAllVehicles } from '../repository/dataStore.js';

let simulatorInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

const VEHICLE_PROFILES: Record<string, { baseTemp: number; variance: number; driftChance: number }> = {
  'VH-001': { baseTemp: 4.5, variance: 1.0, driftChance: 0.05 },
  'VH-002': { baseTemp: 5.0, variance: 1.2, driftChance: 0.08 },
  'VH-003': { baseTemp: 4.0, variance: 0.8, driftChance: 0.03 },
  'VH-004': { baseTemp: 6.5, variance: 1.5, driftChance: 0.25 },
  'VH-005': { baseTemp: 7.0, variance: 1.8, driftChance: 0.35 },
  'VH-006': { baseTemp: 9.5, variance: 2.0, driftChance: 0.7 },
};

function generateReading(vehicleId: string) {
  const vehicle = getAllVehicles().find((v) => v.id === vehicleId);
  if (!vehicle) return;

  const profile = VEHICLE_PROFILES[vehicleId] || { baseTemp: 5, variance: 1, driftChance: 0.1 };

  let temperature: number;
  if (Math.random() < profile.driftChance) {
    temperature = 8 + Math.random() * 4;
  } else {
    temperature = profile.baseTemp + (Math.random() - 0.5) * 2 * profile.variance;
  }

  temperature = Math.round(temperature * 10) / 10;

  const now = Date.now();
  const readings = [];
  for (let i = 0; i < 3; i++) {
    readings.push({
      timestamp: now - (2 - i) * 1000,
      temperature: Math.round((temperature + (Math.random() - 0.5) * 0.6) * 10) / 10,
      humidity: Math.round((40 + Math.random() * 20) * 10) / 10,
      probeId: `PROBE-${vehicleId}-01`,
    });
  }

  try {
    processIoTReport(vehicleId, vehicle.batchNo, readings);
  } catch (err) {
    console.error(`IoT simulator error for ${vehicleId}:`, err);
  }
}

export function startSimulator(intervalMs: number = 3000): void {
  if (isRunning) return;
  isRunning = true;

  const vehicleIds = getAllVehicles().map((v) => v.id);

  simulatorInterval = setInterval(() => {
    vehicleIds.forEach((id) => generateReading(id));
  }, intervalMs);

  console.log(`IoT simulator started with ${vehicleIds.length} vehicles, interval ${intervalMs}ms`);
}

export function stopSimulator(): void {
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
    simulatorInterval = null;
  }
  isRunning = false;
  console.log('IoT simulator stopped');
}
