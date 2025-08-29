#!/usr/bin/env tsx

/**
 * Find Ranking Context Elements
 * 
 * Look for HTML elements that contain the full ranking context
 * like "#7in National Rankings#1in South Carolina High Schools"
 */

import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

function findRankingContext() {
  console.log('🎯 Finding Full Ranking Context');
  console.log('=' .repeat(50));
  
  const academicMagnetPath = '/Volumes/OWC Express 1M2/USNEWS_2024/academic-magnet-high-school-17566/docker_curl_20250818_181230.html';
  const html = readFileSync(academicMagnetPath, 'utf-8');
  
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Look for elements containing the full ranking string we saw earlier
  const fullRankingPattern = /#\d+in\s*National\s*Rankings/i;
  
  const elementsWithNationalRanking = Array.from(document.querySelectorAll('*')).filter(el => {
    const text = el.textContent || '';
    return fullRankingPattern.test(text);
  });
  
  console.log(`\n🏆 Elements with "National Rankings" context:`);
  console.log(`Found: ${elementsWithNationalRanking.length} elements`);
  
  elementsWithNationalRanking.forEach((element, i) => {
    const tag = element.tagName.toLowerCase();
    const classes = element.className;
    const text = element.textContent?.trim();
    console.log(`\n[${i+1}] <${tag} class="${classes}">`);
    console.log(`Text: "${text}"`);
    
    // Test our extraction patterns on this text
    if (text) {
      const nationalMatch = text.match(/#(\d+)\s*(?:in\s*)?(?:National|national)\s*(?:Rankings?)?/i);
      const stateMatch = text.match(/#(\d+)\s*(?:in\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:High\s*Schools?)?/i);
      
      console.log(`National match: ${nationalMatch ? `✅ #${nationalMatch[1]}` : '❌ No match'}`);
      if (stateMatch) {
        const location = stateMatch[2].toLowerCase();
        console.log(`State match: ${!location.includes('national') ? `✅ #${stateMatch[1]} in ${stateMatch[2]}` : '❌ National context'}`);
      } else {
        console.log(`State match: ❌ No match`);
      }
    }
  });
  
  // Let's also look for elements that contain multiple rankings in one text
  const multiRankingPattern = /#\d+.*?#\d+/;
  const elementsWithMultipleRankings = Array.from(document.querySelectorAll('*')).filter(el => {
    const text = el.textContent || '';
    return multiRankingPattern.test(text) && text.includes('National') && text.includes('High School');
  });
  
  console.log(`\n📊 Elements with multiple rankings:`);
  console.log(`Found: ${elementsWithMultipleRankings.length} elements`);
  
  elementsWithMultipleRankings.forEach((element, i) => {
    const tag = element.tagName.toLowerCase();
    const classes = element.className;
    const text = element.textContent?.trim();
    console.log(`\n[${i+1}] <${tag} class="${classes}">`);
    console.log(`Text: "${text?.substring(0, 200)}..."`);
    
    // Extract all rankings from this element
    const rankingMatches = [...(text?.matchAll(/#(\d+)(?:in\s*([^#]+))?/gi) || [])];
    console.log(`Rankings found:`);
    rankingMatches.forEach((match, j) => {
      const rank = match[1];
      const context = match[2]?.trim() || 'No context';
      const isNational = context.toLowerCase().includes('national');
      const isState = context.toLowerCase().includes('high school') && !context.toLowerCase().includes('national');
      console.log(`  [${j+1}] #${rank} - ${context} ${isNational ? '(NATIONAL)' : isState ? '(STATE)' : ''}`);
    });
  });
  
  console.log(`\n💡 Strategy:`);
  console.log(`1. Find elements containing full ranking context`);
  console.log(`2. Parse multiple rankings from single element`);
  console.log(`3. Identify national vs state by context keywords`);
  console.log(`4. Update CSS selectors to target these container elements`);
}

findRankingContext();