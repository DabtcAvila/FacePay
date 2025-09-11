'use client';

import { getPerformanceMonitor } from './performance-monitor';
import { getErrorMonitor } from './error-monitor';

// Comprehensive monitoring integration for FacePay
export interface MonitoringConfig {
  enablePerformanceTracking: boolean;
  enableErrorTracking: boolean;
  enableUserTracking: boolean;
  enableAPIMonitoring: boolean;
  sampleRate: number;
  excludeUrls?: string[];
}

class MonitoringIntegration {
  private config: MonitoringConfig;
  private performanceMonitor = getPerformanceMonitor();
  private errorMonitor = getErrorMonitor();
  private isInitialized = false;

  constructor(config: MonitoringConfig) {
    this.config = config;
    
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Initialize performance monitoring
    if (this.config.enablePerformanceTracking) {
      this.initializePerformanceTracking();
    }

    // Initialize error monitoring  
    if (this.config.enableErrorTracking) {
      this.initializeErrorTracking();
    }

    // Initialize API monitoring
    if (this.config.enableAPIMonitoring) {
      this.initializeAPIMonitoring();
    }

    // Initialize user interaction tracking
    if (this.config.enableUserTracking) {
      this.initializeUserTracking();
    }

    // Set up periodic reporting
    this.setupPeriodicReporting();

    // Set up visibility change handling
    this.setupVisibilityChangeHandling();
  }

  private initializePerformanceTracking() {
    // Track page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const metrics = this.performanceMonitor.getMetrics();
        const vitalsScore = this.performanceMonitor.getWebVitalsScore();
        
        this.sendAnalytics('page_performance', {
          url: window.location.pathname,
          metrics,
          score: vitalsScore.score,
          grades: vitalsScore.grades,
        });
      }, 1000);
    });

    // Track navigation performance
    if ('navigation' in performance) {
      const navigation = performance.navigation;
      const timing = performance.timing;
      
      const navigationMetrics = {
        type: navigation.type,
        redirectCount: navigation.redirectCount,
        domainLookupTime: timing.domainLookupEnd - timing.domainLookupStart,
        connectTime: timing.connectEnd - timing.connectStart,
        requestTime: timing.responseEnd - timing.requestStart,
        domProcessingTime: timing.domContentLoadedEventStart - timing.responseEnd,
        loadTime: timing.loadEventEnd - timing.navigationStart,
      };
      
      this.sendAnalytics('navigation_performance', navigationMetrics);
    }
  }

  private initializeErrorTracking() {
    // Set up error reporting
    const originalLogError = this.errorMonitor.logError.bind(this.errorMonitor);
    
    this.errorMonitor.logError = (error) => {
      originalLogError(error);
      
      // Send critical errors to analytics
      if (error.type === 'error') {
        this.sendAnalytics('error_occurred', {
          message: error.message,
          url: error.url,
          component: error.component,
          stack: error.stack?.substring(0, 500), // Limit stack trace size
        });
      }
    };
  }

  private initializeAPIMonitoring() {
    // Monitor fetch requests
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = args[0]?.toString() || '';
      
      // Skip monitoring for excluded URLs
      if (this.shouldExcludeUrl(url)) {
        return originalFetch(...args);
      }
      
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        this.sendAnalytics('api_request', {
          url: url.replace(/\/\d+/g, '/:id'), // Normalize IDs in URLs
          method: args[1]?.method || 'GET',
          status: response.status,
          duration,
          success: response.ok,
        });
        
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        this.sendAnalytics('api_error', {
          url: url.replace(/\/\d+/g, '/:id'),
          method: args[1]?.method || 'GET',
          duration,
          error: (error as Error).message,
        });
        
        throw error;
      }
    };
  }

  private initializeUserTracking() {
    // Track user interactions
    const interactionTypes = ['click', 'keydown', 'scroll', 'touchstart'];
    
    interactionTypes.forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        // Sample interactions to avoid too much data
        if (Math.random() > this.config.sampleRate) return;
        
        const target = event.target as HTMLElement;
        const elementInfo = this.getElementInfo(target);
        
        this.sendAnalytics('user_interaction', {
          type: eventType,
          element: elementInfo,
          timestamp: Date.now(),
          url: window.location.pathname,
        });
      }, { passive: true });
    });

    // Track form interactions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      const formName = form.name || form.id || 'unnamed_form';
      
      this.sendAnalytics('form_submission', {
        form: formName,
        url: window.location.pathname,
        action: form.action,
      });
    });

    // Track focus events for accessibility
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        this.sendAnalytics('form_field_focus', {
          fieldType: target.tagName.toLowerCase(),
          inputType: (target as HTMLInputElement).type || 'text',
          fieldName: (target as HTMLInputElement).name || 'unnamed_field',
        });
      }
    });
  }

  private getElementInfo(element: HTMLElement) {
    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || undefined,
      className: element.className || undefined,
      text: element.textContent?.substring(0, 50) || undefined,
    };
  }

  private setupPeriodicReporting() {
    // Send performance summary every 5 minutes
    setInterval(() => {
      const performanceSummary = this.performanceMonitor.getBundleStats();
      const errorSummary = this.errorMonitor.getErrorSummary();
      
      this.sendAnalytics('periodic_report', {
        performance: performanceSummary,
        errors: errorSummary,
        timestamp: Date.now(),
        url: window.location.pathname,
      });
    }, 5 * 60 * 1000);
  }

  private setupVisibilityChangeHandling() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden - send final metrics
        this.sendFinalMetrics();
      } else {
        // Page is visible again - reset monitoring
        this.resetMetrics();
      }
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.sendFinalMetrics();
    });
  }

  private sendFinalMetrics() {
    const finalMetrics = {
      performance: this.performanceMonitor.getMetrics(),
      errors: this.errorMonitor.getErrorSummary(),
      bundleStats: this.performanceMonitor.getBundleStats(),
      sessionDuration: Date.now() - (window.performance?.timing?.navigationStart || 0),
    };
    
    // Use sendBeacon for reliable delivery during page unload
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', JSON.stringify({
        event: 'session_end',
        data: finalMetrics,
      }));
    } else {
      this.sendAnalytics('session_end', finalMetrics);
    }
  }

  private resetMetrics() {
    // Reset counters for new session
    this.performanceMonitor.generateReport(); // This will reset some metrics
  }

  private shouldExcludeUrl(url: string): boolean {
    if (!this.config.excludeUrls) return false;
    
    return this.config.excludeUrls.some(excludeUrl => 
      url.includes(excludeUrl)
    );
  }

  private sendAnalytics(event: string, data: any) {
    // Sample events based on sample rate
    if (Math.random() > this.config.sampleRate) return;
    
    const payload = {
      event,
      data,
      timestamp: Date.now(),
      url: window.location.pathname,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };

    // Send to analytics endpoint
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Silently fail if analytics endpoint is unavailable
      });
    } else {
      // Log in development
      console.log('[Analytics]', event, data);
    }
  }

  // Public methods
  trackCustomEvent(event: string, data: any) {
    this.sendAnalytics(`custom_${event}`, data);
  }

  trackPageView(page: string) {
    this.sendAnalytics('page_view', {
      page,
      referrer: document.referrer,
      timestamp: Date.now(),
    });
  }

  trackUserAction(action: string, category: string, label?: string, value?: number) {
    this.sendAnalytics('user_action', {
      action,
      category,
      label,
      value,
    });
  }

  trackTiming(category: string, variable: string, duration: number, label?: string) {
    this.sendAnalytics('timing', {
      category,
      variable,
      duration,
      label,
    });
  }

  generateHealthReport(): string {
    const performanceReport = this.performanceMonitor.generateReport();
    const errorReport = this.errorMonitor.generateErrorReport();
    
    return `
# FacePay Health Report

${performanceReport}

${errorReport}

## System Status
- **Monitoring Active**: ${this.isInitialized ? 'Yes' : 'No'}
- **Performance Tracking**: ${this.config.enablePerformanceTracking ? 'Enabled' : 'Disabled'}
- **Error Tracking**: ${this.config.enableErrorTracking ? 'Enabled' : 'Disabled'}
- **API Monitoring**: ${this.config.enableAPIMonitoring ? 'Enabled' : 'Disabled'}
- **User Tracking**: ${this.config.enableUserTracking ? 'Enabled' : 'Disabled'}
- **Sample Rate**: ${(this.config.sampleRate * 100).toFixed(1)}%

Generated: ${new Date().toISOString()}
    `.trim();
  }
}

// Default configuration for FacePay
const DEFAULT_CONFIG: MonitoringConfig = {
  enablePerformanceTracking: true,
  enableErrorTracking: true,
  enableUserTracking: true,
  enableAPIMonitoring: true,
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in production, 100% in development
  excludeUrls: [
    '/api/health',
    '/api/monitoring',
    '/analytics',
    '/_next/',
    '/static/',
  ],
};

// Singleton instance
let monitoringIntegration: MonitoringIntegration | null = null;

export function initializeMonitoring(config: Partial<MonitoringConfig> = {}): MonitoringIntegration {
  if (!monitoringIntegration) {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    monitoringIntegration = new MonitoringIntegration(finalConfig);
  }
  return monitoringIntegration;
}

export function getMonitoring(): MonitoringIntegration | null {
  return monitoringIntegration;
}

// React hook for monitoring
export function useMonitoring() {
  const monitoring = getMonitoring();
  
  return {
    trackEvent: monitoring?.trackCustomEvent.bind(monitoring),
    trackPageView: monitoring?.trackPageView.bind(monitoring),
    trackUserAction: monitoring?.trackUserAction.bind(monitoring),
    trackTiming: monitoring?.trackTiming.bind(monitoring),
    generateReport: monitoring?.generateHealthReport.bind(monitoring),
  };
}

export default MonitoringIntegration;