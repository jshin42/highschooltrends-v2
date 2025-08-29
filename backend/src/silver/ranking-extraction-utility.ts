import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import { CSSExtractionMethod } from './css-extraction-method';
import { ExtractionContext } from './types';

export interface ExtractionResult {
  success: boolean;
  oldRank: number | null;
  newRank: number | null;
  confidence: number;
  error?: string;
}

export interface ExtractionStats {
  total_schools: number;
  processed: number;
  successful_fixes: number;
  failed_extractions: number;
  ranking_updates: number;
  start_time: number;
}

/**
 * Consolidated ranking extraction utility that fixes the SQL schema mismatch bug.
 * 
 * Key fixes:
 * - Only updates existing database columns (national_rank, state_rank, extraction_confidence, updated_at)
 * - Prevents silent SQL failures from non-existent column references
 * - Provides consistent extraction interface for both batch and targeted operations
 */
export class RankingExtractionUtility {
  private db: Database.Database;
  private extractor: CSSExtractionMethod;

  constructor(dbPath: string = './data/silver.db') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    
    // Attach Bronze database for Bronze record lookups
    this.db.prepare('ATTACH DATABASE "./data/bronze.sqlite" AS bronze_db').run();
    
    this.extractor = new CSSExtractionMethod();
  }

  /**
   * Extract ranking for a single school using schema-safe SQL operations
   */
  async extractSingleSchool(schoolSlug: string, sourceYear: number): Promise<ExtractionResult> {
    try {
      // Get Silver record
      const silverRecord = this.db.prepare(`
        SELECT * FROM silver_records 
        WHERE school_slug = ? AND source_year = ?
        LIMIT 1
      `).get(schoolSlug, sourceYear) as any;
      
      if (!silverRecord) {
        return {
          success: false,
          oldRank: null,
          newRank: null,
          confidence: 0,
          error: 'Silver record not found'
        };
      }
      
      // Get Bronze record
      const bronzeRecord = this.db.prepare(`
        SELECT * FROM bronze_db.bronze_records 
        WHERE id = ?
      `).get(silverRecord.bronze_record_id) as any;
      
      if (!bronzeRecord || !existsSync(bronzeRecord.file_path)) {
        return {
          success: false,
          oldRank: silverRecord.national_rank,
          newRank: null,
          confidence: 0,
          error: 'Bronze record not found or file missing'
        };
      }
      
      // Load HTML content
      const htmlContent = readFileSync(bronzeRecord.file_path, 'utf8');
      
      // Create extraction context
      const context: ExtractionContext = {
        bronzeRecord: bronzeRecord,
        schoolSlug: schoolSlug,
        sourceYear: sourceYear,
        fileContent: htmlContent,
        domDocument: null
      };
      
      // Extract rankings using CSS method
      const extractionResult = await this.extractor.extract(htmlContent, context);
      
      const oldRank = silverRecord.national_rank;
      const newRank = extractionResult.data.national_rank || null;
      
      // FIXED UPDATE: Only update columns that exist in the database schema
      const updateQuery = this.db.prepare(`
        UPDATE silver_records 
        SET 
          national_rank = ?,
          state_rank = ?,
          extraction_confidence = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE school_slug = ? AND source_year = ?
      `);
      
      const result = updateQuery.run(
        extractionResult.data.national_rank,
        extractionResult.data.state_rank,
        extractionResult.confidence,
        schoolSlug,
        sourceYear
      );
      
      return {
        success: result.changes > 0,
        oldRank: oldRank,
        newRank: newRank,
        confidence: extractionResult.confidence
      };
      
    } catch (error) {
      return {
        success: false,
        oldRank: null,
        newRank: null,
        confidence: 0,
        error: `Extraction failed: ${error}`
      };
    }
  }

  /**
   * Get all schools that need ranking fixes (have NULL national_rank)
   */
  getSchoolsNeedingFix(limit?: number): Array<{
    id: number;
    school_slug: string;
    source_year: number;
    bronze_record_id: number;
    school_name: string;
  }> {
    const query = `
      SELECT id, school_slug, source_year, bronze_record_id, school_name
      FROM silver_records 
      WHERE national_rank IS NULL
      ORDER BY source_year DESC, school_slug
      ${limit ? `LIMIT ${limit}` : ''}
    `;
    
    return this.db.prepare(query).all() as any[];
  }

  /**
   * Process schools in batches with progress monitoring
   */
  async processBatch(
    schools: any[], 
    onProgress?: (processed: number, total: number, successCount: number) => void
  ): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [];
    let successCount = 0;

    for (let i = 0; i < schools.length; i++) {
      const school = schools[i];
      const result = await this.extractSingleSchool(school.school_slug, school.source_year);
      
      results.push(result);
      
      if (result.success) {
        successCount++;
      }
      
      // Call progress callback if provided
      if (onProgress) {
        onProgress(i + 1, schools.length, successCount);
      }
    }

    return results;
  }

  /**
   * Validate key schools to ensure extraction accuracy
   */
  async validateKeySchools(): Promise<void> {
    console.log('🔍 VALIDATION: Checking Top Schools\n');
    console.log('-'.repeat(50));
    
    // Check key schools we expect to have high rankings
    const keySchools = [
      'basis-tucson-north-140137',
      'thomas-jefferson-high-school-for-science-and-technology-20461',
      'academic-magnet-high-school-3841',
      'international-academy-85151',
      'payton-college-preparatory-high-school-6604'
    ];
    
    for (const slug of keySchools) {
      const record = this.db.prepare(`
        SELECT school_name, national_rank, state_rank, source_year
        FROM silver_records 
        WHERE school_slug = ? AND source_year = 2025
        LIMIT 1
      `).get(slug) as any;
      
      if (record) {
        console.log(`${record.school_name}: #${record.national_rank || 'NULL'} national, #${record.state_rank || 'NULL'} state`);
      }
    }
  }

  close(): void {
    this.db.close();
  }
}