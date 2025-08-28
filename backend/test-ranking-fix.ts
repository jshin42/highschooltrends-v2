#!/usr/bin/env tsx

/**
 * Test the Fixed Ranking Extraction
 * 
 * Validate that our updated CSS selectors and parsing logic correctly
 * extract national and state rankings from Academic Magnet High School.
 */

import { readFileSync } from 'fs';
import { CSSExtractionMethod } from './src/silver/css-extraction-method';
import { ExtractionContext } from './src/silver/types';

async function testRankingFix() {
  console.log('🔧 Testing Fixed Ranking Extraction');
  console.log('=' .repeat(50));
  
  const extractor = new CSSExtractionMethod();
  
  const academicMagnetPath = '/Volumes/OWC Express 1M2/USNEWS_2024/academic-magnet-high-school-17566/docker_curl_20250818_181230.html';
  
  try {
    const html = readFileSync(academicMagnetPath, 'utf-8');
    
    const mockContext: ExtractionContext = {
      bronzeRecord: {
        id: 999,
        school_slug: 'academic-magnet-high-school-17566',
        file_path: academicMagnetPath,
        capture_timestamp: '2024-01-01T00:00:00Z',
        file_size: html.length,
        checksum_sha256: 'test',
        processing_status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      schoolSlug: 'academic-magnet-high-school-17566',
      sourceYear: 2024,
      fileContent: html,
      domDocument: null
    };
    
    console.log('🏫 School: Academic Magnet High School (SC)');
    console.log('📄 File: academic-magnet-high-school-17566');
    
    const result = await extractor.extract(html, mockContext);
    
    console.log('\n📊 Extraction Results:');
    console.log('-'.repeat(30));
    console.log(`School Name: ${result.data.school_name || 'NOT EXTRACTED'}`);
    console.log(`National Rank: ${result.data.national_rank || 'NOT EXTRACTED'}`);
    console.log(`State Rank: ${result.data.state_rank || 'NOT EXTRACTED'}`);
    console.log(`Location: ${result.data.address_city || 'N/A'}, ${result.data.address_state || 'N/A'}`);
    console.log(`Overall Confidence: ${result.confidence.toFixed(1)}%`);
    
    console.log('\n🔍 Field Confidences:');
    console.log(`- School Name: ${result.fieldConfidences.school_name || 0}%`);
    console.log(`- Rankings: ${result.fieldConfidences.rankings || 0}%`);
    console.log(`- Location: ${result.fieldConfidences.location || 0}%`);
    
    if (result.errors.length > 0) {
      console.log('\n⚠️  Extraction Errors:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.field_name}: ${error.error_message}`);
      });
    }
    
    console.log('\n🎯 Test Results:');
    
    // Expected results for Academic Magnet High School
    const expectedNationalRank = 7;  // We saw #7 in National Rankings
    const expectedStateRank = 1;     // We saw #1 in South Carolina High Schools
    
    let testsPass = 0;
    let totalTests = 0;
    
    // Test 1: National Rank
    totalTests++;
    if (result.data.national_rank === expectedNationalRank) {
      console.log('✅ National Rank: PASSED (extracted #7)');
      testsPass++;
    } else {
      console.log(`❌ National Rank: FAILED (expected #${expectedNationalRank}, got ${result.data.national_rank || 'null'})`);
    }
    
    // Test 2: State Rank  
    totalTests++;
    if (result.data.state_rank === expectedStateRank) {
      console.log('✅ State Rank: PASSED (extracted #1)');
      testsPass++;
    } else {
      console.log(`❌ State Rank: FAILED (expected #${expectedStateRank}, got ${result.data.state_rank || 'null'})`);
    }
    
    // Test 3: School Name
    totalTests++;
    if (result.data.school_name && result.data.school_name.includes('Academic Magnet')) {
      console.log('✅ School Name: PASSED');
      testsPass++;
    } else {
      console.log(`❌ School Name: FAILED (got "${result.data.school_name || 'null'}")`);
    }
    
    // Test 4: Overall Confidence
    totalTests++;
    if (result.confidence > 80) {
      console.log('✅ Confidence: PASSED (>80%)');
      testsPass++;
    } else {
      console.log(`❌ Confidence: FAILED (${result.confidence}% <= 80%)`);
    }
    
    console.log(`\n📈 Summary: ${testsPass}/${totalTests} tests passed`);
    
    if (testsPass === totalTests) {
      console.log('\n🎉 RANKING BUG FIX: SUCCESS!');
      console.log('✅ National rankings are now being extracted correctly');
      console.log('✅ State rankings continue to work correctly');
      console.log('✅ Ready to run full validation tests');
    } else {
      console.log('\n⚠️  RANKING FIX: PARTIAL SUCCESS');
      console.log('Some issues remain - may need further refinement');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRankingFix().catch(console.error);