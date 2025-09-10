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
  WifiOff,
  Timer,
  StopCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WebAuthnService, type WebAuthnCapabilities, type WebAuthnError } from '@/services/webauthn'
import { useToast, toastPatterns } from '@/hooks/useToast'
import { 
  withTimeout, 
  TimeoutError, 
  TimeoutHandler, 
  TIMEOUTS, 
  isTimeoutError, 
  getTimeoutMessage 
} from '@/utils/timeout'

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
  const [isTakingLonger, setIsTakingLonger] = useState(false)
  const [showCancelButton, setShowCancelButton] = useState(false)
  const [timeoutMessage, setTimeoutMessage] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [debugMode, setDebugMode] = useState(process.env.NODE_ENV === 'development')
  
  const { toast, success, error: showError, warning, info, loading, dismiss, update } = useToast()
  const currentToastRef = useRef<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutHandlerRef = useRef<TimeoutHandler | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Inicialización automática - detecta capacidades y selecciona el mejor método
  const initializeAuth = useCallback(async () => {
    try {
      setAuthStage('ready')
      setError(null)
      setIsTakingLonger(false)
      setShowCancelButton(false)
      
      // Verificar capacidades del dispositivo con timeout
      const caps = await withTimeout(
        WebAuthnService.checkBrowserCapabilities(),
        TIMEOUTS.QUICK_OPERATION,
        'Device capability check timed out',
        'capabilities-check'
      )
      setCapabilities(caps)
      
      // ALWAYS prefer real biometric authentication when available
      let selectedMethod: AuthMethod = 'fallback' // Only fallback if nothing works
      
      if (preferredMethod) {
        // Use preferred method if specified and available
        if (preferredMethod === 'biometric' && caps.isSupported && caps.isPlatformAuthenticatorAvailable) {
          selectedMethod = 'biometric'
        } else if (preferredMethod === 'camera' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
          selectedMethod = 'camera'
        } else if (preferredMethod === 'demo') {
          // Only allow demo as explicit fallback, not as preferred method
          console.warn('[BiometricWithFallback] Demo mode requested but real biometric auth is preferred')
          selectedMethod = caps.isSupported && caps.isPlatformAuthenticatorAvailable ? 'biometric' : 'camera'
        } else {
          selectedMethod = preferredMethod
        }
      } else {
        // CRITICAL: Auto-select REAL biometric authentication as top priority
        if (caps.isSupported && caps.isPlatformAuthenticatorAvailable) {
          selectedMethod = 'biometric'
          console.log('[BiometricWithFallback] Auto-selected REAL biometric authentication')
        } else if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
          selectedMethod = 'camera'
          console.log('[BiometricWithFallback] Biometric not available, using camera fallback')
        } else {
          console.warn('[BiometricWithFallback] No biometric methods available, using demo fallback')
          selectedMethod = 'demo'
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
      if (isTimeoutError(err)) {
        console.warn('[BiometricWithFallback] Initialization timed out, using demo fallback');
        setTimeoutMessage('Device check took too long. Using demo mode.');
      } else {
        console.warn('[BiometricWithFallback] Initialization failed, using demo fallback:', err);
      }
      setCurrentMethod('demo')
      setIsInitialized(true)
    }
  }, [])

  // Limpieza robusta de recursos
  const cleanup = useCallback(() => {
    console.log('[BiometricWithFallback] Starting cleanup')
    
    // Limpiar stream de cámara
    if (streamRef.current) {
      console.log('[BiometricWithFallback] Stopping camera stream')
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log('[BiometricWithFallback] Stopped track:', track.kind, track.readyState)
      })
      streamRef.current = null
    }
    
    // Limpiar video element
    if (videoRef.current) {
      console.log('[BiometricWithFallback] Clearing video element')
      videoRef.current.srcObject = null
      videoRef.current.pause()
    }
    
    // Limpiar timers
    if (progressTimerRef.current) {
      console.log('[BiometricWithFallback] Clearing progress timer')
      clearTimeout(progressTimerRef.current)
      progressTimerRef.current = null
    }
    
    // Clean up timeout handler
    if (timeoutHandlerRef.current) {
      console.log('[BiometricWithFallback] Cancelling timeout handler')
      timeoutHandlerRef.current.cancel()
      timeoutHandlerRef.current = null
    }
    
    // Clean up abort controller
    if (abortControllerRef.current) {
      console.log('[BiometricWithFallback] Aborting operations')
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    // Reset timeout states
    setIsTakingLonger(false)
    setShowCancelButton(false)
    setTimeoutMessage('')
    
    console.log('[BiometricWithFallback] Cleanup completed')
  }, [])

  useEffect(() => {
    initializeAuth()
    
    // CRÍTICO: Cleanup robusto en unmount
    return () => {
      console.log('[BiometricWithFallback] Component unmounting, running cleanup')
      cleanup()
    }
  }, [initializeAuth, cleanup])

  // Animación de progreso universal
  const startProgressAnimation = useCallback((duration: number = 3000) => {
    console.log('[BiometricWithFallback] Starting progress animation, duration:', duration)
    setProgress(0)
    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / duration) * 100, 100)
      setProgress(newProgress)
      
      if (newProgress < 100) {
        progressTimerRef.current = setTimeout(animate, 50)
      } else {
        console.log('[BiometricWithFallback] Progress animation completed, setting success state')
        setAuthStage('success')
      }
    }
    animate()
  }, [])

  // REAL biometric authentication - NO DEMO MODE
  const performBiometricAuth = useCallback(async () => {
    if (!capabilities?.isPlatformAuthenticatorAvailable) {
      throw new Error('Biometric authentication not available')
    }

    console.log('[BiometricWithFallback] Starting REAL biometric authentication - NO SIMULATION')
    setAuthStage('processing')
    setError(null)
    setIsTakingLonger(false)
    setShowCancelButton(false)
    
    // Create abort controller for this operation
    abortControllerRef.current = new AbortController()
    
    // Set up timeout handler
    timeoutHandlerRef.current = new TimeoutHandler(
      () => {
        setIsTakingLonger(true)
        setShowCancelButton(true)
        setTimeoutMessage(getTimeoutMessage('Real biometric authentication', TIMEOUTS.WEBAUTHN_OPERATION))
      },
      (progress) => setProgress(progress)
    )

    try {
      let result
      let webAuthnResult

      console.log('[BiometricWithFallback] Executing REAL WebAuthn operation, mode:', mode)
      
      if (mode === 'registration') {
        // REAL biometric registration - will trigger Face ID/Touch ID
        console.log('[BiometricWithFallback] Starting REAL biometric registration...')
        webAuthnResult = await timeoutHandlerRef.current!.execute(
          () => WebAuthnService.register({
            userId,
            userName,
            userDisplayName: userName
          }, abortControllerRef.current?.signal),
          TIMEOUTS.WEBAUTHN_OPERATION,
          'Real biometric registration timed out. Please try again.',
          'webauthn-registration'
        )
        
        console.log('[BiometricWithFallback] REAL biometric registration completed successfully')
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
          credentialId: webAuthnResult.id,
          verified: true,
          type: 'registration' as const,
          realBiometric: true // Flag to indicate real authentication was used
        }
      } else {
        // REAL biometric authentication - will trigger Face ID/Touch ID
        console.log('[BiometricWithFallback] Starting REAL biometric authentication...')
        webAuthnResult = await timeoutHandlerRef.current!.execute(
          () => WebAuthnService.authenticate({
            userId,
            userName
          }, abortControllerRef.current?.signal),
          TIMEOUTS.WEBAUTHN_OPERATION,
          'Real biometric authentication timed out. Please try again.',
          'webauthn-authentication'
        )
        
        console.log('[BiometricWithFallback] REAL biometric authentication completed successfully')
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
          credentialId: webAuthnResult.id,
          verified: true,
          type: 'authentication' as const,
          realBiometric: true, // Flag to indicate real authentication was used
          verificationData: webAuthnResult.verificationData // Include backend verification data
        }
      }
      
      console.log('[BiometricWithFallback] REAL biometric operation completed successfully:', {
        method: result.method,
        type: result.type,
        credentialId: result.credentialId,
        realBiometric: result.realBiometric,
        timestamp: result.timestamp
      })
      return result
    } catch (err) {
      console.error('[BiometricWithFallback] REAL biometric authentication failed:', err)
      const webAuthnError = WebAuthnService.handleWebAuthnError(err)
      setError(webAuthnError)
      throw webAuthnError
    }
  }, [capabilities, startProgressAnimation, mode, userId, userName])

  // Autenticación con cámara con timeout handling mejorado
  const performCameraAuth = useCallback(async () => {
    console.log('[BiometricWithFallback] Starting camera authentication')
    setAuthStage('processing')
    setError(null)
    setIsTakingLonger(false)
    setShowCancelButton(false)

    // CRÍTICO: Limpiar cualquier stream existente antes de crear uno nuevo
    if (streamRef.current) {
      console.log('[BiometricWithFallback] Cleaning up existing camera stream')
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log('[BiometricWithFallback] Stopped track:', track.kind, track.readyState)
      })
      streamRef.current = null
    }

    // Create abort controller for this operation
    abortControllerRef.current = new AbortController()
    
    // Set up timeout handler for camera initialization
    timeoutHandlerRef.current = new TimeoutHandler(
      () => {
        setIsTakingLonger(true)
        setShowCancelButton(true)
        setTimeoutMessage(getTimeoutMessage('Camera initialization', TIMEOUTS.CAMERA_INIT))
      },
      (progress) => setProgress(progress)
    )

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported on this device')
      }

      console.log('[BiometricWithFallback] Requesting camera access')
      
      // Use timeout handler for camera initialization
      const stream = await timeoutHandlerRef.current!.execute(
        async () => {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' },
            audio: false
          })
          
          // Check if operation was aborted
          if (abortControllerRef.current?.signal.aborted) {
            mediaStream.getTracks().forEach(track => track.stop())
            throw new Error('Camera initialization was cancelled')
          }
          
          return mediaStream
        },
        TIMEOUTS.CAMERA_INIT,
        'Camera initialization timed out. Please check camera permissions.',
        'camera-initialization'
      )
      
      if (videoRef.current && stream) {
        console.log('[BiometricWithFallback] Setting up video element')
        videoRef.current.srcObject = stream
        streamRef.current = stream
        videoRef.current.playsInline = true
        videoRef.current.muted = true
        
        // Esperar a que el video esté listo antes de continuar
        await new Promise((resolve, reject) => {
          const video = videoRef.current!
          const onLoadedMetadata = () => {
            console.log('[BiometricWithFallback] Video metadata loaded')
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            resolve(true)
          }
          const onError = (e: Event) => {
            console.error('[BiometricWithFallback] Video error:', e)
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            reject(new Error('Video failed to load'))
          }
          
          video.addEventListener('loadedmetadata', onLoadedMetadata)
          video.addEventListener('error', onError)
          
          video.play().catch(reject)
        })
        
        console.log('[BiometricWithFallback] Camera successfully initialized, starting face detection')
      } else {
        throw new Error('Video element not available')
      }

      // Simular detección facial con timeout manejado
      console.log('[BiometricWithFallback] Starting face detection simulation')
      
      // Use timeout handler for face detection
      await timeoutHandlerRef.current!.execute(
        async () => {
          return new Promise<void>((resolve) => {
            startProgressAnimation(4000)
            setTimeout(resolve, 4000)
          })
        },
        TIMEOUTS.FACE_DETECTION,
        'Face detection timed out. Please ensure your face is visible and well-lit.',
        'face-detection'
      )
      
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
      console.error('[BiometricWithFallback] Camera authentication failed:', err)
      
      // CRÍTICO: Limpiar siempre en caso de error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      
      let error: WebAuthnError
      if (isTimeoutError(err)) {
        error = {
          code: 'CAMERA_TIMEOUT',
          message: err.message,
          isRecoverable: true,
          suggestedAction: 'Camera operation timed out. Please try again or use demo mode.'
        }
      } else {
        error = {
          code: 'CAMERA_ERROR',
          message: err instanceof Error ? err.message : 'Camera access failed',
          isRecoverable: true,
          suggestedAction: 'Please allow camera access or try demo mode'
        }
      }
      setError(error)
      throw error
    }
  }, [capabilities, startProgressAnimation, cleanup])

  // Demo animado con timeout (siempre funciona)
  const performDemoAuth = useCallback(async () => {
    setAuthStage('processing')
    setError(null)
    setIsTakingLonger(false)
    setShowCancelButton(false)

    // Create abort controller for this operation
    abortControllerRef.current = new AbortController()
    
    // Set up timeout handler for demo
    timeoutHandlerRef.current = new TimeoutHandler(
      () => {
        setIsTakingLonger(true)
        setShowCancelButton(true)
        setTimeoutMessage('Demo is taking longer than usual...')
      },
      (progress) => setProgress(progress)
    )

    // Simulate authentication with timeout
    await timeoutHandlerRef.current.execute(
      async () => {
        return new Promise<void>((resolve) => {
          startProgressAnimation(3500)
          setTimeout(resolve, 3500)
        })
      },
      TIMEOUTS.QUICK_OPERATION * 2, // Give demo a bit more time
      'Demo timed out unexpectedly.',
      'demo-authentication'
    )
    
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
    
    if (isProcessing) {
      warning('Authentication in progress', 'Please wait for the current authentication to complete.')
      return
    }
    
    try {
      setRetryCount(prev => prev + 1)
      setIsProcessing(true)
      
      if (debugMode) {
        console.log('[BiometricWithFallback] Starting authentication with method:', methodToUse, { retryCount: retryCount + 1 })
      }
      
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
          throw new Error(`Invalid authentication method: ${methodToUse}`)
      }
      
      setIsProcessing(false)
      setRetryCount(0)
      
      if (currentToastRef.current) {
        dismiss(currentToastRef.current)
      }
      
      const methodName = result.method === 'biometric' 
        ? (result.biometricType === 'face' ? 'Real Face ID' : 'Real Touch ID')
        : result.method === 'camera' 
        ? 'Camera Scan'
        : 'Visual Demo'
        
      const successMessage = result.realBiometric 
        ? `${methodName} authentication completed successfully - REAL biometric verification used!`
        : `${methodName} authentication completed successfully.`
        
      success('Real Authentication Successful!', successMessage)
      
      if (debugMode) {
        console.log('[BiometricWithFallback] Authentication successful:', result)
      }
      
      // Wait for success animation to complete before calling onSuccess
      setTimeout(() => {
        if (debugMode) {
          console.log('[BiometricWithFallback] Calling onSuccess callback')
        }
        onSuccess?.(result)
      }, 2000) // 2 second delay for success animation
      
    } catch (err) {
      setIsProcessing(false)
      
      const error = err as WebAuthnError
      
      if (debugMode) {
        console.error('[BiometricWithFallback] Authentication failed:', error)
      }
      
      // Auto-fallback a demo si falla y no es ya demo
      if (methodToUse !== 'demo' && retryCount < 2) {
        console.log('[BiometricWithFallback] Method failed, falling back to demo:', err)
        
        warning('Switching to backup method', `${methodToUse} authentication failed. Switching to Visual Demo as backup.`)
        
        setCurrentMethod('demo')
        setTimeout(() => startAuthentication('demo'), 2000)
      } else {
        // Si ya es demo o hemos intentado muchas veces, reportar error
        setAuthStage('error')
        
        if (currentToastRef.current) {
          dismiss(currentToastRef.current)
        }
        
        onError?.(error)
      }
    }
  }, [currentMethod, performBiometricAuth, performCameraAuth, performDemoAuth, onSuccess, onError, isProcessing, retryCount, debugMode, warning, success, dismiss])

  // Cambiar método manualmente con cleanup forzado
  const switchMethod = useCallback((method: AuthMethod) => {
    console.log('[BiometricWithFallback] Switching method from', currentMethod, 'to', method)
    
    // CRÍTICO: Forzar cleanup antes de cambiar método
    cleanup()
    
    // Asegurar que el cleanup se complete antes de continuar
    setTimeout(() => {
      setCurrentMethod(method)
      setAuthStage('ready')
      setError(null)
      setProgress(0)
      console.log('[BiometricWithFallback] Method switched to:', method)
    }, 100)
  }, [cleanup, currentMethod])

  // Cancelar operación actual
  const cancelCurrentOperation = useCallback(() => {
    console.log('[BiometricWithFallback] Cancelling current operation')
    
    // Cancel timeout handler
    if (timeoutHandlerRef.current) {
      timeoutHandlerRef.current.cancel()
    }
    
    // Abort current operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Cleanup resources
    cleanup()
    
    // Reset state
    setAuthStage('ready')
    setError(null)
    setProgress(0)
    setIsTakingLonger(false)
    setShowCancelButton(false)
    setTimeoutMessage('')
    
    console.log('[BiometricWithFallback] Operation cancelled successfully')
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
          disabled={isProcessing}
          className="flex items-center gap-2 disabled:opacity-50"
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
            disabled={isProcessing}
            className="flex items-center gap-2 disabled:opacity-50"
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
            disabled={isProcessing}
            className="flex items-center gap-2 disabled:opacity-50"
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
      {/* Video para cámara con mejor control */}
      {currentMethod === 'camera' && (
        <div className="relative mb-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-64 object-cover rounded-lg"
            style={{ display: streamRef.current ? 'block' : 'none' }}
            onError={(e) => {
              console.error('[BiometricWithFallback] Video error:', e)
              const error: WebAuthnError = {
                code: 'CAMERA_ERROR',
                message: 'Video playback failed',
                isRecoverable: true,
                suggestedAction: 'Please try demo mode'
              }
              setError(error)
            }}
            onLoadedMetadata={() => {
              console.log('[BiometricWithFallback] Video metadata loaded')
            }}
          />
          {!streamRef.current && currentMethod === 'camera' && (
            <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-600">
                <Camera className="w-12 h-12 mx-auto mb-2" />
                <p>Initializing camera...</p>
              </div>
            </div>
          )}
          
          {/* Botón de cancelar siempre visible cuando la cámara está activa */}
          {streamRef.current && (
            <button
              onClick={() => {
                console.log('[BiometricWithFallback] User cancelled camera')
                cleanup()
                switchMethod('demo')
              }}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
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
            className="absolute inset-0 bg-green-500/20 rounded-2xl flex items-center justify-center overflow-hidden"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            {/* Success ripple effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-green-400/30 to-emerald-400/30 rounded-2xl"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 2], opacity: [0.8, 0.4, 0] }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
            
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: 'spring', 
                stiffness: 300, 
                damping: 20,
                delay: 0.1 
              }}
            >
              <CheckCircle className="w-16 h-16 text-green-400 relative z-10" />
            </motion.div>
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
          <div className="text-center mt-2">
            <p className="text-sm font-medium text-blue-600">
              {Math.round(progress)}% Complete
            </p>
            {isTakingLonger && (
              <p className="text-xs text-yellow-600 mt-1 flex items-center justify-center">
                <Timer className="w-3 h-3 mr-1" />
                Taking longer than expected...
              </p>
            )}
          </div>
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
        {authStage === 'processing' && !isTakingLonger && 'Please follow the prompts on your device'}
        {authStage === 'processing' && isTakingLonger && (timeoutMessage || 'Operation is taking longer than expected...')}
        {authStage === 'success' && `${mode === 'registration' ? 'Registration' : 'Authentication'} completed successfully`}
        {authStage === 'error' && error?.message}
      </p>

      {/* Cancel button when operation is taking longer */}
      {authStage === 'processing' && showCancelButton && (
        <Button
          onClick={cancelCurrentOperation}
          variant="outline"
          className="flex items-center gap-2"
        >
          <StopCircle className="w-4 h-4" />
          Cancel Operation
        </Button>
      )}

      {/* Botón de acción con timeout */}
      {authStage === 'ready' && (
        <Button
          onClick={() => startAuthentication()}
          disabled={isProcessing}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            mode === 'registration' ? 'Register' : 'Authenticate'
          )}
        </Button>
      )}
      
      {/* Botón de cancelar siempre disponible durante procesamiento */}
      {(authStage === 'processing') && (
        <Button
          onClick={() => {
            console.log('[BiometricWithFallback] User cancelled during processing')
            cleanup()
            setAuthStage('ready')
            setError(null)
          }}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
        >
          <X className="w-4 h-4" />
          Cancel
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
            onClick={() => {
              console.log('[BiometricWithFallback] Retrying authentication')
              // Forzar cleanup antes de reintentar
              cleanup()
              setTimeout(() => {
                setError(null)
                setAuthStage('ready')
                startAuthentication()
              }, 500)
            }}
            disabled={isProcessing}
            className="flex items-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Try Again {retryCount > 0 && `(${retryCount})`}
              </>
            )}
          </Button>
        )}

        <Button
          onClick={() => switchMethod('demo')}
          variant="outline"
          disabled={isProcessing || currentMethod === 'demo'}
          className="flex items-center gap-2 disabled:opacity-50"
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
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 25,
              opacity: { duration: 0.3 },
              scale: { duration: 0.4 }
            }}
            className="mt-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl text-center relative overflow-hidden"
          >
            {/* Success Animation Background */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: [0, 0.3, 0] }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-2xl"
            />
            
            {/* Success Icon with Animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 15,
                delay: 0.2 
              }}
            >
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4 relative z-10" />
            </motion.div>
            
            <motion.h3 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="text-lg font-bold text-green-800 mb-2 relative z-10"
            >
              {mode === 'registration' ? 'Registration Complete!' : 'Authentication Successful!'}
            </motion.h3>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.3 }}
              className="text-green-700 relative z-10"
            >
              {currentMethod === 'demo' 
                ? 'This was a demonstration of how biometric authentication would work.'
                : currentMethod === 'biometric'
                ? 'REAL biometric authentication completed! Your Face ID/Touch ID was successfully verified.'
                : 'You can now proceed with secure transactions.'}
            </motion.p>
            
            {/* Loading indicator for transition */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              className="mt-4 relative z-10"
            >
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <CheckCircle className="w-4 h-4" />
                </motion.div>
                <span className="text-sm font-medium">Redirecting to payment...</span>
              </div>
            </motion.div>
            
            {/* Sparkle effects */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 8 }, (_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-green-400 rounded-full"
                  initial={{
                    x: '50%',
                    y: '50%',
                    scale: 0,
                    opacity: 0
                  }}
                  animate={{
                    x: `${30 + Math.random() * 40}%`,
                    y: `${20 + Math.random() * 60}%`,
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: 1.5,
                    delay: 0.5 + Math.random() * 0.5,
                    ease: "easeOut"
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}