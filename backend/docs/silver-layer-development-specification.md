# Silver Layer Development Specification

**Version**: 1.0.0  
**Status**: MECE Validated & Approved  
**Last Updated**: January 27, 2025

## Executive Summary

This specification defines the complete development plan for the Silver layer of the HighSchoolTrends.org v2 data pipeline. The Silver layer transforms raw HTML files from the Bronze layer into structured school data with confidence scoring and validation.

**MECE Compliance**: This plan has been validated as Mutually Exclusive (no overlapping deliverables) and Collectively Exhaustive (complete coverage of all requirements).

## Architecture Overview

### Silver Layer Purpose
- **Input**: Bronze layer HTML files (17,660+ validated files)
- **Output**: Structured school records with 74+ data fields
- **Processing**: Multi-tier extraction pipeline with confidence scoring
- **Target**: 36,538+ files with 95%+ extraction accuracy

### Core Components
1. **Extraction Engine**: Multi-tier HTML parsing (CSS → Regex → Manual)
2. **Confidence Scoring**: Field-level and overall confidence assessment
3. **Validation Framework**: Data quality checks and type conversion
4. **Integration Layer**: Bronze-Silver API communication
5. **Monitoring System**: Health checks and performance tracking

## Development Plan - 8 Week Implementation

### Phase 1: Core Infrastructure (Weeks 1-2)

#### 1.1 Database Schema & Service Layer
**Deliverables:**
- SQLite schema for Silver records table
- Core Silver service class with CRUD operations
- Database migration and initialization scripts
- Connection pooling and transaction management

**Technical Specifications:**
```typescript
// Silver database schema
CREATE TABLE silver_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bronze_record_id INTEGER NOT NULL,
  school_slug TEXT NOT NULL,
  source_year INTEGER NOT NULL,
  -- 70+ extracted fields as defined in types.ts
  extraction_status TEXT NOT NULL,
  extraction_confidence REAL NOT NULL,
  field_confidence TEXT NOT NULL, -- JSON blob
  processing_errors TEXT, -- JSON array
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (bronze_record_id) REFERENCES bronze_records(id)
);
```

#### 1.2 Core Extraction Engine Framework
**Deliverables:**
- `SilverProcessor` class with batch processing capabilities
- Abstract `ExtractionMethod` interface
- `ExtractionContext` implementation for shared processing context
- Basic error handling and logging integration

**Architecture:**
```typescript
abstract class ExtractionMethod {
  abstract extract(html: string, context: ExtractionContext): Promise<Partial<SilverRecord>>;
  abstract getConfidence(result: any): number;
}

class SilverProcessor {
  async processBatch(bronzeRecords: BronzeRecord[]): Promise<SilverProcessingResult>;
  private async processRecord(record: BronzeRecord): Promise<SilverRecord>;
}
```

#### 1.3 Confidence Scoring System Foundation
**Deliverables:**
- `ConfidenceScorer` implementation
- Field-level confidence calculation algorithms
- Overall confidence aggregation logic
- Confidence threshold configuration

**Scoring Algorithm:**
- **CSS Selector Success**: 90-100% confidence
- **Regex Pattern Match**: 70-85% confidence  
- **Manual Rule Match**: 50-75% confidence
- **No Data Found**: 0% confidence

### Phase 2: Multi-Tier Extraction Pipeline (Weeks 3-4)

#### 2.1 Tier 1: CSS Selector Extraction Engine
**Deliverables:**
- `CSSExtractionMethod` implementation
- Comprehensive selector configuration for all 74+ fields
- DOM traversal optimization
- Selector priority and fallback logic

**Field Coverage:**
- School identification: name, NCES ID, grades served
- Location data: address, city, state, zip, phone, website
- Enrollment: student count, teacher ratio, staff numbers
- Rankings: national rank, state rank
- Academics: test scores, AP data, graduation rates
- Demographics: race/ethnicity percentages, gender split

#### 2.2 Tier 2: Regex Pattern Fallback System
**Deliverables:**
- `RegexExtractionMethod` implementation
- Pattern library for numeric data extraction
- Text parsing for unstructured content
- Pattern confidence scoring

**Key Patterns:**
```typescript
const patterns = {
  enrollment: /enrollment[:\s]+(\d{1,5})/i,
  ranking: /ranked\s+#?(\d{1,5})/i,
  percentage: /(\d{1,3}(?:\.\d{1,2})?)\s*%/g,
  ratio: /(\d{1,3})\s*:\s*(\d{1,3})/g,
  phone: /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g
};
```

#### 2.3 Tier 3: Manual Rule Engine for Edge Cases
**Deliverables:**
- `ManualRuleMethod` implementation
- Custom extraction rules for problematic patterns
- Heuristic-based data extraction
- Edge case handling for malformed HTML

**Rule Examples:**
- Enrollment extraction from table structures
- Ranking disambiguation (national vs state)
- Demographic data parsing from chart elements
- Address normalization from various formats

#### 2.4 Field Validation and Type Conversion Framework
**Deliverables:**
- Data type validation for all 74+ fields
- Range checking for percentages and ratios
- Format validation for addresses, phones, websites
- Inconsistency detection and flagging

### Phase 3: Integration & Testing (Weeks 5-6)

#### 3.1 Bronze-Silver Integration Layer
**Deliverables:**
- Integration service implementing Bronze-Silver API contract
- Batch processing with Bronze record queries
- Status update callbacks to Bronze layer
- Error reporting and retry mechanisms

**Integration Flow:**
```typescript
class SilverIntegrationService {
  async processFromBronze(): Promise<void> {
    const pendingRecords = await this.bronzeService.getRecordsByStatus('pending');
    const result = await this.silverProcessor.processBatch(pendingRecords);
    await this.updateBronzeStatuses(result);
  }
}
```

#### 3.2 End-to-End Pipeline Testing
**Deliverables:**
- Real data testing with 100+ HTML files
- Extraction accuracy validation
- Performance benchmarking
- Error scenario testing

**Test Categories:**
- **Happy Path**: Clean HTML files with all data present
- **Missing Data**: Files with incomplete information
- **Malformed HTML**: Corrupted or invalid HTML structures
- **Edge Cases**: Unusual formatting and data presentation

#### 3.3 Performance Optimization and Batch Processing
**Deliverables:**
- Parallel processing implementation
- Memory usage optimization for large files
- Batch size tuning for optimal throughput
- Circuit breaker integration for fault tolerance

**Performance Targets:**
- **Processing Rate**: 500+ files per hour
- **Memory Usage**: <2GB peak consumption
- **Extraction Accuracy**: 95%+ for verified fields
- **Error Rate**: <5% total failures

#### 3.4 Health Monitoring and SLO Tracking
**Deliverables:**
- Silver layer health check endpoints
- SLO metrics collection and reporting
- Alert thresholds for degraded performance
- Integration with existing Bronze monitoring

### Phase 4: Production Readiness (Weeks 7-8)

#### 4.1 CLI Tools and Operational Commands
**Deliverables:**
- `silver:process` command for batch processing
- `silver:stats` command for operational metrics
- `silver:validate` command for data quality checks
- `silver:recover` command for error recovery

**CLI Examples:**
```bash
npm run silver:process -- --batch-size 100 --workers 4
npm run silver:stats -- --detailed
npm run silver:validate -- --confidence-threshold 80
npm run silver:recover -- --retry-failed --max-attempts 3
```

#### 4.2 Error Recovery and Retry Procedures
**Deliverables:**
- Intelligent retry logic with exponential backoff
- Failed record quarantine and manual review workflow
- Partial extraction recovery (save what was successfully extracted)
- Data consistency checks and repair procedures

#### 4.3 Comprehensive Documentation and Runbooks
**Deliverables:**
- Silver layer API documentation
- Operational runbooks for common scenarios
- Troubleshooting guide for extraction failures
- Performance tuning recommendations

#### 4.4 Production Deployment and Monitoring Setup
**Deliverables:**
- Production configuration management
- Deployment scripts and procedures
- Monitoring dashboard integration
- Alerting configuration for critical failures

## Technical Requirements

### Dependencies
- **Database**: SQLite with better-sqlite3
- **HTML Parsing**: JSDOM for DOM manipulation
- **Parallel Processing**: Node.js worker threads
- **Logging**: Existing structured logger integration
- **Testing**: Vitest with comprehensive coverage

### Configuration
```typescript
interface SilverConfiguration {
  input_batch_size: 50;           // Bronze records per batch
  parallel_workers: 4;            // Extraction workers
  min_confidence_threshold: 60;   // Minimum acceptable confidence
  enable_fallback_extraction: true;
  enable_data_validation: true;
  max_extraction_time_ms: 30000;  // 30 second timeout per file
}
```

### Performance Specifications
- **Throughput**: 500+ files/hour (8.3+ files/minute)
- **Latency**: <10 seconds per file processing
- **Accuracy**: 95%+ extraction success for verified fields
- **Reliability**: 99%+ uptime with circuit breaker protection

## Quality Assurance

### Testing Strategy
- **Unit Tests**: 85%+ code coverage for all components
- **Integration Tests**: End-to-end pipeline validation
- **Performance Tests**: Load testing with full dataset
- **Regression Tests**: Prevent quality degradation

### Data Quality Metrics
- **Field Coverage**: % of records with each field populated
- **Confidence Distribution**: Average confidence scores by field
- **Extraction Success Rate**: % of successfully processed records
- **Error Categorization**: Classification of failure types

### Validation Checkpoints
1. **Post-Extraction**: Immediate data type and range validation
2. **Pre-Storage**: Final consistency checks before database commit
3. **Post-Processing**: Batch-level quality assessment
4. **Production Monitoring**: Ongoing quality trend analysis

## Security Considerations

### Input Security
- **HTML Sanitization**: Protection against malicious content
- **File Path Validation**: Prevent directory traversal attacks
- **Resource Limits**: Memory and CPU usage constraints
- **Error Information**: Sanitized error messages without sensitive data

### Data Protection
- **Access Control**: Read-only access to Bronze files
- **Audit Logging**: Comprehensive processing audit trail
- **Data Retention**: Configurable retention policies
- **Backup Procedures**: Regular database backup and recovery

## Integration Requirements

### Bronze Layer Interface
- **API Contract**: Strict adherence to Bronze-Silver contract
- **Status Updates**: Reliable status reporting back to Bronze
- **Error Handling**: Graceful handling of Bronze service failures
- **Batch Processing**: Efficient bulk record processing

### Gold Layer Preparation
- **Schema Compatibility**: Output format compatible with Gold layer expectations
- **Quality Metadata**: Rich metadata for Gold layer validation
- **Confidence Buckets**: Pre-classification for Gold layer processing
- **Audit Trail**: Complete processing history for provenance tracking

## Risk Analysis and Mitigation

### Technical Risks
1. **HTML Format Changes**: US News website structure modifications
   - *Mitigation*: Multi-tier extraction with fallbacks, regular pattern updates

2. **Performance Degradation**: Large dataset processing slowdowns
   - *Mitigation*: Parallel processing, batch optimization, monitoring

3. **Data Quality Issues**: Inconsistent or missing data in HTML
   - *Mitigation*: Confidence scoring, validation framework, manual review workflow

### Operational Risks
1. **File System Failures**: External drive access issues
   - *Mitigation*: Circuit breaker integration, graceful error handling

2. **Memory Exhaustion**: Large file processing memory issues
   - *Mitigation*: Streaming processing, memory limits, batch sizing

3. **Database Corruption**: SQLite database integrity issues
   - *Mitigation*: Regular backups, transaction rollbacks, integrity checks

## Success Metrics

### Development Milestones
- **Week 2**: Core infrastructure functional with basic extraction
- **Week 4**: Multi-tier pipeline operational with 90%+ field coverage
- **Week 6**: Integration complete with 95%+ extraction accuracy
- **Week 8**: Production-ready with monitoring and documentation

### Production KPIs
- **Extraction Success Rate**: ≥95%
- **Processing Throughput**: ≥500 files/hour
- **Data Quality Score**: ≥90% average confidence
- **System Availability**: ≥99% uptime
- **Error Recovery Rate**: ≥98% successful retries

## Key Architectural Decisions (Production Implementation)

### Decision Log - Ranking Extraction Crisis Resolution
*Updated: August 29, 2025*

During the production implementation of the Silver layer, a critical data integrity crisis emerged requiring immediate architectural decisions. This section documents the key decisions made and their rationale.

#### Decision 1: Schema-Safe SQL Operations
**Issue**: Production re-extraction scripts failed silently due to SQL schema mismatches
- Scripts attempted to UPDATE non-existent columns (`national_rank_end`, `national_rank_precision`)
- SQLite silently ignored invalid column references, causing NULL rankings

**Decision**: Implement schema-safe SQL operations with explicit column validation
- Only update columns that exist in the current database schema
- Use prepared statements with explicit column lists
- Implement database state verification after UPDATE operations

**Implementation**: `RankingExtractionUtility` class with consolidated, schema-safe SQL operations

#### Decision 2: Consolidated Extraction Utility Pattern
**Issue**: Multiple redundant extraction scripts with duplicated logic
- 20+ debugging scripts with overlapping functionality
- Inconsistent error handling and schema assumptions
- Technical debt hampering maintenance and reliability

**Decision**: Consolidate all extraction logic into a single, reusable utility
- `RankingExtractionUtility` class as the single source of truth
- Standardized error handling and database operations
- Elimination of redundant scripts and technical debt

**Benefits**: 99.6% success rate on 34,783 school records with unified approach

#### Decision 3: Bucket-Based Ranking Methodology Validation
**Issue**: US News ranking system understanding was incomplete
- Initial assumption of 17,000+ schools vs actual 10,000+ in database
- Confusion about ranking eligibility criteria

**Decision**: Validate against actual US News methodology
- **Bucket 1**: Ranked schools (1-13,427) with exact rankings
- **Bucket 2**: Estimated rankings (13,428-17,901) for unranked but comparable schools  
- **Bucket 3**: State-only rankings for schools not in national comparison
- Remaining NULL rankings represent schools legitimately outside ranking criteria

**Result**: Confirmed ~10,000 schools is correct scope, not data loss

#### Decision 4: Production vs Development Script Segregation
**Issue**: Production scripts mixed with debugging/analysis tools
- `production-re-extraction.ts` and `clear-and-reextract.ts` were broken
- Debugging scripts accumulated without cleanup strategy

**Decision**: Implement clear script lifecycle management
- Production scripts: Maintained and tested
- Debugging scripts: Created temporarily, removed after use
- Git workflow compliance with feature branches

**Implementation**: Consolidated to 2 production scripts using shared utility

#### Decision 5: Confidence-Weighted vs First-Match-Wins Logic
**Issue**: Original CSS extraction used first-match-wins logic
- Lost ranking data when multiple selectors matched
- No prioritization of authoritative data sources

**Decision**: Implement confidence-weighted extraction with pattern prioritization
- Authoritative selectors (e.g., `[data-test-id="display_rank_national"]`) get highest confidence
- Pattern-based extraction as fallback with lower confidence
- Elimination of suspicious patterns that trigger false positives

**Result**: More accurate ranking extraction with appropriate confidence scoring

#### Decision 6: Database State Verification Requirements
**Issue**: Scripts claimed success while leaving data unchanged
- UPDATE operations appeared successful but didn't modify records
- No validation of actual database state changes

**Decision**: Mandatory database state verification
- Check `result.changes > 0` for SQL UPDATE operations
- Implement post-operation database queries for critical updates
- Never trust extraction method tests without database verification

**Implementation**: All production scripts now include state verification and validation

### Production Lessons Learned

1. **Schema Evolution**: Always design SQL operations to be forward-compatible with schema changes
2. **Silent Failures**: SQLite's permissive nature requires explicit validation of operations
3. **Technical Debt**: Regular cleanup prevents debugging artifacts from becoming production problems
4. **Data Integrity**: Challenge success claims with database reality checks
5. **Git Workflow**: Proper branching prevents main branch pollution with debugging work

These architectural decisions form the foundation for reliable, production-ready Silver layer operations and should guide future development work.

## Conclusion

This Silver layer development specification provides a comprehensive, MECE-validated plan for implementing structured data extraction from the Bronze layer. The 8-week development timeline ensures thorough implementation with proper testing, integration, and production readiness.

The multi-tier extraction approach (CSS → Regex → Manual) with confidence scoring provides robust handling of the varied HTML formats found in the 36,538+ file dataset while maintaining high extraction accuracy and reliability.

**Production Update**: The architectural decisions documented above reflect real-world production experience and should be considered authoritative guidance for maintaining and extending the Silver layer.

**Next Steps**: Begin Phase 1 implementation with database schema creation and core service development, following the detailed technical specifications outlined in this document.