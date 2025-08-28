#!/usr/bin/env tsx

/**
 * Debug Academic Magnet Unranked Detection
 * 
 * Figure out why Academic Magnet is being detected as unranked when it should be ranked
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { JSDOM } from 'jsdom';

function debugAcademicMagnetUnranked() {
  console.log('🔧 Debug: Academic Magnet Unranked Detection');
  console.log('=' .repeat(60));
  
  const schoolPath = '/Volumes/OWC Express 1M2/USNEWS_2024/academic-magnet-high-school-17566';
  
  try {
    const files = readdirSync(schoolPath);
    const htmlFile = files.find(f => f.endsWith('.html'));
    
    if (!htmlFile) {
      console.log('❌ No HTML file found');
      return;
    }
    
    const htmlPath = join(schoolPath, htmlFile);
    const html = readFileSync(htmlPath, 'utf-8');
    
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    console.log('🏫 School: Academic Magnet High School');
    console.log(`📄 HTML size: ${html.length.toLocaleString()} characters`);
    
    // Test our unranked detection selectors
    console.log('\n🔍 Testing Unranked Detection Selectors:');
    console.log('========================================');
    
    const unrankedSelectors = [
      'p.lg-t5.t2 strong',
      '.ilawbc',
      '[class*="unranked"]',
      '[class*="Unranked"]'
    ];
    
    unrankedSelectors.forEach((selector, i) => {
      console.log(`\n${i + 1}. Selector: ${selector}`);
      
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`   Found: ${elements.length} elements`);
        
        Array.from(elements).slice(0, 3).forEach((element, j) => {
          const text = element.textContent?.trim() || '';
          console.log(`   [${j + 1}] Text: "${text}"`);
          console.log(`   [${j + 1}] Matches "unranked": ${text.toLowerCase() === 'unranked'}`);
          console.log(`   [${j + 1}] Contains "unranked school": ${text.toLowerCase().includes('unranked school')}`);
        });
      } catch (error) {
        console.log(`   ❌ Error: ${error}`);
      }
    });
    
    // Check for text-based patterns
    console.log('\n🔍 Testing Text-Based Patterns:');
    console.log('===============================');
    
    const bodyText = document.body?.textContent?.toLowerCase() || '';
    console.log(`Body text length: ${bodyText.length.toLocaleString()} characters`);
    
    const unrankedPatterns = [
      { pattern: /unranked school/i, name: '"unranked school"' },
      { pattern: /<strong[^>]*>unranked<\/strong>/i, name: '"<strong>unranked</strong>"' },
      { pattern: /ranking.*not.*available/i, name: '"ranking not available"' },
      { pattern: /insufficient.*data.*ranking/i, name: '"insufficient data ranking"' }
    ];
    
    unrankedPatterns.forEach(({ pattern, name }, i) => {
      const matches = html.match(pattern);
      console.log(`${i + 1}. ${name}: ${matches ? 'FOUND' : 'NOT FOUND'}`);
      if (matches) {
        console.log(`   Match: "${matches[0]}"`);
        
        // Find context
        const index = html.indexOf(matches[0]);
        if (index !== -1) {
          const start = Math.max(0, index - 100);
          const end = Math.min(html.length, index + matches[0].length + 100);
          const context = html.substring(start, end).replace(/\s+/g, ' ').trim();
          console.log(`   Context: "...${context}..."`);
        }
      }
    });
    
    // Look for actual ranking information
    console.log('\n📊 Looking for Ranking Information:');
    console.log('===================================');
    
    const rankingPatterns = [
      { pattern: /#7/g, name: '"#7"' },
      { pattern: /national.*rank/gi, name: '"national rank"' },
      { pattern: /ranked.*#7/gi, name: '"ranked #7"' }
    ];
    
    rankingPatterns.forEach(({ pattern, name }) => {
      const matches = [...html.matchAll(pattern)];
      console.log(`${name}: ${matches.length} matches found`);
      
      matches.slice(0, 3).forEach((match, i) => {
        if (match.index) {
          const start = Math.max(0, match.index - 50);
          const end = Math.min(html.length, match.index + match[0].length + 50);
          const context = html.substring(start, end).replace(/\s+/g, ' ').trim();
          console.log(`   [${i + 1}] "${match[0]}" in context: "...${context}..."`);
        }
      });
    });
    
    // Check what the issue might be
    console.log('\n🎯 DIAGNOSIS:');
    console.log('=============');
    
    // Look for the exact patterns that might be causing false positive
    const strongUnranked = html.match(/<strong[^>]*>unranked<\/strong>/i);
    const unrankedSchoolPattern = bodyText.includes('unranked school');
    
    if (strongUnranked) {
      console.log('❌ FOUND: <strong>unranked</strong> pattern');
      console.log(`   This is causing false positive detection`);
    }
    
    if (unrankedSchoolPattern) {
      console.log('❌ FOUND: "unranked school" in body text');
      console.log(`   This is causing false positive detection`);  
    }
    
    if (!strongUnranked && !unrankedSchoolPattern) {
      console.log('✅ No obvious false positive patterns found');
      console.log('   Need to investigate selector-based detection');
    }
    
    // Test the specific selector that might be triggering
    const strongElements = document.querySelectorAll('strong');
    console.log(`\nFound ${strongElements.length} <strong> elements:`);
    
    Array.from(strongElements).slice(0, 5).forEach((element, i) => {
      const text = element.textContent?.trim() || '';
      console.log(`   ${i + 1}. "${text}"`);
      if (text.toLowerCase() === 'unranked') {
        console.log(`       ❌ This element is triggering false positive!`);
        
        // Get more context about this element
        const parent = element.parentElement;
        console.log(`       Parent: <${parent?.tagName.toLowerCase()} class="${parent?.className}">`);
        console.log(`       Parent text: "${parent?.textContent?.substring(0, 100)}..."`);
      }
    });
    
    dom.window.close();
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugAcademicMagnetUnranked();