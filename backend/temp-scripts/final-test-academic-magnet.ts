#!/usr/bin/env tsx

/**
 * Final Test - Academic Magnet High School
 * 
 * Direct test of national ranking extraction using the original test script logic
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface SchoolRankInfo {
  schoolSlug: string;
  schoolName: string;
  nationalRank: number | null;
  stateRank: number | null;
  state: string;
  rawDescription: string;
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

function analyzeRankingExtraction(description: string): SchoolRankInfo['nationalRank'] {
  if (!description) return null;
  
  // UPDATED PATTERNS based on our debug work
  const patterns = [
    /#(\d+)\s*(?:in\s*)?(?:National|national)\s*(?:Rankings?)?/i,  // Our main pattern
    /is ranked (\d+)(?:st|nd|rd|th)? in the (?:National|nation)/i,  // Original pattern
    /ranked (\d+)(?:st|nd|rd|th)? nationally/i,
    /national rank.*?(\d+)/i,
    /#(\d+) nationally/i,
    /ranked (\d+)(?:st|nd|rd|th)? (?:in the )?nation/i
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      const rank = parseInt(match[1]);
      console.log(`   ✅ Pattern matched: "${match[0]}" -> Rank ${rank}`);
      return rank;
    }
  }
  
  return null;
}

function analyzeStateRanking(description: string): { rank: number | null, state: string | null } {
  // UPDATED STATE PATTERN to match our new logic
  const statePattern = /#(\d+)\s*(?:in\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:High\s*Schools?)?/i;
  const match = description.match(statePattern);
  
  if (match) {
    const rank = parseInt(match[1]);
    const state = match[2];
    console.log(`   ✅ State pattern matched: "${match[0]}" -> Rank ${rank} in ${state}`);
    return { rank, state };
  }
  
  return { rank: null, state: null };
}

async function testAcademicMagnet() {
  console.log('🎯 Final Test: Academic Magnet High School');
  console.log('=' .repeat(50));
  
  const schoolPath = '/Volumes/OWC Express 1M2/USNEWS_2024/academic-magnet-high-school-17566';
  
  try {
    const files = readdirSync(schoolPath);
    const htmlFile = files.find(f => f.endsWith('.html'));
    
    if (!htmlFile) {
      console.log('❌ No HTML file found');
      return;
    }
    
    const htmlPath = join(schoolPath, htmlFile);
    const html = readFileSync(htmlPath, 'utf-8');
    const jsonLD = extractJSONLD(html);
    
    if (!jsonLD || !jsonLD.description) {
      console.log('❌ No JSON-LD description found');
      return;
    }
    
    const description = jsonLD.description;
    console.log(`\n📄 School: ${jsonLD.name}`);
    console.log(`📄 Description: "${description.substring(0, 200)}..."`);
    
    console.log(`\n🔍 Testing National Ranking Patterns:`);
    const nationalRank = analyzeRankingExtraction(description);
    
    console.log(`\n🔍 Testing State Ranking Patterns:`);
    const stateData = analyzeStateRanking(description);
    
    console.log(`\n🎯 Final Results:`);
    console.log(`   National Rank: ${nationalRank || 'NOT FOUND'}`);
    console.log(`   State Rank: ${stateData.rank || 'NOT FOUND'}`);
    console.log(`   State: ${stateData.state || 'NOT FOUND'}`);
    
    // Expected results
    if (nationalRank === 7 && stateData.rank === 1) {
      console.log(`\n🎉 SUCCESS: All rankings extracted correctly!`);
      console.log(`✅ National: #7 (Expected: #7)`);
      console.log(`✅ State: #1 (Expected: #1)`);
    } else {
      console.log(`\n⚠️  PARTIAL SUCCESS:`);
      console.log(`National: ${nationalRank === 7 ? '✅' : '❌'} Got ${nationalRank}, expected 7`);
      console.log(`State: ${stateData.rank === 1 ? '✅' : '❌'} Got ${stateData.rank}, expected 1`);
    }
    
    // Also test the full text search to see if our patterns would work on the full page
    console.log(`\n🔍 Testing patterns on full HTML (not just JSON-LD):`);
    const fullNationalRank = analyzeRankingExtraction(html);
    const fullStateData = analyzeStateRanking(html);
    
    console.log(`   Full HTML National: ${fullNationalRank || 'NOT FOUND'}`);
    console.log(`   Full HTML State: ${fullStateData.rank || 'NOT FOUND'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAcademicMagnet().catch(console.error);