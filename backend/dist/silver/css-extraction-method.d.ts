import { BaseExtractionMethod } from './extraction-methods';
import { SilverRecord, FieldConfidence, ExtractionError, ExtractionContext } from './types';
/**
 * CSS Selector-based extraction method for US News HTML structure
 * Tier 1 of the multi-tier extraction pipeline (highest confidence)
 */
export declare class CSSExtractionMethod extends BaseExtractionMethod {
    private static readonly SELECTORS;
    constructor();
    extract(html: string, context: ExtractionContext): Promise<{
        data: Partial<SilverRecord>;
        confidence: number;
        fieldConfidences: Partial<FieldConfidence>;
        errors: ExtractionError[];
    }>;
    private extractSchoolName;
    private extractEnrollment;
    private extractNationalRank;
    private extractStateRank;
    private extractCity;
    private extractState;
    private applyResult;
    private calculateAcademicsConfidence;
    private calculateDemographicsConfidence;
    private calculateLocationConfidence;
    private calculateEnrollmentConfidence;
    private extractNcesId;
    private extractGrades;
    private extractAddressStreet;
    private extractZip;
    private extractPhone;
    private extractWebsite;
    private extractSetting;
    private extractStudentTeacherRatio;
    private extractFullTimeTeachers;
    private extractApParticipation;
    private extractApPassRate;
    private extractMathProficiency;
    private extractReadingProficiency;
    private extractScienceProficiency;
    private extractGraduationRate;
    private extractCollegeReadiness;
    private extractWhitePct;
    private extractAsianPct;
    private extractHispanicPct;
    private extractBlackPct;
    private extractAmericanIndianPct;
    private extractTwoOrMorePct;
    private extractFemalePct;
    private extractMalePct;
    private extractEconomicallyDisadvantaged;
    private extractFreeLunchPct;
    private extractReducedLunchPct;
    private extractPercentageField;
    private getErrorMessage;
    /**
     * Extract JSON-LD structured data from US News pages
     */
    private extractStructuredData;
    /**
     * Extract school data from JSON-LD structured data
     */
    private extractFromStructuredData;
}
//# sourceMappingURL=css-extraction-method.d.ts.map