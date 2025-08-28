#!/usr/bin/env tsx

/**
 * Test the fixed extraction method on Academic Magnet High School
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { CSSExtractionMethod } from './src/silver/css-extraction-method';
import { ExtractionContext } from './src/silver/types';

async function testFixedExtraction() {
  console.log('🧪 Testing Fixed Extraction Method');
  console.log('=' .repeat(50));
  
  const schoolPath = '/Volumes/OWC Express 1M2/USNEWS_2024/academic-magnet-high-school-17566';
  
  try {
    const files = readdirSync(schoolPath);
    const htmlFile = files.find(f => f.endsWith('.html'));
    
    if (!htmlFile) {
      console.log('❌ No HTML file found');
      return;
    }
    
    const htmlPath = join(schoolPath, htmlFile);
    const html = readFileSync(htmlPath, 'utf-8');
    
    // Create extraction context
    const mockContext: ExtractionContext = {
      bronzeRecord: {
        id: 999,
        school_slug: 'academic-magnet-high-school-17566',
        file_path: htmlPath,
        capture_timestamp: new Date().toISOString(),
        file_size: html.length,
        checksum_sha256: 'test',
        processing_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      schoolSlug: 'academic-magnet-high-school-17566',
      sourceYear: 2024,
      fileContent: html,
      domDocument: null
    };
    
    // Test extraction
    const extractor = new CSSExtractionMethod();
    const result = await extractor.extract(html, mockContext);
    
    console.log(`\n🏫 School: ${result.data.school_name}`);
    console.log(`📊 Overall Confidence: ${result.confidence.toFixed(1)}%`);
    console.log(`🏆 National Rank: ${result.data.national_rank || 'NOT FOUND'}`);
    console.log(`🗺️  State Rank: ${result.data.state_rank || 'NOT FOUND'}`);
    console.log(`📍 State: ${result.data.address_state || 'NOT FOUND'}`);
    
    // Test expectations
    const expectedNationalRank = 7;
    const expectedStateRank = 1;
    
    console.log(`\n🎯 Test Results:`);
    if (result.data.national_rank === expectedNationalRank) {
      console.log(`✅ National rank: PASS (Expected: ${expectedNationalRank}, Got: ${result.data.national_rank})`);
    } else {
      console.log(`❌ National rank: FAIL (Expected: ${expectedNationalRank}, Got: ${result.data.national_rank})`);
    }
    
    if (result.data.state_rank === expectedStateRank) {
      console.log(`✅ State rank: PASS (Expected: ${expectedStateRank}, Got: ${result.data.state_rank})`);
    } else {
      console.log(`❌ State rank: FAIL (Expected: ${expectedStateRank}, Got: ${result.data.state_rank})`);
    }
    
    // Show ranking bucket classification
    const nationalRank = result.data.national_rank;
    let bucket = 'No bucket';
    
    if (nationalRank) {
      if (nationalRank >= 1 && nationalRank <= 13426) {
        bucket = 'Bucket 1 (Exact National Rankings)';
      } else if (nationalRank >= 13427 && nationalRank <= 17901) {
        bucket = 'Bucket 2 (Range National Rankings)';
      } else {
        bucket = 'Bucket 3 (State/ML Rankings)';
      }
    } else if (result.data.state_rank) {
      bucket = 'Bucket 3 (State-only Rankings)';
    }
    
    console.log(`📊 Ranking Bucket: ${bucket}`);
    
    if (result.data.national_rank === expectedNationalRank && result.data.state_rank === expectedStateRank) {
      console.log('\n🎉 SUCCESS: All rankings extracted correctly!');
      console.log('The fix has resolved the national ranking extraction issue.');
    } else {
      console.log('\n❌ PARTIAL SUCCESS: Some issues remain');
      console.log('Additional debugging may be needed.');
    }
    
    // Show confidence breakdown
    if (result.fieldConfidences.rankings) {
      console.log(`\n📈 Rankings confidence: ${result.fieldConfidences.rankings}%`);
    }
    
    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${result.errors.length}`);
      result.errors.slice(0, 3).forEach((error, i) => {
        console.log(`   ${i+1}. ${error.type}: ${error.message}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFixedExtraction().catch(console.error);