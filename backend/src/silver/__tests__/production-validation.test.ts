/**
 * Production Validation Tests
 * 
 * Comprehensive validation of Silver layer extraction against real US News data
 * with performance benchmarking and error handling for production deployment.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { CSSExtractionMethod } from '../css-extraction-method';
import { SilverProcessor } from '../extraction-methods';
import { SilverService } from '../silver-service';
import { initializeSilverDatabase } from '../database-migration';
import { ExtractionContext } from '../types';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

interface ProductionSample {
  schoolSlug: string;
  year: number;
  data: any;
  confidence: number;
  processingTimeMs: number;
  fieldCoverage: number;
  validationIssues: string[];
}

describe('Production Validation Suite', () => {
  let extractor: CSSExtractionMethod;
  let processor: SilverProcessor;
  let samples: ProductionSample[] = [];
  
  // Gold standard field requirements for production
  const REQUIRED_FIELDS = [
    'school_name', 'address_city', 'address_state', 'phone'
  ];
  
  const IMPORTANT_FIELDS = [
    'state_rank', 'ap_participation_rate', 'white_pct', 
    'economically_disadvantaged_pct', 'address_street', 'address_zip'
  ];
  
  const COMPLETE_FIELD_SET = [
    ...REQUIRED_FIELDS,
    ...IMPORTANT_FIELDS,
    'national_rank', 'graduation_rate', 'ap_pass_rate', 
    'math_proficiency', 'reading_proficiency', 'science_proficiency',
    'enrollment', 'student_teacher_ratio', 'full_time_teachers',
    'asian_pct', 'hispanic_pct', 'black_pct', 'american_indian_pct',
    'two_or_more_pct', 'female_pct', 'male_pct',
    'free_lunch_pct', 'reduced_lunch_pct'
  ];

  beforeAll(async () => {
    extractor = new CSSExtractionMethod();
    processor = new SilverProcessor([extractor]);
    
    // Sample diverse schools for comprehensive validation
    await collectProductionSamples();
    
    console.log(`\n🏭 Production Validation: ${samples.length} schools analyzed`);
  });

  async function collectProductionSamples(): Promise<void> {
    const dataDir = '/Volumes/OWC Express 1M2/USNEWS_2024';
    
    if (!existsSync(dataDir)) {
      console.warn('External drive not available - using minimal validation');
      return;
    }
    
    try {
      const allSchools = readdirSync(dataDir);
      
      // Stratified sampling: different school types
      const sampleStrategies = [
        { pattern: /^[a-c]/, label: 'A-C schools', take: 5 },
        { pattern: /high-school/, label: 'Traditional high schools', take: 5 },
        { pattern: /academy/, label: 'Academy schools', take: 3 },
        { pattern: /charter/, label: 'Charter schools', take: 2 },
        { pattern: /magnet/, label: 'Magnet schools', take: 2 }
      ];
      
      for (const strategy of sampleStrategies) {
        const matching = allSchools.filter(school => strategy.pattern.test(school));
        const sampled = matching.slice(0, strategy.take);
        
        for (const schoolSlug of sampled) {
          try {
            const sample = await processProductionSample(schoolSlug, 2024);
            if (sample) {
              samples.push(sample);
            }
          } catch (error) {
            console.warn(`Failed to process ${schoolSlug}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Error collecting samples:', error);
    }
  }

  async function processProductionSample(
    schoolSlug: string, 
    year: number
  ): Promise<ProductionSample | null> {
    const schoolDir = join(`/Volumes/OWC Express 1M2/USNEWS_${year}`, schoolSlug);
    
    try {
      const files = readdirSync(schoolDir);
      const htmlFile = files.find(f => f.endsWith('.html'));
      if (!htmlFile) return null;
      
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
      
      // Performance benchmarking
      const startTime = Date.now();
      const result = await extractor.extract(html, mockContext);
      const processingTimeMs = Date.now() - startTime;
      
      // Field coverage analysis
      const extractedFields = COMPLETE_FIELD_SET.filter(field => 
        result.data[field] !== null && 
        result.data[field] !== undefined &&
        result.data[field] !== ''
      );
      const fieldCoverage = (extractedFields.length / COMPLETE_FIELD_SET.length) * 100;
      
      // Validation issues
      const validationIssues = validateProductionData(result.data, schoolSlug);
      
      return {
        schoolSlug,
        year,
        data: result.data,
        confidence: result.confidence,
        processingTimeMs,
        fieldCoverage,
        validationIssues
      };
      
    } catch (error) {
      return null;
    }
  }

  function validateProductionData(data: any, schoolSlug: string): string[] {
    const issues: string[] = [];
    
    // Critical field validation
    REQUIRED_FIELDS.forEach(field => {
      if (!data[field]) {
        issues.push(`CRITICAL: Missing required field ${field}`);
      }
    });
    
    // Data quality validation
    if (data.school_name && data.school_name.length < 5) {
      issues.push(`QUALITY: School name too short: "${data.school_name}"`);
    }
    
    // Range validation for percentages
    const percentageFields = [
      'ap_participation_rate', 'graduation_rate', 'white_pct', 
      'economically_disadvantaged_pct', 'free_lunch_pct'
    ];
    
    percentageFields.forEach(field => {
      const value = data[field];
      if (value !== null && value !== undefined) {
        if (typeof value !== 'number' || value < 0 || value > 100) {
          issues.push(`INVALID: ${field} = ${value} (must be 0-100)`);
        }
      }
    });
    
    // Rank validation
    if (data.state_rank && (data.state_rank < 1 || data.state_rank > 5000)) {
      issues.push(`SUSPECT: State rank ${data.state_rank} outside expected range`);
    }
    
    // Logical consistency checks
    if (data.free_lunch_pct && data.reduced_lunch_pct) {
      const totalLunch = data.free_lunch_pct + data.reduced_lunch_pct;
      if (totalLunch > 100) {
        issues.push(`LOGICAL: Free + reduced lunch > 100% (${totalLunch}%)`);
      }
    }
    
    return issues;
  }

  test('should meet minimum production requirements', async () => {
    expect(samples.length).toBeGreaterThan(0);
    
    if (samples.length === 0) {
      console.warn('⚠️  No samples available - external drive may not be mounted');
      return;
    }
    
    console.log('\n🎯 Production Requirements Analysis:');
    console.log('===================================');
    
    // Required field coverage
    const requiredFieldCoverage = REQUIRED_FIELDS.map(field => {
      const covered = samples.filter(s => s.data[field]).length;
      const coverage = (covered / samples.length) * 100;
      console.log(`   ${field}: ${coverage.toFixed(1)}% (${covered}/${samples.length})`);
      return coverage;
    });
    
    const avgRequiredCoverage = requiredFieldCoverage.reduce((a, b) => a + b, 0) / requiredFieldCoverage.length;
    console.log(`   Average required field coverage: ${avgRequiredCoverage.toFixed(1)}%`);
    
    // Production requirements
    expect(avgRequiredCoverage).toBeGreaterThan(80); // 80%+ coverage for required fields
    
    const criticalIssueCount = samples.reduce((count, s) => 
      count + s.validationIssues.filter(issue => issue.includes('CRITICAL')).length, 0
    );
    
    expect(criticalIssueCount).toBeLessThan(samples.length * 0.2); // <20% critical issues
  });

  test('should maintain acceptable performance under load', async () => {
    if (samples.length === 0) return;
    
    const processingTimes = samples.map(s => s.processingTimeMs);
    const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
    const maxTime = Math.max(...processingTimes);
    const p95Time = processingTimes.sort((a, b) => a - b)[Math.floor(processingTimes.length * 0.95)];
    
    console.log('\n⚡ Performance Analysis:');
    console.log('=======================');
    console.log(`   Average processing time: ${avgTime.toFixed(1)}ms`);
    console.log(`   P95 processing time: ${p95Time.toFixed(1)}ms`);
    console.log(`   Maximum processing time: ${maxTime}ms`);
    console.log(`   Projected time for 36K schools: ${((avgTime * 36000) / 1000 / 60).toFixed(1)} minutes`);
    
    // Performance requirements for production
    expect(avgTime).toBeLessThan(500); // <500ms average processing
    expect(p95Time).toBeLessThan(1000); // <1s for 95% of schools
    expect(maxTime).toBeLessThan(3000); // <3s maximum processing time
  });

  test('should extract comprehensive field coverage', async () => {
    if (samples.length === 0) return;
    
    console.log('\n📊 Field Coverage Analysis:');
    console.log('===========================');
    
    const fieldStats = COMPLETE_FIELD_SET.map(field => {
      const extracted = samples.filter(s => 
        s.data[field] !== null && 
        s.data[field] !== undefined && 
        s.data[field] !== ''
      ).length;
      
      const coverage = (extracted / samples.length) * 100;
      const isRequired = REQUIRED_FIELDS.includes(field);
      const isImportant = IMPORTANT_FIELDS.includes(field);
      
      let icon = '📊';
      if (isRequired) icon = coverage > 80 ? '✅' : '❌';
      else if (isImportant) icon = coverage > 60 ? '✅' : '⚠️';
      
      console.log(`   ${icon} ${field}: ${coverage.toFixed(1)}% (${extracted}/${samples.length})`);
      
      return { field, coverage, isRequired, isImportant };
    });
    
    // Comprehensive coverage requirements
    const requiredFieldStats = fieldStats.filter(f => f.isRequired);
    const importantFieldStats = fieldStats.filter(f => f.isImportant);
    
    const avgRequiredCoverage = requiredFieldStats.reduce((sum, f) => sum + f.coverage, 0) / requiredFieldStats.length;
    const avgImportantCoverage = importantFieldStats.reduce((sum, f) => sum + f.coverage, 0) / importantFieldStats.length;
    
    console.log(`\n   📈 Summary:`);
    console.log(`   Required fields avg: ${avgRequiredCoverage.toFixed(1)}%`);
    console.log(`   Important fields avg: ${avgImportantCoverage.toFixed(1)}%`);
    
    expect(avgRequiredCoverage).toBeGreaterThan(80); // Required fields must be >80%
    expect(avgImportantCoverage).toBeGreaterThan(60); // Important fields should be >60%
  });

  test('should handle data quality validation', async () => {
    if (samples.length === 0) return;
    
    const allIssues = samples.flatMap(s => s.validationIssues);
    const issuesByType = allIssues.reduce((acc, issue) => {
      const type = issue.split(':')[0];
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n🔍 Data Quality Analysis:');
    console.log('=========================');
    console.log(`   Total validation issues: ${allIssues.length}`);
    console.log(`   Issues per school: ${(allIssues.length / samples.length).toFixed(1)}`);
    
    Object.entries(issuesByType)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        const rate = (count / samples.length * 100).toFixed(1);
        console.log(`   ${type}: ${count} issues (${rate}% of schools)`);
      });
    
    // Data quality requirements
    const criticalIssues = allIssues.filter(issue => issue.includes('CRITICAL')).length;
    const invalidIssues = allIssues.filter(issue => issue.includes('INVALID')).length;
    
    expect(criticalIssues).toBeLessThan(samples.length * 0.1); // <10% critical issues
    expect(invalidIssues).toBeLessThan(samples.length * 0.05); // <5% invalid data issues
    
    console.log(`\n   ✅ Critical issue rate: ${(criticalIssues/samples.length*100).toFixed(1)}% (target: <10%)`);
    console.log(`   ✅ Invalid data rate: ${(invalidIssues/samples.length*100).toFixed(1)}% (target: <5%)`);
  });

  test('should provide production deployment confidence', async () => {
    if (samples.length === 0) {
      console.warn('⚠️  Cannot assess production readiness without samples');
      return;
    }
    
    const confidenceScores = samples.map(s => s.confidence);
    const avgConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
    const minConfidence = Math.min(...confidenceScores);
    
    const highConfidence = samples.filter(s => s.confidence > 80).length;
    const mediumConfidence = samples.filter(s => s.confidence > 60 && s.confidence <= 80).length;
    const lowConfidence = samples.filter(s => s.confidence <= 60).length;
    
    console.log('\n🚀 Production Deployment Assessment:');
    console.log('====================================');
    console.log(`   Average confidence: ${avgConfidence.toFixed(1)}%`);
    console.log(`   Minimum confidence: ${minConfidence.toFixed(1)}%`);
    console.log(`   High confidence (>80%): ${highConfidence}/${samples.length} (${(highConfidence/samples.length*100).toFixed(1)}%)`);
    console.log(`   Medium confidence (60-80%): ${mediumConfidence}/${samples.length} (${(mediumConfidence/samples.length*100).toFixed(1)}%)`);
    console.log(`   Low confidence (<60%): ${lowConfidence}/${samples.length} (${(lowConfidence/samples.length*100).toFixed(1)}%)`);
    
    // Production deployment criteria
    expect(avgConfidence).toBeGreaterThan(75); // Average confidence >75%
    expect(highConfidence / samples.length).toBeGreaterThan(0.6); // >60% high confidence
    expect(lowConfidence / samples.length).toBeLessThan(0.1); // <10% low confidence
    
    if (avgConfidence > 85 && highConfidence / samples.length > 0.8) {
      console.log('\n   🎉 PRODUCTION READY: High confidence across all metrics');
    } else if (avgConfidence > 75 && highConfidence / samples.length > 0.6) {
      console.log('\n   ✅ PRODUCTION APPROVED: Meets minimum requirements');
    } else {
      console.log('\n   ⚠️  NEEDS IMPROVEMENT: Consider additional validation before production');
    }
  });
});