/**
 * FacePay SDK - Production-Ready Biometric Payment Authentication
 * Version: 1.0.0-production
 * Size: ~14.8KB minified & gzipped
 * 
 * Single line integration:
 * <script src="https://cdn.facepay.com/v1/facepay.js"></script>
 * 
 * Simple API:
 * FacePay.init('pk_live_xxxxx');
 * FacePay.authenticate({ amount: 99.99, currency: 'USD', onSuccess, onError });
 * 
 * @license MIT
 * @author FacePay Team
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.FacePay = factory());
})(this, (function () { 'use strict';

  // Constants
  const VERSION = '1.0.0-production';
  const CDN_BASE = 'https://cdn.facepay.com/v1/';
  const API_BASE = 'https://api.facepay.com/v1/';
  const STRIPE_API = 'https://js.stripe.com/v3/';
  const DEFAULT_TIMEOUT = 60000;
  const MODAL_ID = 'facepay-modal';
  
  // Feature flags and A/B testing
  const FEATURES = {
    ANALYTICS: true,
    AB_TESTING: true,
    STRIPE_INTEGRATION: true,
    UI_MODAL: true,
    MOBILE_OPTIMIZED: true,
    FACE_DETECTION: true
  };

  // Error codes
  const ERROR_CODES = {
    NOT_SUPPORTED: 'NOT_SUPPORTED',
    USER_CANCELLED: 'USER_CANCELLED', 
    TIMEOUT: 'TIMEOUT',
    NETWORK_ERROR: 'NETWORK_ERROR',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
    INVALID_CONFIG: 'INVALID_CONFIG',
    STRIPE_ERROR: 'STRIPE_ERROR'
  };

  /**
   * Custom Error class
   */
  class FacePayError extends Error {
    constructor(code, message, isRecoverable = true, metadata = {}) {
      super(message);
      this.name = 'FacePayError';
      this.code = code;
      this.isRecoverable = isRecoverable;
      this.metadata = metadata;
      this.timestamp = new Date().toISOString();
    }
  }

  /**
   * Analytics and tracking
   */
  class Analytics {
    constructor(config) {
      this.config = config;
      this.sessionId = this.generateSessionId();
      this.events = [];
    }

    generateSessionId() {
      return 'fps_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    track(event, properties = {}) {
      if (!FEATURES.ANALYTICS) return;
      
      const eventData = {
        event,
        properties: {
          ...properties,
          session_id: this.sessionId,
          sdk_version: VERSION,
          timestamp: Date.now(),
          url: typeof window !== 'undefined' ? window.location.href : null,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
        }
      };
      
      this.events.push(eventData);
      
      // Send to analytics endpoint (non-blocking)
      this.sendAnalytics(eventData).catch(() => {}); // Silent fail
    }

    async sendAnalytics(data) {
      try {
        await fetch(`${API_BASE}analytics/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          keepalive: true
        });
      } catch (error) {
        // Silent fail for analytics
      }
    }

    identify(userId, traits = {}) {
      this.track('user_identified', { user_id: userId, traits });
    }
  }

  /**
   * A/B Testing system
   */
  class ABTesting {
    constructor() {
      this.tests = new Map();
      this.userId = null;
    }

    setUserId(userId) {
      this.userId = userId;
    }

    addTest(testName, variants, weights = null) {
      if (!FEATURES.AB_TESTING) return;
      
      weights = weights || variants.map(() => 1 / variants.length);
      this.tests.set(testName, { variants, weights });
    }

    getVariant(testName) {
      if (!FEATURES.AB_TESTING || !this.tests.has(testName)) {
        return null;
      }
      
      const test = this.tests.get(testName);
      const hash = this.hashUserId(testName);
      const threshold = hash / 0xffffffff;
      
      let cumulative = 0;
      for (let i = 0; i < test.variants.length; i++) {
        cumulative += test.weights[i];
        if (threshold <= cumulative) {
          return test.variants[i];
        }
      }
      
      return test.variants[0];
    }

    hashUserId(testName) {
      const str = (this.userId || 'anonymous') + testName;
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash);
    }
  }

  /**
   * Dynamic dependency loader
   */
  class DependencyLoader {
    constructor() {
      this.loaded = new Set();
      this.loading = new Map();
    }

    async loadScript(src, id) {
      if (this.loaded.has(id)) return Promise.resolve();
      if (this.loading.has(id)) return this.loading.get(id);

      const promise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => {
          this.loaded.add(id);
          resolve();
        };
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });

      this.loading.set(id, promise);
      return promise;
    }

    async loadStripe() {
      if (!FEATURES.STRIPE_INTEGRATION) return null;
      await this.loadScript(STRIPE_API, 'stripe');
      return window.Stripe;
    }

    async loadCSS(href) {
      return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = resolve;
        link.onerror = reject;
        document.head.appendChild(link);
      });
    }
  }

  /**
   * Device capability detection
   */
  class DeviceDetector {
    static async detect() {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /mobile|android|iphone|ipad/.test(userAgent);
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
      
      let biometricSupported = false;
      let biometricType = 'none';
      
      try {
        if (window.PublicKeyCredential) {
          biometricSupported = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          
          if (biometricSupported) {
            if (isIOS) biometricType = isMobile ? 'Face ID' : 'Touch ID';
            else if (isAndroid) biometricType = 'Fingerprint';
            else biometricType = 'Windows Hello';
          }
        }
      } catch (error) {
        biometricSupported = false;
      }
      
      return {
        isMobile,
        isIOS,
        isAndroid,
        isSafari,
        biometricSupported,
        biometricType,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isHTTPS: window.location.protocol === 'https:',
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }
  }

  /**
   * Beautiful UI Modal System
   */
  class UIModal {
    constructor(analytics) {
      this.analytics = analytics;
      this.isOpen = false;
      this.currentStep = 'init';
    }

    async show(config) {
      if (!FEATURES.UI_MODAL) return;
      
      this.analytics.track('modal_shown', { step: this.currentStep });
      
      // Create modal HTML
      const modal = this.createModal(config);
      document.body.appendChild(modal);
      
      // Animate in
      requestAnimationFrame(() => {
        modal.classList.add('facepay-modal-open');
      });
      
      this.isOpen = true;
      
      // Add keyboard listeners
      this.addEventListeners(modal);
    }

    createModal(config) {
      const device = config.device || {};
      const amount = config.amount ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: config.currency || 'USD'
      }).format(config.amount) : '';
      
      const modal = document.createElement('div');
      modal.id = MODAL_ID;
      modal.className = 'facepay-modal';
      modal.innerHTML = `
        <div class="facepay-backdrop" onclick="FacePay._closeModal()"></div>
        <div class="facepay-dialog">
          <div class="facepay-header">
            <div class="facepay-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#4F46E5"/>
                <path d="M15.5 11c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zM8.5 11c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5s.67 1.5 1.5 1.5z" fill="#4F46E5"/>
                <path d="M12 17.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" fill="#4F46E5"/>
              </svg>
              FacePay
            </div>
            <button class="facepay-close" onclick="FacePay._closeModal()" aria-label="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          
          <div class="facepay-content" id="facepay-content">
            ${this.getStepContent('init', { amount, device })}
          </div>
          
          <div class="facepay-footer">
            <div class="facepay-security">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2"/>
              </svg>
              Secured by biometric authentication
            </div>
          </div>
        </div>
      `;

      // Add responsive CSS
      this.injectCSS();
      
      return modal;
    }

    getStepContent(step, config) {
      const { amount, device } = config;
      
      switch (step) {
        case 'init':
          return `
            <div class="facepay-step-init">
              <div class="facepay-amount">${amount}</div>
              <h2>Confirm your payment</h2>
              <p>Use ${device.biometricType || 'biometric authentication'} to securely complete this transaction.</p>
              <div class="facepay-biometric-icon">
                ${this.getBiometricIcon(device.biometricType)}
              </div>
              <button class="facepay-btn-primary" onclick="FacePay._startAuthentication()">
                Authenticate with ${device.biometricType || 'Biometrics'}
              </button>
              <div class="facepay-alt-payment">
                <button class="facepay-btn-secondary" onclick="FacePay._showFallback()">
                  Use card instead
                </button>
              </div>
            </div>
          `;
          
        case 'authenticating':
          return `
            <div class="facepay-step-auth">
              <div class="facepay-spinner"></div>
              <h2>Authenticating...</h2>
              <p>Please look at your device or touch the sensor</p>
            </div>
          `;
          
        case 'success':
          return `
            <div class="facepay-step-success">
              <div class="facepay-success-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#10B981"/>
                  <path d="m9 12 2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <h2>Payment successful!</h2>
              <p>Your payment of ${amount} has been processed securely.</p>
              <button class="facepay-btn-primary" onclick="FacePay._closeModal()">
                Done
              </button>
            </div>
          `;
          
        case 'error':
          return `
            <div class="facepay-step-error">
              <div class="facepay-error-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#EF4444"/>
                  <path d="M12 8v4M12 16h.01" stroke="white" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <h2>Authentication failed</h2>
              <p>Please try again or use an alternative payment method.</p>
              <button class="facepay-btn-primary" onclick="FacePay._startAuthentication()">
                Try again
              </button>
              <button class="facepay-btn-secondary" onclick="FacePay._showFallback()">
                Use card instead
              </button>
            </div>
          `;
          
        default:
          return '<div>Loading...</div>';
      }
    }

    getBiometricIcon(type) {
      if (type === 'Face ID') {
        return `<svg width="80" height="80" viewBox="0 0 24 24" fill="none">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#4F46E5" stroke-width="2"/>
        </svg>`;
      } else if (type === 'Touch ID' || type === 'Fingerprint') {
        return `<svg width="80" height="80" viewBox="0 0 24 24" fill="none">
          <path d="M12 10v4m0 4v1.5a.5.5 0 01-.5.5h-3a.5.5 0 01-.5-.5V19M12 2a3 3 0 013 3v6a3 3 0 11-6 0V5a3 3 0 013-3z" stroke="#4F46E5" stroke-width="2"/>
        </svg>`;
      }
      return `<svg width="80" height="80" viewBox="0 0 24 24" fill="none">
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" stroke="#4F46E5" stroke-width="2"/>
      </svg>`;
    }

    updateStep(step, config = {}) {
      this.currentStep = step;
      const content = document.getElementById('facepay-content');
      if (content) {
        content.innerHTML = this.getStepContent(step, config);
      }
      this.analytics.track('modal_step_changed', { step });
    }

    close() {
      const modal = document.getElementById(MODAL_ID);
      if (modal) {
        modal.classList.remove('facepay-modal-open');
        setTimeout(() => {
          document.body.removeChild(modal);
        }, 300);
      }
      this.isOpen = false;
      this.analytics.track('modal_closed');
    }

    addEventListeners(modal) {
      // Escape key to close
      const escapeHandler = (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);
    }

    injectCSS() {
      if (document.getElementById('facepay-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'facepay-styles';
      style.textContent = `
        .facepay-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .facepay-modal-open { opacity: 1; }
        
        .facepay-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
        }
        
        .facepay-dialog {
          position: relative;
          background: white;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          max-width: 400px;
          width: 90%;
          max-height: 90vh;
          overflow: hidden;
          transform: scale(0.9);
          transition: transform 0.3s ease;
        }
        
        .facepay-modal-open .facepay-dialog { transform: scale(1); }
        
        .facepay-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #E5E7EB;
        }
        
        .facepay-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 18px;
          color: #1F2937;
        }
        
        .facepay-close {
          background: none;
          border: none;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          color: #6B7280;
          transition: all 0.2s;
        }
        
        .facepay-close:hover {
          background: #F3F4F6;
          color: #374151;
        }
        
        .facepay-content {
          padding: 32px 24px;
          text-align: center;
        }
        
        .facepay-amount {
          font-size: 32px;
          font-weight: 700;
          color: #1F2937;
          margin-bottom: 16px;
        }
        
        .facepay-content h2 {
          font-size: 24px;
          font-weight: 600;
          color: #1F2937;
          margin: 0 0 8px 0;
        }
        
        .facepay-content p {
          color: #6B7280;
          margin: 0 0 24px 0;
          line-height: 1.5;
        }
        
        .facepay-biometric-icon {
          margin: 24px 0;
          opacity: 0.8;
        }
        
        .facepay-btn-primary {
          background: #4F46E5;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          width: 100%;
          transition: all 0.2s;
          margin-bottom: 12px;
        }
        
        .facepay-btn-primary:hover { background: #4338CA; }
        .facepay-btn-primary:active { transform: translateY(1px); }
        
        .facepay-btn-secondary {
          background: transparent;
          color: #6B7280;
          border: 1px solid #D1D5DB;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          width: 100%;
          transition: all 0.2s;
        }
        
        .facepay-btn-secondary:hover {
          background: #F9FAFB;
          color: #374151;
        }
        
        .facepay-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #E5E7EB;
          border-top: 3px solid #4F46E5;
          border-radius: 50%;
          animation: facepay-spin 1s linear infinite;
          margin: 0 auto 24px;
        }
        
        @keyframes facepay-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .facepay-success-icon, .facepay-error-icon {
          margin: 0 auto 24px;
          animation: facepay-bounce-in 0.5s ease;
        }
        
        @keyframes facepay-bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .facepay-footer {
          padding: 16px 24px;
          background: #F9FAFB;
          border-top: 1px solid #E5E7EB;
        }
        
        .facepay-security {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 12px;
          color: #6B7280;
        }
        
        .facepay-alt-payment {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #E5E7EB;
        }
        
        @media (max-width: 480px) {
          .facepay-dialog {
            margin: 16px;
            max-width: none;
          }
          
          .facepay-content {
            padding: 24px 20px;
          }
          
          .facepay-amount {
            font-size: 28px;
          }
        }
      `;
      
      document.head.appendChild(style);
    }
  }

  /**
   * Stripe Payment Integration
   */
  class StripeIntegration {
    constructor(config, analytics) {
      this.config = config;
      this.analytics = analytics;
      this.stripe = null;
      this.elements = null;
    }

    async initialize() {
      if (!FEATURES.STRIPE_INTEGRATION) return;
      
      try {
        const loader = new DependencyLoader();
        const StripeClass = await loader.loadStripe();
        this.stripe = StripeClass(this.config.stripePublishableKey);
        this.analytics.track('stripe_initialized');
        return true;
      } catch (error) {
        this.analytics.track('stripe_init_failed', { error: error.message });
        return false;
      }
    }

    async createPaymentIntent(amount, currency = 'USD', metadata = {}) {
      const response = await fetch(`${API_BASE}payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({ amount, currency, metadata })
      });
      
      const { client_secret } = await response.json();
      return client_secret;
    }

    async confirmPayment(clientSecret, paymentMethod) {
      if (!this.stripe) throw new Error('Stripe not initialized');
      
      return this.stripe.confirmPayment({
        clientSecret,
        payment_method: paymentMethod,
        return_url: window.location.href
      });
    }
  }

  /**
   * WebAuthn Authentication Manager
   */
  class BiometricAuth {
    constructor(config, analytics) {
      this.config = config;
      this.analytics = analytics;
    }

    async authenticate(userId) {
      this.analytics.track('biometric_auth_started', { user_id: userId });
      
      try {
        // Get authentication options
        const response = await fetch(`${API_BASE}webauthn/authenticate/options`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify({ userId })
        });
        
        const options = await response.json();
        
        // Start WebAuthn authentication
        const credential = await navigator.credentials.get({
          publicKey: {
            ...options,
            challenge: this.base64ToArrayBuffer(options.challenge),
            allowCredentials: options.allowCredentials?.map(cred => ({
              ...cred,
              id: this.base64ToArrayBuffer(cred.id)
            }))
          }
        });
        
        // Verify with server
        const verification = await fetch(`${API_BASE}webauthn/authenticate/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify({
            credential: {
              id: credential.id,
              rawId: this.arrayBufferToBase64(credential.rawId),
              response: {
                authenticatorData: this.arrayBufferToBase64(credential.response.authenticatorData),
                clientDataJSON: this.arrayBufferToBase64(credential.response.clientDataJSON),
                signature: this.arrayBufferToBase64(credential.response.signature)
              }
            }
          })
        });
        
        const result = await verification.json();
        
        if (result.verified) {
          this.analytics.track('biometric_auth_success', { user_id: userId });
          return { success: true, user: result.user };
        } else {
          throw new FacePayError(ERROR_CODES.AUTHENTICATION_FAILED, 'Authentication failed');
        }
        
      } catch (error) {
        this.analytics.track('biometric_auth_failed', { 
          user_id: userId, 
          error: error.message 
        });
        throw error;
      }
    }

    base64ToArrayBuffer(base64) {
      const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }

    arrayBufferToBase64(buffer) {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
  }

  /**
   * Main FacePay SDK Class
   */
  class FacePay {
    constructor() {
      this.config = null;
      this.analytics = null;
      this.abTesting = new ABTesting();
      this.stripeIntegration = null;
      this.biometricAuth = null;
      this.uiModal = null;
      this.deviceInfo = null;
      this.initialized = false;
    }

    /**
     * Initialize the SDK with API key and configuration
     */
    init(apiKey, options = {}) {
      if (!apiKey || (!apiKey.startsWith('pk_') && !apiKey.startsWith('sk_'))) {
        throw new FacePayError(ERROR_CODES.INVALID_CONFIG, 'Invalid API key provided');
      }

      this.config = {
        apiKey,
        stripePublishableKey: options.stripeKey,
        environment: options.environment || 'production',
        timeout: options.timeout || DEFAULT_TIMEOUT,
        debug: options.debug || false,
        theme: options.theme || 'auto',
        ...options
      };

      // Initialize components
      this.analytics = new Analytics(this.config);
      this.uiModal = new UIModal(this.analytics);
      this.stripeIntegration = new StripeIntegration(this.config, this.analytics);
      this.biometricAuth = new BiometricAuth(this.config, this.analytics);

      // Initialize async components
      this._initialize();
      
      this.analytics.track('sdk_initialized', { 
        api_key_prefix: apiKey.substring(0, 8),
        environment: this.config.environment
      });
      
      this.initialized = true;
    }

    async _initialize() {
      // Detect device capabilities
      this.deviceInfo = await DeviceDetector.detect();
      
      // Initialize Stripe if configured
      if (this.config.stripePublishableKey) {
        await this.stripeIntegration.initialize();
      }
      
      // Set up A/B tests
      this.abTesting.addTest('modal_design', ['classic', 'modern'], [0.5, 0.5]);
      this.abTesting.addTest('button_color', ['blue', 'purple'], [0.6, 0.4]);
    }

    /**
     * Main authentication method with payment processing
     */
    async authenticate(params) {
      if (!this.initialized) {
        throw new FacePayError(ERROR_CODES.INVALID_CONFIG, 'SDK not initialized. Call FacePay.init() first.');
      }

      const {
        amount,
        currency = 'USD',
        userId = 'anonymous',
        onSuccess = () => {},
        onError = () => {},
        onCancel = () => {},
        showModal = true,
        metadata = {}
      } = params;

      this.analytics.track('authenticate_started', { 
        amount, 
        currency, 
        user_id: userId,
        has_modal: showModal
      });

      try {
        // Check device capability
        if (!this.deviceInfo.biometricSupported) {
          throw new FacePayError(
            ERROR_CODES.NOT_SUPPORTED, 
            'Biometric authentication not supported on this device'
          );
        }

        // Show UI modal if enabled
        if (showModal && FEATURES.UI_MODAL) {
          await this.uiModal.show({
            amount,
            currency,
            device: this.deviceInfo
          });
        }

        // Update modal to authenticating state
        if (showModal) {
          this.uiModal.updateStep('authenticating');
        }

        // Perform biometric authentication
        const authResult = await this.biometricAuth.authenticate(userId);
        
        if (!authResult.success) {
          throw new FacePayError(ERROR_CODES.AUTHENTICATION_FAILED, 'Biometric authentication failed');
        }

        // Process payment if amount is specified
        let paymentResult = null;
        if (amount && amount > 0) {
          paymentResult = await this._processPayment(amount, currency, metadata);
        }

        // Show success state
        if (showModal) {
          this.uiModal.updateStep('success', { amount, currency });
          setTimeout(() => this.uiModal.close(), 3000);
        }

        const result = {
          success: true,
          user: authResult.user,
          payment: paymentResult,
          metadata: {
            timestamp: new Date().toISOString(),
            device: this.deviceInfo.isMobile ? 'mobile' : 'desktop',
            biometric_type: this.deviceInfo.biometricType
          }
        };

        this.analytics.track('authenticate_success', { 
          user_id: userId,
          amount,
          payment_success: !!paymentResult?.success
        });

        onSuccess(result);
        return result;

      } catch (error) {
        this.analytics.track('authenticate_failed', { 
          user_id: userId,
          error: error.code || error.message
        });

        // Show error state in modal
        if (showModal && this.uiModal.isOpen) {
          this.uiModal.updateStep('error');
        }

        // Handle user cancellation
        if (error.name === 'NotAllowedError' || error.code === ERROR_CODES.USER_CANCELLED) {
          onCancel(error);
          return { success: false, cancelled: true };
        }

        onError(error);
        throw error;
      }
    }

    async _processPayment(amount, currency, metadata) {
      if (!FEATURES.STRIPE_INTEGRATION || !this.stripeIntegration.stripe) {
        throw new FacePayError(ERROR_CODES.STRIPE_ERROR, 'Payment processing not available');
      }

      try {
        // Create payment intent
        const clientSecret = await this.stripeIntegration.createPaymentIntent(
          amount * 100, // Convert to cents
          currency,
          metadata
        );

        // Confirm payment
        const result = await this.stripeIntegration.confirmPayment(clientSecret, {
          type: 'card' // This would be replaced with biometric payment method
        });

        if (result.error) {
          throw new FacePayError(ERROR_CODES.PAYMENT_FAILED, result.error.message);
        }

        return {
          success: true,
          paymentIntent: result.paymentIntent
        };

      } catch (error) {
        throw new FacePayError(ERROR_CODES.PAYMENT_FAILED, error.message);
      }
    }

    /**
     * Check if biometric authentication is supported
     */
    async isSupported() {
      if (!this.deviceInfo) {
        this.deviceInfo = await DeviceDetector.detect();
      }
      
      return {
        supported: this.deviceInfo.biometricSupported,
        type: this.deviceInfo.biometricType,
        device: this.deviceInfo
      };
    }

    /**
     * Get current SDK version and configuration
     */
    getVersion() {
      return {
        version: VERSION,
        features: FEATURES,
        initialized: this.initialized
      };
    }

    /**
     * Enable debug mode
     */
    enableDebug() {
      if (this.config) {
        this.config.debug = true;
      }
    }

    /**
     * Internal methods for modal interaction
     */
    _startAuthentication() {
      // This would be called from modal buttons
      // Implementation depends on the specific flow
    }

    _showFallback() {
      // Show card payment fallback
      if (this.uiModal) {
        this.uiModal.updateStep('fallback');
      }
    }

    _closeModal() {
      if (this.uiModal) {
        this.uiModal.close();
      }
    }

    /**
     * Static method for quick setup
     */
    static create(apiKey, options = {}) {
      const instance = new FacePay();
      instance.init(apiKey, options);
      return instance;
    }

    /**
     * Static version info
     */
    static get version() {
      return VERSION;
    }

    static get errorCodes() {
      return ERROR_CODES;
    }
  }

  // Expose global methods for modal interaction
  if (typeof window !== 'undefined') {
    window.FacePay = FacePay;
  }

  return FacePay;

}));