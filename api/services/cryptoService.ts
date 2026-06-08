import crypto from 'crypto';

export function computeHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function buildSnapshotPayload(
  temperatureMin: number,
  temperatureMax: number,
  batchNo: string,
  timestamp: number
): string {
  return JSON.stringify({
    temperatureMin,
    temperatureMax,
    batchNo,
    timestamp,
  });
}
