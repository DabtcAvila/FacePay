'use client';

// Real WebAuthn service using SimpleWebAuthn for ACTUAL biometric authentication
// NO SIMULATION OR MOCKING - This service triggers real Face ID/Touch ID prompts
// Enhanced with proper backend integration and real credential verification

import { withTimeout, TimeoutError, TIMEOUTS, isTimeoutError } from '@/utils/timeout';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/types';

// Core types
export interface BiometricCapabilities {
  isSupported: boolean
  isPlatformAuthenticatorAvailable: boolean
  biometricTypes: ('face' | 'fingerprint' | 'voice' | 'iris' | 'unknown')[]
  biometricAvailability: {
    faceID: boolean      // iOS Face ID
    touchID: boolean     // iOS/macOS Touch ID
    windowsHello: boolean // Windows Hello
    androidFingerprint: boolean
    androidFace: boolean
  }
  deviceInfo: {
    platform: string
    isMobile: boolean
    isIOS: boolean
    isAndroid: boolean
    isMacOS: boolean
    isWindows: boolean
    osVersion?: string
  }
}

export interface WebAuthnError {
  code: string
  message: string
  isRecoverable: boolean
  suggestedAction: string
  details?: string
}

export interface WebAuthnCapabilities extends BiometricCapabilities {}

export class WebAuthnService {
  /**
   * Check browser capabilities for WebAuthn and biometric authentication
   * Enhanced with timeout to prevent indefinite hanging and comprehensive debugging
   */
  static async checkBrowserCapabilities(): Promise<WebAuthnCapabilities> {
    // Debug logging for capabilities check
    console.log('[WebAuthn Service] Starting browser capabilities check...');
    console.log('[WebAuthn Service] WebAuthn supported:', 'credentials' in navigator);
    console.log('[WebAuthn Service] PublicKeyCredential:', !!window.PublicKeyCredential);
    console.log('[WebAuthn Service] User Agent:', navigator.userAgent);
    console.log('[WebAuthn Service] Platform:', navigator.platform);
    console.log('[WebAuthn Service] Location:', window.location.href);
    console.log('[WebAuthn Service] Is HTTPS:', window.location.protocol === 'https:');
    console.log('[WebAuthn Service] Is localhost:', window.location.hostname === 'localhost');
    console.log('[WebAuthn Service] Hostname:', window.location.hostname);
    console.log('[WebAuthn Service] Port:', window.location.port);
    console.log('[WebAuthn Service] rpID will be:', window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname);
    let isSupported = false
    let isPlatformAuthenticatorAvailable = false
    let biometricTypes: ('face' | 'fingerprint' | 'voice' | 'iris' | 'unknown')[] = []

    // Check if running in browser
    if (typeof window === 'undefined' || !navigator) {
      return {
        isSupported: false,
        isPlatformAuthenticatorAvailable: false,
        biometricTypes: [],
        biometricAvailability: {
          faceID: false,
          touchID: false,
          windowsHello: false,
          androidFingerprint: false,
          androidFace: false
        },
        deviceInfo: {
          platform: 'server',
          isMobile: false,
          isIOS: false,
          isAndroid: false,
          isMacOS: false,
          isWindows: false
        }
      }
    }

    const userAgent = navigator.userAgent.toLowerCase()
    const isIOS = /iphone|ipad|ipod/.test(userAgent)
    const isAndroid = /android/.test(userAgent)
    const isMacOS = /macintosh|mac os x/.test(userAgent) && !isIOS
    const isWindows = /windows|win32|win64/.test(userAgent)
    const isMobile = /mobile|android|iphone|ipad|phone|blackberry|opera mini|iemobile|wpdesktop/.test(userAgent)

    // Check WebAuthn support with timeout and detailed logging
    try {
      if (window.PublicKeyCredential && window.navigator.credentials) {
        isSupported = true
        console.log('[WebAuthn Service] WebAuthn APIs available, checking platform authenticator...');
        
        isPlatformAuthenticatorAvailable = await withTimeout(
          PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
          TIMEOUTS.QUICK_OPERATION,
          'Platform authenticator check timed out',
          'platform-authenticator-check'
        )
        
        console.log('[WebAuthn Service] Platform authenticator available:', isPlatformAuthenticatorAvailable);
        
        // Check conditional UI availability if supported
        if (PublicKeyCredential.isConditionalMediationAvailable) {
          try {
            const conditionalAvailable = await PublicKeyCredential.isConditionalMediationAvailable();
            console.log('[WebAuthn Service] Conditional UI available:', conditionalAvailable);
          } catch (error) {
            console.log('[WebAuthn Service] Conditional UI check failed:', error);
          }
        } else {
          console.log('[WebAuthn Service] Conditional UI not supported');
        }
        
        // Infer biometric capabilities based on device with detailed logging
        if (isPlatformAuthenticatorAvailable) {
          console.log('[WebAuthn Service] Inferring biometric types for device...');
          
          if (isIOS) {
            biometricTypes = ['face', 'fingerprint']
            console.log('[WebAuthn Service] iOS device - Face ID and Touch ID available');
          } else if (isAndroid) {
            biometricTypes = ['fingerprint', 'face']
            console.log('[WebAuthn Service] Android device - Fingerprint and Face available');
          } else if (isMacOS) {
            biometricTypes = ['fingerprint']
            console.log('[WebAuthn Service] macOS device - Touch ID available');
          } else if (isWindows) {
            biometricTypes = ['fingerprint', 'face']
            console.log('[WebAuthn Service] Windows device - Windows Hello available');
          } else {
            biometricTypes = ['unknown']
            console.log('[WebAuthn Service] Unknown device type - generic biometric available');
          }
        } else {
          console.log('[WebAuthn Service] No platform authenticator available');
        }
      }
    } catch (error) {
      if (isTimeoutError(error)) {
        console.warn('[WebAuthn Service] Capabilities check timed out, assuming not available');
      } else {
        console.error('[WebAuthn Service] Error checking WebAuthn capabilities:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    }
    
    const capabilities = {
      isSupported,
      isPlatformAuthenticatorAvailable,
      biometricTypes,
      biometricAvailability: {
        faceID: isIOS && biometricTypes.includes('face'),
        touchID: (isIOS || isMacOS) && biometricTypes.includes('fingerprint'),
        windowsHello: isWindows && isPlatformAuthenticatorAvailable,
        androidFingerprint: isAndroid && biometricTypes.includes('fingerprint'),
        androidFace: isAndroid && biometricTypes.includes('face')
      },
      deviceInfo: {
        platform: navigator.platform,
        isMobile,
        isIOS,
        isAndroid,
        isMacOS,
        isWindows
      }
    };
    
    console.log('[WebAuthn Service] Final capabilities result:', capabilities);

    return {
      isSupported,
      isPlatformAuthenticatorAvailable,
      biometricTypes,
      biometricAvailability: {
        faceID: isIOS && biometricTypes.includes('face'),
        touchID: (isIOS || isMacOS) && biometricTypes.includes('fingerprint'),
        windowsHello: isWindows && isPlatformAuthenticatorAvailable,
        androidFingerprint: isAndroid && biometricTypes.includes('fingerprint'),
        androidFace: isAndroid && biometricTypes.includes('face')
      },
      deviceInfo: {
        platform: navigator.platform,
        isMobile,
        isIOS,
        isAndroid,
        isMacOS,
        isWindows
      }
    }
  }

  /**
   * Handle WebAuthn errors and convert them to user-friendly messages
   * Enhanced with comprehensive debugging for real WebAuthn operations
   */
  static handleWebAuthnError(error: any): WebAuthnError {
    const errorName = error?.name || error?.code || 'UnknownError'
    const errorMessage = error?.message || ''
    
    // COMPREHENSIVE ERROR LOGGING for debugging WebAuthn issues
    console.error('[WebAuthn Service] DETAILED ERROR ANALYSIS:', {
      errorName,
      errorMessage,
      errorStack: error?.stack,
      errorType: typeof error,
      isWebAuthnError: error?.name?.includes('WebAuthn') || error?.name?.includes('Credential'),
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      origin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
      protocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
      fullError: error
    })
    
    // Log specific WebAuthn error patterns
    if (errorName === 'NotAllowedError') {
      console.warn('[WebAuthn Service] USER CANCELLED OR DENIED biometric prompt - This is expected if user cancels Face ID/Touch ID')
    } else if (errorName === 'NotSupportedError') {
      console.error('[WebAuthn Service] WEBAUTHN NOT SUPPORTED - Device or browser lacks biometric capabilities')
    } else if (errorName === 'SecurityError') {
      console.error('[WebAuthn Service] SECURITY ERROR - Likely HTTPS issue or invalid RP configuration')
    } else if (errorName === 'TimeoutError') {
      console.warn('[WebAuthn Service] TIMEOUT - User took too long or biometric sensor unresponsive')
    } else if (errorMessage?.includes('credentials.create')) {
      console.error('[WebAuthn Service] CREDENTIAL CREATION ERROR - Registration failed')
    } else if (errorMessage?.includes('credentials.get')) {
      console.error('[WebAuthn Service] CREDENTIAL GET ERROR - Authentication failed')
    }
    
    switch (errorName) {
      case 'TimeoutError':
        return {
          code: 'TIMEOUT',
          message: 'Biometric authentication timed out.',
          isRecoverable: true,
          suggestedAction: 'The operation took too long. Please try again or use an alternative method.',
          details: `Timeout after ${TIMEOUTS.WEBAUTHN_OPERATION}ms`
        }
      
      case 'NotSupportedError':
        return {
          code: 'NOT_SUPPORTED',
          message: 'Your browser or device doesn\'t support biometric authentication.',
          isRecoverable: false,
          suggestedAction: 'Please try using a different browser or device, or use traditional password login.',
          details: 'WebAuthn or platform authenticator not supported'
        }
      
      case 'NotAllowedError':
        return {
          code: 'USER_CANCELLED',
          message: 'Biometric authentication was cancelled or denied.',
          isRecoverable: true,
          suggestedAction: 'Please try again and follow the biometric prompt on your device.',
          details: 'User cancelled Face ID/Touch ID prompt or permission denied'
        }
      
      case 'SecurityError':
        return {
          code: 'SECURITY_ERROR',
          message: 'Security requirements not met for biometric authentication.',
          isRecoverable: false,
          suggestedAction: 'Please ensure you\'re using a secure connection (HTTPS) and try again.',
          details: 'HTTPS required or invalid relying party configuration'
        }
      
      case 'InvalidStateError':
        return {
          code: 'INVALID_STATE',
          message: 'Credential already exists or invalid authenticator state.',
          isRecoverable: true,
          suggestedAction: 'This credential may already be registered. Try authenticating instead.',
          details: 'Credential already exists or authenticator in invalid state'
        }
      
      case 'UnknownError':
        return {
          code: 'UNKNOWN',
          message: 'An unexpected error occurred during biometric authentication.',
          isRecoverable: true,
          suggestedAction: 'Please try again or contact support if the problem persists.',
          details: errorMessage || 'Unknown WebAuthn error'
        }
      
      default:
        // Handle HTTP/Network errors from backend
        if (errorMessage?.includes('Failed to fetch') || errorMessage?.includes('NetworkError')) {
          return {
            code: 'NETWORK_ERROR',
            message: 'Network error while communicating with authentication server.',
            isRecoverable: true,
            suggestedAction: 'Check your internet connection and try again.',
            details: 'Network connectivity issue'
          }
        }
        
        if (errorMessage?.includes('400') || errorMessage?.includes('Bad Request')) {
          return {
            code: 'BAD_REQUEST',
            message: 'Invalid authentication request.',
            isRecoverable: false,
            suggestedAction: 'Please refresh the page and try again.',
            details: 'Invalid request format or parameters'
          }
        }
        
        if (errorMessage?.includes('401') || errorMessage?.includes('Unauthorized')) {
          return {
            code: 'UNAUTHORIZED',
            message: 'Authentication failed - credential not verified.',
            isRecoverable: true,
            suggestedAction: 'Please try registering your biometric data again.',
            details: 'Backend authentication verification failed'
          }
        }
        
        return {
          code: 'UNKNOWN',
          message: errorMessage || 'An unexpected error occurred during biometric authentication.',
          isRecoverable: true,
          suggestedAction: 'Please try again or contact support if the problem persists.',
          details: `Unhandled error: ${errorName}`
        }
    }
  }

  /**
   * Register a new biometric credential using REAL WebAuthn
   * Uses SimpleWebAuthn browser library for actual biometric authentication
   * CRITICAL: This will trigger real Face ID/Touch ID prompts
   */
  static async register(options: { userId: string; userName: string; userDisplayName: string }, abortSignal?: AbortSignal): Promise<RegistrationResponseJSON> {
    console.log('[WebAuthn Service] Starting REAL biometric registration:', {
      userId: options.userId,
      userName: options.userName,
      userDisplayName: options.userDisplayName,
      hasAbortSignal: !!abortSignal,
      timestamp: new Date().toISOString(),
      origin: window.location.origin,
      userAgent: navigator.userAgent
    });

    // Log WebAuthn configuration for debugging
    this.logWebAuthnConfiguration();

    const capabilities = await this.checkBrowserCapabilities();
    console.log('[WebAuthn Service] Registration capabilities check:', capabilities);
    
    if (!capabilities.isSupported || !capabilities.isPlatformAuthenticatorAvailable) {
      const error = 'Biometric authentication is not available on this device';
      console.error('[WebAuthn Service] Registration failed - capabilities check:', {
        isSupported: capabilities.isSupported,
        isPlatformAuthenticatorAvailable: capabilities.isPlatformAuthenticatorAvailable,
        biometricTypes: capabilities.biometricTypes,
        deviceInfo: capabilities.deviceInfo
      });
      throw new Error(error);
    }

    try {
      // Step 1: Get registration options from backend
      // Use demo registration endpoint for demo users, regular endpoint for authenticated users
      const isDemo = options.userId.includes('demo-real-')
      const endpoint = isDemo ? '/api/webauthn/demo-register/start' : '/api/webauthn/register/start'
      
      console.log(`[WebAuthn Service] Using ${isDemo ? 'DEMO' : 'REGULAR'} registration endpoint:`, endpoint)
      console.log('[WebAuthn Service] Step 1: Requesting REAL biometric registration options from backend...');
      
      const requestBody = {
        userId: options.userId,
        userName: options.userName,
        userDisplayName: options.userDisplayName
      };
      
      console.log('[WebAuthn Service] Registration request body:', requestBody);
      
      const optionsResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      });
      
      console.log('[WebAuthn Service] Registration options response status:', optionsResponse.status);

      if (!optionsResponse.ok) {
        const errorText = await optionsResponse.text();
        console.error('[WebAuthn Service] Failed to get registration options:', {
          status: optionsResponse.status,
          statusText: optionsResponse.statusText,
          error: errorText
        });
        
        let errorMessage = 'Failed to get registration options';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const responseData = await optionsResponse.json();
      console.log('[WebAuthn Service] Registration options response data:', responseData);
      
      if (!responseData.success || !responseData.data?.options) {
        console.error('[WebAuthn Service] Invalid registration options response format:', responseData);
        throw new Error('Invalid registration options response format');
      }
      
      const registrationOptions = responseData.data.options;

      console.log('[WebAuthn Service] Got registration options from backend:', {
        rpId: registrationOptions.rp?.id,
        rpName: registrationOptions.rp?.name,
        userName: registrationOptions.user?.name,
        userDisplayName: registrationOptions.user?.displayName,
        userVerification: registrationOptions.authenticatorSelection?.userVerification,
        authenticatorAttachment: registrationOptions.authenticatorSelection?.authenticatorAttachment,
        residentKey: registrationOptions.authenticatorSelection?.residentKey,
        attestation: registrationOptions.attestation,
        timeout: registrationOptions.timeout,
        challengeLength: registrationOptions.challenge?.length,
        algorithms: registrationOptions.pubKeyCredParams?.map((p: any) => p.alg),
        excludeCredentials: registrationOptions.excludeCredentials?.length || 0
      });

      // Step 2: REAL biometric registration using SimpleWebAuthn
      // This will trigger the actual Face ID/Touch ID prompt
      console.log('[WebAuthn Service] Step 2: Starting real biometric registration...');
      console.log('[WebAuthn Service] About to call startRegistration() - BIOMETRIC PROMPT WILL APPEAR');
      console.log('[WebAuthn Service] Registration options being passed to startRegistration:', JSON.stringify(registrationOptions, null, 2));
      
      const registrationCredential = await withTimeout(
        startRegistration(registrationOptions),
        TIMEOUTS.WEBAUTHN_OPERATION,
        'Biometric registration timed out. Please try again.',
        'webauthn-registration'
      );
      
      console.log('[WebAuthn Service] startRegistration() completed successfully!');

      console.log('[WebAuthn Service] Real biometric registration completed:', {
        credentialId: registrationCredential.id,
        type: registrationCredential.type,
        rawIdLength: registrationCredential.rawId?.length,
        responseType: registrationCredential.response?.constructor?.name || 'unknown',
        attestationObjectLength: registrationCredential.response?.attestationObject?.length,
        clientDataJSONLength: registrationCredential.response?.clientDataJSON?.length,
        transports: registrationCredential.response?.transports,
        authenticatorDataLength: registrationCredential.response?.authenticatorData?.length,
        timestamp: new Date().toISOString()
      });

      // Step 3: Complete registration on backend
      console.log('[WebAuthn Service] Step 3: Sending credential to backend for verification...');
      
      const completeEndpoint = isDemo ? '/api/webauthn/demo-register/complete' : '/api/webauthn/register/complete'
      console.log(`[WebAuthn Service] Using ${isDemo ? 'DEMO' : 'REGULAR'} completion endpoint:`, completeEndpoint)
      
      const verificationRequestBody = isDemo ? {
        credential: registrationCredential,
        userId: options.userId
      } : {
        credential: registrationCredential
      };
      
      console.log('[WebAuthn Service] Verification request body structure:', {
        hasCredential: !!verificationRequestBody.credential,
        credentialId: verificationRequestBody.credential?.id,
        credentialType: verificationRequestBody.credential?.type,
        userId: isDemo ? options.userId : 'not included for authenticated users'
      });
      
      const verificationResponse = await fetch(completeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationRequestBody),
        credentials: 'include'
      });
      
      console.log('[WebAuthn Service] Verification response status:', verificationResponse.status);

      if (!verificationResponse.ok) {
        const errorText = await verificationResponse.text();
        console.error('[WebAuthn Service] Registration verification failed:', {
          status: verificationResponse.status,
          statusText: verificationResponse.statusText,
          error: errorText
        });
        
        let errorMessage = 'Failed to verify registration';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const verification = await verificationResponse.json();
      console.log('[WebAuthn Service] Registration verification response:', verification);
      
      console.log('[WebAuthn Service] Registration verification completed:', {
        success: verification.success,
        verified: verification.data?.verified,
        biometricVerified: verification.data?.biometricVerified,
        authenticatorType: verification.data?.authenticatorType,
        biometricUsed: verification.data?.biometricUsed,
        deviceType: verification.data?.credential?.deviceType,
        backedUp: verification.data?.credential?.backedUp
      });

      if (!verification.success || !verification.data?.verified) {
        const errorMessage = verification.message || 'Registration verification failed';
        console.error('[WebAuthn Service] Verification unsuccessful:', {
          success: verification.success,
          verified: verification.data?.verified,
          message: verification.message
        });
        throw new Error(errorMessage);
      }

      return registrationCredential;
    } catch (err: any) {
      console.error('[WebAuthn Service] Real registration error details:', {
        name: err?.name,
        message: err?.message,
        code: err?.code,
        stack: err?.stack,
        isTimeoutError: isTimeoutError(err),
        type: typeof err,
        stringified: String(err)
      });
      
      const webAuthnError = this.handleWebAuthnError(err);
      console.error('[WebAuthn Service] Processed registration error:', webAuthnError);
      throw new Error(webAuthnError.message);
    }
  }

  /**
   * Authenticate with existing biometric credential using REAL WebAuthn
   * Uses SimpleWebAuthn browser library for actual biometric authentication  
   * CRITICAL: This will trigger real Face ID/Touch ID prompts
   */
  static async authenticate(options: { email?: string; userId?: string } = {}, abortSignal?: AbortSignal): Promise<AuthenticationResponseJSON> {
    console.log('[WebAuthn Service] Starting REAL biometric authentication:', {
      email: options.email,
      userId: options.userId,
      hasAbortSignal: !!abortSignal,
      timestamp: new Date().toISOString(),
      origin: window.location.origin,
      userAgent: navigator.userAgent
    });

    // Log WebAuthn configuration for debugging
    this.logWebAuthnConfiguration();

    const capabilities = await this.checkBrowserCapabilities();
    console.log('[WebAuthn Service] Authentication capabilities check:', capabilities);
    
    if (!capabilities.isSupported || !capabilities.isPlatformAuthenticatorAvailable) {
      const error = 'Biometric authentication is not available on this device';
      console.error('[WebAuthn Service] Authentication failed - capabilities check:', {
        isSupported: capabilities.isSupported,
        isPlatformAuthenticatorAvailable: capabilities.isPlatformAuthenticatorAvailable,
        biometricTypes: capabilities.biometricTypes,
        deviceInfo: capabilities.deviceInfo
      });
      throw new Error(error);
    }

    try {
      // Step 1: Get authentication options from backend
      console.log('[WebAuthn Service] Step 1: Requesting authentication options from backend...');
      
      const requestBody = {
        email: options.email,
        userId: options.userId
      };
      
      console.log('[WebAuthn Service] Authentication request body:', requestBody);
      
      const optionsResponse = await fetch('/api/webauthn/authenticate/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      });
      
      console.log('[WebAuthn Service] Authentication options response status:', optionsResponse.status);

      if (!optionsResponse.ok) {
        const errorText = await optionsResponse.text();
        console.error('[WebAuthn Service] Failed to get authentication options:', {
          status: optionsResponse.status,
          statusText: optionsResponse.statusText,
          error: errorText
        });
        
        let errorMessage = 'Failed to get authentication options';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const responseData = await optionsResponse.json();
      console.log('[WebAuthn Service] Authentication options response data:', responseData);
      
      if (!responseData.success || !responseData.data?.options) {
        console.error('[WebAuthn Service] Invalid authentication options response format:', responseData);
        throw new Error('Invalid authentication options response format');
      }
      
      const authenticationOptions = responseData.data.options;

      console.log('[WebAuthn Service] Got authentication options from backend:', {
        rpId: authenticationOptions.rpId,
        userVerification: authenticationOptions.userVerification,
        timeout: authenticationOptions.timeout,
        challengeLength: authenticationOptions.challenge?.length,
        allowCredentialsCount: authenticationOptions.allowCredentials?.length || 0,
        biometricRequired: responseData.data.biometricRequired
      });

      // Step 2: REAL biometric authentication using SimpleWebAuthn
      // This will trigger the actual Face ID/Touch ID prompt
      console.log('[WebAuthn Service] Step 2: Starting real biometric authentication...');
      console.log('[WebAuthn Service] About to call startAuthentication() - BIOMETRIC PROMPT WILL APPEAR');
      console.log('[WebAuthn Service] Authentication options being passed to startAuthentication:', JSON.stringify(authenticationOptions, null, 2));
      
      const authenticationCredential = await withTimeout(
        startAuthentication(authenticationOptions),
        TIMEOUTS.WEBAUTHN_OPERATION,
        'Biometric authentication timed out. Please try again.',
        'webauthn-authentication'
      );
      
      console.log('[WebAuthn Service] startAuthentication() completed successfully!');

      console.log('[WebAuthn Service] Real biometric authentication completed:', {
        credentialId: authenticationCredential.id,
        type: authenticationCredential.type,
        rawIdLength: authenticationCredential.rawId?.length,
        responseType: authenticationCredential.response?.constructor?.name || 'unknown',
        authenticatorDataLength: authenticationCredential.response?.authenticatorData?.length,
        clientDataJSONLength: authenticationCredential.response?.clientDataJSON?.length,
        signatureLength: authenticationCredential.response?.signature?.length,
        userHandleLength: authenticationCredential.response?.userHandle?.length || 0,
        timestamp: new Date().toISOString()
      });

      // Step 3: Complete authentication on backend
      console.log('[WebAuthn Service] Step 3: Sending credential to backend for verification...');
      
      const verificationRequestBody = {
        credential: authenticationCredential,
        email: options.email
      };
      
      console.log('[WebAuthn Service] Authentication verification request body structure:', {
        hasCredential: !!verificationRequestBody.credential,
        credentialId: verificationRequestBody.credential?.id,
        credentialType: verificationRequestBody.credential?.type,
        email: verificationRequestBody.email
      });
      
      const verificationResponse = await fetch('/api/webauthn/authenticate/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationRequestBody),
        credentials: 'include'
      });
      
      console.log('[WebAuthn Service] Authentication verification response status:', verificationResponse.status);

      if (!verificationResponse.ok) {
        const errorText = await verificationResponse.text();
        console.error('[WebAuthn Service] Authentication verification failed:', {
          status: verificationResponse.status,
          statusText: verificationResponse.statusText,
          error: errorText
        });
        
        let errorMessage = 'Failed to verify authentication';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const verification = await verificationResponse.json();
      console.log('[WebAuthn Service] Authentication verification response:', verification);
      
      console.log('[WebAuthn Service] Authentication verification completed:', {
        success: verification.success,
        verified: verification.data?.verified,
        biometricVerified: verification.data?.biometricVerified,
        authenticatorType: verification.data?.authenticatorType,
        biometricUsed: verification.data?.biometricUsed,
        userId: verification.data?.user?.id,
        userName: verification.data?.user?.name
      });

      if (!verification.success || !verification.data?.verified) {
        const errorMessage = verification.message || 'Authentication verification failed';
        console.error('[WebAuthn Service] Authentication verification unsuccessful:', {
          success: verification.success,
          verified: verification.data?.verified,
          message: verification.message
        });
        throw new Error(errorMessage);
      }

      // Return the credential along with verification data for UI
      return {
        ...authenticationCredential
      };
    } catch (err: any) {
      console.error('[WebAuthn Service] Real authentication error details:', {
        name: err?.name,
        message: err?.message,
        code: err?.code,
        stack: err?.stack,
        isTimeoutError: isTimeoutError(err),
        type: typeof err,
        stringified: String(err)
      });
      
      const webAuthnError = this.handleWebAuthnError(err);
      console.error('[WebAuthn Service] Processed authentication error:', webAuthnError);
      throw new Error(webAuthnError.message);
    }
  }

  /**
   * Validate biometric authentication result
   */
  static validateBiometricAuthentication(authInfo: any, deviceInfo?: any): { isValid: boolean; reason?: string } {
    if (!authInfo || !authInfo.userVerified) {
      return {
        isValid: false,
        reason: 'User verification not performed - biometric authentication required'
      }
    }

    return { isValid: true }
  }

  /**
   * Analyze biometric authentication
   */
  static analyzeBiometricAuthentication(authInfo: any, deviceInfo?: any): any {
    return {
      userVerified: authInfo?.userVerified || false,
      userPresent: authInfo?.userPresent || false,
      deviceType: deviceInfo?.isMobile ? 'mobile' : 'desktop',
      platformInfo: deviceInfo || {}
    }
  }

  /**
   * Log biometric authentication result
   */
  static logBiometricAuthenticationResult(analysis: any, userId: string, authResult: any): void {
    console.log('[WebAuthn Service] Biometric authentication completed:', {
      userId,
      success: authResult?.verified || false,
      userVerified: analysis?.userVerified || false,
      deviceType: analysis?.deviceType || 'unknown',
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Get friendly biometric type name based on device capabilities
   */
  static getBiometricTypeName(capabilities: WebAuthnCapabilities): string {
    if (capabilities.biometricTypes.includes('face')) {
      return capabilities.deviceInfo.isIOS ? 'Face ID' : 'Face Recognition'
    } else if (capabilities.biometricTypes.includes('fingerprint')) {
      return capabilities.deviceInfo.isIOS ? 'Touch ID' : 
             capabilities.deviceInfo.isWindows ? 'Windows Hello' : 'Fingerprint'
    } else if (capabilities.deviceInfo.isWindows && capabilities.isPlatformAuthenticatorAvailable) {
      return 'Windows Hello'
    }
    
    return 'Biometric Authentication'
  }

  /**
   * Get appropriate biometric icon for device
   */
  static getBiometricIcon(capabilities: WebAuthnCapabilities): string {
    if (capabilities.biometricTypes.includes('face')) {
      return '👤' // Face icon
    } else if (capabilities.biometricTypes.includes('fingerprint')) {
      return '👆' // Fingerprint icon
    } else if (capabilities.deviceInfo.isMobile) {
      return '📱' // Mobile device icon
    } else if (capabilities.deviceInfo.isWindows) {
      return '🔐' // Windows Hello icon
    }
    
    return '🛡️' // Generic security icon
  }

  /**
   * Comprehensive debugging utility for WebAuthn operations
   * Call this method to get detailed system information for troubleshooting
   */
  static async getDebugInfo(): Promise<any> {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
        language: typeof navigator !== 'undefined' ? navigator.language : 'N/A',
        cookieEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : false,
        onLine: typeof navigator !== 'undefined' ? navigator.onLine : false,
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'N/A',
      },
      location: {
        origin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
        protocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
        port: typeof window !== 'undefined' ? window.location.port : 'N/A',
      },
      webauthn: {
        isSupported: typeof window !== 'undefined' && !!window.PublicKeyCredential,
        isUserVerifyingPlatformAuthenticatorAvailable: false,
        isConditionalMediationAvailable: false,
      },
      capabilities: null as WebAuthnCapabilities | null,
      errors: [] as string[]
    }

    try {
      // Check WebAuthn support
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        try {
          debugInfo.webauthn.isUserVerifyingPlatformAuthenticatorAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        } catch (error) {
          debugInfo.errors.push(`Platform authenticator check failed: ${error}`)
        }

        try {
          if (PublicKeyCredential.isConditionalMediationAvailable) {
            debugInfo.webauthn.isConditionalMediationAvailable = await PublicKeyCredential.isConditionalMediationAvailable()
          }
        } catch (error) {
          debugInfo.errors.push(`Conditional mediation check failed: ${error}`)
        }
      }

      // Get detailed capabilities
      try {
        debugInfo.capabilities = await this.checkBrowserCapabilities()
      } catch (error) {
        debugInfo.errors.push(`Capabilities check failed: ${error}`)
      }

    } catch (error) {
      debugInfo.errors.push(`General debug info collection failed: ${error}`)
    }

    console.log('[WebAuthn Service] COMPLETE DEBUG INFO:', debugInfo)
    return debugInfo
  }

  /**
   * Test WebAuthn support with comprehensive logging
   * Use this method to test if WebAuthn will work before attempting registration/authentication
   */
  static async testWebAuthnSupport(): Promise<{ supported: boolean; issues: string[]; recommendations: string[] }> {
    console.log('[WebAuthn Service] TESTING WEBAUTHN SUPPORT...')
    
    const issues: string[] = []
    const recommendations: string[] = []
    let supported = true

    // Test 1: Basic WebAuthn API availability
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      supported = false
      issues.push('WebAuthn API not available')
      recommendations.push('Use a modern browser that supports WebAuthn (Chrome 67+, Firefox 60+, Safari 14+)')
    }

    // Test 2: HTTPS requirement
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      supported = false
      issues.push('HTTPS required for WebAuthn (except localhost)')
      recommendations.push('Use HTTPS in production or test on localhost')
    }

    // Test 3: Platform authenticator availability
    try {
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        if (!isAvailable) {
          supported = false
          issues.push('No platform authenticator available')
          recommendations.push('Enable Face ID/Touch ID on your device or use a device with biometric sensors')
        }
      }
    } catch (error) {
      issues.push(`Platform authenticator check failed: ${error}`)
      recommendations.push('Check device biometric settings and browser permissions')
    }

    // Test 4: Check for common blocking issues
    if (typeof navigator !== 'undefined') {
      if (!navigator.onLine) {
        issues.push('Device appears to be offline')
        recommendations.push('Check internet connection')
      }
    }

    const result = { supported, issues, recommendations }
    console.log('[WebAuthn Service] WEBAUTHN SUPPORT TEST RESULTS:', result)
    return result
  }

  /**
   * Check if we should allow cross-platform authenticators as fallback
   */
  static shouldAllowCrossPlatformFallback(capabilities: WebAuthnCapabilities): boolean {
    return !capabilities.isPlatformAuthenticatorAvailable
  }

  /**
   * Get registration options with fallback support
   */
  static getRegistrationOptionsWithFallback(capabilities: WebAuthnCapabilities) {
    const baseOptions = {
      authenticatorSelection: {
        authenticatorAttachment: 'platform' as const,
        requireResidentKey: false,
        userVerification: 'preferred' as const,
      }
    }

    // If platform authenticator not available, allow cross-platform
    if (this.shouldAllowCrossPlatformFallback(capabilities)) {
      console.log('[WebAuthn Service] Platform authenticator not available, allowing cross-platform fallback')
      return {
        authenticatorSelection: {
          // Remove authenticatorAttachment to allow both platform and cross-platform
          requireResidentKey: false,
          userVerification: 'preferred' as const,
        }
      }
    }

    return baseOptions
  }

  /**
   * Log WebAuthn configuration for debugging
   */
  static logWebAuthnConfiguration(): void {
    console.log('[WebAuthn Service] CONFIGURATION DEBUG:', {
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
      protocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
      port: typeof window !== 'undefined' ? window.location.port : 'N/A',
      origin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
      rpIdWillBe: typeof window !== 'undefined' ? 
        (window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname) : 'N/A',
      isLocalhost: typeof window !== 'undefined' ? window.location.hostname === 'localhost' : false,
      isHTTPS: typeof window !== 'undefined' ? window.location.protocol === 'https:' : false,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
    })
  }
}