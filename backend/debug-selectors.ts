/**
 * Debug specific selector issues with the gold standard data
 */

import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

async function debugSelectors(): Promise<void> {
  console.log('🔍 Debugging Specific Selector Issues\n');
  
  const htmlPath = '/Volumes/OWC Express 1M2/USNEWS_2025/william-fremd-high-school-6921/docker_curl_20250821_061341.html';
  
  try {
    const htmlContent = readFileSync(htmlPath, 'utf-8');
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    
    console.log('1. 📚 DEBUGGING ACADEMIC DATA-TEST-ID SELECTORS:');
    const academicSelectors = [
      { field: 'ap_pass_rate', selector: '[data-test-id="participant_passing_rate"]', expected: 56 },
      { field: 'math_proficiency', selector: '[data-test-id="school_percent_proficient_in_math"]', expected: 64 },
      { field: 'reading_proficiency', selector: '[data-test-id="school_percent_proficient_in_english"]', expected: 63 },
      { field: 'science_proficiency', selector: '[data-test-id="school_percent_proficient_in_science"]', expected: 77 },
      { field: 'graduation_rate', selector: '[data-test-id="gradrate"]', expected: 94 }
    ];
    
    for (const { field, selector, expected } of academicSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim() || '';
        const value = parseInt(text.replace('%', ''));
        console.log(`  ✅ ${field}: Found "${text}" (parsed: ${value}, expected: ${expected})`);
      } else {
        console.log(`  ❌ ${field}: Selector "${selector}" not found`);
      }
    }
    
    console.log('\n2. 📍 DEBUGGING STATE RANK SELECTOR:');
    const stateRankSelectors = [
      'a[href*="/illinois/rankings"] .with-icon__Rank-sc-1spb2w-2',
      'a[href*="illinois"] .with-icon__Rank-sc-1spb2w-2', 
      '.with-icon__Rank-sc-1spb2w-2'
    ];
    
    for (const selector of stateRankSelectors) {
      const elements = document.querySelectorAll(selector);
      console.log(`  Selector: "${selector}" - Found ${elements.length} elements`);
      elements.forEach((el, i) => {
        const text = el.textContent?.trim() || '';
        const parent = el.parentElement?.textContent?.trim() || '';
        console.log(`    [${i}]: "${text}" (parent context: "${parent.substring(0, 100)}...")`);
      });
    }
    
    console.log('\n3. 📝 DEBUGGING GRADES SERVED REGEX:');
    const bodyText = document.body?.textContent || '';
    const gradesPatterns = [
      /(?:grades?|serving)\s*(?:levels?)?\s*:?\s*((\d+)(?:\s*-\s*\d+)?)/i,
      /grades?\s*served[^0-9]*(\d+\s*-\s*\d+)/i,
      /serving\s*grades[^0-9]*(\d+\s*-\s*\d+)/i,
      /\b(9\s*-\s*12)\b/i,
      /\bgrade\b[^0-9]*(\d+\s*-\s*\d+)/i
    ];
    
    for (let i = 0; i < gradesPatterns.length; i++) {
      const pattern = gradesPatterns[i];
      const match = bodyText.match(pattern);
      if (match) {
        console.log(`  ✅ Pattern ${i + 1}: Found "${match[1] || match[0]}"`)
        console.log(`    Full match: "${match[0]}"`);
        break;
      } else {
        console.log(`  ❌ Pattern ${i + 1}: No match`);
      }
    }
    
    // Look for "9-12" literally in the text
    if (bodyText.includes('9-12')) {
      console.log('  ✅ Found "9-12" literally in body text');
      const context = bodyText.substring(bodyText.indexOf('9-12') - 50, bodyText.indexOf('9-12') + 50);
      console.log(`    Context: "${context}"`);
    }
    
    console.log('\n4. 🔍 SEARCH FOR ALL DATA-TEST-ID ATTRIBUTES:');
    const allDataTestIds = Array.from(document.querySelectorAll('[data-test-id]'));
    console.log(`  Found ${allDataTestIds.length} elements with data-test-id attributes:`);
    
    const uniqueIds = new Set(allDataTestIds.map(el => el.getAttribute('data-test-id')));
    Array.from(uniqueIds).sort().forEach(id => {
      const elements = document.querySelectorAll(`[data-test-id="${id}"]`);
      if (elements.length > 0) {
        const sample = elements[0].textContent?.trim().substring(0, 50) || '';
        console.log(`    ${id}: "${sample}${sample.length >= 50 ? '...' : ''}"`);
      }
    });
    
    console.log('\n5. 🔍 SEARCH FOR PERCENTAGE VALUES IN HTML:');
    const percentageMatches = htmlContent.match(/\b\d{1,3}%/g);
    if (percentageMatches) {
      const uniquePercentages = Array.from(new Set(percentageMatches)).sort((a, b) => parseInt(a) - parseInt(b));
      console.log(`  Found percentages: ${uniquePercentages.join(', ')}`);
      
      // Look for our expected values specifically
      const expectedValues = [56, 62, 63, 64, 77, 94];
      expectedValues.forEach(val => {
        if (htmlContent.includes(`${val}%`)) {
          const regex = new RegExp(`.{0,100}${val}%.{0,100}`, 'g');
          const contexts = htmlContent.match(regex);
          if (contexts) {
            console.log(`  📍 ${val}%: Found in ${contexts.length} places`);
            contexts.slice(0, 2).forEach(context => {
              console.log(`    Context: "${context.replace(/\s+/g, ' ').trim()}"`);
            });
          }
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

if (require.main === module) {
  debugSelectors().catch(console.error);
}

export { debugSelectors };