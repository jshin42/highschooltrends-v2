/**
 * Bronze Layer Service
 * 
 * High-level service orchestrating Bronze layer operations including
 * batch processing, status monitoring, and database integration.
 */

import {
  BronzeRecord,
  BatchProcessingResult,
  BronzeConfiguration,
  BronzeStatistics,
  BronzeHealthCheck,
  ProcessingStatus,
  SourceDataset,
  PriorityBucket
} from './types';
import { BronzeFileProcessor } from './file-processor';

export class BronzeService {
  private processor: BronzeFileProcessor;
  private config: BronzeConfiguration;

  // In a real implementation, this would be a database connection
  // For now, we'll use an in-memory store for demonstration
  private bronzeRecords: Map<string, BronzeRecord> = new Map();
  private nextId = 1;

  constructor(config: BronzeConfiguration) {
    this.config = config;
    this.processor = new BronzeFileProcessor(config);
  }

  /**
   * Initialize the Bronze service
   * Validates configuration and sets up monitoring
   */
  async initialize(): Promise<void> {
    console.log('Initializing Bronze Layer Service...');
    
    this.processor.validateConfiguration();
    
    // In a real implementation, this would:
    // - Connect to database
    // - Run schema migrations
    // - Set up monitoring and alerting
    // - Initialize processing queues
    
    console.log('✓ Bronze Layer Service initialized');
  }

  /**
   * Start full dataset processing
   * Orchestrates the entire Bronze layer pipeline
   */
  async processDataset(): Promise<BatchProcessingResult> {
    console.log('Starting Bronze layer dataset processing...');
    
    const result = await this.processor.processAllFiles();
    
    // Update statistics after processing
    await this.updateStatistics();
    
    return result;
  }

  /**
   * Process a specific batch of files
   */
  async processBatch(filePaths: string[]): Promise<BatchProcessingResult> {
    return await this.processor.processBatch(filePaths);
  }

  /**
   * Get Bronze layer statistics and monitoring data
   */
  async getStatistics(): Promise<BronzeStatistics> {
    const stats: BronzeStatistics = {
      total_files_discovered: this.bronzeRecords.size,
      files_by_status: this.countByStatus(),
      files_by_dataset: this.countByDataset(),
      files_by_priority: this.countByPriority(),
      average_file_size: this.calculateAverageFileSize(),
      processing_rate: this.calculateProcessingRate(),
      last_updated: new Date().toISOString()
    };

    return stats;
  }

  /**
   * Get health check information for monitoring
   */
  async getHealthCheck(): Promise<BronzeHealthCheck> {
    const stats = await this.getStatistics();
    const issues: string[] = [];
    
    // Check for common issues
    if (stats.files_by_status.failed > stats.total_files_discovered * 0.05) {
      issues.push(`High failure rate: ${stats.files_by_status.failed} failed files`);
    }
    
    if (stats.files_by_status.quarantined > stats.total_files_discovered * 0.02) {
      issues.push(`High quarantine rate: ${stats.files_by_status.quarantined} quarantined files`);
    }

    const errorRate = (stats.files_by_status.failed + stats.files_by_status.quarantined) / 
                      Math.max(stats.total_files_discovered, 1) * 100;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (errorRate > 10) {
      status = 'unhealthy';
    } else if (errorRate > 5) {
      status = 'degraded';
    }

    return {
      status,
      issues,
      metrics: {
        disk_usage_pct: 0, // Would be calculated from actual disk usage
        processing_queue_size: stats.files_by_status.pending,
        error_rate_pct: errorRate,
        last_successful_batch: new Date().toISOString() // Would track actual last success
      }
    };
  }

  /**
   * Get Bronze records by status for monitoring and debugging
   */
  async getRecordsByStatus(status: ProcessingStatus): Promise<BronzeRecord[]> {
    return Array.from(this.bronzeRecords.values())
      .filter(record => record.processing_status === status);
  }

  /**
   * Get Bronze record by school slug
   */
  async getRecordBySlug(schoolSlug: string): Promise<BronzeRecord | null> {
    const record = Array.from(this.bronzeRecords.values())
      .find(record => record.school_slug === schoolSlug);
    
    return record || null;
  }

  /**
   * Update the processing status of a Bronze record
   * This would be called by the Silver layer when processing begins/completes
   */
  async updateRecordStatus(id: number, status: ProcessingStatus, errors?: string[]): Promise<void> {
    const record = Array.from(this.bronzeRecords.values())
      .find(record => record.id === id);
    
    if (record) {
      record.processing_status = status;
      record.updated_at = new Date().toISOString();
      
      if (errors && errors.length > 0) {
        record.processing_errors = [...(record.processing_errors || []), ...errors];
      }
      
      this.bronzeRecords.set(`${record.id}`, record);
      console.log(`Updated record ${id} status to ${status}`);
    }
  }

  /**
   * Reprocess failed or quarantined files
   */
  async reprocessFailedFiles(): Promise<BatchProcessingResult> {
    const failedRecords = await this.getRecordsByStatus('failed');
    const quarantinedRecords = await this.getRecordsByStatus('quarantined');
    
    const filesToReprocess = [...failedRecords, ...quarantinedRecords]
      .map(record => record.file_path);

    if (filesToReprocess.length === 0) {
      console.log('No failed files to reprocess');
      return {
        total_files: 0,
        successful_ingestions: 0,
        failed_ingestions: 0,
        skipped_files: 0,
        processing_time_ms: 0,
        errors: []
      };
    }

    console.log(`Reprocessing ${filesToReprocess.length} failed files...`);
    return await this.processor.processBatch(filesToReprocess);
  }

  /**
   * Private helper methods for statistics calculation
   */
  private countByStatus(): Record<ProcessingStatus, number> {
    const counts: Record<ProcessingStatus, number> = {
      pending: 0,
      processing: 0,
      processed: 0,
      failed: 0,
      quarantined: 0,
      skipped: 0
    };

    for (const record of this.bronzeRecords.values()) {
      counts[record.processing_status]++;
    }

    return counts;
  }

  private countByDataset(): Record<SourceDataset, number> {
    const counts: Record<SourceDataset, number> = {
      USNEWS_2024: 0,
      USNEWS_2025: 0,
      WAYBACK_ARCHIVE: 0,
      OTHER: 0
    };

    for (const record of this.bronzeRecords.values()) {
      if (record.source_dataset) {
        counts[record.source_dataset]++;
      }
    }

    return counts;
  }

  private countByPriority(): Record<PriorityBucket, number> {
    const counts: Record<PriorityBucket, number> = {
      bucket_1: 0,
      bucket_2: 0,
      bucket_3: 0,
      unknown: 0
    };

    for (const record of this.bronzeRecords.values()) {
      if (record.priority_bucket) {
        counts[record.priority_bucket]++;
      }
    }

    return counts;
  }

  private calculateAverageFileSize(): number {
    if (this.bronzeRecords.size === 0) return 0;

    const totalSize = Array.from(this.bronzeRecords.values())
      .reduce((sum, record) => sum + record.file_size, 0);

    return Math.round(totalSize / this.bronzeRecords.size);
  }

  private calculateProcessingRate(): number {
    // This would calculate files per minute based on processing history
    // For now, return a placeholder value
    return 0;
  }

  private async updateStatistics(): Promise<void> {
    // This would update persistent statistics storage
    // For now, we'll just log current stats
    const stats = await this.getStatistics();
    console.log('Bronze Layer Statistics Updated:', {
      total_files: stats.total_files_discovered,
      pending: stats.files_by_status.pending,
      processed: stats.files_by_status.processed,
      failed: stats.files_by_status.failed
    });
  }

  /**
   * Cleanup and shutdown procedures
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Bronze Layer Service...');
    
    // In a real implementation, this would:
    // - Close database connections
    // - Stop processing workers  
    // - Save final statistics
    // - Clean up temporary resources
    
    console.log('✓ Bronze Layer Service shut down');
  }
}

/**
 * Factory function to create Bronze service with default configuration
 */
export function createBronzeService(overrides?: Partial<BronzeConfiguration>): BronzeService {
  const defaultConfig: BronzeConfiguration = {
    source_directories: ['/Volumes/OWC Express 1M2/USNEWS_2024', '/Volumes/OWC Express 1M2/USNEWS_2025'],
    batch_size: 100,
    max_file_size: 10 * 1024 * 1024, // 10MB
    parallel_workers: 4,
    checksum_verification: true,
    auto_quarantine: true,
    ...overrides
  };

  return new BronzeService(defaultConfig);
}