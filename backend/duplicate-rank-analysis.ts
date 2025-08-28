import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { CSSExtractionMethod } from './src/silver/css-extraction-method';
import { ExtractionContext } from './src/silver/types';
import { JSDOM } from 'jsdom';

interface RankingData {
  schoolSlug: string;
  nationalRank: number | null;
  stateRank: number | null;
  htmlPath: string;
  isUnranked: boolean;
  unrankedReason?: string;
  precision?: string;
  confidence: number;
}

// Create one extractor instance to reuse
const globalExtractor = new CSSExtractionMethod();

async function extractSchoolData(htmlContent: string, schoolSlug: string, htmlPath: string): Promise<RankingData> {
  const mockContext: ExtractionContext = {
    bronzeRecord: {
      id: 1,
      school_slug: schoolSlug,
      file_path: htmlPath,
      capture_timestamp: new Date().toISOString(),
      file_size: htmlContent.length,
      checksum_sha256: 'analysis',
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
    
    // Debug: log the first few results
    if (Math.random() < 0.05) { // Log ~5% of results for debugging
      console.log(`DEBUG ${schoolSlug}:`, {
        nationalRank: result.data.national_rank,
        stateRank: result.data.state_rank,
        isUnranked: result.data.is_unranked,
        unrankedReason: result.data.unranked_reason?.substring(0, 50),
        confidence: result.confidence
      });
    }
    
    return {
      schoolSlug,
      nationalRank: result.data.national_rank || null,
      stateRank: result.data.state_rank || null,
      htmlPath,
      isUnranked: result.data.is_unranked || false,
      unrankedReason: result.data.unranked_reason || undefined,
      precision: result.data.national_rank_precision || undefined,
      confidence: result.confidence
    };
  } catch (error) {
    return {
      schoolSlug,
      nationalRank: null,
      stateRank: null,
      htmlPath,
      isUnranked: true,
      unrankedReason: `Extraction error: ${error}`,
      confidence: 0
    };
  }
}

async function analyzeDataset(dataDir: string, maxSchools: number = 200): Promise<RankingData[]> {
  const schools: RankingData[] = [];
  const BATCH_SIZE = 50;
  
  try {
    const allSchoolDirs = readdirSync(dataDir);
    // Sample from the middle portion to avoid online schools at the beginning
    const startIndex = Math.floor(allSchoolDirs.length * 0.3); // Start at 30% through
    const schoolDirs = allSchoolDirs.slice(startIndex, startIndex + maxSchools);
    console.log(`Analyzing ${schoolDirs.length} schools from middle section using CSSExtractionMethod in batches of ${BATCH_SIZE}...`);
    console.log(`Sampling from index ${startIndex} to ${startIndex + maxSchools} of ${allSchoolDirs.length} total schools`);
    
    let processed = 0;
    
    // Process in batches to manage memory
    for (let i = 0; i < schoolDirs.length; i += BATCH_SIZE) {
      const batch = schoolDirs.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(schoolDirs.length/BATCH_SIZE)} (${batch.length} schools)...`);
      
      for (const schoolDir of batch) {
        try {
          const schoolPath = join(dataDir, schoolDir);
          const files = readdirSync(schoolPath);
          const htmlFile = files.find(f => f.endsWith('.html'));
          
          if (!htmlFile) continue;
          
          const htmlPath = join(schoolPath, htmlFile);
          const content = readFileSync(htmlPath, 'utf-8');
          
          const schoolData = await extractSchoolData(content, schoolDir, htmlPath);
          schools.push(schoolData);
          
          processed++;
          
          // Clear content from memory immediately
          content.replace(/./g, '');
          
        } catch (error) {
          // Skip schools with file access issues
          continue;
        }
      }
      
      // Force garbage collection between batches if available
      if (global.gc) {
        global.gc();
      }
      
      console.log(`Batch complete. Processed ${processed}/${schoolDirs.length} schools so far.`);
    }
    
  } catch (error) {
    console.error('Error accessing data directory:', error);
  }
  
  return schools;
}

function analyzeDuplicates(schools: RankingData[]) {
  console.log('\n=== DUPLICATE RANK ANALYSIS ===\n');
  
  // Group by national rank
  const nationalRankGroups = new Map<number, RankingData[]>();
  const unrankedSchools: RankingData[] = [];
  
  for (const school of schools) {
    if (school.isUnranked) {
      unrankedSchools.push(school);
    } else if (school.nationalRank !== null) {
      if (!nationalRankGroups.has(school.nationalRank)) {
        nationalRankGroups.set(school.nationalRank, []);
      }
      nationalRankGroups.get(school.nationalRank)!.push(school);
    }
  }
  
  // Find duplicates, excluding boundary rank #13427 (acceptable)
  const duplicates = Array.from(nationalRankGroups.entries())
    .filter(([rank, schools]) => schools.length > 1 && rank !== 13427)
    .sort((a, b) => b[1].length - a[1].length);
    
  const boundary13427 = nationalRankGroups.get(13427) || [];
  
  console.log(`Found ${duplicates.length} problematic ranks with duplicates (excluding boundary rank #13427):`);
  console.log(`Boundary rank #13427 has ${boundary13427.length} schools (acceptable for ML processing)`);
  console.log(`Total unranked schools: ${unrankedSchools.length}`);
  console.log(`Total schools with ranks: ${Array.from(nationalRankGroups.values()).flat().length}`);
  
  // Show problematic duplicated ranks (excluding 13427)
  console.log('\nProblematic Duplicated Ranks (Exact precision duplicates are concerning):');
  duplicates.slice(0, 20).forEach(([rank, schools], index) => {
    const exactCount = schools.filter(s => s.precision === 'exact').length;
    const rangeCount = schools.filter(s => s.precision === 'range').length;
    const status = exactCount > 1 ? '🚨 PROBLEMATIC' : exactCount === 1 ? '⚠️  INVESTIGATE' : '✅ ACCEPTABLE';
    
    console.log(`${index + 1}. Rank #${rank}: ${schools.length} schools [${exactCount} exact, ${rangeCount} range] ${status}`);
    schools.slice(0, 3).forEach(school => {
      console.log(`   - ${school.schoolSlug} (${school.precision || 'unknown'}, conf: ${school.confidence}%)`);
    });
    if (schools.length > 3) {
      console.log(`   ... and ${schools.length - 3} more`);
    }
    console.log();
  });
  
  // Analyze rank #54 specifically
  const rank54Schools = nationalRankGroups.get(54) || [];
  if (rank54Schools.length > 0) {
    console.log(`\n=== RANK #54 DETAILED ANALYSIS ===`);
    console.log(`Found ${rank54Schools.length} schools with rank #54:`);
    rank54Schools.forEach(school => {
      console.log(`- ${school.schoolSlug} (${school.precision || 'unknown'}, conf: ${school.confidence}%)`);
      if (school.unrankedReason) {
        console.log(`  Should be unranked: ${school.unrankedReason}`);
      }
    });
  }
  
  return {
    totalSchools: schools.length,
    duplicateRanks: duplicates.length,
    unrankedCount: unrankedSchools.length,
    rankedCount: Array.from(nationalRankGroups.values()).flat().length,
    mostDuplicatedRanks: duplicates.slice(0, 10),
    rank54Count: rank54Schools.length
  };
}

async function main() {
  console.log('🔍 Starting comprehensive duplicate rank analysis...\n');
  
  const dataDir = '/Volumes/OWC Express 1M2/USNEWS_2024';
  const schools = await analyzeDataset(dataDir, 1000); // Scale testing to 1000+ schools (5% coverage)
  
  if (schools.length === 0) {
    console.error('No schools found to analyze!');
    return;
  }
  
  const analysis = analyzeDuplicates(schools);
  
  console.log('\n=== SUMMARY ===');
  console.log(`Total schools analyzed: ${analysis.totalSchools}`);
  console.log(`Schools with ranks: ${analysis.rankedCount}`);
  console.log(`Unranked schools: ${analysis.unrankedCount}`);
  console.log(`Ranks with duplicates: ${analysis.duplicateRanks}`);
  console.log(`Schools with rank #54: ${analysis.rank54Count}`);
  
  const duplicateRate = (analysis.duplicateRanks / analysis.rankedCount * 100).toFixed(2);
  console.log(`Duplicate rate: ${duplicateRate}%`);
  
  if (analysis.duplicateRanks > 10) {
    console.log('\n⚠️  SIGNIFICANT DUPLICATE PROBLEM DETECTED');
    console.log('This suggests a systematic parsing issue beyond just rank #54');
  } else {
    console.log('\n✅ Duplicate ranks appear to be isolated cases');
  }
}

main().catch(console.error);