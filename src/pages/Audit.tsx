import { useEffect, useState } from 'react';
import { ArrowLeft, Search, Shield, FileCode, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TemperatureSnapshot, Batch } from '../../shared/types';

export default function Audit() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [snapshots, setSnapshots] = useState<TemperatureSnapshot[]>([]);
  const [batchInfo, setBatchInfo] = useState<Batch | null>(null);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyHash, setVerifyHash] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; computedHash: string } | null>(null);

  useEffect(() => {
    fetch('/api/audit/batches')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setBatches(json.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedBatch) return;
    fetch(`/api/audit/batch/${selectedBatch}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setSnapshots(json.data.snapshots);
          setBatchInfo(json.data.batch);
        }
      })
      .catch(console.error);
  }, [selectedBatch]);

  const handleVerify = async () => {
    const res = await fetch('/api/audit/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalData: verifyInput, hash: verifyHash }),
    });
    const json = await res.json();
    if (json.success) {
      setVerifyResult({ valid: json.valid, computedHash: json.computedHash });
    }
  };

  return (
    <div className="min-h-screen bg-deep-space font-body p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/" className="text-ice-blue hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-2xl font-bold text-white">链上审计</h1>
          <span className="text-gray-500 text-sm">区块链温控快照查询与哈希验证</span>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="panel">
            <div className="panel-header flex items-center gap-2">
              <FileCode className="w-3.5 h-3.5" />
              <span>批次查询</span>
            </div>
            <div className="p-4">
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full bg-deep-space-lighter border border-panel-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-ice-blue mb-4"
              >
                <option value="">选择批次号...</option>
                {batches.map((b) => (
                  <option key={b.batchNo} value={b.batchNo}>{b.batchNo}</option>
                ))}
              </select>

              {batchInfo && (
                <div className="bg-deep-space rounded-lg p-3 mb-4 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-gray-500">始发地</span><p className="text-white">{batchInfo.origin}</p></div>
                    <div><span className="text-gray-500">目的地</span><p className="text-white">{batchInfo.destination}</p></div>
                  </div>
                </div>
              )}

              {snapshots.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {snapshots.map((snap, i) => (
                    <div key={snap.id} className="relative bg-deep-space-lighter/50 border border-panel-border rounded p-3">
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-ice-blue/30" />
                      <div className="ml-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-ice-blue font-mono text-[10px]">Block #{snap.blockNumber}</span>
                          <span className="text-gray-600 text-[10px]">
                            {new Date(snap.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className={`font-display font-bold ${snap.temperatureMax > 8 ? 'text-alert-red' : 'text-safe-green'}`}>
                            {snap.temperatureMin}°C ~ {snap.temperatureMax}°C
                          </span>
                          <span className="text-gray-600 font-mono text-[10px] truncate" title={snap.hash}>
                            SHA256: {snap.hash.slice(0, 16)}...
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              <span>哈希验证</span>
            </div>
            <div className="p-4">
              <p className="text-gray-500 text-xs mb-4">
                输入原始数据与链上记录的 SHA-256 哈希值，验证数据是否被篡改
              </p>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">原始数据 (JSON)</label>
                  <textarea
                    value={verifyInput}
                    onChange={(e) => setVerifyInput(e.target.value)}
                    className="w-full bg-deep-space-lighter border border-panel-border rounded px-3 py-2 text-xs text-white font-mono h-24 resize-none focus:outline-none focus:border-ice-blue"
                    placeholder='{"temperatureMin":3.2,"temperatureMax":5.1,"batchNo":"BATCH-2026-001","timestamp":1717833600000}'
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">链上哈希</label>
                  <input
                    value={verifyHash}
                    onChange={(e) => setVerifyHash(e.target.value)}
                    className="w-full bg-deep-space-lighter border border-panel-border rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-ice-blue"
                    placeholder="a1b2c3d4..."
                  />
                </div>
              </div>

              <button
                onClick={handleVerify}
                disabled={!verifyInput || !verifyHash}
                className="w-full py-2 bg-ice-blue/10 border border-ice-blue/30 text-ice-blue font-display tracking-wider text-sm rounded hover:bg-ice-blue/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                验证完整性
              </button>

              {verifyResult && (
                <div className={`mt-4 p-3 rounded-lg border ${verifyResult.valid ? 'bg-safe-green/10 border-safe-green/30' : 'bg-alert-red/10 border-alert-red/30'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {verifyResult.valid ? (
                      <Shield className="w-4 h-4 text-safe-green" />
                    ) : (
                      <Shield className="w-4 h-4 text-alert-red" />
                    )}
                    <span className={`font-display font-bold ${verifyResult.valid ? 'text-safe-green' : 'text-alert-red'}`}>
                      {verifyResult.valid ? '验证通过 - 数据完整' : '验证失败 - 数据已被篡改'}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-500">
                    <p>计算哈希: {verifyResult.computedHash}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
