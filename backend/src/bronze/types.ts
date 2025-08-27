/**
 * Bronze Layer Type Definitions
 * 
 * The Bronze layer handles raw HTML file ingestion and metadata tracking.
 * This is the first stage of our Bronze→Silver→Gold data pipeline.
 */

export interface BronzeRecord {
  id: number;
  file_path: string;              // Absolute path to HTML file
  school_slug: string;            // e.g., "william-fremd-high-school-6921"
  capture_timestamp: string;      // ISO8601 timestamp from filename
  file_size: number;              // File size in bytes
  checksum_sha256: string;        // File integrity verification
  processing_status: ProcessingStatus;
  created_at: string;             // Processing timestamp
  updated_at: string;
  
  // Optional metadata
  source_dataset?: SourceDataset;
  processing_errors?: string[];
  priority_bucket?: PriorityBucket;
}

export type ProcessingStatus = 
  | 'pending'       // File discovered, not yet processed
  | 'processing'    // Currently being processed
  | 'processed'     // Successfully processed by Silver layer
  | 'failed'        // Processing failed with errors
  | 'quarantined'   // File invalid/corrupted, needs manual review
  | 'skipped';      // Intentionally skipped (duplicate, etc.)

export type SourceDataset = 
  | 'USNEWS_2024' 
  | 'USNEWS_2025'
  | 'WAYBACK_ARCHIVE'
  | 'OTHER';

export type PriorityBucket = 
  | 'bucket_1'      // Verified rankings #1-13,426 (highest priority)
  | 'bucket_2'      // Range rankings #13,427-17,901 (medium priority)  
  | 'bucket_3'      // Unranked schools (lowest priority)
  | 'unknown';      // Priority not yet determined

export interface FileMetadata {
  file_path: string;
  school_slug: string;
  capture_timestamp: string;
  file_size: number;
  checksum_sha256: string;
  is_valid: boolean;
  validation_errors: string[];
}

export interface BatchProcessingResult {
  total_files: number;
  successful_ingestions: number;
  failed_ingestions: number;
  skipped_files: number;
  processing_time_ms: number;
  errors: ProcessingError[];
}

export interface ProcessingError {
  file_path: string;
  error_type: 'file_not_found' | 'permission_denied' | 'corrupted_file' | 'invalid_format' | 'duplicate_slug';
  error_message: string;
  timestamp: string;
}

export interface BronzeConfiguration {
  source_directories: string[];   // Directories to scan for HTML files
  batch_size: number;             // Files to process per batch
  max_file_size: number;          // Maximum file size in bytes
  parallel_workers: number;       // Number of parallel processing workers
  checksum_verification: boolean; // Enable SHA256 verification
  auto_quarantine: boolean;       // Auto-quarantine invalid files
}

/**
 * Statistics and monitoring interfaces
 */
export interface BronzeStatistics {
  total_files_discovered: number;
  files_by_status: Record<ProcessingStatus, number>;
  files_by_dataset: Record<SourceDataset, number>;
  files_by_priority: Record<PriorityBucket, number>;
  average_file_size: number;
  processing_rate: number;        // Files per minute
  last_updated: string;
}

export interface BronzeHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  metrics: {
    disk_usage_pct: number;
    processing_queue_size: number;
    error_rate_pct: number;
    last_successful_batch: string;
  };
}