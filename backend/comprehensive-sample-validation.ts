/**
 * Comprehensive validation on diverse school sample
 * Tests CSS extraction fixes across different school types, states, and years
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { CSSExtractionMethod } from './src/silver/css-extraction-method';
import { ExtractionContext } from './src/silver/types';

interface SampleSchool {
  slug: string;
  path: string;
  year: number;
  state?: string;
  type?: string;
  size?: string;
  setting?: string;
}

interface ValidationResult {
  school: SampleSchool;
  results: Record<string, any>;
  successCount: number;
  totalFields: number;
  successRate: number;
  errors: string[];
}

async function comprehensiveSampleValidation(): Promise<void> {
  console.log('🎯 Comprehensive Sample Validation - Testing Real Production Readiness\n');
  
  // Target fields we're validating
  const targetFields = [
    'school_name', 'grades_served', 'address_street', 'address_city', 'address_state',
    'address_zip', 'phone', 'website', 'setting', 'enrollment', 'student_teacher_ratio',
    'full_time_teachers', 'national_rank', 'state_rank', 'ap_participation_rate',
    'ap_pass_rate', 'math_proficiency', 'reading_proficiency', 'science_proficiency',
    'graduation_rate'
  ];
  
  // Discover available schools from both years
  const sampleSchools = await discoverSampleSchools();
  console.log(`📊 Found ${sampleSchools.length} available schools for testing\n`);
  
  if (sampleSchools.length === 0) {
    console.log('❌ No schools found for testing. Check data directories.');
    return;
  }
  
  // Select diverse sample (max 100 schools)
  const selectedSample = selectDiverseSample(sampleSchools, 100);
  console.log(`🎯 Selected ${selectedSample.length} schools for diverse sample testing\n`);
  
  const extractor = new CSSExtractionMethod();
  const results: ValidationResult[] = [];
  let totalSuccesses = 0;
  let totalFields = 0;
  
  console.log('🧪 RUNNING COMPREHENSIVE VALIDATION:\n');
  
  for (let i = 0; i < selectedSample.length; i++) {
    const school = selectedSample[i];
    console.log(`${(i + 1).toString().padStart(3)}/${selectedSample.length} Testing: ${school.slug} (${school.year})`);
    
    try {
      const htmlContent = readFileSync(school.path, 'utf-8');
      
      const mockContext: ExtractionContext = {
        bronzeRecord: {
          id: i + 1,
          school_slug: school.slug,
          file_path: school.path,
          capture_timestamp: new Date().toISOString(),
          file_size: htmlContent.length,
          checksum_sha256: 'test',
          processing_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        schoolSlug: school.slug,
        sourceYear: school.year,
        fileContent: htmlContent,
        domDocument: null
      };
      
      const extractionResult = await extractor.extract(htmlContent, mockContext);
      
      // Count successful field extractions
      let successCount = 0;
      const errors: string[] = [];
      const fieldResults: Record<string, any> = {};
      
      targetFields.forEach(field => {
        const value = (extractionResult.data as any)[field];
        fieldResults[field] = value;
        
        if (value !== null && value !== undefined && value !== '') {
          successCount++;
        } else {
          errors.push(`Missing: ${field}`);
        }
      });
      
      const successRate = (successCount / targetFields.length) * 100;
      
      results.push({
        school,
        results: fieldResults,
        successCount,
        totalFields: targetFields.length,
        successRate,
        errors
      });
      
      totalSuccesses += successCount;
      totalFields += targetFields.length;
      
      // Show progress
      const status = successRate >= 80 ? '✅' : successRate >= 60 ? '⚠️' : '❌';
      console.log(`     ${status} ${successCount}/${targetFields.length} (${successRate.toFixed(1)}%)`);
      
      if (errors.length > 0 && errors.length <= 5) {
        console.log(`     Missing: ${errors.slice(0, 5).join(', ')}`);
      }
      
    } catch (error) {
      console.log(`     💥 ERROR: ${error}`);
      results.push({
        school,
        results: {},
        successCount: 0,
        totalFields: targetFields.length,
        successRate: 0,
        errors: [`Extraction failed: ${error}`]
      });
      totalFields += targetFields.length;
    }
  }
  
  // Comprehensive analysis
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE VALIDATION RESULTS');
  console.log('='.repeat(80));
  
  const overallSuccessRate = (totalSuccesses / totalFields) * 100;
  console.log(`\nOverall Success Rate: ${totalSuccesses}/${totalFields} (${overallSuccessRate.toFixed(1)}%)`);
  
  // Success rate distribution
  const successRanges = {
    perfect: results.filter(r => r.successRate === 100).length,
    excellent: results.filter(r => r.successRate >= 90 && r.successRate < 100).length,
    good: results.filter(r => r.successRate >= 70 && r.successRate < 90).length,
    poor: results.filter(r => r.successRate >= 50 && r.successRate < 70).length,
    failing: results.filter(r => r.successRate < 50).length
  };
  
  console.log(`\nSuccess Rate Distribution:`);
  console.log(`  Perfect (100%):     ${successRanges.perfect} schools`);
  console.log(`  Excellent (90-99%): ${successRanges.excellent} schools`);
  console.log(`  Good (70-89%):      ${successRanges.good} schools`);
  console.log(`  Poor (50-69%):      ${successRanges.poor} schools`);
  console.log(`  Failing (<50%):     ${successRanges.failing} schools`);
  
  // Field-specific analysis
  console.log(`\n📋 FIELD-SPECIFIC SUCCESS RATES:`);
  const fieldSuccessRates: Record<string, number> = {};
  
  targetFields.forEach(field => {
    const successCount = results.filter(r => {
      const value = r.results[field];
      return value !== null && value !== undefined && value !== '';
    }).length;
    
    const successRate = (successCount / results.length) * 100;
    fieldSuccessRates[field] = successRate;
  });
  
  // Sort by success rate
  const sortedFields = Object.entries(fieldSuccessRates)
    .sort(([,a], [,b]) => b - a);
    
  sortedFields.forEach(([field, rate]) => {
    const status = rate >= 90 ? '✅' : rate >= 70 ? '⚠️' : '❌';
    console.log(`  ${status} ${field.padEnd(25)}: ${rate.toFixed(1)}%`);
  });
  
  // Problematic schools analysis
  const problemSchools = results.filter(r => r.successRate < 70).sort((a, b) => a.successRate - b.successRate);
  
  if (problemSchools.length > 0) {
    console.log(`\n⚠️ SCHOOLS WITH SUCCESS RATE < 70% (${problemSchools.length} schools):`);
    problemSchools.slice(0, 10).forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.school.slug} (${result.school.year}): ${result.successRate.toFixed(1)}%`);
      console.log(`     Path: ${result.school.path}`);
      console.log(`     Top issues: ${result.errors.slice(0, 3).join(', ')}`);
    });
    
    if (problemSchools.length > 10) {
      console.log(`     ... and ${problemSchools.length - 10} more`);
    }
  }
  
  // Year comparison
  const yearResults = {
    2024: results.filter(r => r.school.year === 2024),
    2025: results.filter(r => r.school.year === 2025)
  };
  
  console.log(`\n📅 YEAR COMPARISON:`);
  Object.entries(yearResults).forEach(([year, yearData]) => {
    if (yearData.length > 0) {
      const yearSuccessRate = (yearData.reduce((sum, r) => sum + r.successCount, 0) / (yearData.length * targetFields.length)) * 100;
      console.log(`  ${year}: ${yearSuccessRate.toFixed(1)}% (${yearData.length} schools)`);
    }
  });
  
  // Production readiness assessment
  console.log(`\n🚀 PRODUCTION READINESS ASSESSMENT:`);
  
  if (overallSuccessRate >= 95) {
    console.log(`✅ PRODUCTION READY: ${overallSuccessRate.toFixed(1)}% success rate meets high-quality threshold`);
  } else if (overallSuccessRate >= 85) {
    console.log(`⚠️ CAUTION: ${overallSuccessRate.toFixed(1)}% success rate acceptable but with ${successRanges.failing + successRanges.poor} problematic schools`);
    console.log(`   Recommend investigating failure patterns before full deployment`);
  } else {
    console.log(`❌ NOT PRODUCTION READY: ${overallSuccessRate.toFixed(1)}% success rate too low for deployment`);
    console.log(`   Need to fix major issues before considering production deployment`);
  }
  
  // Export detailed results for further analysis
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = `validation-results-${timestamp.substring(0, 19)}.json`;
  
  try {
    const fs = require('fs');
    fs.writeFileSync(resultsFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      overallSuccessRate,
      totalSchools: results.length,
      fieldSuccessRates,
      successRanges,
      results: results
    }, null, 2));
    console.log(`\n💾 Detailed results saved to: ${resultsFile}`);
  } catch (error) {
    console.log(`\n⚠️ Could not save results file: ${error}`);
  }
}

async function discoverSampleSchools(): Promise<SampleSchool[]> {
  const schools: SampleSchool[] = [];
  const baseDir = '/Volumes/OWC Express 1M2';
  
  try {
    // Check both years
    for (const year of [2024, 2025]) {
      const yearDir = join(baseDir, `USNEWS_${year}`);
      
      try {
        const schoolDirs = readdirSync(yearDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        for (const schoolDir of schoolDirs) {
          const schoolPath = join(yearDir, schoolDir);
          
          // Look for HTML files
          try {
            const files = readdirSync(schoolPath);
            const htmlFiles = files.filter(f => f.endsWith('.html'));
            
            if (htmlFiles.length > 0) {
              // Use the first HTML file found
              const htmlFile = htmlFiles[0];
              const fullPath = join(schoolPath, htmlFile);
              
              // Basic file validation
              const stats = statSync(fullPath);
              if (stats.size > 1000) { // At least 1KB
                schools.push({
                  slug: schoolDir,
                  path: fullPath,
                  year: year,
                  // Could extract more metadata from path/content if needed
                });
              }
            }
          } catch (error) {
            // Skip schools with read errors
            continue;
          }
        }
      } catch (error) {
        console.log(`⚠️ Could not read ${yearDir}: ${error}`);
      }
    }
  } catch (error) {
    console.log(`⚠️ Could not access base directory ${baseDir}: ${error}`);
  }
  
  return schools;
}

function selectDiverseSample(schools: SampleSchool[], maxCount: number): SampleSchool[] {
  if (schools.length <= maxCount) {
    return schools;
  }
  
  // Simple sampling: try to get diverse selection
  const sample: SampleSchool[] = [];
  
  // First, ensure we get schools from both years if available
  const schools2024 = schools.filter(s => s.year === 2024);
  const schools2025 = schools.filter(s => s.year === 2025);
  
  const targetPerYear = Math.floor(maxCount / 2);
  
  // Sample from each year
  if (schools2024.length > 0) {
    const step = Math.ceil(schools2024.length / Math.min(targetPerYear, schools2024.length));
    for (let i = 0; i < schools2024.length && sample.length < targetPerYear; i += step) {
      sample.push(schools2024[i]);
    }
  }
  
  if (schools2025.length > 0) {
    const remainingCount = maxCount - sample.length;
    const step = Math.ceil(schools2025.length / Math.min(remainingCount, schools2025.length));
    for (let i = 0; i < schools2025.length && sample.length < maxCount; i += step) {
      sample.push(schools2025[i]);
    }
  }
  
  // If we still need more, fill from remaining schools
  const remaining = schools.filter(s => !sample.some(sampled => sampled.slug === s.slug && sampled.year === s.year));
  const step = Math.ceil(remaining.length / (maxCount - sample.length));
  for (let i = 0; i < remaining.length && sample.length < maxCount; i += step) {
    sample.push(remaining[i]);
  }
  
  return sample;
}

if (require.main === module) {
  comprehensiveSampleValidation().catch(console.error);
}

export { comprehensiveSampleValidation };