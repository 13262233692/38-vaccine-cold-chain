import { useStore } from '@/store/useStore';
import { Truck, Wifi, WifiOff, Thermometer, AlertTriangle, Link } from 'lucide-react';

export default function StatusBar() {
  const { vehicles, sseConnected, isAlertActive } = useStore();
  const onlineCount = vehicles.filter((v) => Date.now() - v.lastReportTime < 30000).length;
  const alertCount = vehicles.filter((v) => v.status === 'danger').length;

  return (
    <div className="h-12 bg-deep-space-light border-b border-panel-border flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Thermometer className="w-5 h-5 text-ice-blue" />
          <span className="font-display text-lg font-bold tracking-wider text-ice-blue">
            VACCINE COLD CHAIN
          </span>
        </div>
        <span className="text-xs text-ice-blue-dim font-body">疫苗冷链监控系统</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm font-body">
          <Truck className="w-4 h-4 text-ice-blue" />
          <span className="text-gray-400">在线车辆</span>
          <span className="text-white font-mono font-semibold">{onlineCount}</span>
        </div>

        <div className="flex items-center gap-2 text-sm font-body">
          <AlertTriangle className={`w-4 h-4 ${alertCount > 0 ? 'text-alert-red' : 'text-gray-500'}`} />
          <span className="text-gray-400">告警</span>
          <span className={`font-mono font-semibold ${alertCount > 0 ? 'text-alert-red' : 'text-gray-500'}`}>
            {alertCount}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm font-body">
          <Link className="w-4 h-4 text-safe-green" />
          <span className="text-gray-400">链高</span>
          <span className="text-safe-green font-mono font-semibold">{vehicles.length}</span>
        </div>

        <div className="flex items-center gap-2 text-sm font-body">
          {sseConnected ? (
            <Wifi className="w-4 h-4 text-safe-green animate-pulse" />
          ) : (
            <WifiOff className="w-4 h-4 text-alert-red" />
          )}
          <span className={`text-xs ${sseConnected ? 'text-safe-green' : 'text-alert-red'}`}>
            {sseConnected ? 'SSE 已连接' : 'SSE 断开'}
          </span>
        </div>

        <div className="font-mono text-sm text-ice-blue-dim" id="live-clock">
          {new Date().toLocaleTimeString('zh-CN', { hour12: false })}
        </div>
      </div>

      {isAlertActive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-alert-red alert-pulse" />
      )}
    </div>
  );
}
