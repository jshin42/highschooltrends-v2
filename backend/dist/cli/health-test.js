#!/usr/bin/env node
/**
 * Health Monitoring System Test
 *
 * Validates Bronze layer health check endpoints and SLO monitoring.
 * Tests the complete production health monitoring infrastructure.
 */
import { createBronzeServiceWithHealth } from '../bronze/bronze-service';
import { createBronzeLogger } from '../common/logger';
async function testHealthMonitoring() {
    const logger = createBronzeLogger({ component: 'health-test' });
    logger.info('Starting Bronze Layer Health Monitoring Test');
    try {
        // Create Bronze service with health monitoring on port 3001
        const service = createBronzeServiceWithHealth({
            source_directories: ['/Volumes/OWC Express 1M2/USNEWS_2024'],
            batch_size: 5,
            parallel_workers: 2
        }, ':memory:', 3001);
        // Initialize service (this will start the health server)
        await service.initialize();
        logger.info('Bronze service with health monitoring started');
        // Wait a moment for server to be fully ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Test health endpoints
        logger.info('Testing health endpoints...');
        const endpoints = [
            'http://localhost:3001/health',
            'http://localhost:3001/health/detailed',
            'http://localhost:3001/health/metrics',
            'http://localhost:3001/health/slo',
            'http://localhost:3001/health/alerts',
            'http://localhost:3001/ready',
            'http://localhost:3001/live'
        ];
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                const data = await response.json();
                logger.info('Health endpoint test result', {
                    endpoint,
                    status: response.status,
                    statusText: response.statusText,
                    hasData: data && typeof data === 'object' && Object.keys(data).length > 0
                });
                if (endpoint.includes('/health/detailed') && data) {
                    // Log detailed health info
                    logger.info('Detailed health check response', {
                        overall_status: data.overall_status,
                        components: data.components?.map((c) => ({ name: c.name, status: c.status })),
                        slo_violations: data.slo_violations?.length || 0,
                        active_alerts: data.alerts?.length || 0
                    });
                }
            }
            catch (error) {
                logger.error('Health endpoint test failed', error, { endpoint });
            }
        }
        // Test some file processing to generate metrics
        logger.info('Processing test files to generate health metrics...');
        const result = await service.processBatch(['/non/existent/file1.html', '/non/existent/file2.html']);
        logger.info('Test processing completed', {
            totalFiles: result.total_files,
            successful: result.successful_ingestions,
            failed: result.failed_ingestions,
            errors: result.errors.length
        });
        // Wait a moment then check health again
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Test health after processing
        try {
            const response = await fetch('http://localhost:3001/health/detailed');
            const healthData = await response.json();
            logger.info('Health status after processing', {
                overall_status: healthData?.overall_status,
                error_rate: healthData?.metrics?.error_rate_percentage,
                processing_rate: healthData?.metrics?.processing_rate_files_per_min,
                memory_usage: healthData?.metrics?.memory_usage_mb,
                slo_violations: healthData?.slo_violations?.length || 0
            });
        }
        catch (error) {
            logger.error('Post-processing health check failed', error);
        }
        // Shutdown service
        logger.info('Shutting down Bronze service...');
        await service.shutdown();
        logger.info('Health monitoring test completed successfully');
    }
    catch (error) {
        logger.error('Health monitoring test failed', error);
        process.exit(1);
    }
}
// Run the test
testHealthMonitoring().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
//# sourceMappingURL=health-test.js.map