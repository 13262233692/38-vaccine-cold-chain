import type { Vehicle, AlertRecord, Batch } from '../../shared/types.js';

const vehicles: Map<string, Vehicle> = new Map();
const alerts: AlertRecord[] = [];
const batches: Map<string, Batch> = new Map();

export function initStore() {
  const initialVehicles: Vehicle[] = [
    { id: 'VH-001', name: '冷藏车-京A88901', batchNo: 'BATCH-2026-001', lastTemperature: 4.2, lastHumidity: 45, consecutiveOverTemp: 0, status: 'safe', lastReportTime: Date.now(), x: 180, y: 280 },
    { id: 'VH-002', name: '冷藏车-沪B66203', batchNo: 'BATCH-2026-001', lastTemperature: 5.1, lastHumidity: 42, consecutiveOverTemp: 0, status: 'safe', lastReportTime: Date.now(), x: 420, y: 180 },
    { id: 'VH-003', name: '冷藏车-粤C44012', batchNo: 'BATCH-2026-002', lastTemperature: 3.8, lastHumidity: 48, consecutiveOverTemp: 0, status: 'safe', lastReportTime: Date.now(), x: 680, y: 320 },
    { id: 'VH-004', name: '冷藏车-川D55178', batchNo: 'BATCH-2026-002', lastTemperature: 7.5, lastHumidity: 50, consecutiveOverTemp: 1, status: 'warning', lastReportTime: Date.now(), x: 300, y: 450 },
    { id: 'VH-005', name: '冷藏车-浙E77320', batchNo: 'BATCH-2026-003', lastTemperature: 8.3, lastHumidity: 55, consecutiveOverTemp: 2, status: 'warning', lastReportTime: Date.now(), x: 550, y: 420 },
    { id: 'VH-006', name: '冷藏车-鲁F22056', batchNo: 'BATCH-2026-003', lastTemperature: 10.5, lastHumidity: 60, consecutiveOverTemp: 3, status: 'danger', lastReportTime: Date.now(), x: 820, y: 200 },
  ];

  initialVehicles.forEach((v) => vehicles.set(v.id, v));

  const initialBatches: Batch[] = [
    { batchNo: 'BATCH-2026-001', origin: '北京生物制品所', destination: '武汉疾控中心', status: 'in_transit', createdAt: Date.now() - 86400000 },
    { batchNo: 'BATCH-2026-002', origin: '上海生物研究所', destination: '广州第一人民医院', status: 'in_transit', createdAt: Date.now() - 43200000 },
    { batchNo: 'BATCH-2026-003', origin: '成都生物制品所', destination: '济南疾控中心', status: 'in_transit', createdAt: Date.now() - 21600000 },
  ];

  initialBatches.forEach((b) => batches.set(b.batchNo, b));
}

export function getVehicle(id: string): Vehicle | undefined {
  return vehicles.get(id);
}

export function getAllVehicles(): Vehicle[] {
  return Array.from(vehicles.values());
}

export function updateVehicle(vehicle: Vehicle): void {
  vehicles.set(vehicle.id, vehicle);
}

export function addAlert(alert: AlertRecord): void {
  alerts.unshift(alert);
}

export function getAlerts(page: number, pageSize: number, batchNo?: string): { data: AlertRecord[]; total: number } {
  let filtered = alerts;
  if (batchNo) {
    filtered = alerts.filter((a) => a.batchNo === batchNo);
  }
  const total = filtered.length;
  const data = filtered.slice((page - 1) * pageSize, page * pageSize);
  return { data, total };
}

export function acknowledgeAlert(id: string): boolean {
  const alert = alerts.find((a) => a.id === id);
  if (alert) {
    alert.acknowledged = true;
    return true;
  }
  return false;
}

export function getBatch(batchNo: string): Batch | undefined {
  return batches.get(batchNo);
}

export function getAllBatches(): Batch[] {
  return Array.from(batches.values());
}

export function getOnlineVehicleCount(): number {
  const threshold = Date.now() - 30000;
  return getAllVehicles().filter((v) => v.lastReportTime > threshold).length;
}

export function getAverageTemperature(): number {
  const all = getAllVehicles();
  if (all.length === 0) return 0;
  return all.reduce((sum, v) => sum + v.lastTemperature, 0) / all.length;
}

export function removeAlert(id: string): boolean {
  const idx = alerts.findIndex((a) => a.id === id);
  if (idx !== -1) {
    alerts.splice(idx, 1);
    return true;
  }
  return false;
}

export function getActiveAlertCount(): number {
  return alerts.filter((a) => !a.acknowledged).length;
}
