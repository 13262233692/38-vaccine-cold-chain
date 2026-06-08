import { computeHash } from './cryptoService.js';
import { fabricCircuitBreaker } from '../resilience/TransactionManager.js';
import {
  EndorsementTimeoutException,
  FabricNodeUnavailableException,
  ChaincodeExecutionException,
  OrdererRejectedException,
} from '../errors/BlockchainException.js';

const DELTA_H = 83144;
const R_GAS = 8.314;

export interface MKTResult {
  batchNo: string;
  mktCelsius: number;
  mktKelvin: number;
  thresholdCelsius: number;
  thresholdKelvin: number;
  exceedsThreshold: boolean;
  sampleCount: number;
  durationHours: number;
  minTempCelsius: number;
  maxTempCelsius: number;
  avgTempCelsius: number;
  overTempReadings: number;
  computationSteps: MKTComputationStep[];
  timestamp: number;
}

export interface MKTComputationStep {
  step: string;
  formula: string;
  value: string;
}

export interface InvalidationRecord {
  id: string;
  batchNo: string;
  mktCelsius: number;
  thresholdCelsius: number;
  decision: 'COMPLIANCE_VOIDED';
  evidence: MKTResult;
  hash: string;
  blockNumber: number;
  timestamp: number;
}

const invalidationStore: InvalidationRecord[] = [];

export function calculateMKT(
  batchNo: string,
  readings: { temperature: number; timestamp: number }[],
  thresholdCelsius: number = 8
): MKTResult {
  if (readings.length === 0) {
    throw new Error('No temperature readings provided for MKT calculation');
  }

  const sortedReadings = [...readings].sort((a, b) => a.timestamp - b.timestamp);
  const tempsCelsius = sortedReadings.map((r) => r.temperature);
  const tempsKelvin = tempsCelsius.map((t) => t + 273.15);

  const computationSteps: MKTComputationStep[] = [];

  computationSteps.push({
    step: '1. 参数定义',
    formula: 'ΔH (活化能) = 83.144 kJ/mol = 83144 J/mol',
    value: `ΔH = ${DELTA_H} J/mol, R = ${R_GAS} J/(mol·K)`,
  });

  computationSteps.push({
    step: '2. 温度转开尔文',
    formula: 'T(K) = T(°C) + 273.15',
    value: `样本数 n = ${tempsKelvin.length}, T范围 [${Math.min(...tempsKelvin).toFixed(2)}K, ${Math.max(...tempsKelvin).toFixed(2)}K]`,
  });

  const expSum = tempsKelvin.reduce((sum, tK) => {
    return sum + Math.exp(-DELTA_H / (R_GAS * tK));
  }, 0);

  computationSteps.push({
    step: '3. Arrhenius指数求和',
    formula: 'Σ exp(-ΔH / (R·Tᵢ))',
    value: `Σ = ${expSum.toExponential(6)} (共 ${tempsKelvin.length} 项)`,
  });

  const avgExp = expSum / tempsKelvin.length;

  computationSteps.push({
    step: '4. 平均指数值',
    formula: '(1/n) × Σ exp(-ΔH / (R·Tᵢ))',
    value: `(1/${tempsKelvin.length}) × ${expSum.toExponential(6)} = ${avgExp.toExponential(6)}`,
  });

  const mktKelvin = -DELTA_H / (R_GAS * Math.log(avgExp));

  computationSteps.push({
    step: '5. MKT计算 (Kelvin)',
    formula: 'T_mkt = -ΔH / (R × ln(1/n × Σ exp(-ΔH/(R·Tᵢ))))',
    value: `T_mkt = -${DELTA_H} / (${R_GAS} × ln(${avgExp.toExponential(6)})) = ${mktKelvin.toFixed(4)} K`,
  });

  const mktCelsius = mktKelvin - 273.15;

  computationSteps.push({
    step: '6. MKT转摄氏度',
    formula: 'MKT(°C) = T_mkt(K) - 273.15',
    value: `MKT = ${mktKelvin.toFixed(4)} - 273.15 = ${mktCelsius.toFixed(2)}°C`,
  });

  const thresholdKelvin = thresholdCelsius + 273.15;
  const exceedsThreshold = mktCelsius > thresholdCelsius;

  computationSteps.push({
    step: '7. 合规判定',
    formula: `MKT(°C) > 阈值(${thresholdCelsius}°C) ?`,
    value: `${mktCelsius.toFixed(2)}°C ${exceedsThreshold ? '>' : '≤'} ${thresholdCelsius}°C → ${exceedsThreshold ? '⚠ 超出阈值 - 合规作废' : '✓ 低于阈值 - 合规有效'}`,
  });

  const durationMs = sortedReadings[sortedReadings.length - 1].timestamp - sortedReadings[0].timestamp;
  const durationHours = durationMs / (1000 * 60 * 60);
  const overTempReadings = tempsCelsius.filter((t) => t < 2 || t > 8).length;

  return {
    batchNo,
    mktCelsius: Math.round(mktCelsius * 100) / 100,
    mktKelvin: Math.round(mktKelvin * 100) / 100,
    thresholdCelsius,
    thresholdKelvin: Math.round(thresholdKelvin * 100) / 100,
    exceedsThreshold,
    sampleCount: readings.length,
    durationHours: Math.round(durationHours * 100) / 100,
    minTempCelsius: Math.min(...tempsCelsius),
    maxTempCelsius: Math.max(...tempsCelsius),
    avgTempCelsius: Math.round((tempsCelsius.reduce((a, b) => a + b, 0) / tempsCelsius.length) * 100) / 100,
    overTempReadings,
    computationSteps,
    timestamp: Date.now(),
  };
}

async function simulateEndorse(payload: string): Promise<{ proposalResponse: string; signature: string }> {
  const delay = 50 + Math.random() * 100;
  await new Promise((resolve) => setTimeout(resolve, delay));

  if (Math.random() < 0.05) {
    const failureType = Math.random();
    if (failureType < 0.4) {
      throw new EndorsementTimeoutException('peer0.vaccine.example.com:7051', 10000);
    } else if (failureType < 0.7) {
      throw new FabricNodeUnavailableException('peer0.vaccine.example.com:7051', 'Connection refused');
    } else {
      throw new ChaincodeExecutionException('temp_audit_cc', 'invalidateBatch', 'MVCC conflict');
    }
  }

  return {
    proposalResponse: Buffer.from(payload).toString('base64'),
    signature: computeHash(payload + '-endorsed'),
  };
}

async function simulateOrder(envelope: string): Promise<{ txId: string; blockNumber: number }> {
  const delay = 30 + Math.random() * 50;
  await new Promise((resolve) => setTimeout(resolve, delay));

  if (Math.random() < 0.015) {
    throw new OrdererRejectedException(`tx_${Date.now()}`, 'MVCC read-write conflict');
  }

  const blockNumber = 1000 + invalidationStore.length + 1;
  return { txId: `tx_inv_${blockNumber}`, blockNumber };
}

export async function submitInvalidationTransaction(
  mktResult: MKTResult
): Promise<InvalidationRecord> {
  const payload = JSON.stringify({
    function: 'invalidateBatch',
    batchNo: mktResult.batchNo,
    mktCelsius: mktResult.mktCelsius,
    thresholdCelsius: mktResult.thresholdCelsius,
    decision: 'COMPLIANCE_VOIDED',
    evidenceHash: computeHash(JSON.stringify(mktResult)),
    timestamp: mktResult.timestamp,
  });

  const hash = computeHash(payload);

  return fabricCircuitBreaker.execute(async () => {
    const endorsement = await simulateEndorse(payload);

    const envelope = JSON.stringify({
      payload,
      proposalResponse: endorsement.proposalResponse,
      signature: endorsement.signature,
    });

    const orderResult = await simulateOrder(envelope);

    const record: InvalidationRecord = {
      id: `inv_${orderResult.blockNumber}`,
      batchNo: mktResult.batchNo,
      mktCelsius: mktResult.mktCelsius,
      thresholdCelsius: mktResult.thresholdCelsius,
      decision: 'COMPLIANCE_VOIDED',
      evidence: mktResult,
      hash,
      blockNumber: orderResult.blockNumber,
      timestamp: Date.now(),
    };

    invalidationStore.push(record);
    console.log(`[MKT Engine] Compliance voided: batch ${mktResult.batchNo}, MKT=${mktResult.mktCelsius}°C > threshold=${mktResult.thresholdCelsius}°C, block=${orderResult.blockNumber}`);
    return record;
  });
}

export function getInvalidations(): InvalidationRecord[] {
  return [...invalidationStore];
}

export function getInvalidationByBatch(batchNo: string): InvalidationRecord | undefined {
  return invalidationStore.find((r) => r.batchNo === batchNo);
}
