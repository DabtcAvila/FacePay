// import mixpanel from 'mixpanel-browser'; // Temporarily disabled

// Analytics Configuration
interface AnalyticsConfig {
  mixpanelToken?: string;
  enableDebug?: boolean;
  enableInProduction?: boolean;
}

class Analytics {
  private isInitialized = false;
  private config: AnalyticsConfig = {};

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined') return; // SSR check

    const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
    const isProduction = process.env.NODE_ENV === 'production';
    const enableDebug = process.env.NODE_ENV === 'development';

    this.config = {
      mixpanelToken: token,
      enableDebug,
      enableInProduction: isProduction || process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'
    };

    // Initialize Mixpanel only in production or when explicitly enabled
    if (token && (this.config.enableInProduction || enableDebug)) {
      try {
        // Temporarily disabled - using console logging instead
        console.log('🎯 Analytics initialized (console mode)');
        this.isInitialized = true;
        this.track('Analytics Initialized', {
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to initialize Analytics:', error);
      }
    } else {
      console.log('📊 Analytics disabled - no token provided or not in production');
    }
  }

  // Core tracking method
  track(eventName: string, properties?: Record<string, any>) {
    if (!this.isInitialized || typeof window === 'undefined') {
      if (this.config.enableDebug) {
        console.log('📊 [Analytics Debug]', eventName, properties);
      }
      return;
    }

    try {
      const enhancedProperties = {
        ...properties,
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        page_title: document.title,
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      // mixpanel.track(eventName, enhancedProperties); // Temporarily disabled
      console.log('📊 [Analytics Track]', eventName, enhancedProperties);
      
      if (this.config.enableDebug) {
        console.log('📊 [Analytics]', eventName, enhancedProperties);
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  // User identification
  identify(userId: string, traits?: Record<string, any>) {
    if (!this.isInitialized || typeof window === 'undefined') return;

    try {
      // mixpanel.identify(userId); // Temporarily disabled
      console.log('📊 [Analytics Identify]', userId, traits);
      // if (traits) {
      //   mixpanel.people.set({
      //     ...traits,
      //     $last_seen: new Date().toISOString()
      //   });
      // }
    } catch (error) {
      console.error('Analytics identify error:', error);
    }
  }

  // User registration tracking
  trackUserRegistration(method: 'email' | 'biometric' | 'webauthn', additionalData?: Record<string, any>) {
    this.track('User Registration', {
      registration_method: method,
      ...additionalData
    });
  }

  // Payment tracking
  trackPayment(amount: number, currency: string, method: string, success: boolean, additionalData?: Record<string, any>) {
    this.track('Payment Attempt', {
      amount,
      currency,
      payment_method: method,
      success,
      revenue: success ? amount : 0,
      ...additionalData
    });
    
    if (success) {
      // mixpanel.people.track_charge(amount); // Temporarily disabled
      console.log('📊 [Analytics Charge]', amount);
    }
  }

  // Biometric authentication tracking
  trackBiometricAuth(type: 'face_id' | 'touch_id' | 'fingerprint' | 'face_recognition', success: boolean, additionalData?: Record<string, any>) {
    this.track('Biometric Authentication', {
      biometric_type: type,
      success,
      ...additionalData
    });
  }

  // Page view tracking
  trackPageView(pageName: string, additionalData?: Record<string, any>) {
    this.track('Page View', {
      page_name: pageName,
      referrer: document.referrer,
      ...additionalData
    });
  }

  // Error tracking
  trackError(error: Error | string, context?: string, additionalData?: Record<string, any>) {
    const errorData = typeof error === 'string' ? { message: error } : {
      message: error.message,
      stack: error.stack,
      name: error.name
    };

    this.track('Error Occurred', {
      ...errorData,
      context,
      ...additionalData
    });
  }

  // Feature usage tracking
  trackFeatureUsage(feature: string, action: string, additionalData?: Record<string, any>) {
    this.track('Feature Usage', {
      feature,
      action,
      ...additionalData
    });
  }

  // Conversion funnel tracking
  trackFunnelStep(funnel: string, step: string, stepNumber: number, additionalData?: Record<string, any>) {
    this.track('Funnel Step', {
      funnel_name: funnel,
      step_name: step,
      step_number: stepNumber,
      ...additionalData
    });
  }

  // A/B test tracking
  trackExperiment(experimentName: string, variant: string, additionalData?: Record<string, any>) {
    this.track('Experiment Viewed', {
      experiment_name: experimentName,
      variant,
      ...additionalData
    });
  }

  // Referral tracking
  trackReferral(referralCode?: string, referredBy?: string, additionalData?: Record<string, any>) {
    this.track('Referral', {
      referral_code: referralCode,
      referred_by: referredBy,
      ...additionalData
    });
  }

  // Session tracking
  trackSessionStart() {
    this.track('Session Started', {
      session_id: this.generateSessionId()
    });
  }

  trackSessionEnd(duration?: number) {
    this.track('Session Ended', {
      duration_seconds: duration
    });
  }

  // User engagement tracking
  trackEngagement(action: string, target?: string, value?: number, additionalData?: Record<string, any>) {
    this.track('User Engagement', {
      action,
      target,
      value,
      ...additionalData
    });
  }

  // Performance tracking
  trackPerformance(metric: string, value: number, unit: string = 'ms') {
    this.track('Performance Metric', {
      metric_name: metric,
      value,
      unit
    });
  }

  // Helper methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Flush pending events (useful before page unload)
  flush() {
    if (this.isInitialized && typeof window !== 'undefined') {
      try {
        // mixpanel.flush(); // Temporarily disabled
        console.log('📊 [Analytics Flush]');
      } catch (error) {
        console.error('Analytics flush error:', error);
      }
    }
  }

  // Reset user data (for logout)
  reset() {
    if (this.isInitialized && typeof window !== 'undefined') {
      try {
        // mixpanel.reset(); // Temporarily disabled
        console.log('📊 [Analytics Reset]');
      } catch (error) {
        console.error('Analytics reset error:', error);
      }
    }
  }
}

// Export singleton instance
export const analytics = new Analytics();

// Convenience function for quick tracking
export const track = (eventName: string, properties?: Record<string, any>) => {
  analytics.track(eventName, properties);
};

// Legacy export for backward compatibility
export class NotificationAnalytics {
  track = analytics.track.bind(analytics);
}

export const notificationAnalytics = new NotificationAnalytics();

// Export types
export interface FunnelStep {
  name: string;
  number: number;
  data?: Record<string, any>;
}

export interface ConversionEvent {
  funnel: string;
  step: FunnelStep;
  userId?: string;
  timestamp?: string;
}

// Common funnels configuration
export const FUNNELS = {
  REGISTRATION: 'user_registration',
  PAYMENT: 'payment_flow',
  REFERRAL: 'referral_flow',
  BIOMETRIC_SETUP: 'biometric_setup'
} as const;

// Common events configuration
export const EVENTS = {
  // User events
  USER_REGISTERED: 'User Registered',
  USER_LOGIN: 'User Login',
  USER_LOGOUT: 'User Logout',
  
  // Payment events
  PAYMENT_INITIATED: 'Payment Initiated',
  PAYMENT_COMPLETED: 'Payment Completed',
  PAYMENT_FAILED: 'Payment Failed',
  
  // Biometric events
  BIOMETRIC_ENROLLED: 'Biometric Enrolled',
  BIOMETRIC_AUTH_SUCCESS: 'Biometric Auth Success',
  BIOMETRIC_AUTH_FAILED: 'Biometric Auth Failed',
  
  // Feature events
  FEATURE_VIEWED: 'Feature Viewed',
  FEATURE_USED: 'Feature Used',
  
  // Error events
  ERROR_OCCURRED: 'Error Occurred',
  API_ERROR: 'API Error'
} as const;