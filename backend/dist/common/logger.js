/**
 * Production-grade structured logging utility
 *
 * Provides correlation IDs, structured JSON logging, performance timing,
 * and context-aware logging for production observability.
 */
import * as crypto from 'crypto';
export class StructuredLogger {
    static instance;
    logLevel = 'info';
    context = {};
    constructor() {
        // Set log level from environment
        const envLevel = process.env.LOG_LEVEL?.toLowerCase();
        if (envLevel && ['debug', 'info', 'warn', 'error'].includes(envLevel)) {
            this.logLevel = envLevel;
        }
    }
    static getInstance() {
        if (!StructuredLogger.instance) {
            StructuredLogger.instance = new StructuredLogger();
        }
        return StructuredLogger.instance;
    }
    /**
     * Create a new logger instance with inherited context
     */
    withContext(additionalContext) {
        const newLogger = Object.create(this);
        newLogger.context = { ...this.context, ...additionalContext };
        return newLogger;
    }
    /**
     * Generate a new correlation ID for tracking operations
     */
    static generateCorrelationId() {
        return `bronze-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    }
    /**
     * Create a timer for performance tracking
     */
    startTimer(operation, context) {
        return new PerformanceTimer(this, operation, context);
    }
    /**
     * Log debug information (disabled in production by default)
     */
    debug(message, context) {
        this.log('debug', message, context);
    }
    /**
     * Log general information
     */
    info(message, context) {
        this.log('info', message, context);
    }
    /**
     * Log warnings
     */
    warn(message, context) {
        this.log('warn', message, context);
    }
    /**
     * Log errors with full error information
     */
    error(message, error, context) {
        const errorInfo = error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code
        } : undefined;
        this.log('error', message, context, undefined, errorInfo);
    }
    /**
     * Log with performance metrics
     */
    metrics(message, metrics, context) {
        this.log('info', message, context, undefined, undefined, metrics);
    }
    /**
     * Core logging method
     */
    log(level, message, context, duration, error, metrics) {
        // Skip if log level is too low
        if (!this.shouldLog(level)) {
            return;
        }
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context: { ...this.context, ...context },
            ...(duration && { duration }),
            ...(error && { error }),
            ...(metrics && { metrics })
        };
        // Output as structured JSON for log aggregation systems
        if (process.env.NODE_ENV === 'production') {
            console.log(JSON.stringify(entry));
        }
        else {
            // Pretty print for development
            this.prettyPrint(entry);
        }
    }
    /**
     * Check if we should log at this level
     */
    shouldLog(level) {
        const levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        return levels[level] >= levels[this.logLevel];
    }
    /**
     * Pretty print for development environment
     */
    prettyPrint(entry) {
        const levelColors = {
            debug: '\x1b[36m', // Cyan
            info: '\x1b[32m', // Green
            warn: '\x1b[33m', // Yellow
            error: '\x1b[31m' // Red
        };
        const resetColor = '\x1b[0m';
        const color = levelColors[entry.level];
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();
        let output = `${color}[${timestamp}] ${entry.level.toUpperCase()}${resetColor} ${entry.message}`;
        // Add context information
        const contextKeys = Object.keys(entry.context);
        if (contextKeys.length > 0) {
            const contextStr = contextKeys
                .map(key => `${key}=${entry.context[key]}`)
                .join(' ');
            output += ` (${contextStr})`;
        }
        // Add duration if available
        if (entry.duration) {
            output += ` [${entry.duration}ms]`;
        }
        console.log(output);
        // Print error details if present
        if (entry.error) {
            console.log(`  Error: ${entry.error.name}: ${entry.error.message}`);
            if (entry.error.stack && entry.level === 'error') {
                console.log(`  Stack: ${entry.error.stack}`);
            }
        }
        // Print metrics if present
        if (entry.metrics) {
            const metricsStr = Object.entries(entry.metrics)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            console.log(`  Metrics: ${metricsStr}`);
        }
    }
}
/**
 * Performance timer utility for tracking operation duration
 */
export class PerformanceTimer {
    startTime;
    logger;
    operation;
    context;
    constructor(logger, operation, context) {
        this.startTime = Date.now();
        this.logger = logger;
        this.operation = operation;
        this.context = { ...context, operation };
    }
    /**
     * End the timer and log the duration
     */
    end(message, additionalContext) {
        const duration = Date.now() - this.startTime;
        const logMessage = message || `Operation completed: ${this.operation}`;
        const fullContext = { ...this.context, ...additionalContext, duration };
        this.logger.info(logMessage, fullContext);
        return duration;
    }
    /**
     * End the timer with an error
     */
    endWithError(error, message, additionalContext) {
        const duration = Date.now() - this.startTime;
        const logMessage = message || `Operation failed: ${this.operation}`;
        const fullContext = { ...this.context, ...additionalContext };
        this.logger.error(logMessage, error, { ...fullContext, duration });
        return duration;
    }
    /**
     * Log a checkpoint during the operation
     */
    checkpoint(message, context) {
        const elapsed = Date.now() - this.startTime;
        this.logger.info(message, { ...this.context, ...context, elapsed });
    }
}
/**
 * Global logger instance factory
 */
export const logger = StructuredLogger.getInstance();
/**
 * Create a logger with Bronze layer context
 */
export function createBronzeLogger(context = {}) {
    return logger.withContext({
        component: 'bronze-layer',
        ...context
    });
}
/**
 * Create a logger with correlation ID for request/batch tracking
 */
export function createCorrelatedLogger(context = {}) {
    return logger.withContext({
        correlationId: StructuredLogger.generateCorrelationId(),
        ...context
    });
}
//# sourceMappingURL=logger.js.map