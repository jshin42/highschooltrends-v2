/**
 * Bronze Layer Entry Point
 * 
 * Exports all public interfaces and services for the Bronze layer.
 * This is the main entry point for other layers to interact with Bronze functionality.
 */

// Core service exports
export { BronzeService, createBronzeService } from './bronze-service';
export { BronzeFileProcessor } from './file-processor';

// Type exports
export type {
  BronzeRecord,
  ProcessingStatus,
  SourceDataset,
  PriorityBucket,
  FileMetadata,
  BatchProcessingResult,
  ProcessingError,
  BronzeConfiguration,
  BronzeStatistics,
  BronzeHealthCheck
} from './types';

// Re-export commonly used constants
export const DEFAULT_BATCH_SIZE = 100;
export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const DEFAULT_PARALLEL_WORKERS = 4;

/**
 * Bronze Layer Version and Metadata
 */
export const BRONZE_LAYER_VERSION = '1.0.0';
export const BRONZE_LAYER_NAME = 'USNews HTML File Ingestion';

/**
 * Supported file patterns for US News HTML files
 */
export const SUPPORTED_FILE_PATTERNS = [
  'docker_curl_*.html',
  '**/docker_curl_*.html'
];

/**
 * Default source directories (can be overridden in configuration)
 */
export const DEFAULT_SOURCE_DIRECTORIES = [
  '/Volumes/OWC Express 1M2/USNEWS_2024',
  '/Volumes/OWC Express 1M2/USNEWS_2025'
];