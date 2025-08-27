# HighSchoolTrends.org Backend

## Gold Standard Data Platform

This is the backend service for HighSchoolTrends.org v2, implementing a sophisticated Bronze→Silver→Gold data pipeline for processing US News high school HTML data into a structured, queryable format.

## Architecture Overview

### Data Pipeline Layers

**Bronze Layer** (Raw Data Ingestion)
- HTML file discovery and metadata extraction
- File integrity validation with SHA256 checksums
- Processing status tracking and error handling
- Supports 36,538+ HTML files from external drive storage

**Silver Layer** (Data Extraction) 
- Multi-tier extraction: CSS selectors → regex patterns → manual parsing
- Confidence scoring and quality assessment
- Field validation and type conversion
- Error cataloging for continuous improvement

**Gold Layer** (Validated Data)
- Complete schema validation against gold standard
- Confidence bucket classification (Verified/Estimated/ML Estimated)
- Quality assurance with outlier detection
- Provenance tracking with full audit trail

## Quick Start

### Prerequisites
- Node.js 18+ 
- TypeScript
- Access to US News HTML files (external drive)

### Installation
```bash
cd backend
npm install
```

### Development
```bash
# Run tests
npm test

# Run tests with coverage
npm test:coverage

# Type checking
npm typecheck

# Linting
npm run lint

# Build for production
npm run build
```

## Bronze Layer CLI

The Bronze layer includes a comprehensive CLI tool for development and operations:

### Validate Configuration
```bash
npm run bronze:validate
```

### Test with Sample Files
```bash
npm run bronze:test -- --sample-size 20
```

### View Statistics
```bash
npm run bronze:stats
```

### Process Full Dataset
```bash
npm run bronze:process -- --batch-size 100 --workers 4
```

### Custom Configuration
```bash
npm run bronze:cli -- process \\
  --directories "/path/to/USNEWS_2024,/path/to/USNEWS_2025" \\
  --batch-size 50 \\
  --workers 2 \\
  --no-checksum
```

## Data Flow

```
External Drive HTML Files
           ↓
    Bronze Layer Processing
    (File ingestion + metadata)
           ↓
    Silver Layer Extraction  
    (Multi-tier HTML parsing)
           ↓
     Gold Layer Validation
    (Schema + confidence buckets)
           ↓
        API Layer
    (Frontend-compatible endpoints)
```

## Configuration

### Bronze Layer Configuration
```typescript
interface BronzeConfiguration {
  source_directories: string[];   // HTML file locations
  batch_size: number;             // Files per processing batch
  max_file_size: number;          // Maximum file size (bytes)
  parallel_workers: number;       // Concurrent processing workers
  checksum_verification: boolean; // Enable SHA256 verification
  auto_quarantine: boolean;       // Auto-quarantine invalid files
}
```

### Default Configuration
- **Source Directories**: `/Volumes/OWC Express 1M2/USNEWS_2024`, `/Volumes/OWC Express 1M2/USNEWS_2025`
- **Batch Size**: 100 files
- **Max File Size**: 10MB
- **Parallel Workers**: 4
- **Checksum Verification**: Enabled
- **Auto Quarantine**: Enabled

## Data Quality & Monitoring

### Processing Status Types
- **Pending**: File discovered, awaiting processing
- **Processing**: Currently being processed
- **Processed**: Successfully processed by Silver layer
- **Failed**: Processing failed with errors
- **Quarantined**: File invalid/corrupted, needs manual review
- **Skipped**: Intentionally skipped (duplicate, etc.)

### Confidence Buckets
- **Bucket 1 (Verified)**: National ranks #1-13,426, must be unique
- **Bucket 2 (Estimated)**: Range ranks #13,427-17,901, duplicates allowed  
- **Bucket 3 (ML Estimated)**: Unranked schools
- **Unknown**: Classification pending

### Health Monitoring
- **Healthy**: <5% error rate, normal processing
- **Degraded**: 5-10% error rate, some issues detected
- **Unhealthy**: >10% error rate, significant problems

## File Structure

```
backend/
├── src/
│   ├── bronze/                 # Bronze layer implementation
│   │   ├── types.ts           # Type definitions
│   │   ├── file-processor.ts  # Core file processing logic
│   │   ├── bronze-service.ts  # Service orchestration
│   │   ├── index.ts           # Public API exports
│   │   └── __tests__/         # Comprehensive test suite
│   ├── silver/                # Silver layer (extraction engine)
│   ├── gold/                  # Gold layer (validation framework)
│   ├── api/                   # REST API endpoints
│   └── cli/                   # Command-line tools
├── docs/                      # Documentation
├── package.json              # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── vitest.config.ts         # Test configuration
```

## Testing

### Unit Tests
```bash
npm test
```

### Coverage Requirements
- **Branches**: 80%
- **Functions**: 80% 
- **Lines**: 80%
- **Statements**: 80%

### Test Categories
- **File Processing**: Metadata extraction, validation, error handling
- **Service Orchestration**: Batch processing, statistics, health monitoring
- **Configuration**: Validation, defaults, overrides
- **Error Scenarios**: File system errors, malformed data, edge cases

## Performance Targets

### Bronze Layer
- **Processing Speed**: 100 files/minute
- **Batch Processing**: <8 hours for full 36,538 file dataset
- **Memory Usage**: <1GB peak memory consumption
- **Error Rate**: <2% for file processing failures

### Quality Metrics
- **Extraction Accuracy**: ≥95% for verified schools
- **Schema Compliance**: 100% for gold layer records
- **Confidence Classification**: ≥99% accuracy for bucket assignment

## Development Guidelines

### Code Quality
- **TypeScript**: Strict mode enabled, full type safety
- **Testing**: Comprehensive unit tests with high coverage
- **Linting**: ESLint with TypeScript configuration
- **Documentation**: Inline comments and comprehensive README

### Error Handling
- **Graceful Degradation**: Handle malformed/missing files
- **Detailed Logging**: Structured error messages with context
- **Recovery Procedures**: Reprocessing failed files, quarantine management
- **Monitoring Integration**: Health checks and alerting

### Performance Optimization  
- **Parallel Processing**: Concurrent file processing with worker pools
- **Memory Management**: Streaming processing for large files
- **Batch Operations**: Efficient database operations
- **Caching**: Intelligent caching for repeated operations

## Deployment

### Production Build
```bash
npm run build
```

### Environment Variables
```bash
# Optional: Override default source directories
BRONZE_SOURCE_DIRS="/path/to/data1,/path/to/data2"

# Optional: Processing configuration
BRONZE_BATCH_SIZE=100
BRONZE_WORKERS=4
BRONZE_MAX_FILE_SIZE=10485760
```

### Docker Support (Coming Soon)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Contributing

1. **Branch Strategy**: Use feature branches from appropriate workstream branches
2. **Testing**: All new code must include comprehensive tests
3. **Documentation**: Update README and inline documentation
4. **Type Safety**: Maintain strict TypeScript compliance
5. **Performance**: Consider impact on processing large datasets

## License

MIT License - see LICENSE file for details