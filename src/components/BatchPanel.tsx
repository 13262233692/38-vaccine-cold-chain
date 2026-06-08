import { useStore } from '@/store/useStore';
import { FileText, FlaskConical, ShieldX } from 'lucide-react';

export default function BatchPanel() {
  const { vehicles, invalidations, showMktReport } = useStore();

  const latestData = vehicles.slice().sort((a, b) => b.lastReportTime - a.lastReportTime).slice(0, 8);
  const invalidatedBatches = new Set(invalidations.map((r) => r.batchNo));

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex items-center gap-2">
        <FileText className="w-3.5 h-3.5" />
        <span>最近上链记录</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {latestData.map((v) => {
          const isInvalidated = invalidatedBatches.has(v.batchNo);
          return (
            <div
              key={v.id}
              className={`bg-deep-space-lighter/50 border rounded p-2.5 text-xs font-body hover:border-ice-blue/40 transition-colors ${isInvalidated ? 'border-alert-red/40' : 'border-panel-border'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-ice-blue font-mono text-[10px]">{v.id}</span>
                <span className={`font-mono font-semibold ${v.status === 'danger' ? 'text-alert-red' : v.status === 'warning' ? 'text-warn-amber' : 'text-safe-green'}`}>
                  {v.lastTemperature}°C
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 text-[10px]">{v.batchNo}</span>
                  {isInvalidated && <ShieldX className="w-3 h-3 text-alert-red" />}
                </div>
                <span className="text-gray-600 text-[10px]">
                  {new Date(v.lastReportTime).toLocaleTimeString('zh-CN', { hour12: false })}
                </span>
              </div>
              {(v.status === 'warning' || v.status === 'danger' || isInvalidated) && (
                <button
                  onClick={() => showMktReport(v.batchNo)}
                  className="mt-1.5 w-full flex items-center justify-center gap-1 px-2 py-1 bg-ice-blue/10 hover:bg-ice-blue/20 border border-ice-blue/30 rounded text-ice-blue text-[10px] font-display transition-all"
                >
                  <FlaskConical className="w-3 h-3" />
                  MKT 动力学评估
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
