/**
 * Ranking Extraction Forensics Tool
 * 
 * Purpose: Diagnose exactly why certain schools are extracting incorrect ranks
 * This tool traces the extraction process step-by-step to identify the root cause
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { CSSExtractionMethod } from './src/silver/css-extraction-method';
import { ExtractionContext } from './src/silver/types';
import { JSDOM } from 'jsdom';

interface DiagnosticResult {
  schoolSlug: string;
  actualHtmlRank: string | null;
  extractedRank: number | null;
  extractedPrecision: string | undefined;
  confidence: number;
  selectorTraces: SelectorTrace[];
  patternMatches: PatternMatch[];
}

interface SelectorTrace {
  selector: string;
  matchCount: number;
  extractedTexts: string[];
}

interface PatternMatch {
  pattern: string;
  match: string | null;
  extractedRank: number | null;
}

// Test cases from our analysis showing problematic duplicate ranks
const TEST_SCHOOLS = [
  { slug: 'ford-high-school-19748', expectedIssue: 'rank #18 instead of actual rank' },
  { slug: 'forest-park-jr-sr-high-school-7407', expectedIssue: 'duplicate rank #18' },
  { slug: 'forney-high-school-19058', expectedIssue: 'duplicate rank #18' },
  { slug: 'forsan-high-school-19060', expectedIssue: 'duplicate rank #18' },
  { slug: 'forest-hills-high-school-13358', expectedIssue: 'duplicate rank #11' }
];

class ForensicCSSExtraction extends CSSExtractionMethod {
  
  // Expose private methods for forensic analysis
  public exposeParseAllRankingPatterns(text: string) {
    return (this as any).parseAllRankingPatterns(text);
  }
  
  public exposeSelectors() {
    return (CSSExtractionMethod as any).SELECTORS;
  }

  // Enhanced extraction with full tracing
  public async extractWithForensics(html: string, context: ExtractionContext): Promise<DiagnosticResult> {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // 1. Extract the actual rank from the authoritative data-test-id
    const actualRankElement = document.querySelector('[data-test-id="display_rank_national"]');
    const actualHtmlRank = actualRankElement?.textContent?.match(/#\s*(\d{1,5}(?:,\d{3})*)/)?.[1] || null;
    
    // 2. Trace each selector to see what it matches
    const selectors = this.exposeSelectors();
    const selectorTraces: SelectorTrace[] = [];
    
    // Test national_rank selectors
    for (const selector of selectors.national_rank) {
      try {
        const elements = document.querySelectorAll(selector);
        const extractedTexts: string[] = [];
        
        elements.forEach(element => {
          const text = element.textContent?.trim() || '';
          if (text.length > 0 && text.length < 500) { // Reasonable text length
            extractedTexts.push(text.substring(0, 200)); // Truncate for readability
          }
        });
        
        selectorTraces.push({
          selector,
          matchCount: elements.length,
          extractedTexts
        });
      } catch (error) {
        selectorTraces.push({
          selector,
          matchCount: 0,
          extractedTexts: [`ERROR: ${error}`]
        });
      }
    }
    
    // 3. Test pattern matching on combined text
    const allRankingTexts = selectorTraces
      .flatMap(trace => trace.extractedTexts)
      .join(' ');
      
    const patterns = this.exposeParseAllRankingPatterns(allRankingTexts);
    
    const patternMatches: PatternMatch[] = [
      {
        pattern: 'Bucket 2 Range (#13,427-17,901)',
        match: allRankingTexts.match(/#(\d{1,2},\d{3})-(\d{1,2},\d{3})/)?.[0] || null,
        extractedRank: patterns.national?.rank || null
      },
      {
        pattern: 'Composite (#X in National Rankings #Y in State)',
        match: allRankingTexts.match(/#(\d{1,4}(?:,\d{3})*)\s+in\s+National\s+Rankings\s+#(\d{1,4})\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+High\s+Schools?/i)?.[0] || null,
        extractedRank: patterns.national?.rank || null
      },
      {
        pattern: 'Standard National (#X in National Rankings)',
        match: allRankingTexts.match(/#(\d{1,4}(?:,\d{3})*)\s+in\s+National\s+Rankings?/i)?.[0] || null,
        extractedRank: patterns.national?.rank || null
      },
      {
        pattern: 'Fallback National (#X National)',
        match: allRankingTexts.match(/#(\d+)\s*(?:in\s*)?(?:National|national)\s*(?:Rankings?)?/i)?.[0] || null,
        extractedRank: null // This would be calculated separately
      }
    ];
    
    // 4. Get the actual extraction result
    const result = await this.extract(html, context);
    
    return {
      schoolSlug: context.schoolSlug,
      actualHtmlRank,
      extractedRank: result.data.national_rank || null,
      extractedPrecision: result.data.national_rank_precision,
      confidence: result.confidence,
      selectorTraces,
      patternMatches
    };
  }
}

async function runForensicAnalysis(): Promise<void> {
  console.log('🔬 Starting Ranking Extraction Forensic Analysis\n');
  
  const dataDir = '/Volumes/OWC Express 1M2/USNEWS_2024';
  const extractor = new ForensicCSSExtraction();
  
  if (!existsSync(dataDir)) {
    console.error('❌ Data directory not accessible:', dataDir);
    return;
  }
  
  const results: DiagnosticResult[] = [];
  
  for (const testCase of TEST_SCHOOLS) {
    console.log(`\n🏫 Analyzing: ${testCase.slug}`);
    console.log(`   Expected Issue: ${testCase.expectedIssue}`);
    
    const schoolDir = join(dataDir, testCase.slug);
    if (!existsSync(schoolDir)) {
      console.warn(`   ⚠️  School directory not found: ${schoolDir}`);
      continue;
    }
    
    try {
      const files = require('fs').readdirSync(schoolDir);
      const htmlFile = files.find((f: string) => f.endsWith('.html'));
      
      if (!htmlFile) {
        console.warn(`   ⚠️  No HTML file found in ${testCase.slug}`);
        continue;
      }
      
      const htmlPath = join(schoolDir, htmlFile);
      const htmlContent = readFileSync(htmlPath, 'utf-8');
      
      const mockContext: ExtractionContext = {
        bronzeRecord: {
          id: 1,
          school_slug: testCase.slug,
          file_path: htmlPath,
          capture_timestamp: new Date().toISOString(),
          file_size: htmlContent.length,
          checksum_sha256: 'forensics',
          processing_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        schoolSlug: testCase.slug,
        sourceYear: 2024,
        fileContent: htmlContent,
        domDocument: null
      };
      
      const diagnostic = await extractor.extractWithForensics(htmlContent, mockContext);
      results.push(diagnostic);
      
      // Print immediate results
      console.log(`   📊 ACTUAL HTML RANK: ${diagnostic.actualHtmlRank || 'NOT FOUND'}`);
      console.log(`   🎯 EXTRACTED RANK: ${diagnostic.extractedRank || 'NULL'} (${diagnostic.extractedPrecision || 'unknown'})`);
      console.log(`   📈 CONFIDENCE: ${diagnostic.confidence}%`);
      
      // Check for mismatch
      if (diagnostic.actualHtmlRank && diagnostic.extractedRank) {
        const actualRank = parseInt(diagnostic.actualHtmlRank.replace(/,/g, ''));
        if (actualRank !== diagnostic.extractedRank) {
          console.log(`   🚨 RANK MISMATCH DETECTED! HTML: #${actualRank}, Extracted: #${diagnostic.extractedRank}`);
        } else {
          console.log(`   ✅ RANK MATCH - extraction is correct`);
        }
      }
      
    } catch (error) {
      console.error(`   ❌ Error processing ${testCase.slug}:`, error);
    }
  }
  
  // Generate comprehensive report
  console.log('\n\n📋 DETAILED FORENSIC REPORT\n');
  console.log('='.repeat(80));
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.schoolSlug.toUpperCase()}`);
    console.log('-'.repeat(40));
    
    console.log(`HTML Rank (authoritative): ${result.actualHtmlRank || 'NOT FOUND'}`);
    console.log(`Extracted Rank: ${result.extractedRank || 'NULL'}`);
    console.log(`Precision: ${result.extractedPrecision || 'unknown'}`);
    console.log(`Confidence: ${result.confidence}%`);
    
    console.log('\nSelector Traces:');
    result.selectorTraces.forEach(trace => {
      console.log(`  ${trace.selector}: ${trace.matchCount} matches`);
      if (trace.matchCount > 0 && trace.extractedTexts.length > 0) {
        trace.extractedTexts.slice(0, 3).forEach(text => {
          console.log(`    "${text.replace(/\s+/g, ' ').substring(0, 100)}..."`);
        });
        if (trace.extractedTexts.length > 3) {
          console.log(`    ... and ${trace.extractedTexts.length - 3} more`);
        }
      }
    });
    
    console.log('\nPattern Matches:');
    result.patternMatches.forEach(pattern => {
      if (pattern.match) {
        console.log(`  ✓ ${pattern.pattern}: "${pattern.match}"`);
        if (pattern.extractedRank) {
          console.log(`    → Extracted rank: ${pattern.extractedRank}`);
        }
      } else {
        console.log(`  ✗ ${pattern.pattern}: NO MATCH`);
      }
    });
  });
  
  // Summary
  const mismatches = results.filter(r => {
    if (!r.actualHtmlRank || !r.extractedRank) return false;
    const actualRank = parseInt(r.actualHtmlRank.replace(/,/g, ''));
    return actualRank !== r.extractedRank;
  });
  
  console.log('\n\n📊 FORENSIC SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total schools analyzed: ${results.length}`);
  console.log(`Schools with HTML rank found: ${results.filter(r => r.actualHtmlRank).length}`);
  console.log(`Schools with extracted rank: ${results.filter(r => r.extractedRank).length}`);
  console.log(`🚨 Rank mismatches detected: ${mismatches.length}`);
  
  if (mismatches.length > 0) {
    console.log('\nMismatch Details:');
    mismatches.forEach(mismatch => {
      const actualRank = parseInt(mismatch.actualHtmlRank!.replace(/,/g, ''));
      console.log(`  ${mismatch.schoolSlug}: HTML=#${actualRank}, Extracted=#${mismatch.extractedRank}`);
    });
  }
  
  console.log('\n🎯 NEXT STEPS:');
  if (mismatches.length > 0) {
    console.log('1. Root cause identified - selector/pattern matching issues confirmed');
    console.log('2. Proceed to Phase 2: Fix selector priority to use data-test-id attributes');
    console.log('3. Focus on schools with mismatches for testing the fix');
  } else {
    console.log('1. No rank mismatches found - investigate other potential causes');
    console.log('2. Check if the issue is in different schools or data processing pipeline');
  }
}

// Allow running as a standalone script
if (require.main === module) {
  runForensicAnalysis().catch(console.error);
}

export { runForensicAnalysis, ForensicCSSExtraction, DiagnosticResult };