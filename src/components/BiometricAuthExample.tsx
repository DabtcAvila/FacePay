'use client'

import React, { useState } from 'react'
import BiometricWithFallback, { type BiometricAuthResult } from './BiometricWithFallback'
import { type WebAuthnError } from '@/services/webauthn'

export default function BiometricAuthExample() {
  const [authResult, setAuthResult] = useState<BiometricAuthResult | null>(null)
  const [error, setError] = useState<WebAuthnError | null>(null)
  const [showAuth, setShowAuth] = useState(true)

  const handleSuccess = (result: BiometricAuthResult) => {
    console.log('Authentication successful:', result)
    setAuthResult(result)
    setError(null)
    setShowAuth(false)
    
    // Aquí puedes continuar con el flujo de la aplicación
    setTimeout(() => {
      alert('Authentication completed! Redirecting to dashboard...')
    }, 1500)
  }

  const handleError = (authError: WebAuthnError) => {
    console.error('Authentication failed:', authError)
    setError(authError)
  }

  const handleCancel = () => {
    console.log('Authentication cancelled')
    setShowAuth(false)
  }

  const reset = () => {
    setAuthResult(null)
    setError(null)
    setShowAuth(true)
  }

  if (!showAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {authResult ? 'Authentication Complete' : 'Authentication Cancelled'}
          </h2>
          
          {authResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <p className="text-green-800 font-medium">Method: {authResult.method}</p>
              {authResult.biometricType && (
                <p className="text-green-700">Type: {authResult.biometricType}</p>
              )}
              <p className="text-green-700 text-sm">
                Platform: {authResult.deviceInfo?.platform || 'Unknown'}
              </p>
              <p className="text-green-600 text-xs">
                Timestamp: {new Date(authResult.timestamp).toLocaleString()}
              </p>
            </div>
          )}
          
          <button
            onClick={reset}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full">
        <BiometricWithFallback
          userId="example-user-123"
          userName="user@example.com"
          mode="authentication"
          title="FacePay Login"
          subtitle="Secure biometric authentication for your account"
          onSuccess={handleSuccess}
          onError={handleError}
          onCancel={handleCancel}
          className="p-6"
        />
      </div>
    </div>
  )
}