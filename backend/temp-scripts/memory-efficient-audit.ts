#!/usr/bin/env tsx

/**
 * Memory-Efficient Expanded Audit
 * 
 * Process schools in small batches to avoid memory issues
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { CSSExtractionMethod } from './src/silver/css-extraction-method';
import { ExtractionContext } from './src/silver/types';

interface AuditResult {
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
  errorType: AuditResult['errorType'];
  pageTitle: string | null;
} {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].trim() : null;
  
  if (pageTitle?.toLowerCase().includes('privacy') || pageTitle?.toLowerCase().includes('ccpa')) {
    return { isError: true, errorType: 'privacy_page', pageTitle };
  }
  
  if (pageTitle?.toLowerCase().includes('not found') || pageTitle?.toLowerCase().includes('404')) {
    return { isError: true, errorType: 'not_found', pageTitle };
  }
  
  if (html.length < 10000) {
    return { isError: true, errorType: 'malformed', pageTitle };
  }
  
  return { isError: false, errorType: undefined, pageTitle };
}

async function auditBatch(schoolSlugs: string[]): Promise<AuditResult[]> {
  const results: AuditResult[] = [];
  
  for (const schoolSlug of schoolSlugs) {
    try {
      const schoolDir = join('/Volumes/OWC Express 1M2/USNEWS_2024', schoolSlug);
      
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
      
      // Check for data collection errors first
      const errorCheck = detectDataCollectionError(html);
      if (errorCheck.isError) {
        results.push({
          schoolSlug,
          category: 'data_collection_error',
          nationalRank: null,
          stateRank: null,
          confidence: 0,
          errorType: errorCheck.errorType,
          pageTitle: errorCheck.pageTitle
        });
        continue;
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
      let category: AuditResult['category'];
      
      if (nationalRank && nationalRank >= 1 && nationalRank <= 13426) {
        category = 'national_exact';
      } else if (nationalRank && nationalRank >= 13427 && nationalRank <= 17901) {
        category = 'national_range';
      } else if (nationalRank || stateRank) {
        category = 'state_only';
      } else {
        category = 'unranked';
      }
      
      results.push({
        schoolSlug,
        category,
        nationalRank,
        stateRank,
        confidence: result.confidence,
        pageTitle: errorCheck.pageTitle
      });
      
    } catch (error) {
      // Skip failed schools
      continue;
    }
  }
  
  return results;
}

async function memoryEfficientAudit() {
  console.log('🔍 Memory-Efficient Ranking Audit');
  console.log('=' .repeat(50));
  
  const dataDir = '/Volumes/OWC Express 1M2/USNEWS_2024';
  
  if (!existsSync(dataDir)) {
    console.log('❌ External drive not available');
    return;
  }
  
  try {
    const allSchools = readdirSync(dataDir).filter(school => !school.startsWith('.'));
    console.log(`\n📊 Found ${allSchools.length} total school directories`);
    
    // Process in smaller batches
    const batchSize = 25;
    const totalBatches = Math.ceil(Math.min(200, allSchools.length) / batchSize); // Process 200 schools total
    const sampleSchools = allSchools.slice(0, 200);
    
    console.log(`\n🎯 Processing ${sampleSchools.length} schools in ${totalBatches} batches of ${batchSize}...`);
    
    let allResults: AuditResult[] = [];
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, sampleSchools.length);
      const batch = sampleSchools.slice(startIndex, endIndex);
      
      console.log(`   Batch ${batchIndex + 1}/${totalBatches}: Processing ${batch.length} schools...`);
      
      const batchResults = await auditBatch(batch);
      allResults = allResults.concat(batchResults);
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
    }
    
    console.log(`\n📈 Audit Complete: ${allResults.length} schools analyzed`);
    console.log('=' .repeat(50));
    
    // Categorize results
    const categories = allResults.reduce((acc, school) => {
      acc[school.category] = (acc[school.category] || []).concat(school);
      return acc;
    }, {} as Record<string, AuditResult[]>);
    
    console.log('\n🏆 Final School Categorization:');
    console.log('===============================');
    
    const categoryOrder: (keyof typeof categories)[] = [
      'national_exact', 'national_range', 'state_only', 'unranked', 'data_collection_error'
    ];
    
    let totalValidSchools = 0;
    
    categoryOrder.forEach(category => {
      const schools = categories[category] || [];
      console.log(`\n${category.toUpperCase().replace(/_/g, ' ')}: ${schools.length} schools`);
      
      if (category !== 'data_collection_error') {
        totalValidSchools += schools.length;
      }
      
      if (schools.length > 0 && schools.length <= 5) {
        // Show all if few
        schools.forEach(school => {
          if (category === 'data_collection_error') {
            console.log(`   - ${school.schoolSlug}: ${school.errorType}`);
          } else {
            console.log(`   - ${school.schoolSlug}: National #${school.nationalRank || 'N/A'}, State #${school.stateRank || 'N/A'}`);
          }
        });
      } else if (schools.length > 5) {
        // Show samples
        schools.slice(0, 3).forEach(school => {
          if (category === 'data_collection_error') {
            console.log(`   - ${school.schoolSlug}: ${school.errorType}`);
          } else {
            console.log(`   - ${school.schoolSlug}: National #${school.nationalRank || 'N/A'}, State #${school.stateRank || 'N/A'}`);
          }
        });
        console.log(`   ... and ${schools.length - 3} more`);
      }
    });
    
    // Summary statistics
    const errorSchools = categories.data_collection_error || [];
    const unrankedSchools = categories.unranked || [];
    const rankedSchools = allResults.filter(s => s.category !== 'data_collection_error' && (s.nationalRank || s.stateRank));
    
    console.log('\n📊 AUDIT SUMMARY:');
    console.log('==================');
    console.log(`Total schools processed: ${allResults.length}`);
    console.log(`Valid school pages: ${totalValidSchools} (${(totalValidSchools / allResults.length * 100).toFixed(1)}%)`);
    console.log(`Data collection errors: ${errorSchools.length} (${(errorSchools.length / allResults.length * 100).toFixed(1)}%)`);
    console.log(`Schools with rankings: ${rankedSchools.length} (${(rankedSchools.length / totalValidSchools * 100).toFixed(1)}% of valid)`);
    console.log(`Genuinely unranked: ${unrankedSchools.length} (${(unrankedSchools.length / totalValidSchools * 100).toFixed(1)}% of valid)`);
    
    if (rankedSchools.length > 0) {
      const avgConfidence = rankedSchools.reduce((sum, s) => sum + s.confidence, 0) / rankedSchools.length;
      console.log(`Average extraction confidence: ${avgConfidence.toFixed(1)}%`);
    }
    
    console.log('\n🎯 KEY FINDINGS:');
    console.log('================');
    
    if (unrankedSchools.length === 0) {
      console.log('✅ NO GENUINELY UNRANKED SCHOOLS found in sample');
      console.log('   → All valid school pages have either national or state rankings');
      console.log('   → "Unranked" category may not be needed for product');
    } else {
      console.log(`📝 Found ${unrankedSchools.length} genuinely unranked schools`);
      console.log('   → Need to investigate if this is extraction failure or legitimate unranked status');
      
      if (unrankedSchools.length <= 3) {
        console.log('\n   Unranked schools for investigation:');
        unrankedSchools.forEach(school => {
          console.log(`   - ${school.schoolSlug}`);
        });
      }
    }
    
    if (errorSchools.length > 0) {
      console.log(`\n⚠️  ${errorSchools.length} data collection errors detected`);
      console.log('   → These need to be excluded from ranking analysis');
      
      const errorTypes = errorSchools.reduce((acc, school) => {
        const type = school.errorType || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('\n   Error breakdown:');
      Object.entries(errorTypes).forEach(([type, count]) => {
        console.log(`   - ${type}: ${count} schools`);
      });
    }
    
    const successRate = rankedSchools.length / totalValidSchools;
    if (successRate >= 0.95) {
      console.log(`\n🎉 EXCELLENT: ${(successRate * 100).toFixed(1)}% ranking extraction success rate`);
      console.log('   → Extraction method is working very well');
    } else if (successRate >= 0.85) {
      console.log(`\n✅ GOOD: ${(successRate * 100).toFixed(1)}% ranking extraction success rate`);
    } else {
      console.log(`\n⚠️  NEEDS IMPROVEMENT: ${(successRate * 100).toFixed(1)}% ranking extraction success rate`);
    }
    
  } catch (error) {
    console.error('❌ Memory-efficient audit failed:', error);
  }
}

memoryEfficientAudit().catch(console.error);