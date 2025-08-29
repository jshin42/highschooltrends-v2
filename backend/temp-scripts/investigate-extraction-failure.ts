#!/usr/bin/env tsx

/**
 * Investigate Extraction Failure
 * 
 * Deep dive into the school that failed extraction to understand why
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

function extractJSONLD(html: string): any {
  try {
    const scripts = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/gi);
    
    for (const match of scripts) {
      try {
        const data = JSON.parse(match[1]);
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

function searchForRankingText(html: string): {
  found: string[];
  contexts: string[];
} {
  const found: string[] = [];
  const contexts: string[] = [];
  
  const patterns = [
    /#\d+/g,
    /rank(?:ed|ing|s)?\s*#?\d+/gi,
    /national.*rank/gi,
    /state.*rank/gi,
    /\d+(?:st|nd|rd|th)\s+(?:in|out\s+of)/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = [...html.matchAll(pattern)];
    matches.forEach(match => {
      if (match.index) {
        found.push(match[0]);
        const start = Math.max(0, match.index - 50);
        const end = Math.min(html.length, match.index + match[0].length + 50);
        contexts.push(html.substring(start, end).replace(/\s+/g, ' ').trim());
      }
    });
  });
  
  return { found, contexts };
}

async function investigateExtractionFailure() {
  console.log('🔍 Investigating Extraction Failure');
  console.log('=' .repeat(60));
  
  const failedSchool = '21st-century-learning-academy-kiowa-county-153399';
  const schoolDir = join('/Volumes/OWC Express 1M2/USNEWS_2024', failedSchool);
  
  if (!existsSync(schoolDir)) {
    console.log('❌ Failed school directory not found');
    return;
  }
  
  try {
    const files = readdirSync(schoolDir);
    console.log(`\n📁 Files in directory: ${files.join(', ')}`);
    
    const htmlFile = files.find(f => f.endsWith('.html'));
    if (!htmlFile) {
      console.log('❌ No HTML file found');
      return;
    }
    
    const htmlPath = join(schoolDir, htmlFile);
    const html = readFileSync(htmlPath, 'utf-8');
    
    console.log(`\n📄 HTML File: ${htmlFile}`);
    console.log(`📊 File size: ${html.length.toLocaleString()} characters`);
    
    // Check for JSON-LD
    const jsonLD = extractJSONLD(html);
    if (jsonLD) {
      console.log(`\n✅ JSON-LD found:`);
      console.log(`   School name: ${jsonLD.name || 'NOT FOUND'}`);
      console.log(`   Type: ${jsonLD['@type']}`);
      if (jsonLD.description) {
        console.log(`   Description: "${jsonLD.description.substring(0, 200)}..."`);
      } else {
        console.log(`   Description: NOT FOUND`);
      }
      if (jsonLD.location?.address) {
        const addr = jsonLD.location.address;
        console.log(`   Address: ${addr.streetAddress || 'N/A'}, ${addr.addressLocality || 'N/A'}, ${addr.addressRegion || 'N/A'}`);
      }
    } else {
      console.log(`\n❌ No JSON-LD found`);
    }
    
    // Search for ranking text
    console.log(`\n🔍 Searching for ranking text...`);
    const { found, contexts } = searchForRankingText(html);
    
    if (found.length > 0) {
      console.log(`\n✅ Found ${found.length} potential ranking matches:`);
      found.slice(0, 10).forEach((match, i) => {
        console.log(`   ${i + 1}. "${match}"`);
        if (contexts[i]) {
          console.log(`      Context: "...${contexts[i]}..."`);
        }
      });
      if (found.length > 10) {
        console.log(`   ... and ${found.length - 10} more matches`);
      }
    } else {
      console.log(`\n❌ No ranking text patterns found`);
    }
    
    // Look for specific US News selectors
    console.log(`\n🎯 Checking CSS selectors...`);
    const selectorsToCheck = [
      '#rankings_section',
      '.RankingList__RankStyled-sc-7e61t7-1',
      '.with-icon__Rank-sc-1spb2w-2',
      'react-trigger'
    ];
    
    // Use basic string search since we don't have DOM parsing here
    selectorsToCheck.forEach(selector => {
      const cleanSelector = selector.replace(/[#.]/, '');
      if (html.includes(cleanSelector)) {
        console.log(`   ✅ ${selector}: Found in HTML`);
        
        // Find context around this selector
        const index = html.indexOf(cleanSelector);
        if (index !== -1) {
          const start = Math.max(0, index - 100);
          const end = Math.min(html.length, index + cleanSelector.length + 100);
          const context = html.substring(start, end).replace(/\s+/g, ' ').trim();
          console.log(`      Context: "...${context}..."`);
        }
      } else {
        console.log(`   ❌ ${selector}: Not found in HTML`);
      }
    });
    
    // Check for error messages or special states
    console.log(`\n⚠️  Checking for error indicators...`);
    const errorPatterns = [
      'not found',
      'error',
      '404',
      'page not available',
      'access denied',
      'private school',
      'charter school',
      'no data available'
    ];
    
    errorPatterns.forEach(pattern => {
      const regex = new RegExp(pattern, 'gi');
      const matches = html.match(regex);
      if (matches) {
        console.log(`   ⚠️  "${pattern}": ${matches.length} matches`);
      }
    });
    
    // Look for title and meta information
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      console.log(`\n📋 Page title: "${titleMatch[1]}"`);
    }
    
    // Look for school type indicators
    const schoolTypePatterns = [
      'online school',
      'virtual school',
      'charter school',
      'private school',
      'religious school',
      'alternative school'
    ];
    
    console.log(`\n🏫 School type analysis:`);
    schoolTypePatterns.forEach(type => {
      if (html.toLowerCase().includes(type)) {
        console.log(`   ✅ Contains "${type}"`);
      }
    });
    
    console.log(`\n🎯 Analysis Summary:`);
    console.log(`   - JSON-LD present: ${jsonLD ? 'YES' : 'NO'}`);
    console.log(`   - Ranking text found: ${found.length > 0 ? 'YES' : 'NO'}`);
    console.log(`   - HTML size: ${html.length > 50000 ? 'LARGE' : 'SMALL'}`);
    console.log(`   - Likely cause: ${found.length > 0 ? 'EXTRACTION PATTERN MISMATCH' : 'NO RANKING DATA'}`);
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

investigateExtractionFailure().catch(console.error);