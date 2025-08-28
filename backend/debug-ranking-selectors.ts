#!/usr/bin/env tsx

/**
 * Debug Ranking Selectors
 * 
 * Check what elements are being found by our CSS selectors
 */

import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

function debugRankingSelectors() {
  console.log('🔍 Debug Ranking CSS Selectors');
  console.log('=' .repeat(50));
  
  const academicMagnetPath = '/Volumes/OWC Express 1M2/USNEWS_2024/academic-magnet-high-school-17566/docker_curl_20250818_181230.html';
  const html = readFileSync(academicMagnetPath, 'utf-8');
  
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Test the exact selectors from our CSS extraction method
  const nationalRankSelectors = [
    '.RankingList__RankStyled-sc-7e61t7-1',  // US News ranking elements
    '.with-icon__Rank-sc-1spb2w-2',         // Alternative ranking display
    '[data-testid="national-ranking"]',       // Legacy fallback
    '.national-rank .rank-number',            // Legacy fallback
    '.ranking-badge-national',                // Legacy fallback  
    '.rank-display.national'                  // Legacy fallback
  ];
  
  console.log('\n📊 Testing National Rank Selectors:');
  nationalRankSelectors.forEach((selector, index) => {
    const elements = document.querySelectorAll(selector);
    console.log(`\n${index + 1}. ${selector}`);
    console.log(`   Found: ${elements.length} elements`);
    
    if (elements.length > 0) {
      Array.from(elements).slice(0, 5).forEach((element, i) => {
        const text = element.textContent?.trim() || '';
        console.log(`   [${i+1}] "${text}"`);
        
        // Test our regex patterns on this text
        if (text) {
          const nationalRankMatch = text.match(/#(\d+)\s*(?:in\s*)?(?:National|national)\s*(?:Rankings?)?/i);
          const simpleMatch = text.match(/^#\d+$/);
          
          console.log(`       National regex: ${nationalRankMatch ? `✅ Found #${nationalRankMatch[1]}` : '❌ No match'}`);
          console.log(`       Simple regex: ${simpleMatch ? '✅ Matches' : '❌ No match'}`);
        }
      });
    }
  });
  
  console.log('\n📊 Testing State Rank Selectors:');
  const stateRankSelectors = [
    '.RankingList__RankStyled-sc-7e61t7-1',  // Same elements contain both national and state
    '.with-icon__Rank-sc-1spb2w-2',         // Alternative ranking display
  ];
  
  stateRankSelectors.forEach((selector, index) => {
    const elements = document.querySelectorAll(selector);
    console.log(`\n${index + 1}. ${selector}`);
    console.log(`   Found: ${elements.length} elements`);
    
    if (elements.length > 0) {
      Array.from(elements).slice(0, 5).forEach((element, i) => {
        const text = element.textContent?.trim() || '';
        console.log(`   [${i+1}] "${text}"`);
        
        // Test our state ranking regex
        if (text) {
          const stateRankMatch = text.match(/#(\d+)\s*(?:in\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:High\s*Schools?)?/i);
          
          if (stateRankMatch) {
            const rank = parseInt(stateRankMatch[1]);
            const location = stateRankMatch[2].toLowerCase();
            console.log(`       State regex: ✅ Found #${rank} in "${stateRankMatch[2]}" (national check: ${location.includes('national')})`);
          } else {
            console.log(`       State regex: ❌ No match`);
          }
        }
      });
    }
  });
  
  console.log('\n🔍 Manual Search for Ranking Text:');
  // Search the entire document for "#7" to see where it appears
  const allText = document.body.textContent || '';
  const sevenMatches = [...allText.matchAll(/#7/g)];
  console.log(`Found ${sevenMatches.length} instances of "#7" in the document`);
  
  // Find elements containing #7
  const elementsWithSeven = Array.from(document.querySelectorAll('*')).filter(el => 
    el.textContent?.includes('#7') && el.children.length === 0 // leaf nodes only
  );
  
  console.log(`\nElements containing "#7":`);
  elementsWithSeven.forEach((element, i) => {
    if (i < 10) { // Limit to first 10
      const tag = element.tagName.toLowerCase();
      const classes = element.className;
      const text = element.textContent?.trim();
      console.log(`  [${i+1}] <${tag} class="${classes}">"${text}"</>`);
    }
  });
}

debugRankingSelectors();