import { useStore } from '@/store/useStore';
import { Truck, Thermometer, AlertTriangle, Link2, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

export default function KpiPanel() {
  const { vehicles, circuitBreaker } = useStore();
  const onlineCount = vehicles.filter((v) => Date.now() - v.lastReportTime < 30000).length;
  const avgTemp = vehicles.length > 0
    ? Math.round((vehicles.reduce((s, v) => s + v.lastTemperature, 0) / vehicles.length) * 10) / 10
    : 0;
  const alertCount = vehicles.filter((v) => v.status === 'danger').length;
  const chainHeight = vehicles.length;

  const cbState = circuitBreaker?.state || 'CLOSED';

  const kpis = [
    {
      icon: Truck,
      label: '在线车辆',
      value: onlineCount.toString(),
      color: 'text-ice-blue',
      borderColor: 'border-ice-blue/30',
    },
    {
      icon: Thermometer,
      label: '平均温度',
      value: `${avgTemp}°C`,
      color: avgTemp > 8 ? 'text-alert-red' : avgTemp > 6 ? 'text-warn-amber' : 'text-safe-green',
      borderColor: avgTemp > 8 ? 'border-alert-red/30' : avgTemp > 6 ? 'border-warn-amber/30' : 'border-safe-green/30',
    },
    {
      icon: AlertTriangle,
      label: '超温告警',
      value: alertCount.toString(),
      color: alertCount > 0 ? 'text-alert-red' : 'text-gray-500',
      borderColor: alertCount > 0 ? 'border-alert-red/30' : 'border-gray-700',
    },
    {
      icon: Link2,
      label: '上链记录',
      value: chainHeight.toString(),
      color: 'text-safe-green',
      borderColor: 'border-safe-green/30',
    },
    {
      icon: cbState === 'CLOSED' ? ShieldCheck : cbState === 'OPEN' ? ShieldAlert : Shield,
      label: '熔断器',
      value: cbState,
      color: cbState === 'CLOSED' ? 'text-safe-green' : cbState === 'OPEN' ? 'text-alert-red' : 'text-warn-amber',
      borderColor: cbState === 'CLOSED' ? 'border-safe-green/30' : cbState === 'OPEN' ? 'border-alert-red/30' : 'border-warn-amber/30',
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {kpis.map((kpi, i) => (
        <div key={i} className={`kpi-card border ${kpi.borderColor}`}>
          <div className="flex items-center gap-2 mb-2">
            <kpi.icon className={`w-4 h-4 ${kpi.color} ${kpi.value === 'OPEN' ? 'animate-pulse' : ''}`} />
            <span className="text-xs text-gray-400 font-body uppercase tracking-wider">{kpi.label}</span>
          </div>
          <div className={`font-display text-3xl font-bold ${kpi.color} ${kpi.value === 'OPEN' ? 'glow-text' : ''}`}>
            {kpi.value}
          </div>
          {kpi.label === '熔断器' && circuitBreaker && circuitBreaker.failureCount > 0 && (
            <div className="mt-1 text-[10px] text-gray-600 font-mono">
              失败: {circuitBreaker.failureCount} | 拒绝: {circuitBreaker.totalRejected} | 超时: {circuitBreaker.totalTimeouts}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
