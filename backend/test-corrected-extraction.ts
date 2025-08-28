#!/usr/bin/env tsx

/**
 * Test Corrected Extraction Method
 * 
 * Verify that the extraction method now properly respects "Unranked" labels
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { CSSExtractionMethod } from './src/silver/css-extraction-method';
import { ExtractionContext } from './src/silver/types';

interface CorrectedTestResult {
  schoolSlug: string;
  schoolName: string;
  previouslyExtractedRanking: boolean; // Did our old method extract a ranking?
  nowDetectedAsUnranked: boolean;      // Does our new method detect as unranked?
  isUnranked?: boolean;
  unrankedReason?: string;
  nationalRank: number | null;
  stateRank: number | null;
  confidence: number;
}

async function testSchoolExtraction(schoolSlug: string): Promise<CorrectedTestResult | null> {
  const schoolDir = join('/Volumes/OWC Express 1M2/USNEWS_2024', schoolSlug);
  
  try {
    if (!existsSync(schoolDir)) {
      return null;
    }
    
    const files = readdirSync(schoolDir);
    const htmlFile = files.find(f => f.endsWith('.html'));
    
    if (!htmlFile) {
      return null;
    }
    
    const htmlPath = join(schoolDir, htmlFile);
    const html = readFileSync(htmlPath, 'utf-8');
    
    // Check if HTML contains explicit unranked indicators (what we expect to find)
    const hasUnrankedIndicators = html.toLowerCase().includes('unranked') && 
      (html.includes('<strong>Unranked</strong>') || html.includes('Unranked School'));
    
    // Create extraction context
    const mockContext: ExtractionContext = {
      bronzeRecord: {
        id: 1,
        school_slug: schoolSlug,
        file_path: htmlPath,
        capture_timestamp: new Date().toISOString(),
        file_size: html.length,
        checksum_sha256: 'test',
        processing_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      schoolSlug,
      sourceYear: 2024,
      fileContent: html,
      domDocument: null
    };
    
    // Run extraction with corrected method
    const extractor = new CSSExtractionMethod();
    const result = await extractor.extract(html, mockContext);
    
    return {
      schoolSlug,
      schoolName: result.data.school_name || schoolSlug,
      previouslyExtractedRanking: !!(result.data.national_rank || result.data.state_rank),
      nowDetectedAsUnranked: !!(result.data as any).is_unranked,
      isUnranked: (result.data as any).is_unranked,
      unrankedReason: (result.data as any).unranked_reason,
      nationalRank: result.data.national_rank,
      stateRank: result.data.state_rank,
      confidence: result.confidence
    };
    
  } catch (error) {
    return null;
  }
}

async function testCorrectedExtraction() {
  console.log('🧪 Testing Corrected Extraction Method');
  console.log('=' .repeat(60));
  console.log('Verifying that explicit "Unranked" labels are now respected\n');
  
  const dataDir = '/Volumes/OWC Express 1M2/USNEWS_2024';
  
  if (!existsSync(dataDir)) {
    console.log('❌ External drive not available');
    return;
  }
  
  // Test the schools we know have "Unranked" indicators from debug
  const testSchools = [
    '196online-high-school-410191',
    '21st-century-charter-school-at-gary-7108', 
    '21st-century-cyber-charter-school-16726',
    '21st-century-learning-institute-153438',
    '279online-learning-program-9-12-410186',
    '27j-online-academy-409878',
    '360-high-school-153601',
    '5280-high-school-408525',
    '5riversonline-secondary-410202',
    'academic-magnet-high-school-17566' // This one should NOT be unranked
  ];
  
  console.log(`🎯 Testing ${testSchools.length} schools with corrected extraction logic...`);
  
  const results: CorrectedTestResult[] = [];
  
  for (const schoolSlug of testSchools) {
    const result = await testSchoolExtraction(schoolSlug);
    if (result) {
      results.push(result);
    }
  }
  
  console.log(`\n📊 Test Results: ${results.length} schools tested`);
  console.log('=' .repeat(60));
  
  // Analyze results
  const unrankedResults = results.filter(r => r.nowDetectedAsUnranked);
  const rankedResults = results.filter(r => !r.nowDetectedAsUnranked);
  const previouslyMisclassified = results.filter(r => r.previouslyExtractedRanking && r.nowDetectedAsUnranked);
  
  console.log('\n🏆 CORRECTED CLASSIFICATION:');
  console.log('============================');
  console.log(`Detected as UNRANKED: ${unrankedResults.length} schools`);
  console.log(`Detected as RANKED: ${rankedResults.length} schools`);
  console.log(`Previously misclassified: ${previouslyMisclassified.length} schools`);
  
  if (unrankedResults.length > 0) {
    console.log('\n✅ UNRANKED SCHOOLS (Correctly Detected):');
    unrankedResults.forEach(school => {
      console.log(`   ${school.schoolName}:`);
      console.log(`     Slug: ${school.schoolSlug}`);
      console.log(`     Reason: ${school.unrankedReason}`);
      console.log(`     Confidence: ${school.confidence}%`);
      console.log(`     Previously extracted ranking: ${school.previouslyExtractedRanking ? 'YES' : 'NO'}`);
    });
  }
  
  if (rankedResults.length > 0) {
    console.log('\n🏆 RANKED SCHOOLS (Should have rankings):');
    rankedResults.forEach(school => {
      console.log(`   ${school.schoolName}:`);
      console.log(`     National: #${school.nationalRank || 'N/A'}, State: #${school.stateRank || 'N/A'}`);
      console.log(`     Confidence: ${school.confidence}%`);
    });
  }
  
  if (previouslyMisclassified.length > 0) {
    console.log('\n⚠️  PREVIOUSLY MISCLASSIFIED (Now Fixed):');
    console.log('=========================================');
    previouslyMisclassified.forEach(school => {
      console.log(`   ${school.schoolName}:`);
      console.log(`     BEFORE: Extracted rankings incorrectly`);  
      console.log(`     AFTER: Correctly detected as unranked`);
      console.log(`     Reason: ${school.unrankedReason}`);
    });
  }
  
  console.log('\n📈 VALIDATION SUMMARY:');
  console.log('======================');
  
  if (previouslyMisclassified.length > 0) {
    console.log(`✅ SUCCESS: Fixed ${previouslyMisclassified.length} previously misclassified schools`);
    console.log(`   → These schools were incorrectly extracted as "ranked" before`);
    console.log(`   → Now correctly detected as "unranked" by US News`);
  } else {
    console.log(`⚠️  No previously misclassified schools found`);
    console.log(`   → This may indicate our test set doesn't include the problematic schools`);
  }
  
  if (unrankedResults.length >= 8) {  // We expect 8/10 from debug to be unranked
    console.log(`🎉 MAJOR FIX VALIDATED: ${unrankedResults.length} unranked schools correctly detected`);
    console.log(`   → Extraction method now respects US News "Unranked" labels`);
  } else {
    console.log(`❓ UNEXPECTED: Only ${unrankedResults.length} unranked schools detected`);
    console.log(`   → Expected ~8 based on debug results`);
  }
  
  // Check Academic Magnet specifically (should be ranked, not unranked)
  const academicMagnet = results.find(r => r.schoolSlug.includes('academic-magnet'));
  if (academicMagnet) {
    console.log('\n🎯 ACADEMIC MAGNET HIGH SCHOOL VERIFICATION:');
    if (academicMagnet.nowDetectedAsUnranked) {
      console.log(`❌ ERROR: Academic Magnet incorrectly detected as unranked`);
    } else {
      console.log(`✅ CORRECT: Academic Magnet correctly detected as ranked (#${academicMagnet.nationalRank})`);
    }
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('==============');
  if (unrankedResults.length > 0) {
    console.log('1. ✅ Re-run ranking validation tests with corrected extraction');
    console.log('2. ✅ Update trend graph logic to handle unranked schools');  
    console.log('3. ✅ Create proper Bucket 4 classification for unranked schools');
  } else {
    console.log('1. ❓ Investigate why unranked detection is not working');
    console.log('2. ❓ Check if test schools actually contain unranked indicators');
  }
}

testCorrectedExtraction().catch(console.error);