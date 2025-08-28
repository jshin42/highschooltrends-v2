import { JSDOM } from 'jsdom';
import { BaseExtractionMethod } from './extraction-methods';
/**
 * CSS Selector-based extraction method for US News HTML structure
 * Tier 1 of the multi-tier extraction pipeline (highest confidence)
 */
export class CSSExtractionMethod extends BaseExtractionMethod {
    // Complete CSS selectors for ALL gold standard fields
    static SELECTORS = {
        // School name patterns (priority order)
        school_name: [
            'h1[data-testid="school-name"]',
            '.school-profile-header h1',
            'h1.profile-header-name',
            '.school-name-header',
            'h1',
            'title' // Fallback to page title
        ],
        // NCES ID patterns
        nces_id: [
            '[data-testid="nces-id"]',
            '.nces-identifier',
            '.school-id'
        ],
        // Address patterns (complete)
        address_street: [
            '[data-testid="school-address-street"]',
            '.school-address .street',
            '.address-line-1'
        ],
        address_city: [
            '[data-testid="school-city"]',
            '.school-location .city',
            '.address-city'
        ],
        address_state: [
            '[data-testid="school-state"]',
            '.school-location .state',
            '.address-state'
        ],
        address_zip: [
            '[data-testid="school-zip"]',
            '.school-location .zip',
            '.address-zip'
        ],
        // Contact information
        phone: [
            '[data-testid="school-phone"]',
            '.school-contact .phone',
            '.phone-number'
        ],
        website: [
            '[data-testid="school-website"]',
            '.school-contact .website a',
            '.website-link'
        ],
        // School characteristics  
        grades: [
            '[data-testid="grades-served"]',
            '.grades-served',
            '.school-grades'
        ],
        setting: [
            '[data-testid="school-setting"]',
            '.school-setting',
            '.location-type'
        ],
        // Enrollment patterns
        enrollment: [
            '[data-testid="enrollment-number"]',
            '.enrollment-stats .number',
            '.student-body-size',
            '.enrollment-count'
        ],
        student_teacher_ratio: [
            '[data-testid="student-teacher-ratio"]',
            '.ratio-display',
            '.teacher-ratio'
        ],
        full_time_teachers: [
            '[data-testid="teacher-count"]',
            '.teacher-stats .count',
            '.full-time-teachers'
        ],
        // Ranking patterns  
        national_rank: [
            '[data-testid="national-ranking"]',
            '.national-rank .rank-number',
            '.ranking-badge-national',
            '.rank-display.national'
        ],
        state_rank: [
            '[data-testid="state-ranking"]',
            '.state-rank .rank-number',
            '.ranking-badge-state',
            '.rank-display.state'
        ],
        // Academic performance patterns
        ap_participation_rate: [
            '[data-testid="ap-participation"]',
            '.ap-stats .participation',
            '.advanced-placement .participation'
        ],
        ap_pass_rate: [
            '[data-testid="ap-pass-rate"]',
            '.ap-stats .pass-rate',
            '.advanced-placement .pass-rate'
        ],
        math_proficiency: [
            '[data-testid="math-proficiency"]',
            '.proficiency-math',
            '.academic-performance .math'
        ],
        reading_proficiency: [
            '[data-testid="reading-proficiency"]',
            '.proficiency-reading',
            '.academic-performance .reading'
        ],
        science_proficiency: [
            '[data-testid="science-proficiency"]',
            '.proficiency-science',
            '.academic-performance .science'
        ],
        graduation_rate: [
            '[data-testid="graduation-rate"]',
            '.graduation-stats .rate',
            '.graduation-percentage'
        ],
        college_readiness_index: [
            '[data-testid="college-readiness"]',
            '.college-readiness-score',
            '.readiness-index'
        ],
        // Demographics patterns
        white_pct: [
            '[data-testid="demo-white"]',
            '.demographics .white-percentage',
            '.racial-breakdown .white'
        ],
        asian_pct: [
            '[data-testid="demo-asian"]',
            '.demographics .asian-percentage',
            '.racial-breakdown .asian'
        ],
        hispanic_pct: [
            '[data-testid="demo-hispanic"]',
            '.demographics .hispanic-percentage',
            '.racial-breakdown .hispanic'
        ],
        black_pct: [
            '[data-testid="demo-black"]',
            '.demographics .black-percentage',
            '.racial-breakdown .black'
        ],
        american_indian_pct: [
            '[data-testid="demo-native"]',
            '.demographics .native-percentage',
            '.racial-breakdown .native'
        ],
        two_or_more_pct: [
            '[data-testid="demo-multiracial"]',
            '.demographics .multiracial-percentage',
            '.racial-breakdown .multiracial'
        ],
        // Gender patterns
        female_pct: [
            '[data-testid="gender-female"]',
            '.gender-breakdown .female-percentage',
            '.demographics .female'
        ],
        male_pct: [
            '[data-testid="gender-male"]',
            '.gender-breakdown .male-percentage',
            '.demographics .male'
        ],
        // Socioeconomic patterns (often null)
        economically_disadvantaged_pct: [
            '[data-testid="econ-disadvantaged"]',
            '.socioeconomic .disadvantaged',
            '.economic-status'
        ],
        free_lunch_pct: [
            '[data-testid="free-lunch"]',
            '.lunch-programs .free-percentage'
        ],
        reduced_lunch_pct: [
            '[data-testid="reduced-lunch"]',
            '.lunch-programs .reduced-percentage'
        ]
    };
    constructor() {
        super('css_selector');
    }
    async extract(html, context) {
        const timer = this.logger.startTimer('css_extraction', {
            school_slug: context.schoolSlug,
            content_length: html.length
        });
        try {
            // Parse HTML with JSDOM
            const dom = new JSDOM(html, {
                url: 'https://www.usnews.com', // Base URL for relative links
                resources: 'usable',
                runScripts: 'outside-only'
            });
            const document = dom.window.document;
            // Try to extract from JSON-LD structured data first (US News format)
            const structuredData = this.extractStructuredData(document);
            if (structuredData) {
                return await this.extractFromStructuredData(structuredData, context);
            }
            // Initialize result containers
            const extractedData = {
                bronze_record_id: context.bronzeRecord.id,
                school_slug: context.schoolSlug,
                source_year: context.sourceYear
            };
            const fieldConfidences = {};
            const errors = [];
            // Extract ALL gold standard fields (only report critical field errors)
            // Core school information
            const nameResult = this.extractSchoolName(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'school_name', nameResult, true); // Critical field
            const ncesResult = this.extractNcesId(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'nces_id', ncesResult, false); // Optional
            const gradesResult = this.extractGrades(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'grades_served', gradesResult, false);
            // Complete address information
            const streetResult = this.extractAddressStreet(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'address_street', streetResult, false);
            const cityResult = this.extractCity(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'address_city', cityResult, false);
            const stateResult = this.extractState(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'address_state', stateResult, false);
            const zipResult = this.extractZip(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'address_zip', zipResult, false);
            // Contact information
            const phoneResult = this.extractPhone(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'phone', phoneResult, false);
            const websiteResult = this.extractWebsite(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'website', websiteResult, false);
            const settingResult = this.extractSetting(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'setting', settingResult, false);
            // Enrollment and staffing
            const enrollmentResult = this.extractEnrollment(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'enrollment', enrollmentResult, false);
            const ratioResult = this.extractStudentTeacherRatio(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'student_teacher_ratio', ratioResult, false);
            const teachersResult = this.extractFullTimeTeachers(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'full_time_teachers', teachersResult, false);
            // Rankings
            const nationalRankResult = this.extractNationalRank(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'national_rank', nationalRankResult, false);
            const stateRankResult = this.extractStateRank(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'state_rank', stateRankResult, false);
            // Academic performance
            const apParticipationResult = this.extractApParticipation(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'ap_participation_rate', apParticipationResult, false);
            const apPassResult = this.extractApPassRate(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'ap_pass_rate', apPassResult, false);
            const mathResult = this.extractMathProficiency(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'math_proficiency', mathResult, false);
            const readingResult = this.extractReadingProficiency(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'reading_proficiency', readingResult, false);
            const scienceResult = this.extractScienceProficiency(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'science_proficiency', scienceResult, false);
            const gradRateResult = this.extractGraduationRate(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'graduation_rate', gradRateResult, false);
            const collegeReadinessResult = this.extractCollegeReadiness(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'college_readiness_index', collegeReadinessResult, false);
            // Demographics
            const whiteResult = this.extractWhitePct(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'white_pct', whiteResult, false);
            const asianResult = this.extractAsianPct(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'asian_pct', asianResult, false);
            const hispanicResult = this.extractHispanicPct(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'hispanic_pct', hispanicResult, false);
            const blackResult = this.extractBlackPct(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'black_pct', blackResult, false);
            const nativeResult = this.extractAmericanIndianPct(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'american_indian_pct', nativeResult, false);
            const multiracialResult = this.extractTwoOrMorePct(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'two_or_more_pct', multiracialResult, false);
            // Gender
            const femaleResult = this.extractFemalePct(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'female_pct', femaleResult, false);
            const maleResult = this.extractMalePct(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'male_pct', maleResult, false);
            // Socioeconomic (often null)
            const econDisadvResult = this.extractEconomicallyDisadvantaged(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'economically_disadvantaged_pct', econDisadvResult, false);
            const freeLunchResult = this.extractFreeLunchPct(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'free_lunch_pct', freeLunchResult, false);
            const reducedLunchResult = this.extractReducedLunchPct(document);
            this.applyResult(extractedData, fieldConfidences, errors, 'reduced_lunch_pct', reducedLunchResult, false);
            // Calculate field-level confidences with comprehensive coverage
            const completeFieldConfidences = {
                school_name: fieldConfidences.school_name || 0,
                rankings: Math.max(fieldConfidences.national_rank || 0, fieldConfidences.state_rank || 0),
                academics: this.calculateAcademicsConfidence([
                    fieldConfidences.ap_participation_rate || 0,
                    fieldConfidences.ap_pass_rate || 0,
                    fieldConfidences.math_proficiency || 0,
                    fieldConfidences.reading_proficiency || 0,
                    fieldConfidences.science_proficiency || 0,
                    fieldConfidences.graduation_rate || 0,
                    fieldConfidences.college_readiness_index || 0
                ]),
                demographics: this.calculateDemographicsConfidence([
                    fieldConfidences.white_pct || 0,
                    fieldConfidences.asian_pct || 0,
                    fieldConfidences.hispanic_pct || 0,
                    fieldConfidences.black_pct || 0,
                    fieldConfidences.american_indian_pct || 0,
                    fieldConfidences.two_or_more_pct || 0,
                    fieldConfidences.female_pct || 0,
                    fieldConfidences.male_pct || 0
                ]),
                location: this.calculateLocationConfidence([
                    fieldConfidences.address_street || 0,
                    fieldConfidences.address_city || 0,
                    fieldConfidences.address_state || 0,
                    fieldConfidences.address_zip || 0,
                    fieldConfidences.phone || 0,
                    fieldConfidences.website || 0,
                    fieldConfidences.setting || 0
                ]),
                enrollment_data: this.calculateEnrollmentConfidence([
                    fieldConfidences.enrollment || 0,
                    fieldConfidences.student_teacher_ratio || 0,
                    fieldConfidences.full_time_teachers || 0
                ])
            };
            // Calculate overall confidence (weighted average)
            const confidenceValues = Object.values(completeFieldConfidences).filter((c) => typeof c === 'number' && c > 0);
            const overallConfidence = confidenceValues.length > 0
                ? confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length
                : 0;
            // Cleanup DOM
            dom.window.close();
            timer.end('CSS extraction completed', {
                fields_extracted: Object.keys(extractedData).length - 3, // Exclude metadata fields
                overall_confidence: overallConfidence,
                errors_count: errors.length
            });
            return {
                data: extractedData,
                confidence: overallConfidence,
                fieldConfidences: completeFieldConfidences,
                errors
            };
        }
        catch (error) {
            timer.end('CSS extraction failed', { error: this.getErrorMessage(error) });
            return {
                data: {
                    bronze_record_id: context.bronzeRecord.id,
                    school_slug: context.schoolSlug,
                    source_year: context.sourceYear
                },
                confidence: 0,
                fieldConfidences: {
                    school_name: 0,
                    rankings: 0,
                    academics: 0,
                    demographics: 0,
                    location: 0,
                    enrollment_data: 0
                },
                errors: [this.createError('css_extraction', 'parse_error', `CSS extraction failed: ${error}`, 'css_selector')]
            };
        }
    }
    extractSchoolName(document) {
        for (const selector of CSSExtractionMethod.SELECTORS.school_name) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    let text = element.textContent?.trim();
                    // Clean up title tag content
                    if (selector === 'title' && text) {
                        // Extract school name from title like "School Name | US News Best High Schools"
                        const match = text.match(/^([^|]+)/);
                        text = match ? match[1].trim() : text;
                    }
                    // Validate school name - must be reasonable length and not generic error text
                    if (text && text.length >= 5 && text.length <= 100 &&
                        !text.toLowerCase().includes('not found') &&
                        !text.toLowerCase().includes('error') &&
                        !text.toLowerCase().includes('page not found') &&
                        !/^(error|not\s+found|page\s+not\s+found)$/i.test(text.trim())) {
                        // Higher confidence for specific selectors
                        const confidence = selector.includes('data-testid') ? 95 :
                            selector.includes('h1') ? 90 :
                                selector === 'title' ? 70 : 85;
                        return { value: text, confidence };
                    }
                }
            }
            catch (error) {
                // Continue to next selector on error
                continue;
            }
        }
        return {
            value: null,
            confidence: 0,
            error: this.createError('school_name', 'css_selector_failed', 'No school name found with CSS selectors', 'css_selector')
        };
    }
    extractEnrollment(document) {
        for (const selector of CSSExtractionMethod.SELECTORS.enrollment) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent?.trim();
                    if (text) {
                        // Handle text patterns like "Total Students: 856"
                        let cleanText = text;
                        const textMatch = text.match(/(?:total\s+students?|enrollment)\s*:?\s*(\d{1,6}(?:,\d{3})*)/i);
                        if (textMatch) {
                            cleanText = textMatch[1];
                        }
                        const number = this.parseNumber(cleanText, 'enrollment');
                        if (number.value && number.value >= 10 && number.value <= 10000) {
                            return { value: number.value, confidence: 90 };
                        }
                    }
                }
            }
            catch (error) {
                continue;
            }
        }
        return {
            value: null,
            confidence: 0,
            error: this.createError('enrollment', 'css_selector_failed', 'No enrollment found with CSS selectors', 'css_selector')
        };
    }
    extractNationalRank(document) {
        for (const selector of CSSExtractionMethod.SELECTORS.national_rank) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent?.trim();
                    if (text) {
                        const rank = this.parseRank(text, 'national_rank');
                        if (rank.value && rank.value >= 1 && rank.value <= 50000) {
                            return { value: rank.value, confidence: 95 };
                        }
                    }
                }
            }
            catch (error) {
                continue;
            }
        }
        return {
            value: null,
            confidence: 0,
            error: this.createError('national_rank', 'css_selector_failed', 'No national rank found with CSS selectors', 'css_selector')
        };
    }
    extractStateRank(document) {
        for (const selector of CSSExtractionMethod.SELECTORS.state_rank) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent?.trim();
                    if (text) {
                        const rank = this.parseRank(text, 'state_rank');
                        if (rank.value && rank.value >= 1 && rank.value <= 5000) {
                            return { value: rank.value, confidence: 95 };
                        }
                    }
                }
            }
            catch (error) {
                continue;
            }
        }
        return {
            value: null,
            confidence: 0,
            error: this.createError('state_rank', 'css_selector_failed', 'No state rank found with CSS selectors', 'css_selector')
        };
    }
    extractCity(document) {
        for (const selector of CSSExtractionMethod.SELECTORS.address_city) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent?.trim();
                    if (text && text.length >= 2 && text.length <= 50) {
                        return { value: text, confidence: 85 };
                    }
                }
            }
            catch (error) {
                continue;
            }
        }
        return {
            value: null,
            confidence: 0,
            error: this.createError('address_city', 'css_selector_failed', 'No city found with CSS selectors', 'css_selector')
        };
    }
    extractState(document) {
        for (const selector of CSSExtractionMethod.SELECTORS.address_state) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent?.trim();
                    if (text) {
                        // Validate state format (2-letter code or full name)
                        if (/^[A-Z]{2}$/.test(text) || (text.length >= 4 && text.length <= 20)) {
                            return { value: text, confidence: 90 };
                        }
                    }
                }
            }
            catch (error) {
                continue;
            }
        }
        return {
            value: null,
            confidence: 0,
            error: this.createError('address_state', 'css_selector_failed', 'No state found with CSS selectors', 'css_selector')
        };
    }
    // Helper method to apply extraction results
    applyResult(data, confidences, errors, fieldName, result, reportErrors = false) {
        if (result.value !== null && result.value !== undefined) {
            data[fieldName] = result.value;
            confidences[fieldName] = result.confidence;
        }
        else if (result.error && reportErrors) {
            // Only report errors for critical fields to avoid noise
            errors.push(result.error);
        }
    }
    // Confidence calculation helpers
    calculateAcademicsConfidence(confidences) {
        const validConfidences = confidences.filter(c => c > 0);
        return validConfidences.length > 0 ? Math.max(...validConfidences) : 0;
    }
    calculateDemographicsConfidence(confidences) {
        const validConfidences = confidences.filter(c => c > 0);
        return validConfidences.length > 0 ? Math.max(...validConfidences) : 0;
    }
    calculateLocationConfidence(confidences) {
        const validConfidences = confidences.filter(c => c > 0);
        return validConfidences.length > 0 ? Math.max(...validConfidences) : 0;
    }
    calculateEnrollmentConfidence(confidences) {
        const validConfidences = confidences.filter(c => c > 0);
        return validConfidences.length > 0 ? Math.max(...validConfidences) : 0;
    }
    // COMPLETE EXTRACTION METHODS FOR ALL 22+ GOLD STANDARD FIELDS
    extractNcesId(document) {
        for (const selector of CSSExtractionMethod.SELECTORS.nces_id) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent?.trim();
                    if (text && /^\d{12}$/.test(text)) { // NCES ID format validation
                        return { value: text, confidence: 90 };
                    }
                }
            }
            catch (error) {
                continue;
            }
        }
        return {
            value: null,
            confidence: 0,
            error: this.createError('nces_id', 'css_selector_failed', 'No NCES ID found with CSS selectors', 'css_selector')
        };
    }
    extractGrades(document) {
        for (const selector of CSSExtractionMethod.SELECTORS.grades) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent?.trim();
                    if (text && /^(K-|PK-)?\d{1,2}-\d{1,2}$/.test(text)) { // Grade format validation
                        return { value: text, confidence: 85 };
                    }
                }
            }
            catch (error) {
                continue;
            }
        }
        return {
            value: null,
            confidence: 0,
            error: this.createError('grades_served', 'css_selector_failed', 'No grades found with CSS selectors', 'css_selector')
        };
    }
    extractAddressStreet(document) {
        for (const selector of CSSExtractionMethod.SELECTORS.address_street) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent?.trim();
                    if (text && text.length >= 5 && text.length <= 100) {
                        return { value: text, confidence: 85 };
                    }
                }
            }
            catch (error) {
                continue;
            }
        }
        return {
            value: null,
            confidence: 0,
            error: this.createError('address_street', 'css_selector_failed', 'No street address found with CSS selectors', 'css_selector')
        };
    }
    extractZip(document) {
        for (const selector of CSSExtractionMethod.SELECTORS.address_zip) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent?.trim();
                    if (text && /^\d{5}(-\d{4})?$/.test(text)) { // ZIP code validation
                        return { value: text, confidence: 90 };
                    }
                }
            }
            catch (error) {
                continue;
            }
        }
        return {
            value: null,
            confidence: 0,
            error: this.createError('address_zip', 'css_selector_failed', 'No ZIP code found with CSS selectors', 'css_selector')
        };
    }
    extractPhone(document) {
        for (const selector of CSSExtractionMethod.SELECTORS.phone) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent?.trim();
                    if (text) {
                        // Clean and validate phone number
                        const digits = text.replace(/\D/g, '');
                        if (digits.length === 10) {
                            const formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                            return { value: formatted, confidence: 85 };
                        }
                    }
                }
            }
            catch (error) {
                continue;
            }
        }
        return {
            value: null,
            confidence: 0,
            error: this.createError('phone', 'css_selector_failed', 'No phone found with CSS selectors', 'css_selector')
        };
    }
    extractWebsite(document) {
        for (const selector of CSSExtractionMethod.SELECTORS.website) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const href = element.getAttribute('href') || element.textContent?.trim();
                    if (href && (href.startsWith('http') || href.includes('.'))) {
                        const url = href.startsWith('http') ? href : `http://${href}`;
                        return { value: url, confidence: 85 };
                    }
                }
            }
            catch (error) {
                continue;
            }
        }
        return {
            value: null,
            confidence: 0,
            error: this.createError('website', 'css_selector_failed', 'No website found with CSS selectors', 'css_selector')
        };
    }
    extractSetting(document) {
        for (const selector of CSSExtractionMethod.SELECTORS.setting) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent?.trim();
                    if (text && text.length >= 3 && text.length <= 50) {
                        return { value: text, confidence: 80 };
                    }
                }
            }
            catch (error) {
                continue;
            }
        }
        return {
            value: null,
            confidence: 0,
            error: this.createError('setting', 'css_selector_failed', 'No setting found with CSS selectors', 'css_selector')
        };
    }
    extractStudentTeacherRatio(document) {
        for (const selector of CSSExtractionMethod.SELECTORS.student_teacher_ratio) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent?.trim();
                    if (text && /^\d{1,2}:\d{1}$/.test(text)) { // Ratio format validation
                        return { value: text, confidence: 85 };
                    }
                }
            }
            catch (error) {
                continue;
            }
        }
        return {
            value: null,
            confidence: 0,
            error: this.createError('student_teacher_ratio', 'css_selector_failed', 'No student-teacher ratio found with CSS selectors', 'css_selector')
        };
    }
    extractFullTimeTeachers(document) {
        for (const selector of CSSExtractionMethod.SELECTORS.full_time_teachers) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent?.trim();
                    if (text) {
                        const number = this.parseNumber(text, 'full_time_teachers');
                        if (number.value && number.value >= 1 && number.value <= 1000) {
                            return { value: number.value, confidence: 85 };
                        }
                    }
                }
            }
            catch (error) {
                continue;
            }
        }
        return {
            value: null,
            confidence: 0,
            error: this.createError('full_time_teachers', 'css_selector_failed', 'No teacher count found with CSS selectors', 'css_selector')
        };
    }
    // Academic performance extraction methods
    extractApParticipation(document) {
        return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.ap_participation_rate, 'ap_participation_rate');
    }
    extractApPassRate(document) {
        return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.ap_pass_rate, 'ap_pass_rate');
    }
    extractMathProficiency(document) {
        return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.math_proficiency, 'math_proficiency');
    }
    extractReadingProficiency(document) {
        return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.reading_proficiency, 'reading_proficiency');
    }
    extractScienceProficiency(document) {
        return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.science_proficiency, 'science_proficiency');
    }
    extractGraduationRate(document) {
        return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.graduation_rate, 'graduation_rate');
    }
    extractCollegeReadiness(document) {
        return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.college_readiness_index, 'college_readiness_index');
    }
    // Demographics extraction methods
    extractWhitePct(document) {
        return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.white_pct, 'white_pct');
    }
    extractAsianPct(document) {
        return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.asian_pct, 'asian_pct');
    }
    extractHispanicPct(document) {
        return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.hispanic_pct, 'hispanic_pct');
    }
    extractBlackPct(document) {
        return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.black_pct, 'black_pct');
    }
    extractAmericanIndianPct(document) {
        return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.american_indian_pct, 'american_indian_pct');
    }
    extractTwoOrMorePct(document) {
        return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.two_or_more_pct, 'two_or_more_pct');
    }
    extractFemalePct(document) {
        return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.female_pct, 'female_pct');
    }
    extractMalePct(document) {
        return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.male_pct, 'male_pct');
    }
    // Socioeconomic extraction methods
    extractEconomicallyDisadvantaged(document) {
        return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.economically_disadvantaged_pct, 'economically_disadvantaged_pct');
    }
    extractFreeLunchPct(document) {
        return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.free_lunch_pct, 'free_lunch_pct');
    }
    extractReducedLunchPct(document) {
        return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.reduced_lunch_pct, 'reduced_lunch_pct');
    }
    // Generic percentage field extraction helper
    extractPercentageField(document, selectors, fieldName) {
        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent?.trim();
                    if (text) {
                        const percentage = this.parsePercentage(text, fieldName);
                        if (percentage.value !== null && percentage.value >= 0 && percentage.value <= 100) {
                            return { value: percentage.value, confidence: 85 };
                        }
                    }
                }
            }
            catch (error) {
                continue;
            }
        }
        return {
            value: null,
            confidence: 0,
            error: this.createError(fieldName, 'css_selector_failed', `No ${fieldName} found with CSS selectors`, 'css_selector')
        };
    }
    getErrorMessage(error) {
        if (error instanceof Error)
            return error.message;
        return String(error);
    }
    /**
     * Extract JSON-LD structured data from US News pages
     */
    extractStructuredData(document) {
        try {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scripts) {
                try {
                    const data = JSON.parse(script.textContent || '');
                    if (data['@type'] === 'HighSchool') {
                        return data;
                    }
                }
                catch {
                    continue;
                }
            }
            return null;
        }
        catch {
            return null;
        }
    }
    /**
     * Extract school data from JSON-LD structured data
     */
    async extractFromStructuredData(structuredData, context) {
        const extractedData = {
            bronze_record_id: context.bronzeRecord.id,
            school_slug: context.schoolSlug,
            source_year: context.sourceYear
        };
        const fieldConfidences = {};
        const errors = [];
        // Extract school name
        if (structuredData.name) {
            extractedData.school_name = structuredData.name;
            fieldConfidences.school_name = 95;
        }
        // Extract address from location data
        if (structuredData.location?.address) {
            const address = structuredData.location.address;
            if (address.streetAddress) {
                extractedData.address_street = address.streetAddress;
            }
            if (address.addressLocality) {
                extractedData.address_city = address.addressLocality;
            }
            if (address.addressRegion) {
                extractedData.address_state = address.addressRegion;
            }
            if (address.postalCode) {
                extractedData.address_zip = address.postalCode;
            }
            fieldConfidences.location = 90;
        }
        // Extract phone
        if (structuredData.telephone) {
            extractedData.phone = structuredData.telephone;
        }
        // Parse description for additional data
        if (structuredData.description) {
            const description = structuredData.description;
            // Extract state rank
            const rankMatch = description.match(/ranked (\d+)(?:st|nd|rd|th) within ([^.]+)/i);
            if (rankMatch) {
                const rank = parseInt(rankMatch[1]);
                if (!isNaN(rank)) {
                    extractedData.state_rank = rank;
                    fieldConfidences.rankings = 85;
                }
            }
            // Extract AP participation rate
            const apMatch = description.match(/AP® participation rate[^0-9]*(\d+)%/i);
            if (apMatch) {
                const rate = parseInt(apMatch[1]);
                if (!isNaN(rate)) {
                    extractedData.ap_participation_rate = rate;
                }
            }
            // Extract minority enrollment
            const minorityMatch = description.match(/total minority enrollment is (\d+)%/i);
            if (minorityMatch) {
                const percentage = parseInt(minorityMatch[1]);
                if (!isNaN(percentage)) {
                    // US News minority enrollment = 100% - white percentage
                    extractedData.white_pct = 100 - percentage;
                }
            }
            // Extract economically disadvantaged
            const econMatch = description.match(/(\d+)% of students are economically disadvantaged/i);
            if (econMatch) {
                const percentage = parseInt(econMatch[1]);
                if (!isNaN(percentage)) {
                    extractedData.economically_disadvantaged_pct = percentage;
                }
            }
            fieldConfidences.demographics = 80;
            fieldConfidences.academics = 80;
        }
        // Calculate overall confidence
        const confidenceValues = Object.values(fieldConfidences).filter((c) => typeof c === 'number' && c > 0);
        const overallConfidence = confidenceValues.length > 0
            ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
            : 0;
        return {
            data: extractedData,
            confidence: overallConfidence,
            fieldConfidences,
            errors
        };
    }
}
//# sourceMappingURL=css-extraction-method.js.map