/**
 * Health Check HTTP Server
 *
 * Provides REST endpoints for production health monitoring,
 * SLO tracking, and operational observability.
 */
export interface HealthServerOptions {
    port: number;
    host?: string;
    enableCors?: boolean;
    maxRequestTime?: number;
}
export declare class HealthServer {
    private server;
    private logger;
    private options;
    constructor(options: HealthServerOptions);
    /**
     * Start the health check server
     */
    start(): Promise<void>;
    /**
     * Stop the health check server
     */
    stop(): Promise<void>;
    /**
     * Check if server is running
     */
    isRunning(): boolean;
    /**
     * Get available health endpoints
     */
    private getAvailableEndpoints;
    /**
     * Handle incoming HTTP requests
     */
    private handleRequest;
    /**
     * Handle /health and /health/detailed endpoints
     */
    private handleHealthCheck;
    /**
     * Handle /health/metrics endpoint
     */
    private handleMetrics;
    /**
     * Handle /health/slo endpoint
     */
    private handleSLOViolations;
    /**
     * Handle /health/alerts endpoint
     */
    private handleAlerts;
    /**
     * Handle /ready endpoint (Kubernetes readiness probe)
     */
    private handleReadinessProbe;
    /**
     * Handle /live endpoint (Kubernetes liveness probe)
     */
    private handleLivenessProbe;
    /**
     * Send JSON response with proper headers
     */
    private sendJsonResponse;
    /**
     * Send error response
     */
    private sendErrorResponse;
    /**
     * Convert health status to HTTP status code
     */
    private getHttpStatusFromHealth;
}
//# sourceMappingURL=health-server.d.ts.map