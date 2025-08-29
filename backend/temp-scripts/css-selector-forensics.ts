/**
 * CSS Selector Forensics Tool
 * 
 * Analyzes actual US News HTML structure to identify correct CSS selectors
 * for the 30 completely broken fields (0% success rate).
 * 
 * This tool will:
 * 1. Examine real HTML files to understand the actual page structure
 * 2. Identify correct selectors for each field type
 * 3. Generate updated selector mappings
 * 4. Validate new selectors against multiple school types
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { JSDOM } from 'jsdom';

interface SelectorFindings {
  field: string;
  currentSelectors: string[];
  actualContent: string[];
  suggestedSelectors: string[];
  confidence: number;
  schoolsWithData: number;
  schoolsTested: number;
}

interface HTMLAnalysis {
  schoolSlug: string;
  schoolType: string;
  findings: {
    demographics: string[];
    academics: string[];
    location: string[];
    enrollment: string[];
    basicInfo: string[];
  };
}

// Current broken selectors from the CSSExtractionMethod
const BROKEN_SELECTORS = {
  // Basic Information (2 broken)
  nces_id: [
    '[data-testid="nces-id"]',
    '.nces-identifier',
    '.school-id'
  ],
  grades_served: [
    '[data-testid="grades-served"]',
    '.grades-served',
    '.school-grades'
  ],
  
  // Location Data (7 broken)
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
  setting: [
    '[data-testid="school-setting"]',
    '.school-setting',
    '.location-type'
  ],
  
  // Enrollment (3 broken)
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
  
  // Academic Performance (7 broken)
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
  
  // Demographics (8 broken)
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
  female_pct: [
    '[data-testid="demo-female"]',
    '.demographics .female-percentage',
    '.gender-breakdown .female'
  ],
  male_pct: [
    '[data-testid="demo-male"]',
    '.demographics .male-percentage',
    '.gender-breakdown .male'
  ],
  
  // Socioeconomic (3 broken)
  economically_disadvantaged_pct: [
    '[data-testid="econ-disadvantaged"]',
    '.economics .disadvantaged-pct',
    '.socioeconomic .disadvantaged'
  ],
  free_lunch_pct: [
    '[data-testid="free-lunch"]',
    '.lunch-program .free-pct',
    '.meal-assistance .free'
  ],
  reduced_lunch_pct: [
    '[data-testid="reduced-lunch"]',
    '.lunch-program .reduced-pct',
    '.meal-assistance .reduced'
  ]
};

async function analyzeHTMLStructure(htmlContent: string, schoolSlug: string): Promise<HTMLAnalysis> {
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;
  
  const analysis: HTMLAnalysis = {
    schoolSlug,
    schoolType: schoolSlug.includes('online') ? 'online' : schoolSlug.includes('charter') ? 'charter' : 'traditional',
    findings: {
      demographics: [],
      academics: [],
      location: [],
      enrollment: [],
      basicInfo: []
    }
  };
  
  // Look for demographics-related content
  const demographicsKeywords = ['white', 'asian', 'hispanic', 'black', 'african american', 'american indian', 'native', 'female', 'male', 'students by race', 'students by gender'];
  const academicsKeywords = ['graduation', 'ap', 'advanced placement', 'math proficiency', 'reading proficiency', 'science proficiency', 'college readiness'];
  const locationKeywords = ['address', 'phone', 'website', 'setting', 'location', 'suburb', 'rural', 'city'];
  const enrollmentKeywords = ['enrollment', 'students', 'student teacher ratio', 'teachers', 'staff'];
  
  // Analyze all text content and DOM structure
  const allText = document.body?.textContent?.toLowerCase() || '';
  const allHTML = document.body?.innerHTML || '';
  
  // Find elements that might contain our data
  const allElements = Array.from(document.querySelectorAll('*'));
  
  for (const element of allElements) {
    const text = element.textContent?.toLowerCase() || '';
    const innerHTML = element.innerHTML;
    const className = element.className;
    const id = element.id;
    const tagName = element.tagName.toLowerCase();
    
    // Skip very large elements (likely containers)
    if (text.length > 500) continue;
    
    // Look for demographic indicators
    if (demographicsKeywords.some(keyword => text.includes(keyword))) {
      const selector = generateSelector(element);
      if (selector && !analysis.findings.demographics.includes(selector)) {
        analysis.findings.demographics.push(`${selector} // ${text.substring(0, 100).trim()}`);
      }
    }
    
    // Look for academic indicators
    if (academicsKeywords.some(keyword => text.includes(keyword))) {
      const selector = generateSelector(element);
      if (selector && !analysis.findings.academics.includes(selector)) {
        analysis.findings.academics.push(`${selector} // ${text.substring(0, 100).trim()}`);
      }
    }
    
    // Look for location indicators
    if (locationKeywords.some(keyword => text.includes(keyword))) {
      const selector = generateSelector(element);
      if (selector && !analysis.findings.location.includes(selector)) {
        analysis.findings.location.push(`${selector} // ${text.substring(0, 100).trim()}`);
      }
    }
    
    // Look for enrollment indicators
    if (enrollmentKeywords.some(keyword => text.includes(keyword))) {
      const selector = generateSelector(element);
      if (selector && !analysis.findings.enrollment.includes(selector)) {
        analysis.findings.enrollment.push(`${selector} // ${text.substring(0, 100).trim()}`);
      }
    }
  }
  
  // Look for specific patterns that might be missed
  
  // Check for percentage patterns (likely demographics)
  const percentageMatches = allHTML.match(/(\d+\.?\d*%)/g);
  if (percentageMatches && percentageMatches.length > 0) {
    analysis.findings.demographics.push(`// Found percentages: ${percentageMatches.slice(0, 5).join(', ')}`);
  }
  
  // Check for phone number patterns
  const phoneMatches = allHTML.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g);
  if (phoneMatches) {
    analysis.findings.location.push(`// Found phone numbers: ${phoneMatches.slice(0, 2).join(', ')}`);
  }
  
  // Check for address patterns
  const addressMatches = allHTML.match(/\d+\s+[A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court)/gi);
  if (addressMatches) {
    analysis.findings.location.push(`// Found addresses: ${addressMatches.slice(0, 2).join(', ')}`);
  }
  
  // Check for enrollment numbers (likely 3-4 digit numbers)
  const enrollmentMatches = allHTML.match(/enrollment[^0-9]*(\d{2,4})/gi);
  if (enrollmentMatches) {
    analysis.findings.enrollment.push(`// Found enrollment numbers: ${enrollmentMatches.slice(0, 2).join(', ')}`);
  }
  
  return analysis;
}

function generateSelector(element: Element): string | null {
  // Generate a CSS selector for this element
  const tag = element.tagName.toLowerCase();
  const className = element.className;
  const id = element.id;
  const parent = element.parentElement;
  
  // Prefer ID selectors
  if (id) {
    return `#${id}`;
  }
  
  // Use class selectors
  if (className && typeof className === 'string' && className.trim()) {
    const classes = className.trim().split(/\s+/).filter(c => c.length > 0);
    if (classes.length > 0) {
      return `${tag}.${classes.join('.')}`;
    }
  }
  
  // Use parent context if available
  if (parent) {
    const parentClass = parent.className;
    if (parentClass && typeof parentClass === 'string' && parentClass.trim()) {
      const parentClasses = parentClass.trim().split(/\s+/).filter(c => c.length > 0);
      if (parentClasses.length > 0) {
        return `.${parentClasses[0]} ${tag}`;
      }
    }
  }
  
  return tag;
}

async function runCSSForensics(): Promise<void> {
  console.log('🔬 CSS Selector Forensics Analysis');
  console.log('Analyzing actual US News HTML structure to fix broken selectors\n');
  
  const dataDir = '/Volumes/OWC Express 1M2/USNEWS_2024';
  const analyses: HTMLAnalysis[] = [];
  const sampleSize = 20; // Analyze 20 diverse schools
  
  try {
    const allSchoolDirs = readdirSync(dataDir);
    
    // Get diverse sample
    const samples = [
      allSchoolDirs[100], // Traditional school likely
      allSchoolDirs[200], // Traditional school likely
      ...allSchoolDirs.filter(dir => dir.includes('online')).slice(0, 5), // Online schools
      ...allSchoolDirs.filter(dir => dir.includes('charter')).slice(0, 5), // Charter schools
      ...allSchoolDirs.filter(dir => dir.includes('magnet')).slice(0, 3), // Magnet schools
      ...allSchoolDirs.slice(5000, 5007) // Mid-range schools
    ].filter(Boolean).slice(0, sampleSize);
    
    console.log(`Analyzing ${samples.length} diverse schools for CSS selector patterns...\n`);
    
    for (let i = 0; i < samples.length; i++) {
      const schoolDir = samples[i];
      console.log(`[${i + 1}/${samples.length}] Analyzing: ${schoolDir}`);
      
      try {
        const schoolPath = join(dataDir, schoolDir);
        const files = readdirSync(schoolPath);
        const htmlFile = files.find(f => f.endsWith('.html'));
        
        if (!htmlFile) {
          console.log('  ❌ No HTML file found');
          continue;
        }
        
        const htmlPath = join(schoolPath, htmlFile);
        const content = readFileSync(htmlPath, 'utf-8');
        
        const analysis = await analyzeHTMLStructure(content, schoolDir);
        analyses.push(analysis);
        
        console.log(`  Demographics elements found: ${analysis.findings.demographics.length}`);
        console.log(`  Academic elements found: ${analysis.findings.academics.length}`);
        console.log(`  Location elements found: ${analysis.findings.location.length}`);
        console.log(`  Enrollment elements found: ${analysis.findings.enrollment.length}`);
        
      } catch (error) {
        console.log(`  ❌ Error analyzing ${schoolDir}: ${error}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error accessing data directory:', error);
    return;
  }
  
  if (analyses.length === 0) {
    console.error('❌ No schools analyzed successfully!');
    return;
  }
  
  // Generate comprehensive analysis report
  console.log('\n' + '='.repeat(80));
  console.log('📋 CSS SELECTOR FORENSICS REPORT');
  console.log('='.repeat(80));
  
  console.log(`\nAnalyzed ${analyses.length} schools:`);
  const schoolTypeCount = analyses.reduce((acc, a) => {
    acc[a.schoolType] = (acc[a.schoolType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(schoolTypeCount).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} schools`);
  });
  
  // Demographics findings
  console.log('\n🏠 DEMOGRAPHICS FINDINGS:');
  const allDemographicsFindings = analyses.flatMap(a => a.findings.demographics);
  const demographicsPatterns = findCommonPatterns(allDemographicsFindings);
  
  if (demographicsPatterns.length > 0) {
    console.log('Most common demographic selectors:');
    demographicsPatterns.slice(0, 10).forEach((pattern, i) => {
      console.log(`  ${i + 1}. ${pattern.pattern} (found in ${pattern.count} schools)`);
    });
  } else {
    console.log('❌ No demographic data patterns found in HTML structure');
    console.log('Demographics may be loaded dynamically via JavaScript or not present');
  }
  
  // Academics findings  
  console.log('\n📚 ACADEMICS FINDINGS:');
  const allAcademicsFindings = analyses.flatMap(a => a.findings.academics);
  const academicsPatterns = findCommonPatterns(allAcademicsFindings);
  
  if (academicsPatterns.length > 0) {
    console.log('Most common academic selectors:');
    academicsPatterns.slice(0, 10).forEach((pattern, i) => {
      console.log(`  ${i + 1}. ${pattern.pattern} (found in ${pattern.count} schools)`);
    });
  } else {
    console.log('❌ No academic data patterns found in HTML structure');
    console.log('Academic data may be loaded dynamically via JavaScript or not present');
  }
  
  // Location findings
  console.log('\n📍 LOCATION FINDINGS:');
  const allLocationFindings = analyses.flatMap(a => a.findings.location);
  const locationPatterns = findCommonPatterns(allLocationFindings);
  
  if (locationPatterns.length > 0) {
    console.log('Most common location selectors:');
    locationPatterns.slice(0, 10).forEach((pattern, i) => {
      console.log(`  ${i + 1}. ${pattern.pattern} (found in ${pattern.count} schools)`);
    });
  } else {
    console.log('❌ No location data patterns found in HTML structure');
    console.log('Location data may be loaded dynamically via JavaScript or not present');
  }
  
  // Enrollment findings
  console.log('\n👥 ENROLLMENT FINDINGS:');
  const allEnrollmentFindings = analyses.flatMap(a => a.findings.enrollment);
  const enrollmentPatterns = findCommonPatterns(allEnrollmentFindings);
  
  if (enrollmentPatterns.length > 0) {
    console.log('Most common enrollment selectors:');
    enrollmentPatterns.slice(0, 10).forEach((pattern, i) => {
      console.log(`  ${i + 1}. ${pattern.pattern} (found in ${pattern.count} schools)`);
    });
  } else {
    console.log('❌ No enrollment data patterns found in HTML structure');
    console.log('Enrollment data may be loaded dynamically via JavaScript or not present');
  }
  
  // Generate detailed school-by-school breakdown
  console.log('\n📊 DETAILED SCHOOL-BY-SCHOOL BREAKDOWN:');
  analyses.forEach((analysis, i) => {
    console.log(`\n${i + 1}. ${analysis.schoolSlug} (${analysis.schoolType}):`);
    console.log(`   Demographics: ${analysis.findings.demographics.length} elements`);
    console.log(`   Academics: ${analysis.findings.academics.length} elements`);
    console.log(`   Location: ${analysis.findings.location.length} elements`);
    console.log(`   Enrollment: ${analysis.findings.enrollment.length} elements`);
    
    // Show top findings for this school
    if (analysis.findings.demographics.length > 0) {
      console.log('   Top demographic findings:');
      analysis.findings.demographics.slice(0, 3).forEach(finding => {
        console.log(`     ${finding}`);
      });
    }
  });
  
  // Save detailed findings to file
  const detailedReport = {
    timestamp: new Date().toISOString(),
    schoolsAnalyzed: analyses.length,
    schoolTypeBreakdown: schoolTypeCount,
    findings: {
      demographics: demographicsPatterns,
      academics: academicsPatterns, 
      location: locationPatterns,
      enrollment: enrollmentPatterns
    },
    schoolDetails: analyses
  };
  
  const reportPath = './css-selector-forensics-report.json';
  writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
  
  console.log('\n' + '='.repeat(80));
  console.log('🎯 CONCLUSIONS:');
  
  const totalPatterns = demographicsPatterns.length + academicsPatterns.length + locationPatterns.length + enrollmentPatterns.length;
  
  if (totalPatterns === 0) {
    console.log('❌ CRITICAL: No data patterns found in HTML structure');
    console.log('📋 This suggests that US News pages either:');
    console.log('   1. Load all data dynamically via JavaScript/AJAX');
    console.log('   2. Use a completely different HTML structure than expected');
    console.log('   3. Have removed/changed the data fields we are trying to extract');
    console.log('\n🔍 NEXT STEPS:');
    console.log('   1. Examine browser network requests to find AJAX endpoints');
    console.log('   2. Check for JSON-LD structured data or hidden data attributes');
    console.log('   3. Use browser automation to wait for dynamic content loading');
    console.log('   4. Verify that the data we want actually exists on the pages');
  } else {
    console.log(`✅ Found ${totalPatterns} potential data patterns`);
    console.log('📋 Most promising areas for selector fixes:');
    
    const allPatterns = [
      { category: 'Demographics', patterns: demographicsPatterns },
      { category: 'Academics', patterns: academicsPatterns },
      { category: 'Location', patterns: locationPatterns },
      { category: 'Enrollment', patterns: enrollmentPatterns }
    ];
    
    allPatterns.forEach(({ category, patterns }) => {
      if (patterns.length > 0) {
        console.log(`   ${category}: ${patterns.length} patterns found`);
      }
    });
  }
  
  console.log(`\n📄 Detailed forensics report saved to: ${reportPath}`);
  console.log('Use this data to create new, working CSS selectors.');
}

function findCommonPatterns(findings: string[]): Array<{ pattern: string; count: number }> {
  const patternCounts = new Map<string, number>();
  
  findings.forEach(finding => {
    // Extract the selector part (before the // comment)
    const selector = finding.split('//')[0].trim();
    if (selector && selector !== '') {
      patternCounts.set(selector, (patternCounts.get(selector) || 0) + 1);
    }
  });
  
  return Array.from(patternCounts.entries())
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count);
}

// Run the forensics analysis
if (require.main === module) {
  runCSSForensics().catch(console.error);
}

export { runCSSForensics };