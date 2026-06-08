import { computeHash, buildSnapshotPayload } from './cryptoService.js';
import type { TemperatureSnapshot } from '../../shared/types.js';
import { fabricCircuitBreaker } from '../resilience/TransactionManager.js';
import {
  EndorsementTimeoutException,
  FabricNodeUnavailableException,
  ChaincodeExecutionException,
  OrdererRejectedException,
  isBlockchainException,
} from '../errors/BlockchainException.js';

let blockCounter = 1000;
const chainStore: TemperatureSnapshot[] = [];

const FABRIC_PEER_URL = process.env.FABRIC_PEER_URL || 'peer0.vaccine.example.com:7051';
const ENDORSEMENT_TIMEOUT_MS = parseInt(process.env.ENDORSEMENT_TIMEOUT_MS || '10000', 10);
const FABRIC_FAILURE_RATE = parseFloat(process.env.FABRIC_FAILURE_RATE || '0.05');

function simulateNetworkLatency(baseMs: number, jitterMs: number): Promise<void> {
  const delay = baseMs + Math.random() * jitterMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function shouldSimulateFailure(): boolean {
  return Math.random() < FABRIC_FAILURE_RATE;
}

async function fabricEndorse(payload: string): Promise<{ proposalResponse: string; signature: string }> {
  await simulateNetworkLatency(50, 100);

  if (shouldSimulateFailure()) {
    const failureType = Math.random();
    if (failureType < 0.4) {
      throw new EndorsementTimeoutException(FABRIC_PEER_URL, ENDORSEMENT_TIMEOUT_MS);
    } else if (failureType < 0.7) {
      throw new FabricNodeUnavailableException(FABRIC_PEER_URL, 'Connection refused - node unreachable');
    } else {
      throw new ChaincodeExecutionException('temp_audit_cc', 'recordSnapshot', 'MVCC read conflict');
    }
  }

  return {
    proposalResponse: Buffer.from(payload).toString('base64'),
    signature: computeHash(payload + '-endorsed'),
  };
}

async function fabricOrder(envelope: string): Promise<{ txId: string; blockNumber: number }> {
  await simulateNetworkLatency(30, 50);

  if (shouldSimulateFailure() && Math.random() < 0.3) {
    const txId = `tx_${Date.now()}`;
    throw new OrdererRejectedException(txId, 'MVCC read-write conflict detected');
  }

  blockCounter += 1;
  return {
    txId: `tx_${blockCounter}`,
    blockNumber: blockCounter,
  };
}

export async function submitToChain(
  temperatureMin: number,
  temperatureMax: number,
  batchNo: string,
  vehicleId: string,
  humidity: number,
  timestamp: number
): Promise<TemperatureSnapshot> {
  const payload = buildSnapshotPayload(temperatureMin, temperatureMax, batchNo, timestamp);
  const hash = computeHash(payload);

  return fabricCircuitBreaker.execute(async () => {
    const endorsement = await fabricEndorse(payload);

    const envelope = JSON.stringify({
      payload,
      proposalResponse: endorsement.proposalResponse,
      signature: endorsement.signature,
    });

    const orderResult = await fabricOrder(envelope);

    const snapshot: TemperatureSnapshot = {
      id: `snap_${orderResult.blockNumber}`,
      vehicleId,
      batchNo,
      temperatureMin,
      temperatureMax,
      humidity,
      timestamp,
      hash,
      blockNumber: orderResult.blockNumber,
    };

    chainStore.push(snapshot);
    return snapshot;
  });
}

export function getSnapshotsByBatch(batchNo: string): TemperatureSnapshot[] {
  return chainStore.filter((s) => s.batchNo === batchNo).sort((a, b) => a.timestamp - b.timestamp);
}

export function verifyHash(originalData: string, providedHash: string): { valid: boolean; computedHash: string } {
  const computedHash = computeHash(originalData);
  return {
    valid: computedHash === providedHash,
    computedHash,
  };
}

export function getChainHeight(): number {
  return chainStore.length;
}

export function getRecentSnapshots(count: number): TemperatureSnapshot[] {
  return chainStore.slice(-count).reverse();
}
