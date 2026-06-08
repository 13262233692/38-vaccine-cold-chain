import { useStore } from '@/store/useStore';
import { FileText, X } from 'lucide-react';

export default function BatchPanel() {
  const { vehicles } = useStore();

  const latestData = vehicles.slice().sort((a, b) => b.lastReportTime - a.lastReportTime).slice(0, 8);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex items-center gap-2">
        <FileText className="w-3.5 h-3.5" />
        <span>最近上链记录</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {latestData.map((v) => (
          <div
            key={v.id}
            className="bg-deep-space-lighter/50 border border-panel-border rounded p-2.5 text-xs font-body hover:border-ice-blue/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-ice-blue font-mono text-[10px]">{v.id}</span>
              <span className={`font-mono font-semibold ${v.status === 'danger' ? 'text-alert-red' : v.status === 'warning' ? 'text-warn-amber' : 'text-safe-green'}`}>
                {v.lastTemperature}°C
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-[10px]">{v.batchNo}</span>
              <span className="text-gray-600 text-[10px]">
                {new Date(v.lastReportTime).toLocaleTimeString('zh-CN', { hour12: false })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
