#!/usr/bin/env tsx

/**
 * Targeted Search for Unranked Schools
 * 
 * Look specifically for schools that US News labels as "unranked"
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

interface UnrankedSearch {
  schoolSlug: string;
  schoolName: string | null;
  isUnranked: boolean;
  unrankedIndicators: string[];
  pageType: 'valid_school' | 'error_page' | 'private_school' | 'insufficient_data';
  rawText?: string;
}

function searchForUnrankedIndicators(html: string): {
  isUnranked: boolean;
  indicators: string[];
  contexts: string[];
} {
  const indicators: string[] = [];
  const contexts: string[] = [];
  
  // Specific patterns for US News "unranked" labeling
  const unrankedPatterns = [
    { pattern: /unranked/i, name: "Contains 'unranked'" },
    { pattern: /not\s+ranked/i, name: "Contains 'not ranked'" },
    { pattern: /ranking\s+not\s+available/i, name: "Contains 'ranking not available'" },
    { pattern: /insufficient\s+data/i, name: "Contains 'insufficient data'" },
    { pattern: /private\s+school/i, name: "Contains 'private school'" },
    { pattern: /charter\s+school/i, name: "Contains 'charter school'" },
    { pattern: /small\s+enrollment/i, name: "Contains 'small enrollment'" },
    { pattern: /no\s+grade\s+12/i, name: "Contains 'no grade 12'" },
    { pattern: /assessment\s+data.*not.*available/i, name: "Contains assessment data unavailable" }
  ];
  
  unrankedPatterns.forEach(({ pattern, name }) => {
    const matches = [...html.matchAll(pattern)];
    if (matches.length > 0) {
      indicators.push(name);
      
      // Get context around first match
      const match = matches[0];
      if (match.index) {
        const start = Math.max(0, match.index - 100);
        const end = Math.min(html.length, match.index + match[0].length + 100);
        contexts.push(html.substring(start, end).replace(/\s+/g, ' ').trim());
      }
    }
  });
  
  return {
    isUnranked: indicators.length > 0,
    indicators,
    contexts
  };
}

function extractSchoolNameFromHTML(html: string): string | null {
  // Try multiple approaches to get school name
  const patterns = [
    /<h1[^>]*>([^<]+)<\/h1>/i,
    /<title[^>]*>([^<]+?)\s*\|\s*US News/i,
    /"name"\s*:\s*"([^"]+)"/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

function classifyPageType(html: string, indicators: string[]): UnrankedSearch['pageType'] {
  if (html.includes('privacy') || html.includes('ccpa')) {
    return 'error_page';
  }
  
  if (indicators.some(ind => ind.includes('private school'))) {
    return 'private_school';
  }
  
  if (indicators.some(ind => ind.includes('insufficient data'))) {
    return 'insufficient_data';
  }
  
  return 'valid_school';
}

async function searchForUnrankedSchools() {
  console.log('🔍 Targeted Search for Unranked Schools');
  console.log('=' .repeat(60));
  
  const dataDir = '/Volumes/OWC Express 1M2/USNEWS_2024';
  
  if (!existsSync(dataDir)) {
    console.log('❌ External drive not available');
    return;
  }
  
  try {
    const allSchools = readdirSync(dataDir).filter(school => !school.startsWith('.'));
    console.log(`\n📊 Searching through ${allSchools.length} school directories...`);
    
    // Search a larger sample specifically looking for unranked schools
    const searchSize = Math.min(1000, allSchools.length);
    const searchSchools = allSchools.slice(0, searchSize);
    
    console.log(`\n🎯 Searching ${searchSchools.length} schools for unranked indicators...`);
    
    const results: UnrankedSearch[] = [];
    let processed = 0;
    let unrankedFound = 0;
    
    for (const schoolSlug of searchSchools) {
      try {
        const schoolDir = join(dataDir, schoolSlug);
        
        if (!existsSync(schoolDir)) {
          continue;
        }
        
        const files = readdirSync(schoolDir);
        const htmlFile = files.find(f => f.endsWith('.html'));
        
        if (!htmlFile) {
          continue;
        }
        
        const htmlPath = join(schoolDir, htmlFile);
        const html = readFileSync(htmlPath, 'utf-8');
        
        const schoolName = extractSchoolNameFromHTML(html);
        const unrankedCheck = searchForUnrankedIndicators(html);
        const pageType = classifyPageType(html, unrankedCheck.indicators);
        
        if (unrankedCheck.isUnranked) {
          unrankedFound++;
          
          results.push({
            schoolSlug,
            schoolName,
            isUnranked: true,
            unrankedIndicators: unrankedCheck.indicators,
            pageType,
            rawText: unrankedCheck.contexts.join(' | ')
          });
        }
        
        processed++;
        if (processed % 100 === 0) {
          console.log(`   Progress: ${processed}/${searchSchools.length} (${unrankedFound} unranked found)`);
        }
        
      } catch (error) {
        continue;
      }
    }
    
    console.log(`\n📈 Search Complete: ${processed} schools searched, ${unrankedFound} unranked found`);
    console.log('=' .repeat(60));
    
    if (results.length > 0) {
      console.log(`\n🎯 UNRANKED SCHOOLS FOUND: ${results.length}`);
      console.log('=======================================');
      
      // Group by page type
      const byPageType = results.reduce((acc, school) => {
        acc[school.pageType] = (acc[school.pageType] || []).concat(school);
        return acc;
      }, {} as Record<string, UnrankedSearch[]>);
      
      Object.entries(byPageType).forEach(([pageType, schools]) => {
        console.log(`\n${pageType.toUpperCase().replace('_', ' ')}: ${schools.length} schools`);
        
        schools.slice(0, 5).forEach(school => {
          console.log(`\n   ${school.schoolName || school.schoolSlug}:`);
          console.log(`     Slug: ${school.schoolSlug}`);
          console.log(`     Indicators: ${school.unrankedIndicators.join(', ')}`);
          if (school.rawText) {
            console.log(`     Context: "${school.rawText.substring(0, 200)}..."`);
          }
        });
        
        if (schools.length > 5) {
          console.log(`\n   ... and ${schools.length - 5} more schools`);
        }
      });
      
      console.log('\n🎯 ANALYSIS:');
      console.log('============');
      console.log(`Unranked schools found: ${results.length} out of ${processed} searched (${(results.length / processed * 100).toFixed(1)}%)`);
      
      if (results.length > 0) {
        console.log(`✅ SUCCESS: Found genuinely unranked schools in dataset`);
        console.log(`   → Bucket 4 classification IS needed`);
        console.log(`   → Previous audit missed these schools`);
        
        const validUnranked = results.filter(s => s.pageType === 'valid_school' || s.pageType === 'private_school' || s.pageType === 'insufficient_data');
        console.log(`   → ${validUnranked.length} genuinely unranked schools (excluding errors)`);
      }
      
    } else {
      console.log(`\n📊 RESULTS: No unranked schools found in ${processed} school sample`);
      console.log('=================================================');
      console.log('This suggests either:');
      console.log('1. Unranked schools are rare in our dataset');
      console.log('2. They use different terminology than searched for');
      console.log('3. They may be in a different part of the dataset');
      console.log('4. Our dataset may only contain ranked schools');
    }
    
    // Estimate total unranked schools
    if (results.length > 0) {
      const unrankedRate = results.length / processed;
      const estimatedTotal = Math.round(allSchools.length * unrankedRate);
      console.log(`\n📊 PROJECTION: ~${estimatedTotal} unranked schools estimated in full dataset`);
      console.log(`   (Based on ${(unrankedRate * 100).toFixed(1)}% rate from sample)`);
    }
    
  } catch (error) {
    console.error('❌ Search failed:', error);
  }
}

searchForUnrankedSchools().catch(console.error);