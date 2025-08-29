#!/usr/bin/env tsx

/**
 * Extract Ranking HTML Content
 * 
 * Find the actual ranking data in HTML elements around ranking CSS classes
 */

import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

function extractRankingData(html: string, schoolName: string) {
  console.log(`\n🏫 ${schoolName}`);
  console.log('='.repeat(60));
  
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // 1. Look for elements with ranking-related classes
  const rankingSelectors = [
    '.Rankings__Description-sc-1sk5etp-0',
    '.RankingList__RankStyled-sc-7e61t7-1', 
    '.with-icon__Rank-sc-1spb2w-2',
    '[class*="rank" i]',
    '[class*="Rank" i]'
  ];
  
  console.log(`📊 Ranking Elements:`);
  rankingSelectors.forEach((selector, index) => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`\n  ${selector} (${elements.length} elements):`);
      Array.from(elements).slice(0, 5).forEach((element, i) => {
        const text = element.textContent?.trim() || '';
        if (text && text.length > 0 && text.length < 200) {
          console.log(`    [${i+1}] "${text}"`);
        }
      });
    }
  });
  
  // 2. Look for data-testid attributes that might contain rankings
  const testIdElements = document.querySelectorAll('[data-testid*="rank" i]');
  if (testIdElements.length > 0) {
    console.log(`\n🏷️  Data-testid ranking elements (${testIdElements.length}):`);
    Array.from(testIdElements).forEach((element, i) => {
      const testId = element.getAttribute('data-testid');
      const text = element.textContent?.trim() || '';
      console.log(`    [${i+1}] data-testid="${testId}": "${text}"`);
    });
  }
  
  // 3. Search for numbers that look like rankings
  const allText = document.body.textContent || '';
  const rankingNumberPatterns = [
    /#(\d+)/g,
    /ranked (\d+)/gi,
    /(\d+)(?:st|nd|rd|th) in/gi,
    /top (\d+)/gi
  ];
  
  console.log(`\n🔢 Ranking Number Patterns:`);
  rankingNumberPatterns.forEach((pattern, index) => {
    const matches = [...allText.matchAll(pattern)];
    if (matches.length > 0) {
      console.log(`  Pattern ${index + 1}: ${Math.min(matches.length, 5)} matches`);
      matches.slice(0, 5).forEach(match => {
        // Get some context around the match
        const start = Math.max(0, match.index! - 30);
        const end = Math.min(allText.length, match.index! + match[0].length + 30);
        const context = allText.substring(start, end).replace(/\s+/g, ' ').trim();
        console.log(`    "${context}"`);
      });
    }
  });
  
  // 4. Look for specific text that contains "National" or similar
  const nationalPatterns = [
    /national[^.]{0,100}/gi,
    /nationally[^.]{0,100}/gi,
    /best high school[^.]{0,100}/gi,
    /us news[^.]{0,100}/gi
  ];
  
  console.log(`\n🇺🇸 National Context:`);
  nationalPatterns.forEach((pattern, index) => {
    const matches = [...allText.matchAll(pattern)];
    if (matches.length > 0) {
      console.log(`  Pattern ${index + 1}: ${Math.min(matches.length, 3)} matches`);
      matches.slice(0, 3).forEach(match => {
        console.log(`    "${match[0].trim()}"`);
      });
    }
  });
  
  // 5. Look for breadcrumbs or page title that might have ranking info
  const titleElement = document.querySelector('title');
  const h1Element = document.querySelector('h1');
  
  console.log(`\n📄 Page Title/Header:`);
  if (titleElement) {
    console.log(`  Title: "${titleElement.textContent}"`);
  }
  if (h1Element) {
    console.log(`  H1: "${h1Element.textContent}"`);
  }
  
  // 6. Look for any elements containing numbers between 1-20000 (typical ranking range)
  const numberMatches = allText.match(/\b(\d{1,5})\b/g);
  if (numberMatches) {
    const potentialRanks = numberMatches
      .map(n => parseInt(n))
      .filter(n => n >= 1 && n <= 20000)
      .filter((n, i, arr) => arr.indexOf(n) === i) // unique
      .sort((a, b) => a - b);
    
    console.log(`\n🎯 Potential Ranking Numbers (1-20,000):`);
    console.log(`  Found: ${potentialRanks.slice(0, 20).join(', ')}${potentialRanks.length > 20 ? '...' : ''}`);
  }
}

async function analyzeAcademicMagnet() {
  try {
    const html = readFileSync('/Volumes/OWC Express 1M2/USNEWS_2024/academic-magnet-high-school-17566/docker_curl_20250818_181230.html', 'utf-8');
    extractRankingData(html, 'Academic Magnet High School (SC)');
    
    console.log(`\n\n💡 NEXT STEPS:`);
    console.log(`1. Identify which HTML elements contain the actual ranking numbers`);
    console.log(`2. Update CSS extraction method to target these elements`);
    console.log(`3. Test against broader sample to confirm fix works`);
    
  } catch (error) {
    console.error('Failed to analyze:', error);
  }
}

analyzeAcademicMagnet().catch(console.error);