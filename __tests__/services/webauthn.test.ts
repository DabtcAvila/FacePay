import { WebAuthnService, type WebAuthnCapabilities, type WebAuthnError } from '@/services/webauthn'

// Mock crypto.getRandomValues
const mockGetRandomValues = jest.fn((array: Uint8Array) => {
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256)
  }
  return array
})

// Mock TextEncoder
const mockTextEncoder = {
  encode: jest.fn((input: string) => new Uint8Array(input.split('').map(char => char.charCodeAt(0))))
}

// Mock global crypto
global.crypto = {
  getRandomValues: mockGetRandomValues,
} as any

global.TextEncoder = jest.fn(() => mockTextEncoder) as any

// Mock window.location.hostname specifically for WebAuthn tests
const originalLocation = global.window?.location
Object.defineProperty(global.window || {}, 'location', {
  value: {
    hostname: 'localhost'
  },
  writable: true,
  configurable: true,
})

// Mock navigator
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
  platform: 'iPhone',
  credentials: {
    create: jest.fn(),
    get: jest.fn(),
  }
}

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
})

// Mock PublicKeyCredential
const mockPublicKeyCredential = {
  isUserVerifyingPlatformAuthenticatorAvailable: jest.fn()
}

global.PublicKeyCredential = mockPublicKeyCredential as any

describe('WebAuthnService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset console.warn mock
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('checkBrowserCapabilities', () => {
    it('should return server capabilities when window is undefined', async () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      const capabilities = await WebAuthnService.checkBrowserCapabilities()

      expect(capabilities).toEqual({
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
      })

      global.window = originalWindow
    })

    it('should detect iOS device with Face ID capability', async () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
      mockNavigator.platform = 'iPhone'
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true)

      const capabilities = await WebAuthnService.checkBrowserCapabilities()

      expect(capabilities.isSupported).toBe(true)
      expect(capabilities.isPlatformAuthenticatorAvailable).toBe(true)
      expect(capabilities.biometricTypes).toEqual(['face', 'fingerprint'])
      expect(capabilities.biometricAvailability.faceID).toBe(true)
      expect(capabilities.deviceInfo.isIOS).toBe(true)
      expect(capabilities.deviceInfo.isMobile).toBe(true)
    })

    it('should detect Android device with fingerprint capability', async () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 11; SM-G973F) AppleWebKit/537.36'
      mockNavigator.platform = 'Linux armv8l'
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true)

      const capabilities = await WebAuthnService.checkBrowserCapabilities()

      expect(capabilities.isSupported).toBe(true)
      expect(capabilities.isPlatformAuthenticatorAvailable).toBe(true)
      expect(capabilities.biometricTypes).toEqual(['fingerprint', 'face'])
      expect(capabilities.biometricAvailability.androidFingerprint).toBe(true)
      expect(capabilities.biometricAvailability.androidFace).toBe(true)
      expect(capabilities.deviceInfo.isAndroid).toBe(true)
    })

    it('should detect macOS device with Touch ID capability', async () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      mockNavigator.platform = 'MacIntel'
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true)

      const capabilities = await WebAuthnService.checkBrowserCapabilities()

      expect(capabilities.isSupported).toBe(true)
      expect(capabilities.isPlatformAuthenticatorAvailable).toBe(true)
      expect(capabilities.biometricTypes).toEqual(['fingerprint'])
      expect(capabilities.biometricAvailability.touchID).toBe(true)
      expect(capabilities.deviceInfo.isMacOS).toBe(true)
    })

    it('should detect Windows device with Hello capability', async () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      mockNavigator.platform = 'Win32'
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true)

      const capabilities = await WebAuthnService.checkBrowserCapabilities()

      expect(capabilities.isSupported).toBe(true)
      expect(capabilities.isPlatformAuthenticatorAvailable).toBe(true)
      expect(capabilities.biometricTypes).toEqual(['fingerprint', 'face'])
      expect(capabilities.biometricAvailability.windowsHello).toBe(true)
      expect(capabilities.deviceInfo.isWindows).toBe(true)
    })

    it('should handle WebAuthn check errors gracefully', async () => {
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockRejectedValue(
        new Error('WebAuthn not supported')
      )

      const capabilities = await WebAuthnService.checkBrowserCapabilities()

      expect(capabilities.isSupported).toBe(false)
      expect(capabilities.isPlatformAuthenticatorAvailable).toBe(false)
      expect(console.warn).toHaveBeenCalledWith(
        '[WebAuthn Service] Error checking WebAuthn capabilities:',
        expect.any(Error)
      )
    })

    it('should detect when WebAuthn is not supported', async () => {
      // @ts-ignore
      delete global.PublicKeyCredential
      // @ts-ignore
      delete global.navigator.credentials

      const capabilities = await WebAuthnService.checkBrowserCapabilities()

      expect(capabilities.isSupported).toBe(false)
      expect(capabilities.isPlatformAuthenticatorAvailable).toBe(false)
      expect(capabilities.biometricTypes).toEqual([])
    })
  })

  describe('handleWebAuthnError', () => {
    it('should handle NotSupportedError', () => {
      const error = new Error('WebAuthn not supported')
      error.name = 'NotSupportedError'

      const result = WebAuthnService.handleWebAuthnError(error)

      expect(result).toEqual({
        code: 'NOT_SUPPORTED',
        message: "Your browser or device doesn't support biometric authentication.",
        isRecoverable: false,
        suggestedAction: 'Please try using a different browser or device, or use traditional password login.'
      })
    })

    it('should handle NotAllowedError', () => {
      const error = new Error('User cancelled')
      error.name = 'NotAllowedError'

      const result = WebAuthnService.handleWebAuthnError(error)

      expect(result).toEqual({
        code: 'USER_CANCELLED',
        message: 'Biometric authentication was cancelled or denied.',
        isRecoverable: true,
        suggestedAction: 'Please try again and follow the biometric prompt on your device.'
      })
    })

    it('should handle SecurityError', () => {
      const error = new Error('Security requirements not met')
      error.name = 'SecurityError'

      const result = WebAuthnService.handleWebAuthnError(error)

      expect(result).toEqual({
        code: 'SECURITY_ERROR',
        message: 'Security requirements not met for biometric authentication.',
        isRecoverable: false,
        suggestedAction: "Please ensure you're using a secure connection (HTTPS) and try again."
      })
    })

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error')

      const result = WebAuthnService.handleWebAuthnError(error)

      expect(result).toEqual({
        code: 'UNKNOWN',
        message: 'An unexpected error occurred during biometric authentication.',
        isRecoverable: true,
        suggestedAction: 'Please try again or contact support if the problem persists.'
      })
    })

    it('should handle errors with code instead of name', () => {
      const error = { code: 'NotSupportedError', message: 'Test error' }

      const result = WebAuthnService.handleWebAuthnError(error)

      expect(result.code).toBe('NOT_SUPPORTED')
    })
  })

  describe('register', () => {
    const mockCredential = {
      id: 'mock-credential-id',
      rawId: new ArrayBuffer(32),
      type: 'public-key',
      response: {
        attestationObject: new ArrayBuffer(64),
        clientDataJSON: new ArrayBuffer(128)
      }
    }

    beforeEach(() => {
      // Reset WebAuthn mocks
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true)
      mockNavigator.credentials.create.mockResolvedValue(mockCredential)
    })

    it('should successfully register a new credential', async () => {
      const options = {
        userId: 'test-user-id',
        userName: 'test@example.com',
        userDisplayName: 'Test User'
      }

      const result = await WebAuthnService.register(options)

      expect(result).toEqual({
        id: 'mock-credential-id',
        rawId: expect.any(Array),
        response: {
          attestationObject: expect.any(Array),
          clientDataJSON: expect.any(Array)
        },
        type: 'public-key'
      })

      expect(mockNavigator.credentials.create).toHaveBeenCalledWith({
        publicKey: expect.objectContaining({
          challenge: expect.any(Uint8Array),
          rp: {
            name: 'FacePay',
            id: 'localhost'
          },
          user: {
            id: expect.any(Uint8Array),
            name: 'test@example.com',
            displayName: 'Test User'
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' }
          ],
          timeout: 60000,
          attestation: 'direct',
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false
          }
        })
      })
    })

    it('should throw error when biometric authentication is not available', async () => {
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(false)

      const options = {
        userId: 'test-user-id',
        userName: 'test@example.com',
        userDisplayName: 'Test User'
      }

      await expect(WebAuthnService.register(options)).rejects.toThrow(
        'Biometric authentication is not available on this device'
      )
    })

    it('should throw error when credential creation returns null', async () => {
      mockNavigator.credentials.create.mockResolvedValue(null)

      const options = {
        userId: 'test-user-id',
        userName: 'test@example.com',
        userDisplayName: 'Test User'
      }

      await expect(WebAuthnService.register(options)).rejects.toThrow(
        'Failed to create biometric credential'
      )
    })

    it('should handle credential creation errors', async () => {
      const error = new Error('User cancelled')
      error.name = 'NotAllowedError'
      mockNavigator.credentials.create.mockRejectedValue(error)

      const options = {
        userId: 'test-user-id',
        userName: 'test@example.com',
        userDisplayName: 'Test User'
      }

      await expect(WebAuthnService.register(options)).rejects.toThrow(
        'Biometric authentication was cancelled or denied.'
      )

      expect(console.error).toHaveBeenCalledWith(
        '[WebAuthn Service] Registration error:',
        error
      )
    })
  })

  describe('authenticate', () => {
    const mockCredential = {
      id: 'mock-credential-id',
      rawId: new ArrayBuffer(32),
      type: 'public-key',
      response: {
        authenticatorData: new ArrayBuffer(64),
        clientDataJSON: new ArrayBuffer(128),
        signature: new ArrayBuffer(64)
      }
    }

    beforeEach(() => {
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true)
      mockNavigator.credentials.get.mockResolvedValue(mockCredential)
    })

    it('should successfully authenticate with existing credential', async () => {
      const result = await WebAuthnService.authenticate()

      expect(result).toEqual({
        id: 'mock-credential-id',
        rawId: expect.any(Array),
        response: {
          authenticatorData: expect.any(Array),
          clientDataJSON: expect.any(Array),
          signature: expect.any(Array)
        },
        type: 'public-key'
      })

      expect(mockNavigator.credentials.get).toHaveBeenCalledWith({
        publicKey: expect.objectContaining({
          challenge: expect.any(Uint8Array),
          timeout: 60000,
          rpId: 'localhost',
          userVerification: 'required',
          allowCredentials: []
        })
      })
    })

    it('should throw error when biometric authentication is not available', async () => {
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(false)

      await expect(WebAuthnService.authenticate()).rejects.toThrow(
        'Biometric authentication is not available on this device'
      )
    })

    it('should throw error when authentication returns null', async () => {
      mockNavigator.credentials.get.mockResolvedValue(null)

      await expect(WebAuthnService.authenticate()).rejects.toThrow(
        'No biometric credential returned'
      )
    })

    it('should handle authentication errors', async () => {
      const error = new Error('Security error')
      error.name = 'SecurityError'
      mockNavigator.credentials.get.mockRejectedValue(error)

      await expect(WebAuthnService.authenticate()).rejects.toThrow(
        'Security requirements not met for biometric authentication.'
      )

      expect(console.error).toHaveBeenCalledWith(
        '[WebAuthn Service] Authentication error:',
        error
      )
    })
  })

  describe('validateBiometricAuthentication', () => {
    it('should return valid for verified user', () => {
      const authInfo = { userVerified: true }
      const result = WebAuthnService.validateBiometricAuthentication(authInfo)

      expect(result).toEqual({ isValid: true })
    })

    it('should return invalid for unverified user', () => {
      const authInfo = { userVerified: false }
      const result = WebAuthnService.validateBiometricAuthentication(authInfo)

      expect(result).toEqual({
        isValid: false,
        reason: 'User verification not performed - biometric authentication required'
      })
    })

    it('should return invalid for null authInfo', () => {
      const result = WebAuthnService.validateBiometricAuthentication(null)

      expect(result).toEqual({
        isValid: false,
        reason: 'User verification not performed - biometric authentication required'
      })
    })
  })

  describe('analyzeBiometricAuthentication', () => {
    it('should analyze authentication with device info', () => {
      const authInfo = { userVerified: true, userPresent: true }
      const deviceInfo = { isMobile: true, platform: 'iOS' }

      const result = WebAuthnService.analyzeBiometricAuthentication(authInfo, deviceInfo)

      expect(result).toEqual({
        userVerified: true,
        userPresent: true,
        deviceType: 'mobile',
        platformInfo: deviceInfo
      })
    })

    it('should handle missing auth info', () => {
      const result = WebAuthnService.analyzeBiometricAuthentication(null)

      expect(result).toEqual({
        userVerified: false,
        userPresent: false,
        deviceType: 'desktop',
        platformInfo: {}
      })
    })

    it('should default to desktop for non-mobile devices', () => {
      const authInfo = { userVerified: true }
      const deviceInfo = { isMobile: false }

      const result = WebAuthnService.analyzeBiometricAuthentication(authInfo, deviceInfo)

      expect(result.deviceType).toBe('desktop')
    })
  })

  describe('logBiometricAuthenticationResult', () => {
    it('should log successful authentication result', () => {
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()
      const analysis = { userVerified: true, deviceType: 'mobile' }
      const userId = 'test-user'
      const authResult = { verified: true }

      WebAuthnService.logBiometricAuthenticationResult(analysis, userId, authResult)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[WebAuthn Service] Biometric authentication completed:',
        {
          userId: 'test-user',
          success: true,
          userVerified: true,
          deviceType: 'mobile',
          timestamp: expect.any(String)
        }
      )

      mockConsoleLog.mockRestore()
    })

    it('should log failed authentication result', () => {
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()
      const analysis = { userVerified: false, deviceType: 'desktop' }
      const userId = 'test-user'
      const authResult = { verified: false }

      WebAuthnService.logBiometricAuthenticationResult(analysis, userId, authResult)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[WebAuthn Service] Biometric authentication completed:',
        expect.objectContaining({
          userId: 'test-user',
          success: false,
          userVerified: false,
          deviceType: 'desktop'
        })
      )

      mockConsoleLog.mockRestore()
    })
  })
})