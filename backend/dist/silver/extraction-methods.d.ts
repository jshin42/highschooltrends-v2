import { ExtractionMethod, ExtractionContext, SilverRecord, ExtractionError, ExtractionErrorType, FieldConfidence } from './types';
import { StructuredLogger } from '../common/logger';
export declare abstract class BaseExtractionMethod {
    protected logger: StructuredLogger;
    protected methodName: string;
    constructor(methodName: string);
    abstract extract(html: string, context: ExtractionContext): Promise<{
        data: Partial<SilverRecord>;
        confidence: number;
        fieldConfidences: Partial<FieldConfidence>;
        errors: ExtractionError[];
    }>;
    protected createError(fieldName: string, errorType: ExtractionErrorType, message: string, method: ExtractionMethod): ExtractionError;
    protected safeExtractText(element: Element | null, fieldName: string): {
        value: string | null;
        confidence: number;
        error?: ExtractionError;
    };
    protected parseNumber(text: string | null, fieldName: string): {
        value: number | null;
        confidence: number;
        error?: ExtractionError;
    };
    protected parsePercentage(text: string | null, fieldName: string): {
        value: number | null;
        confidence: number;
        error?: ExtractionError;
    };
    protected parseRank(text: string | null, fieldName: string): {
        value: number | null;
        confidence: number;
        error?: ExtractionError;
    };
}
export declare class SilverProcessor {
    private extractionMethods;
    private logger;
    constructor(extractionMethods?: BaseExtractionMethod[]);
    private getErrorMessage;
    processRecord(bronzeRecord: any, // BronzeRecord from Bronze layer
    htmlContent?: string): Promise<{
        silverRecord: Partial<SilverRecord>;
        overallConfidence: number;
        fieldConfidences: FieldConfidence;
        errors: ExtractionError[];
    }>;
    processBatch(bronzeRecords: any[]): Promise<{
        results: Array<{
            silverRecord: Partial<SilverRecord>;
            overallConfidence: number;
            fieldConfidences: FieldConfidence;
            errors: ExtractionError[];
        }>;
        summary: {
            total_processed: number;
            successful: number;
            partial: number;
            failed: number;
            average_confidence: number;
        };
    }>;
    private extractSourceYear;
    addExtractionMethod(method: BaseExtractionMethod): void;
    getExtractionMethods(): BaseExtractionMethod[];
}
//# sourceMappingURL=extraction-methods.d.ts.map