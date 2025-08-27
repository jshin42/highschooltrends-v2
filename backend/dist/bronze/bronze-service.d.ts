/**
 * Bronze Layer Service
 *
 * High-level service orchestrating Bronze layer operations including
 * batch processing, status monitoring, and database integration.
 */
import { BronzeRecord, BatchProcessingResult, BronzeConfiguration, BronzeStatistics, BronzeHealthCheck, ProcessingStatus } from './types';
import { HealthServerOptions } from '../common/health-server';
import { RecoveryResult } from './error-recovery';
export declare class BronzeService {
    private processor;
    private config;
    private database;
    private logger;
    private healthServer?;
    private errorRecovery;
    private processingStats;
    constructor(config: BronzeConfiguration, dbPath?: string, healthServerOptions?: HealthServerOptions);
    /**
     * Initialize the Bronze service
     * Validates configuration and sets up monitoring
     */
    initialize(): Promise<void>;
    /**
     * Start full dataset processing
     * Orchestrates the entire Bronze layer pipeline
     */
    processDataset(): Promise<BatchProcessingResult>;
    /**
     * Process a specific batch of files
     */
    processBatch(filePaths: string[]): Promise<BatchProcessingResult>;
    /**
     * Get Bronze layer statistics and monitoring data
     */
    getStatistics(): Promise<BronzeStatistics>;
    /**
     * Get health check information for monitoring
     */
    getHealthCheck(): Promise<BronzeHealthCheck>;
    /**
     * Get Bronze records by status for monitoring and debugging
     */
    getRecordsByStatus(status: ProcessingStatus): Promise<BronzeRecord[]>;
    /**
     * Get Bronze record by school slug
     */
    getRecordBySlug(schoolSlug: string): Promise<BronzeRecord | null>;
    /**
     * Update the processing status of a Bronze record
     * This would be called by the Silver layer when processing begins/completes
     */
    updateRecordStatus(id: number, status: ProcessingStatus, errors?: string[]): Promise<void>;
    /**
     * Comprehensive error recovery for all failed records
     */
    recoverAllErrors(): Promise<RecoveryResult>;
    /**
     * Perform drive health check and recovery
     */
    recoverDriveHealth(): Promise<{
        healthy: boolean;
        recoveredDrives: string[];
    }>;
    /**
     * Get error recovery metrics
     */
    getErrorRecoveryMetrics(): import("./error-recovery").RecoveryMetrics;
    /**
     * Reprocess failed or quarantined files (legacy method)
     */
    reprocessFailedFiles(): Promise<BatchProcessingResult>;
    /**
     * Private helper methods for statistics calculation
     */
    private calculateProcessingRate;
    private updateStatistics;
    /**
     * Register health checks and metrics collectors
     */
    private registerHealthChecks;
    /**
     * Update processing statistics for health monitoring
     */
    private updateProcessingStats;
    /**
     * Cleanup and shutdown procedures
     */
    shutdown(): Promise<void>;
}
/**
 * Factory function to create Bronze service with default configuration
 */
export declare function createBronzeService(overrides?: Partial<BronzeConfiguration>, dbPath?: string, healthServerOptions?: HealthServerOptions): BronzeService;
/**
 * Create Bronze service with health monitoring enabled
 */
export declare function createBronzeServiceWithHealth(overrides?: Partial<BronzeConfiguration>, dbPath?: string, healthPort?: number): BronzeService;
//# sourceMappingURL=bronze-service.d.ts.map