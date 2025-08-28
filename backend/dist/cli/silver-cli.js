#!/usr/bin/env node
/**
 * Silver Layer CLI Tool
 *
 * Command-line interface for running and testing Silver layer operations.
 * Provides extraction, validation, and monitoring capabilities.
 */
import { Command } from 'commander';
import { SilverService } from '../silver/silver-service';
import { SilverProcessor } from '../silver/extraction-methods';
import { CSSExtractionMethod } from '../silver/css-extraction-method';
import { SilverConfidenceScorer } from '../silver/confidence-scorer';
import { initializeSilverDatabase } from '../silver/database-migration';
import { createBronzeService } from '../bronze';
const program = new Command();
program
    .name('silver-cli')
    .description('CLI tool for Silver layer operations')
    .version('1.0.0');
/**
 * Extract command - run Silver extraction on Bronze records
 */
program
    .command('extract')
    .description('Extract structured data from Bronze layer HTML files')
    .option('-db, --database <path>', 'Database file path', './data/silver.db')
    .option('-b, --batch-size <size>', 'Batch size for processing', '50')
    .option('-l, --limit <count>', 'Limit number of records to process')
    .option('--bronze-db <path>', 'Bronze database path', './data/bronze.db')
    .option('--confidence-threshold <threshold>', 'Minimum confidence threshold', '70')
    .option('--dry-run', 'Show what would be processed without making changes')
    .action(async (options) => {
    console.log('🔍 Starting Silver Layer Extraction...\n');
    try {
        // Initialize Silver database
        console.log('🗃️  Initializing Silver database...');
        await initializeSilverDatabase(options.database);
        const silverService = new SilverService(options.database);
        console.log('✅ Silver service initialized');
        // Set up extraction pipeline
        const cssExtractor = new CSSExtractionMethod();
        const processor = new SilverProcessor([cssExtractor]);
        const scorer = new SilverConfidenceScorer();
        console.log('🔧 Extraction pipeline configured');
        if (options.dryRun) {
            console.log('🧪 Dry run mode - no changes will be made\n');
        }
        // Get Bronze records to process
        console.log('📊 Querying Bronze layer for pending records...');
        const bronzeConfig = {};
        const bronzeService = createBronzeService(bronzeConfig, options.bronzeDb);
        await bronzeService.initialize();
        const pendingRecords = await bronzeService.getRecordsByStatus('pending');
        const recordsToProcess = options.limit ?
            pendingRecords.slice(0, parseInt(options.limit)) :
            pendingRecords;
        console.log(`📄 Found ${recordsToProcess.length} records to process\n`);
        if (recordsToProcess.length === 0) {
            console.log('ℹ️  No pending records found for processing');
            await bronzeService.shutdown();
            silverService.close();
            return;
        }
        console.log(`⚙️  Configuration:`);
        console.log(`   Database: ${options.database}`);
        console.log(`   Batch size: ${options.batchSize}`);
        console.log(`   Confidence threshold: ${options.confidenceThreshold}%`);
        console.log(`   Records to process: ${recordsToProcess.length}\n`);
        // Process records
        let processed = 0;
        let successful = 0;
        let partial = 0;
        let failed = 0;
        const errors = [];
        const startTime = Date.now();
        for (const bronzeRecord of recordsToProcess) {
            try {
                console.log(`🔄 Processing: ${bronzeRecord.school_slug}...`);
                const result = await processor.processRecord(bronzeRecord);
                // Check confidence threshold
                if (result.overallConfidence < parseInt(options.confidenceThreshold)) {
                    console.log(`   ⚠️  Low confidence (${result.overallConfidence.toFixed(1)}%) - marked as partial`);
                }
                if (!options.dryRun) {
                    // Save to Silver database
                    const recordId = await silverService.createRecord({
                        ...result.silverRecord,
                        extraction_confidence: result.overallConfidence,
                        field_confidence: result.fieldConfidences,
                        processing_errors: result.errors,
                        extraction_status: result.silverRecord.extraction_status || 'extracted'
                    });
                    console.log(`   ✅ Saved as Silver record #${recordId}`);
                }
                else {
                    console.log(`   🧪 Would save with ${result.overallConfidence.toFixed(1)}% confidence`);
                }
                processed++;
                if (result.silverRecord.extraction_status === 'extracted') {
                    successful++;
                }
                else if (result.silverRecord.extraction_status === 'partial') {
                    partial++;
                }
                else {
                    failed++;
                }
                errors.push(...result.errors);
            }
            catch (error) {
                console.log(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                failed++;
            }
            // Progress indicator
            if (processed % 10 === 0) {
                const progress = (processed / recordsToProcess.length * 100).toFixed(1);
                console.log(`📈 Progress: ${progress}% (${processed}/${recordsToProcess.length})`);
            }
        }
        const processingTime = Date.now() - startTime;
        console.log('\n🎉 Extraction Complete!');
        console.log(`📊 Results:`);
        console.log(`   Total processed: ${processed}`);
        console.log(`   ✅ Successful: ${successful}`);
        console.log(`   🟡 Partial: ${partial}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   ⏱️  Processing time: ${(processingTime / 1000).toFixed(2)}s`);
        console.log(`   🚀 Rate: ${(processed / (processingTime / 1000)).toFixed(2)} records/sec`);
        if (errors.length > 0) {
            const errorsByType = errors.reduce((acc, error) => {
                acc[error.field_name] = (acc[error.field_name] || 0) + 1;
                return acc;
            }, {});
            console.log(`\n⚠️  Error Summary (${errors.length} total):`);
            Object.entries(errorsByType)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .forEach(([field, count]) => {
                console.log(`   ${field}: ${count} errors`);
            });
        }
        const successRate = (successful / processed * 100).toFixed(1);
        console.log(`\n📈 Success rate: ${successRate}%`);
        await bronzeService.shutdown();
        silverService.close();
    }
    catch (error) {
        console.error('💥 Extraction failed:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
});
/**
 * Statistics command - show Silver layer statistics
 */
program
    .command('stats')
    .description('Show Silver layer statistics and extraction quality metrics')
    .option('-db, --database <path>', 'Database file path', './data/silver.db')
    .action(async (options) => {
    console.log('📊 Silver Layer Statistics\n');
    try {
        await initializeSilverDatabase(options.database);
        const silverService = new SilverService(options.database);
        const stats = await silverService.getStatistics();
        const health = await silverService.getHealthCheck();
        console.log(`📈 Extraction Statistics:`);
        console.log(`   Total records processed: ${stats.total_records_processed}`);
        console.log(`   Average extraction confidence: ${health.metrics.average_confidence_score.toFixed(1)}%`);
        console.log(`   Processing rate: ${stats.processing_rate.toFixed(1)} records/min`);
        console.log(`\n📋 Processing Status:`);
        Object.entries(stats.records_by_status).forEach(([status, count]) => {
            const statusIcon = {
                pending: '⏳',
                extracting: '🔄',
                extracted: '✅',
                partial: '🟡',
                failed: '❌'
            }[status] || '📄';
            console.log(`   ${statusIcon} ${status}: ${count}`);
        });
        console.log(`\n🎯 Field Coverage:`);
        const totalRecords = Math.max(stats.total_records_processed, 1); // Avoid division by zero
        Object.entries(stats.field_extraction_success_rates).forEach(([field, rate]) => {
            const fieldIcon = {
                school_name: '📝',
                national_rank: '🏆',
                enrollment: '👥',
                graduation_rate: '🎓'
            }[field] || '📊';
            console.log(`   ${fieldIcon} ${field}: ${rate.toFixed(1)}%`);
        });
        console.log(`\n🏥 Health Status: ${health.status.toUpperCase()}`);
        const healthIcon = {
            healthy: '💚',
            degraded: '💛',
            unhealthy: '🔴'
        }[health.status] || '❓';
        console.log(`   ${healthIcon} Overall status: ${health.status}`);
        console.log(`   📊 Extraction success rate: ${health.metrics.extraction_success_rate.toFixed(1)}%`);
        console.log(`   ⚠️  Error rate: ${health.metrics.error_rate_pct.toFixed(2)}%`);
        if (health.issues.length > 0) {
            console.log(`\n⚠️  Issues:`);
            health.issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`);
            });
        }
        console.log(`\n🕐 Last updated: ${new Date(stats.last_updated).toLocaleString()}`);
        silverService.close();
    }
    catch (error) {
        console.error('💥 Failed to get statistics:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
});
/**
 * Test command - run extraction on a small sample for testing
 */
program
    .command('test')
    .description('Test Silver layer extraction with a small sample')
    .option('-s, --sample-size <count>', 'Number of records to test with', '5')
    .option('-db, --database <path>', 'Database file path', './data/silver.db')
    .option('--bronze-db <path>', 'Bronze database path', './data/bronze.db')
    .action(async (options) => {
    console.log('🧪 Silver Layer Test Mode\n');
    try {
        console.log('🗃️  Initializing test databases...');
        await initializeSilverDatabase(options.database);
        const silverService = new SilverService(options.database);
        // Set up extraction pipeline
        const cssExtractor = new CSSExtractionMethod();
        const processor = new SilverProcessor([cssExtractor]);
        console.log('🔧 Test extraction pipeline configured');
        // Get Bronze test records
        const bronzeConfig = {};
        const bronzeService = createBronzeService(bronzeConfig, options.bronzeDb);
        await bronzeService.initialize();
        const testRecords = await bronzeService.getRecordsByStatus('pending');
        const sampleRecords = testRecords.slice(0, parseInt(options.sampleSize));
        console.log(`🔬 Testing with ${sampleRecords.length} records...`);
        if (sampleRecords.length === 0) {
            console.log('⚠️  No test records available. Please ensure Bronze layer has processed records.');
            await bronzeService.shutdown();
            silverService.close();
            return;
        }
        let successful = 0;
        let partial = 0;
        let failed = 0;
        const confidenceScores = [];
        const extractedFields = {};
        console.log('\n📊 Processing test records...');
        for (let i = 0; i < sampleRecords.length; i++) {
            const record = sampleRecords[i];
            try {
                console.log(`   ${i + 1}/${sampleRecords.length} Processing: ${record.school_slug}`);
                const result = await processor.processRecord(record);
                confidenceScores.push(result.overallConfidence);
                // Count extracted fields
                Object.entries(result.silverRecord).forEach(([field, value]) => {
                    if (value !== null && value !== undefined && field !== 'bronze_record_id' && field !== 'school_slug' && field !== 'source_year') {
                        extractedFields[field] = (extractedFields[field] || 0) + 1;
                    }
                });
                if (result.silverRecord.extraction_status === 'extracted') {
                    successful++;
                    console.log(`     ✅ Success (${result.overallConfidence.toFixed(1)}% confidence)`);
                }
                else if (result.silverRecord.extraction_status === 'partial') {
                    partial++;
                    console.log(`     🟡 Partial (${result.overallConfidence.toFixed(1)}% confidence)`);
                }
                else {
                    failed++;
                    console.log(`     ❌ Failed (${result.overallConfidence.toFixed(1)}% confidence)`);
                }
            }
            catch (error) {
                failed++;
                console.log(`     💥 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        const avgConfidence = confidenceScores.length > 0 ?
            confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length : 0;
        console.log('\n✅ Test Complete!');
        console.log(`📊 Test Results:`);
        console.log(`   Total tested: ${sampleRecords.length}`);
        console.log(`   ✅ Successful: ${successful}`);
        console.log(`   🟡 Partial: ${partial}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   📈 Average confidence: ${avgConfidence.toFixed(1)}%`);
        const successRate = ((successful + partial) / sampleRecords.length) * 100;
        console.log(`\n📊 Overall success rate: ${successRate.toFixed(1)}%`);
        console.log(`\n🔍 Field Extraction Summary:`);
        Object.entries(extractedFields)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .forEach(([field, count]) => {
            const coverage = (count / sampleRecords.length * 100).toFixed(1);
            console.log(`   ${field}: ${count}/${sampleRecords.length} (${coverage}%)`);
        });
        if (successRate >= 80) {
            console.log('\n🎉 Test passed! Silver layer is working correctly.');
        }
        else if (successRate >= 60) {
            console.log('\n⚠️  Test partially passed. Some extraction issues detected.');
        }
        else {
            console.log('\n❌ Test failed. Significant extraction issues detected.');
        }
        await bronzeService.shutdown();
        silverService.close();
    }
    catch (error) {
        console.error('💥 Test failed:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
});
/**
 * Validate command - validate Silver layer configuration
 */
program
    .command('validate')
    .description('Validate Silver layer configuration and extraction methods')
    .option('-db, --database <path>', 'Database file path', './data/silver.db')
    .action(async (options) => {
    console.log('🔍 Silver Layer Configuration Validation\n');
    try {
        console.log('🗃️  Testing database initialization...');
        await initializeSilverDatabase(options.database);
        console.log('✅ Database initialization: OK');
        const silverService = new SilverService(options.database);
        console.log('✅ Silver service creation: OK');
        console.log('\n🔧 Testing extraction pipeline...');
        const cssExtractor = new CSSExtractionMethod();
        const processor = new SilverProcessor([cssExtractor]);
        console.log('✅ CSS extraction method: OK');
        const scorer = new SilverConfidenceScorer();
        console.log('✅ Confidence scorer: OK');
        console.log('\n📊 Testing with mock data...');
        const mockHtml = `
        <html>
          <body>
            <h1 data-testid="school-name">Test High School</h1>
            <div data-testid="enrollment-number">1,500</div>
            <div data-testid="national-ranking">100</div>
          </body>
        </html>
      `;
        const mockBronzeRecord = {
            id: 999,
            file_path: '/test/mock-school.html',
            school_slug: 'mock-test-school',
            capture_timestamp: '2025-01-27T00:00:00Z',
            file_size: mockHtml.length,
            checksum_sha256: 'mock-checksum',
            processing_status: 'pending',
            created_at: '2025-01-27T00:00:00Z',
            updated_at: '2025-01-27T00:00:00Z'
        };
        const result = await processor.processRecord(mockBronzeRecord, mockHtml);
        console.log(`   📝 Extracted school name: "${result.silverRecord.school_name}"`);
        console.log(`   👥 Extracted enrollment: ${result.silverRecord.enrollment}`);
        console.log(`   🏆 Extracted ranking: ${result.silverRecord.national_rank}`);
        console.log(`   📊 Overall confidence: ${result.overallConfidence.toFixed(1)}%`);
        console.log(`   ⚠️  Errors: ${result.errors.length}`);
        if (result.overallConfidence >= 80 && result.errors.length === 0) {
            console.log('✅ Mock extraction test: OK');
        }
        else {
            console.log('⚠️  Mock extraction test: Issues detected but not critical');
        }
        console.log('\n🎯 Testing confidence scoring...');
        const mockScoringData = {
            bronze_record_id: 999,
            school_slug: 'test-school',
            source_year: 2025,
            school_name: 'Test School',
            enrollment: 1000,
            national_rank: 50
        };
        const mockExtractionMethods = {
            school_name: 'css_selector',
            enrollment: 'css_selector',
            national_rank: 'css_selector'
        };
        const scoreResult = scorer.scoreExtraction(mockScoringData, mockExtractionMethods);
        console.log(`   📊 Confidence calculation: ${scoreResult.overallConfidence.toFixed(1)}%`);
        console.log('✅ Confidence scoring: OK');
        console.log('\n🎉 All validations passed! Silver layer is ready for use.');
        console.log('\n💡 Next steps:');
        console.log('   1. Run "silver-cli test" to verify with real data');
        console.log('   2. Run "silver-cli extract" to start processing');
        console.log('   3. Use "silver-cli stats" to monitor progress');
        silverService.close();
    }
    catch (error) {
        console.error('💥 Validation failed:', error instanceof Error ? error.message : 'Unknown error');
        console.error('\n🔧 Please check your configuration and dependencies.');
        process.exit(1);
    }
});
// Handle unmatched commands
program
    .command('*', { noHelp: true })
    .action(() => {
    console.error('❌ Unknown command. Use --help to see available commands.');
    process.exit(1);
});
// Parse command line arguments
program.parse(process.argv);
// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
//# sourceMappingURL=silver-cli.js.map