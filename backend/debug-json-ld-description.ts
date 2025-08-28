#!/usr/bin/env tsx

/**
 * Debug JSON-LD description content to understand ranking patterns
 */

import { readFileSync, readdirSync } from 'fs';
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

function debugJSONLD() {
  console.log('🔍 Debug JSON-LD Description Content');
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
    
    if (!jsonLD) {
      console.log('❌ No JSON-LD data found');
      return;
    }
    
    console.log(`\n🏫 School Name: ${jsonLD.name || 'NOT FOUND'}`);
    console.log(`\n📄 Description:`)
    console.log(`"${jsonLD.description || 'NOT FOUND'}"`);
    
    if (jsonLD.description) {
      const description = jsonLD.description;
      
      console.log(`\n🧪 Testing National Ranking Patterns:`);
      
      const nationalPatterns = [
        { name: 'Pattern 1', regex: /#(\d+)\s*(?:in\s*)?(?:National|national)\s*(?:Rankings?)?/i },
        { name: 'Pattern 2', regex: /ranked\s*(?:#)?(\d+)(?:st|nd|rd|th)?\s*(?:in\s*)?(?:National|national)\s*(?:Rankings?)?/i },
        { name: 'Pattern 3', regex: /(?:National|national)\s*(?:Rankings?)\s*(?:#)?(\d+)/i },
      ];
      
      nationalPatterns.forEach(({ name, regex }) => {
        const match = description.match(regex);
        if (match) {
          console.log(`   ✅ ${name}: Found "${match[0]}" -> Rank ${match[1]}`);
        } else {
          console.log(`   ❌ ${name}: No match`);
        }
      });
      
      console.log(`\n🧪 Testing State Ranking Patterns:`);
      
      const statePatterns = [
        { name: 'Pattern 1', regex: /#(\d+)\s*(?:in\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:High\s*Schools?)?/i },
        { name: 'Pattern 2', regex: /ranked\s*(?:#)?(\d+)(?:st|nd|rd|th)?\s*(?:in\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:High\s*Schools?)?/i },
        { name: 'Pattern 3', regex: /ranked (\d+)(?:st|nd|rd|th) within ([^.]+)/i }
      ];
      
      statePatterns.forEach(({ name, regex }) => {
        const match = description.match(regex);
        if (match) {
          const location = match[2]?.toLowerCase() || '';
          const isNational = location.includes('national');
          console.log(`   ${isNational ? '❌' : '✅'} ${name}: Found "${match[0]}" -> Rank ${match[1]} in "${match[2]}" ${isNational ? '(REJECTED - National)' : '(ACCEPTED)'}`);
        } else {
          console.log(`   ❌ ${name}: No match`);
        }
      });
      
      console.log(`\n🔍 Looking for any rank-related text:`);
      const allRankMatches = [...description.matchAll(/(rank|#\d+|national|state)/gi)];
      if (allRankMatches.length > 0) {
        console.log('   Found rank-related text:');
        allRankMatches.slice(0, 10).forEach((match, i) => {
          const start = Math.max(0, match.index - 20);
          const end = Math.min(description.length, match.index + match[0].length + 20);
          const context = description.substring(start, end).replace(/\n/g, ' ');
          console.log(`   ${i+1}. "${context}"`);
        });
      } else {
        console.log('   No rank-related text found');
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugJSONLD();