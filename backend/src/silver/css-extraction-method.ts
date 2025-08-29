import { JSDOM } from 'jsdom';
import { BaseExtractionMethod } from './extraction-methods';
import { RankingUniquenessValidator } from './ranking-uniqueness-validator';
import { 
  SilverRecord,
  FieldConfidence,
  ExtractionError,
  ExtractionContext,
  RankingPrecision
} from './types';

/**
 * Enhanced ranking extraction result types
 */
interface EnhancedRankingResult {
  national_rank: number | null;
  national_rank_end: number | null;
  national_rank_precision: RankingPrecision | null;
  state_rank: number | null;
  state_rank_precision: RankingPrecision | null;
  confidence: number;
  errors: ExtractionError[];
}

interface ParsedRanking {
  rank: number;
  rankEnd: number | null;
  precision: RankingPrecision;
  confidence: number;
}

/**
 * CSS Selector-based extraction method for US News HTML structure
 * Tier 1 of the multi-tier extraction pipeline (highest confidence)
 */
export class CSSExtractionMethod extends BaseExtractionMethod {
  // Complete CSS selectors for ALL gold standard fields
  private static readonly SELECTORS = {
    // School name patterns (priority order) - JSON-LD FIRST
    school_name: [
      'script[type="application/ld+json"]', // PRIMARY: Extract from JSON-LD structured data
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
    
    // Address patterns - JSON-LD FIRST
    address_street: [
      'script[type="application/ld+json"]', // PRIMARY: Extract from JSON-LD
      '[data-testid="school-address-street"]',
      '.school-address .street',
      '.address-line-1'
    ],
    
    address_city: [
      'script[type="application/ld+json"]', // PRIMARY: Extract from JSON-LD
      '[data-testid="school-city"]',
      '.school-location .city',
      '.address-city'
    ],
    
    address_state: [
      'script[type="application/ld+json"]', // PRIMARY: Extract from JSON-LD
      '[data-testid="school-state"]',
      '.school-location .state',
      '.address-state'
    ],
    
    address_zip: [
      'script[type="application/ld+json"]', // PRIMARY: Extract from JSON-LD
      '[data-testid="school-zip"]',
      '.school-location .zip',
      '.address-zip'
    ],
    
    // Contact information - JSON-LD FIRST
    phone: [
      'script[type="application/ld+json"]', // PRIMARY: Extract from JSON-LD
      '[data-testid="school-phone"]',
      '.school-contact .phone',
      '.phone-number'
    ],
    
    website: [
      'script[type="application/ld+json"]',     // PRIMARY: Extract from JSON-LD if available
      'a[href*="adc.d211.org"]',               // SECONDARY: School district website pattern  
      'a[href^="http"]',                        // TERTIARY: Any HTTP link (may need filtering)
      '[data-testid="school-website"]',
      '.school-contact .website a',
      '.website-link'
    ],
    
    // School characteristics - grades served with data-test-id FIRST
    grades_served: [
      '[data-test-id="g_grades_served"]',    // PRIMARY: Working data-test-id (found "9-12")
      'body',                                // SECONDARY: Extract via regex pattern from body text
      '[data-testid="grades-served"]',
      '.grades-served',
      '.school-grades'
    ],
    
    setting: [
      '[data-test-id="ulocal"]',            // PRIMARY: Working data-test-id (found "Large Suburb")
      '[data-testid="school-setting"]',
      '.school-setting',
      '.location-type'
    ],
    
    // Enrollment patterns - data-test-id FIRST
    enrollment: [
      '[data-test-id="ccd_member"]',        // PRIMARY: Working data-test-id (found "2,657")
      '[data-testid="enrollment-number"]',
      '.enrollment-stats .number',
      '.student-body-size',
      '.enrollment-count'
    ],
    
    student_teacher_ratio: [
      '[data-test-id="student_teacher_ratio_rounded"]', // PRIMARY: Working data-test-id (found "16:1")
      '[data-testid="student-teacher-ratio"]',
      '.ratio-display',
      '.teacher-ratio'
    ],
    
    full_time_teachers: [
      '[data-test-id="fte"]',               // PRIMARY: Working data-test-id (found "163")
      '[data-testid="teacher-count"]',
      '.teacher-stats .count',
      '.full-time-teachers'
    ],
    
    // Ranking patterns - PRIORITIZED with authoritative selectors first
    national_rank: [
      '[data-test-id="display_rank_national"]', // PRIMARY: Authoritative ranking display
      '#rankings_section',                      // SECONDARY: Rankings section container (contains full context)
      '.RankingList__RankStyled-sc-7e61t7-1',  // TERTIARY: US News ranking elements
      '.with-icon__Rank-sc-1spb2w-2',         // TERTIARY: Alternative ranking display
      'react-trigger',                          // FALLBACK: Combined ranking element
      '[data-testid="national-ranking"]',       // FALLBACK: Legacy
      '.national-rank .rank-number',            // FALLBACK: Legacy
      '.ranking-badge-national',                // FALLBACK: Legacy  
      '.rank-display.national'                  // FALLBACK: Legacy
    ],
    
    state_rank: [
      'a[href*="/rankings"]:not([href*="district"]):not([href*="national"]):not([href*="chicago"]):not([href*="metro"]) .with-icon__Rank-sc-1spb2w-2', // PRIMARY: Any state ranking link, excluding district/metro/national
      '#rankings_section a[href$="/rankings"] .with-icon__Rank-sc-1spb2w-2', // SECONDARY: Direct state rankings link  
      'a[href*="/rankings"][href*="state"] .with-icon__Rank-sc-1spb2w-2', // State-specific rankings
      '.RankingList__RankStyled-sc-7e61t7-1',  // Same elements contain both national and state
      '.with-icon__Rank-sc-1spb2w-2',         // Alternative ranking display
      'react-trigger',                          // Combined ranking element (fallback)
      '[data-testid="state-ranking"]',         // Legacy fallback
      '.state-rank .rank-number',              // Legacy fallback
      '.ranking-badge-state',                  // Legacy fallback
      '.rank-display.state'                    // Legacy fallback
    ],
    
    // Academic performance patterns - WORKING data-test-id selectors FIRST
    ap_participation_rate: [
      '[data-test-id="participation_rate"]',   // PRIMARY: Working data-test-id selector (98% confidence)
      '[data-testid="ap-participation"]',
      '.ap-stats .participation',
      '.advanced-placement .participation'
    ],
    
    ap_pass_rate: [
      '[data-test-id="participant_passing_rate"]', // PRIMARY: Working data-test-id selector (98% confidence)
      '[data-testid="ap-pass-rate"]',
      '.ap-stats .pass-rate',
      '.advanced-placement .pass-rate'
    ],
    
    math_proficiency: [
      '[data-test-id="school_percent_proficient_in_math"]', // PRIMARY: Working data-test-id selector (98% confidence)
      '[data-testid="math-proficiency"]',
      '.proficiency-math',
      '.academic-performance .math'
    ],
    
    reading_proficiency: [
      '[data-test-id="school_percent_proficient_in_english"]', // PRIMARY: Working data-test-id selector (98% confidence)
      '[data-testid="reading-proficiency"]',
      '.proficiency-reading',
      '.academic-performance .reading'
    ],
    
    science_proficiency: [
      '[data-test-id="school_percent_proficient_in_science"]', // PRIMARY: Working data-test-id selector (98% confidence)
      '[data-testid="science-proficiency"]',
      '.proficiency-science',
      '.academic-performance .science'
    ],
    
    graduation_rate: [
      '[data-test-id="gradrate"]',              // PRIMARY: Working data-test-id selector (98% confidence)
      '[data-testid="graduation-rate"]',
      '.graduation-stats .rate',
      '.graduation-percentage'
    ],
    
    college_readiness_index: [
      '[data-test-id="ranknat_cri"]',           // PRIMARY: Working data-test-id selector (partial - gives rank)
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

  async extract(html: string, context: ExtractionContext): Promise<{
    data: Partial<SilverRecord>;
    confidence: number;
    fieldConfidences: Partial<FieldConfidence>;
    errors: ExtractionError[];
  }> {
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
      let jsonLdData: any = {};
      let jsonLdConfidences: any = {};
      let jsonLdErrors: any[] = [];
      
      if (structuredData) {
        const jsonResult = await this.extractFromStructuredData(structuredData, context);
        jsonLdData = { ...jsonResult.data };
        jsonLdConfidences = { ...jsonResult.fieldConfidences };
        jsonLdErrors = [...jsonResult.errors];
        
        // CRITICAL FIX: Never return early - always continue to CSS extraction
        // JSON-LD only provides basic info, CSS extraction provides the rest
      }
      
      // Initialize result containers - start with JSON-LD data if available
      const extractedData: Partial<SilverRecord> = {
        bronze_record_id: context.bronzeRecord.id,
        school_slug: context.schoolSlug,
        source_year: context.sourceYear,
        ...jsonLdData  // Merge JSON-LD data first
      };
      
      const fieldConfidences: Partial<FieldConfidence> = { ...jsonLdConfidences };
      const errors: ExtractionError[] = [...jsonLdErrors];
      
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
      
      // Check for explicit "Unranked" status first
      const unrankedStatus = this.checkUnrankedStatus(document);
      if (unrankedStatus.isUnranked) {
        // School is explicitly marked as unranked - don't try to extract rankings
        extractedData.is_unranked = true;
        extractedData.unranked_reason = unrankedStatus.reason;
        fieldConfidences.rankings = unrankedStatus.confidence;
      } else {
        // School is not explicitly unranked - proceed with ranking extraction
        extractedData.is_unranked = false;
        
        const rankingResults = this.extractEnhancedRankings(document);
        this.applyEnhancedRankingResults(extractedData, fieldConfidences, errors, rankingResults);
      }
      
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
      const completeFieldConfidences: FieldConfidence = {
        school_name: fieldConfidences.school_name || 0,
        
        rankings: Math.max(
          fieldConfidences.national_rank || 0,
          fieldConfidences.state_rank || 0
        ),
        
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
      const confidenceValues = Object.values(completeFieldConfidences).filter((c): c is number => typeof c === 'number' && c > 0);
      const overallConfidence = confidenceValues.length > 0 
        ? confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length
        : 0;
      
      // Cleanup DOM
      dom.window.close();
      
      // Force garbage collection if available (enabled with --expose-gc)
      if (global.gc) {
        global.gc();
      }
      
      // CRITICAL: Validate ranking uniqueness to prevent duplicate scenarios
      let finalConfidence = overallConfidence;
      let validationErrors: ExtractionError[] = [];
      
      if (extractedData.national_rank || extractedData.state_rank) {
        try {
          // Initialize validator with database path (would need to be configured)
          const validator = new RankingUniquenessValidator('./data/silver.db');
          
          const validation = await validator.validateRankingUniqueness(extractedData, context);
          
          if (!validation.is_valid) {
            // Add validation errors
            validation.conflicts.forEach(conflict => {
              validationErrors.push(this.createError(
                'rankings',
                'uniqueness_violation',
                `Ranking conflict: ${conflict.conflict_type} for rank ${conflict.rank}`,
                'uniqueness_validator'
              ));
            });
            
            // Adjust confidence based on conflicts
            finalConfidence = Math.max(0, overallConfidence + validation.confidence_adjustment);
            
            // Log the conflict for audit purposes
            this.logger.warn('Ranking uniqueness violation detected', {
              school_slug: context.schoolSlug,
              conflicts: validation.conflicts.length,
              original_confidence: overallConfidence,
              adjusted_confidence: finalConfidence
            });
          }
          
          validator.close();
          
        } catch (validationError) {
          // If validation fails, continue but log the issue
          this.logger.warn('Ranking validation failed', {
            school_slug: context.schoolSlug,
            error: this.getErrorMessage(validationError)
          });
        }
      }
      
      timer.end('CSS extraction completed', {
        fields_extracted: Object.keys(extractedData).length - 3, // Exclude metadata fields
        overall_confidence: finalConfidence,
        errors_count: errors.length + validationErrors.length
      });
      
      return {
        data: extractedData,
        confidence: finalConfidence,
        fieldConfidences: completeFieldConfidences,
        errors: [...errors, ...validationErrors]
      };
      
    } catch (error) {
      // Ensure DOM cleanup even on error
      try {
        dom?.window?.close();
        if (global.gc) {
          global.gc();
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
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

  private checkUnrankedStatus(document: Document): {
    isUnranked: boolean;
    confidence: number;
    reason?: string;
  } {
    // FIRST: Check for explicit unranked selectors with STRICT verification
    // This catches online schools with <p class="lg-t5 t2"><strong>Unranked</strong></p>
    const unrankedSelectors = [
      'p.lg-t5.t2 strong',  // Primary pattern for online/virtual schools - BUT ONLY in rankings section
      '.ilawbc'             // Existing selector for additional cases
    ];
    
    let unrankedIndicatorCount = 0;
    let rankedIndicatorCount = 0;
    
    // CRITICAL FIX: Only look for unranked indicators within the rankings section
    const rankingsSection = document.querySelector('#rankings_section');
    if (rankingsSection) {
      for (const selector of unrankedSelectors) {
        try {
          const elements = rankingsSection.querySelectorAll(selector);
          for (const element of elements) {
            const text = element.textContent?.trim().toLowerCase() || '';
            
            if (text === 'unranked' || text === 'unranked school') {
              unrankedIndicatorCount++;
            } else if (text === 'ranked school') {
              rankedIndicatorCount++;
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      // Only mark as unranked if we have explicit unranked indicators AND no ranking data visible
      if (unrankedIndicatorCount > 0) {
        // Double-check: ensure there are no visible rank numbers in the rankings section
        const rankingText = rankingsSection.textContent || '';
        const hasVisibleRank = /ranked\s*#\s*\d+/i.test(rankingText) || 
                              /\s#\d{1,5}\s+in\s+(national|state)/i.test(rankingText);
        
        if (!hasVisibleRank) {
          return {
            isUnranked: true,
            confidence: 95,
            reason: 'School explicitly marked as "Unranked" in dedicated ranking section'
          };
        }
      }
    }
    
    // SECOND: Check for "Ranked School" vs "Unranked School" text markers
    const bodyText = document.body?.textContent || '';
    const rankedSchoolCount = (bodyText.match(/ranked school/gi) || []).length;
    const unrankedSchoolCount = (bodyText.match(/unranked school/gi) || []).length;
    
    if (rankedSchoolCount > unrankedSchoolCount) {
      return {
        isUnranked: false,
        confidence: 90,
        reason: 'More "Ranked School" indicators than "Unranked School"'
      };
    }
    
    // THIRD: Check for school-specific ranking patterns (not from nearby colleges)
    // Look for patterns that are specifically about THIS school's ranking
    const schoolSpecificRankingPatterns = [
      /(?:this school|196\s*online|school) is.*ranked.*#\d+/i,  // School-specific ranking
      /ranked #\d+.*(?:in|among).*(?:national|state).*(?:ranking|school)/i  // Direct school ranking
    ];
    
    for (const pattern of schoolSpecificRankingPatterns) {
      if (pattern.test(bodyText)) {
        return {
          isUnranked: false,
          confidence: 95,
          reason: 'School has specific ranking indicators'
        };
      }
    }
    
    // FOURTH: Check for "This school is unranked" or similar explicit statements
    const explicitUnrankedPatterns = [
      /(?:this school|196\s*online|school) is unranked/i,
      /unranked.*in.*national.*ranking/i,
      /school.*unranked.*by.*u\.?s\.?\s*news/i
    ];
    
    for (const pattern of explicitUnrankedPatterns) {
      if (pattern.test(bodyText)) {
        return {
          isUnranked: true,
          confidence: 90,
          reason: 'School explicitly stated as unranked'
        };
      }
    }
    
    // FOURTH: Check for strong unranked patterns (very specific)
    const strongUnrankedPatterns = [
      /<strong[^>]*>unranked<\/strong>/i,
      /ranking.*not.*available/i,
      /insufficient.*data.*ranking/i,
      /private school.*not ranked/i
    ];
    
    for (const pattern of strongUnrankedPatterns) {
      if (pattern.test(bodyText)) {
        return {
          isUnranked: true,
          confidence: 90,
          reason: 'Contains strong unranked indicators in page text'
        };
      }
    }
    
    // DEFAULT: Assume ranked if no clear unranked indicators
    return {
      isUnranked: false,
      confidence: 0
    };
  }
  
  private extractSchoolName(document: Document): {
    value: string | null;
    confidence: number;
    error?: ExtractionError;
  } {
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
      } catch (error) {
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
  
  private extractEnrollment(document: Document): {
    value: number | null;
    confidence: number;
    error?: ExtractionError;
  } {
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
      } catch (error) {
        continue;
      }
    }
    
    return {
      value: null,
      confidence: 0,
      error: this.createError('enrollment', 'css_selector_failed', 'No enrollment found with CSS selectors', 'css_selector')
    };
  }
  
  /**
   * Enhanced ranking extraction supporting ranges, precision indicators, and all 4 error patterns
   */
  private extractEnhancedRankings(document: Document): EnhancedRankingResult {
    const result: EnhancedRankingResult = {
      national_rank: null,
      national_rank_end: null,
      national_rank_precision: null,
      state_rank: null,
      state_rank_precision: null,
      confidence: 0,
      errors: []
    };

    const combinedSelectors = [
      ...CSSExtractionMethod.SELECTORS.national_rank,
      ...CSSExtractionMethod.SELECTORS.state_rank
    ];

    for (const selector of combinedSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        
        for (const element of elements) {
          const text = element.textContent?.trim();
          if (!text) continue;
          
          // Parse all ranking patterns from this text
          let patterns = this.parseAllRankingPatterns(text);
          
          // If no state ranking found, try parent element text (contains full context)
          if (!patterns.state && element.parentElement) {
            const parentText = element.parentElement.textContent?.trim();
            if (parentText && parentText !== text) {
              const parentPatterns = this.parseAllRankingPatterns(parentText);
              if (parentPatterns.state) {
                patterns.state = parentPatterns.state;
              }
            }
          }
          
          // Apply the best patterns found
          if (patterns.national && !result.national_rank) {
            result.national_rank = patterns.national.rank;
            result.national_rank_end = patterns.national.rankEnd;
            result.national_rank_precision = patterns.national.precision;
            result.confidence = Math.max(result.confidence, patterns.national.confidence);
          }
          
          if (patterns.state && !result.state_rank) {
            result.state_rank = patterns.state.rank;
            result.state_rank_precision = patterns.state.precision;
            result.confidence = Math.max(result.confidence, patterns.state.confidence);
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    if (!result.national_rank && !result.state_rank) {
      result.errors.push(
        this.createError('rankings', 'css_selector_failed', 'No rankings found with enhanced extraction', 'css_selector')
      );
    }
    
    return result;
  }
  
  /**
   * Parse all ranking patterns from text with confidence weighting (not first-match-wins)
   */
  private parseAllRankingPatterns(text: string): {
    national?: ParsedRanking;
    state?: ParsedRanking;
  } {
    // Collect all potential matches with confidence scores
    const nationalCandidates: ParsedRanking[] = [];
    const stateCandidates: ParsedRanking[] = [];
    
    // Common US states for validation
    const validStates = [
      'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware',
      'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky',
      'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi',
      'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico',
      'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania',
      'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont',
      'virginia', 'washington', 'west virginia', 'wisconsin', 'wyoming', 'district of columbia',
      'puerto rico', 'virgin islands', 'guam'
    ];
    
    // Pattern 1: Authoritative data-test-id format - "ranked #<number>" 
    // This gets highest confidence but we still evaluate others
    const authoritativeMatch = text.match(/ranked\s*#\s*(\d{1,5}(?:,\d{3})*)/i);
    if (authoritativeMatch) {
      const rank = parseInt(authoritativeMatch[1].replace(/,/g, ''));
      if (rank >= 1 && rank <= 50000) {
        nationalCandidates.push({
          rank: rank,
          rankEnd: null,
          precision: rank <= 13427 ? 'exact' : (rank <= 17901 ? 'range' : 'estimated'),
          confidence: 98 // Highest confidence - this will likely win
        });
      }
    }
    
    // Pattern 2: Bucket 2 range representation - #13,428-17,901 (NOT 13,427!)
    // CRITICAL FIX: Reject suspicious 13,427 patterns that were causing pollution
    const bucket2RangeMatch = text.match(/#(\d{1,2},\d{3})-(\d{1,2},\d{3})/);
    if (bucket2RangeMatch) {
      const startRank = parseInt(bucket2RangeMatch[1].replace(/,/g, ''));
      const endRank = parseInt(bucket2RangeMatch[2].replace(/,/g, ''));
      
      // CRITICAL: If startRank is 13427, this was the old boundary error - reject it
      if (startRank === 13427) {
        console.warn(`Rejecting suspicious 13427 range pattern - likely false positive from old boundary logic`);
        // Continue to other patterns instead of accepting this
      } else if (startRank >= 13428 && startRank <= 17901 && endRank >= startRank && endRank <= 17901) {
        // Range is within legitimate Bucket 2 bounds - accept it
        nationalCandidates.push({
          rank: startRank,
          rankEnd: endRank,
          precision: 'range',
          confidence: 95
        });
      }
    }
    
    // Pattern 3: Composite ranking - "#1,102 in National Rankings #10 in South Carolina High Schools" 
    // (MUST be checked before state-only pattern since it contains state pattern as substring)
    const compositeMatch = text.match(/#(\d{1,4}(?:,\d{3})*)\s+in\s+National\s+Rankings\s+#(\d{1,4})\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+High\s+Schools?/i);
    if (compositeMatch) {
      const nationalRank = parseInt(compositeMatch[1].replace(/,/g, ''));
      const stateRank = parseInt(compositeMatch[2]);
      const stateName = compositeMatch[3].toLowerCase();
      
      if (nationalRank >= 1 && nationalRank <= 50000) {
        nationalCandidates.push({
          rank: nationalRank,
          rankEnd: null,
          precision: nationalRank <= 13427 ? 'exact' : (nationalRank <= 17901 ? 'range' : 'estimated'),
          confidence: 95
        });
      }
      
      if (stateRank >= 1 && stateRank <= 1000 && validStates.includes(stateName)) {
        stateCandidates.push({
          rank: stateRank,
          rankEnd: null,
          precision: 'exact',
          confidence: 95
        });
      }
    }
    
    // Pattern 4: State ranking ranges - "#522-672 in Pennsylvania High Schools"  
    const stateRangeMatch = text.match(/#(\d{1,4}(?:,\d{3})*)-(\d{1,4}(?:,\d{3})*)\s*in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+High\s+Schools?/i);
    if (stateRangeMatch) {
      const startRank = parseInt(stateRangeMatch[1].replace(/,/g, ''));
      const endRank = parseInt(stateRangeMatch[2].replace(/,/g, ''));
      const state = stateRangeMatch[3].toLowerCase();
      
      if (startRank >= 1 && endRank <= 10000 && startRank <= endRank && validStates.includes(state)) {
        stateCandidates.push({
          rank: startRank,
          rankEnd: endRank,
          precision: 'range',
          confidence: 95
        });
      }
    }
    
    // Pattern 5: State-only ranking - "#1,092 in Texas High Schools" or "#14in Illinois High Schools"
    const stateOnlyMatch = text.match(/#(\d{1,4}(?:,\d{3})*)\s*in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+High\s+Schools?/i);
    if (stateOnlyMatch) {
      const rank = parseInt(stateOnlyMatch[1].replace(/,/g, ''));
      const state = stateOnlyMatch[2].toLowerCase();
      
      // Exclude common district/system keywords
      const isDistrictRanking = state.includes('district') || state.includes('township') || 
                               state.includes('system') || state.includes('county') ||
                               state.includes('isd') || state.includes('unified');
      
      if (rank >= 1 && rank <= 10000 && !state.includes('national') && 
          !isDistrictRanking && validStates.includes(state)) {
        stateCandidates.push({
          rank: rank,
          rankEnd: null,
          precision: 'state_only',
          confidence: 95
        });
      }
    }
    
    // Pattern 6: Standard national ranking - "#6,979 in National Rankings"
    const standardNationalMatch = text.match(/#(\d{1,4}(?:,\d{3})*)\s+in\s+National\s+Rankings?/i);
    if (standardNationalMatch) {
      const rank = parseInt(standardNationalMatch[1].replace(/,/g, ''));
      if (rank >= 1 && rank <= 50000) {
        nationalCandidates.push({
          rank: rank,
          rankEnd: null,
          precision: rank <= 13427 ? 'exact' : (rank <= 17901 ? 'range' : 'estimated'),
          confidence: 95
        });
      }
    }
    
    // Pattern 7: Fallback national patterns - lower confidence
    const fallbackNationalMatch = text.match(/#(\d+)\s*(?:in\s*)?(?:National|national)\s*(?:Rankings?)?/i);
    if (fallbackNationalMatch) {
      const rank = parseInt(fallbackNationalMatch[1]);
      if (rank >= 1 && rank <= 50000) {
        nationalCandidates.push({
          rank: rank,
          rankEnd: null,
          precision: rank <= 13427 ? 'exact' : (rank <= 17901 ? 'range' : 'estimated'),
          confidence: 85
        });
      }
    }
    
    // Pattern 8: Fallback state patterns - lower confidence
    const fallbackStateMatch = text.match(/#(\d+)\s*(?:in\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:High\s*Schools?)?/i);
    if (fallbackStateMatch) {
      const rank = parseInt(fallbackStateMatch[1]);
      const location = fallbackStateMatch[2].toLowerCase();
      
      // Exclude common district/system keywords
      const isDistrictRanking = location.includes('district') || location.includes('township') || 
                               location.includes('system') || location.includes('county') ||
                               location.includes('isd') || location.includes('unified');
      
      if (rank >= 1 && rank <= 5000 && !location.includes('national') && 
          !isDistrictRanking && validStates.includes(location)) {
        stateCandidates.push({
          rank: rank,
          rankEnd: null,
          precision: 'exact',
          confidence: 85
        });
      }
    }
    
    // CONFIDENCE-BASED SELECTION: Choose the best candidates from each category
    const results: { national?: ParsedRanking; state?: ParsedRanking } = {};
    
    // Select best national ranking candidate
    if (nationalCandidates.length > 0) {
      // Sort by confidence (highest first), then by specificity (exact > range > estimated)
      nationalCandidates.sort((a, b) => {
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        const precisionOrder: Record<string, number> = { exact: 3, range: 2, estimated: 1 };
        return (precisionOrder[b.precision] || 0) - (precisionOrder[a.precision] || 0);
      });
      
      results.national = nationalCandidates[0];
    }
    
    // Select best state ranking candidate
    if (stateCandidates.length > 0) {
      // Sort by confidence (highest first), then by precision
      stateCandidates.sort((a, b) => {
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        const precisionOrder: Record<string, number> = { exact: 3, state_only: 2, range: 1 };
        return (precisionOrder[b.precision] || 0) - (precisionOrder[a.precision] || 0);
      });
      
      results.state = stateCandidates[0];
    }
    
    return results;
  }
  
  /**
   * Apply enhanced ranking results to extracted data
   */
  private applyEnhancedRankingResults(
    data: Partial<SilverRecord>,
    confidences: Partial<FieldConfidence>,
    errors: ExtractionError[],
    results: EnhancedRankingResult
  ): void {
    // Apply national ranking data
    if (results.national_rank !== null) {
      data.national_rank = results.national_rank;
      data.national_rank_end = results.national_rank_end;
      data.national_rank_precision = results.national_rank_precision;
      (confidences as any).national_rank = results.confidence;
    }
    
    // Apply state ranking data
    if (results.state_rank !== null) {
      data.state_rank = results.state_rank;
      data.state_rank_precision = results.state_rank_precision;
      (confidences as any).state_rank = results.confidence;
    }
    
    // Calculate combined rankings confidence
    confidences.rankings = Math.max(
      (confidences as any).national_rank || 0,
      (confidences as any).state_rank || 0
    );
    
    // Add any errors
    errors.push(...results.errors);
  }
  
  private extractCity(document: Document): {
    value: string | null;
    confidence: number;
    error?: ExtractionError;
  } {
    for (const selector of CSSExtractionMethod.SELECTORS.address_city) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim();
          if (text && text.length >= 2 && text.length <= 50) {
            return { value: text, confidence: 85 };
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return {
      value: null,
      confidence: 0,
      error: this.createError('address_city', 'css_selector_failed', 'No city found with CSS selectors', 'css_selector')
    };
  }
  
  private extractState(document: Document): {
    value: string | null;
    confidence: number;
    error?: ExtractionError;
  } {
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
      } catch (error) {
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
  private applyResult(
    data: Partial<SilverRecord>,
    confidences: Partial<FieldConfidence>,
    errors: ExtractionError[],
    fieldName: string,
    result: { value: any; confidence: number; error?: ExtractionError },
    reportErrors: boolean = false
  ): void {
    if (result.value !== null && result.value !== undefined) {
      (data as any)[fieldName] = result.value;
      (confidences as any)[fieldName] = result.confidence;
    } else if (result.error && reportErrors) {
      // Only report errors for critical fields to avoid noise
      errors.push(result.error);
    }
  }

  // Confidence calculation helpers
  private calculateAcademicsConfidence(confidences: number[]): number {
    const validConfidences = confidences.filter(c => c > 0);
    return validConfidences.length > 0 ? Math.max(...validConfidences) : 0;
  }

  private calculateDemographicsConfidence(confidences: number[]): number {
    const validConfidences = confidences.filter(c => c > 0);
    return validConfidences.length > 0 ? Math.max(...validConfidences) : 0;
  }

  private calculateLocationConfidence(confidences: number[]): number {
    const validConfidences = confidences.filter(c => c > 0);
    return validConfidences.length > 0 ? Math.max(...validConfidences) : 0;
  }

  private calculateEnrollmentConfidence(confidences: number[]): number {
    const validConfidences = confidences.filter(c => c > 0);
    return validConfidences.length > 0 ? Math.max(...validConfidences) : 0;
  }

  // COMPLETE EXTRACTION METHODS FOR ALL 22+ GOLD STANDARD FIELDS

  private extractNcesId(document: Document): { value: string | null; confidence: number; error?: ExtractionError } {
    for (const selector of CSSExtractionMethod.SELECTORS.nces_id) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim();
          if (text && /^\d{12}$/.test(text)) { // NCES ID format validation
            return { value: text, confidence: 90 };
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return {
      value: null,
      confidence: 0,
      error: this.createError('nces_id', 'css_selector_failed', 'No NCES ID found with CSS selectors', 'css_selector')
    };
  }

  private extractGrades(document: Document): { value: string | null; confidence: number; error?: ExtractionError } {
    // First, try the working regex pattern from gold standard analysis (80% confidence)
    const bodyText = document.body?.textContent || '';
    const gradesPattern = /(?:grades?|serving)\s*(?:levels?)?\s*:?\s*((\d+)(?:\s*-\s*\d+)?)/i;
    const gradesMatch = bodyText.match(gradesPattern);
    if (gradesMatch) {
      const grades = gradesMatch[1].trim();
      if (/^(K|PK|\d{1,2})(-\d{1,2})?$/.test(grades)) {
        return { value: grades, confidence: 80 }; // Gold standard validated confidence
      }
    }
    
    // Fallback to CSS selectors
    for (const selector of CSSExtractionMethod.SELECTORS.grades_served) {
      try {
        // Skip the body selector since we already processed it above
        if (selector === 'body') continue;
        
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim();
          if (text && /^(K-|PK-)?\d{1,2}-\d{1,2}$/.test(text)) { // Grade format validation
            return { value: text, confidence: 85 };
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return {
      value: null,
      confidence: 0,
      error: this.createError('grades_served', 'css_selector_failed', 'No grades found with pattern matching or CSS selectors', 'css_selector')
    };
  }

  private extractAddressStreet(document: Document): { value: string | null; confidence: number; error?: ExtractionError } {
    for (const selector of CSSExtractionMethod.SELECTORS.address_street) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim();
          if (text && text.length >= 5 && text.length <= 100) {
            return { value: text, confidence: 85 };
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return {
      value: null,
      confidence: 0,
      error: this.createError('address_street', 'css_selector_failed', 'No street address found with CSS selectors', 'css_selector')
    };
  }

  private extractZip(document: Document): { value: string | null; confidence: number; error?: ExtractionError } {
    for (const selector of CSSExtractionMethod.SELECTORS.address_zip) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim();
          if (text && /^\d{5}(-\d{4})?$/.test(text)) { // ZIP code validation
            return { value: text, confidence: 90 };
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return {
      value: null,
      confidence: 0,
      error: this.createError('address_zip', 'css_selector_failed', 'No ZIP code found with CSS selectors', 'css_selector')
    };
  }

  private extractPhone(document: Document): { value: string | null; confidence: number; error?: ExtractionError } {
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
      } catch (error) {
        continue;
      }
    }
    
    return {
      value: null,
      confidence: 0,
      error: this.createError('phone', 'css_selector_failed', 'No phone found with CSS selectors', 'css_selector')
    };
  }

  private extractWebsite(document: Document): { value: string | null; confidence: number; error?: ExtractionError } {
    // Try to find school website in address paragraph first
    const addressParagraph = document.querySelector('p');
    if (addressParagraph) {
      const text = addressParagraph.textContent || '';
      // Look for URL in the address info (format: "| http://domain.com")  
      const urlMatch = text.match(/\|\s*(https?:\/\/[^\s|]+)/);
      if (urlMatch && !urlMatch[1].includes('usnews.com')) {
        return { value: urlMatch[1], confidence: 90 };
      }
    }
    
    // Try ALL span.sm-hide elements for school website (URL is in 2nd span, not 1st)
    const websiteSpans = document.querySelectorAll('span.sm-hide');
    for (const websiteSpan of websiteSpans) {
      const text = websiteSpan.textContent || '';
      const urlMatch = text.match(/https?:\/\/[^\s|]+/);
      if (urlMatch && !urlMatch[0].includes('usnews.com')) {
        return { value: urlMatch[0], confidence: 95 };
      }
    }
    
    // Try JSON-LD (but it usually has US News URLs)
    const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
    if (jsonLdScript) {
      try {
        const jsonData = JSON.parse(jsonLdScript.textContent || '{}');
        if (jsonData.url && typeof jsonData.url === 'string' && !jsonData.url.includes('usnews.com')) {
          return { value: jsonData.url, confidence: 80 };
        }
      } catch {
        // Continue to CSS selectors
      }
    }
    
    // Try CSS selectors as fallback
    for (const selector of CSSExtractionMethod.SELECTORS.website) {
      try {
        // Skip selectors we already tried
        if (selector === 'script[type="application/ld+json"]') continue;
        
        const element = document.querySelector(selector);
        if (element) {
          const href = element.getAttribute('href') || element.textContent?.trim();
          if (href && (href.startsWith('http') || href.includes('.')) && !href.includes('usnews.com')) {
            const url = href.startsWith('http') ? href : `http://${href}`;
            return { value: url, confidence: 70 };
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return {
      value: null,
      confidence: 0,
      error: this.createError('website', 'css_selector_failed', 'No website found with CSS selectors or JSON-LD', 'css_selector')
    };
  }

  private extractSetting(document: Document): { value: string | null; confidence: number; error?: ExtractionError } {
    for (const selector of CSSExtractionMethod.SELECTORS.setting) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim();
          if (text && text.length >= 3 && text.length <= 50) {
            return { value: text, confidence: 80 };
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return {
      value: null,
      confidence: 0,
      error: this.createError('setting', 'css_selector_failed', 'No setting found with CSS selectors', 'css_selector')
    };
  }

  private extractStudentTeacherRatio(document: Document): { value: string | null; confidence: number; error?: ExtractionError } {
    for (const selector of CSSExtractionMethod.SELECTORS.student_teacher_ratio) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim();
          if (text && /^\d{1,2}:\d{1}$/.test(text)) { // Ratio format validation
            return { value: text, confidence: 85 };
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return {
      value: null,
      confidence: 0,
      error: this.createError('student_teacher_ratio', 'css_selector_failed', 'No student-teacher ratio found with CSS selectors', 'css_selector')
    };
  }

  private extractFullTimeTeachers(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
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
      } catch (error) {
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
  private extractApParticipation(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
    return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.ap_participation_rate, 'ap_participation_rate');
  }

  private extractApPassRate(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
    return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.ap_pass_rate, 'ap_pass_rate');
  }

  private extractMathProficiency(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
    return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.math_proficiency, 'math_proficiency');
  }

  private extractReadingProficiency(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
    return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.reading_proficiency, 'reading_proficiency');
  }

  private extractScienceProficiency(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
    return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.science_proficiency, 'science_proficiency');
  }

  private extractGraduationRate(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
    return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.graduation_rate, 'graduation_rate');
  }

  private extractCollegeReadiness(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
    return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.college_readiness_index, 'college_readiness_index');
  }

  // Demographics extraction methods
  private extractWhitePct(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
    return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.white_pct, 'white_pct');
  }

  private extractAsianPct(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
    return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.asian_pct, 'asian_pct');
  }

  private extractHispanicPct(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
    return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.hispanic_pct, 'hispanic_pct');
  }

  private extractBlackPct(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
    return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.black_pct, 'black_pct');
  }

  private extractAmericanIndianPct(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
    return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.american_indian_pct, 'american_indian_pct');
  }

  private extractTwoOrMorePct(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
    return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.two_or_more_pct, 'two_or_more_pct');
  }

  private extractFemalePct(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
    return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.female_pct, 'female_pct');
  }

  private extractMalePct(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
    return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.male_pct, 'male_pct');
  }

  // Socioeconomic extraction methods
  private extractEconomicallyDisadvantaged(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
    return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.economically_disadvantaged_pct, 'economically_disadvantaged_pct');
  }

  private extractFreeLunchPct(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
    return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.free_lunch_pct, 'free_lunch_pct');
  }

  private extractReducedLunchPct(document: Document): { value: number | null; confidence: number; error?: ExtractionError } {
    return this.extractPercentageField(document, CSSExtractionMethod.SELECTORS.reduced_lunch_pct, 'reduced_lunch_pct');
  }

  // Generic percentage field extraction helper
  private extractPercentageField(
    document: Document, 
    selectors: string[], 
    fieldName: string
  ): { value: number | null; confidence: number; error?: ExtractionError } {
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
      } catch (error) {
        continue;
      }
    }
    
    return {
      value: null,
      confidence: 0,
      error: this.createError(fieldName, 'css_selector_failed', `No ${fieldName} found with CSS selectors`, 'css_selector')
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  /**
   * Extract JSON-LD structured data from US News pages
   */
  private extractStructuredData(document: Document): any {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          if (data['@type'] === 'HighSchool') {
            return data;
          }
        } catch {
          continue;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extract school data from JSON-LD structured data
   */
  private async extractFromStructuredData(
    structuredData: any,
    context: ExtractionContext
  ): Promise<{
    data: Partial<SilverRecord>;
    confidence: number;
    fieldConfidences: Partial<FieldConfidence>;
    errors: ExtractionError[];
  }> {
    const extractedData: Partial<SilverRecord> = {
      bronze_record_id: context.bronzeRecord.id,
      school_slug: context.schoolSlug,
      source_year: context.sourceYear
    };
    
    const fieldConfidences: Partial<FieldConfidence> = {};
    const errors: ExtractionError[] = [];

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
      
      // Use enhanced ranking parsing for JSON-LD descriptions too
      const rankingPatterns = this.parseAllRankingPatterns(description);
      
      if (rankingPatterns.national) {
        extractedData.national_rank = rankingPatterns.national.rank;
        extractedData.national_rank_end = rankingPatterns.national.rankEnd;
        extractedData.national_rank_precision = rankingPatterns.national.precision;
        fieldConfidences.rankings = Math.max(fieldConfidences.rankings || 0, rankingPatterns.national.confidence);
      }

      if (rankingPatterns.state) {
        extractedData.state_rank = rankingPatterns.state.rank;
        extractedData.state_rank_precision = rankingPatterns.state.precision;
        fieldConfidences.rankings = Math.max(fieldConfidences.rankings || 0, rankingPatterns.state.confidence);
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
    const confidenceValues = Object.values(fieldConfidences).filter((c): c is number => typeof c === 'number' && c > 0);
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