export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts: number;
  monitorIntervalMs: number;
  operationTimeoutMs: number;
}

export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenMaxAttempts: 3,
  monitorIntervalMs: 10000,
  operationTimeoutMs: 10000,
};

interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastStateChangeTime: number;
  totalRejected: number;
  totalTimeouts: number;
  halfOpenAttempts: number;
  halfOpenSuccesses: number;
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private metrics: CircuitBreakerMetrics;
  private readonly name: string;
  private stateChangeListeners: Array<(from: CircuitState, to: CircuitState) => void> = [];

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
    this.metrics = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      lastStateChangeTime: Date.now(),
      totalRejected: 0,
      totalTimeouts: 0,
      halfOpenAttempts: 0,
      halfOpenSuccesses: 0,
    };
  }

  get state(): CircuitState {
    this.checkStateTransition();
    return this.metrics.state;
  }

  get Name(): string {
    return this.name;
  }

  getMetrics(): Readonly<CircuitBreakerMetrics> {
    this.checkStateTransition();
    return { ...this.metrics };
  }

  onStateChange(listener: (from: CircuitState, to: CircuitState) => void): void {
    this.stateChangeListeners.push(listener);
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const currentState = this.state;

    if (currentState === CircuitState.OPEN) {
      this.metrics.totalRejected++;
      const { CircuitBreakerOpenException } = await import('../errors/BlockchainException.js');
      throw new CircuitBreakerOpenException(this.name, this.metrics.failureCount);
    }

    if (currentState === CircuitState.HALF_OPEN) {
      if (this.metrics.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        this.metrics.totalRejected++;
        const { CircuitBreakerOpenException } = await import('../errors/BlockchainException.js');
        throw new CircuitBreakerOpenException(this.name, this.metrics.failureCount);
      }
      this.metrics.halfOpenAttempts++;
    }

    try {
      const result = await this.withTimeout(operation, this.config.operationTimeoutMs);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err as Error);
      throw err;
    }
  }

  private withTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.metrics.totalTimeouts++;
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private onSuccess(): void {
    this.metrics.successCount++;

    if (this.metrics.state === CircuitState.HALF_OPEN) {
      this.metrics.halfOpenSuccesses++;
      if (this.metrics.halfOpenSuccesses >= this.config.halfOpenMaxAttempts) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }

    if (this.metrics.state === CircuitState.CLOSED) {
      this.metrics.failureCount = 0;
    }
  }

  private onFailure(err: Error): void {
    this.metrics.failureCount++;
    this.metrics.lastFailureTime = Date.now();

    if (this.metrics.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN);
      return;
    }

    if (this.metrics.state === CircuitState.CLOSED && this.metrics.failureCount >= this.config.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  private checkStateTransition(): void {
    if (
      this.metrics.state === CircuitState.OPEN &&
      this.metrics.lastFailureTime !== null &&
      Date.now() - this.metrics.lastFailureTime >= this.config.resetTimeoutMs
    ) {
      this.transitionTo(CircuitState.HALF_OPEN);
    }
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.metrics.state;
    if (oldState === newState) return;

    this.metrics.state = newState;
    this.metrics.lastStateChangeTime = Date.now();

    if (newState === CircuitState.HALF_OPEN) {
      this.metrics.halfOpenAttempts = 0;
      this.metrics.halfOpenSuccesses = 0;
    }

    if (newState === CircuitState.CLOSED) {
      this.metrics.failureCount = 0;
      this.metrics.halfOpenAttempts = 0;
      this.metrics.halfOpenSuccesses = 0;
    }

    this.stateChangeListeners.forEach((listener) => {
      try {
        listener(oldState, newState);
      } catch {
        // listener errors are swallowed to avoid breaking the circuit breaker
      }
    });

    const stateEmoji = newState === CircuitState.CLOSED ? '🟢' : newState === CircuitState.OPEN ? '🔴' : '🟡';
    console.log(`CircuitBreaker [${this.name}] ${stateEmoji} ${oldState} → ${newState} (failures: ${this.metrics.failureCount})`);
  }

  forceOpen(): void {
    this.transitionTo(CircuitState.OPEN);
    this.metrics.lastFailureTime = Date.now();
  }

  forceClose(): void {
    this.transitionTo(CircuitState.CLOSED);
  }

  reset(): void {
    this.metrics = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      lastStateChangeTime: Date.now(),
      totalRejected: 0,
      totalTimeouts: 0,
      halfOpenAttempts: 0,
      halfOpenSuccesses: 0,
    };
  }
}
