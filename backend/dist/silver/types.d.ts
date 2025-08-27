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
    bronze_record_id: number;
    school_slug: string;
    source_year: number;
    school_name: string | null;
    nces_id: string | null;
    grades_served: string | null;
    address_street: string | null;
    address_city: string | null;
    address_state: string | null;
    address_zip: string | null;
    phone: string | null;
    website: string | null;
    setting: string | null;
    enrollment: number | null;
    student_teacher_ratio: string | null;
    full_time_teachers: number | null;
    national_rank: number | null;
    state_rank: number | null;
    ap_participation_rate: number | null;
    ap_pass_rate: number | null;
    math_proficiency: number | null;
    reading_proficiency: number | null;
    science_proficiency: number | null;
    graduation_rate: number | null;
    college_readiness_index: number | null;
    white_pct: number | null;
    asian_pct: number | null;
    hispanic_pct: number | null;
    black_pct: number | null;
    american_indian_pct: number | null;
    two_or_more_pct: number | null;
    female_pct: number | null;
    male_pct: number | null;
    economically_disadvantaged_pct: number | null;
    free_lunch_pct: number | null;
    reduced_lunch_pct: number | null;
    extraction_status: ExtractionStatus;
    extraction_confidence: number;
    field_confidence: FieldConfidence;
    created_at: string;
    updated_at: string;
    processing_errors: ExtractionError[];
}
export type ExtractionStatus = 'pending' | 'extracting' | 'extracted' | 'failed' | 'partial';
/**
 * Confidence scores for individual fields (0-100)
 */
export interface FieldConfidence {
    school_name: number;
    rankings: number;
    academics: number;
    demographics: number;
    location: number;
    enrollment_data: number;
}
export interface ExtractionError {
    field_name: string;
    error_type: ExtractionErrorType;
    error_message: string;
    extraction_method: ExtractionMethod;
    timestamp: string;
}
export type ExtractionErrorType = 'css_selector_failed' | 'regex_failed' | 'manual_rule_failed' | 'data_validation_failed' | 'parse_error' | 'missing_dom_element' | 'ambiguous_data';
export type ExtractionMethod = 'css_selector' | 'regex_pattern' | 'manual_rule' | 'fallback_heuristic';
/**
 * Multi-tier HTML extraction configuration
 */
export interface SilverExtractionPipeline {
    cssSelectors: SchoolDataSelectors;
    regexPatterns: ExtractionPatterns;
    manualRules: CustomExtractionRules;
    confidenceScorer: ConfidenceScorer;
}
/**
 * CSS Selectors for structured data extraction
 */
export interface SchoolDataSelectors {
    school_name: string[];
    nces_id: string[];
    grades: string[];
    address: string[];
    city: string[];
    state: string[];
    zip: string[];
    phone: string[];
    website: string[];
    setting: string[];
    enrollment: string[];
    student_teacher_ratio: string[];
    teachers: string[];
    national_rank: string[];
    state_rank: string[];
    ap_participation: string[];
    ap_pass_rate: string[];
    math_proficiency: string[];
    reading_proficiency: string[];
    science_proficiency: string[];
    graduation_rate: string[];
    college_readiness: string[];
    demographics_section: string[];
    race_percentages: string[];
    gender_percentages: string[];
    economic_disadvantaged: string[];
}
/**
 * Regex patterns for fallback extraction
 */
export interface ExtractionPatterns {
    school_name: RegExp[];
    enrollment_numbers: RegExp[];
    percentage_values: RegExp[];
    ranking_numbers: RegExp[];
    ratio_values: RegExp[];
    phone_numbers: RegExp[];
    addresses: RegExp[];
    grade_ranges: RegExp[];
    test_scores: RegExp[];
    graduation_rates: RegExp[];
    ap_data: RegExp[];
    race_demographics: RegExp[];
    gender_splits: RegExp[];
}
/**
 * Custom extraction rules for edge cases
 */
export interface CustomExtractionRules {
    enrollment_fallbacks: ExtractionRule[];
    ranking_disambiguation: ExtractionRule[];
    demographic_parsing: ExtractionRule[];
    address_normalization: ExtractionRule[];
    data_quality_checks: ValidationRule[];
}
export interface ExtractionRule {
    name: string;
    description: string;
    condition: (html: string, context: ExtractionContext) => boolean;
    extract: (html: string, context: ExtractionContext) => any;
    confidence: number;
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
    domDocument: any | null;
}
/**
 * Confidence scoring system
 */
export interface ConfidenceScorer {
    scoreExtraction(extractedData: Partial<SilverRecord>, extractionMethods: Record<string, ExtractionMethod>): {
        overallConfidence: number;
        fieldConfidences: FieldConfidence;
    };
}
/**
 * Silver Layer configuration
 */
export interface SilverConfiguration {
    input_batch_size: number;
    parallel_workers: number;
    min_confidence_threshold: number;
    enable_fallback_extraction: boolean;
    enable_data_validation: boolean;
    max_extraction_time_ms: number;
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
    field_coverage: Record<string, number>;
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
    processing_rate: number;
    last_updated: string;
}
export interface SilverHealthCheck {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    metrics: {
        extraction_success_rate: number;
        average_confidence_score: number;
        processing_queue_size: number;
        error_rate_pct: number;
        last_successful_batch: string;
    };
}
//# sourceMappingURL=types.d.ts.map