import { ExtractionContext } from './types';
import { BronzeRecord } from '../bronze/types';
export declare class SilverExtractionContext implements ExtractionContext {
    bronzeRecord: BronzeRecord;
    schoolSlug: string;
    sourceYear: number;
    fileContent: string;
    domDocument: Document | null;
    private _jsdom;
    private logger;
    constructor(bronzeRecord: BronzeRecord, fileContent: string, sourceYear?: number);
    /**
     * Lazy-load the DOM document from HTML content
     */
    getDocument(): Document;
    /**
     * Get window object for advanced DOM operations
     */
    getWindow(): any | null;
    /**
     * Extract text content from CSS selector
     */
    extractText(selector: string): string | null;
    /**
     * Extract multiple text values from CSS selector
     */
    extractTextAll(selector: string): string[];
    /**
     * Extract attribute value from element
     */
    extractAttribute(selector: string, attribute: string): string | null;
    /**
     * Check if element exists
     */
    elementExists(selector: string): boolean;
    /**
     * Get element count for selector
     */
    getElementCount(selector: string): number;
    /**
     * Find text content using regex pattern
     */
    findTextByPattern(pattern: RegExp): string | null;
    /**
     * Find all text matches using regex pattern
     */
    findAllTextByPattern(pattern: RegExp): string[];
    /**
     * Get inner HTML of element
     */
    getInnerHTML(selector: string): string | null;
    /**
     * Get table data as structured array
     */
    extractTableData(tableSelector: string, options?: {
        headerRow?: number;
        skipRows?: number[];
        maxRows?: number;
    }): Array<Record<string, string>>;
    /**
     * Clean up resources
     */
    cleanup(): void;
    /**
     * Get performance metrics
     */
    getMetrics(): {
        content_size: number;
        dom_elements: number;
        processing_time_ms: number;
    };
    private extractSourceYearFromPath;
}
/**
 * Factory function to create extraction context
 */
export declare function createExtractionContext(bronzeRecord: BronzeRecord, fileContent: string, sourceYear?: number): SilverExtractionContext;
/**
 * Utility functions for common extraction patterns
 */
export declare const ExtractionUtils: {
    /**
     * Clean and normalize school name
     */
    normalizeSchoolName(name: string | null): string | null;
    /**
     * Parse enrollment number from various formats
     */
    parseEnrollment(text: string | null): number | null;
    /**
     * Parse phone number to standard format
     */
    parsePhoneNumber(text: string | null): string | null;
    /**
     * Validate and normalize website URL
     */
    normalizeWebsite(url: string | null): string | null;
    /**
     * Parse percentage from various formats
     */
    parsePercentage(text: string | null): number | null;
};
//# sourceMappingURL=extraction-context.d.ts.map