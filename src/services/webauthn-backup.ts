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
   * Register a new biometric credential using WebAuthn
   * This function creates a new credential using the device's biometric authentication
   */
  static async registerWithBiometric(
    username: string,
    displayName: string,
    userId: string
  ): Promise<{ success: boolean; credential?: BiometricCredential; error?: WebAuthnError }> {
    try {
      // Check browser capabilities first
      const capabilities = await this.checkBrowserCapabilities()
      
      if (!capabilities.isSupported) {
        return {
          success: false,
          error: {
            code: 'NOT_SUPPORTED',
            message: 'WebAuthn is not supported in this browser',
            isRecoverable: false,
            suggestedAction: 'Please use a modern browser that supports WebAuthn'
          }
        }
      }

      if (!capabilities.isPlatformAuthenticatorAvailable) {
        return {
          success: false,
          error: {
            code: 'NO_PLATFORM_AUTHENTICATOR',
            message: 'No biometric authenticator available on this device',
            isRecoverable: false,
            suggestedAction: 'Please ensure your device has biometric authentication enabled'
          }
        }
      }

      console.log('[WebAuthn Service] Starting biometric registration for user:', {
        username,
        displayName,
        userId,
        capabilities: capabilities.specificBiometrics,
        device: capabilities.deviceInfo
      })

      // Generate a random challenge
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      // Prepare registration options with biometric requirements
      const registrationOptions: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: {
            name: 'FacePay',
            id: window.location.hostname
          },
          user: {
            id: new TextEncoder().encode(userId),
            name: username,
            displayName
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          timeout: 60000,
          attestation: 'direct',
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Require platform authenticator
            userVerification: 'required', // Require biometric verification
            requireResidentKey: true // Store credential on device
          }
        }
      }

      console.log('[WebAuthn Service] Creating credential with options:', {
        requiresPlatform: true,
        requiresUserVerification: true,
        timeout: registrationOptions.publicKey?.timeout
      })

      // Create the credential using navigator.credentials.create
      const credential = await navigator.credentials.create(registrationOptions) as PublicKeyCredential

      if (!credential) {
        return {
          success: false,
          error: {
            code: 'CREDENTIAL_CREATION_FAILED',
            message: 'Failed to create biometric credential',
            isRecoverable: true,
            suggestedAction: 'Please try again and follow the biometric prompts'
          }
        }
      }

      // Validate that biometric authentication was used
      const response = credential.response as AuthenticatorAttestationResponse
      const authData = response.getAuthenticatorData()
      
      // Parse authenticator data to check flags
      const authDataArray = new Uint8Array(authData)
      const flags = authDataArray[32] // Flags are at byte 32
      const userVerified = (flags & 0x04) !== 0 // UV flag
      const userPresent = (flags & 0x01) !== 0 // UP flag

      if (!userVerified) {
        return {
          success: false,
          error: {
            code: 'BIOMETRIC_NOT_USED',
            message: 'Biometric authentication was not performed during registration',
            isRecoverable: true,
            suggestedAction: 'Please try again and complete the biometric authentication prompt'
          }
        }
      }

      const biometricCredential: BiometricCredential = {
        id: credential.id,
        rawId: credential.rawId,
        response: credential.response as AuthenticatorAttestationResponse,
        type: credential.type as 'public-key',
        authenticatorAttachment: (credential.authenticatorAttachment as AuthenticatorAttachment) || undefined
      }

      console.log('[WebAuthn Service] Biometric registration successful:', {
        credentialId: credential.id,
        userVerified,
        userPresent,
        authenticatorAttachment: credential.authenticatorAttachment,
        deviceInfo: capabilities.deviceInfo
      })

      return {
        success: true,
        credential: biometricCredential
      }

    } catch (error: any) {
      console.error('[WebAuthn Service] Registration error:', error)
      return {
        success: false,
        error: this.handleWebAuthnError(error)
      }
    }
  }

  /**
   * Authenticate using existing biometric credential
   * This function verifies the user using their registered biometric credential
   */
  static async authenticateWithBiometric(
    credentialId?: string
  ): Promise<{ success: boolean; credential?: BiometricCredential; biometricInfo?: BiometricAuthenticationInfo; error?: WebAuthnError }> {
    try {
      // Check browser capabilities first
      const capabilities = await this.checkBrowserCapabilities()
      
      if (!capabilities.isSupported) {
        return {
          success: false,
          error: {
            code: 'NOT_SUPPORTED',
            message: 'WebAuthn is not supported in this browser',
            isRecoverable: false,
            suggestedAction: 'Please use a modern browser that supports WebAuthn'
          }
        }
      }

      if (!capabilities.isPlatformAuthenticatorAvailable) {
        return {
          success: false,
          error: {
            code: 'NO_PLATFORM_AUTHENTICATOR',
            message: 'No biometric authenticator available on this device',
            isRecoverable: false,
            suggestedAction: 'Please ensure your device has biometric authentication enabled'
          }
        }
      }

      console.log('[WebAuthn Service] Starting biometric authentication:', {
        credentialId: credentialId || 'auto-discover',
        capabilities: capabilities.specificBiometrics,
        device: capabilities.deviceInfo
      })

      // Generate a random challenge
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      // Prepare authentication options
      const authenticationOptions: CredentialRequestOptions = {
        publicKey: {
          challenge,
          timeout: 60000,
          rpId: window.location.hostname,
          userVerification: 'required', // Require biometric verification
          allowCredentials: credentialId ? [{
            id: new TextEncoder().encode(credentialId),
            type: 'public-key',
            transports: ['internal'] // Platform authenticator
          }] : undefined // Allow auto-discovery if no specific credential
        }
      }

      console.log('[WebAuthn Service] Requesting credential with options:', {
        requiresUserVerification: true,
        allowsAutoDiscover: !credentialId,
        timeout: authenticationOptions.publicKey?.timeout
      })

      // Get the credential using navigator.credentials.get
      const credential = await navigator.credentials.get(authenticationOptions) as PublicKeyCredential

      if (!credential) {
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Biometric authentication failed',
            isRecoverable: true,
            suggestedAction: 'Please try again and follow the biometric prompts'
          }
        }
      }

      // Validate that biometric authentication was used
      const response = credential.response as AuthenticatorAssertionResponse
      const authData = response.authenticatorData
      
      // Parse authenticator data to check flags
      const authDataArray = new Uint8Array(authData)
      const flags = authDataArray[32] // Flags are at byte 32
      const userVerified = (flags & 0x04) !== 0 // UV flag
      const userPresent = (flags & 0x01) !== 0 // UP flag

      if (!userVerified) {
        return {
          success: false,
          error: {
            code: 'BIOMETRIC_NOT_USED',
            message: 'Biometric authentication was not performed',
            isRecoverable: true,
            suggestedAction: 'Please try again and complete the biometric authentication prompt'
          }
        }
      }

      const biometricCredential: BiometricCredential = {
        id: credential.id,
        rawId: credential.rawId,
        response: credential.response as AuthenticatorAssertionResponse,
        type: credential.type as 'public-key',
        authenticatorAttachment: (credential.authenticatorAttachment as AuthenticatorAttachment) || undefined
      }

      // Analyze the authentication for biometric information
      const authInfo = {
        userVerified,
        userPresent,
        credentialDeviceType: credential.authenticatorAttachment === 'platform' ? 'singleDevice' : 'crossPlatform',
        credentialBackedUp: false // Platform authenticators typically don't back up
      }

      const biometricInfo = this.analyzeBiometricAuthentication(authInfo, capabilities.deviceInfo)

      console.log('[WebAuthn Service] Biometric authentication successful:', {
        credentialId: credential.id,
        userVerified,
        userPresent,
        authenticatorAttachment: credential.authenticatorAttachment,
        biometricUsed: biometricInfo.biometricUsed,
        deviceInfo: capabilities.deviceInfo
      })

      return {
        success: true,
        credential: biometricCredential,
        biometricInfo
      }

    } catch (error: any) {
      console.error('[WebAuthn Service] Authentication error:', error)
      return {
        success: false,
        error: this.handleWebAuthnError(error)
      }
    }
  }

  /**
   * Check if biometric authentication is available and ready
   */
  static async isBiometricAvailable(): Promise<boolean> {
    try {
      const capabilities = await this.checkBrowserCapabilities()
      return capabilities.isSupported && capabilities.isPlatformAuthenticatorAvailable
    } catch (error) {
      console.error('[WebAuthn Service] Error checking biometric availability:', error)
      return false
    }
  }

  /**
   * Get detailed information about available biometric types
   */
  static async getBiometricTypes(): Promise<string[]> {
    try {
      const capabilities = await this.checkBrowserCapabilities()
      const types: string[] = []

      if (capabilities.specificBiometrics.faceID) types.push('Face ID')
      if (capabilities.specificBiometrics.touchID) types.push('Touch ID')
      if (capabilities.specificBiometrics.windowsHello) types.push('Windows Hello')
      if (capabilities.specificBiometrics.androidFingerprint) types.push('Android Fingerprint')
      if (capabilities.specificBiometrics.androidFace) types.push('Android Face')

      return types
    } catch (error) {
      console.error('[WebAuthn Service] Error getting biometric types:', error)
      return []
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