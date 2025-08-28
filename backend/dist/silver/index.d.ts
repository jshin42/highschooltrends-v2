/**
 * Silver Layer - Structured Data Extraction
 *
 * The Silver layer extracts structured school data from Bronze layer HTML files
 * using a multi-tier extraction pipeline with confidence scoring.
 */
export { SilverService } from './silver-service';
export { SilverProcessor, BaseExtractionMethod } from './extraction-methods';
export { SilverExtractionContext, createExtractionContext, ExtractionUtils } from './extraction-context';
export { SilverConfidenceScorer } from './confidence-scorer';
export { SilverDatabaseMigration, initializeSilverDatabase } from './database-migration';
export * from './types';
export declare const DEFAULT_SILVER_CONFIG: {
    input_batch_size: number;
    parallel_workers: number;
    min_confidence_threshold: number;
    enable_fallback_extraction: boolean;
    enable_data_validation: boolean;
    max_extraction_time_ms: number;
};
export declare function createSilverProcessor(databasePath?: string, extractionMethods?: BaseExtractionMethod[]): {
    service: SilverService;
    processor: SilverProcessor;
    scorer: SilverConfidenceScorer;
};
//# sourceMappingURL=index.d.ts.map