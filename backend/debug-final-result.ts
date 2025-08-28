/**
 * Debug the final result object to see where data is getting lost
 */

import { readFileSync } from 'fs';
import { CSSExtractionMethod } from './src/silver/css-extraction-method';
import { ExtractionContext } from './src/silver/types';

async function debugFinalResult(): Promise<void> {
  console.log('🔍 Debugging Final Result Object\n');
  
  const htmlPath = '/Volumes/OWC Express 1M2/USNEWS_2025/william-fremd-high-school-6921/docker_curl_20250821_061341.html';
  
  try {
    const htmlContent = readFileSync(htmlPath, 'utf-8');
    
    const mockContext: ExtractionContext = {
      bronzeRecord: {
        id: 1,
        school_slug: 'william-fremd-high-school-6921',
        file_path: htmlPath,
        capture_timestamp: new Date().toISOString(),
        file_size: htmlContent.length,
        checksum_sha256: 'test',
        processing_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      schoolSlug: 'william-fremd-high-school-6921',
      sourceYear: 2025,
      fileContent: htmlContent,
      domDocument: null
    };

    const extractor = new CSSExtractionMethod();
    const result = await extractor.extract(htmlContent, mockContext);
    
    console.log('📊 FINAL EXTRACTION RESULT ANALYSIS:');
    console.log(`Overall Confidence: ${result.confidence.toFixed(1)}%`);
    console.log(`Errors: ${result.errors.length}\n`);
    
    console.log('🎯 ALL EXTRACTED DATA FIELDS:');
    const dataFields = Object.keys(result.data).sort();
    dataFields.forEach(field => {
      const value = (result.data as any)[field];
      console.log(`   ${field}: ${JSON.stringify(value)}`);
    });
    
    console.log('\n📋 FIELD CONFIDENCES:');
    const confidenceFields = Object.keys(result.fieldConfidences).sort();
    confidenceFields.forEach(field => {
      const confidence = (result.fieldConfidences as any)[field];
      console.log(`   ${field}: ${confidence}%`);
    });
    
    console.log('\n🔍 SPECIFIC FIELDS WE CARE ABOUT:');
    const targetFields = [
      'school_name',
      'grades_served', 
      'address_street',
      'address_city',
      'address_state',
      'address_zip',
      'phone',
      'website',
      'setting',
      'enrollment',
      'student_teacher_ratio',
      'full_time_teachers',
      'national_rank',
      'state_rank',
      'ap_participation_rate',
      'ap_pass_rate',
      'math_proficiency',
      'reading_proficiency',
      'science_proficiency',
      'graduation_rate'
    ];
    
    let foundFields = 0;
    let totalFields = targetFields.length;
    
    targetFields.forEach(field => {
      const value = (result.data as any)[field];
      const hasValue = value !== null && value !== undefined;
      const status = hasValue ? '✅' : '❌';
      
      if (hasValue) foundFields++;
      
      console.log(`   ${status} ${field}: ${JSON.stringify(value)}`);
    });
    
    console.log(`\n📈 FINAL SUMMARY:`);
    console.log(`Fields found: ${foundFields}/${totalFields} (${(foundFields/totalFields*100).toFixed(1)}%)`);
    
    if (foundFields < totalFields * 0.7) {
      console.log('\n🚨 ISSUE: Many fields missing from final result despite individual methods working');
      console.log('This indicates a problem in the result compilation pipeline');
    } else {
      console.log('\n✅ GOOD: Most fields are present in final result');
      console.log('The issue might be in the test expectations or field confidence categorization');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

if (require.main === module) {
  debugFinalResult().catch(console.error);
}

export { debugFinalResult };