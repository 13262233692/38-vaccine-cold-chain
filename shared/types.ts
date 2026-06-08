export interface VehicleReading {
  timestamp: number;
  temperature: number;
  humidity: number;
  probeId: string;
}

export interface IoTReportRequest {
  vehicleId: string;
  batchNo: string;
  readings: VehicleReading[];
}

export interface IoTReportResponse {
  success: boolean;
  hash: string;
  blockNumber: number;
  timestamp: number;
}

export interface Vehicle {
  id: string;
  name: string;
  batchNo: string;
  lastTemperature: number;
  lastHumidity: number;
  consecutiveOverTemp: number;
  status: 'safe' | 'warning' | 'danger';
  lastReportTime: number;
  x: number;
  y: number;
}

export interface TemperatureSnapshot {
  id: string;
  vehicleId: string;
  batchNo: string;
  temperatureMin: number;
  temperatureMax: number;
  humidity: number;
  timestamp: number;
  hash: string;
  blockNumber: number;
}

export interface AlertRecord {
  id: string;
  vehicleId: string;
  batchNo: string;
  readings: { temperature: number; timestamp: number }[];
  triggeredAt: number;
  acknowledged: boolean;
}

export interface Batch {
  batchNo: string;
  origin: string;
  destination: string;
  status: string;
  createdAt: number;
}

export interface SSEEventData {
  vehicleId: string;
  batchNo: string;
  temperature: number;
  humidity: number;
  timestamp: number;
  isOverTemp: boolean;
  consecutiveOverTemp: number;
  hash?: string;
  blockNumber?: number;
}

export type SSEEvent = {
  type: 'temperature' | 'alert' | 'blockchain' | 'circuit_breaker';
  data: SSEEventData;
};

export interface CircuitBreakerSSEData {
  circuitName: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  totalRejected: number;
  totalTimeouts: number;
  timestamp: number;
}

export interface VerifyRequest {
  originalData: string;
  hash: string;
}

export interface VerifyResponse {
  valid: boolean;
  computedHash: string;
  providedHash: string;
}
