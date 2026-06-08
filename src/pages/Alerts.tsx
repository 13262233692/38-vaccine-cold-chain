import { useEffect, useState } from 'react';
import { ArrowLeft, AlertTriangle, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AlertRecord } from '../../shared/types';

export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [batchNo, setBatchNo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (batchNo) params.set('batchNo', batchNo);
    fetch(`/api/alerts?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setAlerts(json.data);
          setTotalPages(json.pagination.totalPages);
        }
      })
      .catch(console.error);
  }, [page, batchNo]);

  const acknowledgeAlert = async (id: string) => {
    const res = await fetch(`/api/alerts/${id}/acknowledge`, { method: 'PUT' });
    if (res.ok) {
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    }
  };

  return (
    <div className="min-h-screen bg-deep-space font-body p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/" className="text-ice-blue hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-2xl font-bold text-white">告警中心</h1>
          <span className="text-gray-500 text-sm">超温事件列表</span>
        </div>

        <div className="mb-4 flex gap-3">
          <input
            type="text"
            placeholder="按批次号筛选..."
            value={batchNo}
            onChange={(e) => { setBatchNo(e.target.value); setPage(1); }}
            className="bg-deep-space-lighter border border-panel-border rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-ice-blue"
          />
        </div>

        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel-border">
                <th className="text-left px-4 py-3 text-ice-blue font-display text-xs tracking-wider">车辆</th>
                <th className="text-left px-4 py-3 text-ice-blue font-display text-xs tracking-wider">批次号</th>
                <th className="text-left px-4 py-3 text-ice-blue font-display text-xs tracking-wider">超温读数</th>
                <th className="text-left px-4 py-3 text-ice-blue font-display text-xs tracking-wider">触发时间</th>
                <th className="text-left px-4 py-3 text-ice-blue font-display text-xs tracking-wider">状态</th>
                <th className="text-left px-4 py-3 text-ice-blue font-display text-xs tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id} className={`border-b border-panel-border/50 ${!alert.acknowledged ? 'bg-alert-red/5' : ''}`}>
                  <td className="px-4 py-3 font-mono text-ice-blue text-xs">{alert.vehicleId}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{alert.batchNo}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {alert.readings.map((r, i) => (
                        <span key={i} className="bg-alert-red/20 text-alert-red text-xs px-1.5 py-0.5 rounded font-mono">
                          {r.temperature}°C
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(alert.triggeredAt).toLocaleString('zh-CN', { hour12: false })}
                  </td>
                  <td className="px-4 py-3">
                    {alert.acknowledged ? (
                      <span className="text-safe-green text-xs flex items-center gap-1">
                        <Check className="w-3 h-3" /> 已确认
                      </span>
                    ) : (
                      <span className="text-alert-red text-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> 未处理
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="text-xs text-ice-blue hover:text-white border border-ice-blue/30 px-2 py-1 rounded hover:bg-ice-blue/10 transition-colors"
                      >
                        确认
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-600">
                    暂无告警记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-3 py-1 rounded text-xs font-mono ${page === i + 1 ? 'bg-ice-blue text-deep-space' : 'bg-deep-space-lighter text-gray-500 hover:text-white'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
