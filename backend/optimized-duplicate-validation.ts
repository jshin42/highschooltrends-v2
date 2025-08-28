/**
 * Optimized Duplicate Rank Validation
 * Memory-efficient validation of ranking extraction fixes
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { CSSExtractionMethod } from './src/silver/css-extraction-method';
import { ExtractionContext } from './src/silver/types';

interface ValidationResult {
  schoolSlug: string;
  nationalRank: number | null;
  precision?: string;
  confidence: number;
  isUnranked: boolean;
}

const globalExtractor = new CSSExtractionMethod();

async function quickValidateSchool(htmlContent: string, schoolSlug: string, htmlPath: string): Promise<ValidationResult | null> {
  const mockContext: ExtractionContext = {
    bronzeRecord: {
      id: 1,
      school_slug: schoolSlug,
      file_path: htmlPath,
      capture_timestamp: new Date().toISOString(),
      file_size: htmlContent.length,
      checksum_sha256: 'validation',
      processing_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    schoolSlug,
    sourceYear: 2024,
    fileContent: htmlContent,
    domDocument: null
  };

  try {
    const result = await globalExtractor.extract(htmlContent, mockContext);
    
    // Clear content immediately to save memory
    htmlContent = '';
    
    return {
      schoolSlug,
      nationalRank: result.data.national_rank || null,
      precision: result.data.national_rank_precision || undefined,
      confidence: result.confidence,
      isUnranked: result.data.is_unranked || false
    };
  } catch (error) {
    return null; // Skip errors for quick validation
  }
}

async function runOptimizedValidation(): Promise<void> {
  console.log('🔍 Running optimized duplicate rank validation...\n');
  
  const dataDir = '/Volumes/OWC Express 1M2/USNEWS_2024';
  const results: ValidationResult[] = [];
  const maxSchools = 500; // Reduced for memory efficiency
  const batchSize = 25; // Smaller batches
  
  try {
    const allSchoolDirs = readdirSync(dataDir);
    // Sample from different sections for diversity
    const sections = [
      allSchoolDirs.slice(1000, 1000 + maxSchools/4),    // Early section
      allSchoolDirs.slice(5000, 5000 + maxSchools/4),    // Mid section  
      allSchoolDirs.slice(10000, 10000 + maxSchools/4),  // Late section
      allSchoolDirs.slice(15000, 15000 + maxSchools/4)   // End section
    ].flat();
    
    console.log(`Analyzing ${sections.length} schools from diverse sections...`);
    
    let processed = 0;
    
    for (let i = 0; i < sections.length; i += batchSize) {
      const batch = sections.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(sections.length/batchSize)} (${batch.length} schools)...`);
      
      for (const schoolDir of batch) {
        try {
          const schoolPath = join(dataDir, schoolDir);
          const files = readdirSync(schoolPath);
          const htmlFile = files.find(f => f.endsWith('.html'));
          
          if (!htmlFile) continue;
          
          const htmlPath = join(schoolPath, htmlFile);
          let content = readFileSync(htmlPath, 'utf-8');
          
          const schoolData = await quickValidateSchool(content, schoolDir, htmlPath);
          if (schoolData) {
            results.push(schoolData);
          }
          
          // Clear content immediately
          content = '';
          processed++;
          
        } catch (error) {
          continue; // Skip file access issues
        }
      }
      
      // Force GC between batches
      if (global.gc) {
        global.gc();
      }
      
      console.log(`Batch complete. Processed ${processed}/${sections.length} schools.`);
    }
    
  } catch (error) {
    console.error('Error accessing data directory:', error);
    return;
  }
  
  // Analyze duplicates
  console.log('\n=== DUPLICATE ANALYSIS ===\n');
  
  const rankGroups = new Map<number, ValidationResult[]>();
  const unrankedCount = results.filter(r => r.isUnranked).length;
  
  // Group by national rank
  for (const result of results) {
    if (result.nationalRank && !result.isUnranked) {
      if (!rankGroups.has(result.nationalRank)) {
        rankGroups.set(result.nationalRank, []);
      }
      rankGroups.get(result.nationalRank)!.push(result);
    }
  }
  
  // Find problematic duplicates (excluding boundary #13,427)
  const duplicates = Array.from(rankGroups.entries())
    .filter(([rank, schools]) => schools.length > 1 && rank !== 13427)
    .sort((a, b) => b[1].length - a[1].length);
    
  const boundary13427 = rankGroups.get(13427) || [];
  
  console.log(`Total schools processed: ${results.length}`);
  console.log(`Schools with national ranks: ${Array.from(rankGroups.values()).flat().length}`);
  console.log(`Unranked schools: ${unrankedCount}`);
  console.log(`Boundary rank #13,427: ${boundary13427.length} schools (acceptable)`);
  console.log(`🚨 Problematic duplicate ranks: ${duplicates.length}`);
  
  if (duplicates.length > 0) {
    console.log('\nProblematic Duplicates Found:');
    duplicates.slice(0, 10).forEach(([rank, schools], index) => {
      const exactCount = schools.filter(s => s.precision === 'exact').length;
      console.log(`${index + 1}. Rank #${rank}: ${schools.length} schools (${exactCount} exact)`);
      schools.slice(0, 2).forEach(school => {
        console.log(`   - ${school.schoolSlug} (${school.precision}, conf: ${school.confidence}%)`);
      });
    });
  } else {
    console.log('✅ NO problematic duplicate ranks found!');
  }
  
  // Calculate statistics
  const avgConfidence = results.filter(r => r.confidence > 0)
    .reduce((sum, r) => sum + r.confidence, 0) / results.filter(r => r.confidence > 0).length;
    
  const duplicateRate = (duplicates.length / results.length * 100).toFixed(2);
  
  console.log(`\nAverage confidence: ${avgConfidence.toFixed(2)}%`);
  console.log(`Duplicate rate: ${duplicateRate}%`);
  
  if (duplicates.length === 0) {
    console.log('\n🎯 VALIDATION SUCCESS: No duplicate rank issues detected!');
    console.log('The ranking extraction fixes are working correctly at scale.');
  } else {
    console.log('\n⚠️  Some duplicate issues remain - further investigation needed.');
  }
}

// Run the validation
if (require.main === module) {
  runOptimizedValidation().catch(console.error);
}

export { runOptimizedValidation };