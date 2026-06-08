import { computeHash, buildSnapshotPayload } from './cryptoService.js';
import type { TemperatureSnapshot } from '../../shared/types.js';

let blockCounter = 1000;

const chainStore: TemperatureSnapshot[] = [];

export function submitToChain(
  temperatureMin: number,
  temperatureMax: number,
  batchNo: string,
  vehicleId: string,
  humidity: number,
  timestamp: number
): TemperatureSnapshot {
  const payload = buildSnapshotPayload(temperatureMin, temperatureMax, batchNo, timestamp);
  const hash = computeHash(payload);
  blockCounter += 1;

  const snapshot: TemperatureSnapshot = {
    id: `snap_${blockCounter}`,
    vehicleId,
    batchNo,
    temperatureMin,
    temperatureMax,
    humidity,
    timestamp,
    hash,
    blockNumber: blockCounter,
  };

  chainStore.push(snapshot);
  return snapshot;
}

export function getSnapshotsByBatch(batchNo: string): TemperatureSnapshot[] {
  return chainStore.filter((s) => s.batchNo === batchNo).sort((a, b) => a.timestamp - b.timestamp);
}

export function verifyHash(originalData: string, providedHash: string): { valid: boolean; computedHash: string } {
  const computedHash = computeHash(originalData);
  return {
    valid: computedHash === providedHash,
    computedHash,
  };
}

export function getChainHeight(): number {
  return chainStore.length;
}

export function getRecentSnapshots(count: number): TemperatureSnapshot[] {
  return chainStore.slice(-count).reverse();
}
