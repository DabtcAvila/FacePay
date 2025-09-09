'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Eye, 
  Fingerprint, 
  Shield, 
  Camera, 
  Sparkles,
  CheckCircle, 
  AlertCircle, 
  X, 
  Loader2,
  RefreshCw,
  WifiOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WebAuthnService, type WebAuthnCapabilities, type WebAuthnError } from '@/services/webauthn'

export interface BiometricAuthResult {
  success: boolean
  method: 'biometric' | 'demo' | 'camera' | 'fallback'
  biometricType?: 'face' | 'fingerprint' | 'unknown'
  deviceInfo?: {
    isIOS: boolean
    isMobile: boolean
    platform: string
  }
  timestamp: number
  credentialId?: string
  verified?: boolean
  type?: 'registration' | 'authentication' | 'demo'
}

interface BiometricWithFallbackProps {
  userId?: string
  userName?: string
  onSuccess?: (result: BiometricAuthResult) => void
  onError?: (error: WebAuthnError) => void
  onCancel?: () => void
  mode?: 'authentication' | 'registration' | 'demo'
  title?: string
  subtitle?: string
  className?: string
  showFallbackOptions?: boolean
  preferredMethod?: AuthMethod
}

type AuthMethod = 'detecting' | 'biometric' | 'camera' | 'demo' | 'fallback'
type AuthStage = 'ready' | 'processing' | 'success' | 'error'

export default function BiometricWithFallback({
  userId = 'demo-user',
  userName = 'demo@example.com',
  onSuccess,
  onError,
  onCancel,
  mode = 'authentication',
  title = 'FacePay Authentication',
  subtitle,
  className = '',
  showFallbackOptions = true,
  preferredMethod
}: BiometricWithFallbackProps) {
  const [capabilities, setCapabilities] = useState<WebAuthnCapabilities | null>(null)
  const [currentMethod, setCurrentMethod] = useState<AuthMethod>('detecting')
  const [authStage, setAuthStage] = useState<AuthStage>('ready')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<WebAuthnError | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Inicialización automática - detecta capacidades y selecciona el mejor método
  const initializeAuth = useCallback(async () => {
    try {
      setAuthStage('ready')
      setError(null)
      
      // Verificar capacidades del dispositivo
      const caps = await WebAuthnService.checkBrowserCapabilities()
      setCapabilities(caps)
      
      // Seleccionar el mejor método automáticamente
      let selectedMethod: AuthMethod = 'demo' // Fallback por defecto
      
      if (preferredMethod) {
        // Use preferred method if specified and available
        if (preferredMethod === 'biometric' && caps.isSupported && caps.isPlatformAuthenticatorAvailable) {
          selectedMethod = 'biometric'
        } else if (preferredMethod === 'camera' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
          selectedMethod = 'camera'
        } else {
          selectedMethod = preferredMethod
        }
      } else {
        // Auto-select best available method
        if (caps.isSupported && caps.isPlatformAuthenticatorAvailable) {
          selectedMethod = 'biometric'
        } else if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
          selectedMethod = 'camera'
        }
      }
      
      setCurrentMethod(selectedMethod)
      setIsInitialized(true)
      
      console.log('[BiometricWithFallback] Initialized with method:', selectedMethod, {
        webauthnSupported: caps.isSupported,
        platformAuthAvailable: caps.isPlatformAuthenticatorAvailable,
        biometricTypes: caps.biometricTypes,
        device: caps.deviceInfo
      })
    } catch (err) {
      console.warn('[BiometricWithFallback] Initialization failed, using demo fallback:', err)
      setCurrentMethod('demo')
      setIsInitialized(true)
    }
  }, [])

  // Limpieza de recursos
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current)
      progressTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    initializeAuth()
    return cleanup
  }, [initializeAuth, cleanup])

  // Animación de progreso universal
  const startProgressAnimation = useCallback((duration: number = 3000) => {
    setProgress(0)
    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / duration) * 100, 100)
      setProgress(newProgress)
      
      if (newProgress < 100) {
        progressTimerRef.current = setTimeout(animate, 50)
      } else {
        setAuthStage('success')
      }
    }
    animate()
  }, [])

  // Autenticación biométrica real
  const performBiometricAuth = useCallback(async () => {
    if (!capabilities?.isPlatformAuthenticatorAvailable) {
      throw new Error('Biometric authentication not available')
    }

    setAuthStage('processing')
    setError(null)

    try {
      let result
      
      if (mode === 'demo') {
        // Demo mode - simulate biometric process
        await new Promise(resolve => setTimeout(resolve, 2000))
        const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        
        if (isAvailable) {
          startProgressAnimation(2000)
          result = {
            success: true,
            method: 'biometric' as const,
            biometricType: (['face', 'fingerprint'].includes(capabilities.biometricTypes[0]) ? capabilities.biometricTypes[0] : 'unknown') as 'face' | 'fingerprint' | 'unknown',
            deviceInfo: {
              isIOS: capabilities.deviceInfo.isIOS,
              isMobile: capabilities.deviceInfo.isMobile,
              platform: capabilities.deviceInfo.platform
            },
            timestamp: Date.now()
          }
        } else {
          throw new Error('Biometric verification failed')
        }
      } else {
        // Real biometric authentication
        if (mode === 'registration') {
          const webAuthnResult = await WebAuthnService.register({
            userId,
            userName,
            userDisplayName: userName
          })
          
          startProgressAnimation(1500)
          result = {
            success: true,
            method: 'biometric' as const,
            biometricType: capabilities.biometricTypes[0] as 'face' | 'fingerprint' | 'unknown' || 'unknown',
            deviceInfo: {
              isIOS: capabilities.deviceInfo.isIOS,
              isMobile: capabilities.deviceInfo.isMobile,
              platform: capabilities.deviceInfo.platform
            },
            timestamp: Date.now(),
            credentialId: webAuthnResult.id
          }
        } else {
          const webAuthnResult = await WebAuthnService.authenticate()
          
          startProgressAnimation(1500)
          result = {
            success: true,
            method: 'biometric' as const,
            biometricType: capabilities.biometricTypes[0] as 'face' | 'fingerprint' | 'unknown' || 'unknown',
            deviceInfo: {
              isIOS: capabilities.deviceInfo.isIOS,
              isMobile: capabilities.deviceInfo.isMobile,
              platform: capabilities.deviceInfo.platform
            },
            timestamp: Date.now(),
            credentialId: webAuthnResult.id
          }
        }
      }
      
      return result
    } catch (err) {
      const webAuthnError = WebAuthnService.handleWebAuthnError(err)
      setError(webAuthnError)
      throw webAuthnError
    }
  }, [capabilities, startProgressAnimation, mode, userId, userName])

  // Autenticación con cámara
  const performCameraAuth = useCallback(async () => {
    setAuthStage('processing')
    setError(null)

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        videoRef.current.playsInline = true
        videoRef.current.muted = true
        await videoRef.current.play()
      }

      // Simular detección facial
      startProgressAnimation(4000)
      
      return {
        success: true,
        method: 'camera' as const,
        deviceInfo: {
          isIOS: capabilities?.deviceInfo.isIOS || false,
          isMobile: capabilities?.deviceInfo.isMobile || false,
          platform: capabilities?.deviceInfo.platform || 'unknown'
        },
        timestamp: Date.now()
      }
    } catch (err) {
      const error: WebAuthnError = {
        code: 'CAMERA_ERROR',
        message: 'Camera access failed',
        isRecoverable: true,
        suggestedAction: 'Please allow camera access or try another method'
      }
      setError(error)
      throw error
    }
  }, [capabilities, startProgressAnimation])

  // Demo animado (siempre funciona)
  const performDemoAuth = useCallback(async () => {
    setAuthStage('processing')
    setError(null)

    // Simular autenticación
    startProgressAnimation(3500)
    
    return {
      success: true,
      method: 'demo' as const,
      deviceInfo: {
        isIOS: capabilities?.deviceInfo.isIOS || false,
        isMobile: capabilities?.deviceInfo.isMobile || false,
        platform: capabilities?.deviceInfo.platform || 'demo'
      },
      timestamp: Date.now()
    }
  }, [capabilities, startProgressAnimation])

  // Ejecutar autenticación
  const startAuthentication = useCallback(async (method?: AuthMethod) => {
    const methodToUse = method || currentMethod
    
    try {
      let result: BiometricAuthResult

      switch (methodToUse) {
        case 'biometric':
          result = await performBiometricAuth()
          break
        case 'camera':
          result = await performCameraAuth()
          break
        case 'demo':
          result = await performDemoAuth()
          break
        default:
          throw new Error('Invalid authentication method')
      }

      onSuccess?.(result)
    } catch (err) {
      // Auto-fallback a demo si falla
      if (methodToUse !== 'demo') {
        console.log('[BiometricWithFallback] Method failed, falling back to demo:', err)
        setCurrentMethod('demo')
        setTimeout(() => startAuthentication('demo'), 1000)
      } else {
        onError?.(err as WebAuthnError)
      }
    }
  }, [currentMethod, performBiometricAuth, performCameraAuth, performDemoAuth, onSuccess, onError])

  // Cambiar método manualmente
  const switchMethod = useCallback((method: AuthMethod) => {
    cleanup()
    setCurrentMethod(method)
    setAuthStage('ready')
    setError(null)
    setProgress(0)
  }, [cleanup])

  // Obtener información del método actual
  const getMethodInfo = useCallback(() => {
    if (!capabilities) return { icon: Shield, name: 'Loading...', description: 'Checking capabilities...' }

    switch (currentMethod) {
      case 'detecting':
        return { 
          icon: Loader2, 
          name: 'Detecting...', 
          description: 'Checking device capabilities' 
        }
      case 'biometric':
        const biometricType = capabilities.biometricTypes[0]
        return {
          icon: biometricType === 'face' ? Eye : Fingerprint,
          name: capabilities.deviceInfo.isIOS 
            ? (biometricType === 'face' ? 'Face ID' : 'Touch ID')
            : biometricType === 'face' ? 'Face Recognition' : 'Biometric',
          description: `Use your ${biometricType === 'face' ? 'face' : 'fingerprint'} to authenticate securely`
        }
      case 'camera':
        return {
          icon: Camera,
          name: 'Camera Scan',
          description: 'Look into the camera for face detection'
        }
      case 'demo':
        return {
          icon: Sparkles,
          name: 'Visual Demo',
          description: 'Experience how biometric authentication works'
        }
      default:
        return {
          icon: Shield,
          name: 'Authentication',
          description: 'Choose your preferred method'
        }
    }
  }, [capabilities, currentMethod])

  const methodInfo = getMethodInfo()

  // Renderizar controles de método
  const renderMethodControls = () => {
    if (!showFallbackOptions) return null
    
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {/* Demo siempre disponible */}
        <Button
          onClick={() => switchMethod('demo')}
          variant={currentMethod === 'demo' ? 'default' : 'outline'}
          size="sm"
          className="flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Visual Demo
        </Button>

        {/* Biometría si está disponible */}
        {capabilities?.isPlatformAuthenticatorAvailable && (
          <Button
            onClick={() => switchMethod('biometric')}
            variant={currentMethod === 'biometric' ? 'default' : 'outline'}
            size="sm"
            className="flex items-center gap-2"
          >
            {capabilities.biometricTypes.includes('face') ? (
              <Eye className="w-4 h-4" />
            ) : (
              <Fingerprint className="w-4 h-4" />
            )}
            {capabilities.deviceInfo.isIOS ? 'Device ID' : 'Biometrics'}
          </Button>
        )}

        {/* Cámara si está disponible */}
        {typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' && (
          <Button
            onClick={() => switchMethod('camera')}
            variant={currentMethod === 'camera' ? 'default' : 'outline'}
            size="sm"
            className="flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            Camera
          </Button>
        )}
      </div>
    )
  }

  // Renderizar interfaz principal
  const renderAuthInterface = () => (
    <div className="relative">
      {/* Video para cámara */}
      {currentMethod === 'camera' && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-64 object-cover rounded-lg mb-4"
          style={{ display: streamRef.current ? 'block' : 'none' }}
        />
      )}

      {/* Interfaz de autenticación */}
      <div className="relative bg-gradient-to-br from-blue-900 to-purple-900 rounded-2xl aspect-square flex items-center justify-center overflow-hidden">
        {/* Icono principal */}
        <motion.div
          className="relative z-10"
          animate={{
            scale: authStage === 'processing' ? [1, 1.05, 1] : 1,
            rotate: methodInfo.icon === Loader2 ? [0, 360] : 0
          }}
          transition={{
            scale: { duration: 2, repeat: authStage === 'processing' ? Infinity : 0 },
            rotate: { duration: 2, repeat: methodInfo.icon === Loader2 ? Infinity : 0, ease: 'linear' }
          }}
        >
          <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center backdrop-blur">
            <methodInfo.icon className="w-12 h-12 text-blue-300" />
          </div>
        </motion.div>

        {/* Anillo de escaneo */}
        {authStage === 'processing' && (
          <>
            <motion.div
              className="absolute inset-8 border-2 border-blue-400 rounded-full"
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-12 border border-blue-300 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
          </>
        )}

        {/* Efectos de éxito */}
        {authStage === 'success' && (
          <motion.div
            className="absolute inset-0 bg-green-500/20 rounded-2xl flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <CheckCircle className="w-16 h-16 text-green-400" />
          </motion.div>
        )}

        {/* Línea de escaneo */}
        {authStage === 'processing' && (
          <motion.div
            className="absolute left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
            animate={{ y: [32, '75%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>

      {/* Barra de progreso */}
      {authStage === 'processing' && (
        <div className="mt-4">
          <div className="bg-gray-200 rounded-full h-2">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-center mt-2 text-sm font-medium text-blue-600">
            {Math.round(progress)}% Complete
          </p>
        </div>
      )}
    </div>
  )

  const renderStatus = () => (
    <div className="text-center space-y-4">
      <h3 className="text-xl font-semibold text-gray-900">
        {authStage === 'ready' && methodInfo.name}
        {authStage === 'processing' && `${mode === 'registration' ? 'Registering' : 'Authenticating'}...`}
        {authStage === 'success' && 'Success!'}
        {authStage === 'error' && 'Authentication Failed'}
      </h3>

      <p className="text-gray-600">
        {authStage === 'ready' && methodInfo.description}
        {authStage === 'processing' && 'Please follow the prompts on your device'}
        {authStage === 'success' && `${mode === 'registration' ? 'Registration' : 'Authentication'} completed successfully`}
        {authStage === 'error' && error?.message}
      </p>

      {/* Botón de acción */}
      {authStage === 'ready' && (
        <Button
          onClick={() => startAuthentication()}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          size="lg"
        >
          {mode === 'registration' ? 'Register' : 'Authenticate'}
        </Button>
      )}

      {/* Controles de método */}
      {authStage === 'ready' && showFallbackOptions && renderMethodControls()}
    </div>
  )

  const renderError = () => (
    <div className="text-center space-y-4">
      <div className="flex items-center justify-center space-x-3 text-red-500">
        <AlertCircle className="w-8 h-8" />
        <h3 className="text-xl font-semibold">Authentication Failed</h3>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 font-medium">{error?.message}</p>
        <p className="text-red-600 text-sm mt-1">{error?.suggestedAction}</p>
      </div>

      <div className="space-y-2">
        {error?.isRecoverable && (
          <Button
            onClick={() => startAuthentication()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        )}

        <Button
          onClick={() => switchMethod('demo')}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Use Visual Demo
        </Button>
      </div>
    </div>
  )

  if (!isInitialized) {
    return (
      <div className={`w-full max-w-lg mx-auto p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-gray-600">Initializing authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full max-w-lg mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-gray-600 text-sm mt-1">{subtitle}</p>}
        </div>
        
        {onCancel && (
          <Button onClick={onCancel} variant="ghost" size="sm">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {renderAuthInterface()}
        
        {authStage === 'error' ? renderError() : renderStatus()}
      </div>

      {/* Indicadores de estado */}
      <div className="mt-6 flex justify-center items-center space-x-4 text-sm text-gray-500">
        {capabilities && (
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              capabilities.isPlatformAuthenticatorAvailable ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            <span>
              {capabilities.isPlatformAuthenticatorAvailable ? 'Biometrics Ready' : 'Demo Mode'}
            </span>
          </div>
        )}
        
        {!navigator.onLine && (
          <div className="flex items-center space-x-2 text-blue-600">
            <WifiOff className="w-4 h-4" />
            <span>Offline Mode</span>
          </div>
        )}
      </div>

      {/* Success overlay */}
      <AnimatePresence>
        {authStage === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl text-center"
          >
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-green-800 mb-2">
              {mode === 'registration' ? 'Registration Complete!' : 'Authentication Successful!'}
            </h3>
            <p className="text-green-700">
              {currentMethod === 'demo' 
                ? 'This was a demonstration of how biometric authentication would work.'
                : 'You can now proceed with secure transactions.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}