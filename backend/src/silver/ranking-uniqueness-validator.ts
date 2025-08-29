/**
 * Ranking Uniqueness Validator
 * 
 * Prevents impossible duplicate ranking scenarios by validating uniqueness
 * constraints during the extraction process. This addresses the core issue
 * where 78 schools were assigned the same exact rank.
 */

import Database from 'better-sqlite3';
import { ExtractionContext, SilverRecord } from './types';

interface RankingConflict {
  rank: number;
  year: number;
  existing_schools: Array<{
    id: number;
    school_slug: string;
    school_name: string;
  }>;
  conflicting_school: {
    school_slug: string;
    school_name: string;
  };
  conflict_type: 'exact_national_duplicate' | 'state_duplicate_in_same_state';
  severity: 'critical' | 'warning';
}

interface ValidationResult {
  is_valid: boolean;
  conflicts: RankingConflict[];
  suggested_actions: string[];
  confidence_adjustment: number; // How much to reduce confidence due to conflicts
}

export class RankingUniquenessValidator {
  private db: Database.Database;
  
  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  /**
   * Validate that a proposed ranking doesn't violate uniqueness constraints
   */
  async validateRankingUniqueness(
    extractedData: Partial<SilverRecord>,
    context: ExtractionContext
  ): Promise<ValidationResult> {
    const conflicts: RankingConflict[] = [];
    let confidenceAdjustment = 0;

    // Rule 1: National rankings in Bucket 1 (1-13427) must be unique within year
    if (extractedData.national_rank && 
        extractedData.national_rank >= 1 && 
        extractedData.national_rank <= 13427) {
      
      const nationalConflict = await this.checkNationalRankingConflict(
        extractedData.national_rank,
        context.sourceYear,
        context.schoolSlug,
        extractedData.school_name || context.schoolSlug
      );

      if (nationalConflict) {
        conflicts.push(nationalConflict);
        confidenceAdjustment -= 50; // Major confidence penalty
      }
      
      // Rule 3: REASONABLENESS CHECK - No unreasonable clustering in Bucket 1
      // Prevent scenarios like "78 schools tied for rank #21"
      const reasonableness = await this.checkRankingReasonableness(
        extractedData.national_rank,
        context.sourceYear,
        context.schoolSlug,
        extractedData.school_name || context.schoolSlug
      );
      
      if (!reasonableness.is_reasonable) {
        conflicts.push({
          rank: extractedData.national_rank,
          year: context.sourceYear,
          existing_schools: [], // Not applicable for reasonableness check
          conflicting_school: {
            school_slug: context.schoolSlug,
            school_name: extractedData.school_name || context.schoolSlug
          },
          conflict_type: 'exact_national_duplicate',
          severity: 'critical'
        });
        confidenceAdjustment -= 40; // Major penalty for unreasonable clustering
      }
    }

    // Rule 2: State rankings should be unique within same state/year
    if (extractedData.state_rank && extractedData.address_state) {
      const stateConflict = await this.checkStateRankingConflict(
        extractedData.state_rank,
        extractedData.address_state,
        context.sourceYear,
        context.schoolSlug,
        extractedData.school_name || context.schoolSlug
      );

      if (stateConflict) {
        conflicts.push(stateConflict);
        confidenceAdjustment -= 30; // Moderate confidence penalty
      }
    }

    // Generate suggested actions
    const suggestedActions: string[] = [];
    
    if (conflicts.length > 0) {
      suggestedActions.push('REJECT extraction - ranking conflicts detected');
      suggestedActions.push('Investigate CSS selector specificity issues');
      
      conflicts.forEach(conflict => {
        if (conflict.conflict_type === 'exact_national_duplicate') {
          suggestedActions.push(`National rank ${conflict.rank} already assigned - use alternative extraction method`);
        } else if (conflict.conflict_type === 'state_duplicate_in_same_state') {
          suggestedActions.push(`State rank ${conflict.rank} duplicate in same state - verify extraction accuracy`);
        }
      });
    } else {
      suggestedActions.push('ACCEPT extraction - no ranking conflicts detected');
    }

    return {
      is_valid: conflicts.length === 0,
      conflicts,
      suggested_actions: suggestedActions,
      confidence_adjustment: confidenceAdjustment
    };
  }

  /**
   * Check for national ranking conflicts within the same year
   */
  private async checkNationalRankingConflict(
    rank: number,
    year: number,
    currentSchoolSlug: string,
    currentSchoolName: string
  ): Promise<RankingConflict | null> {
    
    const existingSchools = this.db.prepare(`
      SELECT id, school_slug, school_name
      FROM silver_records 
      WHERE national_rank = ? 
        AND source_year = ?
        AND school_slug != ?
      LIMIT 10  -- Limit to avoid memory issues
    `).all(rank, year, currentSchoolSlug) as any[];

    if (existingSchools.length > 0) {
      return {
        rank,
        year,
        existing_schools: existingSchools,
        conflicting_school: {
          school_slug: currentSchoolSlug,
          school_name: currentSchoolName
        },
        conflict_type: 'exact_national_duplicate',
        severity: 'critical'
      };
    }

    return null;
  }

  /**
   * Check for state ranking conflicts within the same state/year
   */
  private async checkStateRankingConflict(
    rank: number,
    state: string,
    year: number,
    currentSchoolSlug: string,
    currentSchoolName: string
  ): Promise<RankingConflict | null> {
    
    const existingSchools = this.db.prepare(`
      SELECT id, school_slug, school_name
      FROM silver_records 
      WHERE state_rank = ? 
        AND address_state = ?
        AND source_year = ?
        AND school_slug != ?
      LIMIT 5  -- State duplicates less critical, smaller limit
    `).all(rank, state, year, currentSchoolSlug) as any[];

    if (existingSchools.length > 0) {
      return {
        rank,
        year,
        existing_schools: existingSchools,
        conflicting_school: {
          school_slug: currentSchoolSlug,
          school_name: currentSchoolName
        },
        conflict_type: 'state_duplicate_in_same_state',
        severity: 'warning'
      };
    }

    return null;
  }

  /**
   * Check if a ranking assignment is reasonable based on clustering patterns
   * Prevents impossible scenarios like "78 schools tied for rank #21"
   */
  private async checkRankingReasonableness(
    rank: number,
    year: number,
    currentSchoolSlug: string,
    currentSchoolName: string
  ): Promise<{
    is_reasonable: boolean;
    reason?: string;
    existing_count: number;
  }> {
    
    // Get current count of schools at this exact rank
    const exactRankCount = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM silver_records 
      WHERE national_rank = ? 
        AND source_year = ?
        AND school_slug != ?
    `).get(rank, year, currentSchoolSlug) as any;

    // Business Rule 1: Bucket 1 exact ranks should be unique (max 1 school per rank)
    // Exception: Very high ranks (>10,000) might have ties due to data limitations
    if (rank <= 13427) { // Bucket 1 - must be unique
      if (exactRankCount.count > 0) {
        return {
          is_reasonable: false,
          reason: `Bucket 1 rank #${rank} must be unique - already assigned to ${exactRankCount.count} school(s)`,
          existing_count: exactRankCount.count
        };
      }
    }

    // Business Rule 2: Check for unreasonable clustering patterns
    // Look at a 20-rank window around this rank to detect suspicious clustering
    const clusterWindow = 20;
    const windowStart = Math.max(1, rank - clusterWindow);
    const windowEnd = Math.min(50000, rank + clusterWindow);

    const windowClustering = this.db.prepare(`
      SELECT national_rank, COUNT(*) as count
      FROM silver_records 
      WHERE national_rank BETWEEN ? AND ?
        AND source_year = ?
        AND school_slug != ?
      GROUP BY national_rank
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `).all(windowStart, windowEnd, year, currentSchoolSlug) as any[];

    // Flag if there are multiple high-clustering ranks in the window
    const highClusteringRanks = windowClustering.filter(w => w.count >= 5);
    if (highClusteringRanks.length >= 3) {
      return {
        is_reasonable: false,
        reason: `Suspicious clustering detected: ${highClusteringRanks.length} ranks in window ${windowStart}-${windowEnd} have 5+ schools each`,
        existing_count: exactRankCount.count
      };
    }

    // Business Rule 3: No rank should have more than 10 schools (even in Bucket 2/3)
    // This catches extreme cases like "78 schools tied for rank #21"
    const maxReasonablePerRank = rank <= 13427 ? 1 : 10; // Bucket 1: 1, Bucket 2/3: 10
    
    if (exactRankCount.count >= maxReasonablePerRank) {
      return {
        is_reasonable: false,
        reason: `Rank #${rank} already has ${exactRankCount.count} schools - exceeds maximum reasonable limit of ${maxReasonablePerRank}`,
        existing_count: exactRankCount.count
      };
    }

    // Business Rule 4: Check for systematic patterns indicating extraction errors
    // Look for ranks that appear suspiciously often (like 13,427 did)
    const globalRankFrequency = this.db.prepare(`
      SELECT COUNT(*) as total_occurrences
      FROM silver_records 
      WHERE national_rank = ?
    `).get(rank) as any;

    // If this rank appears more than 50 times across all years, it's suspicious
    if (globalRankFrequency.total_occurrences > 50) {
      return {
        is_reasonable: false,
        reason: `Rank #${rank} appears ${globalRankFrequency.total_occurrences} times across all data - indicates systematic extraction error`,
        existing_count: exactRankCount.count
      };
    }

    // All checks passed - ranking assignment is reasonable
    return {
      is_reasonable: true,
      existing_count: exactRankCount.count
    };
  }

  /**
   * Pre-process validation: Check for systematic issues before extraction batch
   */
  async validateExtractionBatch(schoolSlugs: string[], year: number): Promise<{
    suspicious_patterns: string[];
    high_risk_schools: string[];
    recommendations: string[];
  }> {
    const suspiciousPatterns: string[] = [];
    const highRiskSchools: string[] = [];
    const recommendations: string[] = [];

    // Check for schools that historically have ranking conflicts
    const conflictProneSchools = this.db.prepare(`
      SELECT school_slug, COUNT(DISTINCT national_rank) as rank_variations
      FROM silver_records 
      WHERE school_slug IN (${schoolSlugs.map(() => '?').join(',')})
        AND national_rank IS NOT NULL
      GROUP BY school_slug
      HAVING rank_variations > 1
      ORDER BY rank_variations DESC
    `).all(...schoolSlugs) as any[];

    if (conflictProneSchools.length > 0) {
      suspiciousPatterns.push(`${conflictProneSchools.length} schools have inconsistent ranking history`);
      highRiskSchools.push(...conflictProneSchools.map(s => s.school_slug));
    }

    // Check for existing duplicate clusters that might indicate selector issues
    const existingClusters = this.db.prepare(`
      SELECT national_rank, COUNT(*) as duplicate_count
      FROM silver_records 
      WHERE source_year = ?
        AND national_rank IS NOT NULL 
        AND national_rank <= 13427  -- Bucket 1 only
      GROUP BY national_rank
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 5
    `).all(year) as any[];

    if (existingClusters.length > 0) {
      suspiciousPatterns.push(`${existingClusters.length} existing duplicate clusters in year ${year}`);
      recommendations.push('Investigate CSS selectors for duplicate-prone rank ranges');
      
      existingClusters.forEach(cluster => {
        recommendations.push(`Priority fix: Rank #${cluster.national_rank} has ${cluster.duplicate_count} duplicates`);
      });
    }

    // General recommendations
    if (highRiskSchools.length === 0 && suspiciousPatterns.length === 0) {
      recommendations.push('Batch appears clean - proceed with normal extraction');
    } else {
      recommendations.push('Enable enhanced validation logging for this batch');
      recommendations.push('Use secondary validation methods for high-risk schools');
    }

    return {
      suspicious_patterns: suspiciousPatterns,
      high_risk_schools: highRiskSchools,
      recommendations
    };
  }

  /**
   * Post-extraction validation: Verify no duplicates were introduced
   */
  async validatePostExtraction(year: number): Promise<{
    new_duplicates_detected: boolean;
    duplicate_groups: Array<{ rank: number; count: number; schools: string[] }>;
    integrity_score: number; // 0-100
  }> {
    
    // Find all duplicate groups in Bucket 1 for this year
    const duplicateGroups = this.db.prepare(`
      SELECT 
        national_rank,
        COUNT(*) as count,
        GROUP_CONCAT(school_slug, '|') as schools
      FROM silver_records 
      WHERE source_year = ?
        AND national_rank IS NOT NULL 
        AND national_rank <= 13427  -- Bucket 1 only
      GROUP BY national_rank
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `).all(year) as any[];

    const formattedGroups = duplicateGroups.map(group => ({
      rank: group.national_rank,
      count: group.count,
      schools: group.schools.split('|')
    }));

    // Calculate integrity score
    const totalBucket1Schools = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM silver_records 
      WHERE source_year = ? AND national_rank IS NOT NULL AND national_rank <= 13427
    `).get(year) as any;

    const duplicateCount = duplicateGroups.reduce((sum, group) => sum + group.count, 0);
    const integrityScore = Math.max(0, 100 - (duplicateCount / totalBucket1Schools.count * 100));

    return {
      new_duplicates_detected: duplicateGroups.length > 0,
      duplicate_groups: formattedGroups,
      integrity_score: Math.round(integrityScore)
    };
  }

  /**
   * Emergency deduplication: Remove duplicate rankings using business rules
   */
  async emergencyDeduplication(year: number): Promise<{
    duplicates_resolved: number;
    schools_updated: number;
    actions_taken: string[];
  }> {
    const actionsTaken: string[] = [];
    let duplicatesResolved = 0;
    let schoolsUpdated = 0;

    // Find all duplicate groups
    const duplicateGroups = this.db.prepare(`
      SELECT 
        national_rank,
        GROUP_CONCAT(id, '|') as ids,
        GROUP_CONCAT(school_slug, '|') as slugs,
        COUNT(*) as count
      FROM silver_records 
      WHERE source_year = ?
        AND national_rank IS NOT NULL 
        AND national_rank <= 13427  -- Bucket 1 only
      GROUP BY national_rank
      HAVING COUNT(*) > 1
    `).all(year) as any[];

    for (const group of duplicateGroups) {
      const ids = group.ids.split('|').map(Number);
      const slugs = group.slugs.split('|');
      
      // Keep the first school with this rank, nullify others
      const [keepId, ...removeIds] = ids;
      const [keepSlug, ...removeSlugs] = slugs;

      // Update conflicting schools to have null national_rank
      const updateQuery = this.db.prepare(`
        UPDATE silver_records 
        SET national_rank = NULL,
            national_rank_precision = NULL,
            national_rank_end = NULL
        WHERE id IN (${removeIds.map(() => '?').join(',')})
      `);
      
      const result = updateQuery.run(...removeIds);
      
      schoolsUpdated += result.changes || 0;
      duplicatesResolved += 1;
      
      actionsTaken.push(`Rank ${group.national_rank}: Kept ${keepSlug}, nullified ${removeSlugs.join(', ')}`);
    }

    return {
      duplicates_resolved: duplicatesResolved,
      schools_updated: schoolsUpdated,
      actions_taken: actionsTaken
    };
  }

  close(): void {
    this.db.close();
  }
}