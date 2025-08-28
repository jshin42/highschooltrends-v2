#!/usr/bin/env tsx

/**
 * Debug Step by Step Extraction
 * 
 * Run through the exact extraction steps to see where it's failing
 */

import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

// Copy the exact CSS extraction logic here to debug
class DebugCSSExtractionMethod {
  private static readonly SELECTORS = {
    national_rank: [
      '#rankings_section',                      // Rankings section container (contains full context)
      '.RankingList__RankStyled-sc-7e61t7-1',  // US News ranking elements
      '.with-icon__Rank-sc-1spb2w-2',         // Alternative ranking display
      'react-trigger',                          // Combined ranking element (fallback)
    ],
  };

  private extractNationalRank(document: Document): {
    value: number | null;
    confidence: number;
    error?: string;
    debug: string[];
  } {
    const debug: string[] = [];
    
    for (const selector of DebugCSSExtractionMethod.SELECTORS.national_rank) {
      debug.push(`\n🔍 Trying selector: ${selector}`);
      
      try {
        const elements = document.querySelectorAll(selector);
        debug.push(`   Found ${elements.length} elements`);
        
        for (const element of elements) {
          const text = element.textContent?.trim();
          debug.push(`   Testing element with text: "${text?.substring(0, 100)}..."`);
          
          if (!text) {
            debug.push(`   ❌ No text content, skipping`);
            continue;
          }
          
          // Handle complex ranking strings like "#7in National Rankings"
          const nationalRankMatch = text.match(/#(\d+)\s*(?:in\s*)?(?:National|national)\s*(?:Rankings?)?/i);
          if (nationalRankMatch) {
            debug.push(`   ✅ Complex national pattern matched: "${nationalRankMatch[0]}"`);
            const rank = parseInt(nationalRankMatch[1]);
            if (rank >= 1 && rank <= 50000) {
              debug.push(`   ✅ Rank ${rank} is valid, returning with 95% confidence`);
              return { value: rank, confidence: 95, debug };
            } else {
              debug.push(`   ❌ Rank ${rank} is outside valid range (1-50000)`);
            }
          } else {
            debug.push(`   ❌ Complex national pattern did not match`);
          }
          
          // Handle simple "#7" format if it's the first/primary ranking
          if (text.match(/^#\d+$/)) {
            debug.push(`   ✅ Simple pattern matches: "${text}"`);
            const rank = this.parseRank(text, 'national_rank');
            debug.push(`   parseRank result: value=${rank.value}, confidence=${rank.confidence}`);
            if (rank.value && rank.value >= 1 && rank.value <= 50000) {
              debug.push(`   ✅ Returning rank ${rank.value} with 90% confidence`);
              return { value: rank.value, confidence: 90, debug };
            } else {
              debug.push(`   ❌ parseRank failed or invalid value`);
            }
          } else {
            debug.push(`   ❌ Simple pattern does not match`);
          }
          
          // Fallback to general rank parsing
          debug.push(`   🔄 Trying fallback rank parsing...`);
          const rank = this.parseRank(text, 'national_rank');
          debug.push(`   Fallback parseRank result: value=${rank.value}, confidence=${rank.confidence}`);
          if (rank.value && rank.value >= 1 && rank.value <= 50000) {
            debug.push(`   ✅ Fallback successful: rank ${rank.value} with 85% confidence`);
            return { value: rank.value, confidence: 85, debug };
          } else {
            debug.push(`   ❌ Fallback failed`);
          }
        }
      } catch (error) {
        debug.push(`   ❌ Error with selector: ${error}`);
        continue;
      }
    }
    
    debug.push(`\n❌ All selectors exhausted, no national rank found`);
    return {
      value: null,
      confidence: 0,
      error: 'No national rank found with CSS selectors',
      debug
    };
  }

  private parseRank(text: string | null, fieldName: string): {
    value: number | null;
    confidence: number;
    debug?: string[];
  } {
    const debug: string[] = [];
    debug.push(`   parseRank called with: "${text}"`);
    
    if (!text) {
      debug.push(`   ❌ No text provided`);
      return { value: null, confidence: 0, debug };
    }

    // Remove commas from numbers like "1,234"
    const cleanText = text.replace(/,/g, '');
    debug.push(`   Clean text: "${cleanText}"`);

    // Extract ranking number
    const rankMatch = cleanText.match(/(?:rank|#)\s*(\d{1,5})/i);
    debug.push(`   Rank pattern test: ${rankMatch ? `Found "${rankMatch[0]}" -> ${rankMatch[1]}` : 'No match'}`);
    
    if (rankMatch) {
      const rank = parseInt(rankMatch[1], 10);
      debug.push(`   Parsed rank: ${rank}`);
      if (rank > 0 && rank <= 50000) {
        debug.push(`   ✅ Valid rank, returning with 90% confidence`);
        return {
          value: rank,
          confidence: 90,
          debug
        };
      } else {
        debug.push(`   ❌ Rank ${rank} outside valid range (1-50000)`);
      }
    }

    debug.push(`   ❌ parseRank failed`);
    return {
      value: null,
      confidence: 0,
      debug
    };
  }
}

function debugStepByStep() {
  console.log('🔧 Debug Step by Step Extraction');
  console.log('=' .repeat(60));
  
  const academicMagnetPath = '/Volumes/OWC Express 1M2/USNEWS_2024/academic-magnet-high-school-17566/docker_curl_20250818_181230.html';
  const html = readFileSync(academicMagnetPath, 'utf-8');
  
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const debugExtractor = new DebugCSSExtractionMethod();
  const result = debugExtractor['extractNationalRank'](document);
  
  console.log('Debug log:');
  result.debug.forEach(line => console.log(line));
  
  console.log('\n🎯 Final Result:');
  console.log(`Value: ${result.value}`);
  console.log(`Confidence: ${result.confidence}`);
  if (result.error) {
    console.log(`Error: ${result.error}`);
  }
  
  if (result.value) {
    console.log('\n🎉 SUCCESS: National ranking extraction working!');
  } else {
    console.log('\n❌ FAILURE: National ranking extraction still not working');
  }
}

debugStepByStep();