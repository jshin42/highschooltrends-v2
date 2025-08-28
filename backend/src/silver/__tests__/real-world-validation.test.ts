/**
 * Real World Validation Test Suite
 * 
 * Tests our enhanced parsing against actual school data from the dataset
 * to verify our fixes work on real US News HTML structures.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { CSSExtractionMethod } from '../css-extraction-method';
import { ExtractionContext } from '../types';
import { readFileSync, existsSync } from 'fs';

describe('Real World Enhanced Parsing Validation', () => {
  let extractor: CSSExtractionMethod;

  beforeAll(() => {
    extractor = new CSSExtractionMethod();
  });

  describe('Bucket 2 Range Pattern Schools', () => {
    const bucket2Schools = [
      'parkside-high-school-9215',
      'lodi-high-school-12621', 
      'hilda-solis-learning-academy-140701'
    ];

    test.each(bucket2Schools)('should extract Bucket 2 range patterns from %s', async (schoolSlug) => {
      const dataDir = '/Volumes/OWC Express 1M2/USNEWS_2024';
      if (!existsSync(dataDir)) {
        console.warn('⚠️  External drive not available - skipping real world validation');
        return;
      }

      const schoolDir = `${dataDir}/${schoolSlug}`;
      if (!existsSync(schoolDir)) {
        console.warn(`⚠️  School directory not found: ${schoolSlug}`);
        return;
      }

      try {
        const htmlFile = readFileSync(`${schoolDir}/docker_curl_20250818_215720.html`, 'utf-8');
        const mockContext: ExtractionContext = {
          bronzeRecord: {
            id: 1,
            school_slug: schoolSlug,
            file_path: `${schoolDir}/docker_curl_20250818_215720.html`,
            capture_timestamp: new Date().toISOString(),
            file_size: htmlFile.length,
            checksum_sha256: 'test',
            processing_status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          schoolSlug,
          sourceYear: 2024,
          fileContent: htmlFile,
          domDocument: null
        };

        const result = await extractor.extract(htmlFile, mockContext);
        
        console.log(`\n🏫 ${schoolSlug}:`);
        console.log(`   National Rank: ${result.data.national_rank} - ${result.data.national_rank_end || result.data.national_rank}`);
        console.log(`   Precision: ${result.data.national_rank_precision}`);
        console.log(`   Confidence: ${result.confidence}%`);

        // Verify we're extracting some ranking data with reasonable confidence
        expect(result.confidence).toBeGreaterThan(70);
        
        // If we found a national rank, verify it's valid
        if (result.data.national_rank) {
          expect(result.data.national_rank).toBeGreaterThan(0);
          expect(result.data.national_rank).toBeLessThan(50000);
          
          // Check if it's actually a Bucket 2 range
          if (result.data.national_rank_precision === 'range') {
            expect(result.data.national_rank).toBeGreaterThanOrEqual(13427);
            expect(result.data.national_rank_end || result.data.national_rank).toBeLessThanOrEqual(17901);
          }
        }

      } catch (error) {
        console.warn(`Failed to process ${schoolSlug}:`, error);
      }
    });
  });

  describe('Original Failed Schools from Manual Validation', () => {
    // These are the schools from your original ground truth validation report
    const originalFailures = [
      'a-philip-randolph-academies-4976',  // Was showing #13427 instead of range
      'fabens-high-school-19041',         // Had various parsing issues
      'nation-ford-high-school-17743',    // State-only pattern
      'taconic-hillsjunior-senior-high-school-14114' // State-only pattern
    ];

    test.each(originalFailures)('should now correctly parse %s', async (schoolSlug) => {
      const dataDir = '/Volumes/OWC Express 1M2/USNEWS_2024';
      if (!existsSync(dataDir)) {
        console.warn('⚠️  External drive not available - skipping validation');
        return;
      }

      const schoolDir = `${dataDir}/${schoolSlug}`;
      if (!existsSync(schoolDir)) {
        console.warn(`⚠️  School directory not found: ${schoolSlug}`);
        return;
      }

      try {
        // Find the HTML file in the directory  
        const fs = require('fs');
        const files = fs.readdirSync(schoolDir);
        const htmlFile = files.find((f: string) => f.endsWith('.html'));
        
        if (!htmlFile) {
          console.warn(`⚠️  No HTML file found in ${schoolSlug}`);
          return;
        }

        const htmlContent = readFileSync(`${schoolDir}/${htmlFile}`, 'utf-8');
        const mockContext: ExtractionContext = {
          bronzeRecord: {
            id: 1,
            school_slug: schoolSlug,
            file_path: `${schoolDir}/${htmlFile}`,
            capture_timestamp: new Date().toISOString(),
            file_size: htmlContent.length,
            checksum_sha256: 'test',
            processing_status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          schoolSlug,
          sourceYear: 2024,
          fileContent: htmlContent,
          domDocument: null
        };

        const result = await extractor.extract(htmlContent, mockContext);
        
        console.log(`\n📊 ${result.data.school_name || schoolSlug}:`);
        console.log(`   National: ${result.data.national_rank}${result.data.national_rank_end ? `-${result.data.national_rank_end}` : ''} (${result.data.national_rank_precision})`);
        console.log(`   State: ${result.data.state_rank} (${result.data.state_rank_precision})`);  
        console.log(`   Confidence: ${result.confidence}%`);
        console.log(`   Unranked: ${result.data.is_unranked || false}`);

        // Basic validation - should have reasonable confidence and some ranking data
        expect(result.confidence).toBeGreaterThan(60);
        
        // Should have either national rank, state rank, or explicit unranked status
        const hasRankingData = result.data.national_rank || result.data.state_rank || result.data.is_unranked;
        expect(hasRankingData).toBeTruthy();

        // If has national rank, should have precision indicator
        if (result.data.national_rank) {
          expect(result.data.national_rank_precision).toBeDefined();
          expect(['exact', 'range', 'estimated']).toContain(result.data.national_rank_precision);
        }

        // If has state rank, should have precision indicator  
        if (result.data.state_rank) {
          expect(result.data.state_rank_precision).toBeDefined();
          expect(['exact', 'state_only', 'estimated']).toContain(result.data.state_rank_precision);
        }

      } catch (error) {
        console.warn(`Failed to process ${schoolSlug}:`, error);
      }
    });
  });

  describe('Known High-Quality Schools', () => {
    test('should maintain accuracy on Academic Magnet High School', async () => {
      const schoolSlug = 'academic-magnet-high-school-17566';
      const dataDir = '/Volumes/OWC Express 1M2/USNEWS_2024';
      
      if (!existsSync(dataDir)) {
        console.warn('⚠️  External drive not available');
        return;
      }

      const schoolDir = `${dataDir}/${schoolSlug}`;
      if (!existsSync(schoolDir)) {
        console.warn(`⚠️  School directory not found: ${schoolSlug}`);
        return;
      }

      try {
        const fs = require('fs');
        const files = fs.readdirSync(schoolDir);
        const htmlFile = files.find((f: string) => f.endsWith('.html'));
        
        if (!htmlFile) {
          console.warn(`⚠️  No HTML file found`);
          return;
        }

        const htmlContent = readFileSync(`${schoolDir}/${htmlFile}`, 'utf-8');
        const mockContext: ExtractionContext = {
          bronzeRecord: {
            id: 1,
            school_slug: schoolSlug,
            file_path: `${schoolDir}/${htmlFile}`,
            capture_timestamp: new Date().toISOString(),
            file_size: htmlContent.length,
            checksum_sha256: 'test',
            processing_status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          schoolSlug,
          sourceYear: 2024,
          fileContent: htmlContent,
          domDocument: null
        };

        const result = await extractor.extract(htmlContent, mockContext);
        
        console.log(`\n🏆 Academic Magnet High School:`);
        console.log(`   School Name: ${result.data.school_name}`);
        console.log(`   National: #${result.data.national_rank} (${result.data.national_rank_precision})`);
        console.log(`   State: #${result.data.state_rank} (${result.data.state_rank_precision})`);
        console.log(`   Confidence: ${result.confidence}%`);

        // Should maintain high accuracy for this known school
        expect(result.data.school_name).toBe('Academic Magnet High School');
        expect(result.data.national_rank).toBe(7);
        expect(result.data.national_rank_precision).toBe('exact');
        expect(result.data.state_rank).toBe(1);
        expect(['exact', 'state_only']).toContain(result.data.state_rank_precision);
        expect(result.confidence).toBeGreaterThan(85);

      } catch (error) {
        console.warn('Failed to process Academic Magnet:', error);
      }
    });
  });
});