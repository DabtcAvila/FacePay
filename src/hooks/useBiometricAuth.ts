'use client'

import { useState, useCallback, useEffect } from 'react'
import { WebAuthnService, type WebAuthnCapabilities, type WebAuthnError } from '@/services/webauthn'
import type { BiometricAuthResult } from '@/components/BiometricWithFallback'

export interface BiometricAuthState {
  isSupported: boolean
  isAvailable: boolean
  capabilities: WebAuthnCapabilities | null
  isLoading: boolean
  error: WebAuthnError | null
}

export interface BiometricAuthActions {
  authenticate: (userId?: string, userName?: string) => Promise<BiometricAuthResult>
  register: (userId?: string, userName?: string) => Promise<BiometricAuthResult>
  checkCapabilities: () => Promise<WebAuthnCapabilities>
  clearError: () => void
  reset: () => void
}

export interface UseBiometricAuthOptions {
  autoCheck?: boolean
  defaultUserId?: string
  defaultUserName?: string
}

export interface UseBiometricAuthReturn {
  state: BiometricAuthState
  actions: BiometricAuthActions
}

/**
 * Hook personalizado para manejar autenticación biométrica con fallbacks automáticos
 * 
 * Características:
 * - Detección automática de capacidades del dispositivo
 * - Fallback automático a modo demo si biometría no está disponible
 * - Manejo de errores simplificado
 * - Estado de carga y disponibilidad
 * 
 * @param options Opciones de configuración
 * @returns Estado y acciones para autenticación biométrica
 */
export function useBiometricAuth(options: UseBiometricAuthOptions = {}): UseBiometricAuthReturn {
  const {
    autoCheck = true,
    defaultUserId = 'default-user',
    defaultUserName = 'user@example.com'
  } = options

  const [capabilities, setCapabilities] = useState<WebAuthnCapabilities | null>(null)
  const [isLoading, setIsLoading] = useState(autoCheck)
  const [error, setError] = useState<WebAuthnError | null>(null)

  // Verificar capacidades del dispositivo
  const checkCapabilities = useCallback(async (): Promise<WebAuthnCapabilities> => {
    setIsLoading(true)
    setError(null)

    try {
      const caps = await WebAuthnService.checkBrowserCapabilities()
      setCapabilities(caps)
      
      console.log('[useBiometricAuth] Capabilities checked:', {
        isSupported: caps.isSupported,
        isPlatformAuthenticatorAvailable: caps.isPlatformAuthenticatorAvailable,
        biometricTypes: caps.biometricTypes,
        deviceInfo: caps.deviceInfo
      })

      return caps
    } catch (err) {
      const webAuthnError: WebAuthnError = {
        code: 'CAPABILITY_CHECK_FAILED',
        message: 'Failed to check device capabilities',
        isRecoverable: true,
        suggestedAction: 'Please try again or use demo mode',
        details: err instanceof Error ? err.message : 'Unknown error'
      }
      
      setError(webAuthnError)
      
      // Fallback capabilities
      const fallbackCapabilities: WebAuthnCapabilities = {
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
          platform: 'unknown',
          isMobile: false,
          isIOS: false,
          isAndroid: false,
          isMacOS: false,
          isWindows: false
        }
      }
      
      setCapabilities(fallbackCapabilities)
      return fallbackCapabilities
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Función simulada de autenticación (en producción conectar con API real)
  const performAuth = useCallback(async (
    mode: 'authentication' | 'registration',
    userId: string,
    userName: string
  ): Promise<BiometricAuthResult> => {
    if (!capabilities) {
      throw new Error('Capabilities not checked yet')
    }

    const method = capabilities.isPlatformAuthenticatorAvailable ? 'biometric' : 'demo'
    
    console.log(`[useBiometricAuth] Starting ${mode} with method: ${method}`)

    try {
      if (method === 'biometric') {
        // TODO: Implementar llamada real a API de biometría
        // Por ahora simulamos el proceso
        
        // Verificar que el autenticador esté disponible
        const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        
        if (!isAvailable) {
          throw new Error('Platform authenticator not available')
        }

        // En producción, aquí se harían las llamadas a:
        // - POST /api/webauthn/registration/start (para registro)
        // - POST /api/webauthn/authentication/start (para autenticación)
        // - navigator.credentials.create() o navigator.credentials.get()
        // - POST /api/webauthn/registration/complete o /api/webauthn/authentication/complete

        // Simulación del flujo
        await new Promise(resolve => setTimeout(resolve, 2000))

        return {
          success: true,
          method: 'biometric',
          biometricType: (['face', 'fingerprint'].includes(capabilities.biometricTypes[0]) ? capabilities.biometricTypes[0] : 'unknown') as 'face' | 'fingerprint' | 'unknown',
          deviceInfo: {
            isIOS: capabilities.deviceInfo.isIOS,
            isMobile: capabilities.deviceInfo.isMobile,
            platform: capabilities.deviceInfo.platform
          },
          timestamp: Date.now()
        }
      } else {
        // Modo demo - siempre funciona
        await new Promise(resolve => setTimeout(resolve, 1500))

        return {
          success: true,
          method: 'demo',
          deviceInfo: {
            isIOS: capabilities.deviceInfo.isIOS,
            isMobile: capabilities.deviceInfo.isMobile,
            platform: capabilities.deviceInfo.platform
          },
          timestamp: Date.now()
        }
      }
    } catch (err) {
      const webAuthnError = WebAuthnService.handleWebAuthnError(err)
      setError(webAuthnError)
      throw webAuthnError
    }
  }, [capabilities])

  // Autenticar usuario
  const authenticate = useCallback(async (
    userId: string = defaultUserId,
    userName: string = defaultUserName
  ): Promise<BiometricAuthResult> => {
    setError(null)
    
    if (!capabilities) {
      await checkCapabilities()
    }
    
    return performAuth('authentication', userId, userName)
  }, [capabilities, defaultUserId, defaultUserName, checkCapabilities, performAuth])

  // Registrar usuario
  const register = useCallback(async (
    userId: string = defaultUserId,
    userName: string = defaultUserName
  ): Promise<BiometricAuthResult> => {
    setError(null)
    
    if (!capabilities) {
      await checkCapabilities()
    }
    
    return performAuth('registration', userId, userName)
  }, [capabilities, defaultUserId, defaultUserName, checkCapabilities, performAuth])

  // Limpiar error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Reset completo
  const reset = useCallback(() => {
    setCapabilities(null)
    setIsLoading(false)
    setError(null)
  }, [])

  // Verificación automática al inicializar
  useEffect(() => {
    if (autoCheck && !capabilities) {
      checkCapabilities()
    }
  }, [autoCheck, capabilities, checkCapabilities])

  // Estado derivado
  const isSupported = capabilities?.isSupported ?? false
  const isAvailable = capabilities?.isPlatformAuthenticatorAvailable ?? false

  return {
    state: {
      isSupported,
      isAvailable,
      capabilities,
      isLoading,
      error
    },
    actions: {
      authenticate,
      register,
      checkCapabilities,
      clearError,
      reset
    }
  }
}

/**
 * Hook simplificado para verificar si biometría está disponible
 */
export function useBiometricSupport() {
  const { state } = useBiometricAuth({ autoCheck: true })
  
  return {
    isSupported: state.isSupported,
    isAvailable: state.isAvailable,
    isLoading: state.isLoading,
    deviceInfo: state.capabilities?.deviceInfo,
    biometricTypes: state.capabilities?.biometricTypes || []
  }
}