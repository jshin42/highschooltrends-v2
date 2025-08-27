/**
 * Production Health Monitoring System
 *
 * Provides HTTP health check endpoints, SLO monitoring, and alerting
 * for production observability and operational readiness.
 */
import { createBronzeLogger } from './logger';
/**
 * Bronze Layer SLO Definitions
 * Based on production requirements for 36K file processing
 */
export const BRONZE_SLO_TARGETS = [
    {
        name: 'processing_rate',
        target_value: 1000, // files per minute
        warning_threshold: 800,
        critical_threshold: 500,
        unit: 'files/min',
        description: 'Files processed per minute under normal load'
    },
    {
        name: 'error_rate',
        target_value: 1.0, // max 1% errors
        warning_threshold: 2.0,
        critical_threshold: 5.0,
        unit: 'percentage',
        description: 'Percentage of files that fail processing'
    },
    {
        name: 'processing_time_p95',
        target_value: 5000, // 5 seconds max
        warning_threshold: 7000,
        critical_threshold: 10000,
        unit: 'milliseconds',
        description: '95th percentile processing time per file'
    },
    {
        name: 'memory_usage',
        target_value: 80, // max 80% memory
        warning_threshold: 90,
        critical_threshold: 95,
        unit: 'percentage',
        description: 'Memory utilization percentage'
    },
    {
        name: 'external_drive_response',
        target_value: 1000, // 1 second max
        warning_threshold: 2000,
        critical_threshold: 5000,
        unit: 'milliseconds',
        description: 'External drive response time for file operations'
    }
];
export class HealthMonitor {
    logger;
    alerts = [];
    startTime;
    componentChecks = new Map();
    metricsCollectors = new Map();
    constructor() {
        this.logger = createBronzeLogger({ component: 'health-monitor' });
        this.startTime = Date.now();
    }
    /**
     * Register a component health check function
     */
    registerComponent(name, healthCheck) {
        this.componentChecks.set(name, healthCheck);
        this.logger.info('Component health check registered', { componentName: name });
    }
    /**
     * Register a metrics collector function
     */
    registerMetric(name, collector) {
        this.metricsCollectors.set(name, collector);
        this.logger.debug('Metrics collector registered', { metricName: name });
    }
    /**
     * Perform complete system health check
     */
    async getHealthCheck() {
        const timer = this.logger.startTimer('system-health-check');
        try {
            // Check all registered components
            const components = await this.checkAllComponents();
            // Collect all metrics
            const metrics = await this.collectMetrics();
            // Evaluate SLO violations
            const sloViolations = this.evaluateSLOs(metrics);
            // Determine overall status
            const overallStatus = this.calculateOverallStatus(components, sloViolations);
            const healthCheck = {
                overall_status: overallStatus,
                timestamp: new Date().toISOString(),
                version: process.env.npm_package_version || '1.0.0',
                uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
                components,
                metrics,
                slo_violations: sloViolations,
                alerts: this.getActiveAlerts()
            };
            timer.end('System health check completed');
            return healthCheck;
        }
        catch (error) {
            timer.endWithError(error, 'System health check failed');
            throw error;
        }
    }
    /**
     * Create an alert for monitoring systems
     */
    createAlert(severity, title, description, component) {
        const alert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            severity,
            title,
            description,
            component,
            timestamp: new Date().toISOString(),
            resolved: false
        };
        this.alerts.push(alert);
        this.logger.warn('Alert created', {
            alertId: alert.id,
            severity: alert.severity,
            title: alert.title,
            component: alert.component
        });
        return alert;
    }
    /**
     * Resolve an alert by ID
     */
    resolveAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolved = true;
            this.logger.info('Alert resolved', { alertId, title: alert.title });
            return true;
        }
        return false;
    }
    /**
     * Get all active (unresolved) alerts
     */
    getActiveAlerts() {
        return this.alerts.filter(alert => !alert.resolved);
    }
    /**
     * Check all registered components
     */
    async checkAllComponents() {
        const components = [];
        for (const [name, healthCheck] of this.componentChecks) {
            try {
                const component = await healthCheck();
                components.push(component);
            }
            catch (error) {
                const failedComponent = {
                    name,
                    status: 'failed',
                    message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    last_checked: new Date().toISOString()
                };
                components.push(failedComponent);
                this.logger.error('Component health check failed', error, { componentName: name });
            }
        }
        return components;
    }
    /**
     * Collect all registered metrics
     */
    async collectMetrics() {
        const metrics = {};
        for (const [name, collector] of this.metricsCollectors) {
            try {
                const value = await collector();
                metrics[name] = value;
            }
            catch (error) {
                this.logger.error('Metrics collection failed', error, { metricName: name });
                metrics[name] = -1; // Sentinel value for failed metric
            }
        }
        // Provide defaults for missing metrics
        return {
            processing_rate_files_per_min: metrics.processing_rate_files_per_min || 0,
            average_processing_time_ms: metrics.average_processing_time_ms || 0,
            p95_processing_time_ms: metrics.p95_processing_time_ms || 0,
            p99_processing_time_ms: metrics.p99_processing_time_ms || 0,
            error_rate_percentage: metrics.error_rate_percentage || 0,
            failure_rate_percentage: metrics.failure_rate_percentage || 0,
            memory_usage_mb: metrics.memory_usage_mb || 0,
            memory_usage_percentage: metrics.memory_usage_percentage || 0,
            disk_usage_percentage: metrics.disk_usage_percentage || 0,
            db_connection_pool_active: metrics.db_connection_pool_active || 0,
            db_query_time_p95_ms: metrics.db_query_time_p95_ms || 0,
            external_drive_connectivity: metrics.external_drive_connectivity || 'operational',
            external_drive_response_time_ms: metrics.external_drive_response_time_ms || 0
        };
    }
    /**
     * Evaluate SLO violations against current metrics
     */
    evaluateSLOs(metrics) {
        const violations = [];
        for (const slo of BRONZE_SLO_TARGETS) {
            const actualValue = this.getMetricValue(metrics, slo.name);
            if (actualValue === undefined)
                continue;
            let severity = null;
            if (slo.name.includes('time') || slo.name.includes('rate') && !slo.name.includes('error')) {
                // For timing/rate metrics, higher is worse
                if (actualValue > slo.critical_threshold) {
                    severity = 'critical';
                }
                else if (actualValue > slo.warning_threshold) {
                    severity = 'warning';
                }
            }
            else {
                // For error rates and utilization, higher is worse
                if (actualValue > slo.critical_threshold) {
                    severity = 'critical';
                }
                else if (actualValue > slo.warning_threshold) {
                    severity = 'warning';
                }
            }
            if (severity) {
                violations.push({
                    slo_name: slo.name,
                    target_value: slo.target_value,
                    actual_value: actualValue,
                    severity,
                    description: `${slo.description}: ${actualValue}${slo.unit} exceeds ${severity} threshold`,
                    timestamp: new Date().toISOString()
                });
            }
        }
        return violations;
    }
    /**
     * Calculate overall system health status
     */
    calculateOverallStatus(components, sloViolations) {
        // Check for component failures
        const failedComponents = components.filter(c => c.status === 'failed');
        const degradedComponents = components.filter(c => c.status === 'degraded');
        // Check for critical SLO violations
        const criticalViolations = sloViolations.filter(v => v.severity === 'critical');
        const warningViolations = sloViolations.filter(v => v.severity === 'warning');
        if (failedComponents.length > 0 || criticalViolations.length > 0) {
            return 'critical';
        }
        if (degradedComponents.length > 1 || (degradedComponents.length > 0 && warningViolations.length > 0)) {
            return 'unhealthy';
        }
        if (degradedComponents.length > 0 || warningViolations.length > 0) {
            return 'degraded';
        }
        return 'healthy';
    }
    /**
     * Get metric value by SLO name
     */
    getMetricValue(metrics, sloName) {
        switch (sloName) {
            case 'processing_rate':
                return metrics.processing_rate_files_per_min;
            case 'error_rate':
                return metrics.error_rate_percentage;
            case 'processing_time_p95':
                return metrics.p95_processing_time_ms;
            case 'memory_usage':
                return metrics.memory_usage_percentage;
            case 'external_drive_response':
                return metrics.external_drive_response_time_ms;
            default:
                return undefined;
        }
    }
}
/**
 * Global health monitor instance
 */
export const healthMonitor = new HealthMonitor();
//# sourceMappingURL=health.js.map