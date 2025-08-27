# HighSchoolTrends.org v2 - Workstream Architecture

## Overview
This project implements a gold standard data platform for US News high school rankings using a MECE (Mutually Exclusive, Collectively Exhaustive) workstream approach for parallel development.

## Workstream Structure

### Workstream 1: Data Pipeline Foundation
**Branch**: `feat/workstream-1-data-pipeline`
**Owner**: Backend/Data Engineer
**Timeline**: Weeks 3-6

#### Components:
- **Bronze Layer**: HTML file ingestion and metadata tracking
- **Silver Layer**: Multi-tier extraction engine (CSS selectors → regex → manual patterns)
- **Gold Layer**: Validation framework with confidence bucketing

#### Key Interfaces:
```typescript
// Bronze → Silver
interface BronzeRecord {
  file_path: string;
  school_slug: string;
  checksum_sha256: string;
  processing_status: 'pending' | 'processed' | 'failed';
}

// Silver → Gold
interface SilverRecord {
  bronze_id: string;
  extracted_fields: Record<string, any>;
  extraction_confidence: number;
  parsing_errors: string[];
}
```

### Workstream 2: Backend Infrastructure & Database
**Branch**: `feat/workstream-2-backend-infra`
**Owner**: Full-stack Engineer
**Timeline**: Weeks 3-5

#### Components:
- Database schema design and migrations
- REST API layer with frontend-compatible endpoints
- Data quality monitoring and admin tools

#### Key Interfaces:
```typescript
// API Contract
interface SchoolsAPI {
  GET /api/schools/search?query={name}&limit=10
  GET /api/schools/{slug}/trends?years=2019-2025
  GET /api/schools/compare?ids={slug1,slug2,slug3}
}
```

### Workstream 3: Frontend Integration & Enhancement  
**Branch**: `feat/workstream-3-frontend-integration`
**Owner**: Frontend Engineer
**Timeline**: Weeks 7-10

#### Components:
- Data model transformation layer
- Enhanced UI components with confidence indicators
- API integration replacing static JSON data

#### Key Interfaces:
```typescript
// Frontend-API Contract
interface FrontendSchool {
  slug: string;
  name: string;
  confidence: 'verified' | 'estimated' | 'ml_estimated';
  metrics: Record<string, SchoolMetrics>;
}
```

## Integration Strategy

### Cross-Workstream Branches
- `integration/pipeline-api-contract` - Test data pipeline → API integration
- `integration/api-frontend-contract` - Test API → Frontend integration  
- `integration/full-system-e2e` - End-to-end system testing

### Quality Gates
1. **Schema Validation**: All data conforms to gold standard schema
2. **Confidence Bucketing**: Proper classification of verified/estimated/ML estimated schools
3. **Performance Testing**: <8 hours for full 36K file processing
4. **Frontend Compatibility**: Existing components work with new data model

## Development Workflow

### Branch Creation
```bash
# Start from fresh main
git fetch --all --prune
git checkout main  
git pull --ff-only origin main

# Create workstream branch
git checkout -b feat/workstream-{n}-{name}

# Create feature branches within workstream
git checkout -b feat/workstream-{n}/{component-name}
```

### Integration Testing
```bash
# Create integration branch
git checkout -b integration/{integration-name}

# Merge workstream branches for testing
git merge feat/workstream-1-data-pipeline
git merge feat/workstream-2-backend-infra

# Run integration tests
make test-integration
```

### Quality Checks
```bash
# Before any PR merge
make check && make test && make typecheck && make lint

# Data pipeline specific
make test-extraction-accuracy
make test-confidence-bucketing  
make validate-gold-schema

# API specific
make test-api-contracts
make test-performance-benchmarks

# Frontend specific
make test-component-compatibility
make test-data-transformation
```

## Risk Mitigation

### Data Quality
- Sample validation against manual verification
- Confidence scoring with quarantine for low-quality extractions
- Uniqueness constraints for Bucket 1 schools (national ranks #1-13,426)

### Performance
- Parallel processing for HTML extraction
- Database indexing for search performance
- Caching strategy for frequently accessed data

### Integration
- Clear data contracts between workstreams
- Staged integration with rollback procedures
- Comprehensive error handling and logging

## Success Metrics

- **Data Completeness**: ≥99% extraction success rate
- **Processing Speed**: <8 hours for full 36,538 school dataset
- **API Performance**: <300ms P95 for trend queries
- **Frontend Compatibility**: Zero breaking changes to existing UI components
- **Data Quality**: Bucket 1 uniqueness 100%, validation pass rate ≥95%