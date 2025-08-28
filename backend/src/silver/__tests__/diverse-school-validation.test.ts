/**
 * Diverse School Validation Tests
 * 
 * Test extraction across different school types, income levels, and regions
 * to validate field extraction accuracy and identify data patterns.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { CSSExtractionMethod } from '../css-extraction-method';
import { ExtractionContext } from '../types';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface SchoolSample {
  schoolSlug: string;
  year: number;
  data: any;
  confidence: number;
  issues: string[];
  rawJsonLD: any;
}

describe('Diverse School Sample Validation', () => {
  let extractor: CSSExtractionMethod;
  const samples: SchoolSample[] = [];
  
  beforeAll(async () => {
    extractor = new CSSExtractionMethod();
    
    // Sample different types of schools (find actual directories)
    const year2024Dir = '/Volumes/OWC Express 1M2/USNEWS_2024';
    const allSchools = readdirSync(year2024Dir).slice(0, 100); // First 100 schools
    
    // Take every 20th school for diversity
    const sampledSchools = allSchools.filter((_, index) => index % 20 === 0).slice(0, 10);
    
    for (const schoolSlug of sampledSchools) {
      try {
        const sample = await processSchoolSample(schoolSlug, 2024);
        if (sample) {
          samples.push(sample);
        }
      } catch (error) {
        console.warn(`Failed ${schoolSlug}:`, error);
      }
    }
    
    console.log(`\n📊 Successfully processed ${samples.length} diverse school samples`);
  });

  async function processSchoolSample(
    schoolSlug: string, 
    year: number
  ): Promise<SchoolSample | null> {
    const schoolDir = join(`/Volumes/OWC Express 1M2/USNEWS_${year}`, schoolSlug);
    
    try {
      const files = readdirSync(schoolDir);
      const htmlFile = files.find(f => f.endsWith('.html'));
      if (!htmlFile) return null;
      
      const htmlPath = join(schoolDir, htmlFile);
      const html = readFileSync(htmlPath, 'utf-8');
      
      // Extract raw JSON-LD for analysis
      const rawJsonLD = extractRawJsonLD(html);
      
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
      const issues = analyzeDataQuality(result.data, schoolSlug, rawJsonLD);
      
      return {
        schoolSlug,
        year,
        data: result.data,
        confidence: result.confidence,
        issues,
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

  function analyzeDataQuality(data: any, schoolSlug: string, rawJsonLD: any): string[] {
    const issues: string[] = [];
    
    // Check if economically disadvantaged makes sense in context
    if (data.economically_disadvantaged_pct === 100) {
      // Check if this is in the raw data or parsed incorrectly
      if (rawJsonLD?.description?.includes('100% of students are economically disadvantaged')) {
        issues.push(`CONFIRMED: US News reports 100% econ disadvantaged (Title I school)`);
      } else {
        issues.push(`ERROR: 100% econ disadvantaged not in source data`);
      }
    }
    
    // Validate school name extraction
    if (!data.school_name) {
      issues.push(`CRITICAL: No school name extracted`);
    } else if (data.school_name.length < 5) {
      issues.push(`SUSPECT: Very short school name: "${data.school_name}"`);
    }
    
    // Check for missing core location data
    if (!data.address_city || !data.address_state) {
      issues.push(`MISSING: Core location data (city/state)`);
    }
    
    // Validate percentage ranges
    const percentageFields = [
      'ap_participation_rate', 'graduation_rate', 'white_pct', 'economically_disadvantaged_pct'
    ];
    
    percentageFields.forEach(field => {
      const value = data[field];
      if (value !== null && value !== undefined) {
        if (typeof value !== 'number' || value < 0 || value > 100) {
          issues.push(`INVALID: ${field} = ${value} (should be 0-100)`);
        }
      }
    });
    
    // Check for reasonable rank ranges
    if (data.state_rank && (data.state_rank < 1 || data.state_rank > 2000)) {
      issues.push(`SUSPECT: State rank ${data.state_rank} seems unrealistic`);
    }
    
    return issues;
  }

  test('should extract data from diverse school samples', async () => {
    expect(samples.length).toBeGreaterThan(5);
    
    console.log('\n🏫 Sample School Analysis:');
    console.log('='.repeat(80));
    
    samples.forEach((sample, index) => {
      console.log(`\n${index + 1}. ${sample.data.school_name || 'UNNAMED'} (${sample.schoolSlug})`);
      console.log(`   📊 Confidence: ${sample.confidence.toFixed(1)}%`);
      console.log(`   🏆 Rank: ${sample.data.state_rank || 'N/A'}`);
      console.log(`   📍 Location: ${sample.data.address_city || 'N/A'}, ${sample.data.address_state || 'N/A'}`);
      console.log(`   💰 Econ Disadvantaged: ${sample.data.economically_disadvantaged_pct || 'N/A'}%`);
      console.log(`   🎓 AP Participation: ${sample.data.ap_participation_rate || 'N/A'}%`);
      console.log(`   👥 White %: ${sample.data.white_pct || 'N/A'}%`);
      
      if (sample.issues.length > 0) {
        console.log(`   ⚠️  Issues:`);
        sample.issues.forEach(issue => console.log(`      - ${issue}`));
      }
    });
    
    expect(samples.filter(s => s.data.school_name).length).toBeGreaterThan(samples.length * 0.8);
  });

  test('should validate economically disadvantaged field accuracy', async () => {
    const econDisadvantagedSamples = samples.filter(s => 
      s.data.economically_disadvantaged_pct !== null && 
      s.data.economically_disadvantaged_pct !== undefined
    );
    
    console.log('\n💰 Economically Disadvantaged Analysis:');
    console.log('=====================================');
    
    if (econDisadvantagedSamples.length > 0) {
      const values = econDisadvantagedSamples.map(s => s.data.economically_disadvantaged_pct);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const hundredPercent = values.filter(v => v === 100).length;
      
      console.log(`   Samples with data: ${econDisadvantagedSamples.length}/${samples.length}`);
      console.log(`   Average: ${avg.toFixed(1)}%`);
      console.log(`   Range: ${min}% - ${max}%`);
      console.log(`   Schools at 100%: ${hundredPercent}/${econDisadvantagedSamples.length} (${(hundredPercent/econDisadvantagedSamples.length*100).toFixed(1)}%)`);
      
      // Analyze 100% cases
      const hundredPercentCases = samples.filter(s => s.data.economically_disadvantaged_pct === 100);
      if (hundredPercentCases.length > 0) {
        console.log(`\n   100% Cases Analysis:`);
        hundredPercentCases.forEach(sample => {
          const confirmed = sample.rawJsonLD?.description?.includes('100% of students are economically disadvantaged');
          console.log(`   - ${sample.data.school_name}: ${confirmed ? '✅ CONFIRMED in source' : '❌ NOT in source'}`);
        });
      }
      
      // This should NOT fail - high poverty schools do exist
      expect(avg).toBeLessThan(90); // Average shouldn't be too high across diverse samples
    } else {
      console.log('   No economically disadvantaged data found');
    }
  });

  test('should show field coverage across diverse samples', async () => {
    const fields = [
      'school_name', 'address_city', 'address_state', 'phone',
      'state_rank', 'ap_participation_rate', 'white_pct', 
      'economically_disadvantaged_pct', 'graduation_rate'
    ];
    
    console.log('\n📊 Field Coverage Analysis:');
    console.log('============================');
    
    fields.forEach(field => {
      const withData = samples.filter(s => 
        s.data[field] !== null && 
        s.data[field] !== undefined && 
        s.data[field] !== ''
      ).length;
      
      const coverage = (withData / samples.length * 100).toFixed(1);
      const icon = withData === 0 ? '❌' : withData < samples.length * 0.5 ? '⚠️' : '✅';
      
      console.log(`   ${icon} ${field}: ${coverage}% (${withData}/${samples.length})`);
    });
    
    // Core fields should have good coverage
    const coreFields = ['school_name', 'address_city', 'address_state'];
    coreFields.forEach(field => {
      const coverage = samples.filter(s => s.data[field]).length / samples.length;
      expect(coverage).toBeGreaterThan(0.7); // 70% coverage for core fields
    });
  });

  test('should identify data quality patterns', async () => {
    const allIssues = samples.flatMap(s => s.issues);
    const issueTypes = allIssues.reduce((acc, issue) => {
      const type = issue.split(':')[0];
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n🔍 Data Quality Issue Analysis:');
    console.log('===============================');
    console.log(`   Total issues: ${allIssues.length}`);
    console.log(`   Issues per school: ${(allIssues.length / samples.length).toFixed(1)}`);
    
    Object.entries(issueTypes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`   ${type}: ${count} occurrences`);
      });
    
    // Should have manageable issue rate
    const issueRate = allIssues.length / samples.length;
    expect(issueRate).toBeLessThan(5); // Less than 5 issues per school on average
  });
});