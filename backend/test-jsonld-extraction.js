#!/usr/bin/env node

/**
 * Test JSON-LD extraction with real US News data
 */

const fs = require('fs');
const { CSSExtractionMethod } = require('./dist/silver/css-extraction-method');

async function testExtractionWithRealData() {
  console.log('🧪 Testing JSON-LD extraction with A. C. Flora High School data...\n');
  
  try {
    // Read the actual HTML file
    const htmlPath = '/Volumes/OWC Express 1M2/USNEWS_2024/a-c-flora-high-school-17702/docker_curl_20250818_191635.html';
    const html = fs.readFileSync(htmlPath, 'utf-8');
    
    console.log(`📄 Loaded HTML file: ${html.length} characters`);
    
    // Create mock context
    const mockContext = {
      bronzeRecord: { id: 17702 },
      schoolSlug: 'a-c-flora-high-school-17702',
      sourceYear: 2024,
      fileContent: html,
      domDocument: null
    };
    
    // Test extraction
    const extractor = new CSSExtractionMethod();
    const result = await extractor.extract(html, mockContext);
    
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
    
    console.log('\n📊 Field Confidences:');
    Object.entries(result.fieldConfidences).forEach(([field, confidence]) => {
      console.log(`   ${field}: ${confidence}%`);
    });
    
    console.log(`\n⚠️  Errors: ${result.errors.length}`);
    if (result.errors.length > 0) {
      result.errors.forEach(error => {
        console.log(`   - ${error.field_name}: ${error.error_message}`);
      });
    }
    
    // Validate against known gold standard
    console.log('\n✅ Validation Against Known Data:');
    console.log('=====================================');
    console.log(`School name: ${result.data.school_name === 'A. C. Flora High School' ? '✅' : '❌'} Expected: "A. C. Flora High School"`);
    console.log(`State rank: ${result.data.state_rank === 16 ? '✅' : '❌'} Expected: 16`);
    console.log(`Phone: ${result.data.phone === '(803) 738-7300' ? '✅' : '❌'} Expected: "(803) 738-7300"`);
    console.log(`AP participation: ${result.data.ap_participation_rate === 53 ? '✅' : '❌'} Expected: 53%`);
    console.log(`White percentage: ${result.data.white_pct === 47 ? '✅' : '❌'} Expected: 47% (100% - 53% minority)`);
    console.log(`Econ disadvantaged: ${result.data.economically_disadvantaged_pct === 100 ? '✅' : '❌'} Expected: 100%`);
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }
}

testExtractionWithRealData();