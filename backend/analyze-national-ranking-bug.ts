#!/usr/bin/env tsx

/**
 * Analyze National Ranking Extraction Bug
 * 
 * Examine actual JSON-LD descriptions from US News to understand why
 * national ranking regex patterns are not matching.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface RankingExample {
  schoolName: string;
  description: string;
  nationalRankExtracted: number | null;
  stateRankExtracted: number | null;
  issues: string[];
}

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

function analyzeRankingExtraction(description: string): RankingExample['nationalRankExtracted'] {
  if (!description) return null;
  
  // Current regex patterns from our code
  const patterns = [
    /is ranked (\d+)(?:st|nd|rd|th)? in the (?:National|nation)/i,
    /ranked (\d+)(?:st|nd|rd|th)? nationally/i,
    /national rank.*?(\d+)/i,
    /#(\d+) nationally/i,
    /ranked (\d+)(?:st|nd|rd|th)? (?:in the )?nation/i
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return null;
}

function analyzeStateRanking(description: string): { rank: number | null, state: string | null } {
  const statePattern = /ranked (\d+)(?:st|nd|rd|th)? within ([A-Z]{2,})/i;
  const match = description.match(statePattern);
  
  if (match) {
    return {
      rank: parseInt(match[1]),
      state: match[2]
    };
  }
  
  return { rank: null, state: null };
}

async function analyzeRankingBug() {
  console.log('🔍 Analyzing National Ranking Extraction Bug\n');
  
  // Known schools that should be nationally ranked
  const testSchools = [
    '/Volumes/OWC Express 1M2/USNEWS_2024/academic-magnet-high-school-17566/docker_curl_20250818_181230.html',
    '/Volumes/OWC Express 1M2/USNEWS_2024/madison-academic-magnet-high-school-18065',
  ];
  
  const examples: RankingExample[] = [];
  
  for (const schoolPath of testSchools) {
    try {
      let htmlPath = schoolPath;
      
      // If it's a directory, find the HTML file
      if (!schoolPath.endsWith('.html')) {
        const { readdirSync } = await import('fs');
        const files = readdirSync(schoolPath);
        const htmlFile = files.find(f => f.endsWith('.html'));
        if (!htmlFile) continue;
        htmlPath = join(schoolPath, htmlFile);
      }
      
      const html = readFileSync(htmlPath, 'utf-8');
      const jsonLD = extractJSONLD(html);
      
      if (!jsonLD || !jsonLD.description) {
        continue;
      }
      
      const description = jsonLD.description;
      const nationalRank = analyzeRankingExtraction(description);
      const stateData = analyzeStateRanking(description);
      
      const issues: string[] = [];
      
      // Analyze the description for ranking patterns
      console.log(`\n📊 ${jsonLD.name || 'UNKNOWN SCHOOL'}`);
      console.log('=' .repeat(60));
      console.log(`Description: "${description.substring(0, 300)}..."`);
      console.log(`\nExtracted National Rank: ${nationalRank || 'NONE'}`);
      console.log(`Extracted State Rank: ${stateData.rank || 'NONE'} (${stateData.state || 'N/A'})`);
      
      // Look for ranking-related text that we might be missing
      const rankingKeywords = [
        'ranked', 'ranking', 'rank', '#', 'top', 'best', 
        'national', 'nationally', 'country', 'nation'
      ];
      
      const foundKeywords = rankingKeywords.filter(keyword => 
        description.toLowerCase().includes(keyword.toLowerCase())
      );
      
      console.log(`\nRanking Keywords Found: ${foundKeywords.join(', ')}`);
      
      // Test various regex patterns against this description
      const testPatterns = [
        { name: 'Current National', pattern: /is ranked (\d+)(?:st|nd|rd|th)? in the (?:National|nation)/i },
        { name: 'Alternative 1', pattern: /ranked (\d+)(?:st|nd|rd|th)? nationally/i },
        { name: 'Alternative 2', pattern: /national.*?rank.*?(\d+)/i },
        { name: 'Alternative 3', pattern: /#(\d+) in the nation/i },
        { name: 'Alternative 4', pattern: /(\d+)(?:st|nd|rd|th)? best.*?nationally/i },
        { name: 'Alternative 5', pattern: /ranked (\d+)(?:st|nd|rd|th)? among.*?national/i },
        { name: 'Broad Search', pattern: /(\d+)(?:st|nd|rd|th)?.*?(?:nation|country)/i }
      ];
      
      console.log(`\nPattern Testing Results:`);
      testPatterns.forEach(({ name, pattern }) => {
        const match = description.match(pattern);
        console.log(`  ${name}: ${match ? `✅ Found ${match[1]}` : '❌ No match'}`);
      });
      
      if (!nationalRank && description.toLowerCase().includes('ranked')) {
        issues.push('Contains ranking text but no national rank extracted');
      }
      
      examples.push({
        schoolName: jsonLD.name || 'UNKNOWN',
        description,
        nationalRankExtracted: nationalRank,
        stateRankExtracted: stateData.rank,
        issues
      });
      
    } catch (error) {
      console.warn(`Failed to analyze ${schoolPath}:`, error);
    }
  }
  
  console.log(`\n\n🎯 BUG ANALYSIS SUMMARY`);
  console.log('='.repeat(60));
  console.log(`Schools analyzed: ${examples.length}`);
  console.log(`With national ranks: ${examples.filter(e => e.nationalRankExtracted).length}`);
  console.log(`With state ranks: ${examples.filter(e => e.stateRankExtracted).length}`);
  console.log(`With issues: ${examples.filter(e => e.issues.length > 0).length}`);
  
  if (examples.filter(e => e.nationalRankExtracted).length === 0) {
    console.log(`\n❌ CRITICAL BUG CONFIRMED: No national rankings extracted from known top schools`);
    console.log(`\nNext steps:`);
    console.log(`1. Examine the exact text patterns in US News descriptions`);
    console.log(`2. Update regex patterns to match actual format`);
    console.log(`3. Test new patterns against broader sample`);
    console.log(`4. Re-run ranking validation tests`);
  }
}

analyzeRankingBug().catch(console.error);