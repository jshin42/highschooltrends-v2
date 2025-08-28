/**
 * Debug the specific extraction methods that are returning undefined
 */

import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { CSSExtractionMethod } from './src/silver/css-extraction-method';

async function debugMissingMethods(): Promise<void> {
  console.log('🔍 Debugging Missing/Broken Extraction Methods\n');
  
  const htmlPath = '/Volumes/OWC Express 1M2/USNEWS_2025/william-fremd-high-school-6921/docker_curl_20250821_061341.html';
  
  try {
    const htmlContent = readFileSync(htmlPath, 'utf-8');
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    
    // Create an instance to access private methods
    const extractor = new CSSExtractionMethod();
    const extractorProto = Object.getPrototypeOf(extractor);
    
    console.log('🧪 TESTING METHODS THAT RETURN UNDEFINED:');
    
    // Test grades_served (which we know works from individual debug)
    console.log('\n1. extractGrades:');
    try {
      const result = extractorProto.extractGrades.call(extractor, document);
      console.log(`   Result: ${JSON.stringify(result)}`);
    } catch (error) {
      console.log(`   Error: ${error}`);
    }
    
    // Test setting extraction (expected: "Large Suburb")
    console.log('\n2. extractSetting:');
    try {
      const result = extractorProto.extractSetting.call(extractor, document);
      console.log(`   Result: ${JSON.stringify(result)}`);
      console.log(`   Expected: "Large Suburb"`);
    } catch (error) {
      console.log(`   Error: ${error}`);
    }
    
    // Test student-teacher ratio (expected: "16:1")
    console.log('\n3. extractStudentTeacherRatio:');
    try {
      const result = extractorProto.extractStudentTeacherRatio.call(extractor, document);
      console.log(`   Result: ${JSON.stringify(result)}`);
      console.log(`   Expected: "16:1"`);
    } catch (error) {
      console.log(`   Error: ${error}`);
    }
    
    // Test full time teachers (expected: 163)
    console.log('\n4. extractFullTimeTeachers:');
    try {
      const result = extractorProto.extractFullTimeTeachers.call(extractor, document);
      console.log(`   Result: ${JSON.stringify(result)}`);
      console.log(`   Expected: 163`);
    } catch (error) {
      console.log(`   Error: ${error}`);
    }
    
    // Test website (expected: "http://adc.d211.org/Domain/9")
    console.log('\n5. extractWebsite:');
    try {
      const result = extractorProto.extractWebsite.call(extractor, document);
      console.log(`   Result: ${JSON.stringify(result)}`);
      console.log(`   Expected: "http://adc.d211.org/Domain/9"`);
    } catch (error) {
      console.log(`   Error: ${error}`);
    }
    
    // Test AP pass rate (which showed undefined in main test)
    console.log('\n6. extractApPassRate:');
    try {
      const result = extractorProto.extractApPassRate.call(extractor, document);
      console.log(`   Result: ${JSON.stringify(result)}`);
      console.log(`   Expected: 56`);
    } catch (error) {
      console.log(`   Error: ${error}`);
    }
    
    // Test direct selector access to confirm data is there
    console.log('\n🎯 VERIFYING DATA IS AVAILABLE VIA SELECTORS:');
    
    const testData = [
      { field: 'setting', selector: '[data-test-id="ulocal"]' },
      { field: 'student_teacher_ratio', selector: '[data-test-id="student_teacher_ratio_rounded"]' },
      { field: 'full_time_teachers', selector: '[data-test-id="fte"]' },
      { field: 'ap_pass_rate', selector: '[data-test-id="participant_passing_rate"]' }
    ];
    
    for (const { field, selector } of testData) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim() || '';
        console.log(`   ✅ ${field}: "${text}" available via ${selector}`);
      } else {
        console.log(`   ❌ ${field}: No data found via ${selector}`);
      }
    }
    
    // Test JSON-LD for website
    console.log('\n🏗️ TESTING JSON-LD FOR WEBSITE:');
    const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
    if (jsonLdScript) {
      try {
        const jsonData = JSON.parse(jsonLdScript.textContent || '{}');
        console.log(`   Website in JSON-LD: ${jsonData.url || 'NOT FOUND'}`);
        console.log(`   Expected: http://adc.d211.org/Domain/9`);
      } catch (error) {
        console.log(`   JSON-LD parse error: ${error}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

if (require.main === module) {
  debugMissingMethods().catch(console.error);
}

export { debugMissingMethods };