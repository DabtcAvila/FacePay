'use client';

import * as React from 'react';

// Error monitoring and console error tracking
export interface ErrorLog {
  message: string;
  stack?: string;
  url: string;
  lineNumber?: number;
  columnNumber?: number;
  timestamp: number;
  type: 'error' | 'warning' | 'info';
  component?: string;
  userId?: string;
}

export interface ConsoleLog {
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
  stack?: string;
  url: string;
}

class ErrorMonitor {
  private errors: ErrorLog[] = [];
  private consoleLogs: ConsoleLog[] = [];
  private maxLogs = 1000;
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeErrorMonitoring();
    }
  }

  private initializeErrorMonitoring() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Global error handler
    window.addEventListener('error', (event) => {
      this.logError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename || window.location.href,
        lineNumber: event.lineno,
        columnNumber: event.colno,
        timestamp: Date.now(),
        type: 'error',
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        timestamp: Date.now(),
        type: 'error',
      });
    });

    // Console interceptor
    this.interceptConsole();

    // Resource loading errors
    this.monitorResourceErrors();

    // Network request monitoring
    this.monitorNetworkErrors();
  }

  private interceptConsole() {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
    };

    // Intercept console.error
    console.error = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      this.logConsole({
        level: 'error',
        message,
        timestamp: Date.now(),
        stack: new Error().stack,
        url: window.location.href,
      });

      originalConsole.error(...args);
    };

    // Intercept console.warn
    console.warn = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      this.logConsole({
        level: 'warn',
        message,
        timestamp: Date.now(),
        url: window.location.href,
      });

      // Filter out known warnings that are not critical
      if (!this.isIgnorableWarning(message)) {
        originalConsole.warn(...args);
      }
    };

    // Intercept console.info
    console.info = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      // Only log important info messages
      if (this.isImportantInfo(message)) {
        this.logConsole({
          level: 'info',
          message,
          timestamp: Date.now(),
          url: window.location.href,
        });
      }

      originalConsole.info(...args);
    };
  }

  private isIgnorableWarning(message: string): boolean {
    const ignorablePatterns = [
      // Next.js development warnings
      'Fast Refresh',
      'Prop `className` did not match',
      'Extra attributes from the server',
      // React development warnings
      'validateDOMNesting',
      'useLayoutEffect does nothing on the server',
      // Third-party library warnings that are known and acceptable
      'deprecated',
      'legacy',
    ];

    return ignorablePatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private isImportantInfo(message: string): boolean {
    const importantPatterns = [
      'performance',
      'security',
      'authentication',
      'payment',
      'error',
      'failed',
      'timeout',
    ];

    return importantPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private monitorResourceErrors() {
    // Listen for failed resource loads
    window.addEventListener('error', (event) => {
      const target = event.target as HTMLElement;
      
      if (target && (target as any) !== window && target.tagName) {
        const resourceType = target.tagName.toLowerCase();
        const resourceUrl = (target as any).src || (target as any).href;
        
        if (resourceUrl) {
          this.logError({
            message: `Failed to load ${resourceType}: ${resourceUrl}`,
            url: window.location.href,
            timestamp: Date.now(),
            type: 'error',
          });
        }
      }
    }, true);
  }

  private monitorNetworkErrors() {
    // Override fetch to monitor network errors
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = Date.now();
      
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        // Log slow requests
        if (duration > 5000) {
          this.logError({
            message: `Slow network request: ${args[0]} (${duration}ms)`,
            url: window.location.href,
            timestamp: Date.now(),
            type: 'warning',
          });
        }
        
        // Log HTTP errors
        if (!response.ok) {
          this.logError({
            message: `HTTP ${response.status} error: ${args[0]}`,
            url: window.location.href,
            timestamp: Date.now(),
            type: 'error',
          });
        }
        
        return response;
      } catch (error) {
        this.logError({
          message: `Network error: ${args[0]} - ${error}`,
          stack: (error as Error).stack,
          url: window.location.href,
          timestamp: Date.now(),
          type: 'error',
        });
        
        throw error;
      }
    };
  }

  logError(error: ErrorLog) {
    // Add to error log
    this.errors.unshift(error);
    
    // Trim logs to max size
    if (this.errors.length > this.maxLogs) {
      this.errors = this.errors.slice(0, this.maxLogs);
    }
    
    // Send critical errors to analytics/monitoring service
    if (error.type === 'error') {
      this.sendToMonitoringService(error);
    }
  }

  logConsole(log: ConsoleLog) {
    this.consoleLogs.unshift(log);
    
    // Trim logs to max size
    if (this.consoleLogs.length > this.maxLogs) {
      this.consoleLogs = this.consoleLogs.slice(0, this.maxLogs);
    }
  }

  private sendToMonitoringService(error: ErrorLog) {
    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, LogRocket, DataDog, etc.
      try {
        // Basic implementation - replace with your monitoring service
        fetch('/api/monitoring/error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(error),
        }).catch(() => {
          // Silently fail if monitoring endpoint is not available
        });
      } catch (e) {
        // Ignore monitoring errors
      }
    }
  }

  getErrors(type?: ErrorLog['type']): ErrorLog[] {
    if (type) {
      return this.errors.filter(error => error.type === type);
    }
    return [...this.errors];
  }

  getConsoleLogs(level?: ConsoleLog['level']): ConsoleLog[] {
    if (level) {
      return this.consoleLogs.filter(log => log.level === level);
    }
    return [...this.consoleLogs];
  }

  getErrorSummary() {
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const recentErrors = this.errors.filter(error => error.timestamp > last24Hours);
    
    const summary = {
      totalErrors: this.errors.length,
      recentErrors: recentErrors.length,
      errorsByType: recentErrors.reduce((acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      topErrors: this.getTopErrors(10),
      consoleBroken: this.consoleLogs.filter(log => 
        log.level === 'error' && log.timestamp > last24Hours
      ).length,
    };
    
    return summary;
  }

  getTopErrors(limit = 5): Array<{ message: string; count: number; lastSeen: number }> {
    const errorCounts = new Map<string, { count: number; lastSeen: number }>();
    
    this.errors.forEach(error => {
      const key = error.message.substring(0, 100); // First 100 chars as key
      const existing = errorCounts.get(key) || { count: 0, lastSeen: 0 };
      
      errorCounts.set(key, {
        count: existing.count + 1,
        lastSeen: Math.max(existing.lastSeen, error.timestamp),
      });
    });
    
    return Array.from(errorCounts.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  clearLogs() {
    this.errors = [];
    this.consoleLogs = [];
  }

  generateErrorReport(): string {
    const summary = this.getErrorSummary();
    const topErrors = this.getTopErrors();
    
    return `
# Error Monitoring Report

## Summary (Last 24 Hours)
- **Total Errors**: ${summary.totalErrors}
- **Recent Errors**: ${summary.recentErrors}
- **Console Errors**: ${summary.consoleBroken}

## Error Breakdown
${Object.entries(summary.errorsByType)
  .map(([type, count]) => `- **${type}**: ${count}`)
  .join('\n')}

## Top Errors
${topErrors.map((error, index) => 
  `${index + 1}. **${error.message}** (${error.count}x) - Last seen: ${new Date(error.lastSeen).toLocaleString()}`
).join('\n')}

## Recommendations
${this.generateRecommendations(summary, topErrors)}

Generated: ${new Date().toISOString()}
    `.trim();
  }

  private generateRecommendations(
    summary: ReturnType<ErrorMonitor['getErrorSummary']>, 
    topErrors: ReturnType<ErrorMonitor['getTopErrors']>
  ): string {
    const recommendations: string[] = [];
    
    if (summary.recentErrors > 10) {
      recommendations.push('- High error rate detected. Review recent code changes and deployments.');
    }
    
    if (summary.consoleBroken > 5) {
      recommendations.push('- Multiple console errors detected. Check browser console for detailed information.');
    }
    
    if (topErrors.some(error => error.message.includes('Network'))) {
      recommendations.push('- Network errors detected. Check API endpoints and network connectivity.');
    }
    
    if (topErrors.some(error => error.message.includes('TypeError'))) {
      recommendations.push('- Type errors detected. Review TypeScript configuration and type definitions.');
    }
    
    if (topErrors.some(error => error.message.includes('Permission'))) {
      recommendations.push('- Permission errors detected. Review authentication and authorization logic.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- No specific issues detected. Continue monitoring for trends.');
    }
    
    return recommendations.join('\n');
  }

  // React error boundary integration
  logReactError(error: Error, errorInfo: any, component?: string) {
    this.logError({
      message: `React Error: ${error.message}`,
      stack: error.stack,
      url: window.location.href,
      timestamp: Date.now(),
      type: 'error',
      component,
    });
  }
}

// Singleton instance
let errorMonitor: ErrorMonitor | null = null;

export function getErrorMonitor(): ErrorMonitor {
  if (!errorMonitor) {
    errorMonitor = new ErrorMonitor();
  }
  return errorMonitor;
}

// React hook for error monitoring
export function useErrorMonitor() {
  const monitor = getErrorMonitor();
  
  return {
    logError: monitor.logError.bind(monitor),
    getErrors: monitor.getErrors.bind(monitor),
    getErrorSummary: monitor.getErrorSummary.bind(monitor),
    generateReport: monitor.generateErrorReport.bind(monitor),
    clearLogs: monitor.clearLogs.bind(monitor),
  };
}

// Enhanced Error Boundary component
export class EnhancedErrorBoundary extends React.Component<
  { children: React.ReactNode; componentName?: string },
  { hasError: boolean; error?: Error }
> {
  private errorMonitor = getErrorMonitor();

  constructor(props: { children: React.ReactNode; componentName?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.errorMonitor.logReactError(error, errorInfo, this.props.componentName);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-red-600 mb-3">
            {this.props.componentName 
              ? `An error occurred in the ${this.props.componentName} component.`
              : 'An unexpected error occurred.'
            }
          </p>
          <details className="text-sm">
            <summary className="cursor-pointer text-red-700 font-medium">Error Details</summary>
            <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
              {this.state.error?.stack}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorMonitor;