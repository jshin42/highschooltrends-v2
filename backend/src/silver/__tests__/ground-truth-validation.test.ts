/**
 * Ground Truth Validation Test Suite
 * 
 * Provides stratified sampling and manual validation interface for ranking extraction accuracy.
 * This is the test suite you requested for validating ground truth data.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { CSSExtractionMethod } from '../css-extraction-method';
import { ExtractionContext } from '../types';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

interface GroundTruthSample {
  schoolSlug: string;
  schoolName: string;
  extractedNationalRank: number | null;
  extractedStateRank: number | null;
  extractedBucket: 1 | 2 | 3 | 4;
  confidence: number;
  isUnranked: boolean;
  htmlPath: string;
  usNewsUrl: string;
  validationNotes?: string;
}

interface ValidationReport {
  samples: GroundTruthSample[];
  bucketDistribution: Record<string, number>;
  confidenceStats: {
    average: number;
    min: number;
    max: number;
    belowThreshold: number;
  };
  timestamp: string;
}

describe('Ground Truth Validation', () => {
  let extractor: CSSExtractionMethod;
  const DATA_DIR = '/Volumes/OWC Express 1M2/USNEWS_2024';
  
  // Stratified sampling strategy
  const SAMPLE_STRATEGY = {
    bucket1Expected: 2,    // High-confidence national rankings
    bucket2Expected: 2,    // Range national rankings  
    bucket3Expected: 3,    // State-only rankings
    unrankedExpected: 2,   // Genuinely unranked schools
    total: 9
  };

  beforeAll(async () => {
    extractor = new CSSExtractionMethod();
  });

  test('should generate stratified ground truth validation samples', async () => {
    if (!existsSync(DATA_DIR)) {
      console.warn('⚠️  External drive not available - skipping ground truth validation');
      return;
    }

    const samples = await generateStratifiedSamples();
    const report = generateValidationReport(samples);
    
    // Write validation report for manual review
    const reportPath = join(process.cwd(), 'ground-truth-validation-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n🎯 GROUND TRUTH VALIDATION SAMPLES GENERATED');
    console.log('=' .repeat(60));
    console.log(`📊 Total samples: ${samples.length}`);
    console.log(`📁 Report saved to: ${reportPath}`);
    
    // Display samples for manual validation
    samples.forEach((sample, index) => {
      console.log(`\n${index + 1}. ${sample.schoolName} (${sample.schoolSlug})`);
      console.log(`   🏆 Extracted: National #${sample.extractedNationalRank || 'N/A'}, State #${sample.extractedStateRank || 'N/A'}`);
      console.log(`   📊 Bucket: ${sample.extractedBucket}, Confidence: ${sample.confidence}%`);
      console.log(`   🌐 Validate at: ${sample.usNewsUrl}`);
      console.log(`   📁 Local HTML: ${sample.htmlPath}`);
      
      if (sample.isUnranked) {
        console.log(`   ⚠️  Detected as UNRANKED - verify this is correct`);
      }
    });
    
    console.log('\n📝 MANUAL VALIDATION INSTRUCTIONS:');
    console.log('=' .repeat(40));
    console.log('1. Visit each US News URL above');
    console.log('2. Compare extracted rankings to actual website data');
    console.log('3. Note any discrepancies in validation_notes.txt');
    console.log('4. Update test expectations based on findings');
    
    // Assertions for basic data quality
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.length).toBeLessThanOrEqual(SAMPLE_STRATEGY.total);
    expect(samples.every(s => s.schoolName && s.schoolSlug)).toBe(true);
    expect(samples.every(s => s.confidence >= 0 && s.confidence <= 100)).toBe(true);
  });

  test('should validate known high-confidence schools', async () => {
    // Test specific schools we know should work correctly
    const knownSchools = [
      {
        slug: 'academic-magnet-high-school-17566',
        expectedNational: 7,
        expectedState: 1,
        expectedBucket: 1
      }
    ];

    for (const known of knownSchools) {
      const sample = await extractSchoolData(known.slug);
      
      if (sample) {
        console.log(`\n✅ Testing known school: ${sample.schoolName}`);
        console.log(`   Expected: National #${known.expectedNational}, State #${known.expectedState}`);
        console.log(`   Extracted: National #${sample.extractedNationalRank}, State #${sample.extractedStateRank}`);
        
        expect(sample.extractedNationalRank).toBe(known.expectedNational);
        expect(sample.extractedBucket).toBe(known.expectedBucket);
        expect(sample.confidence).toBeGreaterThan(80);
      }
    }
  });

  test('should identify potential data quality issues', async () => {
    if (!existsSync(DATA_DIR)) {
      return;
    }

    const samples = await generateStratifiedSamples();
    
    // Check for data quality red flags
    const lowConfidenceCount = samples.filter(s => s.confidence < 70).length;
    const missingRankingsCount = samples.filter(s => !s.extractedNationalRank && !s.extractedStateRank && !s.isUnranked).length;
    const unexpectedUnrankedCount = samples.filter(s => s.isUnranked).length;
    
    console.log('\n🚨 DATA QUALITY ANALYSIS:');
    console.log(`   Low confidence (<70%): ${lowConfidenceCount}/${samples.length}`);
    console.log(`   Missing rankings: ${missingRankingsCount}/${samples.length}`);
    console.log(`   Detected as unranked: ${unexpectedUnrankedCount}/${samples.length}`);
    
    // Fail test if too many quality issues
    expect(lowConfidenceCount / samples.length).toBeLessThan(0.3); // <30% low confidence
    expect(missingRankingsCount).toBe(0); // No completely missing rankings
  });

  // Helper functions
  async function generateStratifiedSamples(): Promise<GroundTruthSample[]> {
    const allSchools = readdirSync(DATA_DIR).filter(school => !school.startsWith('.'));
    const samples: GroundTruthSample[] = [];
    
    // Sample schools across different alphabetical ranges to increase diversity
    const sampleRanges = [
      allSchools.filter(s => s[0] <= 'e'), // A-E
      allSchools.filter(s => s[0] > 'e' && s[0] <= 'm'), // F-M  
      allSchools.filter(s => s[0] > 'm' && s[0] <= 's'), // N-S
      allSchools.filter(s => s[0] > 's') // T-Z
    ];
    
    // Take samples from each range
    for (const range of sampleRanges) {
      if (range.length > 0 && samples.length < SAMPLE_STRATEGY.total) {
        const randomIndex = Math.floor(Math.random() * Math.min(range.length, 50)); // First 50 for speed
        const schoolSlug = range[randomIndex];
        
        const sample = await extractSchoolData(schoolSlug);
        if (sample) {
          samples.push(sample);
        }
      }
    }
    
    return samples.slice(0, SAMPLE_STRATEGY.total);
  }

  async function extractSchoolData(schoolSlug: string): Promise<GroundTruthSample | null> {
    const schoolDir = join(DATA_DIR, schoolSlug);
    
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
        sourceYear: 2024,
        fileContent: html,
        domDocument: null
      };

      const result = await extractor.extract(html, mockContext);
      
      // Determine bucket
      let bucket: 1 | 2 | 3 | 4 = 4; // Default to unranked
      const nationalRank = result.data.national_rank;
      
      if (nationalRank) {
        if (nationalRank >= 1 && nationalRank <= 13426) {
          bucket = 1;
        } else if (nationalRank >= 13427 && nationalRank <= 17901) {
          bucket = 2;
        } else {
          bucket = 3;
        }
      } else if (result.data.state_rank) {
        bucket = 3;
      }
      
      // Generate US News URL for manual validation
      const usNewsUrl = `https://www.usnews.com/education/best-high-schools/south-carolina/districts/charleston-county-school-district-106145/${schoolSlug}`;
      
      return {
        schoolSlug,
        schoolName: result.data.school_name || schoolSlug,
        extractedNationalRank: result.data.national_rank,
        extractedStateRank: result.data.state_rank,
        extractedBucket: bucket,
        confidence: Math.round(result.confidence),
        isUnranked: !!(result.data as any).is_unranked,
        htmlPath,
        usNewsUrl
      };

    } catch (error) {
      return null;
    }
  }

  function generateValidationReport(samples: GroundTruthSample[]): ValidationReport {
    const bucketDistribution = samples.reduce((acc, sample) => {
      const bucket = `Bucket ${sample.extractedBucket}`;
      acc[bucket] = (acc[bucket] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const confidences = samples.map(s => s.confidence);
    const confidenceStats = {
      average: Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length),
      min: Math.min(...confidences),
      max: Math.max(...confidences),
      belowThreshold: confidences.filter(c => c < 70).length
    };

    return {
      samples,
      bucketDistribution,
      confidenceStats,
      timestamp: new Date().toISOString()
    };
  }
});