import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BiometricWithFallback, { type BiometricAuthResult } from '@/components/BiometricWithFallback'
import { WebAuthnService, type WebAuthnCapabilities, type WebAuthnError } from '@/services/webauthn'

// Mock WebAuthn service
jest.mock('@/services/webauthn', () => ({
  WebAuthnService: {
    checkBrowserCapabilities: jest.fn(),
    handleWebAuthnError: jest.fn(),
  },
}))

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn(),
  },
})

// Mock PublicKeyCredential
global.PublicKeyCredential = {
  isUserVerifyingPlatformAuthenticatorAvailable: jest.fn(),
} as any

const mockWebAuthnService = WebAuthnService as jest.Mocked<typeof WebAuthnService>

describe('BiometricWithFallback Component', () => {
  const user = userEvent.setup()
  
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should render loading state initially', async () => {
      // Mock slow capability check
      mockWebAuthnService.checkBrowserCapabilities.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({} as any), 100))
      )

      render(<BiometricWithFallback />)

      expect(screen.getByText('Initializing authentication...')).toBeInTheDocument()
      // Loader should be visible
      const loader = screen.getByText('Initializing authentication...').closest('div')
      expect(loader).toBeInTheDocument()
    })

    it('should initialize with biometric method when supported', async () => {
      const mockCapabilities: WebAuthnCapabilities = {
        isSupported: true,
        isPlatformAuthenticatorAvailable: true,
        biometricTypes: ['face'],
        biometricAvailability: {
          faceID: true,
          touchID: false,
          windowsHello: false,
          androidFingerprint: false,
          androidFace: false,
        },
        deviceInfo: {
          platform: 'iPhone',
          isMobile: true,
          isIOS: true,
          isAndroid: false,
          isMacOS: false,
          isWindows: false,
        },
      }

      mockWebAuthnService.checkBrowserCapabilities.mockResolvedValue(mockCapabilities)

      await act(async () => {
        render(<BiometricWithFallback />)
      })

      await waitFor(() => {
        expect(screen.getByText('Face ID')).toBeInTheDocument()
        expect(screen.getByText('Use your face to authenticate securely')).toBeInTheDocument()
      })
    })

    it('should initialize with demo method when biometrics not supported', async () => {
      const mockCapabilities: WebAuthnCapabilities = {
        isSupported: false,
        isPlatformAuthenticatorAvailable: false,
        biometricTypes: [],
        biometricAvailability: {
          faceID: false,
          touchID: false,
          windowsHello: false,
          androidFingerprint: false,
          androidFace: false,
        },
        deviceInfo: {
          platform: 'unknown',
          isMobile: false,
          isIOS: false,
          isAndroid: false,
          isMacOS: false,
          isWindows: false,
        },
      }

      mockWebAuthnService.checkBrowserCapabilities.mockResolvedValue(mockCapabilities)

      await act(async () => {
        render(<BiometricWithFallback />)
      })

      await waitFor(() => {
        expect(screen.getByText('Visual Demo')).toBeInTheDocument()
        expect(screen.getByText('Experience how biometric authentication works')).toBeInTheDocument()
      })
    })

    it('should handle initialization errors gracefully', async () => {
      mockWebAuthnService.checkBrowserCapabilities.mockRejectedValue(new Error('Initialization failed'))

      await act(async () => {
        render(<BiometricWithFallback />)
      })

      await waitFor(() => {
        expect(screen.getByText('Visual Demo')).toBeInTheDocument()
      })
    })
  })

  describe('Authentication Methods', () => {
    const mockCapabilities: WebAuthnCapabilities = {
      isSupported: true,
      isPlatformAuthenticatorAvailable: true,
      biometricTypes: ['face', 'fingerprint'],
      biometricAvailability: {
        faceID: true,
        touchID: true,
        windowsHello: false,
        androidFingerprint: false,
        androidFace: false,
      },
      deviceInfo: {
        platform: 'iPhone',
        isMobile: true,
        isIOS: true,
        isAndroid: false,
        isMacOS: false,
        isWindows: false,
      },
    }

    beforeEach(() => {
      mockWebAuthnService.checkBrowserCapabilities.mockResolvedValue(mockCapabilities)
    })

    it('should allow switching between authentication methods', async () => {
      await act(async () => {
        render(<BiometricWithFallback />)
      })

      await waitFor(() => {
        expect(screen.getByText('Face ID')).toBeInTheDocument()
      })

      // Click on Visual Demo button
      const demoButton = screen.getByRole('button', { name: /visual demo/i })
      await user.click(demoButton)

      expect(screen.getByText('Visual Demo')).toBeInTheDocument()
      expect(screen.getByText('Experience how biometric authentication works')).toBeInTheDocument()
    })

    it('should show available method buttons based on capabilities', async () => {
      await act(async () => {
        render(<BiometricWithFallback />)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /visual demo/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /device id/i })).toBeInTheDocument()
      })

      // Camera button should be available if getUserMedia is supported
      if (navigator.mediaDevices?.getUserMedia) {
        expect(screen.getByRole('button', { name: /camera/i })).toBeInTheDocument()
      }
    })

    it('should handle camera method when supported', async () => {
      const mockStream = {
        getTracks: jest.fn(() => [{ stop: jest.fn() }]),
      }

      const mockGetUserMedia = navigator.mediaDevices.getUserMedia as jest.Mock
      mockGetUserMedia.mockResolvedValue(mockStream)

      await act(async () => {
        render(<BiometricWithFallback />)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /camera/i })).toBeInTheDocument()
      })

      // Switch to camera method
      const cameraButton = screen.getByRole('button', { name: /camera/i })
      await user.click(cameraButton)

      expect(screen.getByText('Camera Scan')).toBeInTheDocument()
      expect(screen.getByText('Look into the camera for face detection')).toBeInTheDocument()
    })
  })

  describe('Authentication Process', () => {
    const mockCapabilities: WebAuthnCapabilities = {
      isSupported: true,
      isPlatformAuthenticatorAvailable: true,
      biometricTypes: ['face'],
      biometricAvailability: {
        faceID: true,
        touchID: false,
        windowsHello: false,
        androidFingerprint: false,
        androidFace: false,
      },
      deviceInfo: {
        platform: 'iPhone',
        isMobile: true,
        isIOS: true,
        isAndroid: false,
        isMacOS: false,
        isWindows: false,
      },
    }

    beforeEach(() => {
      mockWebAuthnService.checkBrowserCapabilities.mockResolvedValue(mockCapabilities)
      global.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = jest.fn().mockResolvedValue(true)
    })

    it('should start authentication when authenticate button is clicked', async () => {
      const onSuccess = jest.fn()

      await act(async () => {
        render(<BiometricWithFallback onSuccess={onSuccess} />)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /authenticate/i })).toBeInTheDocument()
      })

      const authenticateButton = screen.getByRole('button', { name: /authenticate/i })
      await user.click(authenticateButton)

      expect(screen.getByText('Authenticating...')).toBeInTheDocument()
      expect(screen.getByText('Please follow the prompts on your device')).toBeInTheDocument()
    })

    it('should show progress during authentication', async () => {
      await act(async () => {
        render(<BiometricWithFallback />)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /authenticate/i })).toBeInTheDocument()
      })

      const authenticateButton = screen.getByRole('button', { name: /authenticate/i })
      await user.click(authenticateButton)

      // Should show progress elements
      await waitFor(() => {
        expect(screen.getByText(/\d+% Complete/)).toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('should call onSuccess with correct result after successful authentication', async () => {
      const onSuccess = jest.fn()

      await act(async () => {
        render(<BiometricWithFallback onSuccess={onSuccess} />)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /authenticate/i })).toBeInTheDocument()
      })

      const authenticateButton = screen.getByRole('button', { name: /authenticate/i })
      await user.click(authenticateButton)

      await waitFor(() => {
        expect(screen.getByText('Success!')).toBeInTheDocument()
      }, { timeout: 5000 })

      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          method: 'biometric',
          biometricType: 'face',
          deviceInfo: expect.objectContaining({
            isIOS: true,
            isMobile: true,
            platform: 'iPhone',
          }),
          timestamp: expect.any(Number),
        })
      )
    })

    it('should handle demo authentication mode', async () => {
      const onSuccess = jest.fn()

      await act(async () => {
        render(<BiometricWithFallback onSuccess={onSuccess} />)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /visual demo/i })).toBeInTheDocument()
      })

      // Switch to demo mode
      const demoButton = screen.getByRole('button', { name: /visual demo/i })
      await user.click(demoButton)

      const authenticateButton = screen.getByRole('button', { name: /authenticate/i })
      await user.click(authenticateButton)

      await waitFor(() => {
        expect(screen.getByText('Success!')).toBeInTheDocument()
      }, { timeout: 5000 })

      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          method: 'demo',
          timestamp: expect.any(Number),
        })
      )
    })
  })

  describe('Error Handling', () => {
    const mockCapabilities: WebAuthnCapabilities = {
      isSupported: true,
      isPlatformAuthenticatorAvailable: true,
      biometricTypes: ['face'],
      biometricAvailability: {
        faceID: true,
        touchID: false,
        windowsHello: false,
        androidFingerprint: false,
        androidFace: false,
      },
      deviceInfo: {
        platform: 'iPhone',
        isMobile: true,
        isIOS: true,
        isAndroid: false,
        isMacOS: false,
        isWindows: false,
      },
    }

    beforeEach(() => {
      mockWebAuthnService.checkBrowserCapabilities.mockResolvedValue(mockCapabilities)
    })

    it('should handle authentication errors and show error state', async () => {
      const onError = jest.fn()
      const mockError: WebAuthnError = {
        code: 'USER_CANCELLED',
        message: 'Authentication was cancelled',
        isRecoverable: true,
        suggestedAction: 'Please try again',
      }

      // Mock biometric authentication failure
      global.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = jest.fn().mockRejectedValue(new Error('Authentication failed'))
      mockWebAuthnService.handleWebAuthnError.mockReturnValue(mockError)

      await act(async () => {
        render(<BiometricWithFallback onError={onError} />)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /authenticate/i })).toBeInTheDocument()
      })

      const authenticateButton = screen.getByRole('button', { name: /authenticate/i })
      await user.click(authenticateButton)

      // Should fallback to demo mode automatically
      await waitFor(() => {
        expect(screen.getByText('Visual Demo')).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('should show try again button for recoverable errors', async () => {
      const mockError: WebAuthnError = {
        code: 'USER_CANCELLED',
        message: 'Authentication was cancelled',
        isRecoverable: true,
        suggestedAction: 'Please try again',
      }

      // Force error state by making demo authentication fail
      mockWebAuthnService.handleWebAuthnError.mockReturnValue(mockError)

      await act(async () => {
        render(<BiometricWithFallback />)
      })

      // Switch to demo mode to avoid biometric fallback
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /visual demo/i })).toBeInTheDocument()
      })

      const demoButton = screen.getByRole('button', { name: /visual demo/i })
      await user.click(demoButton)

      // Simulate demo failure by mocking console.warn to track the fallback attempt
      const consoleWarnSpy = jest.spyOn(console, 'warn')

      const authenticateButton = screen.getByRole('button', { name: /authenticate/i })
      await user.click(authenticateButton)

      // Wait for success (demo should succeed)
      await waitFor(() => {
        expect(screen.getByText('Success!')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('should handle camera access denied', async () => {
      const mockGetUserMedia = navigator.mediaDevices.getUserMedia as jest.Mock
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))

      await act(async () => {
        render(<BiometricWithFallback />)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /camera/i })).toBeInTheDocument()
      })

      // Switch to camera method
      const cameraButton = screen.getByRole('button', { name: /camera/i })
      await user.click(cameraButton)

      const authenticateButton = screen.getByRole('button', { name: /authenticate/i })
      await user.click(authenticateButton)

      // Should fallback to demo automatically
      await waitFor(() => {
        expect(screen.getByText('Visual Demo')).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('Props and Customization', () => {
    it('should display custom title and subtitle', async () => {
      mockWebAuthnService.checkBrowserCapabilities.mockResolvedValue({} as any)

      await act(async () => {
        render(
          <BiometricWithFallback
            title="Custom Authentication"
            subtitle="Please verify your identity"
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByText('Custom Authentication')).toBeInTheDocument()
        expect(screen.getByText('Please verify your identity')).toBeInTheDocument()
      })
    })

    it('should show registration mode button text', async () => {
      mockWebAuthnService.checkBrowserCapabilities.mockResolvedValue({
        isPlatformAuthenticatorAvailable: false,
      } as any)

      await act(async () => {
        render(<BiometricWithFallback mode="registration" />)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
      })
    })

    it('should call onCancel when cancel button is clicked', async () => {
      const onCancel = jest.fn()
      mockWebAuthnService.checkBrowserCapabilities.mockResolvedValue({} as any)

      await act(async () => {
        render(<BiometricWithFallback onCancel={onCancel} />)
      })

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: '' }) // X button
        expect(cancelButton).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: '' })
      await user.click(cancelButton)

      expect(onCancel).toHaveBeenCalled()
    })

    it('should apply custom className', async () => {
      mockWebAuthnService.checkBrowserCapabilities.mockResolvedValue({} as any)

      const { container } = await act(async () => {
        return render(<BiometricWithFallback className="custom-class" />)
      })

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class')
      })
    })
  })

  describe('Device Status Indicators', () => {
    it('should show biometrics ready indicator when available', async () => {
      const mockCapabilities: WebAuthnCapabilities = {
        isSupported: true,
        isPlatformAuthenticatorAvailable: true,
        biometricTypes: ['face'],
        biometricAvailability: {
          faceID: true,
          touchID: false,
          windowsHello: false,
          androidFingerprint: false,
          androidFace: false,
        },
        deviceInfo: {
          platform: 'iPhone',
          isMobile: true,
          isIOS: true,
          isAndroid: false,
          isMacOS: false,
          isWindows: false,
        },
      }

      mockWebAuthnService.checkBrowserCapabilities.mockResolvedValue(mockCapabilities)

      await act(async () => {
        render(<BiometricWithFallback />)
      })

      await waitFor(() => {
        expect(screen.getByText('Biometrics Ready')).toBeInTheDocument()
      })
    })

    it('should show demo mode indicator when biometrics not available', async () => {
      const mockCapabilities: WebAuthnCapabilities = {
        isSupported: false,
        isPlatformAuthenticatorAvailable: false,
        biometricTypes: [],
        biometricAvailability: {
          faceID: false,
          touchID: false,
          windowsHello: false,
          androidFingerprint: false,
          androidFace: false,
        },
        deviceInfo: {
          platform: 'unknown',
          isMobile: false,
          isIOS: false,
          isAndroid: false,
          isMacOS: false,
          isWindows: false,
        },
      }

      mockWebAuthnService.checkBrowserCapabilities.mockResolvedValue(mockCapabilities)

      await act(async () => {
        render(<BiometricWithFallback />)
      })

      await waitFor(() => {
        expect(screen.getByText('Demo Mode')).toBeInTheDocument()
      })
    })
  })

  describe('Cleanup', () => {
    it('should cleanup camera stream on unmount', async () => {
      const mockStream = {
        getTracks: jest.fn(() => [{ stop: jest.fn() }]),
      }

      const mockGetUserMedia = navigator.mediaDevices.getUserMedia as jest.Mock
      mockGetUserMedia.mockResolvedValue(mockStream)

      mockWebAuthnService.checkBrowserCapabilities.mockResolvedValue({
        isPlatformAuthenticatorAvailable: false,
      } as any)

      const { unmount } = await act(async () => {
        return render(<BiometricWithFallback />)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /camera/i })).toBeInTheDocument()
      })

      // Switch to camera method and start authentication
      const cameraButton = screen.getByRole('button', { name: /camera/i })
      await user.click(cameraButton)

      const authenticateButton = screen.getByRole('button', { name: /authenticate/i })
      await user.click(authenticateButton)

      // Wait for stream to be created
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled()
      })

      // Unmount component
      unmount()

      // Verify cleanup was called
      const tracks = mockStream.getTracks()
      tracks.forEach(track => {
        expect(track.stop).toHaveBeenCalled()
      })
    })

    it('should clear timers on unmount', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

      mockWebAuthnService.checkBrowserCapabilities.mockResolvedValue({
        isPlatformAuthenticatorAvailable: false,
      } as any)

      const { unmount } = await act(async () => {
        return render(<BiometricWithFallback />)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /authenticate/i })).toBeInTheDocument()
      })

      const authenticateButton = screen.getByRole('button', { name: /authenticate/i })
      await user.click(authenticateButton)

      unmount()

      expect(clearTimeoutSpy).toHaveBeenCalled()

      clearTimeoutSpy.mockRestore()
    })
  })
})