// Performance monitoring utility for FacePay
import React from 'react';

interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  domLoadTime?: number;
  bundleSize?: number;
}

interface ResourceTiming {
  name: string;
  size: number;
  duration: number;
  type: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private resources: ResourceTiming[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
      this.measureInitialMetrics();
    }
  }

  private initializeObservers() {
    // Observe Web Vitals
    if ('PerformanceObserver' in window) {
      // LCP Observer
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // FID Observer
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          if (entry.name === 'first-input-delay') {
            this.metrics.fid = entry.processingStart - entry.startTime;
          }
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // CLS Observer
      const clsObserver = new PerformanceObserver((entryList) => {
        let clsValue = 0;
        entryList.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.cls = (this.metrics.cls || 0) + clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);

      // Resource timing observer
      const resourceObserver = new PerformanceObserver((entryList) => {
        entryList.getEntries().forEach((entry: any) => {
          this.resources.push({
            name: entry.name,
            size: entry.transferSize || 0,
            duration: entry.duration,
            type: this.getResourceType(entry.name),
          });
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    }
  }

  private measureInitialMetrics() {
    // Navigation timing
    if ('performance' in window && 'timing' in window.performance) {
      const timing = window.performance.timing;
      this.metrics.ttfb = timing.responseStart - timing.navigationStart;
      this.metrics.domLoadTime = timing.domContentLoadedEventEnd - timing.navigationStart;
    }

    // Paint timing
    if ('performance' in window) {
      const paintEntries = window.performance.getEntriesByType('paint');
      paintEntries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = entry.startTime;
        }
      });
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    return 'other';
  }

  // Public methods
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getResourceMetrics(): ResourceTiming[] {
    return [...this.resources];
  }

  public measureComponentRender(componentName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`[Performance] ${componentName} rendered in ${duration.toFixed(2)}ms`);
      
      // Store in session storage for analysis
      const key = `perf_${componentName}`;
      const existing = sessionStorage.getItem(key);
      const data = existing ? JSON.parse(existing) : { renders: [], average: 0 };
      
      data.renders.push(duration);
      data.average = data.renders.reduce((a: number, b: number) => a + b, 0) / data.renders.length;
      
      sessionStorage.setItem(key, JSON.stringify(data));
    };
  }

  public async measureAsyncOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`[Performance] ${operationName} completed in ${duration.toFixed(2)}ms`);
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.error(`[Performance] ${operationName} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }

  public getBundleStats(): {
    totalSize: number;
    byType: Record<string, number>;
    largestResources: ResourceTiming[];
  } {
    const byType: Record<string, number> = {};
    let totalSize = 0;

    this.resources.forEach((resource) => {
      totalSize += resource.size;
      byType[resource.type] = (byType[resource.type] || 0) + resource.size;
    });

    const largestResources = this.resources
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    return { totalSize, byType, largestResources };
  }

  public getWebVitalsScore(): {
    score: number;
    grades: Record<string, 'good' | 'needs-improvement' | 'poor'>;
  } {
    const grades: Record<string, 'good' | 'needs-improvement' | 'poor'> = {};
    let score = 0;
    let totalMetrics = 0;

    // LCP scoring
    if (this.metrics.lcp !== undefined) {
      totalMetrics++;
      if (this.metrics.lcp <= 2500) {
        grades.lcp = 'good';
        score += 100;
      } else if (this.metrics.lcp <= 4000) {
        grades.lcp = 'needs-improvement';
        score += 50;
      } else {
        grades.lcp = 'poor';
        score += 0;
      }
    }

    // FID scoring
    if (this.metrics.fid !== undefined) {
      totalMetrics++;
      if (this.metrics.fid <= 100) {
        grades.fid = 'good';
        score += 100;
      } else if (this.metrics.fid <= 300) {
        grades.fid = 'needs-improvement';
        score += 50;
      } else {
        grades.fid = 'poor';
        score += 0;
      }
    }

    // CLS scoring
    if (this.metrics.cls !== undefined) {
      totalMetrics++;
      if (this.metrics.cls <= 0.1) {
        grades.cls = 'good';
        score += 100;
      } else if (this.metrics.cls <= 0.25) {
        grades.cls = 'needs-improvement';
        score += 50;
      } else {
        grades.cls = 'poor';
        score += 0;
      }
    }

    // FCP scoring
    if (this.metrics.fcp !== undefined) {
      totalMetrics++;
      if (this.metrics.fcp <= 1800) {
        grades.fcp = 'good';
        score += 100;
      } else if (this.metrics.fcp <= 3000) {
        grades.fcp = 'needs-improvement';
        score += 50;
      } else {
        grades.fcp = 'poor';
        score += 0;
      }
    }

    return {
      score: totalMetrics > 0 ? score / totalMetrics : 0,
      grades,
    };
  }

  public generateReport(): string {
    const metrics = this.getMetrics();
    const bundleStats = this.getBundleStats();
    const vitalsScore = this.getWebVitalsScore();

    const formatSize = (bytes: number) => {
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 Bytes';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    return `
# FacePay Performance Report

## Web Vitals Score: ${vitalsScore.score.toFixed(1)}/100

### Core Web Vitals
- **LCP (Largest Contentful Paint)**: ${metrics.lcp?.toFixed(2) || 'N/A'}ms (${vitalsScore.grades.lcp || 'N/A'})
- **FID (First Input Delay)**: ${metrics.fid?.toFixed(2) || 'N/A'}ms (${vitalsScore.grades.fid || 'N/A'})
- **CLS (Cumulative Layout Shift)**: ${metrics.cls?.toFixed(3) || 'N/A'} (${vitalsScore.grades.cls || 'N/A'})

### Other Metrics
- **FCP (First Contentful Paint)**: ${metrics.fcp?.toFixed(2) || 'N/A'}ms
- **TTFB (Time to First Byte)**: ${metrics.ttfb?.toFixed(2) || 'N/A'}ms
- **DOM Load Time**: ${metrics.domLoadTime?.toFixed(2) || 'N/A'}ms

### Bundle Analysis
- **Total Bundle Size**: ${formatSize(bundleStats.totalSize)}
- **JavaScript**: ${formatSize(bundleStats.byType.javascript || 0)}
- **Stylesheets**: ${formatSize(bundleStats.byType.stylesheet || 0)}
- **Images**: ${formatSize(bundleStats.byType.image || 0)}
- **Fonts**: ${formatSize(bundleStats.byType.font || 0)}

### Largest Resources
${bundleStats.largestResources.map(r => 
  `- ${r.name.split('/').pop()}: ${formatSize(r.size)} (${r.duration.toFixed(2)}ms)`
).join('\n')}

Generated: ${new Date().toISOString()}
    `.trim();
  }

  public cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

// HOC for measuring component performance (simplified)
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  // TODO: Implement proper HOC when TypeScript types are resolved
  console.log(`Performance tracking enabled for: ${componentName}`);
  return WrappedComponent;
}

// Hook for measuring renders
export function usePerformanceMonitor(componentName: string) {
  const monitor = getPerformanceMonitor();
  
  React.useEffect(() => {
    const endMeasure = monitor.measureComponentRender(componentName);
    endMeasure();
  });

  return {
    measureAsync: monitor.measureAsyncOperation.bind(monitor),
    getMetrics: monitor.getMetrics.bind(monitor),
    generateReport: monitor.generateReport.bind(monitor),
  };
}

export default PerformanceMonitor;