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
import { BronzeDatabase } from './database';
import { createBronzeLogger, StructuredLogger } from '../common/logger';
import { healthMonitor, ComponentHealth } from '../common/health';
import { HealthServer, HealthServerOptions } from '../common/health-server';

export class BronzeService {
  private processor: BronzeFileProcessor;
  private config: BronzeConfiguration;
  private database: BronzeDatabase;
  private logger: StructuredLogger;
  private healthServer?: HealthServer;
  private processingStats: {
    totalProcessed: number;
    totalErrors: number;
    processingTimes: number[];
    startTime: number;
  };

  constructor(config: BronzeConfiguration, dbPath?: string, healthServerOptions?: HealthServerOptions) {
    this.config = config;
    this.logger = createBronzeLogger({
      operation: 'bronze-service',
      sourceDirectories: config.source_directories.join(','),
      batchSize: config.batch_size,
      parallelWorkers: config.parallel_workers
    });
    this.processor = new BronzeFileProcessor(config, this.logger);
    this.database = new BronzeDatabase(dbPath, this.logger);
    
    // Initialize processing statistics
    this.processingStats = {
      totalProcessed: 0,
      totalErrors: 0,
      processingTimes: [],
      startTime: Date.now()
    };
    
    // Initialize health server if options provided
    if (healthServerOptions) {
      this.healthServer = new HealthServer(healthServerOptions);
    }
  }

  /**
   * Initialize the Bronze service
   * Validates configuration and sets up monitoring
   */
  async initialize(): Promise<void> {
    const timer = this.logger.startTimer('service-initialization');
    
    try {
      this.logger.info('Initializing Bronze Layer Service', {
        dbPath: this.database ? 'configured' : 'in-memory',
        checksumVerification: this.config.checksum_verification,
        autoQuarantine: this.config.auto_quarantine,
        healthServerEnabled: !!this.healthServer
      });
      
      // Validate configuration
      this.processor.validateConfiguration();
      this.logger.info('Configuration validated successfully');
      
      // Initialize database connection and run migrations
      this.database.initialize();
      this.logger.info('Database initialized successfully');
      
      // Register health checks and metrics
      await this.registerHealthChecks();
      this.logger.info('Health checks registered successfully');
      
      // Start health server if configured
      if (this.healthServer) {
        await this.healthServer.start();
        this.logger.info('Health server started successfully');
      }
      
      timer.end('Bronze Layer Service initialized successfully');
    } catch (error) {
      timer.endWithError(error as Error, 'Failed to initialize Bronze Layer Service');
      throw error;
    }
  }

  /**
   * Start full dataset processing
   * Orchestrates the entire Bronze layer pipeline
   */
  async processDataset(): Promise<BatchProcessingResult> {
    const timer = this.logger.startTimer('dataset-processing');
    const correlationId = StructuredLogger.generateCorrelationId();
    
    try {
      this.logger.info('Starting Bronze layer dataset processing', { 
        correlationId,
        sourceDirectories: this.config.source_directories 
      });
      
      const result = await this.processor.processAllFiles(this.database, correlationId);
      
      // Update health monitoring statistics
      this.updateProcessingStats(result);
      
      // Update statistics after processing
      await this.updateStatistics();
      
      this.logger.metrics('Dataset processing completed', {
        totalFiles: result.total_files,
        successful: result.successful_ingestions,
        failed: result.failed_ingestions,
        skipped: result.skipped_files,
        successRate: result.total_files > 0 ? (result.successful_ingestions / result.total_files) * 100 : 0
      }, { correlationId });
      
      timer.end('Dataset processing completed successfully');
      return result;
    } catch (error) {
      timer.endWithError(error as Error, 'Dataset processing failed');
      throw error;
    }
  }

  /**
   * Process a specific batch of files
   */
  async processBatch(filePaths: string[]): Promise<BatchProcessingResult> {
    const correlationId = StructuredLogger.generateCorrelationId();
    const batchId = `batch-${Date.now()}`;
    
    this.logger.info('Processing file batch', {
      correlationId,
      batchId,
      fileCount: filePaths.length
    });
    
    const result = await this.processor.processBatch(filePaths, this.database, correlationId, batchId);
    
    // Update health monitoring statistics
    this.updateProcessingStats(result);
    
    return result;
  }

  /**
   * Get Bronze layer statistics and monitoring data
   */
  async getStatistics(): Promise<BronzeStatistics> {
    const stats: BronzeStatistics = {
      total_files_discovered: this.database.getTotalCount(),
      files_by_status: this.database.getCountByStatus(),
      files_by_dataset: this.database.getCountByDataset(),
      files_by_priority: this.database.getCountByPriority(),
      average_file_size: this.database.getAverageFileSize(),
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
    return this.database.getRecordsByStatus(status);
  }

  /**
   * Get Bronze record by school slug
   */
  async getRecordBySlug(schoolSlug: string): Promise<BronzeRecord | null> {
    return this.database.getRecordBySlug(schoolSlug);
  }

  /**
   * Update the processing status of a Bronze record
   * This would be called by the Silver layer when processing begins/completes
   */
  async updateRecordStatus(id: number, status: ProcessingStatus, errors?: string[]): Promise<void> {
    try {
      const success = this.database.updateRecordStatus(id, status, errors);
      if (success) {
        this.logger.info('Record status updated successfully', {
          recordId: id,
          newStatus: status,
          hasErrors: errors && errors.length > 0
        });
      } else {
        this.logger.warn('Failed to update record status - record not found', {
          recordId: id,
          attemptedStatus: status
        });
      }
    } catch (error) {
      this.logger.error('Error updating record status', error as Error, {
        recordId: id,
        attemptedStatus: status
      });
      throw error;
    }
  }

  /**
   * Reprocess failed or quarantined files
   */
  async reprocessFailedFiles(): Promise<BatchProcessingResult> {
    const timer = this.logger.startTimer('reprocess-failed-files');
    const correlationId = StructuredLogger.generateCorrelationId();
    
    try {
      const failedRecords = await this.getRecordsByStatus('failed');
      const quarantinedRecords = await this.getRecordsByStatus('quarantined');
      
      const filesToReprocess = [...failedRecords, ...quarantinedRecords]
        .map(record => record.file_path);

      if (filesToReprocess.length === 0) {
        this.logger.info('No failed files to reprocess', { correlationId });
        return {
          total_files: 0,
          successful_ingestions: 0,
          failed_ingestions: 0,
          skipped_files: 0,
          processing_time_ms: 0,
          errors: []
        };
      }

      this.logger.info('Starting reprocessing of failed files', {
        correlationId,
        failedCount: failedRecords.length,
        quarantinedCount: quarantinedRecords.length,
        totalToReprocess: filesToReprocess.length
      });

      const result = await this.processor.processBatch(filesToReprocess, this.database, correlationId);
      
      this.logger.metrics('Failed file reprocessing completed', {
        totalFiles: result.total_files,
        successful: result.successful_ingestions,
        stillFailed: result.failed_ingestions,
        recoveryRate: result.total_files > 0 ? (result.successful_ingestions / result.total_files) * 100 : 0
      }, { correlationId });
      
      timer.end('Failed file reprocessing completed');
      return result;
    } catch (error) {
      timer.endWithError(error as Error, 'Failed file reprocessing failed');
      throw error;
    }
  }

  /**
   * Private helper methods for statistics calculation
   */

  private calculateProcessingRate(): number {
    // This would calculate files per minute based on processing history
    // For now, return a placeholder value
    return 0;
  }

  private async updateStatistics(): Promise<void> {
    try {
      // This would update persistent statistics storage
      // For now, we'll just log current stats
      const stats = await this.getStatistics();
      
      this.logger.metrics('Bronze Layer Statistics Updated', {
        totalFilesDiscovered: stats.total_files_discovered,
        pendingFiles: stats.files_by_status.pending,
        processedFiles: stats.files_by_status.processed,
        failedFiles: stats.files_by_status.failed,
        quarantinedFiles: stats.files_by_status.quarantined,
        avgFileSize: stats.average_file_size,
        processingRate: stats.processing_rate
      });
      
      // In production, this would also:
      // - Update metrics in time-series database
      // - Update dashboard data
      // - Check SLA thresholds and alert if needed
    } catch (error) {
      this.logger.error('Failed to update statistics', error as Error);
    }
  }

  /**
   * Register health checks and metrics collectors
   */
  private async registerHealthChecks(): Promise<void> {
    // Register database health check
    healthMonitor.registerComponent('database', async (): Promise<ComponentHealth> => {
      try {
        const totalRecords = this.database.getTotalCount();
        return {
          name: 'database',
          status: 'operational',
          message: `Database operational with ${totalRecords} records`,
          metrics: {
            total_records: totalRecords,
            connection_pool_size: 1 // SQLite is single connection
          },
          last_checked: new Date().toISOString()
        };
      } catch (error) {
        return {
          name: 'database',
          status: 'failed',
          message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          last_checked: new Date().toISOString()
        };
      }
    });

    // Register external drive health check
    healthMonitor.registerComponent('external_drives', async (): Promise<ComponentHealth> => {
      try {
        const fs = await import('fs/promises');
        let allDrivesOk = true;
        let driveMessages: string[] = [];
        
        for (const directory of this.config.source_directories) {
          try {
            await fs.access(directory);
            driveMessages.push(`${directory}: accessible`);
          } catch (error) {
            allDrivesOk = false;
            driveMessages.push(`${directory}: ${error instanceof Error ? error.message : 'inaccessible'}`);
          }
        }
        
        return {
          name: 'external_drives',
          status: allDrivesOk ? 'operational' : 'degraded',
          message: driveMessages.join(', '),
          metrics: {
            total_directories: this.config.source_directories.length,
            accessible_directories: allDrivesOk ? this.config.source_directories.length : 0
          },
          last_checked: new Date().toISOString()
        };
      } catch (error) {
        return {
          name: 'external_drives',
          status: 'failed',
          message: `External drive check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          last_checked: new Date().toISOString()
        };
      }
    });

    // Register metrics collectors
    healthMonitor.registerMetric('processing_rate_files_per_min', async (): Promise<number> => {
      const uptimeMinutes = (Date.now() - this.processingStats.startTime) / 60000;
      return uptimeMinutes > 0 ? (this.processingStats.totalProcessed / uptimeMinutes) : 0;
    });

    healthMonitor.registerMetric('error_rate_percentage', async (): Promise<number> => {
      const total = this.processingStats.totalProcessed + this.processingStats.totalErrors;
      return total > 0 ? (this.processingStats.totalErrors / total) * 100 : 0;
    });

    healthMonitor.registerMetric('p95_processing_time_ms', async (): Promise<number> => {
      if (this.processingStats.processingTimes.length === 0) return 0;
      const sorted = [...this.processingStats.processingTimes].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      return sorted[p95Index] || 0;
    });

    healthMonitor.registerMetric('memory_usage_mb', async (): Promise<number> => {
      const usage = process.memoryUsage();
      return Math.round(usage.heapUsed / 1024 / 1024);
    });

    healthMonitor.registerMetric('memory_usage_percentage', async (): Promise<number> => {
      const usage = process.memoryUsage();
      return Math.round((usage.heapUsed / usage.heapTotal) * 100);
    });

    // Register circuit breaker metrics
    healthMonitor.registerMetric('circuit_breaker_open_count', async (): Promise<number> => {
      const metrics = this.processor.getCircuitBreakerMetrics();
      let openCount = 0;
      for (const [name, metric] of Object.entries(metrics)) {
        if (metric.state === 'OPEN') {
          openCount++;
        }
      }
      return openCount;
    });

    healthMonitor.registerMetric('circuit_breaker_failure_rate', async (): Promise<number> => {
      const metrics = this.processor.getCircuitBreakerMetrics();
      let totalOperations = 0;
      let totalFailures = 0;
      
      for (const [name, metric] of Object.entries(metrics)) {
        totalOperations += metric.totalOperations;
        totalFailures += metric.failureCount;
      }
      
      return totalOperations > 0 ? (totalFailures / totalOperations) * 100 : 0;
    });

    // Register circuit breaker component health check
    healthMonitor.registerComponent('circuit_breakers', async (): Promise<ComponentHealth> => {
      try {
        const metrics = this.processor.getCircuitBreakerMetrics();
        const openCircuits: string[] = [];
        let totalOperations = 0;
        let totalFailures = 0;

        for (const [name, metric] of Object.entries(metrics)) {
          if (metric.state === 'OPEN') {
            openCircuits.push(name);
          }
          totalOperations += metric.totalOperations;
          totalFailures += metric.failureCount;
        }

        const failureRate = totalOperations > 0 ? (totalFailures / totalOperations) * 100 : 0;
        
        let status: ComponentHealth['status'] = 'operational';
        let message = 'All circuit breakers operational';

        if (openCircuits.length > 0) {
          status = 'degraded';
          message = `${openCircuits.length} circuit breaker(s) open: ${openCircuits.join(', ')}`;
        } else if (failureRate > 10) {
          status = 'degraded';
          message = `High failure rate detected: ${failureRate.toFixed(1)}%`;
        }

        return {
          name: 'circuit_breakers',
          status,
          message,
          metrics: {
            open_circuits: openCircuits.length,
            total_circuits: Object.keys(metrics).length,
            failure_rate_percentage: Math.round(failureRate * 100) / 100,
            total_operations: totalOperations
          },
          last_checked: new Date().toISOString()
        };
      } catch (error) {
        return {
          name: 'circuit_breakers',
          status: 'failed',
          message: `Circuit breaker health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          last_checked: new Date().toISOString()
        };
      }
    });
  }

  /**
   * Update processing statistics for health monitoring
   */
  private updateProcessingStats(result: BatchProcessingResult): void {
    this.processingStats.totalProcessed += result.successful_ingestions;
    this.processingStats.totalErrors += result.failed_ingestions;
    
    // Track processing time for percentile calculations
    if (this.processingStats.processingTimes.length > 1000) {
      // Keep only the most recent 1000 processing times to prevent memory growth
      this.processingStats.processingTimes = this.processingStats.processingTimes.slice(-500);
    }
    this.processingStats.processingTimes.push(result.processing_time_ms);
  }

  /**
   * Cleanup and shutdown procedures
   */
  async shutdown(): Promise<void> {
    const timer = this.logger.startTimer('service-shutdown');
    
    try {
      this.logger.info('Shutting down Bronze Layer Service');
      
      // Stop health server if running
      if (this.healthServer?.isRunning()) {
        await this.healthServer.stop();
        this.logger.info('Health server stopped');
      }
      
      // Update final statistics
      await this.updateStatistics();
      
      // Close database connection
      this.database.close();
      this.logger.info('Database connection closed');
      
      // In a real implementation, this would also:
      // - Stop processing workers gracefully
      // - Wait for in-flight operations to complete
      // - Clean up temporary resources
      // - Flush logs and metrics
      
      timer.end('Bronze Layer Service shut down successfully');
    } catch (error) {
      timer.endWithError(error as Error, 'Error during Bronze Layer Service shutdown');
      throw error;
    }
  }
}

/**
 * Factory function to create Bronze service with default configuration
 */
export function createBronzeService(
  overrides?: Partial<BronzeConfiguration>, 
  dbPath?: string, 
  healthServerOptions?: HealthServerOptions
): BronzeService {
  const defaultConfig: BronzeConfiguration = {
    source_directories: ['/Volumes/OWC Express 1M2/USNEWS_2024', '/Volumes/OWC Express 1M2/USNEWS_2025'],
    batch_size: 100,
    max_file_size: 10 * 1024 * 1024, // 10MB
    parallel_workers: 4,
    checksum_verification: true,
    auto_quarantine: true,
    ...overrides
  };

  return new BronzeService(defaultConfig, dbPath, healthServerOptions);
}

/**
 * Create Bronze service with health monitoring enabled
 */
export function createBronzeServiceWithHealth(
  overrides?: Partial<BronzeConfiguration>,
  dbPath?: string,
  healthPort: number = 3001
): BronzeService {
  const healthServerOptions: HealthServerOptions = {
    port: healthPort,
    host: '0.0.0.0', // Listen on all interfaces for production
    enableCors: true,
    maxRequestTime: 30000
  };

  return createBronzeService(overrides, dbPath, healthServerOptions);
}