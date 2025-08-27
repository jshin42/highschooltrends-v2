# Data Contracts & Interface Specifications

## Overview
This document defines the data contracts between workstreams to ensure seamless integration while allowing parallel development.

## Pipeline Data Flow
```
HTML Files → Bronze Layer → Silver Layer → Gold Layer → API Layer → Frontend
```

## Contract 1: Bronze → Silver Layer

### BronzeRecord Interface
```typescript
interface BronzeRecord {
  id: number;
  file_path: string;              // Absolute path to HTML file
  school_slug: string;            // e.g., "william-fremd-high-school-6921"
  capture_timestamp: string;      // ISO8601 timestamp
  file_size: number;              // File size in bytes
  checksum_sha256: string;        // File integrity verification
  processing_status: 'pending' | 'processed' | 'failed' | 'quarantined';
  created_at: string;             // Processing timestamp
  
  // Optional metadata
  source_dataset?: 'USNEWS_2024' | 'USNEWS_2025';
  processing_errors?: string[];
}
```

### Bronze Layer Responsibilities
- File integrity validation (checksums)
- Metadata extraction (timestamps, file size)
- Processing status tracking
- Error handling and quarantine logic

### Silver Layer Requirements
- Must process files in order of processing priority (Bucket 1 schools first)
- Must handle malformed/incomplete HTML gracefully
- Must provide extraction confidence scoring

## Contract 2: Silver → Gold Layer

### SilverRecord Interface
```typescript
interface SilverRecord {
  id: number;
  bronze_file_id: number;         // Foreign key to BronzeRecord
  extracted_data: USNewsSchoolRaw; // Raw extracted data
  extraction_confidence: number;  // 0.0 - 1.0 confidence score
  extraction_method: 'css_selectors' | 'regex_patterns' | 'manual_patterns';
  parsing_errors: string[];       // Non-fatal parsing issues
  extraction_timestamp: string;   // When extraction completed
  
  // Quality metrics
  fields_extracted: string[];     // Successfully extracted field names
  fields_missing: string[];       // Expected but missing fields
  data_quality_flags: QualityFlag[];
}

interface USNewsSchoolRaw {
  // Core identification
  name?: string;
  address_raw?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  website?: string;
  
  // Rankings (may be exact number or range text)
  national_rank?: number | string;  // Could be "#397" or "#13,427-#13,500"
  state_rank?: number | string;
  
  // Academic metrics
  enrollment?: number;
  student_teacher_ratio?: string;   // "16:1" format
  ap_participation_rate?: number;   // Percentage 0-100
  ap_pass_rate?: number;
  math_proficiency?: number;
  reading_proficiency?: number;
  science_proficiency?: number;
  graduation_rate?: number;
  college_readiness_index?: number;
  
  // Demographics (percentages 0-100)
  white_pct?: number;
  asian_pct?: number;
  hispanic_pct?: number;
  black_pct?: number;
  two_or_more_pct?: number;
  american_indian_pct?: number;
  
  // Gender distribution
  female_pct?: number;
  male_pct?: number;
  
  // Additional metrics
  full_time_teachers?: number;
  setting?: string;               // "large suburb", "city", etc.
  
  // These fields are NOT in US News HTML (will be null)
  economically_disadvantaged_pct?: null;
  free_lunch_pct?: null;
  reduced_lunch_pct?: null;
}

interface QualityFlag {
  type: 'missing_field' | 'invalid_format' | 'outlier_value' | 'consistency_check';
  field: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}
```

### Silver Layer Responsibilities
- Multi-tier extraction (CSS → regex → manual patterns)
- Confidence scoring based on extraction success
- Data type conversion and basic validation
- Error cataloging for quality improvement

### Gold Layer Requirements  
- Must validate all data against gold standard schema
- Must classify confidence buckets correctly
- Must enforce uniqueness constraints (Bucket 1 national ranks)
- Must provide comprehensive quality reporting

## Contract 3: Gold → API Layer

### GoldRecord Interface
```typescript
interface GoldRecord {
  id: number;
  year: number;                   // 2024 or 2025
  usn_slug: string;              // Canonical school identifier
  name: string;                   // Required, cleaned school name
  
  // Address (structured)
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  
  contact: {
    phone?: string;
    website?: string;
  };
  
  // Rankings with bucket classification
  national_rank?: number;         // Only for exact ranks
  state_rank?: number;
  estimated_rank_range?: [number, number]; // For range ranks
  confidence_bucket: 'verified' | 'estimated' | 'ml_estimated';
  
  // Academic performance
  enrollment: number;
  student_teacher_ratio: string;
  ap_participation_rate?: number;
  ap_pass_rate?: number;
  math_proficiency?: number;
  reading_proficiency?: number;
  science_proficiency?: number;
  graduation_rate?: number;
  college_readiness_index?: number;
  
  // Demographics (all optional, may be null)
  demographics: {
    white_pct?: number;
    asian_pct?: number;
    hispanic_pct?: number;
    black_pct?: number;
    two_or_more_pct?: number;
    american_indian_pct?: number;
  };
  
  gender: {
    female_pct?: number;
    male_pct?: number;
  };
  
  // Fields that will remain null (not in US News data)
  socioeconomic: {
    economically_disadvantaged_pct: null;
    free_lunch_pct: null;
    reduced_lunch_pct: null;
  };
  
  // Metadata
  setting?: string;
  full_time_teachers?: number;
  
  // Quality and provenance
  confidence_score: number;       // 0.0 - 1.0
  validation_status: 'valid' | 'invalid' | 'quarantined';
  quality_flags: QualityFlag[];
  provenance: {
    source: 'USNEWS';
    html_path: string;
    captured_at: string;          // ISO8601
    processed_at: string;
    checksum_sha256: string;
  };
  
  // Timestamps
  created_at: string;
  updated_at: string;
}
```

### Gold Layer Responsibilities
- Complete schema validation and data cleaning
- Confidence bucket classification per specification:
  - **Bucket 1 (Verified)**: National ranks #1-13,426, must be unique
  - **Bucket 2 (Estimated)**: Range ranks #13,427-17,901, duplicates allowed
  - **Bucket 3 (ML Estimated)**: Unranked schools
- Quality assurance and outlier detection
- Provenance tracking with full audit trail

### API Layer Requirements
- Must transform gold records into frontend-compatible format
- Must provide filtering by confidence level
- Must support efficient querying for trends and comparisons

## Contract 4: API → Frontend

### API Response Formats

#### School Search Response
```typescript
interface SchoolSearchResponse {
  schools: SchoolSearchResult[];
  total_count: number;
  query_metadata: {
    query: string;
    filters_applied: SearchFilter[];
    confidence_levels: ('verified' | 'estimated' | 'ml_estimated')[];
  };
}

interface SchoolSearchResult {
  slug: string;                   // For API routing
  name: string;
  location: string;               // "City, State" format
  confidence: 'verified' | 'estimated' | 'ml_estimated';
  latest_rank?: number;           // Most recent available rank
  latest_year: number;            // 2024 or 2025
}
```

#### Trends Data Response
```typescript
interface TrendsResponse {
  schools: SchoolTrendsData[];
  metadata: {
    metrics_available: string[];
    years_available: number[];
    confidence_distribution: Record<string, number>;
  };
}

interface SchoolTrendsData {
  slug: string;
  name: string;
  location: string;
  confidence: 'verified' | 'estimated' | 'ml_estimated';
  
  // Compatible with existing TrendsChart component
  metrics: {
    [year: string]: {
      overall_score?: number;       // Derived metric
      national_rank?: number;
      enrollment?: number;
      student_teacher_ratio?: string;
      ap_participation_pct?: number;
      ap_pass_pct?: number;
      math_proficiency_pct?: number;
      reading_proficiency_pct?: number;
      science_proficiency_pct?: number;
      college_readiness_index?: number;
      graduation_rate_pct?: number;
    };
  };
  
  // Enhanced metadata
  data_quality: {
    confidence_score: number;
    last_updated: string;
    source_reliability: 'high' | 'medium' | 'low';
  };
}
```

#### Comparison Data Response
```typescript
interface ComparisonResponse {
  schools: SchoolComparisonData[];
  comparison_metadata: {
    year: number;
    metrics_compared: string[];
    quality_warnings: string[];
  };
}

interface SchoolComparisonData {
  slug: string;
  name: string;
  location: string;
  confidence: 'verified' | 'estimated' | 'ml_estimated';
  
  // Compatible with existing MetricsComparison component
  metrics: {
    overall_score?: number;
    national_rank?: number;
    enrollment?: number;
    student_teacher_ratio?: string;
    ap_participation_pct?: number;
    ap_pass_pct?: number;
    math_proficiency_pct?: number;
    reading_proficiency_pct?: number;
    science_proficiency_pct?: number;
    college_readiness_index?: number;
    graduation_rate_pct?: number;
  };
  
  // Quality indicators for UI
  data_freshness: {
    last_updated: string;
    staleness_warning?: string;
  };
}
```

### API Layer Responsibilities
- Transform gold standard data into frontend-compatible formats
- Maintain backward compatibility with existing React components
- Provide confidence and quality metadata for enhanced UI
- Handle error cases gracefully with meaningful error messages

### Frontend Requirements
- Must handle confidence indicators in UI
- Must gracefully handle missing data (null values)
- Must display data quality warnings when appropriate
- Must maintain existing component interfaces during transition

## Validation & Testing

### Contract Validation
Each interface contract includes:
- JSON Schema validation
- Unit tests for data transformation
- Integration tests between layers
- Performance benchmarks

### Quality Metrics
- **Data Completeness**: % of expected fields successfully extracted
- **Confidence Accuracy**: Validation of confidence scores against manual review
- **Processing Speed**: Time to process full dataset
- **API Performance**: Response times for frontend queries

### Error Handling
All contracts include:
- Graceful handling of missing/malformed data
- Detailed error logging with context
- Rollback procedures for data corruption
- Quality quarantine for low-confidence extractions

This contract system ensures each workstream can develop independently while maintaining integration compatibility.