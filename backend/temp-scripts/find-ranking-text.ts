#!/usr/bin/env tsx

/**
 * Find Ranking Text Patterns in Full HTML
 * 
 * Look beyond JSON-LD description to find where US News stores ranking data
 */

import { readFileSync } from 'fs';

function findRankingPatterns(html: string, schoolName: string) {
  console.log(`\n🔍 Analyzing ${schoolName}`);
  console.log('='.repeat(60));
  
  // 1. Check all JSON-LD scripts (there might be multiple)
  const jsonLdMatches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/gi)];
  console.log(`Found ${jsonLdMatches.length} JSON-LD scripts`);
  
  jsonLdMatches.forEach((match, index) => {
    try {
      const data = JSON.parse(match[1]);
      console.log(`\nJSON-LD Script ${index + 1}:`);
      console.log(`  @type: ${data['@type']}`);
      if (data.description) {
        console.log(`  Description: "${data.description.substring(0, 200)}..."`);
        
        // Look for ranking in this description
        const rankingTerms = ['ranked', 'rank', '#', 'nationally', 'nation', 'best'];
        const foundTerms = rankingTerms.filter(term => 
          data.description.toLowerCase().includes(term)
        );
        if (foundTerms.length > 0) {
          console.log(`  Ranking terms: ${foundTerms.join(', ')}`);
        }
      }
    } catch (e) {
      console.log(`  JSON-LD Script ${index + 1}: Parse error`);
    }
  });
  
  // 2. Look for ranking data in HTML content
  const rankingPatterns = [
    /#\d+\s*(?:in|nationally|best)/i,
    /ranked\s+#?\d+/i,
    /\d+(?:st|nd|rd|th)?\s*(?:best|ranked).*?(?:nationally|nation|country)/i,
    /nationally\s*ranked\s*#?\d+/i,
    /top\s+\d+.*?nationally/i
  ];
  
  console.log(`\n📄 HTML Content Search:`);
  rankingPatterns.forEach((pattern, index) => {
    const matches = [...html.matchAll(new RegExp(pattern.source, 'gi'))];
    if (matches.length > 0) {
      console.log(`  Pattern ${index + 1}: ${matches.length} matches`);
      matches.slice(0, 3).forEach(match => {
        console.log(`    "${match[0]}"`);
      });
    }
  });
  
  // 3. Look for specific data-testid or class names for rankings
  const rankingSelectors = [
    /data-testid="[^"]*rank[^"]*"/gi,
    /class="[^"]*rank[^"]*"/gi,
    /id="[^"]*rank[^"]*"/gi
  ];
  
  console.log(`\n🏷️  HTML Attributes Search:`);
  rankingSelectors.forEach((pattern, index) => {
    const matches = [...html.matchAll(pattern)];
    if (matches.length > 0) {
      console.log(`  Selector ${index + 1}: ${matches.length} matches`);
      matches.slice(0, 5).forEach(match => {
        console.log(`    ${match[0]}`);
      });
    }
  });
  
  // 4. Search for specific ranking text near numbers
  const numberNearRanking = /(\d+)(?:st|nd|rd|th)?\s*(?:\.|\s)+.{0,50}(?:ranked|rank|best|top|nationally)/gi;
  const matches = [...html.matchAll(numberNearRanking)];
  if (matches.length > 0) {
    console.log(`\n🔢 Numbers Near Ranking Terms:`);
    matches.slice(0, 5).forEach(match => {
      console.log(`    "${match[0].trim()}"`);
    });
  }
  
  // 5. Look for the exact text patterns that might contain "National" or "US"
  const nationalPatterns = [
    /[^.]{0,100}(?:national|nationally|US|United States|country)[^.]{0,100}/gi,
    /[^.]{0,100}(?:#\d+|ranked \d+|top \d+)[^.]{0,100}/gi
  ];
  
  console.log(`\n🇺🇸 National/Ranking Context:`);
  nationalPatterns.forEach((pattern, index) => {
    const matches = [...html.matchAll(pattern)];
    if (matches.length > 0) {
      console.log(`  Context Pattern ${index + 1}: ${Math.min(matches.length, 3)} examples`);
      matches.slice(0, 3).forEach(match => {
        console.log(`    "${match[0].trim()}"`);
      });
    }
  });
}

async function analyzeBothSchools() {
  console.log('🎯 FINDING RANKING TEXT PATTERNS IN FULL HTML');
  
  const schools = [
    {
      name: 'Academic Magnet High School (SC)',
      path: '/Volumes/OWC Express 1M2/USNEWS_2024/academic-magnet-high-school-17566/docker_curl_20250818_181230.html'
    },
    {
      name: 'Madison Academic Magnet High School (TN)', 
      path: '/Volumes/OWC Express 1M2/USNEWS_2024/madison-academic-magnet-high-school-18065/docker_curl_20250818_181230.html'
    }
  ];
  
  for (const school of schools) {
    try {
      const html = readFileSync(school.path, 'utf-8');
      findRankingPatterns(html, school.name);
    } catch (error) {
      console.error(`Failed to analyze ${school.name}:`, error);
    }
  }
  
  console.log(`\n\n💡 HYPOTHESIS:`);
  console.log(`The JSON-LD description field is truncated by US News and doesn't`);
  console.log(`contain complete ranking information. We need to look for ranking`);
  console.log(`data in other parts of the HTML structure.`);
}

analyzeBothSchools().catch(console.error);