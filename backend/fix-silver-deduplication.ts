#!/usr/bin/env node

/**
 * Silver Layer Deduplication Fix
 * 
 * Resolves systematic duplication where multiple Bronze records for the same school
 * create multiple Silver records. Preserves the highest confidence record for each
 * school-year combination.
 * 
 * Root Cause: Multiple Bronze captures per school processed separately by Silver extraction
 * Solution: Keep highest confidence + most recent record, remove others
 */

import Database from 'better-sqlite3';

interface DuplicateRecord {
  id: number;
  school_slug: string;
  source_year: number;
  bronze_record_id: number;
  extraction_confidence: number;
  updated_at: string;
  national_rank: number | null;
}

interface DeduplicationStats {
  total_duplicates_found: number;
  schools_affected: number;
  records_to_remove: number;
  records_to_preserve: number;
  avg_confidence_preserved: number;
  start_time: number;
}

class SilverDeduplication {
  private db: Database.Database;
  private stats: DeduplicationStats;

  constructor(dbPath: string = './data/silver.db') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    
    this.stats = {
      total_duplicates_found: 0,
      schools_affected: 0,
      records_to_remove: 0,
      records_to_preserve: 0,
      avg_confidence_preserved: 0,
      start_time: Date.now()
    };
  }

  /**
   * Analyze duplication issue before fixing
   */
  analyzeDuplication(): void {
    console.log('🔍 ANALYZING SILVER LAYER DUPLICATION\n');
    console.log('='.repeat(60));

    // Get overall duplication stats
    const overallStats = this.db.prepare(`
      SELECT 
        source_year,
        COUNT(*) as total_records,
        COUNT(DISTINCT school_slug) as unique_schools,
        (COUNT(*) - COUNT(DISTINCT school_slug)) as duplicate_records,
        ROUND(100.0 * (COUNT(*) - COUNT(DISTINCT school_slug)) / COUNT(*), 2) as pct_duplicates
      FROM silver_records 
      GROUP BY source_year
      ORDER BY source_year
    `).all() as any[];

    for (const row of overallStats) {
      console.log(`📊 ${row.source_year}: ${row.total_records.toLocaleString()} total, ${row.unique_schools.toLocaleString()} unique (${row.duplicate_records} duplicates, ${row.pct_duplicates}%)`);
    }

    // Get schools with most duplicates
    const worstCases = this.db.prepare(`
      SELECT 
        school_slug,
        source_year,
        COUNT(*) as duplicate_count,
        GROUP_CONCAT(DISTINCT bronze_record_id) as bronze_ids
      FROM silver_records 
      GROUP BY school_slug, source_year
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC, source_year
      LIMIT 10
    `).all() as any[];

    console.log('\n📋 TOP 10 MOST DUPLICATED SCHOOLS:');
    for (const row of worstCases) {
      console.log(`   ${row.school_slug} (${row.source_year}): ${row.duplicate_count}x duplicates`);
    }

    // Calculate total scope
    const scopeStats = this.db.prepare(`
      WITH duplicates AS (
        SELECT school_slug, source_year, COUNT(*) as count
        FROM silver_records 
        GROUP BY school_slug, source_year
        HAVING COUNT(*) > 1
      )
      SELECT 
        COUNT(*) as affected_schools,
        SUM(count) as total_duplicate_records,
        SUM(count - 1) as records_to_remove
      FROM duplicates
    `).get() as any;

    this.stats.schools_affected = scopeStats.affected_schools;
    this.stats.total_duplicates_found = scopeStats.total_duplicate_records;
    this.stats.records_to_remove = scopeStats.records_to_remove;
    this.stats.records_to_preserve = this.stats.schools_affected;

    console.log(`\n🎯 DEDUPLICATION SCOPE:`);
    console.log(`   Schools affected: ${this.stats.schools_affected.toLocaleString()}`);
    console.log(`   Records to remove: ${this.stats.records_to_remove.toLocaleString()}`);
    console.log(`   Records to preserve: ${this.stats.records_to_preserve.toLocaleString()}`);
  }

  /**
   * Get duplicate records for a specific school-year combination
   */
  getDuplicatesForSchool(schoolSlug: string, sourceYear: number): DuplicateRecord[] {
    return this.db.prepare(`
      SELECT 
        id, school_slug, source_year, bronze_record_id, 
        extraction_confidence, updated_at, national_rank
      FROM silver_records 
      WHERE school_slug = ? AND source_year = ?
      ORDER BY extraction_confidence DESC, updated_at DESC, id ASC
    `).all(schoolSlug, sourceYear) as DuplicateRecord[];
  }

  /**
   * Choose the best record to preserve (highest confidence, most recent)
   */
  chooseBestRecord(duplicates: DuplicateRecord[]): DuplicateRecord {
    if (duplicates.length === 0) {
      throw new Error('No duplicates provided');
    }

    // Already sorted by confidence DESC, updated_at DESC, id ASC
    // so first record is the best one
    return duplicates[0];
  }

  /**
   * Remove duplicate records, keeping only the best one
   */
  removeDuplicates(dryRun: boolean = true): void {
    console.log(`\n${dryRun ? '🧪 DRY RUN' : '🔥 LIVE'}: REMOVING DUPLICATE RECORDS\n`);
    console.log('='.repeat(60));

    // Get all school-year combinations with duplicates
    const duplicateGroups = this.db.prepare(`
      SELECT school_slug, source_year, COUNT(*) as count
      FROM silver_records 
      GROUP BY school_slug, source_year
      HAVING COUNT(*) > 1
      ORDER BY school_slug, source_year
    `).all() as any[];

    let processedGroups = 0;
    let totalRemoved = 0;
    let confidenceSum = 0;

    const deleteStmt = this.db.prepare('DELETE FROM silver_records WHERE id = ?');

    if (!dryRun) {
      this.db.exec('BEGIN TRANSACTION;');
    }

    try {
      for (const group of duplicateGroups) {
        const duplicates = this.getDuplicatesForSchool(group.school_slug, group.source_year);
        const bestRecord = this.chooseBestRecord(duplicates);
        const toRemove = duplicates.filter(r => r.id !== bestRecord.id);

        console.log(`📝 ${group.school_slug} (${group.source_year}):`);
        console.log(`   Keeping: ID ${bestRecord.id} (confidence: ${bestRecord.extraction_confidence}%, rank: ${bestRecord.national_rank || 'NULL'})`);
        console.log(`   Removing: ${toRemove.length} duplicates (IDs: ${toRemove.map(r => r.id).join(', ')})`);

        confidenceSum += bestRecord.extraction_confidence;

        if (!dryRun) {
          for (const record of toRemove) {
            deleteStmt.run(record.id);
            totalRemoved++;
          }
        } else {
          totalRemoved += toRemove.length;
        }

        processedGroups++;
        
        // Progress indicator
        if (processedGroups % 100 === 0) {
          console.log(`   ... processed ${processedGroups}/${duplicateGroups.length} duplicate groups`);
        }
      }

      if (!dryRun) {
        this.db.exec('COMMIT;');
        console.log('\n✅ Transaction committed successfully');
      }

      this.stats.avg_confidence_preserved = confidenceSum / processedGroups;

    } catch (error) {
      if (!dryRun) {
        this.db.exec('ROLLBACK;');
        console.log('\n❌ Transaction rolled back due to error');
      }
      throw error;
    }

    console.log(`\n📊 DEDUPLICATION ${dryRun ? 'PREVIEW' : 'RESULTS'}:`);
    console.log(`   Groups processed: ${processedGroups.toLocaleString()}`);
    console.log(`   Records ${dryRun ? 'would be' : ''} removed: ${totalRemoved.toLocaleString()}`);
    console.log(`   Average confidence preserved: ${this.stats.avg_confidence_preserved.toFixed(1)}%`);
  }

  /**
   * Validate deduplication results
   */
  validateResults(): void {
    console.log('\n🔍 VALIDATING DEDUPLICATION RESULTS\n');
    console.log('='.repeat(60));

    // Check for remaining duplicates
    const remainingDuplicates = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM (
        SELECT school_slug, source_year, COUNT(*) as dupe_count
        FROM silver_records 
        GROUP BY school_slug, source_year
        HAVING COUNT(*) > 1
      )
    `).get() as any;

    console.log(`🎯 Remaining duplicates: ${remainingDuplicates.count}`);

    // Check data integrity for key schools
    const keySchools = [
      'thomas-jefferson-high-school-for-science-and-technology-20461',
      'basis-tucson-north-140137',
      'academic-magnet-high-school-3841'
    ];

    console.log('\n📊 KEY SCHOOLS VALIDATION:');
    for (const slug of keySchools) {
      const record = this.db.prepare(`
        SELECT school_name, national_rank, extraction_confidence, source_year, COUNT(*) as record_count
        FROM silver_records 
        WHERE school_slug = ?
        GROUP BY school_slug, source_year
      `).get(slug) as any;

      if (record) {
        console.log(`   ${record.school_name}: #${record.national_rank || 'NULL'} (${record.extraction_confidence}% confidence, ${record.record_count} records)`);
      } else {
        console.log(`   ${slug}: NOT FOUND`);
      }
    }

    // Final counts
    const finalStats = this.db.prepare(`
      SELECT 
        source_year,
        COUNT(*) as total_records,
        COUNT(DISTINCT school_slug) as unique_schools
      FROM silver_records 
      GROUP BY source_year
      ORDER BY source_year
    `).all() as any[];

    console.log('\n📈 FINAL RECORD COUNTS:');
    for (const row of finalStats) {
      const perfect = row.total_records === row.unique_schools ? '✅' : '❌';
      console.log(`   ${row.source_year}: ${row.total_records.toLocaleString()} records, ${row.unique_schools.toLocaleString()} unique schools ${perfect}`);
    }
  }

  /**
   * Generate comprehensive report
   */
  generateReport(): void {
    const elapsed = Date.now() - this.stats.start_time;
    
    console.log('\n📋 DEDUPLICATION REPORT\n');
    console.log('='.repeat(80));
    
    console.log(`🎯 RESULTS:`);
    console.log(`   Schools affected: ${this.stats.schools_affected.toLocaleString()}`);
    console.log(`   Records removed: ${this.stats.records_to_remove.toLocaleString()}`);
    console.log(`   Records preserved: ${this.stats.records_to_preserve.toLocaleString()}`);
    console.log(`   Average confidence preserved: ${this.stats.avg_confidence_preserved.toFixed(1)}%`);
    
    console.log(`\n⏱️  PERFORMANCE:`);
    console.log(`   Total time: ${Math.round(elapsed / 1000)} seconds`);
    console.log(`   Processing rate: ${(this.stats.schools_affected / (elapsed / 1000)).toFixed(1)} schools/second`);
    
    console.log(`\n🔧 ROOT CAUSE RESOLUTION:`);
    console.log(`   Issue: Multiple Bronze records per school creating Silver duplicates`);
    console.log(`   Solution: Preserve highest confidence record per school-year`);
    console.log(`   Future prevention: Implement unique constraints in Silver schema`);
  }

  close(): void {
    this.db.close();
  }
}

// Main execution
async function main() {
  const dedup = new SilverDeduplication();
  
  try {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--execute');
    
    if (dryRun) {
      console.log('🧪 Running in DRY RUN mode. Use --execute to perform actual deduplication.\n');
    }
    
    // Step 1: Analyze the problem
    dedup.analyzeDuplication();
    
    // Step 2: Remove duplicates (dry run or execute)
    dedup.removeDuplicates(dryRun);
    
    // Step 3: Validate results (only if executed)
    if (!dryRun) {
      dedup.validateResults();
      dedup.generateReport();
      
      console.log('\n🎉 SILVER LAYER DEDUPLICATION COMPLETED SUCCESSFULLY!');
      console.log('✨ Database integrity restored - ready for Gold layer development');
    } else {
      console.log('\n📋 DRY RUN COMPLETED - Run with --execute to perform deduplication');
    }
    
  } catch (error) {
    console.error('❌ Deduplication failed:', error);
    process.exit(1);
    
  } finally {
    dedup.close();
  }
}

if (require.main === module) {
  main();
}