import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { X, FileWarning, FlaskConical, ArrowRight, ShieldX, CheckCircle2, Clock, ThermometerSun, Hash, Box } from 'lucide-react';
import type { MKTResult } from '../../shared/types';

export default function MktReport() {
  const { mktReportVisible, mktReportBatchNo, mktResults, invalidations, hideMktReport } = useStore();
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<{
    mktResult: MKTResult;
    decision: string;
    message: string;
    invalidation?: any;
    fabricFailed?: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!mktReportVisible || !mktReportBatchNo) return null;

  const existingResult = mktResults.get(mktReportBatchNo);
  const existingInvalidation = invalidations.find((r) => r.batchNo === mktReportBatchNo);

  const handleEvaluate = async () => {
    setEvaluating(true);
    setError(null);
    setEvalResult(null);

    try {
      const res = await fetch('/api/mkt/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchNo: mktReportBatchNo, threshold: 8 }),
      });
      const json = await res.json();
      if (json.success) {
        setEvalResult(json.data);
        if (json.data.mktResult) {
          useStore.getState().setMktResult(json.data.mktResult);
        }
        if (json.data.invalidation) {
          useStore.getState().addInvalidation(json.data.invalidation);
        }
      } else {
        setError(json.error || 'MKT evaluation failed');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEvaluating(false);
    }
  };

  const displayResult = evalResult?.mktResult || existingResult;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={hideMktReport}>
      <div
        className="bg-deep-space-light border border-panel-border rounded-xl max-w-2xl w-full mx-4 shadow-2xl animate-slide-in-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-deep-space-light border-b border-panel-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-5 h-5 text-ice-blue" />
            <h2 className="font-display text-lg font-bold text-white">MKT 动力学温度分析报告</h2>
          </div>
          <button onClick={hideMktReport} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-deep-space rounded-lg p-4 border border-ice-blue/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400 font-body">批次号</span>
              <span className="text-ice-blue font-mono font-bold">{mktReportBatchNo}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 font-body">
              <ThermometerSun className="w-3 h-3" />
              <span>药典标准: USP {'<1079>'} | 黄金温区 2-8°C | MKT 阈值 8°C</span>
            </div>
          </div>

          {!displayResult && !evalResult && (
            <div className="text-center py-8">
              <FlaskConical className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-body text-sm mb-4">
                提取批次 <span className="text-ice-blue font-mono">{mktReportBatchNo}</span> 整段运输周期时序温度数据，
                基于 Arrhenius 方程积分推演平均动力学温度
              </p>
              <button
                onClick={handleEvaluate}
                disabled={evaluating}
                className="px-6 py-2.5 bg-ice-blue/20 hover:bg-ice-blue/30 border border-ice-blue/40 rounded-lg text-ice-blue font-display font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {evaluating ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span> 积分计算中...
                  </span>
                ) : (
                  '执行 MKT 评估'
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-alert-red/10 border border-alert-red/30 rounded-lg p-3 text-sm text-alert-red font-body">
              {error}
            </div>
          )}

          {displayResult && (
            <>
              <div className={`rounded-lg p-4 border ${
                displayResult.exceedsThreshold
                  ? 'bg-alert-red/10 border-alert-red/30'
                  : 'bg-safe-green/10 border-safe-green/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400 font-body mb-1">平均动力学温度 (MKT)</div>
                    <div className={`font-display text-4xl font-bold ${
                      displayResult.exceedsThreshold ? 'text-alert-red glow-text' : 'text-safe-green'
                    }`}>
                      {displayResult.mktCelsius}°C
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 font-body mb-1">药典阈值</div>
                    <div className="font-display text-2xl font-bold text-gray-400">
                      {displayResult.thresholdCelsius}°C
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {displayResult.exceedsThreshold ? (
                    <>
                      <ShieldX className="w-5 h-5 text-alert-red" />
                      <span className="text-alert-red font-display font-bold text-sm">
                        MKT 超出阈值 → 合规作废
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-safe-green" />
                      <span className="text-safe-green font-display font-bold text-sm">
                        MKT 低于阈值 → 批次合规
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="bg-deep-space rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-500 font-body">样本数</div>
                  <div className="font-mono text-white text-sm">{displayResult.sampleCount}</div>
                </div>
                <div className="bg-deep-space rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-500 font-body">运输时长</div>
                  <div className="font-mono text-white text-sm">{displayResult.durationHours}h</div>
                </div>
                <div className="bg-deep-space rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-500 font-body">超温采样</div>
                  <div className={`font-mono text-sm ${displayResult.overTempReadings > 0 ? 'text-alert-red' : 'text-safe-green'}`}>
                    {displayResult.overTempReadings}
                  </div>
                </div>
                <div className="bg-deep-space rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-500 font-body">温度范围</div>
                  <div className="font-mono text-white text-sm">
                    {displayResult.minTempCelsius.toFixed(1)}-{displayResult.maxTempCelsius.toFixed(1)}°C
                  </div>
                </div>
              </div>

              <div className="bg-deep-space rounded-lg p-4 border border-panel-border">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRight className="w-4 h-4 text-ice-blue" />
                  <h3 className="font-display text-sm font-bold text-white">Arrhenius 方程推导过程</h3>
                </div>
                <div className="space-y-2">
                  {displayResult.computationSteps.map((step, i) => (
                    <div key={i} className="flex gap-3 text-xs">
                      <div className="w-28 flex-shrink-0 text-ice-blue font-mono font-bold">{step.step}</div>
                      <div className="flex-1">
                        <div className="text-gray-400 font-mono">{step.formula}</div>
                        <div className={`font-mono mt-0.5 ${step.step.startsWith('7') ? (displayResult.exceedsThreshold ? 'text-alert-red font-bold' : 'text-safe-green font-bold') : 'text-gray-300'}`}>
                          {step.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {displayResult.exceedsThreshold && (evalResult?.invalidation || existingInvalidation) && (
                <div className="bg-alert-red/5 border border-alert-red/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileWarning className="w-4 h-4 text-alert-red" />
                    <h3 className="font-display text-sm font-bold text-alert-red">合规作废交易凭证</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-gray-500">交易ID:</span>
                      <span className="text-white ml-2">{(evalResult?.invalidation || existingInvalidation)?.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">区块号:</span>
                      <span className="text-white ml-2">#{(evalResult?.invalidation || existingInvalidation)?.blockNumber}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">链上哈希:</span>
                      <span className="text-ice-blue ml-2 break-all">{(evalResult?.invalidation || existingInvalidation)?.hash?.slice(0, 32)}...</span>
                    </div>
                  </div>
                </div>
              )}

              {displayResult.exceedsThreshold && evalResult?.fabricFailed && (
                <div className="bg-warn-amber/10 border border-warn-amber/30 rounded-lg p-3 text-xs text-warn-amber font-body">
                  ⚠ 合规作废决定已生成，但链上提交失败（Fabric 异常）。数据已本地存储，待链路恢复后重试上链。
                </div>
              )}

              {!evaluating && (
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleEvaluate}
                    className="px-4 py-2 bg-ice-blue/10 hover:bg-ice-blue/20 border border-ice-blue/30 rounded-lg text-ice-blue font-display text-xs transition-all"
                  >
                    重新评估
                  </button>
                  <button
                    onClick={hideMktReport}
                    className="px-4 py-2 bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600/30 rounded-lg text-gray-400 font-display text-xs transition-all"
                  >
                    关闭报告
                  </button>
                </div>
              )}
            </>
          )}

          <div className="border-t border-panel-border pt-3">
            <p className="text-[10px] text-gray-600 font-mono leading-relaxed">
              依据: USP {'<1079>'} Good Storage Practice | ICH Q1A(R2) Stability Testing | 《中国药典》2020版 四部通则9001
              <br />
              ΔH = 83.144 kJ/mol (典型药物活化能) | R = 8.314 J/(mol·K) | MKT = -ΔH / [R × ln(1/n × Σ exp(-ΔH/(R·Tᵢ)))]
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
