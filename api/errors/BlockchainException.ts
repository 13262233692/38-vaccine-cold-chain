export class BlockchainException extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly timestamp: number;

  constructor(message: string, code: string, retryable: boolean = false) {
    super(message);
    this.name = 'BlockchainException';
    this.code = code;
    this.retryable = retryable;
    this.timestamp = Date.now();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class EndorsementTimeoutException extends BlockchainException {
  public readonly peerUrl: string;
  public readonly timeoutMs: number;

  constructor(peerUrl: string, timeoutMs: number) {
    super(
      `Fabric endorsement timeout: peer ${peerUrl} did not respond within ${timeoutMs}ms`,
      'ENDORSEMENT_TIMEOUT',
      true
    );
    this.name = 'EndorsementTimeoutException';
    this.peerUrl = peerUrl;
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class FabricNodeUnavailableException extends BlockchainException {
  public readonly peerUrl: string;
  public readonly cause: string;

  constructor(peerUrl: string, cause: string) {
    super(
      `Fabric node unavailable: ${peerUrl} - ${cause}`,
      'FABRIC_NODE_UNAVAILABLE',
      true
    );
    this.name = 'FabricNodeUnavailableException';
    this.peerUrl = peerUrl;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class OrdererRejectedException extends BlockchainException {
  public readonly txId: string;
  public readonly reason: string;

  constructor(txId: string, reason: string) {
    super(
      `Orderer rejected transaction ${txId}: ${reason}`,
      'ORDERER_REJECTED',
      false
    );
    this.name = 'OrdererRejectedException';
    this.txId = txId;
    this.reason = reason;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ChaincodeExecutionException extends BlockchainException {
  public readonly chaincodeName: string;
  public readonly function_: string;

  constructor(chaincodeName: string, function_: string, detail: string) {
    super(
      `Chaincode ${chaincodeName}.${function_} execution failed: ${detail}`,
      'CHAINCODE_EXECUTION_FAILED',
      false
    );
    this.name = 'ChaincodeExecutionException';
    this.chaincodeName = chaincodeName;
    this.function_ = function_;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class CircuitBreakerOpenException extends BlockchainException {
  public readonly circuitName: string;
  public readonly failureCount: number;

  constructor(circuitName: string, failureCount: number) {
    super(
      `Circuit breaker [${circuitName}] is OPEN - requests rejected (failures: ${failureCount})`,
      'CIRCUIT_BREAKER_OPEN',
      false
    );
    this.name = 'CircuitBreakerOpenException';
    this.circuitName = circuitName;
    this.failureCount = failureCount;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TransactionRollbackException extends Error {
  public readonly originalError: Error;
  public readonly rollbackSuccess: boolean;

  constructor(originalError: Error, rollbackSuccess: boolean) {
    super(
      `Transaction rolled back due to: ${originalError.message}. Rollback ${rollbackSuccess ? 'succeeded' : 'FAILED'}`,
    );
    this.name = 'TransactionRollbackException';
    this.originalError = originalError;
    this.rollbackSuccess = rollbackSuccess;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isBlockchainException(err: unknown): err is BlockchainException {
  return err instanceof BlockchainException;
}

export function isRetryableBlockchainError(err: unknown): boolean {
  if (err instanceof BlockchainException) {
    return err.retryable;
  }
  return false;
}
