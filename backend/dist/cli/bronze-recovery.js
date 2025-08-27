#!/usr/bin/env node
/**
 * Bronze Layer Error Recovery CLI
 *
 * Command-line tool for performing error recovery operations
 * on the Bronze layer including failed file recovery and drive health checks.
 */
import { createBronzeServiceWithHealth } from '../bronze/bronze-service';
import { createBronzeLogger } from '../common/logger';
async function runErrorRecovery() {
    const logger = createBronzeLogger({ component: 'bronze-recovery-cli' });
    logger.info('Starting Bronze Layer Error Recovery');
    try {
        // Create Bronze service (use production database, not in-memory)
        const service = createBronzeServiceWithHealth({
            source_directories: ['/Volumes/OWC Express 1M2/USNEWS_2024', '/Volumes/OWC Express 1M2/USNEWS_2025'],
            batch_size: 10,
            parallel_workers: 4
        }, './data/bronze.db', 3002);
        await service.initialize();
        logger.info('Bronze service initialized for recovery operations');
        // Step 1: Check and recover drive health
        logger.info('Step 1: Checking and recovering drive health...');
        const driveResult = await service.recoverDriveHealth();
        if (driveResult.healthy) {
            logger.info('All drives are healthy', {
                recoveredDrives: driveResult.recoveredDrives
            });
        }
        else {
            logger.warn('Some drives remain unhealthy', {
                recoveredDrives: driveResult.recoveredDrives
            });
        }
        // Step 2: Perform comprehensive error recovery
        logger.info('Step 2: Performing comprehensive error recovery...');
        const recoveryResult = await service.recoverAllErrors();
        logger.info('Error recovery completed', {
            totalAttempted: recoveryResult.totalAttempted,
            successful: recoveryResult.successful,
            stillFailed: recoveryResult.stillFailed,
            skipped: recoveryResult.skipped,
            recoveryRate: recoveryResult.totalAttempted > 0 ?
                Math.round((recoveryResult.successful / recoveryResult.totalAttempted) * 100) : 0,
            recoveryTimeSeconds: Math.round(recoveryResult.recoveryTime / 1000)
        });
        // Step 3: Display recovery metrics
        logger.info('Step 3: Recovery system metrics...');
        const metrics = service.getErrorRecoveryMetrics();
        logger.info('Recovery system metrics', {
            totalRecoveryAttempts: metrics.recoveryAttempts,
            totalSuccessfulRecoveries: metrics.successfulRecoveries,
            totalFailedRecoveries: metrics.failedRecoveries,
            overallSuccessRate: metrics.recoveryAttempts > 0 ?
                Math.round((metrics.successfulRecoveries / (metrics.successfulRecoveries + metrics.failedRecoveries)) * 100) : 0,
            averageRecoveryTimeMs: Math.round(metrics.averageRecoveryTime),
            errorPatterns: metrics.errorPatterns
        });
        // Step 4: Display final statistics
        logger.info('Step 4: Final Bronze layer statistics...');
        const stats = await service.getStatistics();
        logger.metrics('Final Bronze layer state', {
            totalFiles: stats.total_files_discovered,
            pendingFiles: stats.files_by_status.pending,
            processedFiles: stats.files_by_status.processed,
            failedFiles: stats.files_by_status.failed,
            quarantinedFiles: stats.files_by_status.quarantined,
            processingRate: stats.processing_rate
        });
        // Shutdown service
        await service.shutdown();
        logger.info('Bronze Layer Error Recovery completed successfully');
        // Exit with appropriate code
        if (recoveryResult.stillFailed > 0) {
            logger.warn('Some records still failed after recovery', {
                stillFailed: recoveryResult.stillFailed
            });
            process.exit(1);
        }
    }
    catch (error) {
        logger.error('Bronze Layer Error Recovery failed', error);
        process.exit(1);
    }
}
// Run the recovery
runErrorRecovery().catch(error => {
    console.error('Recovery failed:', error);
    process.exit(1);
});
//# sourceMappingURL=bronze-recovery.js.map