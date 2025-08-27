/**
 * Production Circuit Breaker System
 *
 * Implements the Circuit Breaker pattern for external drive operations
 * to prevent cascading failures and enable graceful degradation.
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export interface CircuitBreakerConfig {
    failureThreshold: number;
    timeoutMs: number;
    recoveryTimeMs: number;
    successThreshold: number;
    maxRetries: number;
    retryDelayMs: number;
    maxRetryDelayMs: number;
}
export interface CircuitBreakerMetrics {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime?: Date;
    lastSuccessTime?: Date;
    totalOperations: number;
    successRate: number;
    averageResponseTime: number;
}
export interface CircuitBreakerResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
    fromCache?: boolean;
    retryCount: number;
    responseTime: number;
}
export declare class CircuitBreaker<T> {
    private name;
    private config;
    private operation;
    private state;
    private failureCount;
    private successCount;
    private lastFailureTime?;
    private lastSuccessTime?;
    private nextAttemptTime?;
    private totalOperations;
    private responseTimes;
    private logger;
    constructor(name: string, config: CircuitBreakerConfig, operation: (...args: any[]) => Promise<T>);
    /**
     * Execute operation through circuit breaker with retries
     */
    execute(...args: any[]): Promise<CircuitBreakerResult<T>>;
    /**
     * Execute operation with timeout
     */
    private executeWithTimeout;
    /**
     * Handle successful operation
     */
    private onSuccess;
    /**
     * Handle failed operation
     */
    private onFailure;
    /**
     * Check if circuit should attempt reset from OPEN to HALF_OPEN
     */
    private shouldAttemptReset;
    /**
     * Determine if error is retriable
     */
    private isRetriableError;
    /**
     * Calculate retry delay with exponential backoff
     */
    private calculateRetryDelay;
    /**
     * Sleep for specified milliseconds
     */
    private sleep;
    /**
     * Get current circuit breaker metrics
     */
    getMetrics(): CircuitBreakerMetrics;
    /**
     * Reset circuit breaker to initial state
     */
    reset(): void;
    /**
     * Get current circuit state
     */
    getState(): CircuitState;
    /**
     * Get circuit breaker name
     */
    getName(): string;
}
/**
 * Circuit Breaker Manager for managing multiple circuit breakers
 */
export declare class CircuitBreakerManager {
    private breakers;
    private logger;
    constructor();
    /**
     * Register a new circuit breaker
     */
    register<T>(name: string, config: CircuitBreakerConfig, operation: (...args: any[]) => Promise<T>): CircuitBreaker<T>;
    /**
     * Get circuit breaker by name
     */
    get<T>(name: string): CircuitBreaker<T> | undefined;
    /**
     * Get all circuit breaker metrics
     */
    getAllMetrics(): Record<string, CircuitBreakerMetrics>;
    /**
     * Reset all circuit breakers
     */
    resetAll(): void;
    /**
     * Get circuit breakers in OPEN state
     */
    getOpenCircuits(): string[];
    /**
     * Check if any circuit breakers are in OPEN state
     */
    hasOpenCircuits(): boolean;
}
/**
 * Global circuit breaker manager instance
 */
export declare const circuitBreakerManager: CircuitBreakerManager;
/**
 * Default circuit breaker configurations for different use cases
 */
export declare const CIRCUIT_BREAKER_CONFIGS: {
    readonly EXTERNAL_DRIVE: {
        readonly failureThreshold: 5;
        readonly timeoutMs: 10000;
        readonly recoveryTimeMs: 30000;
        readonly successThreshold: 3;
        readonly maxRetries: 3;
        readonly retryDelayMs: 1000;
        readonly maxRetryDelayMs: 8000;
    };
    readonly DATABASE: {
        readonly failureThreshold: 3;
        readonly timeoutMs: 5000;
        readonly recoveryTimeMs: 10000;
        readonly successThreshold: 2;
        readonly maxRetries: 2;
        readonly retryDelayMs: 500;
        readonly maxRetryDelayMs: 2000;
    };
    readonly FILE_PROCESSING: {
        readonly failureThreshold: 10;
        readonly timeoutMs: 30000;
        readonly recoveryTimeMs: 60000;
        readonly successThreshold: 5;
        readonly maxRetries: 1;
        readonly retryDelayMs: 2000;
        readonly maxRetryDelayMs: 5000;
    };
};
//# sourceMappingURL=circuit-breaker.d.ts.map