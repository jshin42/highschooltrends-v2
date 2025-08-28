#!/usr/bin/env tsx

/**
 * Debug Extraction Flow
 * 
 * Debug the exact flow of ranking extraction to see where it's failing
 */

import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

function debugExtractionFlow() {
  console.log('🔍 Debug Extraction Flow');
  console.log('=' .repeat(50));
  
  const academicMagnetPath = '/Volumes/OWC Express 1M2/USNEWS_2024/academic-magnet-high-school-17566/docker_curl_20250818_181230.html';
  const html = readFileSync(academicMagnetPath, 'utf-8');
  
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Test the exact selectors from our CSS extraction method
  const nationalRankSelectors = [
    'react-trigger',                          // Combined ranking element (highest priority)
    '#rankings_section',                      // Rankings section container
    '.RankingList__RankStyled-sc-7e61t7-1',  // US News ranking elements
    '.with-icon__Rank-sc-1spb2w-2',         // Alternative ranking display
  ];
  
  console.log('\n📊 Testing National Rank Selectors:');
  nationalRankSelectors.forEach((selector, index) => {
    console.log(`\n${index + 1}. Testing selector: ${selector}`);
    
    try {
      const elements = document.querySelectorAll(selector);
      console.log(`   Found: ${elements.length} elements`);
      
      if (elements.length > 0) {
        Array.from(elements).slice(0, 3).forEach((element, i) => {
          const text = element.textContent?.trim() || '';
          console.log(`   [${i+1}] Text length: ${text.length} chars`);
          console.log(`   [${i+1}] Sample: "${text.substring(0, 150)}..."`);
          
          // Test our national ranking regex patterns on this text
          if (text) {
            console.log(`\n   🧪 Testing regex patterns on element ${i+1}:`);
            
            // Pattern 1: Complex ranking strings like "#7in National Rankings"
            const nationalRankMatch = text.match(/#(\d+)\s*(?:in\s*)?(?:National|national)\s*(?:Rankings?)?/i);
            if (nationalRankMatch) {
              const rank = parseInt(nationalRankMatch[1]);
              console.log(`      ✅ Complex national pattern: Found rank ${rank}`);
            } else {
              console.log(`      ❌ Complex national pattern: No match`);
            }
            
            // Pattern 2: Simple "#7" format if it's the first/primary ranking
            const simpleMatch = text.match(/^#\d+$/);
            if (simpleMatch) {
              console.log(`      ✅ Simple pattern: Matches "${simpleMatch[0]}"`);
            } else {
              console.log(`      ❌ Simple pattern: No match`);
            }
            
            // Pattern 3: Look for any # followed by digits
            const anyNumberMatch = text.match(/#(\d+)/g);
            if (anyNumberMatch) {
              console.log(`      ✅ Any number pattern: Found ${anyNumberMatch.length} matches: ${anyNumberMatch.slice(0, 5).join(', ')}`);
            } else {
              console.log(`      ❌ Any number pattern: No match`);
            }
          }
        });
        
        // Test extraction logic specifically for the first element
        if (elements.length > 0) {
          const firstElement = elements[0];
          const text = firstElement.textContent?.trim();
          
          console.log(`\n   🎯 Focused extraction on first element:`);
          if (text) {
            // Test our exact extraction logic
            const nationalRankMatch = text.match(/#(\d+)\s*(?:in\s*)?(?:National|national)\s*(?:Rankings?)?/i);
            if (nationalRankMatch) {
              const rank = parseInt(nationalRankMatch[1]);
              if (rank >= 1 && rank <= 50000) {
                console.log(`      ✅ WOULD EXTRACT: National rank ${rank} with 95% confidence`);
              } else {
                console.log(`      ❌ WOULD REJECT: Rank ${rank} outside valid range (1-50000)`);
              }
            } else {
              console.log(`      ❌ NO NATIONAL MATCH: Checking simple pattern...`);
              
              if (text.match(/^#\d+$/)) {
                console.log(`      ✅ SIMPLE MATCH: Would try parseRank on "${text}"`);
                
                // Simulate parseRank logic
                const cleanText = text.replace(/,/g, '');
                const rankMatch = cleanText.match(/(?:rank|#)\s*(\d{1,5})/i);
                if (rankMatch) {
                  const rank = parseInt(rankMatch[1], 10);
                  if (rank > 0 && rank <= 50000) {
                    console.log(`      ✅ WOULD EXTRACT: ${rank} via parseRank with 90% confidence`);
                  }
                }
              } else {
                console.log(`      ❌ NO SIMPLE MATCH: Cannot extract from this element`);
              }
            }
          }
        }
        
      } else {
        console.log(`   No elements found for selector: ${selector}`);
      }
      
    } catch (error) {
      console.log(`   Error testing selector: ${error}`);
    }
  });
  
  console.log(`\n\n🔬 Root Cause Analysis:`);
  console.log(`If elements are found but extraction fails, possible issues:`);
  console.log(`1. Regex patterns not matching the text format`);
  console.log(`2. Rank validation rejecting valid values`);
  console.log(`3. Logic flow not reaching the right conditions`);
  console.log(`4. Multiple elements causing selection of wrong element`);
}

debugExtractionFlow();