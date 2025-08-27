/**
 * Health Check HTTP Server
 * 
 * Provides REST endpoints for production health monitoring,
 * SLO tracking, and operational observability.
 */

import * as http from 'http';
import * as url from 'url';
import { healthMonitor, SystemHealthCheck, HealthStatus } from './health';
import { createBronzeLogger, StructuredLogger } from './logger';

export interface HealthServerOptions {
  port: number;
  host?: string;
  enableCors?: boolean;
  maxRequestTime?: number;
}

export class HealthServer {
  private server: http.Server | null = null;
  private logger: StructuredLogger;
  private options: Required<HealthServerOptions>;

  constructor(options: HealthServerOptions) {
    this.options = {
      host: 'localhost',
      enableCors: true,
      maxRequestTime: 30000, // 30 seconds
      ...options
    };
    
    this.logger = createBronzeLogger({ 
      component: 'health-server',
      port: this.options.port,
      host: this.options.host
    });
  }

  /**
   * Start the health check server
   */
  async start(): Promise<void> {
    const timer = this.logger.startTimer('health-server-startup');
    
    try {
      this.server = http.createServer(this.handleRequest.bind(this));
      
      // Set server timeout
      this.server.timeout = this.options.maxRequestTime;
      
      // Start listening
      await new Promise<void>((resolve, reject) => {
        this.server!.listen(this.options.port, this.options.host, (error?: Error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      this.logger.info('Health server started successfully', {
        port: this.options.port,
        host: this.options.host,
        endpoints: this.getAvailableEndpoints()
      });
      
      timer.end('Health server startup completed');
    } catch (error) {
      timer.endWithError(error as Error, 'Health server startup failed');
      throw error;
    }
  }

  /**
   * Stop the health check server
   */
  async stop(): Promise<void> {
    const timer = this.logger.startTimer('health-server-shutdown');
    
    try {
      if (!this.server) {
        this.logger.warn('Health server stop called but server not running');
        return;
      }

      await new Promise<void>((resolve, reject) => {
        this.server!.close((error?: Error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      this.server = null;
      timer.end('Health server shutdown completed');
    } catch (error) {
      timer.endWithError(error as Error, 'Health server shutdown failed');
      throw error;
    }
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.server !== null && this.server.listening;
  }

  /**
   * Get available health endpoints
   */
  private getAvailableEndpoints(): string[] {
    const baseUrl = `http://${this.options.host}:${this.options.port}`;
    return [
      `${baseUrl}/health`,              // Overall health status
      `${baseUrl}/health/detailed`,     // Detailed health with components
      `${baseUrl}/health/metrics`,      // Raw metrics only
      `${baseUrl}/health/slo`,          // SLO violations
      `${baseUrl}/health/alerts`,       // Active alerts
      `${baseUrl}/ready`,               // Kubernetes readiness probe
      `${baseUrl}/live`                 // Kubernetes liveness probe
    ];
  }

  /**
   * Handle incoming HTTP requests
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const timer = this.logger.startTimer('health-request');
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Parse URL
      const parsedUrl = url.parse(req.url || '/', true);
      const pathname = parsedUrl.pathname || '/';
      const method = req.method || 'GET';

      this.logger.debug('Health request received', {
        requestId,
        method,
        pathname,
        userAgent: req.headers['user-agent'],
        remoteAddress: req.connection.remoteAddress
      });

      // Set CORS headers if enabled
      if (this.options.enableCors) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      }

      // Handle OPTIONS requests
      if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        timer.end('OPTIONS request handled');
        return;
      }

      // Only allow GET requests
      if (method !== 'GET') {
        await this.sendErrorResponse(res, 405, 'Method Not Allowed', requestId);
        timer.end('Method not allowed');
        return;
      }

      // Route requests
      switch (pathname) {
        case '/health':
          await this.handleHealthCheck(res, false, requestId);
          break;
        
        case '/health/detailed':
          await this.handleHealthCheck(res, true, requestId);
          break;
        
        case '/health/metrics':
          await this.handleMetrics(res, requestId);
          break;
        
        case '/health/slo':
          await this.handleSLOViolations(res, requestId);
          break;
        
        case '/health/alerts':
          await this.handleAlerts(res, requestId);
          break;
        
        case '/ready':
          await this.handleReadinessProbe(res, requestId);
          break;
        
        case '/live':
          await this.handleLivenessProbe(res, requestId);
          break;
        
        default:
          await this.sendErrorResponse(res, 404, 'Not Found', requestId);
          timer.end('Endpoint not found');
          return;
      }
      
      timer.end('Health request completed successfully');
    } catch (error) {
      timer.endWithError(error as Error, 'Health request failed');
      await this.sendErrorResponse(res, 500, 'Internal Server Error', requestId);
    }
  }

  /**
   * Handle /health and /health/detailed endpoints
   */
  private async handleHealthCheck(res: http.ServerResponse, detailed: boolean, requestId: string): Promise<void> {
    try {
      const healthCheck = await healthMonitor.getHealthCheck();
      
      let responseData;
      if (detailed) {
        responseData = healthCheck;
      } else {
        // Simplified response for basic health check
        responseData = {
          status: healthCheck.overall_status,
          timestamp: healthCheck.timestamp,
          uptime_seconds: healthCheck.uptime_seconds,
          version: healthCheck.version
        };
      }

      const statusCode = this.getHttpStatusFromHealth(healthCheck.overall_status);
      await this.sendJsonResponse(res, statusCode, responseData, requestId);
      
    } catch (error) {
      this.logger.error('Health check failed', error as Error, { requestId });
      await this.sendErrorResponse(res, 500, 'Health check failed', requestId);
    }
  }

  /**
   * Handle /health/metrics endpoint
   */
  private async handleMetrics(res: http.ServerResponse, requestId: string): Promise<void> {
    try {
      const healthCheck = await healthMonitor.getHealthCheck();
      await this.sendJsonResponse(res, 200, healthCheck.metrics, requestId);
    } catch (error) {
      this.logger.error('Metrics collection failed', error as Error, { requestId });
      await this.sendErrorResponse(res, 500, 'Metrics collection failed', requestId);
    }
  }

  /**
   * Handle /health/slo endpoint
   */
  private async handleSLOViolations(res: http.ServerResponse, requestId: string): Promise<void> {
    try {
      const healthCheck = await healthMonitor.getHealthCheck();
      const response = {
        slo_violations: healthCheck.slo_violations,
        violation_count: healthCheck.slo_violations.length,
        critical_violations: healthCheck.slo_violations.filter(v => v.severity === 'critical').length,
        warning_violations: healthCheck.slo_violations.filter(v => v.severity === 'warning').length
      };
      
      const statusCode = response.critical_violations > 0 ? 503 : 200;
      await this.sendJsonResponse(res, statusCode, response, requestId);
    } catch (error) {
      this.logger.error('SLO violations check failed', error as Error, { requestId });
      await this.sendErrorResponse(res, 500, 'SLO check failed', requestId);
    }
  }

  /**
   * Handle /health/alerts endpoint
   */
  private async handleAlerts(res: http.ServerResponse, requestId: string): Promise<void> {
    try {
      const alerts = healthMonitor.getActiveAlerts();
      const response = {
        active_alerts: alerts,
        alert_count: alerts.length,
        critical_alerts: alerts.filter(a => a.severity === 'critical').length,
        warning_alerts: alerts.filter(a => a.severity === 'warning').length
      };
      
      await this.sendJsonResponse(res, 200, response, requestId);
    } catch (error) {
      this.logger.error('Alerts check failed', error as Error, { requestId });
      await this.sendErrorResponse(res, 500, 'Alerts check failed', requestId);
    }
  }

  /**
   * Handle /ready endpoint (Kubernetes readiness probe)
   */
  private async handleReadinessProbe(res: http.ServerResponse, requestId: string): Promise<void> {
    try {
      const healthCheck = await healthMonitor.getHealthCheck();
      
      // Ready if not critical and no component failures
      const isReady = healthCheck.overall_status !== 'critical' && 
                     !healthCheck.components.some(c => c.status === 'failed');
      
      const statusCode = isReady ? 200 : 503;
      const response = {
        ready: isReady,
        status: healthCheck.overall_status,
        timestamp: healthCheck.timestamp
      };
      
      await this.sendJsonResponse(res, statusCode, response, requestId);
    } catch (error) {
      this.logger.error('Readiness probe failed', error as Error, { requestId });
      await this.sendErrorResponse(res, 503, 'Readiness probe failed', requestId);
    }
  }

  /**
   * Handle /live endpoint (Kubernetes liveness probe)
   */
  private async handleLivenessProbe(res: http.ServerResponse, requestId: string): Promise<void> {
    // Liveness probe should only fail if the service is completely broken
    // For now, if we can respond, we're alive
    const response = {
      alive: true,
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor((Date.now() - Date.now()) / 1000) // Will be updated when we track actual start time
    };
    
    await this.sendJsonResponse(res, 200, response, requestId);
  }

  /**
   * Send JSON response with proper headers
   */
  private async sendJsonResponse(res: http.ServerResponse, statusCode: number, data: any, requestId: string): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Length', Buffer.byteLength(json));
    res.setHeader('X-Request-ID', requestId);
    res.writeHead(statusCode);
    res.end(json);
    
    this.logger.debug('JSON response sent', {
      requestId,
      statusCode,
      contentLength: Buffer.byteLength(json)
    });
  }

  /**
   * Send error response
   */
  private async sendErrorResponse(res: http.ServerResponse, statusCode: number, message: string, requestId: string): Promise<void> {
    const errorResponse = {
      error: {
        code: statusCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: requestId
      }
    };
    
    await this.sendJsonResponse(res, statusCode, errorResponse, requestId);
  }

  /**
   * Convert health status to HTTP status code
   */
  private getHttpStatusFromHealth(healthStatus: HealthStatus): number {
    switch (healthStatus) {
      case 'healthy':
        return 200;
      case 'degraded':
        return 200; // Still operational, just warn in logs
      case 'unhealthy':
        return 503; // Service temporarily unavailable
      case 'critical':
        return 503; // Service temporarily unavailable
      default:
        return 500; // Unknown status
    }
  }
}