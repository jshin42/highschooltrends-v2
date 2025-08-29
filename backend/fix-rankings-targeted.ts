#!/usr/bin/env node

/**
 * Fix Rankings - Targeted Script
 * 
 * Uses the consolidated RankingExtractionUtility for schema-safe operations.
 * Allows fixing specific schools by slug and year for debugging and validation.
 */

import { RankingExtractionUtility, ExtractionResult } from './src/silver/ranking-extraction-utility';

class TargetedRankingFix {
  private extractor: RankingExtractionUtility;

  constructor() {
    this.extractor = new RankingExtractionUtility();
  }

  /**
   * Fix multiple target schools with expected rankings for validation
   */
  async fixTargetSchools(schools: Array<{slug: string, year: number, expectedRank: number}>): Promise<void> {
    console.log('🎯 TARGETED RANKING FIX\n');
    console.log('='.repeat(60));
    
    const results: (ExtractionResult & {slug: string, year: number})[] = [];
    
    for (const school of schools) {
      console.log(`🔧 Fixing ${school.slug} (${school.year})...`);
      
      const result = await this.extractor.extractSingleSchool(school.slug, school.year);
      results.push({...result, slug: school.slug, year: school.year});
      
      console.log(`   📊 Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      if (result.success) {
        console.log(`   📈 Old rank: ${result.oldRank || 'NULL'} → New rank: ${result.newRank || 'NULL'} (${result.confidence}% confidence)`);
      } else {
        console.log(`   ❌ Error: ${result.error}`);
      }
      console.log(); // Add spacing between schools
    }
    
    // Summary report
    console.log('📊 FIX RESULTS SUMMARY');
    console.log('='.repeat(40));
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const expected = schools[i].expectedRank;
      
      console.log(`${result.slug}:`);
      console.log(`   Expected: #${expected}`);
      console.log(`   Old: ${result.oldRank || 'NULL'}`);  
      console.log(`   New: ${result.newRank || 'NULL'}`);
      console.log(`   Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (result.newRank === expected) {
        console.log(`   🎯 PERFECT MATCH!`);
      } else if (result.newRank !== null) {
        console.log(`   🤔 Extracted rank ${result.newRank} instead of expected ${expected}`);
      }
      
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
      console.log();
    }
    
    const successful = results.filter(r => r.success).length;
    console.log(`🎉 Summary: ${successful}/${results.length} schools fixed successfully`);
  }

  close(): void {
    this.extractor.close();
  }
}

// Main execution
async function main() {
  const fixer = new TargetedRankingFix();
  
  try {
    // Test on key schools we know the expected rankings for
    const targetSchools = [
      { slug: 'thomas-jefferson-high-school-for-science-and-technology-20461', year: 2025, expectedRank: 5 },
      { slug: 'basis-tucson-north-140137', year: 2025, expectedRank: 1 },
      { slug: 'academic-magnet-high-school-3841', year: 2025, expectedRank: 2 }
    ];
    
    await fixer.fixTargetSchools(targetSchools);
    
  } catch (error) {
    console.error('❌ Targeted fix failed:', error);
    process.exit(1);
    
  } finally {
    fixer.close();
  }
}

if (require.main === module) {
  main();
}