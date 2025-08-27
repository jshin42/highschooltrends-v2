/**
 * Production-grade structured logging utility
 *
 * Provides correlation IDs, structured JSON logging, performance timing,
 * and context-aware logging for production observability.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogContext {
    correlationId?: string;
    operation?: string;
    component?: string;
    schoolSlug?: string;
    filePath?: string;
    batchId?: string;
    workerId?: number;
    [key: string]: any;
}
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context: LogContext;
    duration?: number;
    error?: {
        name: string;
        message: string;
        stack?: string;
        code?: string;
    };
    metrics?: {
        [key: string]: number;
    };
}
export declare class StructuredLogger {
    private static instance;
    private logLevel;
    private context;
    private constructor();
    static getInstance(): StructuredLogger;
    /**
     * Create a new logger instance with inherited context
     */
    withContext(additionalContext: LogContext): StructuredLogger;
    /**
     * Generate a new correlation ID for tracking operations
     */
    static generateCorrelationId(): string;
    /**
     * Create a timer for performance tracking
     */
    startTimer(operation: string, context?: LogContext): PerformanceTimer;
    /**
     * Log debug information (disabled in production by default)
     */
    debug(message: string, context?: LogContext): void;
    /**
     * Log general information
     */
    info(message: string, context?: LogContext): void;
    /**
     * Log warnings
     */
    warn(message: string, context?: LogContext): void;
    /**
     * Log errors with full error information
     */
    error(message: string, error?: Error, context?: LogContext): void;
    /**
     * Log with performance metrics
     */
    metrics(message: string, metrics: Record<string, number>, context?: LogContext): void;
    /**
     * Core logging method
     */
    private log;
    /**
     * Check if we should log at this level
     */
    private shouldLog;
    /**
     * Pretty print for development environment
     */
    private prettyPrint;
}
/**
 * Performance timer utility for tracking operation duration
 */
export declare class PerformanceTimer {
    private startTime;
    private logger;
    private operation;
    private context;
    constructor(logger: StructuredLogger, operation: string, context?: LogContext);
    /**
     * End the timer and log the duration
     */
    end(message?: string, additionalContext?: LogContext): number;
    /**
     * End the timer with an error
     */
    endWithError(error: Error, message?: string, additionalContext?: LogContext): number;
    /**
     * Log a checkpoint during the operation
     */
    checkpoint(message: string, context?: LogContext): void;
}
/**
 * Global logger instance factory
 */
export declare const logger: StructuredLogger;
/**
 * Create a logger with Bronze layer context
 */
export declare function createBronzeLogger(context?: LogContext): StructuredLogger;
/**
 * Create a logger with correlation ID for request/batch tracking
 */
export declare function createCorrelatedLogger(context?: LogContext): StructuredLogger;
//# sourceMappingURL=logger.d.ts.map