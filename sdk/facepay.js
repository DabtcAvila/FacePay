/**
 * FacePay SDK - Lightweight Biometric Authentication for Web
 * Version: 1.0.0
 * Size: <50KB optimized
 * 
 * Simple 5-line integration for developers:
 * 
 * const facePay = new FacePay({ apiKey: 'your-key', baseUrl: 'https://your-api.com' });
 * await facePay.enroll('user@example.com');
 * await facePay.authenticate('user@example.com');
 * const isValid = await facePay.verify(credential);
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
  const VERSION = '1.0.0';
  const DEFAULT_TIMEOUT = 60000; // 60 seconds
  const QUICK_TIMEOUT = 5000; // 5 seconds
  const DEFAULT_BASE_URL = '';
  
  // Error codes
  const ERROR_CODES = {
    NOT_SUPPORTED: 'NOT_SUPPORTED',
    USER_CANCELLED: 'USER_CANCELLED',
    TIMEOUT: 'TIMEOUT',
    SECURITY_ERROR: 'SECURITY_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    INVALID_CONFIG: 'INVALID_CONFIG',
    REGISTRATION_FAILED: 'REGISTRATION_FAILED',
    AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
    VERIFICATION_FAILED: 'VERIFICATION_FAILED'
  };

  /**
   * Custom Error class for FacePay SDK
   */
  class FacePayError extends Error {
    constructor(code, message, isRecoverable = true, suggestedAction = '') {
      super(message);
      this.name = 'FacePayError';
      this.code = code;
      this.isRecoverable = isRecoverable;
      this.suggestedAction = suggestedAction;
      this.timestamp = new Date().toISOString();
    }
  }

  /**
   * Timeout utility with promise support
   */
  function withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new FacePayError(ERROR_CODES.TIMEOUT, errorMessage));
      }, timeoutMs);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeoutId));
    });
  }

  /**
   * Device and browser capability detection
   */
  class CapabilityDetector {
    static async detect() {
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      const isMacOS = /macintosh|mac os x/.test(userAgent) && !isIOS;
      const isWindows = /windows|win32|win64/.test(userAgent);
      const isMobile = /mobile|android|iphone|ipad/.test(userAgent);

      let isSupported = false;
      let isPlatformAuthenticatorAvailable = false;
      let biometricTypes = [];

      // Check WebAuthn support
      if (typeof window !== 'undefined' && window.PublicKeyCredential && navigator.credentials) {
        isSupported = true;
        
        try {
          isPlatformAuthenticatorAvailable = await withTimeout(
            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
            QUICK_TIMEOUT,
            'Platform authenticator check timed out'
          );

          // Infer biometric capabilities
          if (isPlatformAuthenticatorAvailable) {
            if (isIOS) biometricTypes = ['face', 'fingerprint'];
            else if (isAndroid) biometricTypes = ['fingerprint', 'face'];
            else if (isMacOS) biometricTypes = ['fingerprint'];
            else if (isWindows) biometricTypes = ['fingerprint', 'face'];
            else biometricTypes = ['unknown'];
          }
        } catch (error) {
          console.warn('[FacePay] Platform authenticator check failed:', error);
        }
      }

      return {
        isSupported,
        isPlatformAuthenticatorAvailable,
        biometricTypes,
        deviceInfo: {
          platform: navigator.platform,
          isMobile,
          isIOS,
          isAndroid,
          isMacOS,
          isWindows,
          userAgent: navigator.userAgent
        },
        environment: {
          isHTTPS: window.location.protocol === 'https:',
          isLocalhost: window.location.hostname === 'localhost',
          origin: window.location.origin
        }
      };
    }

    static getBiometricName(capabilities) {
      if (capabilities.biometricTypes.includes('face')) {
        return capabilities.deviceInfo.isIOS ? 'Face ID' : 'Face Recognition';
      } else if (capabilities.biometricTypes.includes('fingerprint')) {
        return capabilities.deviceInfo.isIOS ? 'Touch ID' : 
               capabilities.deviceInfo.isWindows ? 'Windows Hello' : 'Fingerprint';
      }
      return 'Biometric Authentication';
    }

    static validateEnvironment() {
      const issues = [];
      
      if (typeof window === 'undefined' || !window.PublicKeyCredential) {
        issues.push('WebAuthn not supported in this browser');
      }
      
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        issues.push('HTTPS required for WebAuthn (except localhost)');
      }
      
      return issues;
    }
  }

  /**
   * WebAuthn integration with auto-retry and fallback mechanisms
   */
  class WebAuthnManager {
    constructor(baseUrl, apiKey) {
      this.baseUrl = baseUrl;
      this.apiKey = apiKey;
      this.retryCount = 3;
      this.retryDelay = 1000; // 1 second
    }

    async makeRequest(endpoint, data, options = {}) {
      const url = `${this.baseUrl}${endpoint}`;
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FacePay-Version': VERSION,
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        body: JSON.stringify(data),
        credentials: 'include',
        ...options
      };

      for (let attempt = 1; attempt <= this.retryCount; attempt++) {
        try {
          const response = await fetch(url, requestOptions);
          
          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.message || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
            
            throw new FacePayError(ERROR_CODES.NETWORK_ERROR, errorMessage);
          }
          
          const result = await response.json();
          if (!result.success) {
            throw new FacePayError(
              ERROR_CODES.NETWORK_ERROR, 
              result.message || 'Request failed'
            );
          }
          
          return result.data || result;
        } catch (error) {
          if (attempt === this.retryCount) {
            if (error instanceof FacePayError) throw error;
            throw new FacePayError(ERROR_CODES.NETWORK_ERROR, error.message);
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    async startRegistration(userInfo) {
      const endpoint = userInfo.userId.includes('demo-') ? 
        '/api/webauthn/demo-register/start' : 
        '/api/webauthn/register/start';
      
      return this.makeRequest(endpoint, userInfo);
    }

    async completeRegistration(credential, userInfo) {
      const endpoint = userInfo.userId.includes('demo-') ? 
        '/api/webauthn/demo-register/complete' : 
        '/api/webauthn/register/complete';
      
      const payload = userInfo.userId.includes('demo-') ? 
        { credential, userId: userInfo.userId } : 
        { credential };
      
      return this.makeRequest(endpoint, payload);
    }

    async startAuthentication(userInfo) {
      return this.makeRequest('/api/webauthn/authenticate/start', userInfo);
    }

    async completeAuthentication(credential, userInfo) {
      return this.makeRequest('/api/webauthn/authenticate/complete', {
        credential,
        email: userInfo.email || userInfo.userId
      });
    }
  }

  /**
   * Base64 URL encoding/decoding utilities
   */
  class Base64Utils {
    static encode(buffer) {
      return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    }

    static decode(str) {
      str = (str + '===').slice(0, str.length + (str.length % 4));
      str = str.replace(/-/g, '+').replace(/_/g, '/');
      const binary = atob(str);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }

    static bufferToBase64URL(buffer) {
      return this.encode(buffer);
    }

    static base64URLToBuffer(base64url) {
      return this.decode(base64url);
    }
  }

  /**
   * WebAuthn credential creation and authentication
   */
  class CredentialManager {
    static async createCredential(options) {
      // Convert base64url strings to ArrayBuffer
      const publicKeyCredentialCreationOptions = {
        ...options,
        challenge: Base64Utils.base64URLToBuffer(options.challenge),
        user: {
          ...options.user,
          id: Base64Utils.base64URLToBuffer(options.user.id)
        },
        excludeCredentials: (options.excludeCredentials || []).map(cred => ({
          ...cred,
          id: Base64Utils.base64URLToBuffer(cred.id)
        }))
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      });

      // Convert ArrayBuffer back to base64url
      return {
        id: credential.id,
        rawId: Base64Utils.bufferToBase64URL(credential.rawId),
        response: {
          attestationObject: Base64Utils.bufferToBase64URL(credential.response.attestationObject),
          clientDataJSON: Base64Utils.bufferToBase64URL(credential.response.clientDataJSON),
          transports: credential.response.getTransports ? credential.response.getTransports() : []
        },
        type: credential.type
      };
    }

    static async getCredential(options) {
      // Convert base64url strings to ArrayBuffer
      const publicKeyCredentialRequestOptions = {
        ...options,
        challenge: Base64Utils.base64URLToBuffer(options.challenge),
        allowCredentials: (options.allowCredentials || []).map(cred => ({
          ...cred,
          id: Base64Utils.base64URLToBuffer(cred.id)
        }))
      };

      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      });

      // Convert ArrayBuffer back to base64url
      return {
        id: credential.id,
        rawId: Base64Utils.bufferToBase64URL(credential.rawId),
        response: {
          authenticatorData: Base64Utils.bufferToBase64URL(credential.response.authenticatorData),
          clientDataJSON: Base64Utils.bufferToBase64URL(credential.response.clientDataJSON),
          signature: Base64Utils.bufferToBase64URL(credential.response.signature),
          userHandle: credential.response.userHandle ? Base64Utils.bufferToBase64URL(credential.response.userHandle) : null
        },
        type: credential.type
      };
    }
  }

  /**
   * Main FacePay SDK Class
   */
  class FacePay {
    /**
     * Initialize FacePay SDK
     * @param {Object} config - Configuration object
     * @param {string} config.apiKey - API key for authentication
     * @param {string} config.baseUrl - Base URL for API endpoints
     * @param {number} config.timeout - Timeout in milliseconds (default: 60000)
     * @param {boolean} config.debug - Enable debug logging (default: false)
     */
    constructor(config = {}) {
      // Validate configuration
      if (!config.apiKey && !config.baseUrl) {
        console.warn('[FacePay] No API key or base URL provided. SDK will work in demo mode.');
      }

      this.config = {
        apiKey: config.apiKey || '',
        baseUrl: config.baseUrl || DEFAULT_BASE_URL,
        timeout: config.timeout || DEFAULT_TIMEOUT,
        debug: config.debug || false,
        ...config
      };

      this.webAuthn = new WebAuthnManager(this.config.baseUrl, this.config.apiKey);
      this.capabilities = null;
      this.version = VERSION;

      // Initialize capabilities on construction
      this.init();
    }

    /**
     * Initialize SDK and detect capabilities
     */
    async init() {
      try {
        this.capabilities = await CapabilityDetector.detect();
        this.log('SDK initialized', { capabilities: this.capabilities });
      } catch (error) {
        this.log('Initialization failed', error);
      }
    }

    /**
     * Debug logging utility
     */
    log(message, data = {}) {
      if (this.config.debug) {
        console.log(`[FacePay SDK v${VERSION}]`, message, data);
      }
    }

    /**
     * Check if biometric authentication is supported
     * @returns {Promise<Object>} Capability information
     */
    async isSupported() {
      if (!this.capabilities) {
        this.capabilities = await CapabilityDetector.detect();
      }

      const envIssues = CapabilityDetector.validateEnvironment();
      
      return {
        supported: this.capabilities.isSupported && this.capabilities.isPlatformAuthenticatorAvailable,
        biometricType: CapabilityDetector.getBiometricName(this.capabilities),
        deviceInfo: this.capabilities.deviceInfo,
        issues: envIssues,
        capabilities: this.capabilities
      };
    }

    /**
     * Enroll a user for biometric authentication
     * @param {string|Object} userIdentifier - User email/ID or user object
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Registration result
     */
    async enroll(userIdentifier, options = {}) {
      this.log('Starting enrollment', { userIdentifier, options });

      try {
        // Validate support
        const support = await this.isSupported();
        if (!support.supported) {
          throw new FacePayError(
            ERROR_CODES.NOT_SUPPORTED,
            'Biometric authentication is not supported on this device',
            false,
            'Please use a device with biometric sensors or try a different browser'
          );
        }

        // Parse user info
        const userInfo = typeof userIdentifier === 'string' ? {
          userId: userIdentifier,
          userName: userIdentifier,
          userDisplayName: userIdentifier
        } : {
          userId: userIdentifier.userId || userIdentifier.email || userIdentifier.id,
          userName: userIdentifier.userName || userIdentifier.email || userIdentifier.name,
          userDisplayName: userIdentifier.userDisplayName || userIdentifier.displayName || userIdentifier.name
        };

        this.log('Parsed user info', userInfo);

        // Step 1: Get registration options
        const registrationOptions = await this.webAuthn.startRegistration(userInfo);
        this.log('Got registration options', { hasOptions: !!registrationOptions });

        // Step 2: Create credential with WebAuthn
        const credential = await withTimeout(
          CredentialManager.createCredential(registrationOptions.options || registrationOptions),
          this.config.timeout,
          'Biometric enrollment timed out. Please try again.'
        );

        this.log('Created credential', { credentialId: credential.id });

        // Step 3: Complete registration
        const verification = await this.webAuthn.completeRegistration(credential, userInfo);
        this.log('Registration completed', { success: verification.verified || verification.success });

        return {
          success: true,
          credentialId: credential.id,
          biometricType: support.biometricType,
          verified: verification.verified || verification.success,
          metadata: {
            timestamp: new Date().toISOString(),
            deviceType: this.capabilities.deviceInfo.isMobile ? 'mobile' : 'desktop',
            platform: this.capabilities.deviceInfo.platform
          }
        };

      } catch (error) {
        this.log('Enrollment failed', error);
        
        if (error instanceof FacePayError) {
          throw error;
        }

        // Handle WebAuthn-specific errors
        if (error.name === 'NotAllowedError') {
          throw new FacePayError(
            ERROR_CODES.USER_CANCELLED,
            'Biometric enrollment was cancelled by user',
            true,
            'Please try again and follow the biometric prompt'
          );
        }

        if (error.name === 'NotSupportedError') {
          throw new FacePayError(
            ERROR_CODES.NOT_SUPPORTED,
            'Biometric authentication is not supported',
            false,
            'Please use a different device or browser'
          );
        }

        throw new FacePayError(
          ERROR_CODES.REGISTRATION_FAILED,
          error.message || 'Enrollment failed',
          true,
          'Please try again or contact support'
        );
      }
    }

    /**
     * Authenticate a user using biometric data
     * @param {string|Object} userIdentifier - User email/ID or authentication options
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Authentication result
     */
    async authenticate(userIdentifier, options = {}) {
      this.log('Starting authentication', { userIdentifier, options });

      try {
        // Validate support
        const support = await this.isSupported();
        if (!support.supported) {
          throw new FacePayError(
            ERROR_CODES.NOT_SUPPORTED,
            'Biometric authentication is not supported on this device',
            false,
            'Please use password authentication instead'
          );
        }

        // Parse user info
        const userInfo = typeof userIdentifier === 'string' ? {
          email: userIdentifier,
          userId: userIdentifier
        } : {
          email: userIdentifier.email || userIdentifier.userId,
          userId: userIdentifier.userId || userIdentifier.email
        };

        this.log('Parsed user info for auth', userInfo);

        // Step 1: Get authentication options
        const authOptions = await this.webAuthn.startAuthentication(userInfo);
        this.log('Got authentication options', { hasOptions: !!authOptions });

        // Step 2: Get credential with WebAuthn
        const credential = await withTimeout(
          CredentialManager.getCredential(authOptions.options || authOptions),
          this.config.timeout,
          'Biometric authentication timed out. Please try again.'
        );

        this.log('Got authentication credential', { credentialId: credential.id });

        // Step 3: Complete authentication
        const verification = await this.webAuthn.completeAuthentication(credential, userInfo);
        this.log('Authentication completed', { success: verification.verified || verification.success });

        return {
          success: true,
          credentialId: credential.id,
          biometricType: support.biometricType,
          verified: verification.verified || verification.success,
          user: verification.user || { email: userInfo.email },
          metadata: {
            timestamp: new Date().toISOString(),
            deviceType: this.capabilities.deviceInfo.isMobile ? 'mobile' : 'desktop',
            platform: this.capabilities.deviceInfo.platform
          }
        };

      } catch (error) {
        this.log('Authentication failed', error);
        
        if (error instanceof FacePayError) {
          throw error;
        }

        // Handle WebAuthn-specific errors
        if (error.name === 'NotAllowedError') {
          throw new FacePayError(
            ERROR_CODES.USER_CANCELLED,
            'Biometric authentication was cancelled by user',
            true,
            'Please try again and follow the biometric prompt'
          );
        }

        if (error.name === 'NotSupportedError') {
          throw new FacePayError(
            ERROR_CODES.NOT_SUPPORTED,
            'Biometric authentication is not supported',
            false,
            'Please use password authentication instead'
          );
        }

        throw new FacePayError(
          ERROR_CODES.AUTHENTICATION_FAILED,
          error.message || 'Authentication failed',
          true,
          'Please try again or use an alternative authentication method'
        );
      }
    }

    /**
     * Verify a biometric credential (utility function)
     * @param {Object} credential - Credential to verify
     * @param {Object} options - Verification options
     * @returns {Promise<Object>} Verification result
     */
    async verify(credential, options = {}) {
      this.log('Verifying credential', { credentialId: credential?.id, options });

      try {
        // This is typically handled server-side, but can be used for client-side validation
        const isValid = !!(credential && credential.id && credential.response);
        
        return {
          valid: isValid,
          credentialId: credential?.id,
          timestamp: new Date().toISOString(),
          details: isValid ? 'Credential structure is valid' : 'Invalid credential format'
        };

      } catch (error) {
        this.log('Verification failed', error);
        
        throw new FacePayError(
          ERROR_CODES.VERIFICATION_FAILED,
          error.message || 'Credential verification failed',
          true,
          'Please check the credential format and try again'
        );
      }
    }

    /**
     * Get detailed diagnostic information for debugging
     * @returns {Promise<Object>} Diagnostic information
     */
    async getDiagnostics() {
      const capabilities = await CapabilityDetector.detect();
      const support = await this.isSupported();
      const envIssues = CapabilityDetector.validateEnvironment();

      return {
        version: VERSION,
        timestamp: new Date().toISOString(),
        config: {
          hasApiKey: !!this.config.apiKey,
          baseUrl: this.config.baseUrl,
          timeout: this.config.timeout,
          debug: this.config.debug
        },
        environment: capabilities.environment,
        capabilities,
        support,
        issues: envIssues,
        userAgent: navigator.userAgent,
        webAuthnSupport: {
          hasPublicKeyCredential: !!window.PublicKeyCredential,
          hasCredentialsApi: !!navigator.credentials,
          hasCreateMethod: !!(navigator.credentials && navigator.credentials.create),
          hasGetMethod: !!(navigator.credentials && navigator.credentials.get)
        }
      };
    }

    /**
     * Test biometric functionality (useful for debugging)
     * @returns {Promise<Object>} Test results
     */
    async test() {
      this.log('Running SDK test');

      const results = {
        timestamp: new Date().toISOString(),
        tests: {},
        overall: 'unknown'
      };

      try {
        // Test 1: Support detection
        results.tests.support = await this.isSupported();
        
        // Test 2: Basic WebAuthn availability
        results.tests.webauthn = {
          available: !!window.PublicKeyCredential,
          credentialsApi: !!navigator.credentials
        };

        // Test 3: Environment check
        const envIssues = CapabilityDetector.validateEnvironment();
        results.tests.environment = {
          https: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
          issues: envIssues
        };

        // Overall result
        const allTestsPassed = results.tests.support.supported && 
                              results.tests.webauthn.available &&
                              results.tests.environment.https &&
                              envIssues.length === 0;

        results.overall = allTestsPassed ? 'pass' : 'fail';
        results.ready = allTestsPassed;

        this.log('Test completed', results);
        return results;

      } catch (error) {
        results.overall = 'error';
        results.error = error.message;
        results.ready = false;
        
        this.log('Test failed', error);
        return results;
      }
    }
  }

  // Static methods for utility functions
  FacePay.isSupported = async function() {
    const detector = new FacePay();
    return detector.isSupported();
  };

  FacePay.test = async function() {
    const detector = new FacePay();
    return detector.test();
  };

  FacePay.version = VERSION;
  FacePay.ERROR_CODES = ERROR_CODES;

  return FacePay;

}));