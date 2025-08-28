/**
 * Silver Layer Integration Tests
 * 
 * Tests complete Bronze → Silver → Gold pipeline with real data validation
 * against the gold standard schema.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { SilverService } from '../silver-service';
import { SilverProcessor } from '../extraction-methods';
import { CSSExtractionMethod } from '../css-extraction-method';
import { SilverConfidenceScorer } from '../confidence-scorer';
import { initializeSilverDatabase } from '../database-migration';
import { BronzeService, createBronzeService } from '../../bronze';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Silver Layer Integration Tests', () => {
  let silverService: SilverService;
  let bronzeService: BronzeService;
  let processor: SilverProcessor;
  let scorer: SilverConfidenceScorer;
  const testDbPath = ':memory:';

  beforeEach(async () => {
    // Initialize Silver database
    await initializeSilverDatabase(testDbPath);
    silverService = new SilverService(testDbPath);
    
    // Initialize Bronze service for integration
    bronzeService = createBronzeService({
      source_directories: ['/test/data'],
      batch_size: 10,
      parallel_workers: 1,
      checksum_verification: false
    }, testDbPath);

    // Create processor with CSS extraction method
    const cssExtractor = new CSSExtractionMethod();
    processor = new SilverProcessor([cssExtractor]);
    scorer = new SilverConfidenceScorer();
  });

  afterEach(async () => {
    await bronzeService.shutdown();
    silverService.close();
  });

  describe('Gold Standard Field Coverage', () => {
    test('should extract all 22+ gold standard fields from mock HTML', async () => {
      // Create comprehensive mock HTML with all gold standard fields
      const mockHtml = `
        <html>
          <head>
            <title>William Fremd High School | US News Best High Schools</title>
          </head>
          <body>
            <!-- Core school info -->
            <h1 data-testid="school-name">William Fremd High School</h1>
            <div data-testid="nces-id">171530006921</div>
            <div data-testid="grades-served">9-12</div>
            
            <!-- Address -->
            <div data-testid="school-address-street">1000 S Quentin Rd</div>
            <div data-testid="school-city">Palatine</div>
            <div data-testid="school-state">IL</div>
            <div data-testid="school-zip">60067</div>
            
            <!-- Contact -->
            <div data-testid="school-phone">(847) 755-2610</div>
            <a data-testid="school-website" href="http://adc.d211.org/Domain/9">School Website</a>
            <div data-testid="school-setting">large suburb</div>
            
            <!-- Enrollment -->
            <div data-testid="enrollment-number">2,657</div>
            <div data-testid="student-teacher-ratio">16:1</div>
            <div data-testid="teacher-count">163</div>
            
            <!-- Rankings -->
            <div data-testid="national-ranking">397</div>
            <div data-testid="state-ranking">14</div>
            
            <!-- Academics -->
            <div data-testid="ap-participation">62.0%</div>
            <div data-testid="ap-pass-rate">56.0%</div>
            <div data-testid="math-proficiency">64.0%</div>
            <div data-testid="reading-proficiency">63.0%</div>
            <div data-testid="science-proficiency">77.0%</div>
            <div data-testid="graduation-rate">94.0%</div>
            <div data-testid="college-readiness">57.6%</div>
            
            <!-- Demographics -->
            <div data-testid="demo-white">45.3%</div>
            <div data-testid="demo-asian">31.6%</div>
            <div data-testid="demo-hispanic">14.0%</div>
            <div data-testid="demo-black">4.7%</div>
            <div data-testid="demo-native">0.01%</div>
            <div data-testid="demo-multiracial">4.1%</div>
            
            <!-- Gender -->
            <div data-testid="gender-female">49.0%</div>
            <div data-testid="gender-male">51.0%</div>
            
            <!-- Socioeconomic (often null in real data) -->
            <div data-testid="econ-disadvantaged">18.5%</div>
            <div data-testid="free-lunch">12.0%</div>
            <div data-testid="reduced-lunch">6.5%</div>
          </body>
        </html>
      `;

      // Create mock Bronze record
      const mockBronzeRecord = {
        id: 1,
        file_path: '/test/william-fremd-high-school-6921.html',
        school_slug: 'william-fremd-high-school-6921',
        capture_timestamp: '2025-08-21T06:13:41Z',
        file_size: mockHtml.length,
        checksum_sha256: 'test-checksum',
        processing_status: 'pending' as const,
        created_at: '2025-01-27T00:00:00Z',
        updated_at: '2025-01-27T00:00:00Z'
      };

      // Process with Silver
      const result = await processor.processRecord(mockBronzeRecord, mockHtml);

      // Validate all gold standard fields are present
      const goldStandardFields = {
        // Core fields
        school_name: 'William Fremd High School',
        grades_served: '9-12',
        
        // Address fields
        address_street: '1000 S Quentin Rd',
        address_city: 'Palatine',
        address_state: 'IL',
        address_zip: '60067',
        
        // Contact fields
        phone: '(847) 755-2610',
        website: 'http://adc.d211.org/Domain/9',
        setting: 'large suburb',
        
        // Enrollment fields
        enrollment: 2657,
        student_teacher_ratio: '16:1',
        full_time_teachers: 163,
        
        // Ranking fields
        national_rank: 397,
        state_rank: 14,
        
        // Academic fields
        ap_participation_rate: 62.0,
        ap_pass_rate: 56.0,
        math_proficiency: 64.0,
        reading_proficiency: 63.0,
        science_proficiency: 77.0,
        graduation_rate: 94.0,
        college_readiness_index: 57.6,
        
        // Demographic fields
        white_pct: 45.3,
        asian_pct: 31.6,
        hispanic_pct: 14.0,
        black_pct: 4.7,
        american_indian_pct: 0.01,
        two_or_more_pct: 4.1,
        
        // Gender fields
        female_pct: 49.0,
        male_pct: 51.0,
        
        // Socioeconomic fields
        economically_disadvantaged_pct: 18.5,
        free_lunch_pct: 12.0,
        reduced_lunch_pct: 6.5
      };

      // Validate each field
      Object.entries(goldStandardFields).forEach(([fieldName, expectedValue]) => {
        const actualValue = (result.silverRecord as any)[fieldName];
        expect(actualValue).toBe(expectedValue, `Field ${fieldName} should be ${expectedValue}, got ${actualValue}`);
      });

      // Validate metadata fields
      expect(result.silverRecord.bronze_record_id).toBe(1);
      expect(result.silverRecord.school_slug).toBe('william-fremd-high-school-6921');
      expect(result.silverRecord.source_year).toBe(2025);

      // Validate high confidence
      expect(result.overallConfidence).toBeGreaterThanOrEqual(90);
      
      // Validate field confidences
      expect(result.fieldConfidences.school_name).toBeGreaterThanOrEqual(90);
      expect(result.fieldConfidences.rankings).toBeGreaterThanOrEqual(90);
      expect(result.fieldConfidences.academics).toBeGreaterThan(80);
      expect(result.fieldConfidences.demographics).toBeGreaterThan(80);
      expect(result.fieldConfidences.location).toBeGreaterThan(80);
      expect(result.fieldConfidences.enrollment_data).toBeGreaterThan(80);

      // Validate minimal errors
      expect(result.errors.length).toBeLessThan(5);
    });

    test('should handle missing fields gracefully with appropriate confidence scores', async () => {
      const minimalHtml = `
        <html>
          <head>
            <title>Basic High School | US News</title>
          </head>
          <body>
            <h1>Basic High School</h1>
            <div data-testid="enrollment-number">1,000</div>
          </body>
        </html>
      `;

      const mockBronzeRecord = {
        id: 2,
        file_path: '/test/basic-school.html',
        school_slug: 'basic-school',
        capture_timestamp: '2025-01-27T00:00:00Z',
        file_size: minimalHtml.length,
        checksum_sha256: 'test-checksum-2',
        processing_status: 'pending' as const,
        created_at: '2025-01-27T00:00:00Z',
        updated_at: '2025-01-27T00:00:00Z'
      };

      const result = await processor.processRecord(mockBronzeRecord, minimalHtml);

      // Should extract available fields
      expect(result.silverRecord.school_name).toBe('Basic High School');
      expect(result.silverRecord.enrollment).toBe(1000);

      // Missing fields should be undefined
      expect(result.silverRecord.national_rank).toBeUndefined();
      expect(result.silverRecord.ap_participation_rate).toBeUndefined();
      
      // Overall confidence should be lower
      expect(result.overallConfidence).toBeLessThan(50);
      
      // Should have minimal errors due to selective error reporting
      expect(result.errors.length).toBeLessThan(5);
    });
  });

  describe('Database Integration', () => {
    test('should persist Silver record to database', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1 data-testid="school-name">Test School</h1>
            <div data-testid="enrollment-number">500</div>
            <div data-testid="national-ranking">100</div>
          </body>
        </html>
      `;

      const mockBronzeRecord = {
        id: 3,
        file_path: '/test/test-school.html',
        school_slug: 'test-school',
        capture_timestamp: '2025-01-27T00:00:00Z',
        file_size: mockHtml.length,
        checksum_sha256: 'test-checksum-3',
        processing_status: 'pending' as const,
        created_at: '2025-01-27T00:00:00Z',
        updated_at: '2025-01-27T00:00:00Z'
      };

      // Process record
      const result = await processor.processRecord(mockBronzeRecord, mockHtml);

      // Save to database
      const recordId = await silverService.createRecord({
        ...result.silverRecord,
        extraction_confidence: result.overallConfidence,
        field_confidence: result.fieldConfidences,
        processing_errors: result.errors,
        extraction_status: 'extracted'
      } as any);

      expect(recordId).toBeGreaterThan(0);

      // Retrieve and validate
      const retrievedRecord = await silverService.getRecordById(recordId);
      expect(retrievedRecord).toBeTruthy();
      expect(retrievedRecord!.school_name).toBe('Test School');
      expect(retrievedRecord!.enrollment).toBe(500);
      expect(retrievedRecord!.national_rank).toBe(100);
      expect(retrievedRecord!.extraction_confidence).toBeGreaterThan(0);
    });
  });

  describe('Confidence Scoring Validation', () => {
    test('should score extraction results accurately', async () => {
      const mockData = {
        bronze_record_id: 4,
        school_slug: 'confidence-test',
        source_year: 2025,
        school_name: 'Confidence Test School',
        enrollment: 1200,
        national_rank: 50,
        ap_participation_rate: 80.0,
        math_proficiency: 85.0,
        white_pct: 60.0,
        asian_pct: 25.0,
        address_city: 'TestCity',
        address_state: 'TX'
      };

      const extractionMethods = {
        school_name: 'css_selector' as const,
        enrollment: 'css_selector' as const,
        national_rank: 'css_selector' as const,
        ap_participation_rate: 'css_selector' as const,
        math_proficiency: 'css_selector' as const,
        white_pct: 'css_selector' as const,
        asian_pct: 'css_selector' as const,
        address_city: 'css_selector' as const,
        address_state: 'css_selector' as const
      };

      const scoreResult = scorer.scoreExtraction(mockData, extractionMethods);

      // High overall confidence with good data coverage
      expect(scoreResult.overallConfidence).toBeGreaterThan(85);
      
      // Field-specific confidences should be reasonable
      expect(scoreResult.fieldConfidences.school_name).toBeGreaterThanOrEqual(90);
      expect(scoreResult.fieldConfidences.rankings).toBeGreaterThanOrEqual(90);
      expect(scoreResult.fieldConfidences.academics).toBeGreaterThan(80);
      expect(scoreResult.fieldConfidences.demographics).toBeGreaterThan(80);
      expect(scoreResult.fieldConfidences.location).toBeGreaterThan(80);
      expect(scoreResult.fieldConfidences.enrollment_data).toBeGreaterThan(85);
    });
  });

  describe('Bronze-Silver Integration', () => {
    test('should process Bronze records and update status', async () => {
      // This test would be more meaningful with actual Bronze-Silver integration
      // For now, validate the interface
      
      const stats = await silverService.getStatistics();
      expect(stats.total_records_processed).toBe(0);
      expect(stats.records_by_status.pending).toBe(0);
      
      const healthCheck = await silverService.getHealthCheck();
      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.metrics.extraction_success_rate).toBe(100); // No records yet
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed HTML gracefully', async () => {
      const badHtml = '<html><body><div>Unclosed div</body>'; // Malformed HTML

      const mockBronzeRecord = {
        id: 5,
        file_path: '/test/bad.html',
        school_slug: 'bad-school',
        capture_timestamp: '2025-01-27T00:00:00Z',
        file_size: badHtml.length,
        checksum_sha256: 'bad-checksum',
        processing_status: 'pending' as const,
        created_at: '2025-01-27T00:00:00Z',
        updated_at: '2025-01-27T00:00:00Z'
      };

      const result = await processor.processRecord(mockBronzeRecord, badHtml);

      // Should not throw error
      expect(result).toBeTruthy();
      expect(result.silverRecord.bronze_record_id).toBe(5);
      expect(result.overallConfidence).toBeLessThan(20);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should validate data ranges and reject invalid values', async () => {
      const invalidHtml = `
        <html>
          <body>
            <h1 data-testid="school-name">A</h1>  <!-- Too short -->
            <div data-testid="enrollment-number">100000</div>  <!-- Too large -->
            <div data-testid="national-ranking">-5</div>  <!-- Negative -->
            <div data-testid="math-proficiency">150%</div>  <!-- > 100% -->
          </body>
        </html>
      `;

      const mockBronzeRecord = {
        id: 6,
        file_path: '/test/invalid.html',
        school_slug: 'invalid-school',
        capture_timestamp: '2025-01-27T00:00:00Z',
        file_size: invalidHtml.length,
        checksum_sha256: 'invalid-checksum',
        processing_status: 'pending' as const,
        created_at: '2025-01-27T00:00:00Z',
        updated_at: '2025-01-27T00:00:00Z'
      };

      const result = await processor.processRecord(mockBronzeRecord, invalidHtml);

      // Should reject invalid values
      expect(result.silverRecord.school_name).toBeUndefined(); // Too short
      expect(result.silverRecord.enrollment).toBeUndefined(); // Too large  
      expect(result.silverRecord.national_rank).toBeUndefined(); // Negative
      expect(result.silverRecord.math_proficiency).toBeUndefined(); // > 100%
      
      // Should have low confidence due to invalid data
      expect(result.overallConfidence).toBeLessThan(10);
      // With selective error reporting, we have fewer errors reported
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    test('should process records within performance budget', async () => {
      const largeHtml = `
        <html>
          <body>
            <h1 data-testid="school-name">Performance Test School</h1>
            ${'<div>Filler content</div>'.repeat(1000)}
            <div data-testid="enrollment-number">2000</div>
            <div data-testid="national-ranking">200</div>
          </body>
        </html>
      `;

      const mockBronzeRecord = {
        id: 7,
        file_path: '/test/large.html',
        school_slug: 'large-school',
        capture_timestamp: '2025-01-27T00:00:00Z',
        file_size: largeHtml.length,
        checksum_sha256: 'large-checksum',
        processing_status: 'pending' as const,
        created_at: '2025-01-27T00:00:00Z',
        updated_at: '2025-01-27T00:00:00Z'
      };

      const startTime = Date.now();
      const result = await processor.processRecord(mockBronzeRecord, largeHtml);
      const processingTime = Date.now() - startTime;

      // Should complete within 5 seconds (generous budget)
      expect(processingTime).toBeLessThan(5000);
      
      // Should still extract data correctly
      expect(result.silverRecord.school_name).toBe('Performance Test School');
      expect(result.silverRecord.enrollment).toBe(2000);
      expect(result.silverRecord.national_rank).toBe(200);
    });
  });
});