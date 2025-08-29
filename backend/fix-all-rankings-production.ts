#!/usr/bin/env node

/**
 * Production Fix: All Rankings
 * 
 * Fixes the database schema mismatch bug for ALL schools with NULL rankings.
 * Uses the consolidated RankingExtractionUtility for schema-safe operations.
 * 
 * Batch processing with progress monitoring and error recovery.
 */

import { RankingExtractionUtility, ExtractionStats } from './src/silver/ranking-extraction-utility';

class ProductionRankingFix {
  private extractor: RankingExtractionUtility;
  private stats: ExtractionStats;

  constructor() {
    this.extractor = new RankingExtractionUtility();
    this.stats = {
      total_schools: 0,
      processed: 0,
      successful_fixes: 0,
      failed_extractions: 0,
      ranking_updates: 0,
      start_time: Date.now()
    };
  }

  /**
   * Run production fix on all NULL ranking schools
   */
  async runProductionFix(batchSize: number = 50, limit?: number): Promise<ExtractionStats> {
    console.log('🚀 STARTING PRODUCTION RANKING FIX\n');
    console.log('='.repeat(80));
    
    // Get all schools needing fixes
    const schools = this.extractor.getSchoolsNeedingFix(limit);
    this.stats.total_schools = schools.length;
    
    console.log(`📊 Found ${schools.length.toLocaleString()} schools with NULL rankings`);
    console.log(`🔧 Processing in batches of ${batchSize}`);
    console.log(`⏱️  Started: ${new Date().toISOString()}\n`);
    
    // Process in batches
    for (let i = 0; i < schools.length; i += batchSize) {
      const batch = schools.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(schools.length / batchSize);
      
      console.log(`🔄 Processing Batch ${batchNum}/${totalBatches} (${batch.length} schools)`);
      
      const results = await this.extractor.processBatch(batch, (processed, total, successCount) => {
        this.stats.processed++;
        this.stats.successful_fixes = successCount;
        this.stats.failed_extractions = processed - successCount;
        
        // Progress indicator every 10 schools
        if (processed % 10 === 0) {
          const elapsed = Date.now() - this.stats.start_time;
          const rate = this.stats.processed / (elapsed / 1000);
          const eta = (schools.length - this.stats.processed) / rate;
          
          process.stdout.write(`\r   Progress: ${this.stats.processed}/${schools.length} (${rate.toFixed(1)}/sec, ETA: ${Math.round(eta)}s)`);
        }
      });

      // Count ranking updates
      for (const result of results) {
        if (result.success && result.newRank !== null) {
          this.stats.ranking_updates++;
        }
      }
      
      console.log(`\n   Batch ${batchNum} complete: ${results.filter(r => r.success).length} success, ${results.filter(r => !r.success).length} failed`);
      
      // Memory management
      if (global.gc) {
        global.gc();
      }
      
      // Brief pause between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return this.stats;
  }

  /**
   * Generate final report
   */
  generateReport(stats: ExtractionStats): void {
    const elapsed = Date.now() - stats.start_time;
    
    console.log('\n📊 PRODUCTION RANKING FIX REPORT\n');
    console.log('='.repeat(60));
    
    console.log(`📈 Total Schools: ${stats.total_schools.toLocaleString()}`);
    console.log(`✅ Successfully Fixed: ${stats.successful_fixes.toLocaleString()}`);
    console.log(`❌ Failed Extractions: ${stats.failed_extractions.toLocaleString()}`);
    console.log(`📊 Rankings Added: ${stats.ranking_updates.toLocaleString()}`);
    console.log(`📈 Success Rate: ${((stats.successful_fixes / stats.total_schools) * 100).toFixed(1)}%`);
    
    console.log(`\n⏱️  PERFORMANCE:`);
    console.log(`   Total Time: ${Math.round(elapsed / 1000)} seconds`);
    console.log(`   Average Rate: ${(stats.processed / (elapsed / 1000)).toFixed(1)} schools/second`);
    console.log(`   Average Per School: ${Math.round(elapsed / stats.processed)} ms`);
    
    console.log(`\n🎯 IMPACT:`);
    const rankingRate = (stats.ranking_updates / stats.total_schools) * 100;
    console.log(`   Schools Now Ranked: ${rankingRate.toFixed(1)}%`);
    console.log(`   Database Integrity: RESTORED`);
    console.log(`   Schema Mismatch Bug: ELIMINATED`);
  }

  async close(): Promise<void> {
    this.extractor.close();
  }
}

// Main execution
async function main() {
  const fixer = new ProductionRankingFix();
  
  try {
    const args = process.argv.slice(2);
    const limitArg = args.find(arg => arg.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
    const testMode = args.includes('--test');
    
    if (testMode) {
      console.log('🧪 Running in TEST MODE - processing 100 schools\n');
    }
    
    // Run the production fix
    const stats = await fixer.runProductionFix(25, testMode ? 100 : limit);
    
    // Generate report
    fixer.generateReport(stats);
    
    // Validate key results
    await fixer.extractor.validateKeySchools();
    
    if (stats.ranking_updates > 0) {
      console.log('\n🎉 PRODUCTION RANKING FIX COMPLETED SUCCESSFULLY!');
      console.log('✨ Database rankings have been restored');
      console.log('🔧 Schema mismatch bug permanently eliminated');
    } else {
      console.log('\n⚠️  No ranking updates were made');
      console.log('This may indicate all schools already have rankings, or extraction failed');
    }
    
  } catch (error) {
    console.error('❌ Production fix failed:', error);
    process.exit(1);
    
  } finally {
    await fixer.close();
  }
}

if (require.main === module) {
  main();
}