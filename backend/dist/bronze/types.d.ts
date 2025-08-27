/**
 * Bronze Layer Type Definitions
 *
 * The Bronze layer handles raw HTML file ingestion and metadata tracking.
 * This is the first stage of our Bronze→Silver→Gold data pipeline.
 */
export interface BronzeRecord {
    id: number;
    file_path: string;
    school_slug: string;
    capture_timestamp: string;
    file_size: number;
    checksum_sha256: string;
    processing_status: ProcessingStatus;
    created_at: string;
    updated_at: string;
    source_dataset?: SourceDataset;
    processing_errors?: string[];
    priority_bucket?: PriorityBucket;
}
export type ProcessingStatus = 'pending' | 'processing' | 'processed' | 'failed' | 'quarantined' | 'skipped';
export type SourceDataset = 'USNEWS_2024' | 'USNEWS_2025' | 'WAYBACK_ARCHIVE' | 'OTHER';
export type PriorityBucket = 'bucket_1' | 'bucket_2' | 'bucket_3' | 'unknown';
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
    error_type: 'file_not_found' | 'permission_denied' | 'corrupted_file' | 'invalid_format' | 'duplicate_slug' | 'checksum_mismatch';
    error_message: string;
    timestamp: string;
}
export interface BronzeConfiguration {
    source_directories: string[];
    batch_size: number;
    max_file_size: number;
    parallel_workers: number;
    checksum_verification: boolean;
    auto_quarantine: boolean;
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
    processing_rate: number;
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
//# sourceMappingURL=types.d.ts.map