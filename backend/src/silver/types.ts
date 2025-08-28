/**
 * Silver Layer Type Definitions
 * 
 * The Silver layer handles structured data extraction from HTML files.
 * This is the second stage of our Bronze→Silver→Gold data pipeline.
 * 
 * Silver Layer extracts raw school data with confidence scoring and validation.
 */

import { BronzeRecord } from '../bronze/types';

/**
 * Raw extracted school data from HTML - before validation and normalization
 */
export interface SilverRecord {
  id: number;
  bronze_record_id: number;        // Foreign key to Bronze record
  school_slug: string;             // From Bronze record
  source_year: number;             // 2024 or 2025
  
  // Core School Information
  school_name: string | null;
  nces_id: string | null;          // National Center for Education Statistics ID
  grades_served: string | null;    // e.g., "9-12", "K-12"
  
  // Location Data  
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  phone: string | null;
  website: string | null;
  setting: string | null;          // e.g., "large suburb", "rural"
  
  // Enrollment and Staffing
  enrollment: number | null;
  student_teacher_ratio: string | null;  // e.g., "16:1"
  full_time_teachers: number | null;
  
  // Rankings (Enhanced to support ranges and precision indicators)
  national_rank: number | null;           // Primary rank (exact or range start)
  national_rank_end: number | null;       // Range end for Bucket 2 schools (#13,427-17,901)
  national_rank_precision: RankingPrecision | null;  // Exact, range, or estimated
  state_rank: number | null;              // Primary state rank
  state_rank_precision: RankingPrecision | null;     // Precision indicator for state rank
  
  // Unranked status tracking
  is_unranked: boolean | null;            // Explicitly marked as unranked
  unranked_reason: string | null;         // Reason for unranked status
  
  // Academic Performance
  ap_participation_rate: number | null;  // Percentage
  ap_pass_rate: number | null;          // Percentage
  math_proficiency: number | null;      // Percentage
  reading_proficiency: number | null;   // Percentage
  science_proficiency: number | null;   // Percentage
  graduation_rate: number | null;       // Percentage
  college_readiness_index: number | null;
  
  // Demographics (all percentages)
  white_pct: number | null;
  asian_pct: number | null;
  hispanic_pct: number | null;
  black_pct: number | null;
  american_indian_pct: number | null;
  two_or_more_pct: number | null;
  female_pct: number | null;
  male_pct: number | null;
  
  // Socioeconomic (often null in US News data)
  economically_disadvantaged_pct: number | null;
  free_lunch_pct: number | null;
  reduced_lunch_pct: number | null;
  
  // Processing metadata
  extraction_status: ExtractionStatus;
  extraction_confidence: number;    // 0-100 overall confidence score
  field_confidence: FieldConfidence;
  created_at: string;
  updated_at: string;
  processing_errors: ExtractionError[];
}

export type ExtractionStatus = 
  | 'pending'        // Ready for extraction
  | 'extracting'     // Currently being processed
  | 'extracted'      // Successfully extracted
  | 'failed'         // Extraction failed
  | 'partial';       // Partial extraction (some fields missing)

/**
 * Ranking precision indicators for enhanced parsing
 */
export type RankingPrecision = 
  | 'exact'          // Exact rank (Bucket 1: #1-13,426)
  | 'range'          // Range estimate (Bucket 2: #13,427-17,901)
  | 'estimated'      // ML estimated (Bucket 3: state-only or unranked)
  | 'state_only';    // Only has state ranking, no national

/**
 * Confidence scores for individual fields (0-100)
 */
export interface FieldConfidence {
  // High-level grouped confidences
  school_name: number;
  rankings: number;           // Combined national_rank + state_rank confidence
  academics: number;          // Combined academic performance metrics
  demographics: number;       // Combined demographic percentages
  location: number;           // Combined address fields
  enrollment_data: number;    // enrollment + student_teacher_ratio + teachers
  
  // Individual field confidences (optional for backward compatibility)
  national_rank?: number;
  state_rank?: number;
  ap_participation_rate?: number;
  ap_pass_rate?: number;
  math_proficiency?: number;
  reading_proficiency?: number;
  science_proficiency?: number;
  graduation_rate?: number;
  college_readiness_index?: number;
  white_pct?: number;
  asian_pct?: number;
  hispanic_pct?: number;
  black_pct?: number;
  american_indian_pct?: number;
  two_or_more_pct?: number;
  female_pct?: number;
  male_pct?: number;
  address_street?: number;
  address_city?: number;
  address_state?: number;
  address_zip?: number;
  phone?: number;
  website?: number;
  setting?: number;
  enrollment?: number;
  student_teacher_ratio?: number;
  full_time_teachers?: number;
}

export interface ExtractionError {
  field_name: string;
  error_type: ExtractionErrorType;
  error_message: string;
  extraction_method: ExtractionMethod;
  timestamp: string;
}

export type ExtractionErrorType = 
  | 'css_selector_failed'
  | 'regex_failed'
  | 'manual_rule_failed'
  | 'data_validation_failed'
  | 'parse_error'
  | 'missing_dom_element'
  | 'ambiguous_data';

export type ExtractionMethod = 
  | 'css_selector'
  | 'regex_pattern'
  | 'manual_rule'
  | 'fallback_heuristic';

/**
 * Abstract base class for all extraction methods
 */
export interface IExtractionMethod {
  extract(html: string, context: ExtractionContext): Promise<{
    data: Partial<SilverRecord>;
    confidence: number;
    fieldConfidences: Partial<FieldConfidence>;
    errors: ExtractionError[];
  }>;
}

/**
 * Multi-tier HTML extraction configuration
 */
export interface SilverExtractionPipeline {
  // Tier 1: CSS Selector Extraction
  cssSelectors: SchoolDataSelectors;
  
  // Tier 2: Regex Pattern Fallbacks  
  regexPatterns: ExtractionPatterns;
  
  // Tier 3: Manual Pattern Recognition
  manualRules: CustomExtractionRules;
  
  // Confidence scoring system
  confidenceScorer: ConfidenceScorer;
}

/**
 * CSS Selectors for structured data extraction
 */
export interface SchoolDataSelectors {
  // Basic school info
  school_name: string[];
  nces_id: string[];
  grades: string[];
  
  // Location selectors
  address: string[];
  city: string[];
  state: string[];
  zip: string[];
  phone: string[];
  website: string[];
  setting: string[];
  
  // Enrollment data
  enrollment: string[];
  student_teacher_ratio: string[];
  teachers: string[];
  
  // Rankings
  national_rank: string[];
  state_rank: string[];
  
  // Academic metrics
  ap_participation: string[];
  ap_pass_rate: string[];
  math_proficiency: string[];
  reading_proficiency: string[];
  science_proficiency: string[];
  graduation_rate: string[];
  college_readiness: string[];
  
  // Demographics
  demographics_section: string[];
  race_percentages: string[];
  gender_percentages: string[];
  economic_disadvantaged: string[];
}

/**
 * Regex patterns for fallback extraction
 */
export interface ExtractionPatterns {
  // Basic patterns
  school_name: RegExp[];
  enrollment_numbers: RegExp[];
  percentage_values: RegExp[];
  ranking_numbers: RegExp[];
  ratio_values: RegExp[];
  
  // Specific field patterns
  phone_numbers: RegExp[];
  addresses: RegExp[];
  grade_ranges: RegExp[];
  
  // Academic data patterns
  test_scores: RegExp[];
  graduation_rates: RegExp[];
  ap_data: RegExp[];
  
  // Demographic patterns
  race_demographics: RegExp[];
  gender_splits: RegExp[];
}

/**
 * Custom extraction rules for edge cases
 */
export interface CustomExtractionRules {
  // Rules for handling missing or malformed data
  enrollment_fallbacks: ExtractionRule[];
  ranking_disambiguation: ExtractionRule[];
  demographic_parsing: ExtractionRule[];
  address_normalization: ExtractionRule[];
  
  // Data validation rules
  data_quality_checks: ValidationRule[];
}

export interface ExtractionRule {
  name: string;
  description: string;
  condition: (html: string, context: ExtractionContext) => boolean;
  extract: (html: string, context: ExtractionContext) => any;
  confidence: number;  // Base confidence for this rule
}

export interface ValidationRule {
  name: string;
  validate: (data: Partial<SilverRecord>) => ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExtractionContext {
  bronzeRecord: BronzeRecord;
  schoolSlug: string;
  sourceYear: number;
  fileContent: string;
  domDocument: any | null; // Will be JSDOM Document in implementation
}

/**
 * Confidence scoring system
 */
export interface ConfidenceScorer {
  scoreExtraction(
    extractedData: Partial<SilverRecord>, 
    extractionMethods: Record<string, ExtractionMethod>
  ): {
    overallConfidence: number;
    fieldConfidences: FieldConfidence;
  };
}

/**
 * Silver Layer configuration
 */
export interface SilverConfiguration {
  input_batch_size: number;         // Bronze records to process per batch
  parallel_workers: number;         // Number of extraction workers
  min_confidence_threshold: number; // Minimum confidence to accept extraction
  enable_fallback_extraction: boolean;
  enable_data_validation: boolean;
  max_extraction_time_ms: number;   // Timeout per file
}

/**
 * Batch processing result for Silver layer
 */
export interface SilverProcessingResult {
  total_records: number;
  successful_extractions: number;
  failed_extractions: number;
  partial_extractions: number;
  processing_time_ms: number;
  average_confidence: number;
  errors: ExtractionError[];
  field_coverage: Record<string, number>; // Percentage of records with each field
}

/**
 * Silver Layer statistics and monitoring
 */
export interface SilverStatistics {
  total_records_processed: number;
  records_by_status: Record<ExtractionStatus, number>;
  records_by_year: Record<number, number>;
  average_confidence_by_field: FieldConfidence;
  field_extraction_success_rates: Record<string, number>;
  processing_rate: number;          // Records per minute
  last_updated: string;
}

export interface SilverHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  metrics: {
    extraction_success_rate: number;    // Percentage
    average_confidence_score: number;   // 0-100
    processing_queue_size: number;
    error_rate_pct: number;
    last_successful_batch: string;
  };
}