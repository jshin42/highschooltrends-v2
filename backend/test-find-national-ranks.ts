#!/usr/bin/env tsx

/**
 * Find schools with national rankings for proper Bucket 1/2 validation
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

async function findNationalRanks() {
  console.log('🔍 Searching for nationally ranked schools...\n');
  
  const dataDir = '/Volumes/OWC Express 1M2/USNEWS_2024';
  const allSchools = readdirSync(dataDir);
  
  console.log(`📊 Total schools to search: ${allSchools.length}`);
  
  const rankedSchools: SchoolRankInfo[] = [];
  let processed = 0;
  
  // Search through schools looking for national rankings
  for (const schoolSlug of allSchools.slice(0, 1000)) { // First 1000 schools
    try {
      const schoolDir = join(dataDir, schoolSlug);
      const files = readdirSync(schoolDir);
      const htmlFile = files.find(f => f.endsWith('.html'));
      
      if (!htmlFile) continue;
      
      const htmlPath = join(schoolDir, htmlFile);
      const html = readFileSync(htmlPath, 'utf-8');
      
      // Extract JSON-LD data
      const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/i);
      
      if (jsonLdMatch) {
        try {
          const data = JSON.parse(jsonLdMatch[1]);
          
          if (data['@type'] === 'HighSchool' && data.description) {
            const description = data.description;
            
            // Look for national rankings in description
            const nationalMatch = description.match(/is ranked (\d+)(?:st|nd|rd|th)? in the (?:National|nation)/i);
            const stateMatch = description.match(/ranked (\d+)(?:st|nd|rd|th)? within ([A-Z]{2,})/i);
            
            let nationalRank = null;
            let stateRank = null;
            let state = 'UNKNOWN';
            
            if (nationalMatch) {
              nationalRank = parseInt(nationalMatch[1]);
            }
            
            if (stateMatch) {
              stateRank = parseInt(stateMatch[1]);
              state = stateMatch[2];
            }
            
            // Also check for address state
            if (data.location?.address?.addressRegion) {
              state = data.location.address.addressRegion;
            }
            
            if (nationalRank || stateRank) {
              rankedSchools.push({
                schoolSlug,
                schoolName: data.name || schoolSlug,
                nationalRank,
                stateRank,
                state,
                rawDescription: description
              });
            }
          }
        } catch (error) {
          // Skip JSON parse errors
        }
      }
      
      processed++;
      if (processed % 100 === 0) {
        console.log(`📈 Processed: ${processed}/1000 (Found ${rankedSchools.length} ranked schools)`);
      }
      
    } catch (error) {
      // Skip file errors
    }
  }
  
  console.log(`\n🎯 Results: Found ${rankedSchools.length} ranked schools`);
  
  // Analyze ranking distribution
  const nationallyRanked = rankedSchools.filter(s => s.nationalRank);
  const stateOnlyRanked = rankedSchools.filter(s => s.stateRank && !s.nationalRank);
  
  console.log(`   Nationally ranked: ${nationallyRanked.length}`);
  console.log(`   State-only ranked: ${stateOnlyRanked.length}`);
  
  if (nationallyRanked.length > 0) {
    console.log('\n🏆 Nationally Ranked Schools:');
    nationallyRanked
      .sort((a, b) => (a.nationalRank || 999999) - (b.nationalRank || 999999))
      .slice(0, 10)
      .forEach(school => {
        console.log(`   #${school.nationalRank}: ${school.schoolName} (${school.state})`);
      });
      
    const ranks = nationallyRanked.map(s => s.nationalRank!);
    const minRank = Math.min(...ranks);
    const maxRank = Math.max(...ranks);
    
    console.log(`\n📊 National Rank Distribution:`);
    console.log(`   Range: #${minRank} - #${maxRank}`);
    
    // Bucket analysis
    const bucket1 = ranks.filter(r => r >= 1 && r <= 13426);
    const bucket2 = ranks.filter(r => r >= 13427 && r <= 17901);
    const bucket3 = ranks.filter(r => r > 17901);
    
    console.log(`   Bucket 1 (1-13,426): ${bucket1.length} schools`);
    console.log(`   Bucket 2 (13,427-17,901): ${bucket2.length} schools`);
    console.log(`   Bucket 3 (>17,901): ${bucket3.length} schools`);
  }
  
  if (stateOnlyRanked.length > 0) {
    console.log('\n🗺️ State-Only Rankings by State:');
    const byState = stateOnlyRanked.reduce((acc, school) => {
      if (!acc[school.state]) acc[school.state] = [];
      acc[school.state].push(school);
      return acc;
    }, {} as Record<string, SchoolRankInfo[]>);
    
    Object.entries(byState)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 10)
      .forEach(([state, schools]) => {
        const ranks = schools.map(s => s.stateRank!).sort((a, b) => a - b);
        console.log(`   ${state}: ${schools.length} schools (ranks #${ranks[0]}-#${ranks[ranks.length-1]})`);
      });
  }
  
  // Show some example descriptions to understand parsing
  console.log('\n📝 Sample Descriptions:');
  rankedSchools.slice(0, 3).forEach(school => {
    console.log(`\n${school.schoolName}:`);
    console.log(`   ${school.rawDescription.substring(0, 200)}...`);
    console.log(`   Extracted: National #${school.nationalRank || 'N/A'}, State #${school.stateRank || 'N/A'}`);
  });
}

findNationalRanks().catch(console.error);