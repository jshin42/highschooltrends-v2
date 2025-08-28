/**
 * Enhanced Parsing Validation Test Suite
 * 
 * Validates that our 4 specific parsing fixes work correctly:
 * 1. Bucket 2 range representation (#13,427-17,901)
 * 2. State-only ranking pattern (#1,092 in Texas High Schools)  
 * 3. Composite ranking parsing (#1,102 in National Rankings #10 in South Carolina High Schools)
 * 4. Standard national ranking pattern (#6,979 in National Rankings)
 */

import { describe, test, expect } from 'vitest';
import { CSSExtractionMethod } from '../css-extraction-method';

describe('Enhanced Parsing Validation', () => {
  let extractor: CSSExtractionMethod;

  beforeEach(() => {
    extractor = new CSSExtractionMethod();
  });

  describe('Pattern 1: Bucket 2 Range Representation', () => {
    test('should parse #13,427-17,901 format correctly', () => {
      const text = "#13,427-17,901";
      const result = (extractor as any).parseAllRankingPatterns(text);
      
      expect(result.national).toBeDefined();
      expect(result.national.rank).toBe(13427);
      expect(result.national.rankEnd).toBe(17901);
      expect(result.national.precision).toBe('range');
      expect(result.national.confidence).toBe(95);
      expect(result.state).toBeUndefined();
    });

    test('should handle variations in range format', () => {
      const variations = [
        "#13,427-17,901",
        "School ranked #13,427-17,901 nationally",
        "National ranking: #13,427-17,901"
      ];

      for (const text of variations) {
        const result = (extractor as any).parseAllRankingPatterns(text);
        expect(result.national?.rank).toBe(13427);
        expect(result.national?.rankEnd).toBe(17901);
        expect(result.national?.precision).toBe('range');
      }
    });

    test('should reject invalid ranges', () => {
      const invalidRanges = [
        "#1,000-5,000",  // Outside Bucket 2 range
        "#20,000-25,000", // Above Bucket 2 range
        "#17,902-18,000"  // Start above Bucket 2 range
      ];

      for (const text of invalidRanges) {
        const result = (extractor as any).parseAllRankingPatterns(text);
        expect(result.national).toBeUndefined();
      }
    });
  });

  describe('Pattern 2: State-Only Ranking', () => {
    test('should parse #1,092 in Texas High Schools correctly', () => {
      const text = "#1,092 in Texas High Schools";
      const result = (extractor as any).parseAllRankingPatterns(text);
      
      expect(result.state).toBeDefined();
      expect(result.state.rank).toBe(1092);
      expect(result.state.precision).toBe('state_only');
      expect(result.state.confidence).toBe(95);
      expect(result.national).toBeUndefined();
    });

    test('should handle various state patterns', () => {
      const statePatterns = [
        { text: "#42 in California High Schools", expected: 42 },
        { text: "#1,500 in New York High Schools", expected: 1500 },
        { text: "#15 in South Carolina High Schools", expected: 15 },
        { text: "#876 in Florida High Schools", expected: 876 }
      ];

      for (const pattern of statePatterns) {
        const result = (extractor as any).parseAllRankingPatterns(pattern.text);
        expect(result.state?.rank).toBe(pattern.expected);
        expect(result.state?.precision).toBe('state_only');
        expect(result.national).toBeUndefined();
      }
    });

    test('should not match national rankings as state-only', () => {
      const nationalPatterns = [
        "#1,092 in National Rankings",
        "#42 in national rankings",
        "Nationally ranked #500"
      ];

      for (const text of nationalPatterns) {
        const result = (extractor as any).parseAllRankingPatterns(text);
        expect(result.state).toBeUndefined();
      }
    });
  });

  describe('Pattern 3: Composite Ranking', () => {
    test('should parse composite pattern correctly', () => {
      const text = "#1,102 in National Rankings #10 in South Carolina High Schools";
      const result = (extractor as any).parseAllRankingPatterns(text);
      
      expect(result.national).toBeDefined();
      expect(result.national.rank).toBe(1102);
      expect(result.national.precision).toBe('exact'); // 1102 is in Bucket 1
      expect(result.national.confidence).toBe(95);
      
      expect(result.state).toBeDefined();
      expect(result.state.rank).toBe(10);
      expect(result.state.precision).toBe('exact');
      expect(result.state.confidence).toBe(95);
    });

    test('should handle composite patterns with different bucket classifications', () => {
      const compositePatterns = [
        {
          text: "#7 in National Rankings #1 in South Carolina High Schools",
          expectedNational: 7,
          expectedNationalPrecision: 'exact',
          expectedState: 1
        },
        {
          text: "#15,000 in National Rankings #25 in Texas High Schools", 
          expectedNational: 15000,
          expectedNationalPrecision: 'range', // 15000 is in Bucket 2
          expectedState: 25
        },
        {
          text: "#25,000 in National Rankings #100 in California High Schools",
          expectedNational: 25000,
          expectedNationalPrecision: 'estimated', // 25000 is beyond Bucket 2
          expectedState: 100
        }
      ];

      for (const pattern of compositePatterns) {
        const result = (extractor as any).parseAllRankingPatterns(pattern.text);
        
        expect(result.national?.rank).toBe(pattern.expectedNational);
        expect(result.national?.precision).toBe(pattern.expectedNationalPrecision);
        expect(result.state?.rank).toBe(pattern.expectedState);
        expect(result.state?.precision).toBe('exact');
      }
    });
  });

  describe('Pattern 4: Standard National Ranking', () => {
    test('should parse #6,979 in National Rankings correctly', () => {
      const text = "#6,979 in National Rankings";
      const result = (extractor as any).parseAllRankingPatterns(text);
      
      expect(result.national).toBeDefined();
      expect(result.national.rank).toBe(6979);
      expect(result.national.precision).toBe('exact'); // 6979 is in Bucket 1
      expect(result.national.confidence).toBe(95);
      expect(result.state).toBeUndefined();
    });

    test('should classify precision correctly based on rank ranges', () => {
      const nationalPatterns = [
        { text: "#500 in National Rankings", expected: 500, precision: 'exact' },     // Bucket 1
        { text: "#10,000 in National Rankings", expected: 10000, precision: 'exact' }, // Bucket 1
        { text: "#15,000 in National Rankings", expected: 15000, precision: 'range' }, // Bucket 2
        { text: "#25,000 in National Rankings", expected: 25000, precision: 'estimated' } // Bucket 3
      ];

      for (const pattern of nationalPatterns) {
        const result = (extractor as any).parseAllRankingPatterns(pattern.text);
        expect(result.national?.rank).toBe(pattern.expected);
        expect(result.national?.precision).toBe(pattern.precision);
        expect(result.state).toBeUndefined();
      }
    });

    test('should handle variations in national ranking format', () => {
      const variations = [
        "#6,979 in National Rankings",
        "#6,979 in national rankings", 
        "#6,979 in National Ranking",
        "Ranked #6,979 nationally"
      ];

      // Only the first 3 should match our specific pattern
      const expectedMatches = variations.slice(0, 3);
      
      for (const text of expectedMatches) {
        const result = (extractor as any).parseAllRankingPatterns(text);
        expect(result.national?.rank).toBe(6979);
        expect(result.national?.precision).toBe('exact');
      }
    });
  });

  describe('Pattern Precedence & Edge Cases', () => {
    test('should prioritize composite pattern over individual patterns', () => {
      const compositeText = "#1,102 in National Rankings #10 in South Carolina High Schools";
      const result = (extractor as any).parseAllRankingPatterns(compositeText);
      
      // Should extract BOTH national and state, not just one
      expect(result.national?.rank).toBe(1102);
      expect(result.state?.rank).toBe(10);
    });

    test('should handle malformed patterns gracefully', () => {
      const malformedPatterns = [
        "#abc in National Rankings",
        "#1,000 in Unknown State High Schools",
        "No ranking available",
        "",
        "#-500 in National Rankings"
      ];

      for (const text of malformedPatterns) {
        const result = (extractor as any).parseAllRankingPatterns(text);
        expect(result.national).toBeUndefined();
        expect(result.state).toBeUndefined();
      }
    });

    test('should respect rank boundaries', () => {
      const boundaryTests = [
        { text: "#1 in National Rankings", shouldMatch: true },
        { text: "#13426 in National Rankings", shouldMatch: true }, // Bucket 1 boundary
        { text: "#13427 in National Rankings", shouldMatch: true }, // Bucket 2 start  
        { text: "#17901 in National Rankings", shouldMatch: true }, // Bucket 2 end
        { text: "#50000 in National Rankings", shouldMatch: true }, // Bucket 3
        { text: "#50001 in National Rankings", shouldMatch: false }, // Beyond reasonable range
        { text: "#0 in National Rankings", shouldMatch: false }, // Invalid rank
      ];

      for (const test of boundaryTests) {
        const result = (extractor as any).parseAllRankingPatterns(test.text);
        if (test.shouldMatch) {
          expect(result.national).toBeDefined();
        } else {
          expect(result.national).toBeUndefined();
        }
      }
    });
  });

  describe('Integration with CSS Extraction Method', () => {
    test('should integrate enhanced parsing with full extraction pipeline', async () => {
      // Create mock HTML with our test patterns using actual US News selectors
      const mockHtml = `
        <html>
          <head><title>Test High School | US News Best High Schools</title></head>
          <body>
            <h1>Test High School</h1>
            <div id="rankings_section">
              #1,102 in National Rankings #10 in South Carolina High Schools
            </div>
          </body>
        </html>
      `;

      const mockContext = {
        bronzeRecord: {
          id: 1,
          school_slug: 'test-school',
          file_path: '/test/path.html',
          capture_timestamp: new Date().toISOString(),
          file_size: mockHtml.length,
          checksum_sha256: 'test',
          processing_status: 'pending' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        schoolSlug: 'test-school',
        sourceYear: 2024,
        fileContent: mockHtml,
        domDocument: null
      };

      const result = await extractor.extract(mockHtml, mockContext);
      
      expect(result.data.national_rank).toBe(1102);
      expect(result.data.national_rank_end).toBeNull();
      expect(result.data.national_rank_precision).toBe('exact');
      expect(result.data.state_rank).toBe(10);
      expect(result.data.state_rank_precision).toBe('exact');
      expect(result.confidence).toBeGreaterThan(80);
    });
  });
});