import { ConfidenceScorer, FieldConfidence, SilverRecord, ExtractionMethod } from './types';
export declare class SilverConfidenceScorer implements ConfidenceScorer {
    private logger;
    private static readonly METHOD_BASE_SCORES;
    private static readonly FIELD_WEIGHTS;
    private static readonly VALIDATION_RANGES;
    constructor();
    private getErrorMessage;
    scoreExtraction(extractedData: Partial<SilverRecord>, extractionMethods: Record<string, ExtractionMethod>): {
        overallConfidence: number;
        fieldConfidences: FieldConfidence;
    };
    private calculateFieldConfidences;
    private scoreSchoolNameField;
    private scoreRankingsField;
    private scoreAcademicsField;
    private scoreDemographicsField;
    private scoreLocationField;
    private scoreEnrollmentField;
    private calculateOverallConfidence;
    private getMethodBaseScore;
    private isPercentageField;
    /**
     * Get confidence level description
     */
    static getConfidenceLevelDescription(confidence: number): string;
    /**
     * Determine if record meets minimum confidence threshold
     */
    static meetsMinimumThreshold(fieldConfidences: FieldConfidence, overallConfidence: number, threshold?: number): boolean;
}
//# sourceMappingURL=confidence-scorer.d.ts.map