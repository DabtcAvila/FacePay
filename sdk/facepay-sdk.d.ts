/**
 * FacePay SDK TypeScript Definitions
 * Version: 1.0.0-production
 * 
 * Production-ready biometric payment authentication SDK
 */

declare namespace FacePay {
  // Error codes
  const enum ErrorCodes {
    NOT_SUPPORTED = 'NOT_SUPPORTED',
    USER_CANCELLED = 'USER_CANCELLED',
    TIMEOUT = 'TIMEOUT',
    NETWORK_ERROR = 'NETWORK_ERROR',
    PAYMENT_FAILED = 'PAYMENT_FAILED',
    AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
    INVALID_CONFIG = 'INVALID_CONFIG',
    STRIPE_ERROR = 'STRIPE_ERROR'
  }

  // Error class
  class FacePayError extends Error {
    readonly name: 'FacePayError';
    readonly code: ErrorCodes;
    readonly isRecoverable: boolean;
    readonly metadata: Record<string, any>;
    readonly timestamp: string;

    constructor(
      code: ErrorCodes,
      message: string,
      isRecoverable?: boolean,
      metadata?: Record<string, any>
    );
  }

  // Configuration interfaces
  interface InitConfig {
    stripeKey?: string;
    environment?: 'development' | 'staging' | 'production';
    timeout?: number;
    debug?: boolean;
    theme?: 'light' | 'dark' | 'auto';
    customCSS?: string;
    locale?: string;
  }

  interface DeviceInfo {
    isMobile: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    isSafari: boolean;
    biometricSupported: boolean;
    biometricType: 'Face ID' | 'Touch ID' | 'Fingerprint' | 'Windows Hello' | 'none';
    userAgent: string;
    platform: string;
    isHTTPS: boolean;
    language: string;
    timezone: string;
  }

  interface SupportResult {
    supported: boolean;
    type: string;
    device: DeviceInfo;
  }

  interface AuthMetadata {
    timestamp: string;
    device: 'mobile' | 'desktop';
    biometric_type: string;
    [key: string]: any;
  }

  interface PaymentResult {
    success: boolean;
    paymentIntent?: any; // Stripe PaymentIntent object
  }

  interface AuthResult {
    success: boolean;
    user: {
      id?: string;
      email?: string;
      name?: string;
      [key: string]: any;
    };
    payment?: PaymentResult;
    metadata: AuthMetadata;
  }

  interface AuthParams {
    amount?: number;
    currency?: string;
    userId?: string;
    onSuccess?: (result: AuthResult) => void;
    onError?: (error: FacePayError) => void;
    onCancel?: (error: FacePayError) => void;
    showModal?: boolean;
    metadata?: Record<string, any>;
  }

  interface VersionInfo {
    version: string;
    features: Record<string, boolean>;
    initialized: boolean;
  }

  // Main SDK class
  class FacePay {
    readonly version: string;
    readonly initialized: boolean;

    constructor();

    /**
     * Initialize the FacePay SDK
     * @param apiKey Your FacePay API key (starts with pk_ or sk_)
     * @param options Optional configuration
     */
    init(apiKey: string, options?: InitConfig): void;

    /**
     * Authenticate user with biometric data and process payment
     * @param params Authentication and payment parameters
     * @returns Promise that resolves with authentication result
     */
    authenticate(params: AuthParams): Promise<AuthResult>;

    /**
     * Check if biometric authentication is supported on this device
     * @returns Promise that resolves with support information
     */
    isSupported(): Promise<SupportResult>;

    /**
     * Get current SDK version and feature flags
     * @returns Version and configuration information
     */
    getVersion(): VersionInfo;

    /**
     * Enable debug logging
     */
    enableDebug(): void;

    /**
     * Create a new FacePay instance with configuration
     * @param apiKey Your FacePay API key
     * @param options Optional configuration
     * @returns New FacePay instance
     */
    static create(apiKey: string, options?: InitConfig): FacePay;

    /**
     * Get SDK version
     */
    static readonly version: string;

    /**
     * Error codes enumeration
     */
    static readonly errorCodes: typeof ErrorCodes;
  }
}

// Global interface for browser environments
interface Window {
  FacePay: typeof FacePay.FacePay;
}

// Module exports
declare const FacePay: FacePay.FacePay;
export = FacePay;
export as namespace FacePay;