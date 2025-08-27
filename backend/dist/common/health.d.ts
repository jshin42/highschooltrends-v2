/**
 * Production Health Monitoring System
 *
 * Provides HTTP health check endpoints, SLO monitoring, and alerting
 * for production observability and operational readiness.
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'critical';
export type ComponentStatus = 'operational' | 'degraded' | 'failed';
export interface HealthMetrics {
    processing_rate_files_per_min: number;
    average_processing_time_ms: number;
    p95_processing_time_ms: number;
    p99_processing_time_ms: number;
    error_rate_percentage: number;
    failure_rate_percentage: number;
    memory_usage_mb: number;
    memory_usage_percentage: number;
    disk_usage_percentage: number;
    db_connection_pool_active: number;
    db_query_time_p95_ms: number;
    external_drive_connectivity: ComponentStatus;
    external_drive_response_time_ms: number;
}
export interface ComponentHealth {
    name: string;
    status: ComponentStatus;
    message: string;
    metrics?: Record<string, number>;
    last_checked: string;
    uptime_seconds?: number;
}
export interface SystemHealthCheck {
    overall_status: HealthStatus;
    timestamp: string;
    version: string;
    uptime_seconds: number;
    components: ComponentHealth[];
    metrics: HealthMetrics;
    slo_violations: SLOViolation[];
    alerts: Alert[];
}
export interface SLOViolation {
    slo_name: string;
    target_value: number;
    actual_value: number;
    severity: 'warning' | 'critical';
    description: string;
    timestamp: string;
}
export interface Alert {
    id: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    title: string;
    description: string;
    component: string;
    timestamp: string;
    resolved: boolean;
}
export interface SLOTarget {
    name: string;
    target_value: number;
    warning_threshold: number;
    critical_threshold: number;
    unit: string;
    description: string;
}
/**
 * Bronze Layer SLO Definitions
 * Based on production requirements for 36K file processing
 */
export declare const BRONZE_SLO_TARGETS: SLOTarget[];
export declare class HealthMonitor {
    private logger;
    private alerts;
    private startTime;
    private componentChecks;
    private metricsCollectors;
    constructor();
    /**
     * Register a component health check function
     */
    registerComponent(name: string, healthCheck: () => Promise<ComponentHealth>): void;
    /**
     * Register a metrics collector function
     */
    registerMetric(name: string, collector: () => Promise<number>): void;
    /**
     * Perform complete system health check
     */
    getHealthCheck(): Promise<SystemHealthCheck>;
    /**
     * Create an alert for monitoring systems
     */
    createAlert(severity: Alert['severity'], title: string, description: string, component: string): Alert;
    /**
     * Resolve an alert by ID
     */
    resolveAlert(alertId: string): boolean;
    /**
     * Get all active (unresolved) alerts
     */
    getActiveAlerts(): Alert[];
    /**
     * Check all registered components
     */
    private checkAllComponents;
    /**
     * Collect all registered metrics
     */
    private collectMetrics;
    /**
     * Evaluate SLO violations against current metrics
     */
    private evaluateSLOs;
    /**
     * Calculate overall system health status
     */
    private calculateOverallStatus;
    /**
     * Get metric value by SLO name
     */
    private getMetricValue;
}
/**
 * Global health monitor instance
 */
export declare const healthMonitor: HealthMonitor;
//# sourceMappingURL=health.d.ts.map