#!/usr/bin/env tsx

/**
 * Debug Unranked Search
 * 
 * Simple version to debug why no schools were processed
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

async function debugUnrankedSearch() {
  console.log('🔧 Debug Unranked Search');
  console.log('=' .repeat(40));
  
  const dataDir = '/Volumes/OWC Express 1M2/USNEWS_2024';
  
  if (!existsSync(dataDir)) {
    console.log('❌ External drive not available');
    return;
  }
  
  try {
    const allSchools = readdirSync(dataDir).filter(school => !school.startsWith('.'));
    console.log(`\n📊 Found ${allSchools.length} school directories`);
    
    // Test first 10 schools
    const testSchools = allSchools.slice(0, 10);
    console.log(`\n🔍 Testing first 10 schools for file access...`);
    
    for (let i = 0; i < testSchools.length; i++) {
      const schoolSlug = testSchools[i];
      console.log(`\n${i + 1}. Testing ${schoolSlug}:`);
      
      try {
        const schoolDir = join(dataDir, schoolSlug);
        
        if (!existsSync(schoolDir)) {
          console.log(`   ❌ Directory doesn't exist`);
          continue;
        }
        
        const files = readdirSync(schoolDir);
        console.log(`   📁 Files: ${files.join(', ')}`);
        
        const htmlFile = files.find(f => f.endsWith('.html'));
        if (!htmlFile) {
          console.log(`   ❌ No HTML file found`);
          continue;
        }
        
        const htmlPath = join(schoolDir, htmlFile);
        const html = readFileSync(htmlPath, 'utf-8');
        console.log(`   📄 HTML size: ${html.length.toLocaleString()} chars`);
        
        // Quick check for unranked terms
        const unrankedTerms = ['unranked', 'not ranked', 'private school', 'insufficient data'];
        const foundTerms = unrankedTerms.filter(term => 
          html.toLowerCase().includes(term.toLowerCase())
        );
        
        if (foundTerms.length > 0) {
          console.log(`   🎯 Found terms: ${foundTerms.join(', ')}`);
          
          // Get school name from title
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = titleMatch ? titleMatch[1] : 'No title';
          console.log(`   📋 Title: "${title}"`);
          
          // Show context for first found term
          const firstTerm = foundTerms[0];
          const index = html.toLowerCase().indexOf(firstTerm.toLowerCase());
          if (index !== -1) {
            const start = Math.max(0, index - 100);
            const end = Math.min(html.length, index + firstTerm.length + 100);
            const context = html.substring(start, end).replace(/\s+/g, ' ').trim();
            console.log(`   📝 Context: "...${context}..."`);
          }
        } else {
          console.log(`   ✅ No unranked terms found`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error}`);
      }
    }
    
    // Also try looking for schools with specific patterns in their slugs
    console.log(`\n🔍 Looking for schools with 'private', 'charter', or 'academy' in slug...`);
    const specialSchools = allSchools.filter(slug => 
      slug.includes('private') || 
      slug.includes('charter') || 
      slug.includes('academy') ||
      slug.includes('christian') ||
      slug.includes('catholic')
    ).slice(0, 5);
    
    console.log(`Found ${specialSchools.length} potential candidates:`);
    specialSchools.forEach(slug => console.log(`   - ${slug}`));
    
    if (specialSchools.length > 0) {
      console.log(`\n🔍 Testing first special school: ${specialSchools[0]}`);
      
      try {
        const schoolDir = join(dataDir, specialSchools[0]);
        const files = readdirSync(schoolDir);
        const htmlFile = files.find(f => f.endsWith('.html'));
        
        if (htmlFile) {
          const htmlPath = join(schoolDir, htmlFile);
          const html = readFileSync(htmlPath, 'utf-8');
          
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          console.log(`   Title: "${titleMatch ? titleMatch[1] : 'No title'}"`);
          
          const unrankedTerms = ['unranked', 'not ranked', 'private school'];
          const foundTerms = unrankedTerms.filter(term => 
            html.toLowerCase().includes(term.toLowerCase())
          );
          
          if (foundTerms.length > 0) {
            console.log(`   🎯 FOUND UNRANKED INDICATORS: ${foundTerms.join(', ')}`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Error testing special school: ${error}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugUnrankedSearch().catch(console.error);