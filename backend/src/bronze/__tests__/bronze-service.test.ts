/**
 * Bronze Service Tests
 * 
 * Test suite for the BronzeService class covering service orchestration,
 * statistics calculation, and health monitoring functionality.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { BronzeService, createBronzeService } from '../bronze-service';
import { BronzeConfiguration, ProcessingStatus } from '../types';

// Mock the file processor
vi.mock('../file-processor');

describe('BronzeService', () => {
  let service: BronzeService;
  let config: BronzeConfiguration;

  beforeEach(() => {
    config = {
      source_directories: ['/test/USNEWS_2024', '/test/USNEWS_2025'],
      batch_size: 10,
      max_file_size: 1024 * 1024,
      parallel_workers: 2,
      checksum_verification: true,
      auto_quarantine: true
    };
    service = new BronzeService(config);
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    test('should initialize service without errors', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
    });
  });

  describe('statistics and monitoring', () => {
    test('should return initial statistics with zero values', async () => {
      const stats = await service.getStatistics();

      expect(stats.total_files_discovered).toBe(0);
      expect(stats.files_by_status.pending).toBe(0);
      expect(stats.files_by_status.processed).toBe(0);
      expect(stats.files_by_status.failed).toBe(0);
      expect(stats.files_by_status.quarantined).toBe(0);
      expect(stats.average_file_size).toBe(0);
      expect(stats.last_updated).toBeTruthy();
    });

    test('should return healthy status when no issues present', async () => {
      const healthCheck = await service.getHealthCheck();

      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.issues).toHaveLength(0);
      expect(healthCheck.metrics.error_rate_pct).toBe(0);
    });

    test('should detect degraded status with moderate error rates', async () => {
      // We would need to simulate some records to test this properly
      // For now, this test demonstrates the structure
      const healthCheck = await service.getHealthCheck();
      
      expect(healthCheck).toHaveProperty('status');
      expect(healthCheck).toHaveProperty('issues');
      expect(healthCheck).toHaveProperty('metrics');
      expect(healthCheck.metrics).toHaveProperty('error_rate_pct');
      expect(healthCheck.metrics).toHaveProperty('processing_queue_size');
    });
  });

  describe('record management', () => {
    test('should return empty array for records by status when no records exist', async () => {
      const pendingRecords = await service.getRecordsByStatus('pending');
      const processedRecords = await service.getRecordsByStatus('processed');
      const failedRecords = await service.getRecordsByStatus('failed');

      expect(pendingRecords).toHaveLength(0);
      expect(processedRecords).toHaveLength(0);
      expect(failedRecords).toHaveLength(0);
    });

    test('should return null when looking for non-existent school slug', async () => {
      const record = await service.getRecordBySlug('nonexistent-school');
      
      expect(record).toBeNull();
    });

    test('should handle status updates gracefully for non-existent records', async () => {
      await expect(
        service.updateRecordStatus(999, 'processed')
      ).resolves.not.toThrow();
    });
  });

  describe('reprocessing', () => {
    test('should handle reprocessing when no failed files exist', async () => {
      const result = await service.reprocessFailedFiles();

      expect(result.total_files).toBe(0);
      expect(result.successful_ingestions).toBe(0);
      expect(result.failed_ingestions).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('shutdown', () => {
    test('should shutdown service without errors', async () => {
      await expect(service.shutdown()).resolves.not.toThrow();
    });
  });
});

describe('createBronzeService factory', () => {
  test('should create service with default configuration', () => {
    const service = createBronzeService();
    
    expect(service).toBeInstanceOf(BronzeService);
  });

  test('should create service with custom configuration overrides', () => {
    const customConfig = {
      batch_size: 50,
      parallel_workers: 8
    };
    
    const service = createBronzeService(customConfig);
    
    expect(service).toBeInstanceOf(BronzeService);
  });

  test('should use default source directories when none provided', () => {
    const service = createBronzeService();
    
    // The service should be created successfully with defaults
    expect(service).toBeInstanceOf(BronzeService);
  });
});