/**
 * Bronze Layer File Processor
 *
 * Handles discovery, validation, and ingestion of US News HTML files
 * from the external drive storage into the Bronze database layer.
 */
import { FileMetadata, BatchProcessingResult, BronzeConfiguration } from './types';
import { StructuredLogger } from '../common/logger';
export declare class BronzeFileProcessor {
    private config;
    private logger;
    private circuitBreakers;
    constructor(config: BronzeConfiguration, logger?: StructuredLogger);
    /**
     * Discover all HTML files in configured source directories
     * Returns array of file paths matching US News HTML pattern
     */
    discoverFiles(): Promise<string[]>;
    /**
     * Extract metadata from a single HTML file
     * Parses school slug and capture timestamp from file path
     */
    extractMetadata(filePath: string): Promise<FileMetadata>;
    /**
     * Calculate SHA256 checksum for file integrity verification
     */
    private calculateChecksum;
    /**
     * Calculate SHA256 checksum with circuit breaker protection
     */
    private calculateChecksumWithCircuitBreaker;
    /**
     * Determine source dataset based on file path
     */
    private determineSourceDataset;
    /**
     * Determine processing priority based on school characteristics
     * This is a placeholder - actual bucket determination happens in Silver layer
     */
    private determinePriorityBucket;
    /**
     * Convert file metadata to Bronze record format
     */
    private createBronzeRecord;
    /**
     * Process a batch of HTML files and return Bronze records
     * This method handles the core ingestion logic
     */
    processBatch(filePaths: string[], database?: any, correlationId?: string, batchId?: string): Promise<BatchProcessingResult>;
    /**
     * Utility method to chunk array for parallel processing
     */
    private chunkArray;
    /**
     * Full pipeline: discover and process all files
     */
    processAllFiles(database?: any, correlationId?: string): Promise<BatchProcessingResult>;
    /**
     * Validate configuration before processing
     */
    validateConfiguration(): void;
    /**
     * Get circuit breaker metrics for monitoring
     */
    getCircuitBreakerMetrics(): {
        fileSystem: import("../common/circuit-breaker").CircuitBreakerMetrics;
        fileRead: import("../common/circuit-breaker").CircuitBreakerMetrics;
        fileStat: import("../common/circuit-breaker").CircuitBreakerMetrics;
    };
    /**
     * Reset all circuit breakers (for testing/recovery)
     */
    resetCircuitBreakers(): void;
}
//# sourceMappingURL=file-processor.d.ts.map