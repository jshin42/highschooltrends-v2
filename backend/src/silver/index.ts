/**
 * Silver Layer - Structured Data Extraction
 * 
 * The Silver layer extracts structured school data from Bronze layer HTML files
 * using a multi-tier extraction pipeline with confidence scoring.
 */

// Core Services
export { SilverService } from './silver-service';
export { SilverProcessor, BaseExtractionMethod } from './extraction-methods';
export { SilverExtractionContext, createExtractionContext, ExtractionUtils } from './extraction-context';
export { SilverConfidenceScorer } from './confidence-scorer';

// Database Management
export { SilverDatabaseMigration, initializeSilverDatabase } from './database-migration';

// Type Definitions
export * from './types';

// Default Configuration
export const DEFAULT_SILVER_CONFIG = {
  input_batch_size: 50,
  parallel_workers: 4,
  min_confidence_threshold: 60,
  enable_fallback_extraction: true,
  enable_data_validation: true,
  max_extraction_time_ms: 30000
};

// Factory function for creating complete Silver processor
export function createSilverProcessor(
  databasePath: string = './data/highschooltrends.db',
  extractionMethods: BaseExtractionMethod[] = []
): {
  service: SilverService;
  processor: SilverProcessor;
  scorer: SilverConfidenceScorer;
} {
  const service = new SilverService(databasePath);
  const processor = new SilverProcessor(extractionMethods);
  const scorer = new SilverConfidenceScorer();

  return {
    service,
    processor,
    scorer
  };
}