'use client'

import { useState, useEffect } from 'react'
import { WebAuthnService, type WebAuthnCapabilities, type WebAuthnError } from '@/services/webauthn'
import RealFaceID from '@/components/RealFaceID'

interface TestLog {
  timestamp: Date
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
  details?: any
}

export default function WebAuthnTestPage() {
  const [capabilities, setCapabilities] = useState<WebAuthnCapabilities | null>(null)
  const [logs, setLogs] = useState<TestLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  const [demoMode, setDemoMode] = useState(false)
  const [userId, setUserId] = useState('test-user-' + Date.now())
  const [userName, setUserName] = useState('test@facepay.com')
  const [activeTab, setActiveTab] = useState<'test' | 'face-id' | 'capabilities' | 'logs'>('test')
  const [faceIdTestResult, setFaceIdTestResult] = useState<{ method: string; confidence?: number; timestamp: Date } | null>(null)

  useEffect(() => {
    initializeTestSuite()
  }, [])

  const addLog = (type: TestLog['type'], message: string, details?: any) => {
    const log: TestLog = {
      timestamp: new Date(),
      type,
      message,
      details
    }
    setLogs(prev => [log, ...prev])
    console.log(`[WebAuthn Test] ${type.toUpperCase()}: ${message}`, details)
  }

  const initializeTestSuite = async () => {
    addLog('info', 'Initializing WebAuthn Test Suite...')
    setIsLoading(true)
    
    try {
      const caps = await WebAuthnService.checkBrowserCapabilities()
      setCapabilities(caps)
      
      addLog('success', 'Device capabilities detected', caps)
      
      if (!caps.isSupported) {
        addLog('warning', 'WebAuthn is not supported in this browser')
        setDemoMode(true)
      } else if (!caps.isPlatformAuthenticatorAvailable) {
        addLog('warning', 'Platform authenticator is not available')
        setDemoMode(true)
      } else {
        addLog('success', 'WebAuthn is fully supported on this device')
      }
    } catch (error) {
      addLog('error', 'Failed to initialize test suite', error)
      setDemoMode(true)
    } finally {
      setIsLoading(false)
    }
  }

  const runRegistrationTest = async () => {
    if (demoMode) {
      return runDemoTest('registration')
    }

    setIsProcessing(true)
    setCurrentTest('Registration')
    addLog('info', `Starting WebAuthn registration for user: ${userName}`)

    try {
      // Step 1: Get registration options from API
      addLog('info', 'Step 1: Requesting biometric registration options from API...')
      const response = await fetch('/api/webauthn/register/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: This test would need proper authentication headers in a real implementation
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Registration start failed: ${error.error}`)
      }

      const startResult = await response.json()
      addLog('success', 'Biometric registration options received (platform authenticator required)', startResult.data.options)

      // Step 2: Create credential with biometric verification
      addLog('info', 'Step 2: Creating biometric credential (platform authenticator required)...')
      const credential = await navigator.credentials.create({
        publicKey: startResult.data.options as PublicKeyCredentialCreationOptions
      })

      if (!credential) {
        throw new Error('No credential created')
      }

      addLog('success', 'Credential created successfully', {
        id: credential.id,
        type: credential.type
      })

      // Step 3: Verify biometric registration
      addLog('info', 'Step 3: Verifying biometric registration with server...')
      const completeResponse = await fetch('/api/webauthn/register/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: This test would need proper authentication headers in a real implementation
        },
        body: JSON.stringify({
          credential: {
            id: credential.id,
            rawId: credential.id, // Simplified for test
            response: {
              attestationObject: (credential as any).response.attestationObject,
              clientDataJSON: (credential as any).response.clientDataJSON,
            },
            type: credential.type,
          }
        })
      })
      
      if (!completeResponse.ok) {
        const error = await completeResponse.json()
        throw new Error(`Registration completion failed: ${error.error}`)
      }

      const completeResult = await completeResponse.json()
      addLog('success', 'Biometric registration completed successfully! Platform authenticator verified.', completeResult)
    } catch (error) {
      const webAuthnError = WebAuthnService.handleWebAuthnError(error)
      addLog('error', `Registration failed: ${webAuthnError.message}`, webAuthnError)
    } finally {
      setIsProcessing(false)
      setCurrentTest(null)
    }
  }

  const runAuthenticationTest = async () => {
    if (demoMode) {
      return runDemoTest('authentication')
    }

    setIsProcessing(true)
    setCurrentTest('Authentication')
    addLog('info', `Starting WebAuthn authentication for user: ${userId}`)

    try {
      // Step 1: Get biometric authentication options
      addLog('info', 'Step 1: Requesting biometric authentication options from API...')
      const response = await fetch('/api/webauthn/authenticate/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Authentication start failed: ${error.error}`)
      }

      const startResult = await response.json()
      addLog('success', 'Biometric authentication options received (user verification required)', startResult.data.options)

      // Step 2: Get biometric credential
      addLog('info', 'Step 2: Getting biometric credential (user verification required)...')
      const credential = await navigator.credentials.get({
        publicKey: startResult.data.options as PublicKeyCredentialRequestOptions
      })

      if (!credential) {
        throw new Error('No credential received')
      }

      addLog('success', 'Credential retrieved successfully', {
        id: credential.id,
        type: credential.type
      })

      // Step 3: Verify biometric authentication
      addLog('info', 'Step 3: Verifying biometric authentication with server...')
      const completeResponse = await fetch('/api/webauthn/authenticate/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: {
            id: credential.id,
            rawId: credential.id, // Simplified for test
            response: {
              authenticatorData: (credential as any).response.authenticatorData,
              clientDataJSON: (credential as any).response.clientDataJSON,
              signature: (credential as any).response.signature,
            },
            type: credential.type,
          }
        })
      })
      
      if (!completeResponse.ok) {
        const error = await completeResponse.json()
        throw new Error(`Authentication completion failed: ${error.error}`)
      }

      const completeResult = await completeResponse.json()
      addLog('success', 'Biometric authentication completed successfully! Platform authenticator verified.', completeResult)
    } catch (error) {
      const webAuthnError = WebAuthnService.handleWebAuthnError(error)
      addLog('error', `Authentication failed: ${webAuthnError.message}`, webAuthnError)
    } finally {
      setIsProcessing(false)
      setCurrentTest(null)
    }
  }

  const runDemoTest = async (type: 'registration' | 'authentication') => {
    setIsProcessing(true)
    setCurrentTest(`Demo ${type}`)
    addLog('info', `Starting demo ${type} simulation...`)

    // Simulate realistic timing
    await new Promise(resolve => setTimeout(resolve, 1000))
    addLog('info', `Simulating ${type} options request...`)
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    addLog('info', `Simulating biometric ${type === 'registration' ? 'enrollment' : 'verification'}...`)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    addLog('success', `Demo ${type} completed successfully! (This was a simulation)`)
    
    setIsProcessing(false)
    setCurrentTest(null)
  }

  const runFullTestSuite = async () => {
    addLog('info', 'Starting comprehensive test suite...')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await runRegistrationTest()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await runAuthenticationTest()
    addLog('success', 'Full test suite completed!')
  }

  const clearLogs = () => {
    setLogs([])
    addLog('info', 'Test logs cleared')
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
          <h2 className="text-xl font-semibold mb-2">Initializing WebAuthn Test Suite</h2>
          <p className="text-gray-600">Checking device capabilities...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            WebAuthn Comprehensive Test Suite
          </h1>
          <p className="text-gray-600 text-lg">
            Complete testing environment for WebAuthn biometric authentication
          </p>
          
          {/* Status Badge */}
          <div className="mt-4">
            {demoMode ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Demo Mode Active
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {getBiometricIcon()} {getBiometricName()} Ready
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg p-1 shadow-sm border">
            <button
              onClick={() => setActiveTab('test')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'test'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              WebAuthn Tests
            </button>
            <button
              onClick={() => setActiveTab('face-id')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'face-id'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Real Face ID Tests
            </button>
            <button
              onClick={() => setActiveTab('capabilities')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'capabilities'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Device Info
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Debug Logs
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Content */}
          <div className="space-y-6">
            {activeTab === 'test' && (
              <>
                {/* User Configuration */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Test Configuration</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        User ID
                      </label>
                      <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isProcessing}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        User Name
                      </label>
                      <input
                        type="email"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isProcessing}
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="demo-mode"
                        checked={demoMode}
                        onChange={(e) => setDemoMode(e.target.checked)}
                        className="mr-2"
                        disabled={isProcessing}
                      />
                      <label htmlFor="demo-mode" className="text-sm text-gray-700">
                        Force Demo Mode (simulated authentication)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Test Controls */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Test Actions</h3>
                  
                  {currentTest && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                        <span className="text-blue-800 font-medium">
                          Running: {currentTest}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={runRegistrationTest}
                      disabled={isProcessing}
                      className="bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      {isProcessing && currentTest?.includes('Registration') ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Testing...
                        </>
                      ) : (
                        'Test Registration'
                      )}
                    </button>

                    <button
                      onClick={runAuthenticationTest}
                      disabled={isProcessing}
                      className="bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      {isProcessing && currentTest?.includes('Authentication') ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Testing...
                        </>
                      ) : (
                        'Test Authentication'
                      )}
                    </button>

                    <button
                      onClick={runFullTestSuite}
                      disabled={isProcessing}
                      className="bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center sm:col-span-2"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Running Suite...
                        </>
                      ) : (
                        'Run Full Test Suite'
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'face-id' && (
              <>
                {/* Real Face ID Test */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Real Face ID Testing</h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-blue-800">
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        <span className="font-medium">Simple Face Detection Test</span>
                      </div>
                      <p className="text-blue-700 text-sm mt-1">
                        Test lightweight computer vision face detection with performance metrics
                      </p>
                    </div>
                    
                    {faceIdTestResult && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-medium text-green-800 mb-2">Last Test Result</h4>
                        <div className="text-sm text-green-700 space-y-1">
                          <p><strong>Method:</strong> {faceIdTestResult.method}</p>
                          {faceIdTestResult.confidence && (
                            <p><strong>Confidence:</strong> {(faceIdTestResult.confidence * 100).toFixed(1)}%</p>
                          )}
                          <p><strong>Time:</strong> {faceIdTestResult.timestamp.toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Face ID Component */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Live Face ID Test</h3>
                  
                  <RealFaceID 
                    onScanComplete={(method, confidence) => {
                      const result = {
                        method,
                        confidence,
                        timestamp: new Date()
                      };
                      setFaceIdTestResult(result);
                      addLog('success', `Face ID test completed using ${method}`, result);
                    }}
                    onCancel={() => {
                      addLog('info', 'Face ID test cancelled by user');
                    }}
                    userId={userId}
                    userName={userName}
                    enableWebAuthnFallback={true}
                    confidenceThreshold={0.7}
                    maxDetectionTime={15000}
                    enablePerformanceMetrics={true}
                  />
                </div>

                {/* Test Performance Summary */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Performance Testing Features</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-700">
                        <span className="text-green-500 mr-2">✓</span>
                        Real-time simple face detection
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <span className="text-green-500 mr-2">✓</span>
                        Skin color detection algorithms
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <span className="text-green-500 mr-2">✓</span>
                        Basic feature detection
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <span className="text-green-500 mr-2">✓</span>
                        Confidence threshold testing
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-700">
                        <span className="text-green-500 mr-2">✓</span>
                        Performance metrics collection
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <span className="text-green-500 mr-2">✓</span>
                        Fallback detection algorithms
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <span className="text-green-500 mr-2">✓</span>
                        Real-time video processing
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <span className="text-green-500 mr-2">✓</span>
                        Error handling and recovery
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'capabilities' && capabilities && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Device Capabilities</h3>
                
                <div className="space-y-6">
                  {/* WebAuthn Support */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">WebAuthn Support</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">WebAuthn API</span>
                        <span className={`text-sm font-medium ${capabilities.isSupported ? 'text-green-600' : 'text-red-600'}`}>
                          {capabilities.isSupported ? '✓ Supported' : '✗ Not Supported'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">Platform Authenticator</span>
                        <span className={`text-sm font-medium ${capabilities.isPlatformAuthenticatorAvailable ? 'text-green-600' : 'text-red-600'}`}>
                          {capabilities.isPlatformAuthenticatorAvailable ? '✓ Available' : '✗ Not Available'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">User Verification</span>
                        <span className={`text-sm font-medium ${capabilities.isPlatformAuthenticatorAvailable ? 'text-green-600' : 'text-red-600'}`}>
                          {capabilities.isPlatformAuthenticatorAvailable ? '✓ Supported' : '✗ Not Supported'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Biometric Types */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Biometric Capabilities</h4>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      {capabilities.biometricTypes.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {capabilities.biometricTypes.map((type, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                            >
                              {type === 'face' && '🔒'} 
                              {type === 'fingerprint' && '👆'} 
                              {type === 'voice' && '🎤'} 
                              {type === 'unknown' && '🔐'} 
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500">No biometric types detected</span>
                      )}
                    </div>
                  </div>

                  {/* Device Information */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Device Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Platform</span>
                        <span className="text-sm font-medium">{capabilities.deviceInfo.platform}</span>
                      </div>
                      
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Device Type</span>
                        <span className="text-sm font-medium">
                          {capabilities.deviceInfo.isMobile ? 'Mobile' : 'Desktop'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Operating System</span>
                        <span className="text-sm font-medium">
                          {capabilities.deviceInfo.isIOS && 'iOS'}
                          {capabilities.deviceInfo.isAndroid && 'Android'}
                          {capabilities.deviceInfo.isMacOS && 'macOS'}
                          {capabilities.deviceInfo.isWindows && 'Windows'}
                          {!capabilities.deviceInfo.isIOS && !capabilities.deviceInfo.isAndroid && !capabilities.deviceInfo.isMacOS && !capabilities.deviceInfo.isWindows && 'Other'}
                        </span>
                      </div>
                      
                      <div className="pt-2">
                        <span className="text-sm text-gray-600">User Agent</span>
                        <p className="text-xs text-gray-500 mt-1 break-all">
                          {typeof navigator !== 'undefined' ? navigator.userAgent : 'Server Side'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Debug Logs</h3>
                  <button
                    onClick={clearLogs}
                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Clear Logs
                  </button>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {logs.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No logs yet. Run some tests to see debug information.</p>
                  ) : (
                    logs.map((log, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border-l-4 ${
                          log.type === 'error' ? 'bg-red-50 border-red-400' :
                          log.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                          log.type === 'success' ? 'bg-green-50 border-green-400' :
                          'bg-blue-50 border-blue-400'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${
                                log.type === 'error' ? 'text-red-600' :
                                log.type === 'warning' ? 'text-yellow-600' :
                                log.type === 'success' ? 'text-green-600' :
                                'text-blue-600'
                              }`}>
                                {log.type.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-500">
                                {log.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 mt-1">{log.message}</p>
                            {log.details && (
                              <details className="mt-2">
                                <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                                  View Details
                                </summary>
                                <pre className="text-xs bg-gray-100 p-2 mt-1 rounded overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Summary Panel */}
          <div className="space-y-6">
            {/* Quick Status */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Status</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">WebAuthn Support</span>
                  <span className={`text-sm font-medium ${capabilities?.isSupported ? 'text-green-600' : 'text-red-600'}`}>
                    {capabilities?.isSupported ? 'Supported' : 'Not Supported'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Biometric Authentication</span>
                  <span className={`text-sm font-medium ${capabilities?.isPlatformAuthenticatorAvailable ? 'text-green-600' : 'text-red-600'}`}>
                    {capabilities?.isPlatformAuthenticatorAvailable ? 'Available' : 'Not Available'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Face ID Test</span>
                  <span className={`text-sm font-medium ${faceIdTestResult ? 'text-green-600' : 'text-gray-500'}`}>
                    {faceIdTestResult ? 'Tested' : 'Not Tested'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Test Mode</span>
                  <span className={`text-sm font-medium ${demoMode ? 'text-blue-600' : 'text-green-600'}`}>
                    {demoMode ? 'Demo Mode' : 'Live Mode'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Total Tests Run</span>
                  <span className="text-sm font-medium text-gray-900">
                    {logs.filter(log => log.message.includes('completed successfully')).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Implementation Features */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Test Suite Features</h3>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Comprehensive device capability detection
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Full WebAuthn registration testing
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Full WebAuthn authentication testing
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Real Face ID with Simple Detection
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Computer vision face detection
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Performance metrics collection
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Detailed debug logging and error handling
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Demo mode for unsupported devices
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Cross-platform biometric detection
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Professional testing interface
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Real-time test monitoring
                </div>
              </div>
            </div>

            {/* Technical Notes */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-3">Technical Notes</h4>
              <div className="text-sm text-gray-600 space-y-2">
                <p>• This test suite provides comprehensive WebAuthn functionality testing</p>
                <p>• Real Face ID uses simple computer vision with skin color detection</p>
                <p>• All tests are logged with detailed debugging information and performance metrics</p>
                <p>• Demo mode simulates authentication flow for development</p>
                <p>• Real biometric data is only processed on supported devices</p>
                <p>• Face ID includes fallback detection algorithms for reliability</p>
                <p>• Tests cover registration, authentication, face detection, and error scenarios</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}