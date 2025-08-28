/**
 * Debug individual field extraction to understand where the pipeline is failing
 */

import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { CSSExtractionMethod } from './src/silver/css-extraction-method';

async function debugIndividualFields(): Promise<void> {
  console.log('🔍 Debugging Individual Field Extraction\n');
  
  const htmlPath = '/Volumes/OWC Express 1M2/USNEWS_2025/william-fremd-high-school-6921/docker_curl_20250821_061341.html';
  
  try {
    const htmlContent = readFileSync(htmlPath, 'utf-8');
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    
    // Create an instance to access private methods via reflection
    const extractor = new CSSExtractionMethod();
    const extractorProto = Object.getPrototypeOf(extractor);
    
    console.log('1. 🧪 TESTING INDIVIDUAL EXTRACTION METHODS:');
    
    // Test grades extraction
    console.log('\n📝 Testing grades extraction:');
    try {
      const gradesResult = extractorProto.extractGrades.call(extractor, document);
      console.log(`  Result: ${JSON.stringify(gradesResult)}`);
    } catch (error) {
      console.log(`  Error: ${error}`);
    }
    
    // Test AP pass rate extraction
    console.log('\n📊 Testing AP pass rate extraction:');
    try {
      const apResult = extractorProto.extractApPassRate.call(extractor, document);
      console.log(`  Result: ${JSON.stringify(apResult)}`);
    } catch (error) {
      console.log(`  Error: ${error}`);
    }
    
    // Test enrollment extraction
    console.log('\n👥 Testing enrollment extraction:');
    try {
      const enrollmentResult = extractorProto.extractEnrollment.call(extractor, document);
      console.log(`  Result: ${JSON.stringify(enrollmentResult)}`);
    } catch (error) {
      console.log(`  Error: ${error}`);
    }
    
    // Test direct selector approach
    console.log('\n2. 🎯 TESTING DIRECT SELECTOR ACCESS:');
    
    const testSelectors = [
      { field: 'grades_served', selector: '[data-test-id="g_grades_served"]' },
      { field: 'ap_pass_rate', selector: '[data-test-id="participant_passing_rate"]' },
      { field: 'enrollment', selector: '[data-test-id="ccd_member"]' },
      { field: 'student_teacher_ratio', selector: '[data-test-id="student_teacher_ratio_rounded"]' },
      { field: 'setting', selector: '[data-test-id="ulocal"]' }
    ];
    
    for (const { field, selector } of testSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim() || '';
        console.log(`  ✅ ${field}: "${text}" via ${selector}`);
      } else {
        console.log(`  ❌ ${field}: No element found for ${selector}`);
      }
    }
    
    console.log('\n3. 🔧 TESTING PERCENTAGE PARSING:');
    
    // Test the parsePercentage method directly
    const percentageTests = ['56%', '62%', '64%', '77%', '94%'];
    for (const testValue of percentageTests) {
      try {
        const parseResult = extractorProto.parsePercentage.call(extractor, testValue, 'test_field');
        console.log(`  "${testValue}" -> ${JSON.stringify(parseResult)}`);
      } catch (error) {
        console.log(`  "${testValue}" -> Error: ${error}`);
      }
    }
    
    console.log('\n4. 🎯 TESTING extractPercentageField METHOD:');
    
    // Test the extractPercentageField method directly with known working selectors
    const academicSelectors = [
      '[data-test-id="participant_passing_rate"]',
      '[data-test-id="school_percent_proficient_in_math"]',
      '[data-test-id="gradrate"]'
    ];
    
    try {
      const percentageResult = extractorProto.extractPercentageField.call(
        extractor, 
        document, 
        academicSelectors, 
        'test_academic_field'
      );
      console.log(`  extractPercentageField result: ${JSON.stringify(percentageResult)}`);
    } catch (error) {
      console.log(`  extractPercentageField error: ${error}`);
    }
    
    console.log('\n5. 🏗️ TESTING JSON-LD EXTRACTION:');
    
    // Test JSON-LD structured data extraction
    try {
      const structuredDataResult = extractorProto.extractStructuredData.call(extractor, document);
      if (structuredDataResult) {
        console.log('  ✅ JSON-LD structured data found:');
        console.log(`    School name: ${structuredDataResult.name}`);
        console.log(`    Address: ${JSON.stringify(structuredDataResult.location?.address, null, 2)}`);
        console.log(`    Phone: ${structuredDataResult.telephone}`);
      } else {
        console.log('  ❌ No JSON-LD structured data found');
      }
    } catch (error) {
      console.log(`  JSON-LD error: ${error}`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

if (require.main === module) {
  debugIndividualFields().catch(console.error);
}

export { debugIndividualFields };