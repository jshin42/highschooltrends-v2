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
import { createBronzeLogger } from '../common/logger';
import { CIRCUIT_BREAKER_CONFIGS, circuitBreakerManager } from '../common/circuit-breaker';
export class BronzeFileProcessor {
    config;
    logger;
    circuitBreakers;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger || createBronzeLogger({ component: 'bronze-file-processor' });
        // Initialize circuit breakers for external drive operations
        this.circuitBreakers = {
            fileSystem: circuitBreakerManager.register('external-drive-filesystem', CIRCUIT_BREAKER_CONFIGS.EXTERNAL_DRIVE, async (operation) => operation()),
            fileRead: circuitBreakerManager.register('external-drive-read', CIRCUIT_BREAKER_CONFIGS.FILE_PROCESSING, async (filePath) => fs.readFile(filePath)),
            fileStat: circuitBreakerManager.register('external-drive-stat', CIRCUIT_BREAKER_CONFIGS.EXTERNAL_DRIVE, async (filePath) => fs.stat(filePath))
        };
        this.logger.info('Circuit breakers initialized for external drive operations', {
            fileSystemBreaker: this.circuitBreakers.fileSystem.getName(),
            fileReadBreaker: this.circuitBreakers.fileRead.getName(),
            fileStatBreaker: this.circuitBreakers.fileStat.getName()
        });
    }
    /**
     * Discover all HTML files in configured source directories
     * Returns array of file paths matching US News HTML pattern
     */
    async discoverFiles() {
        const timer = this.logger.startTimer('file-discovery');
        const allFiles = [];
        try {
            this.logger.info('Starting file discovery', {
                sourceDirectories: this.config.source_directories
            });
            for (const sourceDir of this.config.source_directories) {
                const result = await this.circuitBreakers.fileSystem.execute(async () => {
                    // Look for HTML files with docker_curl pattern in school-specific directories
                    const pattern = path.join(sourceDir, '**/docker_curl_*.html');
                    const files = await glob(pattern, {
                        absolute: true,
                        ignore: ['**/node_modules/**', '**/.*/**']
                    });
                    this.logger.info('Files discovered in directory', {
                        sourceDir,
                        fileCount: files.length,
                        pattern
                    });
                    return files;
                });
                if (result.success && result.data) {
                    allFiles.push(...result.data);
                }
                else {
                    this.logger.error('Circuit breaker blocked directory scan or operation failed', result.error || new Error('Unknown circuit breaker error'), {
                        sourceDir,
                        circuitState: this.circuitBreakers.fileSystem.getState(),
                        retryCount: result.retryCount
                    });
                }
            }
            this.logger.metrics('File discovery completed', {
                totalFilesDiscovered: allFiles.length,
                directoriesScanned: this.config.source_directories.length
            });
            timer.end('File discovery completed successfully');
            return allFiles;
        }
        catch (error) {
            timer.endWithError(error, 'File discovery failed');
            throw error;
        }
    }
    /**
     * Extract metadata from a single HTML file
     * Parses school slug and capture timestamp from file path
     */
    async extractMetadata(filePath) {
        const metadata = {
            file_path: filePath,
            school_slug: '',
            capture_timestamp: '',
            file_size: 0,
            checksum_sha256: '',
            is_valid: false,
            validation_errors: []
        };
        try {
            // First try to get file stats to check if file exists (with circuit breaker)
            const statResult = await this.circuitBreakers.fileStat.execute(filePath);
            if (!statResult.success || !statResult.data) {
                throw statResult.error || new Error('File stat operation failed through circuit breaker');
            }
            const stats = statResult.data;
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
            }
            else {
                metadata.validation_errors.push('Unable to parse timestamp from filename');
            }
            // Validate file size
            if (metadata.file_size === 0) {
                metadata.validation_errors.push('File is empty');
            }
            else if (metadata.file_size > this.config.max_file_size) {
                metadata.validation_errors.push(`File size ${metadata.file_size} exceeds maximum ${this.config.max_file_size}`);
            }
            // Calculate checksum if verification enabled (with circuit breaker)
            if (this.config.checksum_verification) {
                const checksumResult = await this.calculateChecksumWithCircuitBreaker(filePath);
                if (checksumResult.success && checksumResult.data) {
                    metadata.checksum_sha256 = checksumResult.data;
                }
                else {
                    metadata.validation_errors.push(`Checksum calculation failed: ${checksumResult.error?.message || 'Circuit breaker blocked operation'}`);
                }
            }
            // File is valid if no validation errors
            metadata.is_valid = metadata.validation_errors.length === 0;
        }
        catch (error) {
            // If we can't stat the file, it's a file system error
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            metadata.validation_errors.push(`File processing error: ${errorMessage}`);
            metadata.is_valid = false;
            // Store error type info for the calling function
            metadata._fileSystemError = error;
        }
        return metadata;
    }
    /**
     * Calculate SHA256 checksum for file integrity verification
     */
    async calculateChecksum(filePath) {
        try {
            const fileBuffer = await fs.readFile(filePath);
            const hash = crypto.createHash('sha256');
            hash.update(fileBuffer);
            return hash.digest('hex');
        }
        catch (error) {
            throw new Error(`Failed to calculate checksum: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Calculate SHA256 checksum with circuit breaker protection
     */
    async calculateChecksumWithCircuitBreaker(filePath) {
        const result = await this.circuitBreakers.fileRead.execute(filePath);
        if (!result.success || !result.data) {
            return { success: false, error: result.error };
        }
        try {
            const hash = crypto.createHash('sha256');
            hash.update(result.data);
            return { success: true, data: hash.digest('hex') };
        }
        catch (error) {
            return { success: false, error: error };
        }
    }
    /**
     * Determine source dataset based on file path
     */
    determineSourceDataset(filePath) {
        if (filePath.includes('USNEWS_2024')) {
            return 'USNEWS_2024';
        }
        else if (filePath.includes('USNEWS_2025')) {
            return 'USNEWS_2025';
        }
        else if (filePath.includes('wayback') || filePath.includes('archive')) {
            return 'WAYBACK_ARCHIVE';
        }
        return 'OTHER';
    }
    /**
     * Determine processing priority based on school characteristics
     * This is a placeholder - actual bucket determination happens in Silver layer
     */
    determinePriorityBucket(schoolSlug) {
        // For now, return unknown - actual bucket classification happens during extraction
        // when we can analyze the HTML content for ranking information
        return 'unknown';
    }
    /**
     * Convert file metadata to Bronze record format
     */
    createBronzeRecord(metadata) {
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
    async processBatch(filePaths, database, correlationId, batchId) {
        const timer = this.logger.startTimer('batch-processing');
        const context = {
            correlationId,
            batchId,
            fileCount: filePaths.length,
            parallelWorkers: this.config.parallel_workers
        };
        const result = {
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
                            }
                            catch (dbError) {
                                // Handle database errors (e.g., duplicates)
                                result.failed_ingestions++;
                                const error = {
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
                        }
                        else {
                            result.successful_ingestions++;
                            this.logger.debug('File processed successfully (no database)', {
                                ...context,
                                filePath,
                                schoolSlug: metadata.school_slug
                            });
                            return { success: true, record: bronzeRecord };
                        }
                    }
                    else {
                        result.failed_ingestions++;
                        // Determine error type based on whether it's a file system error or validation error
                        let errorType = 'invalid_format';
                        if (metadata._fileSystemError) {
                            const fsError = metadata._fileSystemError;
                            if (fsError instanceof Error) {
                                if (fsError.message.includes('ENOENT') || fsError.message.includes('no such file')) {
                                    errorType = 'file_not_found';
                                }
                                else if (fsError.message.includes('EACCES') || fsError.message.includes('permission')) {
                                    errorType = 'permission_denied';
                                }
                                else {
                                    errorType = 'corrupted_file';
                                }
                            }
                        }
                        const error = {
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
                }
                catch (error) {
                    result.failed_ingestions++;
                    // Determine error type based on the error
                    let errorType = 'file_not_found';
                    if (error instanceof Error) {
                        if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
                            errorType = 'file_not_found';
                        }
                        else if (error.message.includes('EACCES') || error.message.includes('permission')) {
                            errorType = 'permission_denied';
                        }
                        else {
                            errorType = 'corrupted_file';
                        }
                    }
                    const processingError = {
                        file_path: filePath,
                        error_type: errorType,
                        error_message: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: new Date().toISOString()
                    };
                    result.errors.push(processingError);
                    this.logger.error('File processing error', error, {
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
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
    /**
     * Full pipeline: discover and process all files
     */
    async processAllFiles(database, correlationId) {
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
        }
        catch (error) {
            timer.endWithError(error, 'Full dataset processing failed');
            throw error;
        }
    }
    /**
     * Validate configuration before processing
     */
    validateConfiguration() {
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
    /**
     * Get circuit breaker metrics for monitoring
     */
    getCircuitBreakerMetrics() {
        return {
            fileSystem: this.circuitBreakers.fileSystem.getMetrics(),
            fileRead: this.circuitBreakers.fileRead.getMetrics(),
            fileStat: this.circuitBreakers.fileStat.getMetrics()
        };
    }
    /**
     * Reset all circuit breakers (for testing/recovery)
     */
    resetCircuitBreakers() {
        this.circuitBreakers.fileSystem.reset();
        this.circuitBreakers.fileRead.reset();
        this.circuitBreakers.fileStat.reset();
        this.logger.info('All circuit breakers reset', {
            fileSystemState: this.circuitBreakers.fileSystem.getState(),
            fileReadState: this.circuitBreakers.fileRead.getState(),
            fileStatState: this.circuitBreakers.fileStat.getState()
        });
    }
}
//# sourceMappingURL=file-processor.js.map