/**
 * CSS Selector Fix Generator
 * 
 * Uses the William Fremd High School HTML file and gold standard data 
 * to generate correct CSS selectors for all 30 broken fields.
 * 
 * This tool will create the fixed selectors and update the CSSExtractionMethod.
 */

import { readFileSync, writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';

interface SelectorFix {
  field: string;
  category: 'basic' | 'location' | 'enrollment' | 'academics' | 'demographics' | 'socioeconomic';
  currentSelectors: string[];
  newSelectors: string[];
  expectedValue: any;
  actualValue: any;
  confidence: number;
  source: 'data-test-id' | 'json-ld' | 'css-class' | 'text-pattern';
  notes: string;
}

// Gold standard data from the user
const GOLD_STANDARD = {
  school_name: "William Fremd High School",
  address_street: "1000 S Quentin Rd",
  address_city: "Palatine",
  address_state: "Illinois", 
  address_zip: "60067",
  phone: "(847) 755-2610",
  website: "http://adc.d211.org/Domain/9",
  grades_served: "9-12",
  enrollment: 2657,
  student_teacher_ratio: "16:1",
  full_time_teachers: 163,
  national_rank: 397,
  state_rank: 14,
  ap_participation_rate: 62.0,
  ap_pass_rate: 56.0,
  math_proficiency: 64.0,
  reading_proficiency: 63.0,
  science_proficiency: 77.0,
  graduation_rate: 94.0,
  college_readiness_index: 57.6,
  white_pct: 45.3,
  asian_pct: 31.6,
  hispanic_pct: 14.0,
  black_pct: 4.7,
  two_or_more_pct: 4.1,
  american_indian_pct: 0.01,
  female_pct: 49.0,
  male_pct: 51.0,
  economically_disadvantaged_pct: null,
  free_lunch_pct: null,
  reduced_lunch_pct: null,
  setting: "large suburb"
};

// Current broken selectors from CSSExtractionMethod
const BROKEN_SELECTORS = {
  // Basic Information
  nces_id: ['[data-testid="nces-id"]', '.nces-identifier', '.school-id'],
  grades_served: ['[data-testid="grades-served"]', '.grades-served', '.school-grades'],
  
  // Location Data  
  address_street: ['[data-testid="school-address-street"]', '.school-address .street', '.address-line-1'],
  address_city: ['[data-testid="school-city"]', '.school-location .city', '.address-city'],
  address_state: ['[data-testid="school-state"]', '.school-location .state', '.address-state'],
  address_zip: ['[data-testid="school-zip"]', '.school-location .zip', '.address-zip'],
  phone: ['[data-testid="school-phone"]', '.school-contact .phone', '.phone-number'],
  website: ['[data-testid="school-website"]', '.school-contact .website a', '.website-link'],
  setting: ['[data-testid="school-setting"]', '.school-setting', '.location-type'],
  
  // Enrollment
  enrollment: ['[data-testid="enrollment-number"]', '.enrollment-stats .number', '.student-body-size', '.enrollment-count'],
  student_teacher_ratio: ['[data-testid="student-teacher-ratio"]', '.ratio-display', '.teacher-ratio'],
  full_time_teachers: ['[data-testid="teacher-count"]', '.teacher-stats .count', '.full-time-teachers'],
  
  // Academic Performance
  ap_participation_rate: ['[data-testid="ap-participation"]', '.ap-stats .participation', '.advanced-placement .participation'],
  ap_pass_rate: ['[data-testid="ap-pass-rate"]', '.ap-stats .pass-rate', '.advanced-placement .pass-rate'],
  math_proficiency: ['[data-testid="math-proficiency"]', '.proficiency-math', '.academic-performance .math'],
  reading_proficiency: ['[data-testid="reading-proficiency"]', '.proficiency-reading', '.academic-performance .reading'],
  science_proficiency: ['[data-testid="science-proficiency"]', '.proficiency-science', '.academic-performance .science'],
  graduation_rate: ['[data-testid="graduation-rate"]', '.graduation-stats .rate', '.graduation-percentage'],
  college_readiness_index: ['[data-testid="college-readiness"]', '.college-readiness-score', '.readiness-index'],
  
  // Demographics
  white_pct: ['[data-testid="demo-white"]', '.demographics .white-percentage', '.racial-breakdown .white'],
  asian_pct: ['[data-testid="demo-asian"]', '.demographics .asian-percentage', '.racial-breakdown .asian'],
  hispanic_pct: ['[data-testid="demo-hispanic"]', '.demographics .hispanic-percentage', '.racial-breakdown .hispanic'],
  black_pct: ['[data-testid="demo-black"]', '.demographics .black-percentage', '.racial-breakdown .black'],
  american_indian_pct: ['[data-testid="demo-native"]', '.demographics .native-percentage', '.racial-breakdown .native'],
  two_or_more_pct: ['[data-testid="demo-multiracial"]', '.demographics .multiracial-percentage', '.racial-breakdown .multiracial'],
  female_pct: ['[data-testid="demo-female"]', '.demographics .female-percentage', '.gender-breakdown .female'],
  male_pct: ['[data-testid="demo-male"]', '.demographics .male-percentage', '.gender-breakdown .male'],
  
  // Socioeconomic
  economically_disadvantaged_pct: ['[data-testid="econ-disadvantaged"]', '.economics .disadvantaged-pct', '.socioeconomic .disadvantaged'],
  free_lunch_pct: ['[data-testid="free-lunch"]', '.lunch-program .free-pct', '.meal-assistance .free'],
  reduced_lunch_pct: ['[data-testid="reduced-lunch"]', '.lunch-program .reduced-pct', '.meal-assistance .reduced']
};

async function generateSelectorFixes(): Promise<void> {
  console.log('🔧 CSS Selector Fix Generator');
  console.log('Using William Fremd High School gold standard data...\n');
  
  const htmlPath = '/Volumes/OWC Express 1M2/USNEWS_2025/william-fremd-high-school-6921/docker_curl_20250821_061341.html';
  
  try {
    const htmlContent = readFileSync(htmlPath, 'utf-8');
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    
    const fixes: SelectorFix[] = [];
    
    // 1. Parse JSON-LD structured data first
    const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
    let jsonLdData: any = {};
    if (jsonLdScript) {
      try {
        jsonLdData = JSON.parse(jsonLdScript.textContent || '{}');
        console.log('✅ Found JSON-LD structured data');
      } catch (error) {
        console.log('❌ Failed to parse JSON-LD data');
      }
    }
    
    // 2. Find working selectors for each field
    
    // BASIC INFORMATION
    
    // School name - working from title or JSON-LD
    if (jsonLdData.name) {
      fixes.push({
        field: 'school_name',
        category: 'basic',
        currentSelectors: ['h1[data-testid="school-name"]', '.school-profile-header h1', 'h1.profile-header-name'],
        newSelectors: ['script[type="application/ld+json"]'], // Extract from JSON-LD
        expectedValue: GOLD_STANDARD.school_name,
        actualValue: jsonLdData.name,
        confidence: 98,
        source: 'json-ld',
        notes: 'Extract from JSON-LD structured data: jsonData.name'
      });
    }
    
    // Grades served - search for "9-12" pattern
    const gradesPattern = /(?:grades?|serving)\s*(?:levels?)?\s*:?\s*(\d+(?:\s*-\s*\d+)?)/i;
    const bodyText = document.body?.textContent || '';
    const gradesMatch = bodyText.match(gradesPattern);
    if (gradesMatch) {
      fixes.push({
        field: 'grades_served', 
        category: 'basic',
        currentSelectors: BROKEN_SELECTORS.grades_served,
        newSelectors: ['body'], // Extract via regex from body text
        expectedValue: GOLD_STANDARD.grades_served,
        actualValue: gradesMatch[1],
        confidence: 80,
        source: 'text-pattern',
        notes: `Extract via regex: ${gradesPattern.source}`
      });
    }
    
    // LOCATION DATA (from JSON-LD)
    
    if (jsonLdData.location?.address) {
      const addr = jsonLdData.location.address;
      
      // Address street
      if (addr.streetAddress) {
        fixes.push({
          field: 'address_street',
          category: 'location',
          currentSelectors: BROKEN_SELECTORS.address_street,
          newSelectors: ['script[type="application/ld+json"]'],
          expectedValue: GOLD_STANDARD.address_street,
          actualValue: addr.streetAddress,
          confidence: 95,
          source: 'json-ld',
          notes: 'Extract from JSON-LD: jsonData.location.address.streetAddress'
        });
      }
      
      // City
      if (addr.addressLocality) {
        fixes.push({
          field: 'address_city',
          category: 'location', 
          currentSelectors: BROKEN_SELECTORS.address_city,
          newSelectors: ['script[type="application/ld+json"]'],
          expectedValue: GOLD_STANDARD.address_city,
          actualValue: addr.addressLocality,
          confidence: 95,
          source: 'json-ld',
          notes: 'Extract from JSON-LD: jsonData.location.address.addressLocality'
        });
      }
      
      // State  
      if (addr.addressRegion) {
        fixes.push({
          field: 'address_state',
          category: 'location',
          currentSelectors: BROKEN_SELECTORS.address_state,
          newSelectors: ['script[type="application/ld+json"]'],
          expectedValue: GOLD_STANDARD.address_state,
          actualValue: addr.addressRegion, // Note: this is "IL", not "Illinois"
          confidence: 90,
          source: 'json-ld',
          notes: 'Extract from JSON-LD: jsonData.location.address.addressRegion (note: abbreviation, may need expansion)'
        });
      }
      
      // ZIP code
      if (addr.postalCode) {
        fixes.push({
          field: 'address_zip',
          category: 'location',
          currentSelectors: BROKEN_SELECTORS.address_zip,
          newSelectors: ['script[type="application/ld+json"]'],
          expectedValue: GOLD_STANDARD.address_zip,
          actualValue: addr.postalCode,
          confidence: 95,
          source: 'json-ld',
          notes: 'Extract from JSON-LD: jsonData.location.address.postalCode'
        });
      }
    }
    
    // Phone from JSON-LD
    if (jsonLdData.telephone) {
      fixes.push({
        field: 'phone',
        category: 'location',
        currentSelectors: BROKEN_SELECTORS.phone,
        newSelectors: ['script[type="application/ld+json"]'],
        expectedValue: GOLD_STANDARD.phone,
        actualValue: jsonLdData.telephone,
        confidence: 95,
        source: 'json-ld',
        notes: 'Extract from JSON-LD: jsonData.telephone'
      });
    }
    
    // ACADEMIC PERFORMANCE (from data-test-id attributes)
    
    const academicFields = [
      { field: 'ap_participation_rate', selector: '[data-test-id="participation_rate"]', expected: 62 },
      { field: 'ap_pass_rate', selector: '[data-test-id="participant_passing_rate"]', expected: 56 },
      { field: 'math_proficiency', selector: '[data-test-id="school_percent_proficient_in_math"]', expected: 64 },
      { field: 'reading_proficiency', selector: '[data-test-id="school_percent_proficient_in_english"]', expected: 63 },
      { field: 'science_proficiency', selector: '[data-test-id="school_percent_proficient_in_science"]', expected: 77 },
      { field: 'graduation_rate', selector: '[data-test-id="gradrate"]', expected: 94 }
    ];
    
    for (const {field, selector, expected} of academicFields) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim() || '';
        const value = parseInt(text.replace('%', ''));
        
        fixes.push({
          field: field as keyof typeof GOLD_STANDARD,
          category: 'academics',
          currentSelectors: (BROKEN_SELECTORS as any)[field],
          newSelectors: [selector],
          expectedValue: expected,
          actualValue: value,
          confidence: 98,
          source: 'data-test-id',
          notes: `Working data-test-id selector found: ${selector}`
        });
      }
    }
    
    // College Readiness Index - need to search more carefully
    const criElement = document.querySelector('[data-test-id="ranknat_cri"]');
    if (criElement) {
      // This gives us rank #813, but we need the actual index value 57.6
      // The CRI value might be elsewhere in the page
      fixes.push({
        field: 'college_readiness_index',
        category: 'academics', 
        currentSelectors: BROKEN_SELECTORS.college_readiness_index,
        newSelectors: ['[data-test-id="ranknat_cri"]'], // This is rank, need to find actual index
        expectedValue: GOLD_STANDARD.college_readiness_index,
        actualValue: 'rank_found_need_actual_value',
        confidence: 50,
        source: 'data-test-id',
        notes: 'Found CRI rank but need to locate actual index value 57.6'
      });
    }
    
    // STATE RANK - extract from rankings list
    const stateRankLink = document.querySelector('a[href*="/illinois/rankings"] .with-icon__Rank-sc-1spb2w-2');
    if (stateRankLink) {
      const rankText = stateRankLink.textContent?.trim() || '';
      const rank = parseInt(rankText.replace('#', ''));
      
      fixes.push({
        field: 'state_rank',
        category: 'academics',
        currentSelectors: ['#rankings_section', '.RankingList__RankStyled-sc-7e61t7-1'],
        newSelectors: ['a[href*="/illinois/rankings"] .with-icon__Rank-sc-1spb2w-2'],
        expectedValue: GOLD_STANDARD.state_rank,
        actualValue: rank,
        confidence: 95,
        source: 'css-class',
        notes: 'Extract state rank from Illinois rankings link'
      });
    }
    
    // TODO: Search for enrollment, teacher data, demographics
    // These may require more complex searches or may be loaded dynamically
    
    // Generate report
    console.log('='.repeat(80));
    console.log('📊 SELECTOR FIX ANALYSIS REPORT');
    console.log('='.repeat(80));
    
    console.log(`\nFields analyzed: ${Object.keys(BROKEN_SELECTORS).length}`);
    console.log(`Fixes generated: ${fixes.length}`);
    console.log(`Success rate: ${(fixes.length / Object.keys(BROKEN_SELECTORS).length * 100).toFixed(1)}%`);
    
    // Group by source
    const bySource = fixes.reduce((acc, fix) => {
      acc[fix.source] = (acc[fix.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nData sources found:');
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} fields`);
    });
    
    // Show fixes by category
    const categories = ['basic', 'location', 'academics', 'enrollment', 'demographics', 'socioeconomic'] as const;
    
    for (const category of categories) {
      const categoryFixes = fixes.filter(f => f.category === category);
      console.log(`\n📋 ${category.toUpperCase()} FIELDS (${categoryFixes.length} fixes):`);
      
      categoryFixes.forEach(fix => {
        const status = Math.abs(Number(fix.expectedValue) - Number(fix.actualValue)) < 0.1 || fix.expectedValue === fix.actualValue ? '✅' : '⚠️';
        console.log(`  ${status} ${fix.field}: ${fix.source} (confidence: ${fix.confidence}%)`);
        console.log(`     Expected: ${fix.expectedValue}, Found: ${fix.actualValue}`);
        console.log(`     Selector: ${fix.newSelectors[0]}`);
        console.log(`     Notes: ${fix.notes}`);
      });
    }
    
    // Fields still missing
    const fixedFields = fixes.map(f => f.field);
    const missingFields = Object.keys(BROKEN_SELECTORS).filter(field => !fixedFields.includes(field));
    
    if (missingFields.length > 0) {
      console.log(`\n❌ MISSING FIXES (${missingFields.length} fields):`);
      missingFields.forEach(field => {
        console.log(`  ${field} - no working selector found`);
      });
      
      console.log('\n🔍 NEXT STEPS FOR MISSING FIELDS:');
      console.log('1. Search for enrollment/teacher/demographic data sections');
      console.log('2. Check if data is loaded dynamically via JavaScript/AJAX');  
      console.log('3. Look for additional JSON-LD or structured data');
      console.log('4. Examine other HTML attributes like aria-label, title, etc.');
    }
    
    // Save fixes to file
    const fixesData = {
      timestamp: new Date().toISOString(),
      source_file: htmlPath,
      gold_standard: GOLD_STANDARD,
      total_fields: Object.keys(BROKEN_SELECTORS).length,
      fixes_generated: fixes.length,
      success_rate: fixes.length / Object.keys(BROKEN_SELECTORS).length * 100,
      fixes: fixes
    };
    
    const outputPath = './css-selector-fixes.json';
    writeFileSync(outputPath, JSON.stringify(fixesData, null, 2));
    console.log(`\n💾 Detailed fixes saved to: ${outputPath}`);
    
    // Generate TypeScript code for updated selectors
    generateSelectorCode(fixes);
    
  } catch (error) {
    console.error('❌ Error analyzing HTML file:', error);
  }
}

function generateSelectorCode(fixes: SelectorFix[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 GENERATED SELECTOR CODE');
  console.log('='.repeat(80));
  
  console.log('\n// Updated CSS selectors based on gold standard analysis:');
  
  fixes.forEach(fix => {
    console.log(`\n// ${fix.field} - ${fix.source} (confidence: ${fix.confidence}%)`);
    console.log(`// ${fix.notes}`);
    console.log(`${fix.field}: [`);
    fix.newSelectors.forEach(selector => {
      console.log(`  '${selector}',`);
    });
    // Keep some original selectors as fallback
    const fallbacks = fix.currentSelectors.slice(0, 2);
    fallbacks.forEach(selector => {
      console.log(`  '${selector}', // fallback`);
    });
    console.log(`],`);
  });
  
  console.log('\n// TODO: Implement extraction logic for JSON-LD and complex selectors');
}

// Run the selector fix generator
if (require.main === module) {
  generateSelectorFixes().catch(console.error);
}

export { generateSelectorFixes };