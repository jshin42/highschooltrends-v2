/**
 * CSS Extraction Method Unit Tests
 * 
 * Tests JSON-LD structured data extraction and CSS fallback mechanisms
 * with comprehensive field validation for production readiness.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CSSExtractionMethod } from '../css-extraction-method';
import { ExtractionContext } from '../types';

describe('CSSExtractionMethod', () => {
  let extractor: CSSExtractionMethod;
  let mockContext: ExtractionContext;

  beforeEach(() => {
    extractor = new CSSExtractionMethod();
    mockContext = {
      bronzeRecord: {
        id: 123,
        school_slug: 'test-high-school',
        file_path: '/test/path.html',
        capture_timestamp: '2024-01-01T00:00:00Z',
        file_size: 50000,
        checksum_sha256: 'abc123',
        processing_status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      schoolSlug: 'test-high-school',
      sourceYear: 2024,
      fileContent: '',
      domDocument: null
    };
  });

  describe('JSON-LD Structured Data Extraction', () => {
    test('should extract all gold standard fields from JSON-LD', async () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@context": "http://schema.org",
              "@type": "HighSchool",
              "name": "Test High School",
              "description": "Test High School is ranked 25th within California. Students have the opportunity to take Advanced Placement® coursework and exams. The AP® participation rate at Test High School is 78%. The total minority enrollment is 65%, and 85% of students are economically disadvantaged. Test High School has a graduation rate of 92%.",
              "telephone": "(555) 123-4567",
              "location": {
                "@type": "Place",
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": "San Francisco",
                  "addressRegion": "CA",
                  "postalCode": "94102",
                  "streetAddress": "123 Education St",
                  "addressCountry": "USA"
                }
              }
            }
            </script>
          </head>
          <body></body>
        </html>
      `;

      const result = await extractor.extract(html, mockContext);

      // Core identification fields
      expect(result.data.school_name).toBe('Test High School');
      expect(result.data.phone).toBe('(555) 123-4567');
      
      // Location fields
      expect(result.data.address_street).toBe('123 Education St');
      expect(result.data.address_city).toBe('San Francisco');
      expect(result.data.address_state).toBe('CA');
      expect(result.data.address_zip).toBe('94102');
      
      // Ranking fields
      expect(result.data.state_rank).toBe(25);
      
      // Academic performance fields
      expect(result.data.ap_participation_rate).toBe(78);
      
      // Demographics fields
      expect(result.data.white_pct).toBe(35); // 100 - 65 minority
      expect(result.data.economically_disadvantaged_pct).toBe(85);
      
      // High confidence for JSON-LD extraction
      expect(result.confidence).toBeGreaterThan(85);
      expect(result.fieldConfidences.school_name).toBe(95);
      expect(result.fieldConfidences.location).toBe(90);
    });

    test('should handle missing JSON-LD gracefully', async () => {
      const html = `
        <html>
          <body>
            <h1 data-testid="school-name">Lincoln High School</h1>
          </body>
        </html>
      `;

      const result = await extractor.extract(html, mockContext);

      expect(result.data.school_name).toBe('Lincoln High School');
      expect(result.fieldConfidences.school_name).toBe(95); // High confidence for data-testid
      expect(result.confidence).toBeGreaterThan(90);
      expect(result.errors).toHaveLength(0);
    });

    test('should extract school name from h1 selector', async () => {
      const html = `
        <html>
          <body>
            <div class="school-profile-header">
              <h1>Washington High School</h1>
            </div>
          </body>
        </html>
      `;

      const result = await extractor.extract(html, mockContext);

      expect(result.data.school_name).toBe('Washington High School');
      expect(result.fieldConfidences.school_name).toBe(90); // Good confidence for h1
      expect(result.confidence).toBeGreaterThan(80);
    });

    test('should fallback to title extraction and clean format', async () => {
      const html = `
        <html>
          <head>
            <title>Roosevelt High School | US News Best High Schools</title>
          </head>
          <body></body>
        </html>
      `;

      const result = await extractor.extract(html, mockContext);

      expect(result.data.school_name).toBe('Roosevelt High School');
      expect(result.fieldConfidences.school_name).toBe(70); // Lower confidence for title fallback
    });

    test('should reject invalid school names', async () => {
      const html = `
        <html>
          <body>
            <h1 data-testid="school-name">Hi</h1>
          </body>
        </html>
      `;

      const result = await extractor.extract(html, mockContext);

      expect(result.data.school_name).toBeUndefined();
      expect(result.fieldConfidences.school_name).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field_name).toBe('school_name');
    });
  });

  describe('Enrollment Extraction', () => {
    test('should extract enrollment from data-testid', async () => {
      const html = `
        <html>
          <body>
            <div data-testid="enrollment-number">1,245</div>
          </body>
        </html>
      `;

      const result = await extractor.extract(html, mockContext);

      expect(result.data.enrollment).toBe(1245);
      expect(result.fieldConfidences.enrollment_data).toBe(90);
    });

    test('should handle enrollment with text', async () => {
      const html = `
        <html>
          <body>
            <div class="enrollment-stats">
              <span class="number">Total Students: 856</span>
            </div>
          </body>
        </html>
      `;

      const result = await extractor.extract(html, mockContext);

      expect(result.data.enrollment).toBe(856);
    });

    test('should reject invalid enrollment numbers', async () => {
      const html = `
        <html>
          <body>
            <div data-testid="enrollment-number">50000</div>
          </body>
        </html>
      `;

      const result = await extractor.extract(html, mockContext);

      expect(result.data.enrollment).toBeUndefined();
      // Enrollment validation should reject unreasonable values (>10000) by not extracting them
      expect(result.fieldConfidences.enrollment_data).toBe(0);
    });
  });

  describe('Ranking Extraction', () => {
    test('should extract national ranking', async () => {
      const html = `
        <html>
          <body>
            <div data-testid="national-ranking">342</div>
          </body>
        </html>
      `;

      const result = await extractor.extract(html, mockContext);

      expect(result.data.national_rank).toBe(342);
      expect(result.fieldConfidences.rankings).toBe(95);
    });

    test('should extract state ranking', async () => {
      const html = `
        <html>
          <body>
            <div data-testid="state-ranking">28</div>
          </body>
        </html>
      `;

      const result = await extractor.extract(html, mockContext);

      expect(result.data.state_rank).toBe(28);
      expect(result.fieldConfidences.rankings).toBe(95);
    });

    test('should handle both national and state rankings', async () => {
      const html = `
        <html>
          <body>
            <div data-testid="national-ranking">1,234</div>
            <div data-testid="state-ranking">45</div>
          </body>
        </html>
      `;

      const result = await extractor.extract(html, mockContext);

      expect(result.data.national_rank).toBe(1234);
      expect(result.data.state_rank).toBe(45);
      expect(result.fieldConfidences.rankings).toBe(95); // Max of both confidences
    });
  });

  describe('Location Extraction', () => {
    test('should extract city and state', async () => {
      const html = `
        <html>
          <body>
            <div data-testid="school-city">Springfield</div>
            <div data-testid="school-state">IL</div>
          </body>
        </html>
      `;

      const result = await extractor.extract(html, mockContext);

      expect(result.data.address_city).toBe('Springfield');
      expect(result.data.address_state).toBe('IL');
      expect(result.fieldConfidences.location).toBe(90); // Max confidence
    });

    test('should validate state format', async () => {
      const html = `
        <html>
          <body>
            <div data-testid="school-state">Illinois</div>
          </body>
        </html>
      `;

      const result = await extractor.extract(html, mockContext);

      expect(result.data.address_state).toBe('Illinois');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed HTML gracefully', async () => {
      const html = '<html><body><div>Unclosed div</body>';

      const result = await extractor.extract(html, mockContext);

      // Should not throw, should return basic structure
      expect(result.data.bronze_record_id).toBe(123);
      expect(result.data.school_slug).toBe('test-high-school');
      expect(result.data.source_year).toBe(2024);
    });

    test('should handle empty HTML', async () => {
      const html = '';

      const result = await extractor.extract(html, mockContext);

      expect(result.confidence).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle network-like HTML without school data', async () => {
      const html = `
        <html>
          <body>
            <h1>Page Not Found</h1>
            <p>The school you're looking for doesn't exist.</p>
          </body>
        </html>
      `;

      const result = await extractor.extract(html, mockContext);

      expect(result.data.school_name).toBeUndefined();
      expect(result.confidence).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Confidence Scoring', () => {
    test('should calculate weighted confidence correctly', async () => {
      const html = `
        <html>
          <head>
            <title>Complete High School | US News</title>
          </head>
          <body>
            <div data-testid="enrollment-number">1,200</div>
            <div data-testid="national-ranking">150</div>
            <div data-testid="school-city">Chicago</div>
            <div data-testid="school-state">IL</div>
          </body>
        </html>
      `;

      const result = await extractor.extract(html, mockContext);

      // Should have good overall confidence with multiple successful extractions
      expect(result.confidence).toBeGreaterThan(80);
      expect(result.fieldConfidences.school_name).toBe(70); // Title fallback
      expect(result.fieldConfidences.enrollment_data).toBe(90); // Direct extraction
      expect(result.fieldConfidences.rankings).toBe(95); // High confidence ranking
      expect(result.fieldConfidences.location).toBe(90); // Location data
    });

    test('should have low confidence with minimal data', async () => {
      const html = `
        <html>
          <body>
            <p>Some random content</p>
          </body>
        </html>
      `;

      const result = await extractor.extract(html, mockContext);

      expect(result.confidence).toBeLessThan(20);
      expect(Object.values(result.fieldConfidences).every(c => c === 0)).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should process large HTML efficiently', async () => {
      // Create a large HTML document
      const largeContent = '<div>'.repeat(1000) + 'Content' + '</div>'.repeat(1000);
      const html = `
        <html>
          <body>
            <h1 data-testid="school-name">Performance Test School</h1>
            ${largeContent}
          </body>
        </html>
      `;

      const startTime = Date.now();
      const result = await extractor.extract(html, mockContext);
      const processingTime = Date.now() - startTime;

      expect(result.data.school_name).toBe('Performance Test School');
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});