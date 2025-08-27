/**
 * Bronze Layer Performance Tests
 * 
 * Tests performance characteristics of Bronze layer processing including
 * large batch processing, parallel workers, and memory usage patterns.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { BronzeService, createBronzeService, BronzeDatabase } from '../index';
import { BronzeConfiguration } from '../types';
import * as fs from 'fs';
import * as path from 'path';

describe('Bronze Layer Performance Tests', () => {
  let service: BronzeService;
  let database: BronzeDatabase;
  const testDbPath = ':memory:';

  beforeEach(() => {
    database = new BronzeDatabase(testDbPath);
  });

  afterEach(async () => {
    if (service) {
      await service.shutdown();
    }
  });

  describe('Batch Processing Performance', () => {
    test('should process 100 file sample within performance budget', async () => {
      // Get sample files from external drives if available
      const sampleFiles = await getSampleFiles(100);
      
      if (sampleFiles.length === 0) {
        console.log('⚠️ Skipping performance test - no sample files available');
        return;
      }

      console.log(`Testing performance with ${sampleFiles.length} files`);

      const config: BronzeConfiguration = {
        source_directories: ['/Volumes/OWC Express 1M2/USNEWS_2024', '/Volumes/OWC Express 1M2/USNEWS_2025'],
        batch_size: 50,
        parallel_workers: 4,
        max_file_size: 10 * 1024 * 1024,
        checksum_verification: true,
        auto_quarantine: true
      };

      service = new BronzeService(config, testDbPath);
      await service.initialize();

      const startTime = Date.now();
      const startMemory = process.memoryUsage();

      const result = await service.processBatch(sampleFiles);

      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      const processingTime = endTime - startTime;

      console.log(`Processed ${result.total_files} files in ${processingTime}ms`);
      console.log(`Success rate: ${(result.successful_ingestions / result.total_files * 100).toFixed(1)}%`);
      console.log(`Memory delta: ${((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2)} MB`);

      // Performance assertions
      expect(processingTime).toBeLessThan(60000); // Should complete within 60 seconds
      expect(result.processing_time_ms).toBeGreaterThan(0);
      
      // Memory usage should be reasonable (less than 100MB increase for 100 files)
      const memoryIncreaseMB = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024;
      expect(memoryIncreaseMB).toBeLessThan(100);

      // Should achieve reasonable success rate (at least 80% for real files)
      if (result.total_files > 0) {
        const successRate = result.successful_ingestions / result.total_files;
        expect(successRate).toBeGreaterThan(0.8);
      }
    }, 120000); // 2 minute timeout

    test('should scale processing with parallel workers', async () => {
      const sampleFiles = await getSampleFiles(20);
      
      if (sampleFiles.length === 0) {
        console.log('⚠️ Skipping parallel worker test - no sample files available');
        return;
      }

      // Test with 1 worker
      const configSingle: BronzeConfiguration = {
        source_directories: ['/Volumes/OWC Express 1M2/USNEWS_2024'],
        batch_size: 10,
        parallel_workers: 1,
        max_file_size: 10 * 1024 * 1024,
        checksum_verification: false, // Disable for speed comparison
        auto_quarantine: true
      };

      const serviceSingle = new BronzeService(configSingle, ':memory:');
      await serviceSingle.initialize();

      const startSingle = Date.now();
      const resultSingle = await serviceSingle.processBatch(sampleFiles);
      const timeSingle = Date.now() - startSingle;

      await serviceSingle.shutdown();

      // Test with 4 workers
      const configMultiple: BronzeConfiguration = {
        ...configSingle,
        parallel_workers: 4
      };

      const serviceMultiple = new BronzeService(configMultiple, ':memory:');
      await serviceMultiple.initialize();

      const startMultiple = Date.now();
      const resultMultiple = await serviceMultiple.processBatch(sampleFiles);
      const timeMultiple = Date.now() - startMultiple;

      await serviceMultiple.shutdown();

      console.log(`Single worker: ${timeSingle}ms`);
      console.log(`Multiple workers: ${timeMultiple}ms`);

      // Parallel processing should generally be faster (or at least not much slower)
      // Allow for some variance due to test environment
      expect(timeMultiple).toBeLessThan(timeSingle * 1.5);
      
      // Results should be equivalent
      expect(resultMultiple.total_files).toBe(resultSingle.total_files);
    }, 90000);

    test('should handle memory pressure gracefully', async () => {
      // Create a service with limited resources
      const config: BronzeConfiguration = {
        source_directories: ['/Volumes/OWC Express 1M2/USNEWS_2024'],
        batch_size: 1000, // Large batch to test memory handling
        parallel_workers: 2,
        max_file_size: 1024 * 1024, // 1MB limit
        checksum_verification: true,
        auto_quarantine: true
      };

      service = new BronzeService(config, testDbPath);
      await service.initialize();

      const initialMemory = process.memoryUsage();

      // Generate mock file paths (these won't exist, testing error handling)
      const mockFiles = Array.from({ length: 1000 }, (_, i) => 
        `/mock/path/school-${i}/docker_curl_20250821_061341.html`
      );

      const result = await service.processBatch(mockFiles);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;

      console.log(`Memory increase for 1000 files: ${memoryIncrease.toFixed(2)} MB`);

      // Should handle all files without crashing
      expect(result.total_files).toBe(1000);
      expect(result.failed_ingestions).toBe(1000); // All should fail (files don't exist)
      
      // Memory usage should remain reasonable even with large batches
      expect(memoryIncrease).toBeLessThan(200); // Less than 200MB increase
    }, 60000);
  });

  describe('Database Performance', () => {
    test('should handle bulk inserts efficiently', async () => {
      const recordCount = 1000;
      const testRecords = Array.from({ length: recordCount }, (_, i) => ({
        file_path: `/test/bulk-${i}/docker_curl_20250821_061341.html`,
        school_slug: `bulk-school-${i}`,
        capture_timestamp: '2025-08-21T06:13:41Z',
        file_size: 1024 + i,
        checksum_sha256: i.toString().padStart(64, '0'),
        processing_status: 'pending' as const
      }));

      const startTime = Date.now();

      // Insert records in a transaction for better performance
      database.transaction(() => {
        testRecords.forEach(record => database.insertRecord(record));
      });

      const insertTime = Date.now() - startTime;

      console.log(`Inserted ${recordCount} records in ${insertTime}ms`);
      console.log(`Rate: ${(recordCount / insertTime * 1000).toFixed(0)} records/second`);

      // Should complete bulk insert within reasonable time
      expect(insertTime).toBeLessThan(5000); // Less than 5 seconds

      // Verify all records were inserted
      const totalCount = database.getTotalCount();
      expect(totalCount).toBe(recordCount);

      // Test query performance
      const queryStart = Date.now();
      const pendingRecords = database.getRecordsByStatus('pending');
      const queryTime = Date.now() - queryStart;

      console.log(`Queried ${pendingRecords.length} records in ${queryTime}ms`);

      // Query should be fast
      expect(queryTime).toBeLessThan(1000); // Less than 1 second
      expect(pendingRecords.length).toBe(recordCount);
    }, 30000);

    test('should maintain performance with concurrent operations', async () => {
      const concurrentOps = 10;
      const recordsPerOp = 100;

      const operations = Array.from({ length: concurrentOps }, (_, opIndex) =>
        database.transaction(() => {
          const records = Array.from({ length: recordsPerOp }, (_, i) => ({
            file_path: `/concurrent/op-${opIndex}/record-${i}.html`,
            school_slug: `concurrent-school-${opIndex}-${i}`,
            capture_timestamp: '2025-08-21T06:13:41Z',
            file_size: 1024,
            checksum_sha256: (opIndex * recordsPerOp + i).toString().padStart(64, '0'),
            processing_status: 'pending' as const
          }));

          return records.map(record => database.insertRecord(record));
        })
      );

      const startTime = Date.now();
      
      // Execute all operations concurrently
      const results = await Promise.all(operations);
      
      const totalTime = Date.now() - startTime;
      const totalRecords = concurrentOps * recordsPerOp;

      console.log(`Concurrent operations: ${totalRecords} records in ${totalTime}ms`);

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(10000); // Less than 10 seconds

      // All operations should succeed
      results.forEach(opResults => {
        expect(opResults).toHaveLength(recordsPerOp);
        opResults.forEach(record => {
          expect(record.id).toBeTruthy();
        });
      });

      // Verify final count
      const finalCount = database.getTotalCount();
      expect(finalCount).toBe(totalRecords);
    }, 30000);
  });

  describe('Error Recovery Performance', () => {
    test('should handle large numbers of failures efficiently', async () => {
      // Create mix of valid and invalid file paths
      const totalFiles = 500;
      const invalidRatio = 0.7; // 70% invalid files
      
      const testFiles = Array.from({ length: totalFiles }, (_, i) => {
        if (i < totalFiles * invalidRatio) {
          return `/invalid/path/file-${i}.html`; // These will fail
        } else {
          return `/test/valid-${i}/docker_curl_20250821_061341.html`; // These have valid structure
        }
      });

      const config: BronzeConfiguration = {
        source_directories: ['/test'],
        batch_size: 100,
        parallel_workers: 4,
        max_file_size: 10 * 1024 * 1024,
        checksum_verification: false,
        auto_quarantine: true
      };

      service = new BronzeService(config, testDbPath);
      await service.initialize();

      const startTime = Date.now();
      const result = await service.processBatch(testFiles);
      const processingTime = Date.now() - startTime;

      console.log(`Processed ${result.total_files} files (${result.failed_ingestions} failures) in ${processingTime}ms`);

      // Should complete within reasonable time even with many failures
      expect(processingTime).toBeLessThan(30000); // Less than 30 seconds

      // Should track all errors
      expect(result.errors.length).toBe(result.failed_ingestions);
      expect(result.total_files).toBe(totalFiles);

      // Error tracking should not significantly impact performance
      const avgTimePerFile = processingTime / totalFiles;
      expect(avgTimePerFile).toBeLessThan(100); // Less than 100ms per file
    }, 60000);
  });

  /**
   * Helper function to get sample files from external drives
   */
  async function getSampleFiles(maxCount: number): Promise<string[]> {
    const sampleFiles: string[] = [];
    const basePaths = [
      '/Volumes/OWC Express 1M2/USNEWS_2024',
      '/Volumes/OWC Express 1M2/USNEWS_2025'
    ];

    for (const basePath of basePaths) {
      if (!fs.existsSync(basePath)) continue;

      try {
        const schools = fs.readdirSync(basePath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .slice(0, Math.ceil(maxCount / 2)); // Split between datasets

        for (const school of schools) {
          if (sampleFiles.length >= maxCount) break;

          const schoolPath = path.join(basePath, school.name);
          try {
            const files = fs.readdirSync(schoolPath)
              .filter(file => file.endsWith('.html') && file.includes('docker_curl_'))
              .slice(0, 1); // One file per school

            files.forEach(file => {
              if (sampleFiles.length < maxCount) {
                sampleFiles.push(path.join(schoolPath, file));
              }
            });
          } catch (error) {
            // Skip schools we can't read
            continue;
          }
        }
      } catch (error) {
        console.log(`Could not scan ${basePath}: ${error}`);
        continue;
      }
    }

    return sampleFiles.slice(0, maxCount);
  }
});