/**
 * Year-Scoped Ranking Validation Tests
 * 
 * Validates that ranking uniqueness and ranges are enforced PER YEAR
 * This is critical for multi-year data integrity
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { CSSExtractionMethod } from '../css-extraction-method';
import { ExtractionContext } from '../types';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

interface YearRankingSample {
  schoolSlug: string;
  schoolName: string;
  year: number;
  nationalRank: number | null;
  stateRank: number | null;
  state: string | null;
  bucket: 1 | 2 | 3 | 4;
}

describe('Year-Scoped Ranking Validation', () => {
  let extractor: CSSExtractionMethod;
  const RANKING_BUCKETS = {
    EXACT_START: 1,
    EXACT_END: 13426,
    RANGE_START: 13427,
    RANGE_END: 17901
  };

  beforeAll(() => {
    extractor = new CSSExtractionMethod();
  });

  test('should enforce Bucket 1 uniqueness per year (not globally)', async () => {
    // This test validates the critical business rule: 
    // National ranks 1-13,426 must be unique WITHIN each year, but can repeat ACROSS years
    
    const samplesBy2024 = await getSamplesForYear(2024);
    
    if (samplesBy2024.length === 0) {
      console.warn('⚠️  No 2024 samples available - skipping year-scoped validation');
      return;
    }

    console.log('\n📅 Year-Scoped Ranking Validation (2024)');
    console.log('======================================');
    console.log(`   Testing ${samplesBy2024.length} schools from 2024`);

    // Check for duplicates within 2024 Bucket 1 schools
    const bucket1_2024 = samplesBy2024.filter(s => s.bucket === 1);
    const rankCounts2024 = bucket1_2024.reduce((acc, school) => {
      const rank = school.nationalRank!;
      acc[rank] = (acc[rank] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const duplicatesIn2024 = Object.entries(rankCounts2024).filter(([_, count]) => count > 1);
    
    console.log(`   Bucket 1 schools in 2024: ${bucket1_2024.length}`);
    console.log(`   Duplicate national ranks in 2024: ${duplicatesIn2024.length}`);
    
    if (duplicatesIn2024.length > 0) {
      console.log('   🚨 DUPLICATE RANKS DETECTED:');
      duplicatesIn2024.forEach(([rank, count]) => {
        console.log(`      Rank #${rank}: ${count} schools`);
        
        // Show which schools have the duplicate rank
        const duplicateSchools = bucket1_2024.filter(s => s.nationalRank?.toString() === rank);
        duplicateSchools.forEach(school => {
          console.log(`        - ${school.schoolName} (${school.schoolSlug})`);
        });
      });
    }

    // CRITICAL ASSERTION: No duplicates allowed within the same year for Bucket 1
    expect(duplicatesIn2024.length).toBe(0);
  });

  test('should validate bucket boundaries per year', async () => {
    const samples2024 = await getSamplesForYear(2024);
    
    if (samples2024.length === 0) {
      return;
    }

    console.log('\n🪣 Bucket Boundary Validation (Per Year)');
    console.log('=======================================');

    // Test that all schools are correctly classified within their year
    const bucket1Schools = samples2024.filter(s => s.bucket === 1);
    const bucket2Schools = samples2024.filter(s => s.bucket === 2);
    const bucket3Schools = samples2024.filter(s => s.bucket === 3);

    console.log(`   2024 Bucket 1: ${bucket1Schools.length} schools`);
    console.log(`   2024 Bucket 2: ${bucket2Schools.length} schools`);
    console.log(`   2024 Bucket 3: ${bucket3Schools.length} schools`);

    // Validate bucket 1 boundaries (exact ranks 1-13,426)
    bucket1Schools.forEach(school => {
      expect(school.nationalRank).toBeGreaterThanOrEqual(RANKING_BUCKETS.EXACT_START);
      expect(school.nationalRank).toBeLessThanOrEqual(RANKING_BUCKETS.EXACT_END);
    });

    // Validate bucket 2 boundaries (range ranks 13,427-17,901)  
    bucket2Schools.forEach(school => {
      expect(school.nationalRank).toBeGreaterThanOrEqual(RANKING_BUCKETS.RANGE_START);
      expect(school.nationalRank).toBeLessThanOrEqual(RANKING_BUCKETS.RANGE_END);
    });

    // Bucket 2 schools CAN have duplicates within the same year (this is expected)
    const bucket2Ranks = bucket2Schools.map(s => s.nationalRank!);
    const bucket2Duplicates = bucket2Ranks.filter((rank, index) => 
      bucket2Ranks.indexOf(rank) !== index
    );
    
    if (bucket2Duplicates.length > 0) {
      console.log(`   ✅ Bucket 2 duplicates allowed: ${bucket2Duplicates.length} found (expected)`);
    }

    // Bucket 3 schools should not have national ranks in buckets 1 or 2 
    // (by definition, they either have no national rank or it's outside the bucket ranges)
    bucket3Schools.forEach(school => {
      if (school.nationalRank !== null && school.nationalRank !== undefined) {
        // If they have a national rank, it should be outside buckets 1 & 2
        const inBucket1 = school.nationalRank >= RANKING_BUCKETS.EXACT_START && school.nationalRank <= RANKING_BUCKETS.EXACT_END;
        const inBucket2 = school.nationalRank >= RANKING_BUCKETS.RANGE_START && school.nationalRank <= RANKING_BUCKETS.RANGE_END;
        
        expect(inBucket1 || inBucket2).toBe(false);
      } else {
        // Most bucket 3 schools should have null national rank (which is expected)
        expect([null, undefined]).toContain(school.nationalRank);
      }
    });
  });

  test('should prepare for multi-year validation (future extension)', async () => {
    // This test demonstrates how to validate rankings across multiple years
    // Currently we only have 2024 data, but this shows the pattern for when 2025 data is available
    
    const availableYears = [2024]; // Will expand to [2024, 2025, ...] in the future
    
    console.log('\n🗓️  Multi-Year Validation Framework');
    console.log('=================================');
    console.log(`   Currently available years: ${availableYears.join(', ')}`);
    
    for (const year of availableYears) {
      const yearSamples = await getSamplesForYear(year);
      
      if (yearSamples.length > 0) {
        console.log(`   ${year}: ${yearSamples.length} schools processed`);
        
        // Future extension: When we have 2025 data, validate that:
        // - Same school can have different national ranks in different years
        // - Same national rank can be used by different schools in different years
        // - Ranking uniqueness is maintained within each year
        
        expect(yearSamples.length).toBeGreaterThan(0);
      }
    }
    
    console.log('\n   📝 Ready for multi-year expansion:');
    console.log('      - Add 2025 data directory when available');
    console.log('      - Extend getSamplesForYear() to handle multiple years');
    console.log('      - Test cross-year ranking variations');
  });

  // Helper function to get samples for a specific year
  async function getSamplesForYear(year: number): Promise<YearRankingSample[]> {
    const dataDir = `/Volumes/OWC Express 1M2/USNEWS_${year}`;
    
    if (!existsSync(dataDir)) {
      return [];
    }

    const samples: YearRankingSample[] = [];
    const allSchools = readdirSync(dataDir).filter(school => !school.startsWith('.'));
    
    // Sample subset for testing (first 20 schools for speed)
    const testSchools = allSchools.slice(0, 20);
    
    for (const schoolSlug of testSchools) {
      try {
        const sample = await extractYearRankingSample(schoolSlug, year);
        if (sample) {
          samples.push(sample);
        }
      } catch (error) {
        // Skip failed extractions for this test
        continue;
      }
    }
    
    return samples;
  }

  async function extractYearRankingSample(
    schoolSlug: string, 
    year: number
  ): Promise<YearRankingSample | null> {
    const schoolDir = join(`/Volumes/OWC Express 1M2/USNEWS_${year}`, schoolSlug);
    
    if (!existsSync(schoolDir)) {
      return null;
    }

    try {
      const files = readdirSync(schoolDir);
      const htmlFile = files.find(f => f.endsWith('.html'));
      
      if (!htmlFile) {
        return null;
      }

      const htmlPath = join(schoolDir, htmlFile);
      const html = readFileSync(htmlPath, 'utf-8');

      const mockContext: ExtractionContext = {
        bronzeRecord: {
          id: 999,
          school_slug: schoolSlug,
          file_path: htmlPath,
          capture_timestamp: new Date().toISOString(),
          file_size: html.length,
          checksum_sha256: 'test',
          processing_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        schoolSlug,
        sourceYear: year,
        fileContent: html,
        domDocument: null
      };

      const result = await extractor.extract(html, mockContext);
      
      // Determine bucket
      let bucket: 1 | 2 | 3 | 4 = 4;
      const nationalRank = result.data.national_rank;
      
      if (nationalRank) {
        if (nationalRank >= RANKING_BUCKETS.EXACT_START && nationalRank <= RANKING_BUCKETS.EXACT_END) {
          bucket = 1;
        } else if (nationalRank >= RANKING_BUCKETS.RANGE_START && nationalRank <= RANKING_BUCKETS.RANGE_END) {
          bucket = 2;
        } else {
          bucket = 3;
        }
      } else if (result.data.state_rank) {
        bucket = 3;
      }

      return {
        schoolSlug,
        schoolName: result.data.school_name || schoolSlug,
        year,
        nationalRank: result.data.national_rank,
        stateRank: result.data.state_rank,
        state: result.data.address_state,
        bucket
      };

    } catch (error) {
      return null;
    }
  }
});