// Browser compatibility and capability types
export interface BiometricCapabilities {
  isSupported: boolean
  isPlatformAuthenticatorAvailable: boolean
  isUserVerificationSupported: boolean
  biometricTypes: Array<'fingerprint' | 'face' | 'voice' | 'iris' | 'unknown'>
  specificBiometrics: {
    faceID: boolean      // iOS Face ID
    touchID: boolean     // iOS/macOS Touch ID
    windowsHello: boolean // Windows Hello
    androidFingerprint: boolean
    androidFace: boolean
  }
  deviceInfo: {
    platform: string
    userAgent: string
    isMobile: boolean
    isIOS: boolean
    isAndroid: boolean
    isMacOS: boolean
    isWindows: boolean
    osVersion?: string
  }
}

export interface BiometricAuthenticationInfo {
  authenticatorType: 'platform' | 'cross-platform' | 'unknown'
  biometricUsed: boolean
  deviceType: string
  userVerified: boolean
  credentialType: 'single-device' | 'multi-device' | 'unknown'
  platformInfo: {
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
  details?: string
}

export interface BiometricCredential {
  id: string
  rawId: ArrayBuffer
  response: AuthenticatorAttestationResponse | AuthenticatorAssertionResponse
  type: 'public-key'
  authenticatorAttachment?: AuthenticatorAttachment
}

export interface RegistrationOptions {
  rp: PublicKeyCredentialRpEntity
  user: PublicKeyCredentialUserEntity
  challenge: Uint8Array
  pubKeyCredParams: PublicKeyCredentialParameters[]
  timeout: number
  attestation: AttestationConveyancePreference
  authenticatorSelection: AuthenticatorSelectionCriteria
  excludeCredentials?: PublicKeyCredentialDescriptor[]
}

export interface AuthenticationOptions {
  challenge: Uint8Array
  timeout: number
  rpId: string
  allowCredentials?: PublicKeyCredentialDescriptor[]
  userVerification: UserVerificationRequirement
}

// Server-side compatibility check
export interface WebAuthnCapabilities extends BiometricCapabilities {}

export class WebAuthnService {
  /**
   * Analyzes WebAuthn authentication response to determine if biometrics were used
   */
  static analyzeBiometricAuthentication(authenticationInfo: any, deviceInfo: any): BiometricAuthenticationInfo {
    const userAgent = deviceInfo?.userAgent?.toLowerCase() || ''
    const platform = deviceInfo?.platform?.toLowerCase() || ''
    
    // Device detection
    const isIOS = /iphone|ipad|ipod/.test(userAgent) || (platform.includes('mac') && 'maxTouchPoints' in navigator && navigator.maxTouchPoints > 1)
    const isAndroid = /android/.test(userAgent)
    const isMacOS = /mac/.test(platform) && !isIOS
    const isWindows = /win/.test(platform)
    const isMobile = isIOS || isAndroid || /mobile/.test(userAgent)

    // Determine if platform authenticator was used
    const isPlatformAuthenticator = authenticationInfo?.credentialDeviceType === 'singleDevice' ||
                                    authenticationInfo?.credentialBackedUp === false

    // Analyze user verification (indicates biometric usage)
    const userVerified = authenticationInfo?.userVerified === true

    // Log detailed biometric information
    console.log('[WebAuthn Service] Biometric analysis:', {
      isPlatformAuthenticator,
      userVerified,
      deviceType: authenticationInfo?.credentialDeviceType,
      backedUp: authenticationInfo?.credentialBackedUp,
      isIOS, isAndroid, isMacOS, isWindows, isMobile,
      timestamp: new Date().toISOString()
    })

    return {
      authenticatorType: isPlatformAuthenticator ? 'platform' : 'cross-platform',
      biometricUsed: isPlatformAuthenticator && userVerified,
      deviceType: authenticationInfo?.credentialDeviceType || 'unknown',
      userVerified,
      credentialType: authenticationInfo?.credentialBackedUp === false ? 'single-device' : 'multi-device',
      platformInfo: { isMobile, isIOS, isAndroid, isMacOS, isWindows }
    }
  }

  /**
   * Validates that the authentication used real biometrics
   */
  static validateBiometricAuthentication(authenticationInfo: any, deviceInfo: any): { isValid: boolean; reason?: string } {
    const analysis = this.analyzeBiometricAuthentication(authenticationInfo, deviceInfo)
    
    // Must be platform authenticator
    if (analysis.authenticatorType !== 'platform') {
      return {
        isValid: false,
        reason: 'External authenticator used - biometric authentication requires built-in device sensors'
      }
    }

    // Must have user verification (biometric)
    if (!analysis.userVerified) {
      return {
        isValid: false,
        reason: 'User verification not performed - biometric authentication required'
      }
    }

    // Should be single-device credential for better security
    if (analysis.credentialType === 'multi-device') {
      console.warn('[WebAuthn Service] Multi-device credential used - consider encouraging single-device credentials')
    }

    console.log('[WebAuthn Service] Biometric authentication validated successfully:', {
      authenticatorType: analysis.authenticatorType,
      biometricUsed: analysis.biometricUsed,
      deviceType: analysis.deviceType,
      platform: analysis.platformInfo
    })

    return { isValid: true }
  }

  /**
   * Comprehensive browser compatibility and capability detection
   */
  static async checkBrowserCapabilities(): Promise<BiometricCapabilities> {
    if (typeof window === 'undefined') {
      // Server-side fallback
      return {
        isSupported: false,
        isPlatformAuthenticatorAvailable: false,
        isUserVerificationSupported: false,
        biometricTypes: [],
        specificBiometrics: {
          faceID: false,
          touchID: false,
          windowsHello: false,
          androidFingerprint: false,
          androidFace: false
        },
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
        if (typeof window.PublicKeyCredential.isConditionalMediationAvailable === 'function') {
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
        console.warn('[WebAuthn Service] Error checking WebAuthn capabilities:', error)
      }
    }

    return {
      isSupported,
      isPlatformAuthenticatorAvailable,
      isUserVerificationSupported,
      biometricTypes,
      specificBiometrics: {
        faceID: isIOS && isPlatformAuthenticatorAvailable,
        touchID: (isIOS || isMacOS) && isPlatformAuthenticatorAvailable,
        windowsHello: isWindows && isPlatformAuthenticatorAvailable,
        androidFingerprint: isAndroid && isPlatformAuthenticatorAvailable,
        androidFace: isAndroid && isPlatformAuthenticatorAvailable
      },
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
      
      case 'InvalidStateError':
        return {
          code: 'INVALID_STATE',
          message: 'Biometric authenticator is in an invalid state.',
          isRecoverable: true,
          suggestedAction: 'Please try again or restart your browser if the problem persists.'
        }
      
      case 'UnknownError':
        return {
          code: 'UNKNOWN_ERROR',
          message: 'An unknown error occurred during biometric authentication.',
          isRecoverable: true,
          suggestedAction: 'Please try again or contact support if the problem persists.'
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
   * Logs detailed biometric authentication information
   */
  static logBiometricAuthentication(userId: string, authResult: any, deviceInfo: any) {
    const analysis = this.analyzeBiometricAuthentication(authResult, deviceInfo)
    
    console.log('[WebAuthn Service] Biometric authentication completed:', {
      userId,
      success: authResult?.verified || false,
      authenticatorType: analysis.authenticatorType,
      biometricUsed: analysis.biometricUsed,
      deviceType: analysis.deviceType,
      userVerified: analysis.userVerified,
      credentialType: analysis.credentialType,
      platform: analysis.platformInfo,
      timestamp: new Date().toISOString()
    })

    // Log specific biometric types based on platform
    if (analysis.platformInfo.isIOS) {
      console.log('[WebAuthn Service] iOS biometric authentication detected:', {
        possibleTypes: ['Face ID', 'Touch ID'],
        userVerified: analysis.userVerified
      })
    } else if (analysis.platformInfo.isAndroid) {
      console.log('[WebAuthn Service] Android biometric authentication detected:', {
        possibleTypes: ['Fingerprint', 'Face Unlock', 'Iris'],
        userVerified: analysis.userVerified
      })
    } else if (analysis.platformInfo.isMacOS) {
      console.log('[WebAuthn Service] macOS biometric authentication detected:', {
        possibleTypes: ['Touch ID'],
        userVerified: analysis.userVerified
      })
    } else if (analysis.platformInfo.isWindows) {
      console.log('[WebAuthn Service] Windows biometric authentication detected:', {
        possibleTypes: ['Windows Hello - Face', 'Windows Hello - Fingerprint'],
        userVerified: analysis.userVerified
      })
    }
  }
}