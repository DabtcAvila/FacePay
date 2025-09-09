'use client'

import { useState, useEffect } from 'react'
import { WebAuthnService, type WebAuthnCapabilities, type WebAuthnError } from '@/services/webauthn'

interface WebAuthnDemoProps {
  userId?: string
  userName?: string
  onSuccess?: (result: any) => void
  onError?: (error: WebAuthnError) => void
  mode?: 'registration' | 'authentication' | 'demo'
}

export default function WebAuthnDemo({ 
  userId = 'demo-user', 
  userName = 'demo@example.com', 
  onSuccess, 
  onError,
  mode = 'demo' 
}: WebAuthnDemoProps) {
  const [capabilities, setCapabilities] = useState<WebAuthnCapabilities | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<WebAuthnError | null>(null)
  const [demoMode, setDemoMode] = useState(false)
  const [step, setStep] = useState<'check' | 'register' | 'authenticate' | 'success' | 'fallback'>('check')

  useEffect(() => {
    checkCapabilities()
  }, [])

  const checkCapabilities = async () => {
    try {
      const caps = await WebAuthnService.checkBrowserCapabilities()
      setCapabilities(caps)
      
      if (!caps.isSupported || !caps.isPlatformAuthenticatorAvailable) {
        setStep('fallback')
        setDemoMode(true)
      } else {
        setStep(mode === 'demo' ? 'register' : mode === 'registration' ? 'register' : mode === 'authentication' ? 'authenticate' : 'register')
      }
    } catch (err) {
      console.error('Error checking capabilities:', err)
      setStep('fallback')
      setDemoMode(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegistration = async () => {
    if (demoMode) {
      // Demo mode - simulate registration
      setIsProcessing(true)
      setTimeout(() => {
        setIsProcessing(false)
        setStep('success')
        onSuccess?.({ demo: true, type: 'registration' })
      }, 2000)
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Step 1: Get registration options
      const startResult = await WebAuthnService.startRegistration(userId, userName)
      
      if (!startResult.success) {
        throw startResult.error
      }

      // Step 2: Create credential
      const credential = await navigator.credentials.create({
        publicKey: startResult.options
      })

      if (!credential) {
        throw new Error('No credential created')
      }

      // Step 3: Verify registration
      const completeResult = await WebAuthnService.completeRegistration(credential, userId)
      
      if (!completeResult.success) {
        throw completeResult.error
      }

      setStep('success')
      onSuccess?.(completeResult)
    } catch (err) {
      const webAuthnError = WebAuthnService.handleWebAuthnError(err)
      setError(webAuthnError)
      onError?.(webAuthnError)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAuthentication = async () => {
    if (demoMode) {
      // Demo mode - simulate authentication
      setIsProcessing(true)
      setTimeout(() => {
        setIsProcessing(false)
        setStep('success')
        onSuccess?.({ demo: true, type: 'authentication' })
      }, 1500)
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Step 1: Get authentication options
      const startResult = await WebAuthnService.startAuthentication(userId)
      
      if (!startResult.success) {
        throw startResult.error
      }

      // Step 2: Get credential
      const credential = await navigator.credentials.get({
        publicKey: startResult.options
      })

      if (!credential) {
        throw new Error('No credential received')
      }

      // Step 3: Verify authentication
      const completeResult = await WebAuthnService.completeAuthentication(credential, userId)
      
      if (!completeResult.success) {
        throw completeResult.error
      }

      setStep('success')
      onSuccess?.(completeResult)
    } catch (err) {
      const webAuthnError = WebAuthnService.handleWebAuthnError(err)
      setError(webAuthnError)
      onError?.(webAuthnError)
    } finally {
      setIsProcessing(false)
    }
  }

  const getBiometricIcon = () => {
    if (!capabilities) return '🔐'
    
    if (capabilities.biometricTypes.includes('face')) {
      return '🔒'
    } else if (capabilities.biometricTypes.includes('fingerprint')) {
      return '👆'
    } else if (capabilities.deviceInfo.isIOS) {
      return '📱'
    } else if (capabilities.deviceInfo.isMacOS) {
      return '💻'
    }
    return '🔐'
  }

  const getBiometricName = () => {
    if (!capabilities) return 'Biometric Authentication'
    
    if (capabilities.biometricTypes.includes('face')) {
      return capabilities.deviceInfo.isIOS ? 'Face ID' : 'Face Recognition'
    } else if (capabilities.biometricTypes.includes('fingerprint')) {
      return capabilities.deviceInfo.isIOS ? 'Touch ID' : 'Fingerprint'
    } else if (capabilities.deviceInfo.isMacOS) {
      return 'Touch ID'
    } else if (capabilities.deviceInfo.isWindows) {
      return 'Windows Hello'
    }
    return 'Biometric Authentication'
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Checking device capabilities...</p>
      </div>
    )
  }

  if (step === 'fallback') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Biometric Authentication Not Supported
          </h2>
          <p className="text-gray-600 text-sm">
            Your browser or device doesn't support WebAuthn biometric authentication.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Why isn't it working?</h3>
          <ul className="text-yellow-700 text-sm space-y-1">
            {!capabilities?.isSupported && (
              <li>• Your browser doesn't support WebAuthn</li>
            )}
            {capabilities?.isSupported && !capabilities.isPlatformAuthenticatorAvailable && (
              <li>• No biometric authenticator detected</li>
            )}
            <li>• You might need to use HTTPS</li>
            <li>• Try a different browser or device</li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => { setDemoMode(true); setStep('register'); }}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Try Demo Mode Instead
          </button>
          
          <button
            onClick={() => window.location.href = '/auth?mode=password'}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            Use Password Login
          </button>
        </div>

        {capabilities && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
            <strong>Device Info:</strong><br/>
            Platform: {capabilities.deviceInfo.platform}<br/>
            Mobile: {capabilities.deviceInfo.isMobile ? 'Yes' : 'No'}<br/>
            WebAuthn: {capabilities.isSupported ? 'Supported' : 'Not supported'}
          </div>
        )}
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-green-700 mb-2">
          {demoMode ? 'Demo Completed!' : 'Authentication Successful!'}
        </h2>
        <p className="text-gray-600 mb-4">
          {demoMode 
            ? 'This was a demonstration of how biometric authentication would work on a supported device.'
            : `${getBiometricName()} authentication completed successfully.`
          }
        </p>
        
        {demoMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-800 text-sm">
              In a real scenario, you would have used your {getBiometricName()} to authenticate securely.
            </p>
          </div>
        )}

        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">{getBiometricIcon()}</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {demoMode ? 'Demo: ' : ''}{getBiometricName()}
        </h2>
        <p className="text-gray-600 text-sm">
          {demoMode 
            ? 'Experience how biometric authentication would work'
            : `Authenticate using your ${getBiometricName()}`
          }
        </p>
      </div>

      {demoMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-blue-800 text-sm text-center">
            This is demonstration mode - no actual biometric data will be processed
          </p>
        </div>
      )}

      {capabilities && (
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold">Device Status:</span>
            <span className={capabilities.isPlatformAuthenticatorAvailable ? 'text-green-600' : 'text-yellow-600'}>
              {capabilities.isPlatformAuthenticatorAvailable ? '✓ Ready' : '⚠ Limited'}
            </span>
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            <div>Platform: {capabilities.deviceInfo.isMobile ? 'Mobile' : 'Desktop'}</div>
            {capabilities.biometricTypes.length > 0 && (
              <div>Available: {capabilities.biometricTypes.join(', ')}</div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-red-800 mb-1">{error.message}</h3>
          <p className="text-red-600 text-sm mb-2">{error.suggestedAction}</p>
          {error.isRecoverable && (
            <button
              onClick={() => setError(null)}
              className="text-red-600 text-sm underline hover:no-underline"
            >
              Try Again
            </button>
          )}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={handleRegistration}
          disabled={isProcessing}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              {demoMode ? 'Simulating...' : 'Processing...'}
            </>
          ) : (
            <>Register {getBiometricName()}</>
          )}
        </button>

        <button
          onClick={handleAuthentication}
          disabled={isProcessing}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              {demoMode ? 'Simulating...' : 'Authenticating...'}
            </>
          ) : (
            <>Authenticate with {getBiometricName()}</>
          )}
        </button>

        {!demoMode && (
          <button
            onClick={() => setDemoMode(true)}
            className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            Switch to Demo Mode
          </button>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
            Technical Details
          </summary>
          {capabilities && (
            <div className="mt-2 p-3 bg-gray-50 rounded text-xs space-y-1">
              <div><strong>WebAuthn Support:</strong> {capabilities.isSupported ? 'Yes' : 'No'}</div>
              <div><strong>Platform Authenticator:</strong> {capabilities.isPlatformAuthenticatorAvailable ? 'Available' : 'Not available'}</div>
              <div><strong>User Verification:</strong> {capabilities.isUserVerificationSupported ? 'Supported' : 'Not supported'}</div>
              <div><strong>Device:</strong> {capabilities.deviceInfo.platform}</div>
              <div><strong>Browser:</strong> {capabilities.deviceInfo.userAgent.substring(0, 50)}...</div>
            </div>
          )}
        </details>
      </div>
    </div>
  )
}