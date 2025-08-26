// US News High School Data Types
// Generated from gold standard schema for HighSchoolTrends.org

export interface USNewsSchoolData {
  // Core Identifiers
  year: number;
  name: string;
  address_raw: string;
  city: string;
  state: string;
  zip?: string;
  phone?: string;
  website?: string;

  // Basic Information
  grades: string;
  enrollment: number;
  student_teacher_ratio: string;
  setting?: string;
  fulltimeteachercount?: number;

  // Rankings
  nationalrank?: number;
  staterank?: number;
  ranking_bucket: 'bucket_1' | 'bucket_2' | 'bucket_3' | 'state_only';
  confidence_level: 'verified' | 'estimated' | 'ml_estimated' | 'state_verified';

  // Academic Performance
  apparticipationrate?: string;
  appassrate?: string;
  mathproficiency?: string;
  readingproficiency?: string;
  scienceproficiency?: string;
  graduationrate?: string;
  collegereadinessindex?: number;

  // Demographics
  white?: string;
  asian?: string;
  hispanic?: string;
  black?: string;
  twoormoreraces?: string;
  americanindian?: string;
  femalepercentage?: string;
  malepercentage?: string;

  // Economic Indicators
  economicallydisadvantaged?: string | null;
  freelunchprogram?: string | null;
  reducedpricelunchprogram?: string | null;

  // Metadata
  source_file: string;
  extraction_timestamp: string;
  extraction_confidence: number;
  data_completeness: number;
}

export interface USNewsDataset {
  extraction_summary: {
    total_files_processed: number;
    successful_extractions: number;
    failed_extractions: number;
    average_confidence: number;
    bucket_distribution: {
      bucket_1: number;
      bucket_2: number;
      bucket_3: number;
      state_only: number;
    };
    processing_date: string;
    source_year: number;
  };
  schools: USNewsSchoolData[];
}

export interface RankingBucket {
  name: string;
  description: string;
  confidence: 'verified' | 'estimated' | 'ml_estimated' | 'state_verified';
  range?: [number, number];
  count?: number;
}

export interface ExtractionQuality {
  confidence_score: number;
  completeness_score: number;
  missing_required_fields: string[];
  validation_errors: string[];
  quarantine_required: boolean;
  quarantine_reason?: string;
}

// Helper types for application usage
export interface SchoolSearchResult extends USNewsSchoolData {
  // Additional computed fields for search/display
  display_name: string;
  location_display: string;
  rank_display: string;
  confidence_badge: 'high' | 'medium' | 'low';
  trend_data?: {
    rank_change?: number;
    enrollment_change?: number;
    performance_trend?: 'improving' | 'declining' | 'stable';
  };
}

export interface ComparisonMetrics {
  enrollment: number;
  graduation_rate?: number;
  ap_participation?: number;
  ap_pass_rate?: number;
  math_proficiency?: number;
  reading_proficiency?: number;
  science_proficiency?: number;
  college_readiness?: number;
  national_rank?: number;
  state_rank?: number;
}

export interface TrendData {
  year: number;
  metrics: ComparisonMetrics;
  confidence: number;
}

export interface SchoolProfile extends USNewsSchoolData {
  trend_history: TrendData[];
  comparable_schools: SchoolSearchResult[];
  district_context?: {
    district_name?: string;
    total_schools?: number;
    district_rank?: number;
  };
}

// Constants for validation and display
export const RANKING_BUCKETS: Record<string, RankingBucket> = {
  bucket_1: {
    name: 'Verified National Ranks',
    description: 'National exact ranks (#1-13,426)',
    confidence: 'verified',
    range: [1, 13426]
  },
  bucket_2: {
    name: 'Estimated National Ranks',
    description: 'National range ranks (#13,427-17,901)',
    confidence: 'estimated',
    range: [13427, 17901]
  },
  bucket_3: {
    name: 'ML Estimated Ranks',
    description: 'Unranked schools with ML-generated estimates',
    confidence: 'ml_estimated',
    range: [17902, 25000]
  },
  state_only: {
    name: 'State-Only Ranks',
    description: 'Schools with only state ranking',
    confidence: 'state_verified'
  }
};

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.90,
  MEDIUM: 0.70,
  LOW: 0.50
} as const;

export const REQUIRED_FIELDS = [
  'year',
  'name', 
  'address_raw',
  'city',
  'state'
] as const;

// Utility functions
export function getConfidenceBadge(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

export function getRankingBucket(nationalRank?: number, stateRank?: number): string {
  if (!nationalRank && stateRank) return 'state_only';
  if (!nationalRank) return 'bucket_3';
  if (nationalRank <= 13426) return 'bucket_1';
  if (nationalRank <= 17901) return 'bucket_2';
  return 'bucket_3';
}

export function formatRankDisplay(school: USNewsSchoolData): string {
  if (school.nationalrank) {
    return `#${school.nationalrank.toLocaleString()} nationally`;
  }
  if (school.staterank) {
    return `#${school.staterank} in ${school.state}`;
  }
  return 'Unranked';
}

export function parsePercentage(value?: string): number | undefined {
  if (!value) return undefined;
  const num = parseFloat(value.replace('%', ''));
  return isNaN(num) ? undefined : num;
}

export function formatLocation(school: USNewsSchoolData): string {
  return `${school.city}, ${school.state}`;
}

// Validation functions
export function validateSchoolData(school: Partial<USNewsSchoolData>): ExtractionQuality {
  const missing_required_fields: string[] = [];
  const validation_errors: string[] = [];

  // Check required fields
  REQUIRED_FIELDS.forEach(field => {
    if (!school[field as keyof USNewsSchoolData]) {
      missing_required_fields.push(field);
    }
  });

  // Validate data types and ranges
  if (school.enrollment && (school.enrollment < 0 || school.enrollment > 50000)) {
    validation_errors.push('Enrollment out of reasonable range');
  }

  if (school.year && (school.year < 2020 || school.year > 2030)) {
    validation_errors.push('Year out of valid range');
  }

  // Calculate confidence and completeness
  const total_fields = Object.keys(school).length;
  const filled_fields = Object.values(school).filter(v => v !== null && v !== undefined && v !== '').length;
  const completeness_score = filled_fields / total_fields;
  
  const confidence_score = school.extraction_confidence || 0;
  
  const quarantine_required = 
    missing_required_fields.length > 0 || 
    confidence_score < CONFIDENCE_THRESHOLDS.LOW ||
    validation_errors.length > 2;

  return {
    confidence_score,
    completeness_score,
    missing_required_fields,
    validation_errors,
    quarantine_required,
    quarantine_reason: quarantine_required ? 
      `Low confidence (${confidence_score.toFixed(2)}) or missing required fields` : 
      undefined
  };
}