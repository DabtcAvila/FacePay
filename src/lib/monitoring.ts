import * as Sentry from '@sentry/nextjs';
import React from 'react';
import { analytics } from './analytics';

// Monitoring Configuration
interface MonitoringConfig {
  sentryDsn?: string;
  enableInProduction?: boolean;
  enablePerformanceMonitoring?: boolean;
  sampleRate?: number;
  tracesSampleRate?: number;
}

class Monitoring {
  private isInitialized = false;
  private config: MonitoringConfig = {};
  private performanceObserver?: PerformanceObserver;
  private errorBoundaryErrors: Error[] = [];

  constructor() {
    this.initialize();
  }

  private initialize() {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    const isProduction = process.env.NODE_ENV === 'production';
    const enableInDevelopment = process.env.NEXT_PUBLIC_ENABLE_MONITORING === 'true';

    this.config = {
      sentryDsn: dsn,
      enableInProduction: isProduction || enableInDevelopment,
      enablePerformanceMonitoring: true,
      sampleRate: isProduction ? 0.1 : 1.0, // 10% in production, 100% in development
      tracesSampleRate: isProduction ? 0.1 : 1.0
    };

    // Initialize Sentry
    if (dsn && (this.config.enableInProduction || enableInDevelopment)) {
      try {
        Sentry.init({
          dsn,
          environment: process.env.NODE_ENV,
          sampleRate: this.config.sampleRate,
          tracesSampleRate: this.config.tracesSampleRate,
          debug: process.env.NODE_ENV === 'development',
          
          // TODO: Update Sentry integrations for current version
          // integrations: [
          //   new Sentry.BrowserTracing({
          //     routingInstrumentation: Sentry.nextRouterInstrumentation({
          //       router: typeof window !== 'undefined' ? window.next?.router : undefined
          //     }),
          //   }),
          //   new Sentry.Replay({
          //     maskAllText: false,
          //     blockAllMedia: false,
          //     sampleRate: 0.1,
          //     errorSampleRate: 1.0,
          //   }),
          // ],

          beforeSend(event, hint) {
            // Filter out development errors
            if (process.env.NODE_ENV === 'development') {
              const error = hint.originalException;
              if (error instanceof Error && error.message.includes('ChunkLoadError')) {
                return null; // Don't send chunk load errors in development
              }
            }

            // Add custom context
            event.contexts = {
              ...event.contexts,
              app: {
                name: 'FacePay',
                version: '1.0.0',
                build: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
              }
            };

            return event;
          },

          beforeBreadcrumb(breadcrumb, hint) {
            // Filter sensitive breadcrumbs
            if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
              return null;
            }
            return breadcrumb;
          }
        });

        this.isInitialized = true;
        console.log('🔍 Sentry monitoring initialized');
        
        // Set user context if available
        this.setContext();
        
      } catch (error) {
        console.error('Failed to initialize Sentry:', error);
      }
    } else {
      console.log('🔍 Monitoring disabled - no DSN provided or not in production');
    }

    // Initialize performance monitoring
    this.initializePerformanceMonitoring();
    
    // Setup global error handlers
    this.setupGlobalErrorHandlers();
  }

  private setContext() {
    if (!this.isInitialized) return;

    try {
      Sentry.setContext('browser', {
        name: navigator?.userAgent || 'unknown',
        version: navigator?.appVersion || 'unknown'
      });

      if (typeof window !== 'undefined') {
        Sentry.setContext('viewport', {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        });
      }
    } catch (error) {
      console.error('Error setting Sentry context:', error);
    }
  }

  private initializePerformanceMonitoring() {
    if (typeof window === 'undefined' || !PerformanceObserver) return;

    try {
      // Observe Web Vitals
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.trackPerformanceMetric(entry.name, entry.duration || 0, {
            entryType: entry.entryType,
            startTime: entry.startTime
          });
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });

      // Track Core Web Vitals
      this.trackWebVitals();
      
    } catch (error) {
      console.error('Performance monitoring setup failed:', error);
    }
  }

  private trackWebVitals() {
    if (typeof window === 'undefined') return;

    // First Contentful Paint
    try {
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) {
        this.trackPerformanceMetric('FCP', fcpEntry.startTime, { vital: true });
      }
    } catch (error) {
      console.error('Error tracking FCP:', error);
    }

    // Largest Contentful Paint
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.trackPerformanceMetric('LCP', lastEntry.startTime, { vital: true });
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.error('Error tracking LCP:', error);
    }

    // Cumulative Layout Shift
    try {
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        this.trackPerformanceMetric('CLS', clsValue, { vital: true });
      }).observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.error('Error tracking CLS:', error);
    }
  }

  private setupGlobalErrorHandlers() {
    if (typeof window === 'undefined') return;

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureException(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
        level: 'error',
        extra: {
          reason: event.reason,
          promise: event.promise
        }
      });
    });

    // Global errors
    window.addEventListener('error', (event) => {
      this.captureException(event.error || new Error(event.message), {
        level: 'error',
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      const target = event.target as HTMLElement;
      if (target && target.tagName && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        this.captureMessage(`Resource failed to load: ${target.tagName}`, 'warning', {
          extra: {
            src: (target as any).src || (target as any).href,
            tagName: target.tagName
          }
        });
      }
    }, true);
  }

  // Core monitoring methods
  captureException(error: Error, context?: any) {
    if (!this.isInitialized) {
      console.error('Monitoring Error:', error, context);
      return;
    }

    try {
      if (context) {
        Sentry.withScope((scope) => {
          if (context.level) scope.setLevel(context.level);
          if (context.user) scope.setUser(context.user);
          if (context.tags) scope.setTags(context.tags);
          if (context.extra) scope.setExtras(context.extra);
          if (context.context) scope.setContext('additional', context.context);
          
          Sentry.captureException(error);
        });
      } else {
        Sentry.captureException(error);
      }

      // Also track in analytics
      analytics.trackError(error, context?.context, context?.extra);
      
    } catch (sentryError) {
      console.error('Error capturing exception:', sentryError, error);
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' | 'fatal' = 'info', context?: any) {
    if (!this.isInitialized) {
      console.log('Monitoring Message:', message, level, context);
      return;
    }

    try {
      if (context) {
        Sentry.withScope((scope) => {
          scope.setLevel(level);
          if (context.user) scope.setUser(context.user);
          if (context.tags) scope.setTags(context.tags);
          if (context.extra) scope.setExtras(context.extra);
          if (context.context) scope.setContext('additional', context.context);
          
          Sentry.captureMessage(message, level);
        });
      } else {
        Sentry.captureMessage(message, level);
      }
    } catch (error) {
      console.error('Error capturing message:', error);
    }
  }

  // Performance monitoring
  trackPerformanceMetric(name: string, value: number, metadata?: Record<string, any>) {
    if (!this.isInitialized) return;

    try {
      // Send to Sentry as measurement
      Sentry.setMeasurement(name, value, 'millisecond');
      
      // Also track in analytics
      analytics.trackPerformance(name, value, 'ms');

      // Log critical performance issues
      if (this.isCriticalPerformanceIssue(name, value)) {
        this.captureMessage(`Performance Issue: ${name} took ${value}ms`, 'warning', {
          extra: { ...metadata, value, metric: name }
        });
      }
    } catch (error) {
      console.error('Error tracking performance metric:', error);
    }
  }

  private isCriticalPerformanceIssue(name: string, value: number): boolean {
    const thresholds: Record<string, number> = {
      'FCP': 3000, // First Contentful Paint > 3s
      'LCP': 4000, // Largest Contentful Paint > 4s
      'CLS': 0.25, // Cumulative Layout Shift > 0.25
      'api_request': 5000, // API request > 5s
      'page_load': 8000 // Page load > 8s
    };

    return thresholds[name] ? value > thresholds[name] : false;
  }

  // API monitoring
  trackApiCall(endpoint: string, method: string, duration: number, statusCode: number, error?: Error) {
    const success = statusCode >= 200 && statusCode < 300;
    
    this.trackPerformanceMetric('api_request', duration, {
      endpoint,
      method,
      statusCode,
      success
    });

    if (!success || error) {
      this.captureMessage(`API Error: ${method} ${endpoint}`, 'error', {
        extra: {
          endpoint,
          method,
          statusCode,
          duration,
          error: error?.message
        }
      });
    }

    // Track in analytics
    analytics.track('API Call', {
      endpoint,
      method,
      duration,
      status_code: statusCode,
      success
    });
  }

  // User monitoring
  setUser(user: { id: string; email?: string; username?: string; [key: string]: any }) {
    if (!this.isInitialized) return;

    try {
      Sentry.setUser(user);
      analytics.identify(user.id, user);
    } catch (error) {
      console.error('Error setting user:', error);
    }
  }

  // Custom breadcrumbs
  addBreadcrumb(message: string, category: string = 'custom', level: 'info' | 'warning' | 'error' = 'info', data?: any) {
    if (!this.isInitialized) return;

    try {
      Sentry.addBreadcrumb({
        message,
        category,
        level,
        data,
        timestamp: Date.now() / 1000
      });
    } catch (error) {
      console.error('Error adding breadcrumb:', error);
    }
  }

  // Transaction monitoring
  startTransaction(name: string, operation: string = 'custom') {
    if (!this.isInitialized) return null;

    try {
      return Sentry.startTransaction({ name, op: operation });
    } catch (error) {
      console.error('Error starting transaction:', error);
      return null;
    }
  }

  // Health monitoring
  async checkHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; checks: Record<string, any> }> {
    const checks: Record<string, any> = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check API health
    try {
      const start = performance.now();
      const response = await fetch('/api/health');
      const duration = performance.now() - start;
      
      checks.api = {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: Math.round(duration),
        statusCode: response.status
      };

      if (!response.ok || duration > 2000) {
        overallStatus = 'degraded';
      }
    } catch (error) {
      checks.api = {
        status: 'unhealthy',
        error: (error as Error).message
      };
      overallStatus = 'unhealthy';
    }

    // Check localStorage
    try {
      const testKey = 'health_check_test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      checks.localStorage = { status: 'healthy' };
    } catch (error) {
      checks.localStorage = { 
        status: 'unhealthy', 
        error: (error as Error).message 
      };
      if (overallStatus !== 'unhealthy') overallStatus = 'degraded';
    }

    // Check Web APIs
    checks.webAPIs = {
      status: 'healthy',
      geolocation: 'geolocation' in navigator,
      camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      notifications: 'Notification' in window,
      serviceWorker: 'serviceWorker' in navigator
    };

    return { status: overallStatus, checks };
  }

  // Cleanup
  cleanup() {
    try {
      this.performanceObserver?.disconnect();
      Sentry.close();
    } catch (error) {
      console.error('Error during monitoring cleanup:', error);
    }
  }
}

// Export singleton instance
export const monitoring = new Monitoring();

// Performance monitoring class (legacy compatibility)
export class PerformanceMonitor {
  track = monitoring.trackPerformanceMetric.bind(monitoring);
  trackApiCall = monitoring.trackApiCall.bind(monitoring);
  startTransaction = monitoring.startTransaction.bind(monitoring);
}

export const performanceMonitor = new PerformanceMonitor();

// Convenience functions
export const captureException = (error: Error, context?: any) => monitoring.captureException(error, context);
export const captureMessage = (message: string, level?: 'info' | 'warning' | 'error' | 'fatal', context?: any) => monitoring.captureMessage(message, level, context);
export const trackPerformance = (name: string, value: number, metadata?: Record<string, any>) => monitoring.trackPerformanceMetric(name, value, metadata);
export const addBreadcrumb = (message: string, category?: string, level?: 'info' | 'warning' | 'error', data?: any) => monitoring.addBreadcrumb(message, category, level, data);

// React Error Boundary integration
export const withErrorBoundary = (WrappedComponent: React.ComponentType<any>, fallback?: React.ComponentType<{ error: Error }>) => {
  return class ErrorBoundary extends React.Component<any, { hasError: boolean; error: Error | null }> {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
      monitoring.captureException(error, {
        extra: errorInfo,
        tags: { component: 'ErrorBoundary' }
      });
    }

    render() {
      if (this.state.hasError && this.state.error) {
        const FallbackComponent = fallback || (() => React.createElement('div', null, 'Something went wrong'));
        return React.createElement(FallbackComponent, { error: this.state.error });
      }

      return React.createElement(WrappedComponent, this.props);
    }
  };
};