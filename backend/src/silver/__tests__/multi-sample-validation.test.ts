/**
 * Multi-Sample Validation Tests
 * 
 * Rigorous testing of JSON-LD extraction against diverse real US News HTML files
 * to validate field extraction accuracy and catch outliers/errors.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { CSSExtractionMethod } from '../css-extraction-method';
import { ExtractionContext } from '../types';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface SampleValidationResult {
  schoolSlug: string;
  year: number;
  extractedData: any;
  confidence: number;
  fieldConfidences: any;
  errors: any[];
  validationIssues: string[];
}

describe('Multi-Sample JSON-LD Extraction Validation', () => {
  let extractor: CSSExtractionMethod;
  const samples: SampleValidationResult[] = [];
  
  // Diverse sample schools for testing
  const testSchools = [
    'a-c-flora-high-school-17702',
    'academic-magnet-high-school-17566', 
    'adams-high-school-14872',
    'alamo-heights-high-school-19276',
    'albany-high-school-4126'
  ];

  beforeAll(async () => {
    extractor = new CSSExtractionMethod();
    
    // Test multiple schools from both years
    for (const schoolSlug of testSchools) {
      for (const year of [2024, 2025]) {
        try {
          const result = await validateSchoolSample(schoolSlug, year);
          if (result) {
            samples.push(result);
          }
        } catch (error) {
          console.warn(`Failed to process ${schoolSlug} ${year}:`, error);
        }
      }
    }
  });

  async function validateSchoolSample(
    schoolSlug: string, 
    year: number
  ): Promise<SampleValidationResult | null> {
    const basePath = `/Volumes/OWC Express 1M2/USNEWS_${year}`;
    const schoolDir = join(basePath, schoolSlug);
    
    try {
      const files = readdirSync(schoolDir);
      const htmlFile = files.find(f => f.startsWith('docker_curl_') && f.endsWith('.html'));
      
      if (!htmlFile) return null;
      
      const htmlPath = join(schoolDir, htmlFile);
      const html = readFileSync(htmlPath, 'utf-8');
      
      const mockContext: ExtractionContext = {
        bronzeRecord: {
          id: 999,
          school_slug: schoolSlug,
          file_path: htmlPath,
          capture_timestamp: '2024-01-01T00:00:00Z',
          file_size: html.length,
          checksum_sha256: 'test',
          processing_status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        schoolSlug,
        sourceYear: year,
        fileContent: html,
        domDocument: null
      };
      
      const result = await extractor.extract(html, mockContext);
      
      // Validate data quality
      const validationIssues = validateDataQuality(result.data, schoolSlug);
      
      return {
        schoolSlug,
        year,
        extractedData: result.data,
        confidence: result.confidence,
        fieldConfidences: result.fieldConfidences,
        errors: result.errors,
        validationIssues
      };
      
    } catch (error) {
      console.warn(`Error processing ${schoolSlug} ${year}:`, error);
      return null;
    }
  }

  function validateDataQuality(data: any, schoolSlug: string): string[] {
    const issues: string[] = [];
    
    // Validate school name exists and is reasonable
    if (!data.school_name || data.school_name.length < 3) {
      issues.push(`Missing or invalid school name: "${data.school_name}"`);
    }
    
    // Validate percentage fields are in reasonable ranges
    const percentageFields = [
      'ap_participation_rate', 'ap_pass_rate', 'math_proficiency', 
      'reading_proficiency', 'science_proficiency', 'graduation_rate',
      'white_pct', 'asian_pct', 'hispanic_pct', 'black_pct', 
      'american_indian_pct', 'two_or_more_pct', 'female_pct', 'male_pct',
      'economically_disadvantaged_pct', 'free_lunch_pct', 'reduced_lunch_pct'
    ];
    
    percentageFields.forEach(field => {
      const value = data[field];
      if (value !== null && value !== undefined) {
        if (typeof value !== 'number' || value < 0 || value > 100) {
          issues.push(`Invalid percentage for ${field}: ${value}`);
        }
        
        // Flag suspicious values
        if (field === 'economically_disadvantaged_pct' && value === 100) {
          issues.push(`Suspicious: 100% economically disadvantaged for ${schoolSlug}`);
        }
        if (field === 'graduation_rate' && value < 50) {
          issues.push(`Low graduation rate flagged: ${value}%`);
        }
      }
    });
    
    // Validate rank fields
    if (data.national_rank && (data.national_rank < 1 || data.national_rank > 50000)) {
      issues.push(`Invalid national rank: ${data.national_rank}`);
    }
    if (data.state_rank && (data.state_rank < 1 || data.state_rank > 5000)) {
      issues.push(`Invalid state rank: ${data.state_rank}`);
    }
    
    // Validate enrollment
    if (data.enrollment && (data.enrollment < 10 || data.enrollment > 50000)) {
      issues.push(`Suspicious enrollment: ${data.enrollment}`);
    }
    
    // Validate address components
    if (!data.address_city || !data.address_state) {
      issues.push('Missing basic address information');
    }
    
    return issues;
  }

  test('should successfully extract data from multiple diverse schools', async () => {
    expect(samples.length).toBeGreaterThan(5);
    console.log(`\n📊 Processed ${samples.length} school samples`);
    
    const successfulExtractions = samples.filter(s => s.extractedData.school_name);
    const successRate = (successfulExtractions.length / samples.length) * 100;
    
    console.log(`✅ Success rate: ${successRate.toFixed(1)}% (${successfulExtractions.length}/${samples.length})`);
    
    expect(successRate).toBeGreaterThan(80); // At least 80% should extract successfully
  });

  test('should extract reasonable field values across samples', async () => {
    console.log('\n🔍 Field Value Analysis:');
    
    const fieldStats: Record<string, { count: number; values: number[]; issues: number }> = {};
    let totalIssues = 0;
    
    samples.forEach(sample => {
      // Count validation issues
      totalIssues += sample.validationIssues.length;
      if (sample.validationIssues.length > 0) {
        console.log(`❌ ${sample.schoolSlug} ${sample.year}:`);
        sample.validationIssues.forEach(issue => console.log(`   - ${issue}`));
      }
      
      // Collect field statistics
      Object.entries(sample.extractedData).forEach(([field, value]) => {
        if (typeof value === 'number' && value !== null) {
          if (!fieldStats[field]) {
            fieldStats[field] = { count: 0, values: [], issues: 0 };
          }
          fieldStats[field].count++;
          fieldStats[field].values.push(value);
        }
      });
    });
    
    // Analyze field distributions
    console.log('\n📈 Field Distribution Analysis:');
    Object.entries(fieldStats).forEach(([field, stats]) => {
      if (stats.values.length > 0) {
        const avg = stats.values.reduce((a, b) => a + b, 0) / stats.values.length;
        const min = Math.min(...stats.values);
        const max = Math.max(...stats.values);
        
        console.log(`   ${field}: avg=${avg.toFixed(1)}, min=${min}, max=${max}, count=${stats.count}`);
        
        // Flag suspicious patterns
        if (field === 'economically_disadvantaged_pct') {
          const hundredCount = stats.values.filter(v => v === 100).length;
          if (hundredCount > stats.values.length * 0.5) {
            console.log(`   ⚠️  WARNING: ${hundredCount}/${stats.values.length} schools show 100% econ disadvantaged`);
          }
        }
      }
    });
    
    console.log(`\n📊 Total validation issues: ${totalIssues}`);
    
    // Test should fail if too many validation issues
    const issueRate = (totalIssues / samples.length);
    expect(issueRate).toBeLessThan(3); // Less than 3 issues per school on average
  });

  test('should maintain consistent confidence scores', async () => {
    const confidenceScores = samples.map(s => s.confidence).filter(c => c > 0);
    
    if (confidenceScores.length > 0) {
      const avgConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
      const minConfidence = Math.min(...confidenceScores);
      
      console.log(`\n📊 Confidence Analysis:`);
      console.log(`   Average: ${avgConfidence.toFixed(1)}%`);
      console.log(`   Minimum: ${minConfidence.toFixed(1)}%`);
      console.log(`   Samples: ${confidenceScores.length}`);
      
      expect(avgConfidence).toBeGreaterThan(60); // Average confidence should be reasonable
      expect(minConfidence).toBeGreaterThan(20); // No extremely low confidence extractions
    }
  });

  test('should extract core required fields consistently', async () => {
    const coreFields = ['school_name', 'address_city', 'address_state'];
    
    console.log('\n🎯 Core Field Coverage:');
    coreFields.forEach(field => {
      const extracted = samples.filter(s => s.extractedData[field]).length;
      const coverage = (extracted / samples.length) * 100;
      
      console.log(`   ${field}: ${coverage.toFixed(1)}% (${extracted}/${samples.length})`);
      
      if (field === 'school_name') {
        expect(coverage).toBeGreaterThan(90); // School name should be near 100%
      } else {
        expect(coverage).toBeGreaterThan(70); // Other core fields should be majority coverage
      }
    });
  });

  test('should show detailed field extraction results', async () => {
    console.log('\n📋 Detailed Sample Results:');
    console.log('='.repeat(80));
    
    samples.slice(0, 3).forEach(sample => {
      console.log(`\n🏫 ${sample.extractedData.school_name || sample.schoolSlug} (${sample.year})`);
      console.log(`📊 Confidence: ${sample.confidence.toFixed(1)}%`);
      console.log(`🏆 State Rank: ${sample.extractedData.state_rank || 'N/A'}`);
      console.log(`📞 Phone: ${sample.extractedData.phone || 'N/A'}`);
      console.log(`🏠 City/State: ${sample.extractedData.address_city || 'N/A'}, ${sample.extractedData.address_state || 'N/A'}`);
      console.log(`🎓 AP Participation: ${sample.extractedData.ap_participation_rate || 'N/A'}%`);
      console.log(`👥 Demographics: ${sample.extractedData.white_pct || 'N/A'}% white, ${sample.extractedData.economically_disadvantaged_pct || 'N/A'}% econ disadvantaged`);
      console.log(`📈 Graduation Rate: ${sample.extractedData.graduation_rate || 'N/A'}%`);
      
      if (sample.validationIssues.length > 0) {
        console.log(`⚠️  Issues: ${sample.validationIssues.join(', ')}`);
      }
    });
    
    // This test always passes - it's for detailed logging
    expect(true).toBe(true);
  });
});