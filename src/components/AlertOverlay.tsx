import { useStore } from '@/store/useStore';
import { useEffect } from 'react';
import { useAlarm } from '@/hooks/useAlarm';
import { AlertTriangle, X } from 'lucide-react';

export default function AlertOverlay() {
  const { isAlertActive, alertVehicleId, vehicles, setAlertActive } = useStore();
  useAlarm(isAlertActive);

  const alertVehicle = vehicles.find((v) => v.id === alertVehicleId);

  useEffect(() => {
    if (isAlertActive) {
      document.title = '⚠️ 超温告警! - 疫苗冷链监控系统';
    } else {
      document.title = '疫苗冷链监控系统 - Vaccine Cold Chain Monitor';
    }
  }, [isAlertActive]);

  if (!isAlertActive) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-alert-red/20 backdrop-blur-sm alert-pulse">
      <div className="absolute inset-0 bg-gradient-to-b from-alert-red/10 via-transparent to-alert-red/10 pointer-events-none" />

      <div className="relative bg-deep-space/95 border-2 border-alert-red rounded-xl p-8 max-w-lg w-full mx-4 shadow-2xl shadow-alert-red-glow animate-slide-in-up">
        <button
          onClick={() => setAlertActive(false)}
          className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-alert-red/20 flex items-center justify-center mb-4 animate-pulse">
            <AlertTriangle className="w-10 h-10 text-alert-red" />
          </div>

          <h2 className="font-display text-3xl font-bold text-alert-red mb-2 glow-text">
            超温告警
          </h2>
          <p className="text-gray-400 font-body text-sm mb-4">
            检测到冷藏车温度连续三次超出 2-8°C 黄金温区
          </p>

          {alertVehicle && (
            <div className="w-full bg-deep-space-light border border-alert-red/30 rounded-lg p-4 mb-4 text-left font-body">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">车辆编号</span>
                  <p className="text-white font-mono">{alertVehicle.id}</p>
                </div>
                <div>
                  <span className="text-gray-500">车辆名称</span>
                  <p className="text-white">{alertVehicle.name}</p>
                </div>
                <div>
                  <span className="text-gray-500">当前温度</span>
                  <p className="text-alert-red font-display text-xl font-bold">{alertVehicle.lastTemperature}°C</p>
                </div>
                <div>
                  <span className="text-gray-500">连续超温</span>
                  <p className="text-alert-red font-display text-xl font-bold">{alertVehicle.consecutiveOverTemp} 次</p>
                </div>
                <div>
                  <span className="text-gray-500">运输批次</span>
                  <p className="text-ice-blue font-mono text-xs">{alertVehicle.batchNo}</p>
                </div>
                <div>
                  <span className="text-gray-500">湿度</span>
                  <p className="text-white">{alertVehicle.lastHumidity}%</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setAlertActive(false)}
            className="px-6 py-2 bg-alert-red/20 border border-alert-red text-alert-red font-display font-semibold tracking-wider rounded hover:bg-alert-red/30 transition-colors"
          >
            确认告警
          </button>
        </div>
      </div>
    </div>
  );
}
