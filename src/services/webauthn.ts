'use client';

// Optimized and unified WebAuthn service for biometric authentication
// This service has been cleaned and consolidated from multiple implementations
// Enhanced with timeout handling to prevent UI freezing

import { withTimeout, TimeoutError, TIMEOUTS, isTimeoutError } from '@/utils/timeout';

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
   * Enhanced with timeout to prevent indefinite hanging
   */
  static async checkBrowserCapabilities(): Promise<WebAuthnCapabilities> {
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

    // Check WebAuthn support with timeout
    try {
      if (window.PublicKeyCredential && window.navigator.credentials) {
        isSupported = true
        isPlatformAuthenticatorAvailable = await withTimeout(
          PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
          TIMEOUTS.QUICK_OPERATION,
          'Platform authenticator check timed out',
          'platform-authenticator-check'
        )
        
        // Infer biometric capabilities based on device
        if (isPlatformAuthenticatorAvailable) {
          if (isIOS) {
            biometricTypes = ['face', 'fingerprint']
          } else if (isAndroid) {
            biometricTypes = ['fingerprint', 'face']
          } else if (isMacOS) {
            biometricTypes = ['fingerprint']
          } else if (isWindows) {
            biometricTypes = ['fingerprint', 'face']
          } else {
            biometricTypes = ['unknown']
          }
        }
      }
    } catch (error) {
      if (isTimeoutError(error)) {
        console.warn('[WebAuthn Service] Capabilities check timed out, assuming not available');
      } else {
        console.warn('[WebAuthn Service] Error checking WebAuthn capabilities:', error);
      }
    }

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
   */
  static handleWebAuthnError(error: any): WebAuthnError {
    const errorName = error?.name || error?.code || 'UnknownError'
    const errorMessage = error?.message || ''
    
    console.log('[WebAuthn Service] Handling error:', { errorName, errorMessage, error })
    
    switch (errorName) {
      case 'TimeoutError':
        return {
          code: 'TIMEOUT',
          message: 'Biometric authentication timed out.',
          isRecoverable: true,
          suggestedAction: 'The operation took too long. Please try again or use an alternative method.'
        }
      
      case 'NotSupportedError':
        return {
          code: 'NOT_SUPPORTED',
          message: 'Your browser or device doesn\'t support biometric authentication.',
          isRecoverable: false,
          suggestedAction: 'Please try using a different browser or device, or use traditional password login.'
        }
      
      case 'NotAllowedError':
        return {
          code: 'USER_CANCELLED',
          message: 'Biometric authentication was cancelled or denied.',
          isRecoverable: true,
          suggestedAction: 'Please try again and follow the biometric prompt on your device.'
        }
      
      case 'SecurityError':
        return {
          code: 'SECURITY_ERROR',
          message: 'Security requirements not met for biometric authentication.',
          isRecoverable: false,
          suggestedAction: 'Please ensure you\'re using a secure connection (HTTPS) and try again.'
        }
      
      default:
        return {
          code: 'UNKNOWN',
          message: 'An unexpected error occurred during biometric authentication.',
          isRecoverable: true,
          suggestedAction: 'Please try again or contact support if the problem persists.'
        }
    }
  }

  /**
   * Register a new biometric credential
   * Enhanced with timeout handling to prevent indefinite hanging
   */
  static async register(options: { userId: string; userName: string; userDisplayName: string }, abortSignal?: AbortSignal): Promise<any> {
    const capabilities = await this.checkBrowserCapabilities();
    if (!capabilities.isSupported || !capabilities.isPlatformAuthenticatorAvailable) {
      throw new Error('Biometric authentication is not available on this device');
    }

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const userIdBytes = new TextEncoder().encode(options.userId);

    const registrationOptions = {
      publicKey: {
        challenge,
        rp: {
          name: 'FacePay',
          id: window.location.hostname
        },
        user: {
          id: userIdBytes,
          name: options.userName,
          displayName: options.userDisplayName
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' as const },
          { alg: -257, type: 'public-key' as const }
        ],
        timeout: TIMEOUTS.WEBAUTHN_OPERATION,
        attestation: 'direct' as AttestationConveyancePreference,
        authenticatorSelection: {
          authenticatorAttachment: 'platform' as AuthenticatorAttachment,
          userVerification: 'required' as UserVerificationRequirement,
          requireResidentKey: false
        }
      }
    };

    try {
      // Create credential with timeout and optional abort signal
      let credentialPromise = navigator.credentials.create(registrationOptions) as Promise<PublicKeyCredential>;
      
      // Add abort signal support if provided
      if (abortSignal) {
        credentialPromise = new Promise((resolve, reject) => {
          if (abortSignal.aborted) {
            reject(new Error('Registration was cancelled'));
            return;
          }
          
          const abortListener = () => reject(new Error('Registration was cancelled'));
          abortSignal.addEventListener('abort', abortListener);
          
          credentialPromise
            .then(resolve, reject)
            .finally(() => {
              abortSignal.removeEventListener('abort', abortListener);
            });
        });
      }
      
      const credential = await withTimeout(
        credentialPromise,
        TIMEOUTS.WEBAUTHN_OPERATION,
        'Biometric registration timed out. Please try again.',
        'webauthn-registration'
      );
      
      if (!credential) {
        throw new Error('Failed to create biometric credential');
      }

      return {
        id: credential.id,
        rawId: Array.from(new Uint8Array(credential.rawId)),
        response: {
          attestationObject: Array.from(new Uint8Array((credential.response as AuthenticatorAttestationResponse).attestationObject)),
          clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON))
        },
        type: credential.type
      };
    } catch (err) {
      console.error('[WebAuthn Service] Registration error:', err);
      const webAuthnError = this.handleWebAuthnError(err);
      throw new Error(webAuthnError.message);
    }
  }

  /**
   * Authenticate with existing biometric credential
   * Enhanced with timeout handling to prevent indefinite hanging
   */
  static async authenticate(abortSignal?: AbortSignal): Promise<any> {
    const capabilities = await this.checkBrowserCapabilities();
    if (!capabilities.isSupported || !capabilities.isPlatformAuthenticatorAvailable) {
      throw new Error('Biometric authentication is not available on this device');
    }

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const authenticationOptions = {
      publicKey: {
        challenge,
        timeout: TIMEOUTS.WEBAUTHN_OPERATION,
        rpId: window.location.hostname,
        userVerification: 'required' as UserVerificationRequirement,
        allowCredentials: []
      }
    };

    try {
      // Get credential with timeout and optional abort signal
      let credentialPromise = navigator.credentials.get(authenticationOptions) as Promise<PublicKeyCredential>;
      
      // Add abort signal support if provided
      if (abortSignal) {
        credentialPromise = new Promise((resolve, reject) => {
          if (abortSignal.aborted) {
            reject(new Error('Authentication was cancelled'));
            return;
          }
          
          const abortListener = () => reject(new Error('Authentication was cancelled'));
          abortSignal.addEventListener('abort', abortListener);
          
          credentialPromise
            .then(resolve, reject)
            .finally(() => {
              abortSignal.removeEventListener('abort', abortListener);
            });
        });
      }
      
      const credential = await withTimeout(
        credentialPromise,
        TIMEOUTS.WEBAUTHN_OPERATION,
        'Biometric authentication timed out. Please try again.',
        'webauthn-authentication'
      );
      
      if (!credential) {
        throw new Error('No biometric credential returned');
      }

      return {
        id: credential.id,
        rawId: Array.from(new Uint8Array(credential.rawId)),
        response: {
          authenticatorData: Array.from(new Uint8Array((credential.response as AuthenticatorAssertionResponse).authenticatorData)),
          clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON)),
          signature: Array.from(new Uint8Array((credential.response as AuthenticatorAssertionResponse).signature))
        },
        type: credential.type
      };
    } catch (err) {
      console.error('[WebAuthn Service] Authentication error:', err);
      const webAuthnError = this.handleWebAuthnError(err);
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
}