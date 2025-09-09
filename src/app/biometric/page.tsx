'use client'

import React, { useState, useEffect } from 'react'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface BiometricCapabilities {
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

interface LogEntry {
  timestamp: string
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
  details?: any
}

interface Credential {
  id: string
  credentialId: string
  deviceType: string
  friendlyName: string
  createdAt: string
  lastUsed: string
}

export default function BiometricDemoPage() {
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'registering' | 'success' | 'error'>('idle')
  const [authenticationStatus, setAuthenticationStatus] = useState<'idle' | 'authenticating' | 'success' | 'error'>('idle')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)

  // Add log entry
  const addLog = (type: LogEntry['type'], message: string, details?: any) => {
    const newLog: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      details
    }
    setLogs(prev => [newLog, ...prev].slice(0, 50)) // Keep last 50 logs
  }

  // Check browser capabilities
  const checkCapabilities = async () => {
    addLog('info', 'Checking browser capabilities...')
    
    try {
      if (typeof window === 'undefined') {
        throw new Error('Window object not available')
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
            addLog('info', `iOS device detected with ${hasNotch ? 'Face ID' : 'Touch ID'} capability`)
          } else if (isAndroid) {
            // Android devices vary widely
            biometricTypes = ['fingerprint', 'face']
            addLog('info', 'Android device detected with fingerprint/face biometric capabilities')
          } else if (isMacOS) {
            // MacBooks with Touch ID
            biometricTypes = ['fingerprint']
            addLog('info', 'macOS device detected with Touch ID capability')
          } else if (isWindows) {
            // Windows Hello
            biometricTypes = ['fingerprint', 'face']
            addLog('info', 'Windows device detected with Windows Hello capabilities')
          } else {
            biometricTypes = ['unknown']
            addLog('warning', 'Unknown device type, biometric capabilities uncertain')
          }
        }
      }

      const caps: BiometricCapabilities = {
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

      setCapabilities(caps)
      addLog('success', 'Capabilities check completed', caps)

      if (!isSupported) {
        addLog('error', 'WebAuthn not supported in this browser')
      } else if (!isPlatformAuthenticatorAvailable) {
        addLog('warning', 'Platform authenticator not available - biometric authentication may not work')
      } else {
        addLog('success', `Biometric authentication available: ${biometricTypes.join(', ')}`)
      }

    } catch (error) {
      addLog('error', 'Failed to check capabilities', error)
      console.error('Capabilities check error:', error)
    }
  }

  // Load existing credentials
  const loadCredentials = async () => {
    try {
      addLog('info', 'Loading existing credentials...')
      
      const token = localStorage.getItem('authToken') || authToken
      if (!token) {
        addLog('warning', 'No auth token available')
        return
      }
      
      const response = await fetch('/api/webauthn/credentials', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setCredentials(data.data.credentials)
          addLog('success', `Loaded ${data.data.credentials.length} existing credentials`)
        }
      } else {
        addLog('warning', 'No existing credentials found or user not authenticated')
      }
    } catch (error) {
      addLog('error', 'Failed to load credentials', error)
    }
  }

  // Register new biometric credential
  const registerBiometric = async () => {
    if (!capabilities?.isPlatformAuthenticatorAvailable) {
      addLog('error', 'Platform authenticator not available')
      return
    }

    setIsLoading(true)
    setRegistrationStatus('registering')
    
    try {
      addLog('info', 'Starting biometric registration...')
      
      const token = localStorage.getItem('authToken') || authToken
      if (!token) {
        addLog('error', 'No auth token available')
        return
      }
      
      // Get registration options from server
      const optionsResponse = await fetch('/api/webauthn/register-options', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      })

      if (!optionsResponse.ok) {
        throw new Error('Failed to get registration options')
      }

      const optionsData = await optionsResponse.json()
      if (!optionsData.success) {
        throw new Error(optionsData.message || 'Failed to get registration options')
      }

      addLog('info', 'Registration options received, prompting for biometric...')
      addLog('warning', '🔒 Your device will now prompt for biometric authentication (Face ID/Touch ID)')

      // Start registration with the browser's WebAuthn API
      const credential = await startRegistration(optionsData.data)
      
      addLog('success', 'Biometric captured successfully, verifying with server...')

      // Send credential to server for verification
      const verifyResponse = await fetch('/api/webauthn/register-verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ credential })
      })

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify registration')
      }

      const verifyData = await verifyResponse.json()
      if (!verifyData.success) {
        throw new Error(verifyData.message || 'Registration verification failed')
      }

      setRegistrationStatus('success')
      addLog('success', '🎉 Biometric registration completed successfully!', verifyData.data)
      
      // Reload credentials
      await loadCredentials()

    } catch (error: any) {
      setRegistrationStatus('error')
      
      // Handle specific WebAuthn errors
      if (error.name === 'NotAllowedError') {
        addLog('error', 'Biometric authentication was cancelled or denied by the user')
      } else if (error.name === 'NotSupportedError') {
        addLog('error', 'Biometric authentication is not supported on this device')
      } else if (error.name === 'SecurityError') {
        addLog('error', 'Security error: Make sure you are using HTTPS')
      } else if (error.name === 'InvalidStateError') {
        addLog('error', 'A credential for this device may already exist')
      } else {
        addLog('error', `Registration failed: ${error.message}`, error)
      }
      
      console.error('Registration error:', error)
    } finally {
      setIsLoading(false)
      setTimeout(() => setRegistrationStatus('idle'), 3000)
    }
  }

  // Authenticate with biometric
  const authenticateBiometric = async () => {
    if (!capabilities?.isPlatformAuthenticatorAvailable) {
      addLog('error', 'Platform authenticator not available')
      return
    }

    if (credentials.length === 0) {
      addLog('error', 'No biometric credentials registered. Please register first.')
      return
    }

    setIsLoading(true)
    setAuthenticationStatus('authenticating')
    
    try {
      addLog('info', 'Starting biometric authentication...')
      
      const token = localStorage.getItem('authToken') || authToken
      if (!token) {
        addLog('error', 'No auth token available')
        return
      }
      
      // Get authentication options from server
      const optionsResponse = await fetch('/api/webauthn/authenticate-options', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      })

      if (!optionsResponse.ok) {
        throw new Error('Failed to get authentication options')
      }

      const optionsData = await optionsResponse.json()
      if (!optionsData.success) {
        throw new Error(optionsData.message || 'Failed to get authentication options')
      }

      addLog('info', 'Authentication options received, prompting for biometric...')
      addLog('warning', '🔒 Your device will now prompt for biometric authentication')

      // Start authentication with the browser's WebAuthn API
      const credential = await startAuthentication(optionsData.data)
      
      addLog('success', 'Biometric verified successfully, validating with server...')

      // Send credential to server for verification
      const verifyResponse = await fetch('/api/webauthn/authenticate-verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ credential })
      })

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify authentication')
      }

      const verifyData = await verifyResponse.json()
      if (!verifyData.success) {
        throw new Error(verifyData.message || 'Authentication verification failed')
      }

      setAuthenticationStatus('success')
      addLog('success', '🎉 Biometric authentication successful!', verifyData.data)

    } catch (error: any) {
      setAuthenticationStatus('error')
      
      // Handle specific WebAuthn errors
      if (error.name === 'NotAllowedError') {
        addLog('error', 'Biometric authentication was cancelled or denied by the user')
      } else if (error.name === 'NotSupportedError') {
        addLog('error', 'Biometric authentication is not supported on this device')
      } else if (error.name === 'SecurityError') {
        addLog('error', 'Security error: Make sure you are using HTTPS')
      } else {
        addLog('error', `Authentication failed: ${error.message}`, error)
      }
      
      console.error('Authentication error:', error)
    } finally {
      setIsLoading(false)
      setTimeout(() => setAuthenticationStatus('idle'), 3000)
    }
  }

  // Delete a credential
  const deleteCredential = async (credentialId: string) => {
    try {
      addLog('info', `Deleting credential: ${credentialId}`)
      
      const token = localStorage.getItem('authToken') || authToken
      if (!token) {
        addLog('error', 'No auth token available')
        return
      }
      
      const response = await fetch(`/api/webauthn/credentials?credentialId=${encodeURIComponent(credentialId)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          addLog('success', 'Credential deleted successfully')
          await loadCredentials()
        } else {
          addLog('error', data.message || 'Failed to delete credential')
        }
      } else {
        addLog('error', 'Failed to delete credential')
      }
    } catch (error) {
      addLog('error', 'Error deleting credential', error)
    }
  }

  // Clear logs
  const clearLogs = () => {
    setLogs([])
    addLog('info', 'Logs cleared')
  }

  // Demo login function
  const demoLogin = async () => {
    try {
      addLog('info', 'Logging in with demo user...')
      
      const response = await fetch('/api/auth/demo-login', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAuthToken(data.data.tokens.accessToken)
          setIsLoggedIn(true)
          addLog('success', `Logged in as ${data.data.user.name} (${data.data.user.email})`)
          
          // Store token in localStorage for API calls
          localStorage.setItem('authToken', data.data.tokens.accessToken)
        } else {
          addLog('error', 'Demo login failed', data.error)
        }
      } else {
        addLog('error', 'Demo login request failed')
      }
    } catch (error) {
      addLog('error', 'Error during demo login', error)
    }
  }

  // Initialize on component mount
  useEffect(() => {
    const initializeDemo = async () => {
      await demoLogin()
      await checkCapabilities()
    }
    
    initializeDemo()
  }, [])

  // Load credentials after login
  useEffect(() => {
    if (isLoggedIn) {
      loadCredentials()
    }
  }, [isLoggedIn])

  const getBiometricTypeDisplay = (types: string[]) => {
    const typeMap: Record<string, string> = {
      face: '👤 Face ID',
      fingerprint: '👆 Touch ID / Fingerprint',
      voice: '🗣️ Voice Recognition',
      unknown: '🔒 Platform Authenticator'
    }
    
    return types.map(type => typeMap[type] || type).join(', ')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      case 'registering':
      case 'authenticating': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <h1 className="text-4xl font-bold text-gray-900">
              🔒 Real Biometric Authentication Demo
            </h1>
            {isLoggedIn && (
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                ✅ Demo User Active
              </div>
            )}
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience genuine Face ID, Touch ID, and Windows Hello authentication using WebAuthn technology. 
            This demo uses your device's actual biometric hardware - no simulations!
          </p>
          {!isLoggedIn && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-md mx-auto">
              <p className="text-yellow-800 text-sm">
                🔄 Initializing demo session...
              </p>
            </div>
          )}
        </div>

        {/* Capabilities Status */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
            📱 Device Capabilities
          </h2>
          
          {capabilities ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">WebAuthn Support:</span>
                    <Badge className={capabilities.isSupported ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {capabilities.isSupported ? '✅ Supported' : '❌ Not Supported'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Platform Authenticator:</span>
                    <Badge className={capabilities.isPlatformAuthenticatorAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {capabilities.isPlatformAuthenticatorAvailable ? '✅ Available' : '❌ Not Available'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium">User Verification:</span>
                    <Badge className={capabilities.isUserVerificationSupported ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {capabilities.isUserVerificationSupported ? '✅ Supported' : '⚠️ Limited'}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Device Type:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {capabilities.deviceInfo.isIOS && <Badge className="bg-blue-100 text-blue-800">📱 iOS</Badge>}
                      {capabilities.deviceInfo.isAndroid && <Badge className="bg-green-100 text-green-800">🤖 Android</Badge>}
                      {capabilities.deviceInfo.isMacOS && <Badge className="bg-gray-100 text-gray-800">💻 macOS</Badge>}
                      {capabilities.deviceInfo.isWindows && <Badge className="bg-blue-100 text-blue-800">🪟 Windows</Badge>}
                      {capabilities.deviceInfo.isMobile && <Badge className="bg-purple-100 text-purple-800">📱 Mobile</Badge>}
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium">Available Biometrics:</span>
                    <p className="text-sm text-gray-600 mt-1">
                      {capabilities.biometricTypes.length > 0 
                        ? getBiometricTypeDisplay(capabilities.biometricTypes)
                        : 'None detected'
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              {!capabilities.isSupported && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">
                    <strong>WebAuthn not supported:</strong> Your browser doesn't support WebAuthn. 
                    Please try using a modern browser like Chrome, Firefox, Safari, or Edge.
                  </p>
                </div>
              )}
              
              {capabilities.isSupported && !capabilities.isPlatformAuthenticatorAvailable && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">
                    <strong>No biometric hardware detected:</strong> Your device doesn't appear to have 
                    Face ID, Touch ID, or Windows Hello available.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Checking capabilities...</span>
            </div>
          )}
        </div>

        {/* Main Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            🚀 Biometric Actions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Register Button */}
            <div className="space-y-2">
              <Button
                onClick={registerBiometric}
                disabled={!capabilities?.isPlatformAuthenticatorAvailable || isLoading}
                className="w-full h-16 text-lg font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
              >
                {registrationStatus === 'registering' ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Registering Biometric...
                  </>
                ) : (
                  <>
                    🔐 Register Face ID/Touch ID
                  </>
                )}
              </Button>
              
              {registrationStatus !== 'idle' && (
                <div className={`text-sm px-3 py-1 rounded-full text-white text-center ${getStatusColor(registrationStatus)}`}>
                  {registrationStatus === 'registering' && 'Follow your device prompt...'}
                  {registrationStatus === 'success' && 'Registration successful! ✅'}
                  {registrationStatus === 'error' && 'Registration failed ❌'}
                </div>
              )}
            </div>

            {/* Authenticate Button */}
            <div className="space-y-2">
              <Button
                onClick={authenticateBiometric}
                disabled={!capabilities?.isPlatformAuthenticatorAvailable || isLoading || credentials.length === 0}
                className="w-full h-16 text-lg font-semibold bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
              >
                {authenticationStatus === 'authenticating' ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Authenticating...
                  </>
                ) : (
                  <>
                    🔓 Authenticate with Biometric
                  </>
                )}
              </Button>
              
              {authenticationStatus !== 'idle' && (
                <div className={`text-sm px-3 py-1 rounded-full text-white text-center ${getStatusColor(authenticationStatus)}`}>
                  {authenticationStatus === 'authenticating' && 'Follow your device prompt...'}
                  {authenticationStatus === 'success' && 'Authentication successful! ✅'}
                  {authenticationStatus === 'error' && 'Authentication failed ❌'}
                </div>
              )}
            </div>
          </div>

          {credentials.length === 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>No biometric credentials registered.</strong> Click "Register Face ID/Touch ID" to set up biometric authentication.
              </p>
            </div>
          )}
        </div>

        {/* Saved Credentials */}
        {credentials.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              💾 Saved Credentials ({credentials.length})
            </h2>
            
            <div className="space-y-3">
              {credentials.map((credential) => (
                <div key={credential.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {credential.friendlyName}
                    </div>
                    <div className="text-sm text-gray-600">
                      Created: {new Date(credential.createdAt).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      ID: {credential.credentialId.substring(0, 20)}...
                    </div>
                  </div>
                  <Button
                    onClick={() => deleteCredential(credential.credentialId)}
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    size="sm"
                  >
                    🗑️ Delete
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How it Works */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
            📚 How Real Biometric Authentication Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-blue-600 mb-2">🔐 Registration Process</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                <li>Browser checks for biometric hardware availability</li>
                <li>Server generates a unique cryptographic challenge</li>
                <li>Your device prompts for Face ID/Touch ID/Windows Hello</li>
                <li>Secure enclave creates a public-private key pair</li>
                <li>Public key is sent to server (biometric data never leaves device)</li>
                <li>Credential is stored for future authentication</li>
              </ol>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-green-600 mb-2">🔓 Authentication Process</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                <li>Server sends authentication challenge</li>
                <li>Browser requests biometric verification</li>
                <li>You authenticate with Face ID/Touch ID/Windows Hello</li>
                <li>Device signs the challenge with your private key</li>
                <li>Server verifies the signature using your public key</li>
                <li>Access granted if signature is valid</li>
              </ol>
            </div>
          </div>
          
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">🔒 Security Features</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Privacy:</strong> Your biometric data never leaves your device</li>
              <li>• <strong>Phishing Resistant:</strong> Credentials are bound to specific domains</li>
              <li>• <strong>Replay Protection:</strong> Each authentication uses a unique challenge</li>
              <li>• <strong>Device Security:</strong> Keys are stored in secure hardware (Secure Enclave/TEE)</li>
              <li>• <strong>No Passwords:</strong> Eliminates password-related vulnerabilities</li>
            </ul>
          </div>
        </div>

        {/* Real-time Logs */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
              📊 Real-time Logs
            </h2>
            <Button
              onClick={clearLogs}
              variant="outline"
              size="sm"
              className="text-gray-600"
            >
              🧹 Clear Logs
            </Button>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-400 text-center">No logs yet. Interact with the buttons above to see real-time updates.</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    <span className="text-gray-400">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    {' '}
                    <span className={
                      log.type === 'error' ? 'text-red-400' :
                      log.type === 'success' ? 'text-green-400' :
                      log.type === 'warning' ? 'text-yellow-400' :
                      'text-blue-400'
                    }>
                      [{log.type.toUpperCase()}]
                    </span>
                    {' '}
                    <span className="text-gray-100">
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4 text-gray-600">
          <p className="text-sm">
            This demo uses the <strong>WebAuthn API</strong> with real biometric hardware on your device.
            <br />
            Supported on iOS (Face ID/Touch ID), Android (Biometric), macOS (Touch ID), and Windows (Hello).
          </p>
        </div>
      </div>
    </div>
  )
}