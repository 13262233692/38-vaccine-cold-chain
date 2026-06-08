import { create } from 'zustand';
import type { SSEEventData, Vehicle, AlertRecord, TemperatureSnapshot, Batch, CircuitBreakerSSEData } from '../../shared/types';

interface AppState {
  vehicles: Vehicle[];
  alerts: AlertRecord[];
  recentSnapshots: TemperatureSnapshot[];
  batches: Batch[];
  selectedVehicleId: string | null;
  isAlertActive: boolean;
  alertVehicleId: string | null;
  sseConnected: boolean;
  chainHeight: number;
  circuitBreaker: CircuitBreakerSSEData | null;

  setVehicles: (vehicles: Vehicle[]) => void;
  updateVehicleFromSSE: (data: SSEEventData) => void;
  addAlert: (alert: AlertRecord) => void;
  setRecentSnapshots: (snapshots: TemperatureSnapshot[]) => void;
  setBatches: (batches: Batch[]) => void;
  setSelectedVehicleId: (id: string | null) => void;
  setAlertActive: (active: boolean, vehicleId?: string | null) => void;
  setSseConnected: (connected: boolean) => void;
  setChainHeight: (height: number) => void;
  setCircuitBreaker: (data: CircuitBreakerSSEData) => void;
}

export const useStore = create<AppState>((set) => ({
  vehicles: [],
  alerts: [],
  recentSnapshots: [],
  batches: [],
  selectedVehicleId: null,
  isAlertActive: false,
  alertVehicleId: null,
  sseConnected: false,
  chainHeight: 0,
  circuitBreaker: null,

  setVehicles: (vehicles) => set({ vehicles }),

  updateVehicleFromSSE: (data) =>
    set((state) => {
      const vehicles = state.vehicles.map((v) =>
        v.id === data.vehicleId
          ? {
              ...v,
              lastTemperature: data.temperature,
              lastHumidity: data.humidity,
              consecutiveOverTemp: data.consecutiveOverTemp,
              status: (data.consecutiveOverTemp >= 3 ? 'danger' : data.consecutiveOverTemp >= 1 ? 'warning' : 'safe') as 'safe' | 'warning' | 'danger',
              lastReportTime: data.timestamp,
            }
          : v
      );
      return {
        vehicles,
        isAlertActive: data.consecutiveOverTemp >= 3,
        alertVehicleId: data.consecutiveOverTemp >= 3 ? data.vehicleId : state.isAlertActive ? state.alertVehicleId : null,
      };
    }),

  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),

  setRecentSnapshots: (recentSnapshots) => set({ recentSnapshots }),

  setBatches: (batches) => set({ batches }),

  setSelectedVehicleId: (selectedVehicleId) => set({ selectedVehicleId }),

  setAlertActive: (active, vehicleId) => set({ isAlertActive: active, alertVehicleId: vehicleId ?? null }),

  setSseConnected: (sseConnected) => set({ sseConnected }),

  setChainHeight: (chainHeight) => set({ chainHeight }),

  setCircuitBreaker: (circuitBreaker) => set({ circuitBreaker }),
}));
