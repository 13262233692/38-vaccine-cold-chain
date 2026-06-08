import { useStore } from '@/store/useStore';
import { X, Thermometer, Droplets, FileCode, Clock } from 'lucide-react';

export default function VehicleDetail() {
  const { selectedVehicleId, vehicles, setSelectedVehicleId } = useStore();

  if (!selectedVehicleId) return null;

  const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
  if (!vehicle) return null;

  const statusColor = vehicle.status === 'danger' ? 'text-alert-red' : vehicle.status === 'warning' ? 'text-warn-amber' : 'text-safe-green';
  const statusBg = vehicle.status === 'danger' ? 'border-alert-red/40' : vehicle.status === 'warning' ? 'border-warn-amber/40' : 'border-safe-green/40';
  const statusText = vehicle.status === 'danger' ? '超温告警' : vehicle.status === 'warning' ? '温度偏离' : '温区正常';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedVehicleId(null)}>
      <div
        className="bg-deep-space-light border border-panel-border rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl animate-slide-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${vehicle.status === 'danger' ? 'bg-alert-red animate-pulse' : vehicle.status === 'warning' ? 'bg-warn-amber' : 'bg-safe-green'}`} />
            <h3 className="font-display text-xl font-bold text-white">{vehicle.name}</h3>
          </div>
          <button onClick={() => setSelectedVehicleId(null)} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`border ${statusBg} rounded-lg p-4 mb-4`}>
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className={`w-5 h-5 ${statusColor}`} />
            <span className={`font-display text-3xl font-bold ${statusColor} glow-text`}>
              {vehicle.lastTemperature}°C
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor} bg-deep-space`}>{statusText}</span>
          </div>
          <div className="w-full bg-deep-space rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${vehicle.status === 'danger' ? 'bg-alert-red' : vehicle.status === 'warning' ? 'bg-warn-amber' : 'bg-safe-green'}`}
              style={{ width: `${Math.min(Math.max((vehicle.lastTemperature / 12) * 100, 5), 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>0°C</span>
            <span className="text-safe-green">2°C</span>
            <span className="text-safe-green">8°C</span>
            <span>12°C</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm font-body">
          <div className="bg-deep-space rounded-lg p-3">
            <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
              <Droplets className="w-3 h-3" /> 湿度
            </div>
            <span className="text-white font-mono">{vehicle.lastHumidity}%</span>
          </div>
          <div className="bg-deep-space rounded-lg p-3">
            <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
              <FileCode className="w-3 h-3" /> 批次号
            </div>
            <span className="text-ice-blue font-mono text-xs">{vehicle.batchNo}</span>
          </div>
          <div className="bg-deep-space rounded-lg p-3">
            <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
              <AlertTriangle className="w-3 h-3" /> 连续超温
            </div>
            <span className={`font-mono font-bold ${vehicle.consecutiveOverTemp > 0 ? 'text-alert-red' : 'text-safe-green'}`}>
              {vehicle.consecutiveOverTemp} 次
            </span>
          </div>
          <div className="bg-deep-space rounded-lg p-3">
            <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
              <Clock className="w-3 h-3" /> 最后上报
            </div>
            <span className="text-white font-mono text-xs">
              {new Date(vehicle.lastReportTime).toLocaleTimeString('zh-CN', { hour12: false })}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-panel-border">
          <p className="text-gray-500 text-xs font-body">
            🚛 车辆 {vehicle.id} | 批次 {vehicle.batchNo} | 黄金温区 2-8°C
          </p>
        </div>
      </div>
    </div>
  );
}

function AlertTriangle(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  );
}
