/**
 * FacePay SDK TypeScript Definitions
 * Version: 1.0.0-production
 * 
 * Production-ready biometric payment authentication SDK
 */

declare namespace FacePay {
  
  /**
   * Error codes used throughout the SDK
   */
  export const enum ErrorCodes {
    NOT_SUPPORTED = 'NOT_SUPPORTED',
    USER_CANCELLED = 'USER_CANCELLED',
    TIMEOUT = 'TIMEOUT',
    NETWORK_ERROR = 'NETWORK_ERROR',
    PAYMENT_FAILED = 'PAYMENT_FAILED',
    AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
    INVALID_CONFIG = 'INVALID_CONFIG',
    STRIPE_ERROR = 'STRIPE_ERROR'
  }

  /**
   * Custom error class for FacePay SDK operations
   */
  export class FacePayError extends Error {
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

  /**
   * SDK Configuration options
   */
  export interface InitConfig {
    /** Stripe publishable key for payment processing */
    stripeKey?: string;
    /** Environment: development, staging, or production */
    environment?: 'development' | 'staging' | 'production';
    /** Timeout in milliseconds (default: 60000) */
    timeout?: number;
    /** Enable debug logging */
    debug?: boolean;
    /** UI theme */
    theme?: 'light' | 'dark' | 'auto';
    /** Custom CSS for styling */
    customCSS?: string;
    /** Locale for internationalization */
    locale?: string;
  }

  /**
   * User information for enrollment and authentication
   */
  export interface UserInfo {
    /** Unique user identifier */
    userId?: string;
    /** User's email address */
    email?: string;
    /** Username for display */
    userName?: string;
    /** Display name for the user */
    userDisplayName?: string;
    /** User's full name */
    name?: string;
    /** User's display name */
    displayName?: string;
    /** User's unique ID */
    id?: string;
  }

  /**
   * Device information
   */
  export interface DeviceInfo {
    /** Device platform string */
    platform: string;
    /** Whether device is mobile */
    isMobile: boolean;
    /** Whether device is iOS */
    isIOS: boolean;
    /** Whether device is Android */
    isAndroid: boolean;
    /** Whether device is macOS */
    isMacOS: boolean;
    /** Whether device is Windows */
    isWindows: boolean;
    /** Browser user agent */
    userAgent: string;
  }

  /**
   * Environment information
   */
  export interface EnvironmentInfo {
    /** Whether connection is HTTPS */
    isHTTPS: boolean;
    /** Whether running on localhost */
    isLocalhost: boolean;
    /** Current origin URL */
    origin: string;
  }

  /**
   * Biometric capabilities detection result
   */
  export interface BiometricCapabilities {
    /** Whether WebAuthn is supported */
    isSupported: boolean;
    /** Whether platform authenticator is available */
    isPlatformAuthenticatorAvailable: boolean;
    /** Available biometric types */
    biometricTypes: ('face' | 'fingerprint' | 'voice' | 'iris' | 'unknown')[];
    /** Device information */
    deviceInfo: DeviceInfo;
    /** Environment information */
    environment: EnvironmentInfo;
  }

  /**
   * Support check result
   */
  export interface SupportResult {
    /** Whether biometric authentication is supported */
    supported: boolean;
    /** Human-readable name of biometric type */
    biometricType: string;
    /** Device information */
    deviceInfo: DeviceInfo;
    /** List of any issues preventing support */
    issues: string[];
    /** Full capabilities object */
    capabilities: BiometricCapabilities;
  }

  /**
   * Enrollment result
   */
  export interface EnrollmentResult {
    /** Whether enrollment was successful */
    success: boolean;
    /** ID of the created credential */
    credentialId: string;
    /** Type of biometric used */
    biometricType: string;
    /** Whether the credential was verified */
    verified: boolean;
    /** Additional metadata */
    metadata: {
      /** Timestamp of enrollment */
      timestamp: string;
      /** Device type used */
      deviceType: 'mobile' | 'desktop';
      /** Platform information */
      platform: string;
    };
  }

  /**
   * Authentication result
   */
  export interface AuthenticationResult {
    /** Whether authentication was successful */
    success: boolean;
    /** ID of the used credential */
    credentialId: string;
    /** Type of biometric used */
    biometricType: string;
    /** Whether the credential was verified */
    verified: boolean;
    /** User information (if available) */
    user?: {
      email?: string;
      id?: string;
      name?: string;
    };
    /** Additional metadata */
    metadata: {
      /** Timestamp of authentication */
      timestamp: string;
      /** Device type used */
      deviceType: 'mobile' | 'desktop';
      /** Platform information */
      platform: string;
    };
  }

  /**
   * Credential verification result
   */
  export interface VerificationResult {
    /** Whether the credential is valid */
    valid: boolean;
    /** ID of the verified credential */
    credentialId?: string;
    /** Timestamp of verification */
    timestamp: string;
    /** Additional details about verification */
    details: string;
  }

  /**
   * Diagnostic information for debugging
   */
  export interface DiagnosticInfo {
    /** SDK version */
    version: string;
    /** Timestamp of diagnostic */
    timestamp: string;
    /** SDK configuration (sensitive data masked) */
    config: {
      hasApiKey: boolean;
      baseUrl: string;
      timeout: number;
      debug: boolean;
    };
    /** Environment information */
    environment: EnvironmentInfo;
    /** Capabilities information */
    capabilities: BiometricCapabilities;
    /** Support check result */
    support: SupportResult;
    /** List of any issues */
    issues: string[];
    /** Browser user agent */
    userAgent: string;
    /** WebAuthn API support details */
    webAuthnSupport: {
      hasPublicKeyCredential: boolean;
      hasCredentialsApi: boolean;
      hasCreateMethod: boolean;
      hasGetMethod: boolean;
    };
  }

  /**
   * Test result for SDK functionality
   */
  export interface TestResult {
    /** Timestamp of test */
    timestamp: string;
    /** Individual test results */
    tests: {
      /** Support detection test */
      support: SupportResult;
      /** WebAuthn availability test */
      webauthn: {
        available: boolean;
        credentialsApi: boolean;
      };
      /** Environment validation test */
      environment: {
        https: boolean;
        issues: string[];
      };
    };
    /** Overall test result */
    overall: 'pass' | 'fail' | 'error' | 'unknown';
    /** Whether SDK is ready for use */
    ready: boolean;
    /** Error message (if overall result is 'error') */
    error?: string;
  }

  /**
   * Additional options for operations
   */
  export interface OperationOptions {
    /** Custom timeout for this operation */
    timeout?: number;
    /** Additional metadata to include */
    metadata?: Record<string, any>;
    /** Custom retry count */
    retryCount?: number;
  }

  /**
   * Main FacePay SDK class
   */
  export class FacePay {
    /** SDK version */
    readonly version: string;
    
    /** Current SDK configuration */
    readonly config: Required<FacePayConfig>;
    
    /** Detected capabilities (available after initialization) */
    capabilities: BiometricCapabilities | null;

    /**
     * Create a new FacePay SDK instance
     * @param config Configuration options
     */
    constructor(config?: FacePayConfig);

    /**
     * Initialize the SDK and detect capabilities
     * Called automatically in constructor, but can be called manually if needed
     */
    init(): Promise<void>;

    /**
     * Check if biometric authentication is supported on this device
     * @returns Promise resolving to support information
     */
    isSupported(): Promise<SupportResult>;

    /**
     * Enroll a user for biometric authentication
     * @param userIdentifier User email/ID or user information object
     * @param options Additional options
     * @returns Promise resolving to enrollment result
     */
    enroll(
      userIdentifier: string | UserInfo,
      options?: OperationOptions
    ): Promise<EnrollmentResult>;

    /**
     * Authenticate a user using biometric data
     * @param userIdentifier User email/ID or user information object
     * @param options Additional options
     * @returns Promise resolving to authentication result
     */
    authenticate(
      userIdentifier: string | UserInfo,
      options?: OperationOptions
    ): Promise<AuthenticationResult>;

    /**
     * Verify a biometric credential (utility function)
     * @param credential Credential object to verify
     * @param options Additional options
     * @returns Promise resolving to verification result
     */
    verify(
      credential: any,
      options?: OperationOptions
    ): Promise<VerificationResult>;

    /**
     * Get detailed diagnostic information for debugging
     * @returns Promise resolving to diagnostic information
     */
    getDiagnostics(): Promise<DiagnosticInfo>;

    /**
     * Test SDK functionality and readiness
     * @returns Promise resolving to test results
     */
    test(): Promise<TestResult>;

    /**
     * Enable or disable debug logging
     * @param enabled Whether to enable debug logging
     */
    setDebug(enabled: boolean): void;

    // Static utility methods

    /**
     * Check if biometric authentication is supported (static version)
     * @returns Promise resolving to support information
     */
    static isSupported(): Promise<SupportResult>;

    /**
     * Test SDK functionality (static version)
     * @returns Promise resolving to test results
     */
    static test(): Promise<TestResult>;

    /** SDK version string */
    static readonly version: string;
    
    /** Error codes enumeration */
    static readonly ERROR_CODES: typeof ERROR_CODES;
  }

  /**
   * Default export is the FacePay class
   */
  export default FacePay;
}

/**
 * Global type declarations for browser environments
 */
declare global {
  interface Window {
    FacePay?: typeof import('facepay').FacePay;
  }
}

/**
 * Module augmentation for popular frameworks
 */

// React types
declare module 'react' {
  interface ComponentProps<T> {
    facePay?: import('facepay').FacePay;
  }
}

// Vue types
declare module 'vue' {
  interface ComponentCustomProps {
    facePay?: import('facepay').FacePay;
  }
}

/**
 * Utility types for advanced usage
 */
export type FacePayInstance = import('facepay').FacePay;
export type FacePayErrorCode = keyof typeof import('facepay').ERROR_CODES;
export type BiometricType = 'face' | 'fingerprint' | 'voice' | 'iris' | 'unknown';
export type DeviceType = 'mobile' | 'desktop';
export type AuthenticationStatus = 'success' | 'failed' | 'cancelled' | 'timeout';

/**
 * Event types for framework integration
 */
export interface FacePayEvents {
  'enrollment-start': { user: string | import('facepay').UserInfo };
  'enrollment-success': import('facepay').EnrollmentResult;
  'enrollment-error': import('facepay').FacePayError;
  'authentication-start': { user: string | import('facepay').UserInfo };
  'authentication-success': import('facepay').AuthenticationResult;
  'authentication-error': import('facepay').FacePayError;
  'capabilities-detected': import('facepay').BiometricCapabilities;
}

/**
 * Promise-based event emitter interface
 */
export interface FacePayEventEmitter {
  on<K extends keyof FacePayEvents>(
    event: K,
    listener: (data: FacePayEvents[K]) => void | Promise<void>
  ): void;
  
  off<K extends keyof FacePayEvents>(
    event: K,
    listener: (data: FacePayEvents[K]) => void | Promise<void>
  ): void;
  
  emit<K extends keyof FacePayEvents>(
    event: K,
    data: FacePayEvents[K]
  ): Promise<void>;
}

/**
 * Configuration validation utility types
 */
export type RequiredConfig = Required<import('facepay').FacePayConfig>;
export type PartialConfig = Partial<import('facepay').FacePayConfig>;

/**
 * Result type unions for type guards
 */
export type FacePayResult = 
  | import('facepay').EnrollmentResult 
  | import('facepay').AuthenticationResult 
  | import('facepay').VerificationResult;

export type FacePayOperation = 'enroll' | 'authenticate' | 'verify' | 'test' | 'diagnose';

/**
 * Advanced configuration for enterprise usage
 */
export interface FacePayEnterpriseConfig extends import('facepay').FacePayConfig {
  /** Custom retry strategy */
  retryStrategy?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  /** Custom error handling */
  errorHandler?: (error: import('facepay').FacePayError) => void;
  /** Analytics callback */
  analytics?: (event: string, data: any) => void;
  /** Custom HTTP headers */
  headers?: Record<string, string>;
  /** Request interceptor */
  requestInterceptor?: (request: RequestInit) => RequestInit | Promise<RequestInit>;
  /** Response interceptor */
  responseInterceptor?: (response: Response) => Response | Promise<Response>;
}