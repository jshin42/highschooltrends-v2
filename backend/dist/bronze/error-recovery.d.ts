/**
 * Bronze Layer Error Recovery System
 *
 * Provides comprehensive error recovery procedures for production operations
 * including retry policies, data repair, and automatic recovery mechanisms.
 */
import { BronzeDatabase } from './database';
import { BronzeFileProcessor } from './file-processor';
import { ProcessingError } from './types';
export interface RecoveryPolicy {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
    maxRetryDelay: number;
    errorTypes: ProcessingError['error_type'][];
}
export interface RecoveryResult {
    totalAttempted: number;
    successful: number;
    stillFailed: number;
    skipped: number;
    recoveryTime: number;
    errors: ProcessingError[];
}
export interface RecoveryMetrics {
    recoveryAttempts: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    averageRecoveryTime: number;
    errorPatterns: Record<string, number>;
}
export declare class BronzeErrorRecovery {
    private logger;
    private database;
    private processor;
    private recoveryMetrics;
    private readonly RECOVERY_POLICIES;
    constructor(database: BronzeDatabase, processor: BronzeFileProcessor);
    /**
     * Recover all failed records using appropriate retry policies
     */
    recoverAllFailedRecords(): Promise<RecoveryResult>;
    /**
     * Recover records of a specific error type using targeted policies
     */
    private recoverRecordsByErrorType;
    /**
     * Recover a single record using the specified policy
     */
    private recoverSingleRecord;
    /**
     * Handle special error types that require custom recovery logic
     */
    private handleSpecialErrorType;
    /**
     * Handle duplicate slug records by analyzing and resolving conflicts
     */
    private handleDuplicateSlugRecords;
    /**
     * Perform health check on external drives and recover if needed
     */
    performDriveHealthRecovery(): Promise<{
        healthy: boolean;
        recoveredDrives: string[];
    }>;
    /**
     * Attempt to recover a specific drive
     */
    private attemptDriveRecovery;
    /**
     * Group records by their primary error type
     */
    private groupRecordsByErrorType;
    /**
     * Extract error type from error message
     */
    private extractErrorTypeFromMessage;
    /**
     * Update recovery metrics
     */
    private updateRecoveryMetrics;
    /**
     * Get current recovery metrics
     */
    getRecoveryMetrics(): RecoveryMetrics;
    /**
     * Reset recovery metrics
     */
    resetRecoveryMetrics(): void;
    /**
     * Sleep for specified milliseconds
     */
    private sleep;
}
//# sourceMappingURL=error-recovery.d.ts.map