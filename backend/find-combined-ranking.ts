#!/usr/bin/env tsx

/**
 * Find Combined Ranking Element
 * 
 * Search for the specific element containing "#7in National Rankings#1in South Carolina High Schools"
 */

import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

function findCombinedRankingElement() {
  console.log('🎯 Finding Combined Ranking Element');
  console.log('=' .repeat(50));
  
  const academicMagnetPath = '/Volumes/OWC Express 1M2/USNEWS_2024/academic-magnet-high-school-17566/docker_curl_20250818_181230.html';
  const html = readFileSync(academicMagnetPath, 'utf-8');
  
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Look for elements containing the combined ranking pattern
  const combinedRankingPattern = /#7in\s*National\s*Rankings.*?#1in.*?South\s*Carolina/i;
  
  const elementsWithCombinedRanking = Array.from(document.querySelectorAll('*')).filter(el => {
    const text = el.textContent || '';
    return combinedRankingPattern.test(text);
  });
  
  console.log(`\n🏆 Elements with combined ranking pattern:`);
  console.log(`Found: ${elementsWithCombinedRanking.length} elements`);
  
  elementsWithCombinedRanking.forEach((element, i) => {
    const tag = element.tagName.toLowerCase();
    const classes = element.className;
    const id = element.id;
    const text = element.textContent?.trim();
    
    console.log(`\n[${i+1}] <${tag} class="${classes}" id="${id}">`);
    console.log(`Children: ${element.children.length}`);
    console.log(`Text: "${text?.substring(0, 300)}..."`);
    
    // Look for what CSS selectors might target this element
    const possibleSelectors = [];
    
    if (classes) {
      const classNames = classes.split(' ').filter(c => c.length > 0);
      classNames.forEach(className => {
        possibleSelectors.push(`.${className}`);
      });
    }
    
    if (id) {
      possibleSelectors.push(`#${id}`);
    }
    
    console.log(`Possible selectors: ${possibleSelectors.slice(0, 5).join(', ')}`);
    
    // Test parsing the combined string
    if (text) {
      // Extract all ranking patterns
      const rankingMatches = [...text.matchAll(/#(\d+)(?:in\s*([^#]+))?/gi)];
      
      console.log(`\nParsed rankings:`);
      rankingMatches.forEach((match, j) => {
        const rank = match[1];
        const context = match[2]?.trim() || 'No context';
        const isNational = context.toLowerCase().includes('national');
        const isState = context.toLowerCase().includes('high school') && !context.toLowerCase().includes('national');
        
        console.log(`  [${j+1}] #${rank} - "${context}" ${isNational ? '(NATIONAL)' : isState ? '(STATE)' : ''}`);
      });
    }
  });
  
  // If we found elements, let's find the minimal/leaf element containing this text
  if (elementsWithCombinedRanking.length > 0) {
    const leafElement = elementsWithCombinedRanking.reduce((smallest, current) => {
      const smallestChildCount = smallest.children.length;
      const currentChildCount = current.children.length;
      
      // Prefer the element with fewer children (more specific/leaf-like)
      if (currentChildCount < smallestChildCount) {
        return current;
      }
      return smallest;
    });
    
    console.log(`\n🎯 Most specific element:`)
    console.log(`Tag: ${leafElement.tagName}`);
    console.log(`Class: "${leafElement.className}"`);
    console.log(`ID: "${leafElement.id}"`);
    console.log(`Children: ${leafElement.children.length}`);
    console.log(`Text: "${leafElement.textContent?.substring(0, 200)}..."`);
    
    // Generate the best CSS selector for this element
    const classes = leafElement.className.split(' ').filter(c => c.length > 0);
    if (classes.length > 0) {
      const bestSelector = `.${classes[0]}`;
      console.log(`\n✅ Recommended CSS Selector: ${bestSelector}`);
      
      // Test if this selector would work
      const testElement = document.querySelector(bestSelector);
      if (testElement) {
        console.log(`Selector test: ✅ Found element`);
        console.log(`Element text: "${testElement.textContent?.substring(0, 100)}..."`);
      } else {
        console.log(`Selector test: ❌ No element found`);
      }
    }
  } else {
    console.log('\n❌ No elements found with combined ranking pattern');
    
    // Let's search for simpler patterns
    console.log('\n🔍 Searching for simpler patterns...');
    
    const simplePatterns = [
      { name: 'National Rankings', pattern: /National\s*Rankings/i },
      { name: 'South Carolina High Schools', pattern: /South\s*Carolina.*?High\s*Schools/i },
      { name: '#7 followed by text', pattern: /#7\s*\w+/i }
    ];
    
    simplePatterns.forEach(({ name, pattern }) => {
      const elements = Array.from(document.querySelectorAll('*')).filter(el => 
        pattern.test(el.textContent || '')
      );
      console.log(`${name}: ${elements.length} elements found`);
    });
  }
}

findCombinedRankingElement();