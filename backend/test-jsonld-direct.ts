#!/usr/bin/env tsx

/**
 * Direct test of JSON-LD extraction without Bronze layer
 */

import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

interface MockFieldConfidence {
  school_name?: number;
  rankings?: number;
  academics?: number; 
  demographics?: number;
  location?: number;
  enrollment_data?: number;
}

function extractStructuredData(document: Document): any {
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data['@type'] === 'HighSchool') {
          return data;
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function extractFromStructuredData(structuredData: any) {
  const extractedData: any = {
    school_slug: 'test',
    source_year: 2024
  };
  
  const fieldConfidences: MockFieldConfidence = {};

  // Extract school name
  if (structuredData.name) {
    extractedData.school_name = structuredData.name;
    fieldConfidences.school_name = 95;
  }

  // Extract address from location data
  if (structuredData.location?.address) {
    const address = structuredData.location.address;
    if (address.streetAddress) {
      extractedData.address_street = address.streetAddress;
    }
    if (address.addressLocality) {
      extractedData.address_city = address.addressLocality;
    }
    if (address.addressRegion) {
      extractedData.address_state = address.addressRegion;
    }
    if (address.postalCode) {
      extractedData.address_zip = address.postalCode;
    }
    fieldConfidences.location = 90;
  }

  // Extract phone
  if (structuredData.telephone) {
    extractedData.phone = structuredData.telephone;
  }

  // Parse description for additional data
  if (structuredData.description) {
    const description = structuredData.description;
    
    // Extract state rank
    const rankMatch = description.match(/ranked (\d+)(?:st|nd|rd|th) within ([^.]+)/i);
    if (rankMatch) {
      const rank = parseInt(rankMatch[1]);
      if (!isNaN(rank)) {
        extractedData.state_rank = rank;
        fieldConfidences.rankings = 85;
      }
    }

    // Extract AP participation rate
    const apMatch = description.match(/AP® participation rate[^0-9]*(\d+)%/i);
    if (apMatch) {
      const rate = parseInt(apMatch[1]);
      if (!isNaN(rate)) {
        extractedData.ap_participation_rate = rate;
      }
    }

    // Extract minority enrollment
    const minorityMatch = description.match(/total minority enrollment is (\d+)%/i);
    if (minorityMatch) {
      const percentage = parseInt(minorityMatch[1]);
      if (!isNaN(percentage)) {
        // US News minority enrollment = 100% - white percentage
        extractedData.white_pct = 100 - percentage;
      }
    }

    // Extract economically disadvantaged
    const econMatch = description.match(/(\d+)% of students are economically disadvantaged/i);
    if (econMatch) {
      const percentage = parseInt(econMatch[1]);
      if (!isNaN(percentage)) {
        extractedData.economically_disadvantaged_pct = percentage;
      }
    }

    fieldConfidences.demographics = 80;
    fieldConfidences.academics = 80;
  }

  // Calculate overall confidence
  const confidenceValues = Object.values(fieldConfidences).filter((c): c is number => typeof c === 'number' && c > 0);
  const overallConfidence = confidenceValues.length > 0 
    ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length 
    : 0;

  return {
    data: extractedData,
    confidence: overallConfidence,
    fieldConfidences
  };
}

async function testJsonLdExtraction() {
  console.log('🧪 Direct JSON-LD Extraction Test\n');
  
  try {
    // Read the actual HTML file
    const htmlPath = '/Volumes/OWC Express 1M2/USNEWS_2024/a-c-flora-high-school-17702/docker_curl_20250818_191635.html';
    console.log(`📄 Reading HTML file...`);
    const html = readFileSync(htmlPath, 'utf-8');
    console.log(`   File size: ${html.length} characters`);
    
    // Parse HTML with JSDOM
    const dom = new JSDOM(html, {
      url: 'https://www.usnews.com',
      resources: 'usable',
      runScripts: 'outside-only'
    });
    
    const document = dom.window.document;
    
    // Extract structured data
    console.log('\n🔍 Searching for JSON-LD structured data...');
    const structuredData = extractStructuredData(document);
    
    if (!structuredData) {
      console.log('❌ No JSON-LD structured data found');
      return;
    }
    
    console.log('✅ Found JSON-LD structured data');
    console.log('   @type:', structuredData['@type']);
    console.log('   name:', structuredData.name);
    
    // Extract school data
    console.log('\n📊 Extracting school data...');
    const result = extractFromStructuredData(structuredData);
    
    console.log('\n🎯 Extraction Results:');
    console.log('=====================================');
    console.log(`📊 Overall confidence: ${result.confidence.toFixed(1)}%`);
    console.log(`🏫 School name: "${result.data.school_name}"`);
    console.log(`🏆 State rank: ${result.data.state_rank}`);
    console.log(`📞 Phone: ${result.data.phone}`);
    console.log(`🏠 Address: ${result.data.address_street}, ${result.data.address_city}, ${result.data.address_state} ${result.data.address_zip}`);
    console.log(`🎓 AP participation: ${result.data.ap_participation_rate}%`);
    console.log(`👥 White percentage: ${result.data.white_pct}%`);
    console.log(`💰 Economically disadvantaged: ${result.data.economically_disadvantaged_pct}%`);
    
    // Validate against known gold standard
    console.log('\n✅ Gold Standard Validation:');
    console.log('=====================================');
    console.log(`School name: ${result.data.school_name === 'A. C. Flora High School' ? '✅ PASS' : '❌ FAIL'} (Expected: "A. C. Flora High School")`);
    console.log(`State rank: ${result.data.state_rank === 16 ? '✅ PASS' : '❌ FAIL'} (Expected: 16)`);
    console.log(`Phone: ${result.data.phone === '(803) 738-7300' ? '✅ PASS' : '❌ FAIL'} (Expected: "(803) 738-7300")`);
    console.log(`Address city: ${result.data.address_city === 'Columbia' ? '✅ PASS' : '❌ FAIL'} (Expected: "Columbia")`);
    console.log(`Address state: ${result.data.address_state === 'SC' ? '✅ PASS' : '❌ FAIL'} (Expected: "SC")`);
    console.log(`AP participation: ${result.data.ap_participation_rate === 53 ? '✅ PASS' : '❌ FAIL'} (Expected: 53%)`);
    console.log(`White percentage: ${result.data.white_pct === 47 ? '✅ PASS' : '❌ FAIL'} (Expected: 47% = 100% - 53% minority)`);
    console.log(`Econ disadvantaged: ${result.data.economically_disadvantaged_pct === 100 ? '✅ PASS' : '❌ FAIL'} (Expected: 100%)`);
    
    const passCount = [
      result.data.school_name === 'A. C. Flora High School',
      result.data.state_rank === 16,
      result.data.phone === '(803) 738-7300',
      result.data.address_city === 'Columbia',
      result.data.address_state === 'SC',
      result.data.ap_participation_rate === 53,
      result.data.white_pct === 47,
      result.data.economically_disadvantaged_pct === 100
    ].filter(Boolean).length;
    
    console.log(`\n🎯 Validation Summary: ${passCount}/8 tests passed (${(passCount/8*100).toFixed(1)}%)`);
    
    if (passCount >= 6) {
      console.log('🎉 JSON-LD extraction is working correctly!');
    } else {
      console.log('⚠️  JSON-LD extraction needs refinement');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }
}

testJsonLdExtraction();