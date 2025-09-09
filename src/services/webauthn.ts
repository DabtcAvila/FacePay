// Browser compatibility and capability types
export interface WebAuthnCapabilities {
  isSupported: boolean
  isPlatformAuthenticatorAvailable: boolean
  isUserVerificationSupported: boolean
  biometricTypes: Array<'fingerprint' | 'face' | 'voice' | 'unknown'>
  deviceInfo: {
    platform: string
    userAgent: string
    isMobile: boolean
    isIOS: boolean
    isAndroid: boolean
    isMacOS: boolean
    isWindows: boolean
  }
}

export interface WebAuthnError {
  code: string
  message: string
  isRecoverable: boolean
  suggestedAction: string
}

export class WebAuthnService {
  /**
   * Comprehensive browser compatibility and capability detection
   */
  static async checkBrowserCapabilities(): Promise<WebAuthnCapabilities> {
    if (typeof window === 'undefined') {
      // Server-side fallback
      return {
        isSupported: false,
        isPlatformAuthenticatorAvailable: false,
        isUserVerificationSupported: false,
        biometricTypes: [],
        deviceInfo: {
          platform: 'server',
          userAgent: 'server',
          isMobile: false,
          isIOS: false,
          isAndroid: false,
          isMacOS: false,
          isWindows: false
        }
      }
    }

    const userAgent = navigator.userAgent.toLowerCase()
    const platform = navigator.platform.toLowerCase()
    
    // Device detection
    const isIOS = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isAndroid = /android/.test(userAgent)
    const isMacOS = /mac/.test(platform) && !isIOS
    const isWindows = /win/.test(platform)
    const isMobile = isIOS || isAndroid || /mobile/.test(userAgent)

    // Basic WebAuthn support
    const isSupported = !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create)
    
    let isPlatformAuthenticatorAvailable = false
    let isUserVerificationSupported = false
    let biometricTypes: Array<'fingerprint' | 'face' | 'voice' | 'unknown'> = []

    if (isSupported) {
      try {
        // Check for platform authenticator availability
        isPlatformAuthenticatorAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        
        // Check for user verification support
        if (window.PublicKeyCredential.isConditionalMediationAvailable) {
          isUserVerificationSupported = await PublicKeyCredential.isConditionalMediationAvailable()
        }

        // Infer biometric capabilities based on device
        if (isPlatformAuthenticatorAvailable) {
          if (isIOS) {
            // iOS devices typically have Face ID or Touch ID
            const hasNotch = window.screen.height / window.screen.width > 2.1 // Rough heuristic for Face ID devices
            biometricTypes = hasNotch ? ['face'] : ['fingerprint']
          } else if (isAndroid) {
            // Android devices vary widely
            biometricTypes = ['fingerprint', 'face']
          } else if (isMacOS) {
            // MacBooks with Touch ID
            biometricTypes = ['fingerprint']
          } else if (isWindows) {
            // Windows Hello
            biometricTypes = ['fingerprint', 'face']
          } else {
            biometricTypes = ['unknown']
          }
        }
      } catch (error) {
        console.warn('Error checking WebAuthn capabilities:', error)
      }
    }

    return {
      isSupported,
      isPlatformAuthenticatorAvailable,
      isUserVerificationSupported,
      biometricTypes,
      deviceInfo: {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        isMobile,
        isIOS,
        isAndroid,
        isMacOS,
        isWindows
      }
    }
  }

  /**
   * Enhanced error handling with user-friendly messages and recovery suggestions
   */
  static handleWebAuthnError(error: any): WebAuthnError {
    const errorCode = error?.name || error?.code || 'unknown'
    
    switch (errorCode) {
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
   * Mock registration for demo purposes
   */
  static async startRegistration(userId: string, userName: string) {
    return {
      success: true,
      options: {
        challenge: new Uint8Array(32),
        rp: { name: 'FacePay', id: 'localhost' },
        user: { id: new TextEncoder().encode(userId), name: userName, displayName: userName },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        timeout: 60000,
        attestation: 'direct',
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        }
      }
    }
  }

  static async completeRegistration(credential: any, userId: string) {
    return {
      success: true,
      result: { verified: true, credential }
    }
  }

  static async startAuthentication(userId: string) {
    return {
      success: true,
      options: {
        challenge: new Uint8Array(32),
        timeout: 60000,
        rpId: 'localhost',
        userVerification: 'required'
      }
    }
  }

  static async completeAuthentication(credential: any, userId: string) {
    return {
      success: true,
      result: { verified: true, credential }
    }
  }
}