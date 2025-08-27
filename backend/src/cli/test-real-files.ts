#!/usr/bin/env node

/**
 * Test Bronze Layer with Real Files
 * 
 * Validates MVP Bronze functionality by processing actual HTML files.
 */

import { createBronzeService } from '../bronze/bronze-service';
import { createBronzeLogger } from '../common/logger';

async function testRealFiles() {
  const logger = createBronzeLogger({ component: 'real-file-test' });
  
  logger.info('🧪 Starting Bronze Layer Real File Test');
  
  try {
    // Create service with test database
    const service = createBronzeService({
      source_directories: ['/Volumes/OWC Express 1M2/USNEWS_2024'],
      batch_size: 5,
      parallel_workers: 2,
      checksum_verification: false // Disable for speed in MVP test
    }, './data/bronze-mvp-test.db');
    
    await service.initialize();
    logger.info('✅ Bronze service initialized successfully');
    
    // Test file discovery
    logger.info('📁 Discovering HTML files...');
    const allFiles = await service.processor.discoverFiles();
    const testFiles = allFiles.slice(0, 10);
    
    logger.info('File discovery results', {
      totalFilesFound: allFiles.length,
      testFileCount: testFiles.length,
      sampleFiles: testFiles.slice(0, 3)
    });
    
    if (testFiles.length === 0) {
      throw new Error('No HTML files found for testing');
    }
    
    // Process the batch of files
    logger.info('🔄 Processing test files...');
    const result = await service.processBatch(testFiles);
    
    logger.info('Processing results', {
      totalFiles: result.total_files,
      successful: result.successful_ingestions,
      failed: result.failed_ingestions,
      skipped: result.skipped_files,
      processingTimeMs: result.processing_time_ms,
      errorCount: result.errors.length
    });
    
    // Log any errors for debugging
    if (result.errors.length > 0) {
      logger.warn('Processing errors detected', {
        errors: result.errors.map(e => ({
          file: e.file_path,
          type: e.error_type,
          message: e.error_message
        }))
      });
    }
    
    // Verify database persistence
    logger.info('💾 Checking database persistence...');
    const stats = await service.getStatistics();
    
    logger.info('Database statistics', {
      totalRecords: stats.total_files_discovered,
      recordsByStatus: stats.files_by_status,
      recordsByDataset: stats.files_by_dataset
    });
    
    // Test record retrieval
    if (stats.total_files_discovered > 0) {
      const processedRecords = await service.getRecordsByStatus('processed');
      logger.info('✅ Database retrieval test successful', {
        processedRecords: processedRecords.length
      });
    }
    
    await service.shutdown();
    logger.info('🎉 MVP Bronze Layer Test Complete!');
    
    // Determine test success
    const successRate = result.total_files > 0 ? 
      (result.successful_ingestions / result.total_files) * 100 : 0;
    
    if (successRate >= 70) {
      logger.info('✅ MVP TEST PASSED', {
        successRate: Math.round(successRate),
        threshold: 70
      });
      console.log('\n🎉 MVP Bronze Layer is ready for Silver development!');
    } else {
      logger.error('❌ MVP TEST FAILED', {
        successRate: Math.round(successRate),
        threshold: 70
      });
      console.log('\n❌ Bronze layer needs more work before Silver development');
      process.exit(1);
    }
    
  } catch (error) {
    logger.error('Real file test failed', error as Error);
    console.log('\n❌ Bronze layer test failed - needs debugging');
    process.exit(1);
  }
}

// Run the test
testRealFiles().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});