import { readFileSync } from 'fs';
import { StructuredLogger } from '../common/logger';
export class BaseExtractionMethod {
    logger;
    methodName;
    constructor(methodName) {
        this.methodName = methodName;
        this.logger = StructuredLogger.getInstance().withContext({ component: `ExtractionMethod:${methodName}` });
    }
    createError(fieldName, errorType, message, method) {
        return {
            field_name: fieldName,
            error_type: errorType,
            error_message: message,
            extraction_method: method,
            timestamp: new Date().toISOString()
        };
    }
    safeExtractText(element, fieldName) {
        if (!element) {
            return {
                value: null,
                confidence: 0,
                error: this.createError(fieldName, 'missing_dom_element', 'Element not found', this.methodName)
            };
        }
        const text = element.textContent?.trim();
        if (!text) {
            return {
                value: null,
                confidence: 0,
                error: this.createError(fieldName, 'missing_dom_element', 'Element found but no text content', this.methodName)
            };
        }
        return {
            value: text,
            confidence: 85 // Base confidence for successful text extraction
        };
    }
    parseNumber(text, fieldName) {
        if (!text) {
            return { value: null, confidence: 0 };
        }
        // Remove common formatting characters
        const cleanText = text.replace(/[,\s$%]/g, '');
        const number = parseFloat(cleanText);
        if (isNaN(number)) {
            return {
                value: null,
                confidence: 0,
                error: this.createError(fieldName, 'parse_error', `Could not parse number from: "${text}"`, this.methodName)
            };
        }
        return {
            value: number,
            confidence: 90 // High confidence for successful number parsing
        };
    }
    parsePercentage(text, fieldName) {
        if (!text) {
            return { value: null, confidence: 0 };
        }
        // Extract percentage value
        const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
        if (percentMatch) {
            const percentage = parseFloat(percentMatch[1]);
            if (percentage >= 0 && percentage <= 100) {
                return {
                    value: percentage,
                    confidence: 95 // Very high confidence for valid percentage
                };
            }
        }
        // Try parsing as decimal (0.0 - 1.0)
        const decimal = parseFloat(text.replace(/[^\d.]/g, ''));
        if (!isNaN(decimal) && decimal >= 0 && decimal <= 1) {
            return {
                value: decimal * 100,
                confidence: 80 // Lower confidence for decimal conversion
            };
        }
        return {
            value: null,
            confidence: 0,
            error: this.createError(fieldName, 'parse_error', `Could not parse percentage from: "${text}"`, this.methodName)
        };
    }
    parseRank(text, fieldName) {
        if (!text) {
            return { value: null, confidence: 0 };
        }
        // Remove commas from numbers like "1,234"
        const cleanText = text.replace(/,/g, '');
        // Extract ranking number
        const rankMatch = cleanText.match(/(?:rank|#)\s*(\d{1,5})/i);
        if (rankMatch) {
            const rank = parseInt(rankMatch[1], 10);
            if (rank > 0 && rank <= 50000) { // Reasonable range for school rankings
                return {
                    value: rank,
                    confidence: 90
                };
            }
        }
        // Try direct number extraction (with comma handling and negative number detection)
        const numberMatch = cleanText.match(/(-?\d{1,5})/);
        if (numberMatch) {
            const rank = parseInt(numberMatch[1], 10);
            // Reject negative numbers and unreasonable values
            if (rank > 0 && rank <= 50000) {
                return {
                    value: rank,
                    confidence: 70 // Lower confidence for ambiguous extraction
                };
            }
        }
        return {
            value: null,
            confidence: 0,
            error: this.createError(fieldName, 'parse_error', `Could not parse rank from: "${text}"`, this.methodName)
        };
    }
}
export class SilverProcessor {
    extractionMethods;
    logger;
    constructor(extractionMethods = []) {
        this.extractionMethods = extractionMethods;
        this.logger = StructuredLogger.getInstance().withContext({ component: 'SilverProcessor' });
    }
    getErrorMessage(error) {
        if (error instanceof Error)
            return error.message;
        return String(error);
    }
    async processRecord(bronzeRecord, // BronzeRecord from Bronze layer
    htmlContent) {
        const timer = this.logger.startTimer('process_record', {
            bronze_record_id: bronzeRecord.id,
            school_slug: bronzeRecord.school_slug
        });
        try {
            // Load HTML content if not provided
            if (!htmlContent) {
                try {
                    htmlContent = readFileSync(bronzeRecord.file_path, 'utf-8');
                }
                catch (error) {
                    throw new Error(`Could not read file: ${bronzeRecord.file_path} - ${error}`);
                }
            }
            const context = {
                bronzeRecord,
                schoolSlug: bronzeRecord.school_slug,
                sourceYear: this.extractSourceYear(bronzeRecord.file_path),
                fileContent: htmlContent,
                domDocument: null // Will be populated by individual extraction methods
            };
            // Initialize result accumulator
            let combinedData = {
                bronze_record_id: bronzeRecord.id,
                school_slug: bronzeRecord.school_slug,
                source_year: context.sourceYear,
                extraction_status: 'extracting'
            };
            let allErrors = [];
            let fieldConfidences = {};
            // Run all extraction methods
            for (const method of this.extractionMethods) {
                try {
                    const result = await method.extract(htmlContent, context);
                    // Merge extracted data (later methods can override earlier ones)
                    combinedData = { ...combinedData, ...result.data };
                    // Merge field confidences (take maximum confidence per field category)
                    Object.entries(result.fieldConfidences).forEach(([field, confidence]) => {
                        const currentConfidence = fieldConfidences[field] || 0;
                        fieldConfidences[field] = Math.max(currentConfidence, confidence || 0);
                    });
                    // Accumulate errors
                    allErrors.push(...result.errors);
                }
                catch (error) {
                    this.logger.error('Extraction method failed', {
                        method: method.constructor.name,
                        error_message: this.getErrorMessage(error)
                    });
                    allErrors.push({
                        field_name: 'extraction_method',
                        error_type: 'parse_error',
                        error_message: `Method ${method.constructor.name} failed: ${error}`,
                        extraction_method: 'manual_rule',
                        timestamp: new Date().toISOString()
                    });
                }
            }
            // Calculate overall confidence
            const confidenceValues = Object.values(fieldConfidences).filter(c => c !== undefined);
            const overallConfidence = confidenceValues.length > 0
                ? confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length
                : 0;
            // Determine final extraction status
            const extractedFieldCount = Object.values(combinedData).filter(v => v !== null && v !== undefined).length;
            const totalFieldCount = 74; // Total Silver record fields
            let extraction_status = 'failed';
            if (extractedFieldCount >= totalFieldCount * 0.8) {
                extraction_status = 'extracted';
            }
            else if (extractedFieldCount >= totalFieldCount * 0.3) {
                extraction_status = 'partial';
            }
            combinedData.extraction_status = extraction_status;
            combinedData.extraction_confidence = overallConfidence;
            combinedData.processing_errors = allErrors;
            // Ensure complete FieldConfidence object
            const completeFieldConfidences = {
                school_name: fieldConfidences.school_name || 0,
                rankings: fieldConfidences.rankings || 0,
                academics: fieldConfidences.academics || 0,
                demographics: fieldConfidences.demographics || 0,
                location: fieldConfidences.location || 0,
                enrollment_data: fieldConfidences.enrollment_data || 0
            };
            timer.end('Record processing completed', {
                extraction_status,
                overall_confidence: overallConfidence,
                extracted_fields: extractedFieldCount,
                error_count: allErrors.length
            });
            return {
                silverRecord: combinedData,
                overallConfidence,
                fieldConfidences: completeFieldConfidences,
                errors: allErrors
            };
        }
        catch (error) {
            this.logger.error('Record processing failed', { error_message: this.getErrorMessage(error) });
            throw error;
        }
    }
    async processBatch(bronzeRecords) {
        const timer = this.logger.startTimer('process_batch', {
            batch_size: bronzeRecords.length
        });
        try {
            const results = [];
            let successful = 0;
            let partial = 0;
            let failed = 0;
            let totalConfidence = 0;
            for (const bronzeRecord of bronzeRecords) {
                try {
                    const result = await this.processRecord(bronzeRecord);
                    results.push(result);
                    if (result.silverRecord.extraction_status === 'extracted') {
                        successful++;
                    }
                    else if (result.silverRecord.extraction_status === 'partial') {
                        partial++;
                    }
                    else {
                        failed++;
                    }
                    totalConfidence += result.overallConfidence;
                }
                catch (error) {
                    failed++;
                    this.logger.error('Failed to process record', {
                        bronze_record_id: bronzeRecord.id,
                        error_message: this.getErrorMessage(error)
                    });
                    // Add failed result
                    results.push({
                        silverRecord: {
                            bronze_record_id: bronzeRecord.id,
                            school_slug: bronzeRecord.school_slug,
                            source_year: this.extractSourceYear(bronzeRecord.file_path),
                            extraction_status: 'failed',
                            extraction_confidence: 0,
                            processing_errors: [{
                                    field_name: 'processing',
                                    error_type: 'parse_error',
                                    error_message: `Processing failed: ${error}`,
                                    extraction_method: 'manual_rule',
                                    timestamp: new Date().toISOString()
                                }]
                        },
                        overallConfidence: 0,
                        fieldConfidences: {
                            school_name: 0,
                            rankings: 0,
                            academics: 0,
                            demographics: 0,
                            location: 0,
                            enrollment_data: 0
                        },
                        errors: []
                    });
                }
            }
            const averageConfidence = results.length > 0 ? totalConfidence / results.length : 0;
            timer.end('Batch processing completed', {
                total_processed: results.length,
                successful,
                partial,
                failed,
                average_confidence: averageConfidence
            });
            return {
                results,
                summary: {
                    total_processed: results.length,
                    successful,
                    partial,
                    failed,
                    average_confidence: averageConfidence
                }
            };
        }
        catch (error) {
            this.logger.error('Batch processing failed', { error_message: this.getErrorMessage(error) });
            throw error;
        }
    }
    extractSourceYear(filePath) {
        // Extract year from file path (e.g., "/path/USNEWS_2024/file.html" -> 2024)
        const yearMatch = filePath.match(/USNEWS_(\d{4})/);
        if (yearMatch) {
            return parseInt(yearMatch[1], 10);
        }
        // Default to current year if not found
        return new Date().getFullYear();
    }
    addExtractionMethod(method) {
        this.extractionMethods.push(method);
    }
    getExtractionMethods() {
        return [...this.extractionMethods];
    }
}
//# sourceMappingURL=extraction-methods.js.map