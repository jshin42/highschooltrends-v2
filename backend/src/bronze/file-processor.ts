/**
 * Bronze Layer File Processor
 * 
 * Handles discovery, validation, and ingestion of US News HTML files
 * from the external drive storage into the Bronze database layer.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { glob } from 'glob';
import {
  BronzeRecord,
  FileMetadata,
  BatchProcessingResult,
  ProcessingError,
  BronzeConfiguration,
  ProcessingStatus,
  SourceDataset,
  PriorityBucket
} from './types';
import { StructuredLogger, createBronzeLogger } from '../common/logger';

export class BronzeFileProcessor {
  private config: BronzeConfiguration;
  private logger: StructuredLogger;

  constructor(config: BronzeConfiguration, logger?: StructuredLogger) {
    this.config = config;
    this.logger = logger || createBronzeLogger({ component: 'bronze-file-processor' });
  }

  /**
   * Discover all HTML files in configured source directories
   * Returns array of file paths matching US News HTML pattern
   */
  async discoverFiles(): Promise<string[]> {
    const timer = this.logger.startTimer('file-discovery');
    const allFiles: string[] = [];
    
    try {
      this.logger.info('Starting file discovery', {
        sourceDirectories: this.config.source_directories
      });

      for (const sourceDir of this.config.source_directories) {
        try {
          // Look for HTML files with docker_curl pattern in school-specific directories
          const pattern = path.join(sourceDir, '**/docker_curl_*.html');
          const files = await glob(pattern, {
            absolute: true,
            ignore: ['**/node_modules/**', '**/.*/**']
          });
          
          allFiles.push(...files);
          this.logger.info('Files discovered in directory', {
            sourceDir,
            fileCount: files.length,
            pattern
          });
        } catch (error) {
          this.logger.error('Error scanning directory', error as Error, { sourceDir });
        }
      }

      this.logger.metrics('File discovery completed', {
        totalFilesDiscovered: allFiles.length,
        directoriesScanned: this.config.source_directories.length
      });

      timer.end('File discovery completed successfully');
      return allFiles;
    } catch (error) {
      timer.endWithError(error as Error, 'File discovery failed');
      throw error;
    }
  }

  /**
   * Extract metadata from a single HTML file
   * Parses school slug and capture timestamp from file path
   */
  async extractMetadata(filePath: string): Promise<FileMetadata> {
    const metadata: FileMetadata = {
      file_path: filePath,
      school_slug: '',
      capture_timestamp: '',
      file_size: 0,
      checksum_sha256: '',
      is_valid: false,
      validation_errors: []
    };

    try {
      // First try to get file stats to check if file exists
      const stats = await fs.stat(filePath);
      metadata.file_size = stats.size;

      // Extract school slug from directory path
      // Expected format: /path/to/school-name-id/docker_curl_timestamp.html
      const pathParts = path.dirname(filePath).split(path.sep);
      const schoolDir = pathParts[pathParts.length - 1];
      
      if (!schoolDir || schoolDir === '.') {
        metadata.validation_errors.push('Unable to extract school slug from path');
        return metadata;
      }
      
      metadata.school_slug = schoolDir;

      // Extract timestamp from filename
      // Expected format: docker_curl_YYYYMMDD_HHMMSS.html
      const filename = path.basename(filePath, '.html');
      const timestampMatch = filename.match(/docker_curl_(\d{8})_(\d{6})/);
      
      if (timestampMatch) {
        const [, datePart, timePart] = timestampMatch;
        // Convert YYYYMMDD_HHMMSS to ISO8601
        const year = datePart.substring(0, 4);
        const month = datePart.substring(4, 6);
        const day = datePart.substring(6, 8);
        const hour = timePart.substring(0, 2);
        const minute = timePart.substring(2, 4);
        const second = timePart.substring(4, 6);
        
        metadata.capture_timestamp = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
      } else {
        metadata.validation_errors.push('Unable to parse timestamp from filename');
      }

      // Validate file size
      if (metadata.file_size === 0) {
        metadata.validation_errors.push('File is empty');
      } else if (metadata.file_size > this.config.max_file_size) {
        metadata.validation_errors.push(`File size ${metadata.file_size} exceeds maximum ${this.config.max_file_size}`);
      }

      // Calculate checksum if verification enabled
      if (this.config.checksum_verification) {
        metadata.checksum_sha256 = await this.calculateChecksum(filePath);
      }

      // File is valid if no validation errors
      metadata.is_valid = metadata.validation_errors.length === 0;

    } catch (error) {
      // If we can't stat the file, it's a file system error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      metadata.validation_errors.push(`File processing error: ${errorMessage}`);
      metadata.is_valid = false;
      
      // Store error type info for the calling function
      (metadata as any)._fileSystemError = error;
    }

    return metadata;
  }

  /**
   * Calculate SHA256 checksum for file integrity verification
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const hash = crypto.createHash('sha256');
      hash.update(fileBuffer);
      return hash.digest('hex');
    } catch (error) {
      throw new Error(`Failed to calculate checksum: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Determine source dataset based on file path
   */
  private determineSourceDataset(filePath: string): SourceDataset {
    if (filePath.includes('USNEWS_2024')) {
      return 'USNEWS_2024';
    } else if (filePath.includes('USNEWS_2025')) {
      return 'USNEWS_2025';
    } else if (filePath.includes('wayback') || filePath.includes('archive')) {
      return 'WAYBACK_ARCHIVE';
    }
    return 'OTHER';
  }

  /**
   * Determine processing priority based on school characteristics
   * This is a placeholder - actual bucket determination happens in Silver layer
   */
  private determinePriorityBucket(schoolSlug: string): PriorityBucket {
    // For now, return unknown - actual bucket classification happens during extraction
    // when we can analyze the HTML content for ranking information
    return 'unknown';
  }

  /**
   * Convert file metadata to Bronze record format
   */
  private createBronzeRecord(metadata: FileMetadata): Omit<BronzeRecord, 'id' | 'created_at' | 'updated_at'> {
    const now = new Date().toISOString();
    
    return {
      file_path: metadata.file_path,
      school_slug: metadata.school_slug,
      capture_timestamp: metadata.capture_timestamp,
      file_size: metadata.file_size,
      checksum_sha256: metadata.checksum_sha256,
      processing_status: metadata.is_valid ? 'pending' : 'quarantined',
      source_dataset: this.determineSourceDataset(metadata.file_path),
      priority_bucket: this.determinePriorityBucket(metadata.school_slug),
      processing_errors: metadata.validation_errors.length > 0 ? metadata.validation_errors : undefined
    };
  }

  /**
   * Process a batch of HTML files and return Bronze records
   * This method handles the core ingestion logic
   */
  async processBatch(filePaths: string[], database?: any, correlationId?: string, batchId?: string): Promise<BatchProcessingResult> {
    const timer = this.logger.startTimer('batch-processing');
    const context = {
      correlationId,
      batchId,
      fileCount: filePaths.length,
      parallelWorkers: this.config.parallel_workers
    };
    
    const result: BatchProcessingResult = {
      total_files: filePaths.length,
      successful_ingestions: 0,
      failed_ingestions: 0,
      skipped_files: 0,
      processing_time_ms: 0,
      errors: []
    };

    this.logger.info('Starting batch processing', context);

    // Process files in parallel batches to avoid overwhelming the system
    const chunks = this.chunkArray(filePaths, this.config.parallel_workers);
    
    for (const chunk of chunks) {
      const chunkTimer = this.logger.startTimer('chunk-processing');
      this.logger.debug('Processing chunk', {
        ...context,
        chunkSize: chunk.length,
        chunkIndex: chunks.indexOf(chunk)
      });
      
      const promises = chunk.map(async (filePath) => {
        try {
          const metadata = await this.extractMetadata(filePath);
          const bronzeRecord = this.createBronzeRecord(metadata);
          
          if (metadata.is_valid) {
            // Save to database if provided
            if (database) {
              try {
                database.insertRecord(bronzeRecord);
                result.successful_ingestions++;
                this.logger.debug('File processed successfully', {
                  ...context,
                  filePath,
                  schoolSlug: metadata.school_slug,
                  fileSize: metadata.file_size
                });
                return { success: true, record: bronzeRecord };
              } catch (dbError) {
                // Handle database errors (e.g., duplicates)
                result.failed_ingestions++;
                const error: ProcessingError = {
                  file_path: filePath,
                  error_type: 'duplicate_slug',
                  error_message: `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
                  timestamp: new Date().toISOString()
                };
                result.errors.push(error);
                this.logger.warn('Database error during file processing', {
                  ...context,
                  filePath,
                  errorType: error.error_type,
                  errorMessage: error.error_message
                });
                return { success: false, error };
              }
            } else {
              result.successful_ingestions++;
              this.logger.debug('File processed successfully (no database)', {
                ...context,
                filePath,
                schoolSlug: metadata.school_slug
              });
              return { success: true, record: bronzeRecord };
            }
          } else {
            result.failed_ingestions++;
            
            // Determine error type based on whether it's a file system error or validation error
            let errorType: ProcessingError['error_type'] = 'invalid_format';
            if ((metadata as any)._fileSystemError) {
              const fsError = (metadata as any)._fileSystemError;
              if (fsError instanceof Error) {
                if (fsError.message.includes('ENOENT') || fsError.message.includes('no such file')) {
                  errorType = 'file_not_found';
                } else if (fsError.message.includes('EACCES') || fsError.message.includes('permission')) {
                  errorType = 'permission_denied';
                } else {
                  errorType = 'corrupted_file';
                }
              }
            }
            
            const error: ProcessingError = {
              file_path: filePath,
              error_type: errorType,
              error_message: metadata.validation_errors.join('; '),
              timestamp: new Date().toISOString()
            };
            result.errors.push(error);
            this.logger.warn('File validation failed', {
              ...context,
              filePath,
              errorType: error.error_type,
              errorMessage: error.error_message,
              validationErrors: metadata.validation_errors
            });
            return { success: false, error };
          }
        } catch (error) {
          result.failed_ingestions++;
          // Determine error type based on the error
          let errorType: ProcessingError['error_type'] = 'file_not_found';
          if (error instanceof Error) {
            if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
              errorType = 'file_not_found';
            } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
              errorType = 'permission_denied';
            } else {
              errorType = 'corrupted_file';
            }
          }
          
          const processingError: ProcessingError = {
            file_path: filePath,
            error_type: errorType,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          };
          result.errors.push(processingError);
          this.logger.error('File processing error', error as Error, {
            ...context,
            filePath,
            errorType: processingError.error_type
          });
          return { success: false, error: processingError };
        }
      });

      await Promise.all(promises);
      chunkTimer.end('Chunk processing completed');
    }

    this.logger.metrics('Batch processing completed', {
      totalFiles: result.total_files,
      successful: result.successful_ingestions,
      failed: result.failed_ingestions,
      skipped: result.skipped_files,
      successRate: result.total_files > 0 ? (result.successful_ingestions / result.total_files) * 100 : 0,
      errorCount: result.errors.length
    }, context);
    
    timer.end('Batch processing completed successfully');
    return result;
  }

  /**
   * Utility method to chunk array for parallel processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Full pipeline: discover and process all files
   */
  async processAllFiles(database?: any, correlationId?: string): Promise<BatchProcessingResult> {
    const timer = this.logger.startTimer('full-dataset-processing');
    const context = { correlationId, operation: 'process-all-files' };
    
    try {
      this.logger.info('Starting full Bronze layer processing', context);
      
      const allFiles = await this.discoverFiles();
      
      if (allFiles.length === 0) {
        this.logger.warn('No files found to process', context);
        return {
          total_files: 0,
          successful_ingestions: 0,
          failed_ingestions: 0,
          skipped_files: 0,
          processing_time_ms: 0,
          errors: []
        };
      }

      this.logger.info('Starting batch processing of all discovered files', {
        ...context,
        totalFiles: allFiles.length
      });

      const result = await this.processBatch(allFiles, database, correlationId, 'full-dataset');
      
      timer.end('Full dataset processing completed successfully');
      return result;
    } catch (error) {
      timer.endWithError(error as Error, 'Full dataset processing failed');
      throw error;
    }
  }

  /**
   * Validate configuration before processing
   */
  validateConfiguration(): void {
    const configData = {
      sourceDirectories: this.config.source_directories,
      batchSize: this.config.batch_size,
      parallelWorkers: this.config.parallel_workers,
      maxFileSize: this.config.max_file_size,
      checksumVerification: this.config.checksum_verification,
      autoQuarantine: this.config.auto_quarantine
    };
    
    this.logger.info('Validating Bronze layer configuration', configData);

    if (!this.config.source_directories || this.config.source_directories.length === 0) {
      const error = new Error('No source directories configured');
      this.logger.error('Configuration validation failed: no source directories', error, configData);
      throw error;
    }

    if (this.config.batch_size <= 0) {
      const error = new Error('Batch size must be positive');
      this.logger.error('Configuration validation failed: invalid batch size', error, configData);
      throw error;
    }

    if (this.config.parallel_workers <= 0) {
      const error = new Error('Parallel workers must be positive');
      this.logger.error('Configuration validation failed: invalid parallel workers', error, configData);
      throw error;
    }

    this.logger.info('Configuration validated successfully', configData);
  }
}