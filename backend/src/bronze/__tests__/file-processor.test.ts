/**
 * Bronze Layer File Processor Tests
 * 
 * Comprehensive test suite for the BronzeFileProcessor class
 * covering file discovery, metadata extraction, and batch processing.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BronzeFileProcessor } from '../file-processor';
import { BronzeConfiguration } from '../types';

// Mock external dependencies
vi.mock('fs/promises');
vi.mock('glob');

const mockFs = vi.mocked(fs);

describe('BronzeFileProcessor', () => {
  let processor: BronzeFileProcessor;
  let config: BronzeConfiguration;

  beforeEach(() => {
    config = {
      source_directories: ['/test/USNEWS_2024', '/test/USNEWS_2025'],
      batch_size: 10,
      max_file_size: 1024 * 1024, // 1MB
      parallel_workers: 2,
      checksum_verification: true,
      auto_quarantine: true
    };
    processor = new BronzeFileProcessor(config);
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractMetadata', () => {
    test('should extract valid metadata from properly formatted file path', async () => {
      const testPath = '/test/USNEWS_2025/william-fremd-high-school-6921/docker_curl_20250821_061341.html';
      const testContent = '<html><body>Test HTML</body></html>';
      
      // Mock file system calls
      mockFs.stat.mockResolvedValue({
        size: 1024,
        isFile: () => true,
        isDirectory: () => false
      } as any);
      
      mockFs.readFile.mockResolvedValue(Buffer.from(testContent));

      const metadata = await processor.extractMetadata(testPath);

      expect(metadata.school_slug).toBe('william-fremd-high-school-6921');
      expect(metadata.capture_timestamp).toBe('2025-08-21T06:13:41Z');
      expect(metadata.file_size).toBe(1024);
      expect(metadata.is_valid).toBe(true);
      expect(metadata.validation_errors).toHaveLength(0);
    });

    test('should handle invalid file path format gracefully', async () => {
      const testPath = '/test/invalid-path.html';
      
      mockFs.stat.mockResolvedValue({
        size: 1024,
        isFile: () => true,
        isDirectory: () => false
      } as any);

      const metadata = await processor.extractMetadata(testPath);

      expect(metadata.is_valid).toBe(false);
      expect(metadata.validation_errors.length).toBeGreaterThan(0);
    });

    test('should handle invalid timestamp format', async () => {
      const testPath = '/test/USNEWS_2025/test-school/invalid_timestamp.html';
      
      mockFs.stat.mockResolvedValue({
        size: 1024,
        isFile: () => true,
        isDirectory: () => false
      } as any);
      
      mockFs.readFile.mockResolvedValue(Buffer.from('test'));

      const metadata = await processor.extractMetadata(testPath);

      expect(metadata.is_valid).toBe(false);
      expect(metadata.validation_errors).toContain('Unable to parse timestamp from filename');
    });

    test('should detect empty files', async () => {
      const testPath = '/test/USNEWS_2025/test-school/docker_curl_20250821_061341.html';
      
      mockFs.stat.mockResolvedValue({
        size: 0,
        isFile: () => true,
        isDirectory: () => false
      } as any);

      const metadata = await processor.extractMetadata(testPath);

      expect(metadata.is_valid).toBe(false);
      expect(metadata.validation_errors).toContain('File is empty');
    });

    test('should detect oversized files', async () => {
      const testPath = '/test/USNEWS_2025/test-school/docker_curl_20250821_061341.html';
      const oversizeFile = config.max_file_size + 1000;
      
      mockFs.stat.mockResolvedValue({
        size: oversizeFile,
        isFile: () => true,
        isDirectory: () => false
      } as any);

      const metadata = await processor.extractMetadata(testPath);

      expect(metadata.is_valid).toBe(false);
      expect(metadata.validation_errors).toContain(
        `File size ${oversizeFile} exceeds maximum ${config.max_file_size}`
      );
    });

    test('should handle file system errors gracefully', async () => {
      const testPath = '/test/nonexistent/docker_curl_20250821_061341.html';
      
      mockFs.stat.mockRejectedValue(new Error('File not found'));

      const metadata = await processor.extractMetadata(testPath);

      expect(metadata.is_valid).toBe(false);
      expect(metadata.validation_errors.some(error => 
        error.includes('File processing error')
      )).toBe(true);
    });

    test('should calculate checksum when verification enabled', async () => {
      const testPath = '/test/USNEWS_2025/test-school/docker_curl_20250821_061341.html';
      const testContent = 'test content for checksum';
      
      mockFs.stat.mockResolvedValue({
        size: testContent.length,
        isFile: () => true,
        isDirectory: () => false
      } as any);
      
      mockFs.readFile.mockResolvedValue(Buffer.from(testContent));

      const metadata = await processor.extractMetadata(testPath);

      expect(metadata.checksum_sha256).toBeTruthy();
      expect(metadata.checksum_sha256).toHaveLength(64); // SHA256 hex length
    });

    test('should skip checksum when verification disabled', async () => {
      const configNoChecksum = { ...config, checksum_verification: false };
      const processorNoChecksum = new BronzeFileProcessor(configNoChecksum);
      
      const testPath = '/test/USNEWS_2025/test-school/docker_curl_20250821_061341.html';
      
      mockFs.stat.mockResolvedValue({
        size: 1024,
        isFile: () => true,
        isDirectory: () => false
      } as any);

      const metadata = await processorNoChecksum.extractMetadata(testPath);

      expect(metadata.checksum_sha256).toBe('');
    });
  });

  describe('processBatch', () => {
    test('should process valid files successfully', async () => {
      const testFiles = [
        '/test/USNEWS_2025/school-1/docker_curl_20250821_061341.html',
        '/test/USNEWS_2025/school-2/docker_curl_20250821_061342.html'
      ];
      
      // Mock successful file processing
      mockFs.stat.mockResolvedValue({
        size: 1024,
        isFile: () => true,
        isDirectory: () => false
      } as any);
      
      mockFs.readFile.mockResolvedValue(Buffer.from('test content'));

      const result = await processor.processBatch(testFiles);

      expect(result.total_files).toBe(2);
      expect(result.successful_ingestions).toBe(2);
      expect(result.failed_ingestions).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    test('should handle mixed valid and invalid files', async () => {
      const testFiles = [
        '/test/USNEWS_2025/valid-school/docker_curl_20250821_061341.html',
        '/test/invalid-path.html'
      ];
      
      // Mock file system responses
      mockFs.stat.mockImplementation((filePath) => {
        if (filePath.toString().includes('valid-school')) {
          return Promise.resolve({
            size: 1024,
            isFile: () => true,
            isDirectory: () => false
          } as any);
        }
        return Promise.resolve({
          size: 1024,
          isFile: () => true,
          isDirectory: () => false
        } as any);
      });
      
      mockFs.readFile.mockResolvedValue(Buffer.from('test content'));

      const result = await processor.processBatch(testFiles);

      expect(result.total_files).toBe(2);
      expect(result.successful_ingestions).toBe(1);
      expect(result.failed_ingestions).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error_type).toBe('invalid_format');
    });

    test('should handle file system errors during batch processing', async () => {
      const testFiles = [
        '/test/USNEWS_2025/school-1/docker_curl_20250821_061341.html'
      ];
      
      mockFs.stat.mockRejectedValue(new Error('Permission denied'));

      const result = await processor.processBatch(testFiles);

      expect(result.total_files).toBe(1);
      expect(result.successful_ingestions).toBe(0);
      expect(result.failed_ingestions).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(['file_not_found', 'permission_denied', 'corrupted_file']).toContain(result.errors[0].error_type);
    });

    test('should process empty batch gracefully', async () => {
      const result = await processor.processBatch([]);

      expect(result.total_files).toBe(0);
      expect(result.successful_ingestions).toBe(0);
      expect(result.failed_ingestions).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateConfiguration', () => {
    test('should pass validation with valid configuration', () => {
      expect(() => {
        processor.validateConfiguration();
      }).not.toThrow();
    });

    test('should fail validation with empty source directories', () => {
      const invalidConfig = { ...config, source_directories: [] };
      const invalidProcessor = new BronzeFileProcessor(invalidConfig);

      expect(() => {
        invalidProcessor.validateConfiguration();
      }).toThrow('No source directories configured');
    });

    test('should fail validation with invalid batch size', () => {
      const invalidConfig = { ...config, batch_size: 0 };
      const invalidProcessor = new BronzeFileProcessor(invalidConfig);

      expect(() => {
        invalidProcessor.validateConfiguration();
      }).toThrow('Batch size must be positive');
    });

    test('should fail validation with invalid parallel workers', () => {
      const invalidConfig = { ...config, parallel_workers: -1 };
      const invalidProcessor = new BronzeFileProcessor(invalidConfig);

      expect(() => {
        invalidProcessor.validateConfiguration();
      }).toThrow('Parallel workers must be positive');
    });
  });
});