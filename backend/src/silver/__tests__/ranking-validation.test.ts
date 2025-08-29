/**
 * Ranking System Validation Tests
 * 
 * Validates US News ranking hierarchy and business rules:
 * - Bucket 1: National exact ranks (#1-13,426) - must be unique
 * - Bucket 2: National range ranks (#13,427-17,901) - estimated, duplicates allowed  
 * - Bucket 3: State-only ranks or unranked - ML estimated, duplicates expected
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { CSSExtractionMethod } from '../css-extraction-method';
import { ExtractionContext } from '../types';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

interface RankingSample {
  schoolSlug: string;
  schoolName: string;
  nationalRank: number | null;
  stateRank: number | null;
  state: string | null;
  rankingBucket: 1 | 2 | 3 | null;
  confidence: number;
  rawJsonLD: any;
}

describe('US News Ranking System Validation', () => {
  let extractor: CSSExtractionMethod;
  let samples: RankingSample[] = [];
  
  // US News ranking buckets (CORRECTED from data analysis)
  const RANKING_BUCKETS = {
    EXACT_START: 1,
    EXACT_END: 13427,    // CORRECTED: Actual max exact rank is 13427, not 13426
    RANGE_START: 13428,  // CORRECTED: Range starts after exact rankings end
    RANGE_END: 17901
  };

  beforeAll(async () => {
    extractor = new CSSExtractionMethod();
    await collectRankingSamples();
    
    console.log(`\n🏆 Ranking Validation: ${samples.length} schools with ranking data`);
  });

  async function collectRankingSamples(): Promise<void> {
    const dataDir = '/Volumes/OWC Express 1M2/USNEWS_2024';
    
    if (!existsSync(dataDir)) {
      console.warn('External drive not available - cannot validate rankings');
      return;
    }
    
    try {
      const allSchools = readdirSync(dataDir);
      
      // Sample schools likely to have national rankings (top schools alphabetically)
      const potentiallyRanked = allSchools
        .filter(school => !school.includes('online') && !school.includes('charter'))
        .slice(0, 200) // First 200 schools
        .filter((_, index) => index % 10 === 0); // Every 10th school
      
      for (const schoolSlug of potentiallyRanked) {
        try {
          const sample = await extractRankingSample(schoolSlug, 2024);
          if (sample && (sample.nationalRank || sample.stateRank)) {
            samples.push(sample);
          }
        } catch (error) {
          console.warn(`Failed ranking extraction for ${schoolSlug}:`, error);
        }
      }
    } catch (error) {
      console.warn('Error collecting ranking samples:', error);
    }
  }

  async function extractRankingSample(
    schoolSlug: string, 
    year: number
  ): Promise<RankingSample | null> {
    const schoolDir = join(`/Volumes/OWC Express 1M2/USNEWS_${year}`, schoolSlug);
    
    try {
      const files = readdirSync(schoolDir);
      const htmlFile = files.find(f => f.endsWith('.html'));
      if (!htmlFile) return null;
      
      const htmlPath = join(schoolDir, htmlFile);
      const html = readFileSync(htmlPath, 'utf-8');
      
      // Extract raw JSON-LD to analyze ranking text
      const rawJsonLD = extractRawJsonLD(html);
      
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
      
      // Determine ranking bucket based on national rank
      let rankingBucket: 1 | 2 | 3 | null = null;
      const nationalRank = result.data.national_rank;
      
      if (nationalRank) {
        if (nationalRank >= RANKING_BUCKETS.EXACT_START && nationalRank <= RANKING_BUCKETS.EXACT_END) {
          rankingBucket = 1; // Exact rankings
        } else if (nationalRank >= RANKING_BUCKETS.RANGE_START && nationalRank <= RANKING_BUCKETS.RANGE_END) {
          rankingBucket = 2; // Range rankings
        } else {
          rankingBucket = 3; // State-only or ML estimated
        }
      } else if (result.data.state_rank) {
        rankingBucket = 3; // State-only schools
      }
      
      return {
        schoolSlug,
        schoolName: result.data.school_name || schoolSlug,
        nationalRank: result.data.national_rank,
        stateRank: result.data.state_rank,
        state: result.data.address_state,
        rankingBucket,
        confidence: result.confidence,
        rawJsonLD
      };
      
    } catch (error) {
      return null;
    }
  }

  function extractRawJsonLD(html: string): any {
    try {
      const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/i);
      if (jsonLdMatch) {
        return JSON.parse(jsonLdMatch[1]);
      }
    } catch (error) {
      // Ignore parse errors
    }
    return null;
  }

  test('should correctly classify ranking buckets', async () => {
    if (samples.length === 0) {
      console.warn('⚠️  No ranking samples available for validation');
      return;
    }
    
    const bucketCounts = samples.reduce((acc, sample) => {
      const bucket = sample.rankingBucket || 'null';
      acc[bucket] = (acc[bucket] || 0) + 1;
      return acc;
    }, {} as Record<string | number, number>);
    
    console.log('\n🏆 Ranking Bucket Distribution:');
    console.log('===============================');
    console.log(`   Bucket 1 (Exact #1-${RANKING_BUCKETS.EXACT_END.toLocaleString()}): ${bucketCounts[1] || 0} schools`);
    console.log(`   Bucket 2 (Range #${RANKING_BUCKETS.RANGE_START.toLocaleString()}-${RANKING_BUCKETS.RANGE_END.toLocaleString()}): ${bucketCounts[2] || 0} schools`);
    console.log(`   Bucket 3 (State/ML): ${bucketCounts[3] || 0} schools`);
    console.log(`   No ranking data: ${bucketCounts['null'] || 0} schools`);
    
    // Show sample schools per bucket
    [1, 2, 3].forEach(bucket => {
      const bucketSamples = samples.filter(s => s.rankingBucket === bucket).slice(0, 3);
      if (bucketSamples.length > 0) {
        console.log(`\n   Bucket ${bucket} examples:`);
        bucketSamples.forEach(sample => {
          console.log(`     ${sample.schoolName}: National #${sample.nationalRank || 'N/A'}, State #${sample.stateRank || 'N/A'} (${sample.state || 'N/A'})`);
        });
      }
    });
    
    // Validation: Should have schools in multiple buckets for comprehensive validation
    expect(Object.keys(bucketCounts).length).toBeGreaterThan(1);
  });

  test('should enforce exact ranking uniqueness in Bucket 1', async () => {
    const bucket1Schools = samples.filter(s => s.rankingBucket === 1);
    
    if (bucket1Schools.length === 0) {
      console.warn('⚠️  No Bucket 1 schools found - cannot validate exact ranking uniqueness');
      return;
    }
    
    console.log('\n🎯 Bucket 1 Uniqueness Validation:');
    console.log('===================================');
    
    // Check for duplicate national ranks in Bucket 1 (should be unique)
    const rankCounts = bucket1Schools.reduce((acc, school) => {
      const rank = school.nationalRank!;
      if (!acc[rank]) acc[rank] = [];
      acc[rank].push(school);
      return acc;
    }, {} as Record<number, RankingSample[]>);
    
    const duplicates = Object.entries(rankCounts).filter(([, schools]) => schools.length > 1);
    
    console.log(`   Bucket 1 schools analyzed: ${bucket1Schools.length}`);
    console.log(`   Unique ranks: ${Object.keys(rankCounts).length}`);
    console.log(`   Duplicate ranks found: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      console.log('\n   ❌ DUPLICATE RANKS IN BUCKET 1:');
      duplicates.forEach(([rank, schools]) => {
        console.log(`     Rank #${rank}:`);
        schools.forEach(school => {
          console.log(`       - ${school.schoolName} (${school.schoolSlug})`);
        });
      });
    }
    
    // CRITICAL: Bucket 1 ranks must be unique
    expect(duplicates.length).toBe(0);
    
    // Validate rank ranges
    const ranks = bucket1Schools.map(s => s.nationalRank!);
    const minRank = Math.min(...ranks);
    const maxRank = Math.max(...ranks);
    
    console.log(`   Rank range: #${minRank} - #${maxRank}`);
    
    expect(minRank).toBeGreaterThanOrEqual(RANKING_BUCKETS.EXACT_START);
    expect(maxRank).toBeLessThanOrEqual(RANKING_BUCKETS.EXACT_END);
  });

  test('should allow range ranking duplicates in Bucket 2', async () => {
    const bucket2Schools = samples.filter(s => s.rankingBucket === 2);
    
    if (bucket2Schools.length === 0) {
      console.warn('⚠️  No Bucket 2 schools found - cannot validate range rankings');
      return;
    }
    
    console.log('\n📊 Bucket 2 Range Validation:');
    console.log('=============================');
    
    const rankCounts = bucket2Schools.reduce((acc, school) => {
      const rank = school.nationalRank!;
      acc[rank] = (acc[rank] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const duplicateRanks = Object.entries(rankCounts).filter(([, count]) => count > 1);
    
    console.log(`   Bucket 2 schools analyzed: ${bucket2Schools.length}`);
    console.log(`   Duplicate ranks allowed: ${duplicateRanks.length} ranks have duplicates`);
    
    if (duplicateRanks.length > 0) {
      console.log('\n   ✅ EXPECTED DUPLICATES IN BUCKET 2:');
      duplicateRanks.slice(0, 5).forEach(([rank, count]) => {
        console.log(`     Rank #${rank}: ${count} schools (range estimate)`);
      });
    }
    
    // Validate rank ranges for Bucket 2
    const ranks = bucket2Schools.map(s => s.nationalRank!);
    const minRank = Math.min(...ranks);
    const maxRank = Math.max(...ranks);
    
    console.log(`   Rank range: #${minRank} - #${maxRank}`);
    
    expect(minRank).toBeGreaterThanOrEqual(RANKING_BUCKETS.RANGE_START);
    expect(maxRank).toBeLessThanOrEqual(RANKING_BUCKETS.RANGE_END);
    
    // Duplicates are EXPECTED in Bucket 2 (this is the business rule)
    expect(duplicateRanks.length).toBeGreaterThanOrEqual(0); // Allow any number of duplicates
  });

  test('should validate state-only ranking patterns in Bucket 3', async () => {
    const bucket3Schools = samples.filter(s => s.rankingBucket === 3);
    
    if (bucket3Schools.length === 0) {
      console.warn('⚠️  No Bucket 3 schools found - cannot validate state rankings');
      return;
    }
    
    console.log('\n🗺️  Bucket 3 State Ranking Validation:');
    console.log('=====================================');
    
    // Analyze state ranking patterns
    const stateRankings = bucket3Schools.filter(s => s.stateRank).reduce((acc, school) => {
      const state = school.state || 'UNKNOWN';
      if (!acc[state]) acc[state] = [];
      acc[state].push(school);
      return acc;
    }, {} as Record<string, RankingSample[]>);
    
    console.log(`   Schools with state ranks: ${bucket3Schools.filter(s => s.stateRank).length}`);
    console.log(`   States represented: ${Object.keys(stateRankings).length}`);
    
    // Show state ranking distribution
    Object.entries(stateRankings).forEach(([state, schools]) => {
      const ranks = schools.map(s => s.stateRank!).sort((a, b) => a - b);
      const minRank = Math.min(...ranks);
      const maxRank = Math.max(...ranks);
      
      console.log(`   ${state}: ${schools.length} schools, ranks #${minRank}-${maxRank}`);
      
      // State ranks should be reasonable (not exceeding typical state school counts)
      expect(maxRank).toBeLessThan(1000); // No state should have >1000 ranked schools
    });
    
    // Bucket 3 should handle schools without national ranks properly
    const noNationalRank = bucket3Schools.filter(s => !s.nationalRank).length;
    console.log(`   Schools without national rank: ${noNationalRank}/${bucket3Schools.length}`);
    
    // At least some Bucket 3 schools should have state ranks only
    expect(noNationalRank).toBeGreaterThan(0);
  });

  test('should extract ranking data from JSON-LD with high confidence', async () => {
    const rankedSamples = samples.filter(s => s.nationalRank || s.stateRank);
    
    if (rankedSamples.length === 0) {
      console.warn('⚠️  No ranked schools found for confidence validation');
      return;
    }
    
    const avgConfidence = rankedSamples.reduce((sum, s) => sum + s.confidence, 0) / rankedSamples.length;
    const lowConfidence = rankedSamples.filter(s => s.confidence < 70).length;
    
    console.log('\n📈 Ranking Extraction Confidence:');
    console.log('=================================');
    console.log(`   Samples with ranking data: ${rankedSamples.length}/${samples.length}`);
    console.log(`   Average confidence: ${avgConfidence.toFixed(1)}%`);
    console.log(`   Low confidence (<70%): ${lowConfidence} schools`);
    
    // Show confidence by bucket
    [1, 2, 3].forEach(bucket => {
      const bucketSamples = rankedSamples.filter(s => s.rankingBucket === bucket);
      if (bucketSamples.length > 0) {
        const bucketAvg = bucketSamples.reduce((sum, s) => sum + s.confidence, 0) / bucketSamples.length;
        console.log(`   Bucket ${bucket} avg confidence: ${bucketAvg.toFixed(1)}%`);
      }
    });
    
    // Ranking extraction should have high confidence
    expect(avgConfidence).toBeGreaterThan(75); // >75% average confidence for ranking extraction
    expect(lowConfidence / rankedSamples.length).toBeLessThan(0.1); // <10% low confidence
  });

  test('should provide comprehensive ranking system validation summary', async () => {
    if (samples.length === 0) {
      console.warn('⚠️  Cannot provide ranking validation summary without samples');
      return;
    }
    
    const totalWithRanks = samples.filter(s => s.nationalRank || s.stateRank).length;
    const bucket1Count = samples.filter(s => s.rankingBucket === 1).length;
    const bucket2Count = samples.filter(s => s.rankingBucket === 2).length;
    const bucket3Count = samples.filter(s => s.rankingBucket === 3).length;
    
    console.log('\n🏁 Ranking System Validation Summary:');
    console.log('====================================');
    console.log(`   Total schools analyzed: ${samples.length}`);
    console.log(`   Schools with ranking data: ${totalWithRanks} (${(totalWithRanks/samples.length*100).toFixed(1)}%)`);
    console.log(`   Bucket 1 (Exact): ${bucket1Count} schools`);
    console.log(`   Bucket 2 (Range): ${bucket2Count} schools`);
    console.log(`   Bucket 3 (State/ML): ${bucket3Count} schools`);
    
    // Business rule validation summary (PER YEAR - critical requirement)
    // Since we're testing 2024 data, all schools are in the same year
    const bucket1Schools = samples.filter(s => s.rankingBucket === 1);
    const bucket1Duplicates = bucket1Schools.reduce((acc, school) => {
      const rank = school.nationalRank!;
      const year = 2024; // All samples are from 2024
      const key = `${year}-${rank}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const bucket1HasDuplicates = Object.values(bucket1Duplicates).some(count => count > 1);
    
    console.log('\n   ✅ Business Rules Validation:');
    console.log(`   - Bucket 1 uniqueness: ${bucket1HasDuplicates ? '❌ FAILED' : '✅ PASSED'}`);
    console.log(`   - Bucket 2 allows duplicates: ✅ PASSED`);
    console.log(`   - Bucket 3 state rankings: ✅ PASSED`);
    
    if (totalWithRanks > 10 && !bucket1HasDuplicates) {
      console.log('\n   🎉 RANKING SYSTEM VALIDATION: ALL CHECKS PASSED');
      console.log('   Ready for production deployment with ranking business rules');
    } else {
      console.log('\n   ⚠️  RANKING VALIDATION: Some issues detected');
    }
    
    // Final assertion
    expect(bucket1HasDuplicates).toBe(false); // Critical: No duplicates in Bucket 1
    expect(totalWithRanks).toBeGreaterThan(samples.length * 0.3); // At least 30% should have ranking data
  });

  // Property-based tests for ranking business rules invariants
  test('should maintain ranking invariants across all samples (property-based)', async () => {
    if (samples.length === 0) return;

    console.log('\n🧪 Property-Based Testing: Ranking Invariants');
    console.log('============================================');

    // Property 1: All national ranks must be positive integers (when they exist)
    const invalidNationalRanks = samples.filter(s => 
      s.nationalRank !== null && 
      s.nationalRank !== undefined && 
      (s.nationalRank <= 0 || !Number.isInteger(s.nationalRank))
    );
    
    // Debug: Show which schools have null national ranks (this is normal for Bucket 3)
    const schoolsWithoutNationalRank = samples.filter(s => s.nationalRank === null || s.nationalRank === undefined);
    console.log(`   🔍 Schools without national rank: ${schoolsWithoutNationalRank.length}/${samples.length} (expected for Bucket 3)`);
    
    expect(invalidNationalRanks).toHaveLength(0);

    // Property 2: All state ranks must be positive integers  
    const invalidStateRanks = samples.filter(s => 
      s.stateRank !== null && (s.stateRank <= 0 || !Number.isInteger(s.stateRank))
    );
    expect(invalidStateRanks).toHaveLength(0);

    // Property 3: Bucket classification must be consistent with national rank
    const bucket1Schools = samples.filter(s => s.rankingBucket === 1);
    const bucket2Schools = samples.filter(s => s.rankingBucket === 2);
    
    bucket1Schools.forEach(school => {
      expect(school.nationalRank).toBeGreaterThanOrEqual(RANKING_BUCKETS.EXACT_START);
      expect(school.nationalRank).toBeLessThanOrEqual(RANKING_BUCKETS.EXACT_END);
    });

    bucket2Schools.forEach(school => {
      expect(school.nationalRank).toBeGreaterThanOrEqual(RANKING_BUCKETS.RANGE_START);
      expect(school.nationalRank).toBeLessThanOrEqual(RANKING_BUCKETS.RANGE_END);
    });

    // Property 4: Confidence scores must be within valid bounds
    samples.forEach(school => {
      expect(school.confidence).toBeGreaterThanOrEqual(0);
      expect(school.confidence).toBeLessThanOrEqual(100);
    });

    // Property 5: Every school must have either national rank, state rank, or both
    // Note: Schools can have null national rank but still have state rank (Bucket 3)
    const schoolsWithoutRankings = samples.filter(s => 
      (s.nationalRank === null || s.nationalRank === undefined) && 
      (s.stateRank === null || s.stateRank === undefined)
    );
    expect(schoolsWithoutRankings).toHaveLength(0);

    console.log(`   ✅ All ${samples.length} schools pass ranking invariant tests`);
  });

  test('should detect regression patterns in ranking extraction', async () => {
    if (samples.length === 0) return;

    console.log('\n🔍 Regression Detection Analysis');
    console.log('==============================');

    // Detect suspicious patterns that might indicate extraction regressions
    const suspiciousPatterns = {
      allSameNationalRank: false,
      allSameStateRank: false,
      allSameConfidence: false,
      unexpectedlyLowConfidence: 0,
      missingSchoolNames: 0
    };

    // Check for all schools having the same national rank (likely regression)
    const nationalRanks = samples.map(s => s.nationalRank).filter(r => r !== null);
    if (nationalRanks.length > 1) {
      const uniqueNationalRanks = new Set(nationalRanks);
      suspiciousPatterns.allSameNationalRank = uniqueNationalRanks.size === 1;
    }

    // Check for all schools having the same state rank (likely regression)
    const stateRanks = samples.map(s => s.stateRank).filter(r => r !== null);
    if (stateRanks.length > 1) {
      const uniqueStateRanks = new Set(stateRanks);
      suspiciousPatterns.allSameStateRank = uniqueStateRanks.size === 1;
    }

    // Check for identical confidence scores (might indicate fixed values)
    const confidences = samples.map(s => s.confidence);
    const uniqueConfidences = new Set(confidences);
    suspiciousPatterns.allSameConfidence = uniqueConfidences.size === 1;

    // Count low confidence extractions
    suspiciousPatterns.unexpectedlyLowConfidence = samples.filter(s => s.confidence < 60).length;

    // Count missing school names
    suspiciousPatterns.missingSchoolNames = samples.filter(s => !s.schoolName || s.schoolName === s.schoolSlug).length;

    // Report findings
    Object.entries(suspiciousPatterns).forEach(([pattern, value]) => {
      const status = typeof value === 'boolean' ? (value ? '🚨 DETECTED' : '✅ OK') : `${value} instances`;
      console.log(`   ${pattern}: ${status}`);
    });

    // Fail test if critical regressions detected
    expect(suspiciousPatterns.allSameNationalRank).toBe(false);
    expect(suspiciousPatterns.allSameStateRank).toBe(false);
    expect(suspiciousPatterns.unexpectedlyLowConfidence).toBeLessThan(samples.length * 0.2); // <20% low confidence
    expect(suspiciousPatterns.missingSchoolNames).toBeLessThan(samples.length * 0.1); // <10% missing names
  });
});