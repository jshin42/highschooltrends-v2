/**
 * Bronze Layer Entry Point
 *
 * Exports all public interfaces and services for the Bronze layer.
 * This is the main entry point for other layers to interact with Bronze functionality.
 */
export { BronzeService, createBronzeService } from './bronze-service';
export { BronzeFileProcessor } from './file-processor';
export { BronzeDatabase } from './database';
export type { BronzeRecord, ProcessingStatus, SourceDataset, PriorityBucket, FileMetadata, BatchProcessingResult, ProcessingError, BronzeConfiguration, BronzeStatistics, BronzeHealthCheck } from './types';
export declare const DEFAULT_BATCH_SIZE = 100;
export declare const DEFAULT_MAX_FILE_SIZE: number;
export declare const DEFAULT_PARALLEL_WORKERS = 4;
/**
 * Bronze Layer Version and Metadata
 */
export declare const BRONZE_LAYER_VERSION = "1.0.0";
export declare const BRONZE_LAYER_NAME = "USNews HTML File Ingestion";
/**
 * Supported file patterns for US News HTML files
 */
export declare const SUPPORTED_FILE_PATTERNS: string[];
/**
 * Default source directories (can be overridden in configuration)
 */
export declare const DEFAULT_SOURCE_DIRECTORIES: string[];
//# sourceMappingURL=index.d.ts.map