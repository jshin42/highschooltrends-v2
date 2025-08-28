#!/usr/bin/env tsx

/**
 * Expanded Audit with Error Detection
 * 
 * Run a larger sample size and detect data collection errors
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { CSSExtractionMethod } from './src/silver/css-extraction-method';
import { ExtractionContext } from './src/silver/types';

interface ExpandedAuditResult {
  schoolSlug: string;
  category: 'national_exact' | 'national_range' | 'state_only' | 'unranked' | 'data_collection_error';
  nationalRank: number | null;
  stateRank: number | null;
  confidence: number;
  errorType?: 'privacy_page' | 'not_found' | 'access_denied' | 'malformed' | 'other';
  pageTitle?: string;
}

function detectDataCollectionError(html: string): {
  isError: boolean;
  errorType: ExpandedAuditResult['errorType'];
  pageTitle: string | null;
} {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].trim() : null;
  
  // Check for various error conditions
  if (pageTitle?.toLowerCase().includes('privacy') || pageTitle?.toLowerCase().includes('ccpa')) {
    return { isError: true, errorType: 'privacy_page', pageTitle };
  }
  
  if (pageTitle?.toLowerCase().includes('not found') || pageTitle?.toLowerCase().includes('404')) {
    return { isError: true, errorType: 'not_found', pageTitle };
  }
  
  if (pageTitle?.toLowerCase().includes('access denied') || pageTitle?.toLowerCase().includes('unauthorized')) {
    return { isError: true, errorType: 'access_denied', pageTitle };
  }
  
  if (html.length < 10000) {
    return { isError: true, errorType: 'malformed', pageTitle };
  }
  
  // Check for JSON-LD school data as a positive indicator
  const hasSchoolJsonLD = /<script[^>]*type="application\/ld\+json"[^>]*>.*"@type":\s*"HighSchool".*<\/script>/s.test(html);
  
  // Check for basic school page indicators
  const hasSchoolIndicators = /high school|secondary|academy|institute/i.test(html) && 
                             !/privacy|ccpa|cookie|gdpr/i.test(pageTitle || '');
  
  if (!hasSchoolJsonLD && !hasSchoolIndicators && pageTitle) {
    return { isError: true, errorType: 'other', pageTitle };
  }
  
  return { isError: false, errorType: undefined, pageTitle };
}

async function auditSchoolExpanded(schoolSlug: string): Promise<ExpandedAuditResult | null> {
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
    
    // Check for data collection errors first
    const errorCheck = detectDataCollectionError(html);
    if (errorCheck.isError) {
      return {
        schoolSlug,
        category: 'data_collection_error',
        nationalRank: null,
        stateRank: null,
        confidence: 0,
        errorType: errorCheck.errorType,
        pageTitle: errorCheck.pageTitle
      };
    }
    
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
    
    // Determine category
    let category: ExpandedAuditResult['category'];
    
    if (nationalRank && nationalRank >= 1 && nationalRank <= 13426) {
      category = 'national_exact';
    } else if (nationalRank && nationalRank >= 13427 && nationalRank <= 17901) {
      category = 'national_range';
    } else if (nationalRank || stateRank) {
      category = 'state_only';
    } else {
      // No rankings found - likely genuinely unranked
      category = 'unranked';
    }
    
    return {
      schoolSlug,
      category,
      nationalRank,
      stateRank,
      confidence: result.confidence,
      pageTitle: errorCheck.pageTitle
    };
    
  } catch (error) {
    return null;
  }
}

async function expandedAudit() {
  console.log('🔍 Expanded Ranking Audit with Error Detection');
  console.log('=' .repeat(70));
  
  const dataDir = '/Volumes/OWC Express 1M2/USNEWS_2024';
  
  if (!existsSync(dataDir)) {
    console.log('❌ External drive not available - cannot run audit');
    return;
  }
  
  try {
    const allSchools = readdirSync(dataDir);
    console.log(`\n📊 Found ${allSchools.length} total school directories`);
    
    // Larger sample for more comprehensive analysis
    const sampleSize = Math.min(500, allSchools.length);
    const sampleSchools = allSchools
      .filter(school => !school.startsWith('.'))
      .slice(0, sampleSize);
    
    console.log(`\n🎯 Auditing ${sampleSchools.length} schools for comprehensive analysis...`);
    
    const results: ExpandedAuditResult[] = [];
    let processed = 0;
    
    for (const schoolSlug of sampleSchools) {
      const result = await auditSchoolExpanded(schoolSlug);
      if (result) {
        results.push(result);
      }
      
      processed++;
      if (processed % 50 === 0) {
        console.log(`   Progress: ${processed}/${sampleSchools.length}`);
      }
    }
    
    console.log(`\n📈 Expanded Audit Results: ${results.length} schools analyzed`);
    console.log('=' .repeat(70));
    
    // Categorize results
    const categories = results.reduce((acc, school) => {
      acc[school.category] = (acc[school.category] || []).concat(school);
      return acc;
    }, {} as Record<string, ExpandedAuditResult[]>);
    
    // Show category breakdown
    console.log('\n🏆 School Categorization (Enhanced):');
    console.log('===================================');
    
    const categoryOrder: (keyof typeof categories)[] = [
      'national_exact', 'national_range', 'state_only', 'unranked', 'data_collection_error'
    ];
    
    categoryOrder.forEach(category => {
      const schools = categories[category] || [];
      console.log(`\n${category.toUpperCase().replace(/_/g, ' ')}: ${schools.length} schools`);
      
      if (schools.length > 0) {
        schools.slice(0, 3).forEach(school => {
          if (category === 'data_collection_error') {
            console.log(`   - ${school.schoolSlug}: ${school.errorType} - "${school.pageTitle}"`);
          } else {
            console.log(`   - ${school.schoolSlug}: National #${school.nationalRank || 'N/A'}, State #${school.stateRank || 'N/A'}`);
          }
        });
        
        if (schools.length > 3) {
          console.log(`   ... and ${schools.length - 3} more`);
        }
      }
    });
    
    // Data collection error analysis
    const errorSchools = categories.data_collection_error || [];
    if (errorSchools.length > 0) {
      console.log('\n🚨 DATA COLLECTION ERROR ANALYSIS:');
      console.log('===================================');
      
      const errorTypes = errorSchools.reduce((acc, school) => {
        const type = school.errorType || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(errorTypes).forEach(([type, count]) => {
        console.log(`   ${type.toUpperCase()}: ${count} schools`);
      });
      
      console.log('\n   Sample error pages:');
      errorSchools.slice(0, 5).forEach(school => {
        console.log(`   - ${school.schoolSlug}: "${school.pageTitle}"`);
      });
    }
    
    // Clean data analysis (excluding errors)
    const cleanResults = results.filter(r => r.category !== 'data_collection_error');
    const unrankedSchools = cleanResults.filter(r => r.category === 'unranked');
    
    console.log('\n📊 CLEAN DATA SUMMARY (Excluding Errors):');
    console.log('=========================================');
    console.log(`Total clean schools: ${cleanResults.length}`);
    console.log(`Schools with rankings: ${cleanResults.filter(s => s.nationalRank || s.stateRank).length}`);
    console.log(`Genuinely unranked: ${unrankedSchools.length} (${(unrankedSchools.length / cleanResults.length * 100).toFixed(1)}%)`);
    console.log(`Data collection errors: ${errorSchools.length} (${(errorSchools.length / results.length * 100).toFixed(1)}%)`);
    
    if (cleanResults.length > 0) {
      const avgConfidence = cleanResults.reduce((sum, s) => sum + s.confidence, 0) / cleanResults.length;
      console.log(`Average extraction confidence: ${avgConfidence.toFixed(1)}%`);
    }
    
    // Final recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('===================');
    
    if (errorSchools.length > results.length * 0.05) {
      console.log(`⚠️  ${errorSchools.length} data collection errors (${(errorSchools.length / results.length * 100).toFixed(1)}%) - data quality issue`);
    } else {
      console.log(`✅ Low data collection error rate: ${(errorSchools.length / results.length * 100).toFixed(1)}%`);
    }
    
    if (unrankedSchools.length > 0) {
      console.log(`📝 Found ${unrankedSchools.length} genuinely unranked schools - may need Bucket 4 classification`);
      
      console.log('\n   Sample unranked schools:');
      unrankedSchools.slice(0, 5).forEach(school => {
        console.log(`   - ${school.schoolSlug}: "${school.pageTitle}"`);
      });
    } else {
      console.log(`✅ No genuinely unranked schools found in sample`);
    }
    
    const rankingSuccessRate = cleanResults.filter(s => s.nationalRank || s.stateRank).length / cleanResults.length;
    if (rankingSuccessRate > 0.95) {
      console.log(`🎉 Excellent ranking extraction: ${(rankingSuccessRate * 100).toFixed(1)}% success rate`);
    } else if (rankingSuccessRate > 0.8) {
      console.log(`✅ Good ranking extraction: ${(rankingSuccessRate * 100).toFixed(1)}% success rate`);  
    } else {
      console.log(`⚠️  Ranking extraction needs improvement: ${(rankingSuccessRate * 100).toFixed(1)}% success rate`);
    }
    
  } catch (error) {
    console.error('❌ Expanded audit failed:', error);
  }
}

expandedAudit().catch(console.error);