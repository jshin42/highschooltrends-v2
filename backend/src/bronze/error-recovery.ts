/**
 * Bronze Layer Error Recovery System
 * 
 * Provides comprehensive error recovery procedures for production operations
 * including retry policies, data repair, and automatic recovery mechanisms.
 */

import { StructuredLogger, createBronzeLogger } from '../common/logger';
import { BronzeDatabase } from './database';
import { BronzeFileProcessor } from './file-processor';
import { ProcessingStatus, ProcessingError, BronzeRecord, BatchProcessingResult } from './types';
import { CircuitBreaker, circuitBreakerManager } from '../common/circuit-breaker';
import * as fs from 'fs/promises';

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

export class BronzeErrorRecovery {
  private logger: StructuredLogger;
  private database: BronzeDatabase;
  private processor: BronzeFileProcessor;
  private recoveryMetrics: RecoveryMetrics;
  
  // Recovery policies for different error types
  private readonly RECOVERY_POLICIES: Record<ProcessingError['error_type'], RecoveryPolicy> = {
    file_not_found: {
      maxRetries: 2,
      retryDelay: 5000,
      backoffMultiplier: 2,
      maxRetryDelay: 30000,
      errorTypes: ['file_not_found']
    },
    permission_denied: {
      maxRetries: 1,
      retryDelay: 10000,
      backoffMultiplier: 1,
      maxRetryDelay: 10000,
      errorTypes: ['permission_denied']
    },
    corrupted_file: {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxRetryDelay: 8000,
      errorTypes: ['corrupted_file']
    },
    invalid_format: {
      maxRetries: 1,
      retryDelay: 2000,
      backoffMultiplier: 1,
      maxRetryDelay: 2000,
      errorTypes: ['invalid_format']
    },
    duplicate_slug: {
      maxRetries: 0, // Don't retry duplicates, handle specially
      retryDelay: 0,
      backoffMultiplier: 1,
      maxRetryDelay: 0,
      errorTypes: ['duplicate_slug']
    },
    checksum_mismatch: {
      maxRetries: 2,
      retryDelay: 3000,
      backoffMultiplier: 2,
      maxRetryDelay: 12000,
      errorTypes: ['checksum_mismatch']
    }
  };

  constructor(database: BronzeDatabase, processor: BronzeFileProcessor) {
    this.database = database;
    this.processor = processor;
    this.logger = createBronzeLogger({ component: 'bronze-error-recovery' });
    this.recoveryMetrics = {
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      averageRecoveryTime: 0,
      errorPatterns: {}
    };
    
    this.logger.info('Bronze error recovery system initialized', {
      policyCount: Object.keys(this.RECOVERY_POLICIES).length,
      supportedErrorTypes: Object.keys(this.RECOVERY_POLICIES)
    });
  }

  /**
   * Recover all failed records using appropriate retry policies
   */
  async recoverAllFailedRecords(): Promise<RecoveryResult> {
    const timer = this.logger.startTimer('recover-all-failed-records');
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting comprehensive error recovery for all failed records');
      
      // Get all failed and quarantined records
      const failedRecords = await this.database.getRecordsByStatus('failed');
      const quarantinedRecords = await this.database.getRecordsByStatus('quarantined');
      
      const allFailedRecords = [...failedRecords, ...quarantinedRecords];
      
      if (allFailedRecords.length === 0) {
        this.logger.info('No failed records found for recovery');
        return {
          totalAttempted: 0,
          successful: 0,
          stillFailed: 0,
          skipped: 0,
          recoveryTime: Date.now() - startTime,
          errors: []
        };
      }
      
      this.logger.info('Found failed records for recovery', {
        failedCount: failedRecords.length,
        quarantinedCount: quarantinedRecords.length,
        totalToRecover: allFailedRecords.length
      });
      
      // Group records by error type for batch recovery
      const recordsByErrorType = this.groupRecordsByErrorType(allFailedRecords);
      
      let totalSuccessful = 0;
      let totalStillFailed = 0;
      let totalSkipped = 0;
      const allErrors: ProcessingError[] = [];
      
      // Process each error type with its specific recovery policy
      for (const [errorType, records] of Object.entries(recordsByErrorType)) {
        this.logger.info(`Starting recovery for error type: ${errorType}`, {
          errorType,
          recordCount: records.length
        });
        
        const result = await this.recoverRecordsByErrorType(
          errorType as ProcessingError['error_type'], 
          records
        );
        
        totalSuccessful += result.successful;
        totalStillFailed += result.stillFailed;
        totalSkipped += result.skipped;
        allErrors.push(...result.errors);
        
        this.logger.info(`Recovery completed for error type: ${errorType}`, {
          errorType,
          attempted: records.length,
          successful: result.successful,
          stillFailed: result.stillFailed,
          skipped: result.skipped
        });
      }
      
      const result: RecoveryResult = {
        totalAttempted: allFailedRecords.length,
        successful: totalSuccessful,
        stillFailed: totalStillFailed,
        skipped: totalSkipped,
        recoveryTime: Date.now() - startTime,
        errors: allErrors
      };
      
      // Update recovery metrics
      this.updateRecoveryMetrics(result);
      
      this.logger.metrics('Comprehensive error recovery completed', {
        totalAttempted: result.totalAttempted,
        successful: result.successful,
        stillFailed: result.stillFailed,
        skipped: result.skipped,
        recoveryRate: result.totalAttempted > 0 ? (result.successful / result.totalAttempted) * 100 : 0,
        recoveryTimeSeconds: Math.round(result.recoveryTime / 1000)
      });
      
      timer.end('Comprehensive error recovery completed');
      return result;
      
    } catch (error) {
      timer.endWithError(error as Error, 'Comprehensive error recovery failed');
      throw error;
    }
  }

  /**
   * Recover records of a specific error type using targeted policies
   */
  private async recoverRecordsByErrorType(
    errorType: ProcessingError['error_type'], 
    records: BronzeRecord[]
  ): Promise<RecoveryResult> {
    const policy = this.RECOVERY_POLICIES[errorType];
    const startTime = Date.now();
    
    if (policy.maxRetries === 0) {
      // Handle special cases (like duplicates) that don't use standard retry
      return await this.handleSpecialErrorType(errorType, records);
    }
    
    let successful = 0;
    let stillFailed = 0;
    let skipped = 0;
    const errors: ProcessingError[] = [];
    
    for (const record of records) {
      try {
        const recovered = await this.recoverSingleRecord(record, policy);
        if (recovered) {
          successful++;
        } else {
          stillFailed++;
        }
      } catch (error) {
        stillFailed++;
        errors.push({
          file_path: record.file_path,
          error_type: errorType,
          error_message: error instanceof Error ? error.message : 'Recovery failed',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return {
      totalAttempted: records.length,
      successful,
      stillFailed,
      skipped,
      recoveryTime: Date.now() - startTime,
      errors
    };
  }

  /**
   * Recover a single record using the specified policy
   */
  private async recoverSingleRecord(record: BronzeRecord, policy: RecoveryPolicy): Promise<boolean> {
    const logger = this.logger;
    let attempt = 0;
    let delay = policy.retryDelay;
    
    logger.debug('Starting single record recovery', {
      filePath: record.file_path,
      schoolSlug: record.school_slug,
      maxRetries: policy.maxRetries,
      initialDelay: delay
    });
    
    while (attempt <= policy.maxRetries) {
      try {
        // Wait before retry (except first attempt)
        if (attempt > 0) {
          await this.sleep(delay);
          delay = Math.min(delay * policy.backoffMultiplier, policy.maxRetryDelay);
        }
        
        // Attempt to reprocess the file
        const result = await this.processor.processBatch([record.file_path], this.database);
        
        if (result.successful_ingestions > 0) {
          logger.info('Record recovery successful', {
            filePath: record.file_path,
            schoolSlug: record.school_slug,
            attempts: attempt + 1,
            processingTime: result.processing_time_ms
          });
          return true;
        }
        
        // If we get here, processing failed
        if (result.errors.length > 0) {
          const latestError = result.errors[0];
          logger.warn('Record recovery attempt failed', {
            filePath: record.file_path,
            attempt: attempt + 1,
            maxRetries: policy.maxRetries,
            errorType: latestError.error_type,
            errorMessage: latestError.error_message
          });
        }
        
        attempt++;
      } catch (error) {
        attempt++;
        logger.warn('Record recovery attempt exception', {
          filePath: record.file_path,
          attempt,
          maxRetries: policy.maxRetries,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        if (attempt > policy.maxRetries) {
          break;
        }
      }
    }
    
    logger.warn('Record recovery failed after all attempts', {
      filePath: record.file_path,
      schoolSlug: record.school_slug,
      totalAttempts: attempt,
      maxRetries: policy.maxRetries
    });
    
    return false;
  }

  /**
   * Handle special error types that require custom recovery logic
   */
  private async handleSpecialErrorType(
    errorType: ProcessingError['error_type'], 
    records: BronzeRecord[]
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    
    switch (errorType) {
      case 'duplicate_slug':
        return await this.handleDuplicateSlugRecords(records);
      default:
        // For unknown special types, skip recovery
        this.logger.warn('Unknown special error type, skipping recovery', {
          errorType,
          recordCount: records.length
        });
        return {
          totalAttempted: records.length,
          successful: 0,
          stillFailed: 0,
          skipped: records.length,
          recoveryTime: Date.now() - startTime,
          errors: []
        };
    }
  }

  /**
   * Handle duplicate slug records by analyzing and resolving conflicts
   */
  private async handleDuplicateSlugRecords(records: BronzeRecord[]): Promise<RecoveryResult> {
    const startTime = Date.now();
    let successful = 0;
    let stillFailed = 0;
    const errors: ProcessingError[] = [];
    
    this.logger.info('Handling duplicate slug records', {
      recordCount: records.length
    });
    
    // Group by school slug to analyze duplicates
    const slugGroups = new Map<string, BronzeRecord[]>();
    for (const record of records) {
      if (!slugGroups.has(record.school_slug)) {
        slugGroups.set(record.school_slug, []);
      }
      slugGroups.get(record.school_slug)!.push(record);
    }
    
    // Process each slug group
    for (const [slug, duplicateRecords] of slugGroups) {
      try {
        // Strategy: Keep the most recent file, mark others as processed but add note
        const sortedByTimestamp = duplicateRecords.sort((a, b) => 
          new Date(b.capture_timestamp).getTime() - new Date(a.capture_timestamp).getTime()
        );
        
        const keepRecord = sortedByTimestamp[0];
        const discardRecords = sortedByTimestamp.slice(1);
        
        // Update the kept record status
        this.database.updateRecordStatus(keepRecord.id!, 'processed', [
          `Resolved duplicate: kept most recent capture ${keepRecord.capture_timestamp}`
        ]);
        
        // Mark discarded records as processed with note
        for (const discardRecord of discardRecords) {
          this.database.updateRecordStatus(discardRecord.id!, 'processed', [
            `Resolved duplicate: superseded by ${keepRecord.capture_timestamp}`
          ]);
        }
        
        successful += duplicateRecords.length;
        
        this.logger.info('Duplicate slug resolved', {
          slug,
          totalDuplicates: duplicateRecords.length,
          keptFile: keepRecord.file_path,
          discardedCount: discardRecords.length
        });
        
      } catch (error) {
        stillFailed += duplicateRecords.length;
        errors.push({
          file_path: duplicateRecords[0].file_path,
          error_type: 'duplicate_slug',
          error_message: `Failed to resolve duplicates: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return {
      totalAttempted: records.length,
      successful,
      stillFailed,
      skipped: 0,
      recoveryTime: Date.now() - startTime,
      errors
    };
  }

  /**
   * Perform health check on external drives and recover if needed
   */
  async performDriveHealthRecovery(): Promise<{ healthy: boolean; recoveredDrives: string[] }> {
    const timer = this.logger.startTimer('drive-health-recovery');
    const recoveredDrives: string[] = [];
    
    try {
      this.logger.info('Starting drive health recovery check');
      
      const sourceDirectories = this.processor['config'].source_directories;
      let allHealthy = true;
      
      for (const directory of sourceDirectories) {
        try {
          await fs.access(directory);
          this.logger.debug('Drive accessible', { directory });
        } catch (error) {
          allHealthy = false;
          this.logger.warn('Drive inaccessible, attempting recovery', {
            directory,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          // Attempt recovery by resetting circuit breakers
          const recovered = await this.attemptDriveRecovery(directory);
          if (recovered) {
            recoveredDrives.push(directory);
          }
        }
      }
      
      // Reset circuit breakers if drives were recovered
      if (recoveredDrives.length > 0) {
        this.processor.resetCircuitBreakers();
        this.logger.info('Circuit breakers reset after drive recovery', {
          recoveredDrives
        });
      }
      
      timer.end('Drive health recovery completed');
      return {
        healthy: allHealthy || recoveredDrives.length === sourceDirectories.length,
        recoveredDrives
      };
      
    } catch (error) {
      timer.endWithError(error as Error, 'Drive health recovery failed');
      throw error;
    }
  }

  /**
   * Attempt to recover a specific drive
   */
  private async attemptDriveRecovery(directory: string): Promise<boolean> {
    // Implement drive-specific recovery logic
    // This could include:
    // - Waiting for drive remount
    // - Attempting to trigger drive reconnection
    // - Checking alternative mount points
    
    const maxAttempts = 3;
    const retryDelay = 5000; // 5 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.sleep(retryDelay * attempt);
        await fs.access(directory);
        
        this.logger.info('Drive recovery successful', {
          directory,
          attempts: attempt
        });
        return true;
        
      } catch (error) {
        this.logger.debug('Drive recovery attempt failed', {
          directory,
          attempt,
          maxAttempts,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    this.logger.error('Drive recovery failed after all attempts', undefined, {
      directory,
      maxAttempts
    });
    return false;
  }

  /**
   * Group records by their primary error type
   */
  private groupRecordsByErrorType(records: BronzeRecord[]): Record<string, BronzeRecord[]> {
    const groups: Record<string, BronzeRecord[]> = {};
    
    for (const record of records) {
      // Extract primary error type from processing_errors
      let primaryErrorType = 'unknown';
      if (record.processing_errors && record.processing_errors.length > 0) {
        // Find the most recent error or use the first one
        const errorMessage = record.processing_errors[0];
        primaryErrorType = this.extractErrorTypeFromMessage(errorMessage);
      }
      
      if (!groups[primaryErrorType]) {
        groups[primaryErrorType] = [];
      }
      groups[primaryErrorType].push(record);
    }
    
    return groups;
  }

  /**
   * Extract error type from error message
   */
  private extractErrorTypeFromMessage(errorMessage: string): ProcessingError['error_type'] {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('no such file') || message.includes('enoent')) {
      return 'file_not_found';
    }
    if (message.includes('permission') || message.includes('eacces')) {
      return 'permission_denied';
    }
    if (message.includes('duplicate')) {
      return 'duplicate_slug';
    }
    if (message.includes('checksum')) {
      return 'checksum_mismatch';
    }
    if (message.includes('corrupted') || message.includes('invalid')) {
      return 'corrupted_file';
    }
    
    return 'invalid_format';
  }

  /**
   * Update recovery metrics
   */
  private updateRecoveryMetrics(result: RecoveryResult): void {
    this.recoveryMetrics.recoveryAttempts++;
    this.recoveryMetrics.successfulRecoveries += result.successful;
    this.recoveryMetrics.failedRecoveries += result.stillFailed;
    
    // Update average recovery time
    const totalTime = (this.recoveryMetrics.averageRecoveryTime * (this.recoveryMetrics.recoveryAttempts - 1)) + result.recoveryTime;
    this.recoveryMetrics.averageRecoveryTime = totalTime / this.recoveryMetrics.recoveryAttempts;
    
    // Update error patterns
    for (const error of result.errors) {
      const errorType = error.error_type;
      this.recoveryMetrics.errorPatterns[errorType] = (this.recoveryMetrics.errorPatterns[errorType] || 0) + 1;
    }
  }

  /**
   * Get current recovery metrics
   */
  getRecoveryMetrics(): RecoveryMetrics {
    return { ...this.recoveryMetrics };
  }

  /**
   * Reset recovery metrics
   */
  resetRecoveryMetrics(): void {
    this.recoveryMetrics = {
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      averageRecoveryTime: 0,
      errorPatterns: {}
    };
    
    this.logger.info('Recovery metrics reset');
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}