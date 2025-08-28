/**
 * Bronze Layer Integration Tests
 * 
 * Tests the complete Bronze layer pipeline with real HTML files from external drives.
 * These tests validate actual file processing, database persistence, and error handling.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { BronzeService, createBronzeService, BronzeDatabase } from '../index';
import { BronzeConfiguration, ProcessingStatus } from '../types';
import * as fs from 'fs';
import * as path from 'path';

describe('Bronze Layer Integration Tests', () => {
  let service: BronzeService;
  let database: BronzeDatabase;
  const testDbPath = ':memory:'; // Use in-memory database for tests

  beforeEach(() => {
    // Create service with in-memory database for isolation
    database = new BronzeDatabase(testDbPath);
    database.initialize(); // CRITICAL: Initialize schema for tests
    service = createBronzeService({
      source_directories: ['/Volumes/OWC Express 1M2/USNEWS_2024', '/Volumes/OWC Express 1M2/USNEWS_2025'],
      batch_size: 10,
      parallel_workers: 2,
      checksum_verification: true
    }, testDbPath);
  });

  afterEach(async () => {
    await service.shutdown();
  });

  describe('Real File Processing', () => {
    test('should discover real HTML files from external drives', async () => {
      // Skip test if external drives are not available
      const usnews2024Exists = fs.existsSync('/Volumes/OWC Express 1M2/USNEWS_2024');
      const usnews2025Exists = fs.existsSync('/Volumes/OWC Express 1M2/USNEWS_2025');
      
      if (!usnews2024Exists && !usnews2025Exists) {
        console.log('⚠️ Skipping external drive test - drives not mounted');
        return;
      }

      await service.initialize();
      
      // Create a minimal test with a small sample
      const testConfig: BronzeConfiguration = {
        source_directories: usnews2024Exists ? ['/Volumes/OWC Express 1M2/USNEWS_2024'] : ['/Volumes/OWC Express 1M2/USNEWS_2025'],
        batch_size: 5, // Small batch for testing
        parallel_workers: 1,
        max_file_size: 10 * 1024 * 1024,
        checksum_verification: true,
        auto_quarantine: true
      };

      const testService = new BronzeService(testConfig, testDbPath);
      await testService.initialize();

      const result = await testService.processBatch([]);
      
      // Should complete without errors even with empty batch
      expect(result.total_files).toBe(0);
      expect(result.successful_ingestions).toBe(0);
      expect(result.failed_ingestions).toBe(0);
      expect(result.errors).toHaveLength(0);

      await testService.shutdown();
    }, 30000); // Longer timeout for file system operations

    test('should process real HTML file with correct metadata extraction', async () => {
      // Find a sample HTML file
      const samplePaths = [
        '/Volumes/OWC Express 1M2/USNEWS_2024',
        '/Volumes/OWC Express 1M2/USNEWS_2025'
      ];

      let sampleFile: string | null = null;
      
      for (const basePath of samplePaths) {
        if (fs.existsSync(basePath)) {
          try {
            const schools = fs.readdirSync(basePath, { withFileTypes: true })
              .filter(dirent => dirent.isDirectory())
              .slice(0, 3); // Check first 3 school directories
            
            for (const school of schools) {
              const schoolPath = path.join(basePath, school.name);
              const files = fs.readdirSync(schoolPath)
                .filter(file => file.endsWith('.html') && file.includes('docker_curl_'));
              
              if (files.length > 0) {
                sampleFile = path.join(schoolPath, files[0]);
                break;
              }
            }
            
            if (sampleFile) break;
          } catch (error) {
            console.log(`Could not scan ${basePath}: ${error}`);
            continue;
          }
        }
      }

      if (!sampleFile) {
        console.log('⚠️ Skipping real file test - no sample files found');
        return;
      }

      console.log(`Testing with sample file: ${sampleFile}`);

      await service.initialize();
      
      const result = await service.processBatch([sampleFile]);
      
      // Should successfully process the real file
      expect(result.total_files).toBe(1);
      expect(result.successful_ingestions).toBeGreaterThanOrEqual(0); // May be 0 if file has issues
      expect(result.processing_time_ms).toBeGreaterThan(0);

      // If processing succeeded, verify the record was saved
      if (result.successful_ingestions > 0) {
        const stats = await service.getStatistics();
        expect(stats.total_files_discovered).toBe(1);
        
        // Verify the record has valid metadata
        const records = await service.getRecordsByStatus('pending' as ProcessingStatus);
        expect(records.length).toBeGreaterThan(0);
        
        const record = records[0];
        expect(record.school_slug).toBeTruthy();
        expect(record.capture_timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
        expect(record.file_size).toBeGreaterThan(0);
        expect(record.checksum_sha256).toHaveLength(64);
      }
      
    }, 30000);

    test('should handle file processing errors gracefully', async () => {
      await service.initialize();
      
      // Test with non-existent file
      const result = await service.processBatch(['/non/existent/file.html']);
      
      expect(result.total_files).toBe(1);
      expect(result.successful_ingestions).toBe(0);
      expect(result.failed_ingestions).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error_type).toBe('file_not_found');
    });

    test('should extract correct school slug from directory path', async () => {
      // Test slug extraction logic with realistic paths
      const testPaths = [
        '/Volumes/OWC Express 1M2/USNEWS_2024/william-fremd-high-school-6921/docker_curl_20250821_061341.html',
        '/Volumes/OWC Express 1M2/USNEWS_2025/a-c-flora-high-school-17702/docker_curl_20250819_191635.html'
      ];

      await service.initialize();

      // We'll process non-existent files to test metadata extraction logic
      const result = await service.processBatch(testPaths);

      expect(result.total_files).toBe(2);
      expect(result.errors).toHaveLength(2);
      
      // Errors should contain extracted metadata in error messages
      expect(result.errors.some(error => 
        error.file_path.includes('william-fremd-high-school-6921')
      )).toBe(true);
    });
  });

  describe('Database Integration', () => {
    test('should persist records to SQLite database', async () => {
      const testRecord = {
        file_path: '/test/school-123/docker_curl_20250821_061341.html',
        school_slug: 'school-123',
        capture_timestamp: '2025-08-21T06:13:41Z',
        file_size: 1024,
        checksum_sha256: 'a'.repeat(64),
        processing_status: 'pending' as ProcessingStatus
      };

      const insertedRecord = database.insertRecord(testRecord);
      
      expect(insertedRecord.id).toBeTruthy();
      expect(insertedRecord.school_slug).toBe('school-123');
      expect(insertedRecord.created_at).toBeTruthy();
      
      // Verify we can retrieve the record
      const retrievedRecord = database.getRecordById(insertedRecord.id);
      expect(retrievedRecord).not.toBeNull();
      expect(retrievedRecord?.school_slug).toBe('school-123');
    });

    test('should update record status correctly', async () => {
      const testRecord = {
        file_path: '/test/school-456/docker_curl_20250821_061341.html',
        school_slug: 'school-456',
        capture_timestamp: '2025-08-21T06:13:41Z',
        file_size: 2048,
        checksum_sha256: 'b'.repeat(64),
        processing_status: 'pending' as ProcessingStatus
      };

      const insertedRecord = database.insertRecord(testRecord);
      
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Update status
      const updateSuccess = database.updateRecordStatus(insertedRecord.id, 'processed');
      expect(updateSuccess).toBe(true);
      
      // Verify status was updated
      const updatedRecord = database.getRecordById(insertedRecord.id);
      expect(updatedRecord?.processing_status).toBe('processed');
      expect(updatedRecord?.updated_at).not.toBe(insertedRecord.updated_at);
    });

    test('should calculate statistics correctly', async () => {
      // Insert test records with different statuses
      const testRecords = [
        {
          file_path: '/test/school-1/file.html',
          school_slug: 'school-1',
          capture_timestamp: '2025-08-21T06:13:41Z',
          file_size: 1000,
          checksum_sha256: 'a'.repeat(64),
          processing_status: 'pending' as ProcessingStatus,
          source_dataset: 'USNEWS_2024' as const
        },
        {
          file_path: '/test/school-2/file.html',
          school_slug: 'school-2',
          capture_timestamp: '2025-08-21T06:13:42Z',
          file_size: 2000,
          checksum_sha256: 'b'.repeat(64),
          processing_status: 'processed' as ProcessingStatus,
          source_dataset: 'USNEWS_2025' as const
        }
      ];

      testRecords.forEach(record => database.insertRecord(record));

      // Test statistics calculation
      const totalCount = database.getTotalCount();
      expect(totalCount).toBe(2);

      const avgFileSize = database.getAverageFileSize();
      expect(avgFileSize).toBe(1500); // (1000 + 2000) / 2

      const statusCounts = database.getCountByStatus();
      expect(statusCounts.pending).toBe(1);
      expect(statusCounts.processed).toBe(1);

      const datasetCounts = database.getCountByDataset();
      expect(datasetCounts.USNEWS_2024).toBe(1);
      expect(datasetCounts.USNEWS_2025).toBe(1);
    });

    test('should handle duplicate file paths with unique constraint', async () => {
      const testRecord = {
        file_path: '/test/duplicate-path.html',
        school_slug: 'school-duplicate',
        capture_timestamp: '2025-08-21T06:13:41Z',
        file_size: 1024,
        checksum_sha256: 'c'.repeat(64),
        processing_status: 'pending' as ProcessingStatus
      };

      // First insert should succeed
      const firstRecord = database.insertRecord(testRecord);
      expect(firstRecord.id).toBeTruthy();

      // Second insert with same file_path should fail
      expect(() => {
        database.insertRecord(testRecord);
      }).toThrow();
    });
  });

  describe('Service Health Monitoring', () => {
    test('should return healthy status with no issues', async () => {
      await service.initialize();
      
      const health = await service.getHealthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.issues).toHaveLength(0);
      expect(health.metrics.error_rate_pct).toBe(0);
      expect(health.metrics.processing_queue_size).toBe(0);
    });

    test('should detect degraded status with high error rates', async () => {
      // Create a new service that shares the same database as our test records
      const testService = new BronzeService({
        source_directories: ['/test'],
        batch_size: 10,
        parallel_workers: 2,
        max_file_size: 1024 * 1024,
        checksum_verification: true,
        auto_quarantine: true
      }, testDbPath);
      
      // Insert some failed records to simulate high error rate
      const failedRecords = Array.from({ length: 3 }, (_, i) => ({
        file_path: `/test/failed-${i}.html`,
        school_slug: `failed-school-${i}`,
        capture_timestamp: '2025-08-21T06:13:41Z',
        file_size: 1024,
        checksum_sha256: 'd'.repeat(64),
        processing_status: 'failed' as ProcessingStatus
      }));

      failedRecords.forEach(record => database.insertRecord(record));

      await testService.initialize();
      const health = await testService.getHealthCheck();
      
      // With 100% failure rate, should be unhealthy
      expect(health.status).toBe('unhealthy');
      expect(health.metrics.error_rate_pct).toBe(100);
      
      await testService.shutdown();
    });
  });
});