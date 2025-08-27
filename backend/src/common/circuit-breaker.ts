/**
 * Production Circuit Breaker System
 * 
 * Implements the Circuit Breaker pattern for external drive operations
 * to prevent cascading failures and enable graceful degradation.
 */

import { createBronzeLogger, StructuredLogger } from './logger';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  timeoutMs: number;             // Timeout for operations
  recoveryTimeMs: number;        // Time to wait before half-open attempt
  successThreshold: number;      // Successes needed to close from half-open
  maxRetries: number;            // Maximum retry attempts
  retryDelayMs: number;          // Initial retry delay
  maxRetryDelayMs: number;       // Maximum retry delay (exponential backoff)
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

export class CircuitBreaker<T> {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttemptTime?: Date;
  private totalOperations = 0;
  private responseTimes: number[] = [];
  private logger: StructuredLogger;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig,
    private operation: (...args: any[]) => Promise<T>
  ) {
    this.logger = createBronzeLogger({ 
      component: 'circuit-breaker',
      circuitName: name 
    });
    
    this.logger.info('Circuit breaker initialized', {
      name: this.name,
      config: this.config
    });
  }

  /**
   * Execute operation through circuit breaker with retries
   */
  async execute(...args: any[]): Promise<CircuitBreakerResult<T>> {
    const timer = this.logger.startTimer('circuit-breaker-execution');
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | undefined;

    try {
      // Check if circuit is open and not ready for retry
      if (this.state === 'OPEN' && !this.shouldAttemptReset()) {
        const error = new Error(`Circuit breaker '${this.name}' is OPEN`);
        this.logger.warn('Circuit breaker blocked execution - circuit is OPEN', {
          circuitName: this.name,
          state: this.state,
          failureCount: this.failureCount
        });
        
        return {
          success: false,
          error,
          retryCount: 0,
          responseTime: Date.now() - startTime
        };
      }

      // Attempt operation with retries
      for (retryCount = 0; retryCount <= this.config.maxRetries; retryCount++) {
        try {
          const result = await this.executeWithTimeout(args);
          
          // Operation succeeded
          await this.onSuccess();
          const responseTime = Date.now() - startTime;
          
          timer.end('Circuit breaker execution succeeded');
          return {
            success: true,
            data: result,
            retryCount,
            responseTime
          };
          
        } catch (error) {
          lastError = error as Error;
          
          // Classify error type
          const isRetriable = this.isRetriableError(error as Error);
          
          this.logger.debug('Circuit breaker operation failed', {
            circuitName: this.name,
            retryCount,
            isRetriable,
            error: (error as Error).message
          });
          
          // If not retriable or max retries reached, fail immediately
          if (!isRetriable || retryCount >= this.config.maxRetries) {
            break;
          }
          
          // Wait before retry with exponential backoff
          const delay = this.calculateRetryDelay(retryCount);
          await this.sleep(delay);
        }
      }

      // All retries failed
      await this.onFailure(lastError!);
      const responseTime = Date.now() - startTime;
      
      timer.endWithError(lastError!, 'Circuit breaker execution failed after retries');
      
      return {
        success: false,
        error: lastError,
        retryCount,
        responseTime
      };
      
    } catch (error) {
      timer.endWithError(error as Error, 'Circuit breaker execution error');
      throw error;
    }
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout(args: any[]): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timeout after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);

      this.operation(...args)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Handle successful operation
   */
  private async onSuccess(): Promise<void> {
    this.totalOperations++;
    this.successCount++;
    this.lastSuccessTime = new Date();

    if (this.state === 'HALF_OPEN') {
      // Check if we have enough successes to close the circuit
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        
        this.logger.info('Circuit breaker closed after successful recovery', {
          circuitName: this.name,
          previousState: 'HALF_OPEN'
        });
      }
    }
  }

  /**
   * Handle failed operation
   */
  private async onFailure(error: Error): Promise<void> {
    this.totalOperations++;
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    this.logger.warn('Circuit breaker operation failed', {
      circuitName: this.name,
      failureCount: this.failureCount,
      errorMessage: error.message,
      state: this.state
    });

    if (this.state === 'CLOSED' && this.failureCount >= this.config.failureThreshold) {
      // Open the circuit
      this.state = 'OPEN';
      this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeMs);
      
      this.logger.error('Circuit breaker opened due to failure threshold exceeded', undefined, {
        circuitName: this.name,
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
        nextAttemptTime: this.nextAttemptTime
      });
      
    } else if (this.state === 'HALF_OPEN') {
      // Return to open state
      this.state = 'OPEN';
      this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeMs);
      this.successCount = 0;
      
      this.logger.warn('Circuit breaker returned to OPEN state from HALF_OPEN', {
        circuitName: this.name
      });
    }
  }

  /**
   * Check if circuit should attempt reset from OPEN to HALF_OPEN
   */
  private shouldAttemptReset(): boolean {
    if (this.state !== 'OPEN' || !this.nextAttemptTime) {
      return false;
    }

    if (Date.now() >= this.nextAttemptTime.getTime()) {
      this.state = 'HALF_OPEN';
      this.successCount = 0;
      
      this.logger.info('Circuit breaker transitioning to HALF_OPEN for recovery attempt', {
        circuitName: this.name
      });
      
      return true;
    }

    return false;
  }

  /**
   * Determine if error is retriable
   */
  private isRetriableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // File system transient errors (retriable)
    const retriablePatterns = [
      'timeout',
      'ebusy',     // Resource busy
      'eagain',    // Try again
      'econnreset', // Connection reset
      'etimedout', // Timeout
      'enetunreach', // Network unreachable
      'ehostunreach', // Host unreachable
      'temporary', // Temporary failure
    ];
    
    // Permanent errors (not retriable)
    const permanentPatterns = [
      'enoent',    // No such file or directory
      'eacces',    // Permission denied
      'enotdir',   // Not a directory
      'eisdir',    // Is a directory
      'emfile',    // Too many open files
      'enfile',    // File table overflow
      'enospc',    // No space left on device
      'erofs',     // Read-only file system
    ];
    
    // Check for permanent errors first
    for (const pattern of permanentPatterns) {
      if (message.includes(pattern)) {
        return false;
      }
    }
    
    // Check for retriable errors
    for (const pattern of retriablePatterns) {
      if (message.includes(pattern)) {
        return true;
      }
    }
    
    // Default to retriable for unknown errors
    return true;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const exponentialDelay = this.config.retryDelayMs * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    
    return Math.min(
      exponentialDelay + jitter,
      this.config.maxRetryDelayMs
    );
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const successRate = this.totalOperations > 0 
      ? (this.totalOperations - this.failureCount) / this.totalOperations * 100 
      : 0;
      
    const averageResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
      : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalOperations: this.totalOperations,
      successRate,
      averageResponseTime
    };
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.nextAttemptTime = undefined;
    this.totalOperations = 0;
    this.responseTimes = [];
    
    this.logger.info('Circuit breaker reset to initial state', {
      circuitName: this.name
    });
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker name
   */
  getName(): string {
    return this.name;
  }
}

/**
 * Circuit Breaker Manager for managing multiple circuit breakers
 */
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker<any>>();
  private logger: StructuredLogger;

  constructor() {
    this.logger = createBronzeLogger({ component: 'circuit-breaker-manager' });
  }

  /**
   * Register a new circuit breaker
   */
  register<T>(
    name: string, 
    config: CircuitBreakerConfig, 
    operation: (...args: any[]) => Promise<T>
  ): CircuitBreaker<T> {
    const breaker = new CircuitBreaker<T>(name, config, operation);
    this.breakers.set(name, breaker);
    
    this.logger.info('Circuit breaker registered', { name, totalBreakers: this.breakers.size });
    return breaker;
  }

  /**
   * Get circuit breaker by name
   */
  get<T>(name: string): CircuitBreaker<T> | undefined {
    return this.breakers.get(name) as CircuitBreaker<T>;
  }

  /**
   * Get all circuit breaker metrics
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    
    for (const [name, breaker] of this.breakers) {
      metrics[name] = breaker.getMetrics();
    }
    
    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const [name, breaker] of this.breakers) {
      breaker.reset();
    }
    
    this.logger.info('All circuit breakers reset', { 
      totalBreakers: this.breakers.size 
    });
  }

  /**
   * Get circuit breakers in OPEN state
   */
  getOpenCircuits(): string[] {
    const openCircuits: string[] = [];
    
    for (const [name, breaker] of this.breakers) {
      if (breaker.getState() === 'OPEN') {
        openCircuits.push(name);
      }
    }
    
    return openCircuits;
  }

  /**
   * Check if any circuit breakers are in OPEN state
   */
  hasOpenCircuits(): boolean {
    return this.getOpenCircuits().length > 0;
  }
}

/**
 * Global circuit breaker manager instance
 */
export const circuitBreakerManager = new CircuitBreakerManager();

/**
 * Default circuit breaker configurations for different use cases
 */
export const CIRCUIT_BREAKER_CONFIGS = {
  // For external drive operations
  EXTERNAL_DRIVE: {
    failureThreshold: 5,        // Open after 5 failures
    timeoutMs: 10000,           // 10 second timeout
    recoveryTimeMs: 30000,      // Wait 30 seconds before retry
    successThreshold: 3,        // Need 3 successes to close
    maxRetries: 3,              // Retry up to 3 times
    retryDelayMs: 1000,         // Start with 1 second delay
    maxRetryDelayMs: 8000       // Max 8 second delay
  },
  
  // For database operations
  DATABASE: {
    failureThreshold: 3,        // Open after 3 failures  
    timeoutMs: 5000,            // 5 second timeout
    recoveryTimeMs: 10000,      // Wait 10 seconds before retry
    successThreshold: 2,        // Need 2 successes to close
    maxRetries: 2,              // Retry up to 2 times
    retryDelayMs: 500,          // Start with 500ms delay
    maxRetryDelayMs: 2000       // Max 2 second delay
  },
  
  // For file processing operations
  FILE_PROCESSING: {
    failureThreshold: 10,       // Open after 10 failures
    timeoutMs: 30000,           // 30 second timeout
    recoveryTimeMs: 60000,      // Wait 1 minute before retry
    successThreshold: 5,        // Need 5 successes to close
    maxRetries: 1,              // Only retry once
    retryDelayMs: 2000,         // Start with 2 second delay
    maxRetryDelayMs: 5000       // Max 5 second delay
  }
} as const;