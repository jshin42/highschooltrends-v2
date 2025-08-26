# US News High School Data Extraction Guide

## Overview
This guide defines the process for extracting structured data from US News high school HTML files using the gold standard schema. The extraction process supports both USNEWS_2024 (17,660 files) and USNEWS_2025 (18,878 files) datasets.

## Gold Standard Example
**Source File**: `william-fremd-high-school-6921/docker_curl_20250821_061341.html`  
**Target Output**: See `/data/usnews-gold-standard-schema.json` sample_record

## Data Processing Pipeline

### 1. File Processing
```
Input: /Volumes/OWC Express 1M2/USNEWS_2025/[school-folder]/docker_curl_[timestamp].html
Output: Structured JSON records following gold standard schema
```

### 2. Ranking Bucket Classification
- **Bucket 1 (Verified)**: National ranks #1-13,426
- **Bucket 2 (Estimated)**: National ranks #13,427-17,901  
- **Bucket 3 (ML Estimated)**: Unranked schools
- **State Only**: Schools with state rank but no national rank

### 3. Data Extraction Rules

#### Core Identifiers
- **Year**: Extract from folder structure or metadata (2024/2025)
- **School Name**: Primary heading, remove "High School" suffix for processing
- **Address**: Parse into street, city, state, zip components
- **Phone**: Format as (XXX) XXX-XXXX
- **Website**: Full URL, validate format

#### Academic Metrics
- **Enrollment**: Remove commas, store as integer
- **Student-Teacher Ratio**: Format as XX:1
- **AP Participation**: Store as percentage with % suffix
- **AP Pass Rate**: Store as percentage with % suffix
- **Proficiency Scores**: Math, Reading, Science as percentages
- **Graduation Rate**: Store as percentage with % suffix
- **College Readiness Index**: Float value

#### Demographics
- **Race/Ethnicity**: Store as percentages with % suffix
  - White, Asian, Hispanic, Black, Two or More Races, American Indian
- **Gender**: Female/Male percentages
- **Economic Status**: May be N/A or unavailable

#### Rankings
- **National Rank**: Integer, determines bucket classification
- **State Rank**: Integer, use for state-only schools
- **Confidence Level**: Auto-assigned based on bucket

### 4. Quality Assurance

#### Required Fields
Minimum required for valid record:
- year, name, address_raw, city, state

#### Data Validation
- Enrollment must be positive integer
- Percentages must be 0-100%
- Grades must follow valid format (e.g., "9-12")
- Year must be 2024 or 2025

#### Confidence Scoring
- **High (≥0.90)**: All core fields present, rankings verified
- **Medium (≥0.70)**: Most fields present, some estimated data
- **Low (≥0.50)**: Minimal data, heavily estimated

### 5. Output Format

#### Individual School Record
```json
{
  "year": 2025,
  "name": "William Fremd High School",
  "city": "Palatine",
  "state": "Illinois", 
  "nationalrank": 397,
  "ranking_bucket": "bucket_1",
  "confidence_level": "verified",
  "enrollment": 2657,
  "graduationrate": "94%",
  "extraction_confidence": 0.95,
  ...
}
```

#### Batch Processing Output
```json
{
  "extraction_summary": {
    "total_files_processed": 18878,
    "successful_extractions": 18234,
    "failed_extractions": 644,
    "average_confidence": 0.87,
    "bucket_distribution": {
      "bucket_1": 13426,
      "bucket_2": 4475,
      "bucket_3": 333,
      "state_only": 0
    }
  },
  "schools": [...]
}
```

## Integration with HighSchoolTrends Platform

### Premium Tier Alignment
- **Free Tier**: All ranking data, basic search, confidence indicators
- **Parent ($5/mo)**: Unlimited comparisons, historical data, alerts
- **Realtor ($29/mo)**: Professional reports, bulk exports, API access

### Data Usage
1. **School Search**: Core identifiers and rankings for search/filter
2. **Trend Analysis**: Historical comparison between 2024/2025 data
3. **Professional Reports**: Complete dataset for PDF generation
4. **Market Analysis**: Regional aggregations and benchmarking

### API Integration
```typescript
interface USNewsSchoolData {
  year: number;
  name: string;
  location: {
    city: string;
    state: string;
    address: string;
  };
  rankings: {
    national?: number;
    state?: number;
    bucket: 'bucket_1' | 'bucket_2' | 'bucket_3' | 'state_only';
    confidence: 'verified' | 'estimated' | 'ml_estimated' | 'state_verified';
  };
  academics: {
    enrollment: number;
    graduationRate?: string;
    apParticipation?: string;
    // ... other metrics
  };
  // ... other categories
}
```

## Processing Commands

### Batch Extraction
```bash
# Process all 2025 files
python extract_usnews.py \
  --source "/Volumes/OWC Express 1M2/USNEWS_2025" \
  --schema "/data/usnews-gold-standard-schema.json" \
  --output "/data/processed/usnews_2025.json" \
  --year 2025

# Process all 2024 files  
python extract_usnews.py \
  --source "/Volumes/OWC Express 1M2/USNEWS_2024" \
  --schema "/data/usnews-gold-standard-schema.json" \
  --output "/data/processed/usnews_2024.json" \
  --year 2024
```

### Validation
```bash
# Validate extracted data against schema
python validate_extraction.py \
  --data "/data/processed/usnews_2025.json" \
  --schema "/data/usnews-gold-standard-schema.json"
```

### Quality Report
```bash
# Generate extraction quality report
python quality_report.py \
  --data "/data/processed/usnews_2025.json" \
  --output "/data/reports/extraction_quality_2025.html"
```

## Error Handling

### Common Issues
1. **Missing HTML elements**: Use confidence scoring, mark as estimated
2. **Malformed addresses**: Parse what's available, flag for manual review
3. **Inconsistent ranking data**: Apply bucket rules, document assumptions
4. **Encoding issues**: Handle UTF-8, special characters in school names

### Quarantine Process
Schools with confidence < 0.50 should be quarantined for manual review:
```json
{
  "quarantine_reason": "confidence_too_low",
  "confidence_score": 0.42,
  "missing_fields": ["nationalrank", "staterank", "enrollment"],
  "manual_review_required": true
}
```

## Performance Targets
- **Processing Speed**: ~100 files/minute on standard hardware
- **Accuracy Rate**: ≥95% for Bucket 1 schools, ≥85% for Bucket 2/3
- **Completeness**: ≥80% of fields populated for high-confidence extractions
- **Error Rate**: <5% failed extractions per batch

## Next Steps
1. Implement HTML parsing logic using schema
2. Build validation pipeline
3. Create quality assurance dashboard
4. Integrate with HighSchoolTrends platform database
5. Set up automated processing for future US News releases