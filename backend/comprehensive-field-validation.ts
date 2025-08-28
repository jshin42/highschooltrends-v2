/**
 * Comprehensive Field Validation - Crisis Assessment
 * 
 * Tests all 33 Silver layer fields on 100 diverse schools to identify:
 * 1. Which fields are working (likely only rankings)
 * 2. Which fields are completely broken (likely 80%+ of them)
 * 3. Field success rates across different school types
 * 4. Performance impact of full 33-field extraction vs rankings-only
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { CSSExtractionMethod } from './src/silver/css-extraction-method';
import { ExtractionContext } from './src/silver/types';

interface FieldValidationResult {
  schoolSlug: string;
  schoolType: 'traditional' | 'online' | 'charter' | 'magnet' | 'unknown';
  
  // Basic Information (3 fields)
  school_name: { value: any; confidence: number; success: boolean };
  nces_id: { value: any; confidence: number; success: boolean };
  grades_served: { value: any; confidence: number; success: boolean };
  
  // Location Data (7 fields) 
  address_street: { value: any; confidence: number; success: boolean };
  address_city: { value: any; confidence: number; success: boolean };
  address_state: { value: any; confidence: number; success: boolean };
  address_zip: { value: any; confidence: number; success: boolean };
  phone: { value: any; confidence: number; success: boolean };
  website: { value: any; confidence: number; success: boolean };
  setting: { value: any; confidence: number; success: boolean };
  
  // Enrollment Data (3 fields)
  enrollment: { value: any; confidence: number; success: boolean };
  student_teacher_ratio: { value: any; confidence: number; success: boolean };
  full_time_teachers: { value: any; confidence: number; success: boolean };
  
  // Rankings (2 fields) - KNOWN TO WORK
  national_rank: { value: any; confidence: number; success: boolean };
  state_rank: { value: any; confidence: number; success: boolean };
  
  // Academic Performance (7 fields)
  ap_participation_rate: { value: any; confidence: number; success: boolean };
  ap_pass_rate: { value: any; confidence: number; success: boolean };
  math_proficiency: { value: any; confidence: number; success: boolean };
  reading_proficiency: { value: any; confidence: number; success: boolean };
  science_proficiency: { value: any; confidence: number; success: boolean };
  graduation_rate: { value: any; confidence: number; success: boolean };
  college_readiness_index: { value: any; confidence: number; success: boolean };
  
  // Demographics - Race (6 fields)
  white_pct: { value: any; confidence: number; success: boolean };
  asian_pct: { value: any; confidence: number; success: boolean };
  hispanic_pct: { value: any; confidence: number; success: boolean };
  black_pct: { value: any; confidence: number; success: boolean };
  american_indian_pct: { value: any; confidence: number; success: boolean };
  two_or_more_pct: { value: any; confidence: number; success: boolean };
  
  // Demographics - Gender (2 fields)
  female_pct: { value: any; confidence: number; success: boolean };
  male_pct: { value: any; confidence: number; success: boolean };
  
  // Socioeconomic (3 fields)
  economically_disadvantaged_pct: { value: any; confidence: number; success: boolean };
  free_lunch_pct: { value: any; confidence: number; success: boolean };
  reduced_lunch_pct: { value: any; confidence: number; success: boolean };
  
  // Performance metrics
  extractionTimeMs: number;
  overallConfidence: number;
  fieldsExtracted: number;
  fieldsSuccessful: number;
}

interface ValidationSummary {
  totalSchools: number;
  schoolTypes: Record<string, number>;
  
  fieldSuccessRates: Record<string, {
    successCount: number;
    successRate: number;
    avgConfidence: number;
    avgValue: string | number;
    fieldType: 'basic' | 'location' | 'enrollment' | 'rankings' | 'academics' | 'demographics' | 'socioeconomic';
  }>;
  
  performanceMetrics: {
    avgExtractionTimeMs: number;
    maxExtractionTimeMs: number;
    avgFieldsExtracted: number;
    avgOverallConfidence: number;
    totalFieldExtractions: number;
    successfulFieldExtractions: number;
    overallFieldSuccessRate: number;
  };
  
  criticalFindings: {
    completelyBrokenFields: string[];
    lowPerformingFields: string[];
    highPerformingFields: string[];
    schoolTypeIssues: Record<string, string[]>;
  };
}

const globalExtractor = new CSSExtractionMethod();

// All 33 fields we need to validate
const ALL_FIELDS = [
  // Basic (3)
  'school_name', 'nces_id', 'grades_served',
  // Location (7)  
  'address_street', 'address_city', 'address_state', 'address_zip', 'phone', 'website', 'setting',
  // Enrollment (3)
  'enrollment', 'student_teacher_ratio', 'full_time_teachers', 
  // Rankings (2)
  'national_rank', 'state_rank',
  // Academics (7)
  'ap_participation_rate', 'ap_pass_rate', 'math_proficiency', 'reading_proficiency', 'science_proficiency', 'graduation_rate', 'college_readiness_index',
  // Demographics (8) 
  'white_pct', 'asian_pct', 'hispanic_pct', 'black_pct', 'american_indian_pct', 'two_or_more_pct', 'female_pct', 'male_pct',
  // Socioeconomic (3)
  'economically_disadvantaged_pct', 'free_lunch_pct', 'reduced_lunch_pct'
] as const;

function determineSchoolType(schoolSlug: string, htmlContent: string): FieldValidationResult['schoolType'] {
  const lowerSlug = schoolSlug.toLowerCase();
  const lowerContent = htmlContent.toLowerCase();
  
  if (lowerSlug.includes('online') || lowerContent.includes('online high school') || lowerContent.includes('virtual')) {
    return 'online';
  }
  if (lowerSlug.includes('charter') || lowerContent.includes('charter school')) {
    return 'charter';
  }
  if (lowerSlug.includes('magnet') || lowerContent.includes('magnet school')) {
    return 'magnet';
  }
  return 'traditional';
}

function evaluateFieldSuccess(value: any, confidence: number, fieldName: string): boolean {
  // Field is successful if it has a meaningful value and reasonable confidence
  if (!value && confidence === 0) return false;
  
  // Different validation criteria based on field type
  if (fieldName.includes('_pct') || fieldName.includes('_rate')) {
    // Percentages should be 0-100
    return typeof value === 'number' && value >= 0 && value <= 100 && confidence > 50;
  }
  
  if (fieldName.includes('rank')) {
    // Rankings should be positive integers
    return typeof value === 'number' && value > 0 && confidence > 70;
  }
  
  if (fieldName === 'enrollment' || fieldName === 'full_time_teachers') {
    // Should be positive numbers
    return typeof value === 'number' && value > 0 && confidence > 50;
  }
  
  if (fieldName.includes('address') || fieldName === 'phone' || fieldName === 'website') {
    // Should be non-empty strings
    return typeof value === 'string' && value.length > 3 && confidence > 50;
  }
  
  // General success criteria
  return value !== null && value !== undefined && confidence > 30;
}

async function validateSchoolFields(htmlContent: string, schoolSlug: string, htmlPath: string): Promise<FieldValidationResult> {
  const startTime = Date.now();
  
  const mockContext: ExtractionContext = {
    bronzeRecord: {
      id: 1,
      school_slug: schoolSlug,
      file_path: htmlPath,
      capture_timestamp: new Date().toISOString(),
      file_size: htmlContent.length,
      checksum_sha256: 'validation',
      processing_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    schoolSlug,
    sourceYear: 2024,
    fileContent: htmlContent,
    domDocument: null
  };

  try {
    // Extract all fields using the full CSS extraction method
    const extractionResult = await globalExtractor.extract(htmlContent, mockContext);
    const extractionTimeMs = Date.now() - startTime;
    
    // Build field validation results
    const result: FieldValidationResult = {
      schoolSlug,
      schoolType: determineSchoolType(schoolSlug, htmlContent),
      extractionTimeMs,
      overallConfidence: extractionResult.confidence,
      fieldsExtracted: 0,
      fieldsSuccessful: 0,
    } as FieldValidationResult;
    
    // Validate each field
    for (const fieldName of ALL_FIELDS) {
      const value = (extractionResult.data as any)[fieldName];
      const confidence = (extractionResult.fieldConfidences as any)[fieldName] || 0;
      const success = evaluateFieldSuccess(value, confidence, fieldName);
      
      (result as any)[fieldName] = { value, confidence, success };
      
      result.fieldsExtracted++;
      if (success) {
        result.fieldsSuccessful++;
      }
    }
    
    return result;
    
  } catch (error) {
    // Return failure result
    const result: FieldValidationResult = {
      schoolSlug,
      schoolType: determineSchoolType(schoolSlug, htmlContent),
      extractionTimeMs: Date.now() - startTime,
      overallConfidence: 0,
      fieldsExtracted: 0,
      fieldsSuccessful: 0,
    } as FieldValidationResult;
    
    // Mark all fields as failed
    for (const fieldName of ALL_FIELDS) {
      (result as any)[fieldName] = { value: null, confidence: 0, success: false };
    }
    
    return result;
  }
}

async function runComprehensiveFieldValidation(): Promise<void> {
  console.log('🚨 CRITICAL: Comprehensive Field Validation - Crisis Assessment\n');
  console.log('Testing all 33 Silver layer fields on 100 diverse schools...');
  console.log('This will reveal how much of our extraction system actually works.\n');
  
  const dataDir = '/Volumes/OWC Express 1M2/USNEWS_2024';
  const results: FieldValidationResult[] = [];
  const targetSchools = 100;
  
  try {
    const allSchoolDirs = readdirSync(dataDir);
    
    // Sample from different sections for maximum diversity
    const sections = [
      allSchoolDirs.slice(0, 25),                               // First 25 (likely A-C schools)
      allSchoolDirs.slice(Math.floor(allSchoolDirs.length * 0.25), Math.floor(allSchoolDirs.length * 0.25) + 25), // 25% through
      allSchoolDirs.slice(Math.floor(allSchoolDirs.length * 0.5), Math.floor(allSchoolDirs.length * 0.5) + 25),   // 50% through  
      allSchoolDirs.slice(Math.floor(allSchoolDirs.length * 0.75), Math.floor(allSchoolDirs.length * 0.75) + 25), // 75% through
    ].flat();
    
    console.log(`Analyzing ${sections.length} schools from diverse dataset sections...`);
    console.log(`Dataset size: ${allSchoolDirs.length} total schools\n`);
    
    let processed = 0;
    
    for (const schoolDir of sections) {
      if (processed >= targetSchools) break;
      
      try {
        const schoolPath = join(dataDir, schoolDir);
        const files = readdirSync(schoolPath);
        const htmlFile = files.find(f => f.endsWith('.html'));
        
        if (!htmlFile) continue;
        
        const htmlPath = join(schoolPath, htmlFile);
        const content = readFileSync(htmlPath, 'utf-8');
        
        console.log(`[${processed + 1}/${targetSchools}] Validating: ${schoolDir}`);
        
        const schoolResult = await validateSchoolFields(content, schoolDir, htmlPath);
        results.push(schoolResult);
        
        // Log immediate results for critical fields
        const rankingWorking = schoolResult.national_rank.success || schoolResult.state_rank.success;
        const demographicsWorking = schoolResult.white_pct.success || schoolResult.black_pct.success || schoolResult.hispanic_pct.success;
        const academicsWorking = schoolResult.graduation_rate.success || schoolResult.ap_participation_rate.success;
        const locationWorking = schoolResult.address_city.success || schoolResult.address_state.success;
        
        console.log(`  Type: ${schoolResult.schoolType}, Time: ${schoolResult.extractionTimeMs}ms, Success: ${schoolResult.fieldsSuccessful}/33`);
        console.log(`  Rankings: ${rankingWorking ? '✅' : '❌'}, Demographics: ${demographicsWorking ? '✅' : '❌'}, Academics: ${academicsWorking ? '✅' : '❌'}, Location: ${locationWorking ? '✅' : '❌'}`);
        
        processed++;
        
        // Force garbage collection every 10 schools
        if (processed % 10 === 0 && global.gc) {
          global.gc();
        }
        
      } catch (error) {
        console.log(`  ❌ Error processing ${schoolDir}: ${error}`);
        continue;
      }
    }
    
  } catch (error) {
    console.error('❌ Error accessing data directory:', error);
    return;
  }
  
  if (results.length === 0) {
    console.error('❌ No schools processed successfully!');
    return;
  }
  
  // Generate comprehensive analysis
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE FIELD VALIDATION ANALYSIS');  
  console.log('='.repeat(80));
  
  const summary = generateValidationSummary(results);
  
  // Critical findings first
  console.log('\n🚨 CRITICAL FINDINGS:');
  console.log(`Schools analyzed: ${summary.totalSchools}`);
  console.log(`Total field extractions attempted: ${summary.performanceMetrics.totalFieldExtractions}`);
  console.log(`Successful field extractions: ${summary.performanceMetrics.successfulFieldExtractions}`);
  console.log(`Overall field success rate: ${summary.performanceMetrics.overallFieldSuccessRate.toFixed(1)}%`);
  
  if (summary.performanceMetrics.overallFieldSuccessRate < 50) {
    console.log('\n💥 PRODUCTION DISASTER CONFIRMED: <50% field success rate');
    console.log('Deploying to production would result in massive data corruption');
  }
  
  // Completely broken fields
  console.log(`\n❌ COMPLETELY BROKEN FIELDS (0% success rate): ${summary.criticalFindings.completelyBrokenFields.length}`);
  summary.criticalFindings.completelyBrokenFields.forEach(field => {
    console.log(`   ${field} - 0% success rate`);
  });
  
  // Low performing fields  
  console.log(`\n⚠️  LOW PERFORMING FIELDS (<30% success rate): ${summary.criticalFindings.lowPerformingFields.length}`);
  summary.criticalFindings.lowPerformingFields.forEach(field => {
    const fieldData = summary.fieldSuccessRates[field];
    console.log(`   ${field} - ${fieldData.successRate.toFixed(1)}% success rate (avg confidence: ${fieldData.avgConfidence.toFixed(0)}%)`);
  });
  
  // High performing fields
  console.log(`\n✅ HIGH PERFORMING FIELDS (>70% success rate): ${summary.criticalFindings.highPerformingFields.length}`);
  summary.criticalFindings.highPerformingFields.forEach(field => {
    const fieldData = summary.fieldSuccessRates[field];
    console.log(`   ${field} - ${fieldData.successRate.toFixed(1)}% success rate (avg confidence: ${fieldData.avgConfidence.toFixed(0)}%)`);
  });
  
  // Performance analysis
  console.log('\n⏱️  PERFORMANCE ANALYSIS:');
  console.log(`Average extraction time: ${summary.performanceMetrics.avgExtractionTimeMs.toFixed(0)}ms per school`);
  console.log(`Maximum extraction time: ${summary.performanceMetrics.maxExtractionTimeMs}ms per school`);
  console.log(`Average fields per school: ${summary.performanceMetrics.avgFieldsExtracted.toFixed(1)}/33`);
  console.log(`Average confidence: ${summary.performanceMetrics.avgOverallConfidence.toFixed(1)}%`);
  
  // Extrapolated production impact
  const productionSchools = 36538;
  const estimatedProductionTimeHours = (productionSchools * summary.performanceMetrics.avgExtractionTimeMs) / (1000 * 60 * 60);
  const estimatedSuccessfulRecords = productionSchools * (summary.performanceMetrics.overallFieldSuccessRate / 100);
  
  console.log('\n📈 PRODUCTION IMPACT PROJECTION:');
  console.log(`Estimated processing time for 36,538 schools: ${estimatedProductionTimeHours.toFixed(1)} hours`);
  console.log(`Estimated schools with usable data: ${estimatedSuccessfulRecords.toFixed(0)}/${productionSchools} (${(estimatedSuccessfulRecords/productionSchools*100).toFixed(1)}%)`);
  console.log(`Estimated corrupted/incomplete records: ${(productionSchools - estimatedSuccessfulRecords).toFixed(0)}`);
  
  // School type analysis
  console.log('\n🏫 SCHOOL TYPE BREAKDOWN:');
  Object.entries(summary.schoolTypes).forEach(([type, count]) => {
    const percentage = (count / summary.totalSchools * 100).toFixed(1);
    console.log(`   ${type}: ${count} schools (${percentage}%)`);
  });
  
  // Detailed field breakdown by category
  console.log('\n📋 FIELD SUCCESS RATES BY CATEGORY:');
  
  const categories = {
    'Basic Information': ['school_name', 'nces_id', 'grades_served'],
    'Location Data': ['address_street', 'address_city', 'address_state', 'address_zip', 'phone', 'website', 'setting'], 
    'Enrollment': ['enrollment', 'student_teacher_ratio', 'full_time_teachers'],
    'Rankings (VALIDATED)': ['national_rank', 'state_rank'],
    'Academic Performance': ['ap_participation_rate', 'ap_pass_rate', 'math_proficiency', 'reading_proficiency', 'science_proficiency', 'graduation_rate', 'college_readiness_index'],
    'Demographics': ['white_pct', 'asian_pct', 'hispanic_pct', 'black_pct', 'american_indian_pct', 'two_or_more_pct', 'female_pct', 'male_pct'],
    'Socioeconomic': ['economically_disadvantaged_pct', 'free_lunch_pct', 'reduced_lunch_pct']
  };
  
  Object.entries(categories).forEach(([category, fields]) => {
    const categorySuccessRates = fields.map(field => summary.fieldSuccessRates[field]?.successRate || 0);
    const avgSuccessRate = categorySuccessRates.reduce((a, b) => a + b, 0) / categorySuccessRates.length;
    const workingFields = categorySuccessRates.filter(rate => rate > 50).length;
    
    console.log(`\n   ${category}: ${avgSuccessRate.toFixed(1)}% avg success (${workingFields}/${fields.length} fields working)`);
    fields.forEach(field => {
      const fieldData = summary.fieldSuccessRates[field];
      if (fieldData) {
        const status = fieldData.successRate > 70 ? '✅' : fieldData.successRate > 30 ? '⚠️' : '❌';
        console.log(`     ${status} ${field}: ${fieldData.successRate.toFixed(1)}%`);
      }
    });
  });
  
  // Final recommendation
  console.log('\n' + '='.repeat(80));
  console.log('🎯 FINAL RECOMMENDATION:');
  
  if (summary.performanceMetrics.overallFieldSuccessRate < 30) {
    console.log('❌ DO NOT DEPLOY TO PRODUCTION - System is fundamentally broken');
    console.log('📋 Required actions before production:');
    console.log('   1. Fix CSS selectors for all broken fields using forensic analysis');
    console.log('   2. Validate fixes on 1000+ schools'); 
    console.log('   3. Achieve >80% success rate across all field categories');
    console.log('   4. Implement proper error handling and monitoring');
  } else if (summary.performanceMetrics.overallFieldSuccessRate < 70) {
    console.log('⚠️  DEPLOY ONLY WORKING FIELDS - Disable broken field extraction');
    console.log('📋 Recommended approach:');
    console.log('   1. Deploy only fields with >70% success rate');
    console.log('   2. Fix remaining fields in subsequent releases'); 
    console.log('   3. Add comprehensive monitoring for field success rates');
  } else {
    console.log('✅ CONDITIONAL PRODUCTION APPROVAL - With monitoring');
    console.log('📋 Required before production:'); 
    console.log('   1. Implement comprehensive field success monitoring');
    console.log('   2. Add automatic rollback for field success rate drops');
    console.log('   3. Start with 1% traffic and monitor carefully');
  }
  
  console.log('\n📊 Field validation complete. Results saved for analysis.');
}

function generateValidationSummary(results: FieldValidationResult[]): ValidationSummary {
  const summary: ValidationSummary = {
    totalSchools: results.length,
    schoolTypes: {},
    fieldSuccessRates: {},
    performanceMetrics: {
      avgExtractionTimeMs: 0,
      maxExtractionTimeMs: 0,
      avgFieldsExtracted: 0,
      avgOverallConfidence: 0,
      totalFieldExtractions: 0,
      successfulFieldExtractions: 0,
      overallFieldSuccessRate: 0,
    },
    criticalFindings: {
      completelyBrokenFields: [],
      lowPerformingFields: [],
      highPerformingFields: [],
      schoolTypeIssues: {},
    }
  };
  
  // Calculate school type distribution
  results.forEach(result => {
    summary.schoolTypes[result.schoolType] = (summary.schoolTypes[result.schoolType] || 0) + 1;
  });
  
  // Calculate field success rates
  const fieldTypes: Record<string, string> = {};
  
  // Define field categories
  ['school_name', 'nces_id', 'grades_served'].forEach(f => fieldTypes[f] = 'basic');
  ['address_street', 'address_city', 'address_state', 'address_zip', 'phone', 'website', 'setting'].forEach(f => fieldTypes[f] = 'location');
  ['enrollment', 'student_teacher_ratio', 'full_time_teachers'].forEach(f => fieldTypes[f] = 'enrollment');
  ['national_rank', 'state_rank'].forEach(f => fieldTypes[f] = 'rankings');
  ['ap_participation_rate', 'ap_pass_rate', 'math_proficiency', 'reading_proficiency', 'science_proficiency', 'graduation_rate', 'college_readiness_index'].forEach(f => fieldTypes[f] = 'academics');
  ['white_pct', 'asian_pct', 'hispanic_pct', 'black_pct', 'american_indian_pct', 'two_or_more_pct', 'female_pct', 'male_pct'].forEach(f => fieldTypes[f] = 'demographics');
  ['economically_disadvantaged_pct', 'free_lunch_pct', 'reduced_lunch_pct'].forEach(f => fieldTypes[f] = 'socioeconomic');
  
  for (const fieldName of ALL_FIELDS) {
    let successCount = 0;
    let totalConfidence = 0;
    let validValues: any[] = [];
    
    results.forEach(result => {
      const fieldResult = (result as any)[fieldName];
      if (fieldResult.success) {
        successCount++;
        validValues.push(fieldResult.value);
      }
      totalConfidence += fieldResult.confidence;
    });
    
    const successRate = (successCount / results.length) * 100;
    const avgConfidence = totalConfidence / results.length;
    
    // Calculate average value (for numeric fields)
    let avgValue: string | number = 'N/A';
    if (validValues.length > 0) {
      if (typeof validValues[0] === 'number') {
        avgValue = validValues.reduce((a, b) => a + b, 0) / validValues.length;
      } else {
        avgValue = `${validValues.length} valid values`;
      }
    }
    
    summary.fieldSuccessRates[fieldName] = {
      successCount,
      successRate,
      avgConfidence,
      avgValue,
      fieldType: fieldTypes[fieldName] as any
    };
    
    // Categorize fields by performance
    if (successRate === 0) {
      summary.criticalFindings.completelyBrokenFields.push(fieldName);
    } else if (successRate < 30) {
      summary.criticalFindings.lowPerformingFields.push(fieldName);
    } else if (successRate > 70) {
      summary.criticalFindings.highPerformingFields.push(fieldName);
    }
  }
  
  // Calculate performance metrics
  summary.performanceMetrics.avgExtractionTimeMs = results.reduce((sum, r) => sum + r.extractionTimeMs, 0) / results.length;
  summary.performanceMetrics.maxExtractionTimeMs = Math.max(...results.map(r => r.extractionTimeMs));
  summary.performanceMetrics.avgFieldsExtracted = results.reduce((sum, r) => sum + r.fieldsExtracted, 0) / results.length;
  summary.performanceMetrics.avgOverallConfidence = results.reduce((sum, r) => sum + r.overallConfidence, 0) / results.length;
  summary.performanceMetrics.totalFieldExtractions = results.reduce((sum, r) => sum + r.fieldsExtracted, 0);
  summary.performanceMetrics.successfulFieldExtractions = results.reduce((sum, r) => sum + r.fieldsSuccessful, 0);
  summary.performanceMetrics.overallFieldSuccessRate = (summary.performanceMetrics.successfulFieldExtractions / summary.performanceMetrics.totalFieldExtractions) * 100;
  
  return summary;
}

// Run the comprehensive validation
if (require.main === module) {
  runComprehensiveFieldValidation().catch(console.error);
}

export { runComprehensiveFieldValidation, FieldValidationResult, ValidationSummary };