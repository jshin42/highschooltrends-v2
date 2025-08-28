import { 
  ConfidenceScorer, 
  FieldConfidence, 
  SilverRecord, 
  ExtractionMethod,
  ExtractionError 
} from './types';
import { StructuredLogger } from '../common/logger';

export class SilverConfidenceScorer implements ConfidenceScorer {
  private logger: StructuredLogger;

  // Base confidence scores by extraction method
  private static readonly METHOD_BASE_SCORES = {
    css_selector: 90,
    regex_pattern: 75,
    manual_rule: 60,
    fallback_heuristic: 40
  };

  // Field importance weights for overall confidence calculation
  private static readonly FIELD_WEIGHTS = {
    school_name: 0.25,      // Critical field
    rankings: 0.20,         // Important for filtering
    academics: 0.20,        // Core performance data
    demographics: 0.15,     // Valuable contextual data
    location: 0.10,         // Useful for mapping
    enrollment_data: 0.10   // Basic school size info
  };

  // Expected data ranges for validation
  private static readonly VALIDATION_RANGES = {
    enrollment: { min: 1, max: 50000 },
    national_rank: { min: 1, max: 50000 },
    state_rank: { min: 1, max: 5000 },
    percentage: { min: 0, max: 100 },
    teacher_ratio: { min: 1, max: 50 }
  };

  constructor() {
    this.logger = StructuredLogger.getInstance().withContext({ component: 'SilverConfidenceScorer' });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  scoreExtraction(
    extractedData: Partial<SilverRecord>,
    extractionMethods: Record<string, ExtractionMethod>
  ): {
    overallConfidence: number;
    fieldConfidences: FieldConfidence;
  } {
    const timer = this.logger.startTimer('score_extraction', {
      extracted_fields: Object.keys(extractedData).length,
      methods_used: Object.keys(extractionMethods).length
    });

    try {
      // Calculate field-level confidences
      const fieldConfidences = this.calculateFieldConfidences(extractedData, extractionMethods);
      
      // Calculate weighted overall confidence
      const overallConfidence = this.calculateOverallConfidence(fieldConfidences);

      timer.end('Confidence scoring completed', {
        overall_confidence: overallConfidence,
        field_confidences: fieldConfidences
      });

      return {
        overallConfidence,
        fieldConfidences
      };

    } catch (error) {
      this.logger.error('Confidence scoring failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private calculateFieldConfidences(
    extractedData: Partial<SilverRecord>,
    extractionMethods: Record<string, ExtractionMethod>
  ): FieldConfidence {
    return {
      school_name: this.scoreSchoolNameField(extractedData, extractionMethods),
      rankings: this.scoreRankingsField(extractedData, extractionMethods),
      academics: this.scoreAcademicsField(extractedData, extractionMethods),
      demographics: this.scoreDemographicsField(extractedData, extractionMethods),
      location: this.scoreLocationField(extractedData, extractionMethods),
      enrollment_data: this.scoreEnrollmentField(extractedData, extractionMethods)
    };
  }

  private scoreSchoolNameField(
    data: Partial<SilverRecord>,
    methods: Record<string, ExtractionMethod>
  ): number {
    if (!data.school_name) return 0;

    let confidence = this.getMethodBaseScore(methods.school_name);

    // Quality checks
    const name = data.school_name;
    
    // Length check (reasonable school names are 5-100 characters)
    if (name.length < 5) confidence -= 20;
    if (name.length > 100) confidence -= 10;
    
    // Contains "High School" or similar
    if (/high\s+school|secondary|academy|preparatory/i.test(name)) {
      confidence += 10;
    }
    
    // Avoid generic names
    if (/^(school|high school|academy)$/i.test(name.trim())) {
      confidence -= 30;
    }
    
    // Check for proper capitalization
    if (name === name.toUpperCase() || name === name.toLowerCase()) {
      confidence -= 5;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  private scoreRankingsField(
    data: Partial<SilverRecord>,
    methods: Record<string, ExtractionMethod>
  ): number {
    const hasNational = data.national_rank !== null && data.national_rank !== undefined;
    const hasState = data.state_rank !== null && data.state_rank !== undefined;

    if (!hasNational && !hasState) return 0;

    let confidence = 0;
    let fieldCount = 0;

    if (hasNational) {
      let nationalConfidence = this.getMethodBaseScore(methods.national_rank);
      
      // Validate range
      const rank = data.national_rank!;
      if (rank >= 1 && rank <= 50000) {
        nationalConfidence += 10;
      } else {
        nationalConfidence -= 20;
      }
      
      // Higher confidence for more prestigious rankings
      if (rank <= 100) nationalConfidence += 5;
      if (rank <= 1000) nationalConfidence += 3;

      confidence += nationalConfidence;
      fieldCount++;
    }

    if (hasState) {
      let stateConfidence = this.getMethodBaseScore(methods.state_rank);
      
      // Validate range
      const rank = data.state_rank!;
      if (rank >= 1 && rank <= 5000) {
        stateConfidence += 10;
      } else {
        stateConfidence -= 20;
      }

      confidence += stateConfidence;
      fieldCount++;
    }

    // Consistency check: national rank should generally be higher than state rank
    if (hasNational && hasState) {
      if (data.national_rank! > data.state_rank!) {
        confidence += 5; // Bonus for logical consistency
      } else {
        confidence -= 10; // Penalty for inconsistency
      }
    }

    return Math.max(0, Math.min(100, confidence / Math.max(fieldCount, 1)));
  }

  private scoreAcademicsField(
    data: Partial<SilverRecord>,
    methods: Record<string, ExtractionMethod>
  ): number {
    const academicFields = [
      'ap_participation_rate', 'ap_pass_rate', 'math_proficiency',
      'reading_proficiency', 'science_proficiency', 'graduation_rate',
      'college_readiness_index'
    ];

    let totalConfidence = 0;
    let fieldCount = 0;

    for (const field of academicFields) {
      const value = (data as any)[field];
      if (value !== null && value !== undefined) {
        let fieldConfidence = this.getMethodBaseScore(methods[field]);

        // Validate percentage ranges
        if (this.isPercentageField(field)) {
          if (value >= 0 && value <= 100) {
            fieldConfidence += 10;
          } else {
            fieldConfidence -= 20;
          }

          // Reasonable ranges for specific fields
          if (field === 'graduation_rate' && value >= 50 && value <= 100) {
            fieldConfidence += 5;
          }
          if (field === 'ap_participation_rate' && value >= 0 && value <= 80) {
            fieldConfidence += 5;
          }
        }

        totalConfidence += Math.max(0, Math.min(100, fieldConfidence));
        fieldCount++;
      }
    }

    return fieldCount > 0 ? totalConfidence / fieldCount : 0;
  }

  private scoreDemographicsField(
    data: Partial<SilverRecord>,
    methods: Record<string, ExtractionMethod>
  ): number {
    const demographicFields = [
      'white_pct', 'asian_pct', 'hispanic_pct', 'black_pct',
      'american_indian_pct', 'two_or_more_pct', 'female_pct', 'male_pct'
    ];

    let totalConfidence = 0;
    let fieldCount = 0;
    let racePercentageSum = 0;
    let genderPercentageSum = 0;

    for (const field of demographicFields) {
      const value = (data as any)[field];
      if (value !== null && value !== undefined) {
        let fieldConfidence = this.getMethodBaseScore(methods[field]);

        // Validate percentage range
        if (value >= 0 && value <= 100) {
          fieldConfidence += 10;
        } else {
          fieldConfidence -= 20;
        }

        // Track totals for consistency checks
        if (field.endsWith('_pct') && !field.includes('female') && !field.includes('male')) {
          racePercentageSum += value;
        }
        if (field === 'female_pct' || field === 'male_pct') {
          genderPercentageSum += value;
        }

        totalConfidence += Math.max(0, Math.min(100, fieldConfidence));
        fieldCount++;
      }
    }

    let avgConfidence = fieldCount > 0 ? totalConfidence / fieldCount : 0;

    // Consistency bonuses/penalties
    if (racePercentageSum > 0) {
      if (racePercentageSum >= 95 && racePercentageSum <= 105) {
        avgConfidence += 10; // Race percentages sum to ~100%
      } else if (racePercentageSum > 110 || racePercentageSum < 80) {
        avgConfidence -= 15; // Significantly off from 100%
      }
    }

    if (genderPercentageSum > 0) {
      if (genderPercentageSum >= 95 && genderPercentageSum <= 105) {
        avgConfidence += 5; // Gender percentages sum to ~100%
      } else {
        avgConfidence -= 10;
      }
    }

    return Math.max(0, Math.min(100, avgConfidence));
  }

  private scoreLocationField(
    data: Partial<SilverRecord>,
    methods: Record<string, ExtractionMethod>
  ): number {
    const locationFields = ['address_street', 'address_city', 'address_state', 'address_zip', 'phone', 'website'];
    
    let totalConfidence = 0;
    let fieldCount = 0;

    for (const field of locationFields) {
      const value = (data as any)[field];
      if (value !== null && value !== undefined) {
        let fieldConfidence = this.getMethodBaseScore(methods[field]);

        // Field-specific validation
        switch (field) {
          case 'address_state':
            if (value.length === 2 && /^[A-Z]{2}$/.test(value)) {
              fieldConfidence += 15; // Valid state code
            } else if (value.length > 2 && value.length <= 20) {
              fieldConfidence += 5; // Full state name
            }
            break;

          case 'address_zip':
            if (/^\d{5}(-\d{4})?$/.test(value)) {
              fieldConfidence += 15; // Valid ZIP code
            }
            break;

          case 'phone':
            if (/^\(\d{3}\)\s\d{3}-\d{4}$/.test(value) || /^\d{3}-\d{3}-\d{4}$/.test(value)) {
              fieldConfidence += 10; // Well-formatted phone
            }
            break;

          case 'website':
            if (/^https?:\/\//.test(value)) {
              fieldConfidence += 10; // Has protocol
            }
            break;

          case 'address_city':
            if (value.length >= 2 && value.length <= 50) {
              fieldConfidence += 5; // Reasonable city name length
            }
            break;

          case 'address_street':
            if (value.length >= 5 && value.length <= 100) {
              fieldConfidence += 5; // Reasonable street address length
            }
            break;
        }

        totalConfidence += Math.max(0, Math.min(100, fieldConfidence));
        fieldCount++;
      }
    }

    return fieldCount > 0 ? totalConfidence / fieldCount : 0;
  }

  private scoreEnrollmentField(
    data: Partial<SilverRecord>,
    methods: Record<string, ExtractionMethod>
  ): number {
    const enrollmentFields = ['enrollment', 'student_teacher_ratio', 'full_time_teachers'];
    
    let totalConfidence = 0;
    let fieldCount = 0;

    for (const field of enrollmentFields) {
      const value = (data as any)[field];
      if (value !== null && value !== undefined) {
        let fieldConfidence = this.getMethodBaseScore(methods[field]);

        // Field-specific validation
        switch (field) {
          case 'enrollment':
            if (typeof value === 'number' && value >= 10 && value <= 10000) {
              fieldConfidence += 10; // Reasonable enrollment range
            } else {
              fieldConfidence -= 15;
            }
            break;

          case 'student_teacher_ratio':
            // Parse ratio like "15:1" or "15.5:1"
            if (typeof value === 'string') {
              const ratioMatch = value.match(/(\d+(?:\.\d+)?)\s*:\s*1/);
              if (ratioMatch) {
                const ratio = parseFloat(ratioMatch[1]);
                if (ratio >= 8 && ratio <= 35) {
                  fieldConfidence += 10; // Reasonable ratio
                }
              }
            }
            break;

          case 'full_time_teachers':
            if (typeof value === 'number' && value >= 1 && value <= 1000) {
              fieldConfidence += 10; // Reasonable teacher count
            } else {
              fieldConfidence -= 15;
            }
            break;
        }

        totalConfidence += Math.max(0, Math.min(100, fieldConfidence));
        fieldCount++;
      }
    }

    // Cross-field consistency check
    if (data.enrollment && data.full_time_teachers) {
      const ratio = data.enrollment / data.full_time_teachers;
      if (ratio >= 8 && ratio <= 35) {
        totalConfidence += 5; // Consistent enrollment-to-teacher ratio
      }
    }

    return fieldCount > 0 ? totalConfidence / fieldCount : 0;
  }

  private calculateOverallConfidence(fieldConfidences: FieldConfidence): number {
    let weightedSum = 0;
    let totalWeight = 0;

    Object.entries(SilverConfidenceScorer.FIELD_WEIGHTS).forEach(([field, weight]) => {
      const confidence = (fieldConfidences as any)[field];
      if (confidence > 0) {
        weightedSum += confidence * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  private getMethodBaseScore(method: ExtractionMethod | undefined): number {
    if (!method) return 0;
    return SilverConfidenceScorer.METHOD_BASE_SCORES[method] || 0;
  }

  private isPercentageField(fieldName: string): boolean {
    return fieldName.includes('_rate') || 
           fieldName.includes('_pct') || 
           fieldName.includes('proficiency') ||
           fieldName.includes('participation');
  }

  /**
   * Get confidence level description
   */
  static getConfidenceLevelDescription(confidence: number): string {
    if (confidence >= 90) return 'Very High';
    if (confidence >= 80) return 'High';
    if (confidence >= 70) return 'Good';
    if (confidence >= 60) return 'Fair';
    if (confidence >= 40) return 'Low';
    return 'Very Low';
  }

  /**
   * Determine if record meets minimum confidence threshold
   */
  static meetsMinimumThreshold(
    fieldConfidences: FieldConfidence,
    overallConfidence: number,
    threshold: number = 60
  ): boolean {
    // Overall confidence must meet threshold
    if (overallConfidence < threshold) return false;

    // Critical fields must have reasonable confidence
    if (fieldConfidences.school_name < 40) return false; // School name is critical
    
    // At least one other category must have decent confidence
    const otherCategories = [
      fieldConfidences.rankings,
      fieldConfidences.academics,
      fieldConfidences.demographics,
      fieldConfidences.location,
      fieldConfidences.enrollment_data
    ];
    
    const decentCategories = otherCategories.filter(c => c >= 50);
    return decentCategories.length >= 1;
  }
}