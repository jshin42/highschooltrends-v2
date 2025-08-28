#!/usr/bin/env tsx

/**
 * Comprehensive Ranking Audit
 * 
 * Audit all schools to identify:
 * 1. Schools with national + state rankings
 * 2. Schools with state rankings only  
 * 3. Schools with no rankings at all (potentially unranked)
 * 4. Schools where extraction failed vs genuinely unranked
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { CSSExtractionMethod } from './src/silver/css-extraction-method';
import { ExtractionContext } from './src/silver/types';

interface SchoolAuditResult {
  schoolSlug: string;
  schoolName: string;
  nationalRank: number | null;
  stateRank: number | null;
  state: string | null;
  category: 'national_exact' | 'national_range' | 'state_only' | 'unranked' | 'extraction_failed';
  confidence: number;
  extractionMethod: 'json_ld' | 'css_selectors' | 'hybrid' | 'none';
  rawJsonLdDescription: string | null;
  hasRankingText: boolean;
  unrankedIndicators: string[];
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

function analyzeUnrankedIndicators(html: string, jsonLdDescription: string | null): {
  hasRankingText: boolean;
  unrankedIndicators: string[];
} {
  const unrankedIndicators: string[] = [];
  let hasRankingText = false;
  
  // Check for explicit "unranked" or "not ranked" text
  const unrankedPatterns = [
    /not\s+ranked/i,
    /unranked/i,
    /no\s+ranking/i,
    /ranking\s+not\s+available/i,
    /not\s+included\s+in\s+rankings/i,
    /does\s+not\s+participate\s+in\s+rankings/i
  ];
  
  const textToSearch = [html, jsonLdDescription || ''].join(' ');
  
  unrankedPatterns.forEach((pattern, index) => {
    const match = textToSearch.match(pattern);
    if (match) {
      unrankedIndicators.push(`Pattern ${index + 1}: "${match[0]}"`);
    }
  });
  
  // Check if there's any ranking-related text at all
  const rankingPatterns = [
    /#\d+/,
    /rank/i,
    /national/i,
    /state.*school/i
  ];
  
  hasRankingText = rankingPatterns.some(pattern => pattern.test(textToSearch));
  
  return { hasRankingText, unrankedIndicators };
}

async function auditSchool(schoolSlug: string): Promise<SchoolAuditResult | null> {
  const schoolDir = join('/Volumes/OWC Express 1M2/USNEWS_2024', schoolSlug);
  
  try {
    if (!existsSync(schoolDir)) {
      return null;
    }
    
    const files = readdirSync(schoolDir);
    const htmlFile = files.find(f => f.endsWith('.html'));
    
    if (!htmlFile) {
      return null;
    }
    
    const htmlPath = join(schoolDir, htmlFile);
    const html = readFileSync(htmlPath, 'utf-8');
    
    // Extract JSON-LD for analysis
    const jsonLD = extractJSONLD(html);
    const jsonLdDescription = jsonLD?.description || null;
    
    // Analyze for unranked indicators
    const { hasRankingText, unrankedIndicators } = analyzeUnrankedIndicators(html, jsonLdDescription);
    
    // Create extraction context
    const mockContext: ExtractionContext = {
      bronzeRecord: {
        id: 1,
        school_slug: schoolSlug,
        file_path: htmlPath,
        capture_timestamp: new Date().toISOString(),
        file_size: html.length,
        checksum_sha256: 'audit',
        processing_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      schoolSlug,
      sourceYear: 2024,
      fileContent: html,
      domDocument: null
    };
    
    // Run extraction
    const extractor = new CSSExtractionMethod();
    const result = await extractor.extract(html, mockContext);
    
    const nationalRank = result.data.national_rank;
    const stateRank = result.data.state_rank;
    const state = result.data.address_state;
    
    // Determine category
    let category: SchoolAuditResult['category'];
    let extractionMethod: SchoolAuditResult['extractionMethod'];
    
    if (nationalRank && stateRank) {
      if (nationalRank >= 1 && nationalRank <= 13426) {
        category = 'national_exact';
      } else if (nationalRank >= 13427 && nationalRank <= 17901) {
        category = 'national_range';
      } else {
        category = 'state_only'; // Weird edge case
      }
      extractionMethod = 'hybrid';
    } else if (nationalRank) {
      if (nationalRank >= 1 && nationalRank <= 13426) {
        category = 'national_exact';
      } else if (nationalRank >= 13427 && nationalRank <= 17901) {
        category = 'national_range';
      } else {
        category = 'state_only'; // Edge case
      }
      extractionMethod = jsonLD ? 'hybrid' : 'css_selectors';
    } else if (stateRank) {
      category = 'state_only';
      extractionMethod = jsonLD ? 'hybrid' : 'css_selectors';
    } else {
      // No rankings found - need to distinguish unranked vs extraction failed
      if (unrankedIndicators.length > 0) {
        category = 'unranked';
      } else if (!hasRankingText) {
        category = 'unranked'; // Likely genuinely unranked
      } else {
        category = 'extraction_failed'; // Has ranking text but we couldn't extract
      }
      extractionMethod = 'none';
    }
    
    return {
      schoolSlug,
      schoolName: result.data.school_name || schoolSlug,
      nationalRank,
      stateRank,
      state,
      category,
      confidence: result.confidence,
      extractionMethod,
      rawJsonLdDescription: jsonLdDescription,
      hasRankingText,
      unrankedIndicators
    };
    
  } catch (error) {
    console.warn(`Failed to audit ${schoolSlug}:`, error);
    return null;
  }
}

async function comprehensiveAudit() {
  console.log('🔍 Comprehensive Ranking Audit');
  console.log('=' .repeat(60));
  
  const dataDir = '/Volumes/OWC Express 1M2/USNEWS_2024';
  
  if (!existsSync(dataDir)) {
    console.log('❌ External drive not available - cannot run audit');
    return;
  }
  
  try {
    const allSchools = readdirSync(dataDir);
    console.log(`\n📊 Found ${allSchools.length} total school directories`);
    
    // Sample a representative set for initial audit
    const sampleSize = Math.min(100, allSchools.length);
    const sampleSchools = allSchools
      .filter(school => !school.startsWith('.'))
      .slice(0, sampleSize);
    
    console.log(`\n🎯 Auditing ${sampleSchools.length} schools for comprehensive analysis...`);
    
    const results: SchoolAuditResult[] = [];
    let processed = 0;
    
    for (const schoolSlug of sampleSchools) {
      const result = await auditSchool(schoolSlug);
      if (result) {
        results.push(result);
      }
      
      processed++;
      if (processed % 10 === 0) {
        console.log(`   Progress: ${processed}/${sampleSchools.length}`);
      }
    }
    
    console.log(`\n📈 Audit Results: ${results.length} schools analyzed`);
    console.log('=' .repeat(60));
    
    // Categorize results
    const categories = results.reduce((acc, school) => {
      acc[school.category] = (acc[school.category] || []).concat(school);
      return acc;
    }, {} as Record<string, SchoolAuditResult[]>);
    
    // Show category breakdown
    console.log('\n🏆 School Categorization:');
    console.log('========================');
    
    const categoryOrder: (keyof typeof categories)[] = [
      'national_exact', 'national_range', 'state_only', 'unranked', 'extraction_failed'
    ];
    
    categoryOrder.forEach(category => {
      const schools = categories[category] || [];
      console.log(`\n${category.toUpperCase().replace('_', ' ')}: ${schools.length} schools`);
      
      if (schools.length > 0) {
        // Show examples
        schools.slice(0, 3).forEach(school => {
          console.log(`   - ${school.schoolName}: National #${school.nationalRank || 'N/A'}, State #${school.stateRank || 'N/A'} (${school.state || 'N/A'})`);
        });
        
        if (schools.length > 3) {
          console.log(`   ... and ${schools.length - 3} more`);
        }
      }
    });
    
    // Focus on unranked and extraction failed schools
    console.log('\n🚨 UNRANKED SCHOOLS ANALYSIS:');
    console.log('=============================');
    
    const unrankedSchools = categories.unranked || [];
    const extractionFailedSchools = categories.extraction_failed || [];
    
    if (unrankedSchools.length > 0) {
      console.log(`\nGenuinely Unranked Schools: ${unrankedSchools.length}`);
      unrankedSchools.forEach(school => {
        console.log(`\n   ${school.schoolName} (${school.schoolSlug}):`);
        console.log(`     Has ranking text: ${school.hasRankingText}`);
        console.log(`     Unranked indicators: ${school.unrankedIndicators.length}`);
        school.unrankedIndicators.forEach((indicator, i) => {
          console.log(`       ${i + 1}. ${indicator}`);
        });
        if (school.rawJsonLdDescription) {
          console.log(`     JSON-LD desc: "${school.rawJsonLdDescription.substring(0, 100)}..."`);
        }
      });
    }
    
    if (extractionFailedSchools.length > 0) {
      console.log(`\nExtraction Failed Schools: ${extractionFailedSchools.length}`);
      extractionFailedSchools.slice(0, 3).forEach(school => {
        console.log(`\n   ${school.schoolName} (${school.schoolSlug}):`);
        console.log(`     Has ranking text: ${school.hasRankingText}`);
        console.log(`     Confidence: ${school.confidence}%`);
        if (school.rawJsonLdDescription) {
          console.log(`     JSON-LD desc: "${school.rawJsonLdDescription.substring(0, 100)}..."`);
        }
      });
    }
    
    // Summary statistics
    console.log('\n📊 AUDIT SUMMARY:');
    console.log('==================');
    console.log(`Total schools analyzed: ${results.length}`);
    console.log(`Schools with rankings: ${results.filter(s => s.nationalRank || s.stateRank).length}`);
    console.log(`Genuinely unranked: ${unrankedSchools.length} (${(unrankedSchools.length / results.length * 100).toFixed(1)}%)`);
    console.log(`Extraction failed: ${extractionFailedSchools.length} (${(extractionFailedSchools.length / results.length * 100).toFixed(1)}%)`);
    console.log(`Average confidence: ${(results.reduce((sum, s) => sum + s.confidence, 0) / results.length).toFixed(1)}%`);
    
    // Recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('===================');
    
    if (unrankedSchools.length > 0) {
      console.log(`✅ Found ${unrankedSchools.length} genuinely unranked schools - need Bucket 4 classification`);
    }
    
    if (extractionFailedSchools.length > 0) {
      console.log(`⚠️  ${extractionFailedSchools.length} schools have ranking text but extraction failed - needs investigation`);
    }
    
    const totalWithRankings = results.filter(s => s.nationalRank || s.stateRank).length;
    if (totalWithRankings / results.length < 0.8) {
      console.log(`❌ Only ${(totalWithRankings / results.length * 100).toFixed(1)}% of schools have rankings - below 80% threshold`);
    } else {
      console.log(`✅ ${(totalWithRankings / results.length * 100).toFixed(1)}% of schools have rankings - above 80% threshold`);
    }
    
  } catch (error) {
    console.error('❌ Audit failed:', error);
  }
}

comprehensiveAudit().catch(console.error);