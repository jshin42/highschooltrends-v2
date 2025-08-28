import { JSDOM } from 'jsdom';
import { StructuredLogger } from '../common/logger';
export class SilverExtractionContext {
    bronzeRecord;
    schoolSlug;
    sourceYear;
    fileContent;
    domDocument = null;
    _jsdom = null;
    logger;
    constructor(bronzeRecord, fileContent, sourceYear) {
        this.bronzeRecord = bronzeRecord;
        this.schoolSlug = bronzeRecord.school_slug;
        this.sourceYear = sourceYear || this.extractSourceYearFromPath(bronzeRecord.file_path);
        this.fileContent = fileContent;
        this.logger = StructuredLogger.getInstance().withContext({ component: 'SilverExtractionContext' });
    }
    /**
     * Lazy-load the DOM document from HTML content
     */
    getDocument() {
        if (!this.domDocument) {
            try {
                // Create JSDOM instance with security options
                this._jsdom = new JSDOM(this.fileContent, {
                    url: 'https://example.com', // Dummy URL for relative path resolution
                    referrer: 'https://example.com',
                    contentType: 'text/html',
                    includeNodeLocations: false,
                    storageQuota: 10000000, // 10MB limit
                    resources: 'usable',
                    runScripts: 'outside-only' // Security: don't run inline scripts
                });
                this.domDocument = this._jsdom.window.document;
                this.logger.debug('DOM document created', {
                    school_slug: this.schoolSlug,
                    content_length: this.fileContent.length,
                    elements_count: this.domDocument.querySelectorAll('*').length
                });
            }
            catch (error) {
                this.logger.error('Failed to create DOM document', {
                    school_slug: this.schoolSlug,
                    error_message: error instanceof Error ? error.message : String(error),
                    content_preview: this.fileContent.substring(0, 200)
                });
                throw new Error(`Failed to parse HTML content: ${error}`);
            }
        }
        return this.domDocument;
    }
    /**
     * Get window object for advanced DOM operations
     */
    getWindow() {
        if (!this._jsdom) {
            this.getDocument(); // Initializes JSDOM
        }
        return this._jsdom?.window || null;
    }
    /**
     * Extract text content from CSS selector
     */
    extractText(selector) {
        try {
            const document = this.getDocument();
            const element = document.querySelector(selector);
            return element?.textContent?.trim() || null;
        }
        catch (error) {
            this.logger.warn('Failed to extract text', { selector, error });
            return null;
        }
    }
    /**
     * Extract multiple text values from CSS selector
     */
    extractTextAll(selector) {
        try {
            const document = this.getDocument();
            const elements = document.querySelectorAll(selector);
            return Array.from(elements)
                .map(el => el.textContent?.trim())
                .filter((text) => !!text);
        }
        catch (error) {
            this.logger.warn('Failed to extract text array', { selector, error });
            return [];
        }
    }
    /**
     * Extract attribute value from element
     */
    extractAttribute(selector, attribute) {
        try {
            const document = this.getDocument();
            const element = document.querySelector(selector);
            return element?.getAttribute(attribute) || null;
        }
        catch (error) {
            this.logger.warn('Failed to extract attribute', { selector, attribute, error });
            return null;
        }
    }
    /**
     * Check if element exists
     */
    elementExists(selector) {
        try {
            const document = this.getDocument();
            return !!document.querySelector(selector);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get element count for selector
     */
    getElementCount(selector) {
        try {
            const document = this.getDocument();
            return document.querySelectorAll(selector).length;
        }
        catch (error) {
            return 0;
        }
    }
    /**
     * Find text content using regex pattern
     */
    findTextByPattern(pattern) {
        const match = this.fileContent.match(pattern);
        return match?.[1] || match?.[0] || null;
    }
    /**
     * Find all text matches using regex pattern
     */
    findAllTextByPattern(pattern) {
        const matches = this.fileContent.matchAll(pattern);
        return Array.from(matches).map(match => match[1] || match[0]).filter(Boolean);
    }
    /**
     * Get inner HTML of element
     */
    getInnerHTML(selector) {
        try {
            const document = this.getDocument();
            const element = document.querySelector(selector);
            return element?.innerHTML || null;
        }
        catch (error) {
            this.logger.warn('Failed to get innerHTML', { selector, error });
            return null;
        }
    }
    /**
     * Get table data as structured array
     */
    extractTableData(tableSelector, options = {}) {
        try {
            const document = this.getDocument();
            const table = document.querySelector(tableSelector);
            if (!table) {
                return [];
            }
            const rows = table.querySelectorAll('tr');
            const data = [];
            let headers = [];
            const { headerRow = 0, skipRows = [], maxRows } = options;
            for (let i = 0; i < rows.length; i++) {
                if (skipRows.includes(i))
                    continue;
                if (maxRows && data.length >= maxRows)
                    break;
                const row = rows[i];
                const cells = Array.from(row.querySelectorAll('td, th'));
                const cellTexts = cells.map(cell => cell.textContent?.trim() || '');
                if (i === headerRow) {
                    headers = cellTexts;
                }
                else if (headers.length > 0) {
                    const rowData = {};
                    cellTexts.forEach((text, index) => {
                        if (headers[index]) {
                            rowData[headers[index]] = text;
                        }
                    });
                    data.push(rowData);
                }
            }
            return data;
        }
        catch (error) {
            this.logger.warn('Failed to extract table data', { tableSelector, error });
            return [];
        }
    }
    /**
     * Clean up resources
     */
    cleanup() {
        if (this._jsdom) {
            this._jsdom.window.close();
            this._jsdom = null;
            this.domDocument = null;
        }
    }
    /**
     * Get performance metrics
     */
    getMetrics() {
        const contentSize = this.fileContent.length;
        const domElements = this.domDocument ? this.domDocument.querySelectorAll('*').length : 0;
        return {
            content_size: contentSize,
            dom_elements: domElements,
            processing_time_ms: 0 // TODO: Track processing time
        };
    }
    extractSourceYearFromPath(filePath) {
        // Extract year from file path (e.g., "/path/USNEWS_2024/file.html" -> 2024)
        const yearMatch = filePath.match(/USNEWS_(\d{4})/);
        if (yearMatch) {
            return parseInt(yearMatch[1], 10);
        }
        // Try to extract from filename
        const filenameMatch = filePath.match(/(\d{4})/);
        if (filenameMatch) {
            const year = parseInt(filenameMatch[1], 10);
            if (year >= 2020 && year <= 2030) {
                return year;
            }
        }
        // Default to current year
        return new Date().getFullYear();
    }
}
/**
 * Factory function to create extraction context
 */
export function createExtractionContext(bronzeRecord, fileContent, sourceYear) {
    return new SilverExtractionContext(bronzeRecord, fileContent, sourceYear);
}
/**
 * Utility functions for common extraction patterns
 */
export const ExtractionUtils = {
    /**
     * Clean and normalize school name
     */
    normalizeSchoolName(name) {
        if (!name)
            return null;
        return name
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/["'"]/g, '') // Remove quotes
            .trim();
    },
    /**
     * Parse enrollment number from various formats
     */
    parseEnrollment(text) {
        if (!text)
            return null;
        // Remove common prefixes and suffixes
        const cleaned = text
            .replace(/students?/i, '')
            .replace(/enrolled?/i, '')
            .replace(/[,:]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        // Extract number
        const match = cleaned.match(/(\d{1,6})/);
        if (match) {
            const num = parseInt(match[1], 10);
            return (num > 0 && num < 100000) ? num : null; // Reasonable range
        }
        return null;
    },
    /**
     * Parse phone number to standard format
     */
    parsePhoneNumber(text) {
        if (!text)
            return null;
        const digits = text.replace(/\D/g, '');
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        else if (digits.length === 11 && digits[0] === '1') {
            return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
        }
        return text; // Return original if can't format
    },
    /**
     * Validate and normalize website URL
     */
    normalizeWebsite(url) {
        if (!url)
            return null;
        let normalized = url.trim();
        // Add protocol if missing
        if (!/^https?:\/\//i.test(normalized)) {
            normalized = 'https://' + normalized;
        }
        // Basic URL validation
        try {
            new URL(normalized);
            return normalized;
        }
        catch {
            return url; // Return original if invalid
        }
    },
    /**
     * Parse percentage from various formats
     */
    parsePercentage(text) {
        if (!text)
            return null;
        // Look for percentage pattern
        const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
        if (percentMatch) {
            const pct = parseFloat(percentMatch[1]);
            return (pct >= 0 && pct <= 100) ? pct : null;
        }
        // Look for decimal pattern
        const decimalMatch = text.match(/0\.(\d{1,3})/);
        if (decimalMatch) {
            const decimal = parseFloat(`0.${decimalMatch[1]}`);
            return decimal <= 1 ? decimal * 100 : null;
        }
        return null;
    }
};
//# sourceMappingURL=extraction-context.js.map