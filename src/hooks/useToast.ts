'use client'

import { useState, useCallback, useRef } from 'react'
import { generateSecureId } from '@/lib/utils'

export interface ToastData {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading'
  duration?: number
  persistent?: boolean
  action?: {
    label: string
    onClick: () => void
    altText: string
  }
  onClose?: () => void
  timestamp: number
}

interface UseToastReturn {
  toasts: ToastData[]
  toast: (data: Omit<ToastData, 'id' | 'timestamp'>) => string
  success: (title: string, description?: string, options?: Partial<ToastData>) => string
  error: (title: string, description?: string, options?: Partial<ToastData>) => string
  warning: (title: string, description?: string, options?: Partial<ToastData>) => string
  info: (title: string, description?: string, options?: Partial<ToastData>) => string
  loading: (title: string, description?: string, options?: Partial<ToastData>) => string
  dismiss: (id: string) => void
  dismissAll: () => void
  update: (id: string, data: Partial<ToastData>) => void
}

const MAX_TOASTS = 5
const DEFAULT_DURATION = 5000

// Global state for toasts
let toastState: ToastData[] = []
let listeners: Set<(toasts: ToastData[]) => void> = new Set()

const notifyListeners = () => {
  listeners.forEach(listener => listener(toastState))
}

const addToast = (data: Omit<ToastData, 'id' | 'timestamp'>): string => {
  const id = generateSecureId()
  const toast: ToastData = {
    id,
    timestamp: Date.now(),
    duration: DEFAULT_DURATION,
    ...data,
  }
  
  toastState = [toast, ...toastState].slice(0, MAX_TOASTS)
  notifyListeners()
  
  // Auto dismiss if not persistent
  if (!toast.persistent && toast.duration && toast.duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, toast.duration)
  }
  
  return id
}

const removeToast = (id: string) => {
  toastState = toastState.filter(toast => toast.id !== id)
  notifyListeners()
}

const updateToast = (id: string, data: Partial<ToastData>) => {
  toastState = toastState.map(toast =>
    toast.id === id ? { ...toast, ...data } : toast
  )
  notifyListeners()
}

const clearAllToasts = () => {
  toastState = []
  notifyListeners()
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastData[]>(toastState)
  const listenerRef = useRef<(toasts: ToastData[]) => void>()

  // Subscribe to global state changes
  React.useEffect(() => {
    listenerRef.current = setToasts
    listeners.add(listenerRef.current)
    
    return () => {
      if (listenerRef.current) {
        listeners.delete(listenerRef.current)
      }
    }
  }, [])

  const toast = useCallback((data: Omit<ToastData, 'id' | 'timestamp'>) => {
    return addToast(data)
  }, [])

  const success = useCallback((title: string, description?: string, options: Partial<ToastData> = {}) => {
    return addToast({
      title,
      description,
      variant: 'success',
      ...options,
    })
  }, [])

  const error = useCallback((title: string, description?: string, options: Partial<ToastData> = {}) => {
    return addToast({
      title,
      description,
      variant: 'error',
      duration: 8000, // Errors stay longer by default
      ...options,
    })
  }, [])

  const warning = useCallback((title: string, description?: string, options: Partial<ToastData> = {}) => {
    return addToast({
      title,
      description,
      variant: 'warning',
      duration: 6000, // Warnings stay a bit longer
      ...options,
    })
  }, [])

  const info = useCallback((title: string, description?: string, options: Partial<ToastData> = {}) => {
    return addToast({
      title,
      description,
      variant: 'info',
      ...options,
    })
  }, [])

  const loading = useCallback((title: string, description?: string, options: Partial<ToastData> = {}) => {
    return addToast({
      title,
      description,
      variant: 'loading',
      persistent: true, // Loading toasts don't auto-dismiss
      ...options,
    })
  }, [])

  const dismiss = useCallback((id: string) => {
    removeToast(id)
  }, [])

  const dismissAll = useCallback(() => {
    clearAllToasts()
  }, [])

  const update = useCallback((id: string, data: Partial<ToastData>) => {
    updateToast(id, data)
  }, [])

  return {
    toasts,
    toast,
    success,
    error,
    warning,
    info,
    loading,
    dismiss,
    dismissAll,
    update,
  }
}

// React import for useEffect
import * as React from 'react'

// Utility functions for common toast patterns
export const toastPatterns = {
  // Biometric authentication patterns
  biometricSuccess: (method: string) => ({
    title: 'Authentication Successful',
    description: `${method} authentication completed successfully.`,
    variant: 'success' as const,
  }),

  biometricError: (error: string, method?: string) => ({
    title: 'Authentication Failed',
    description: method 
      ? `${method} authentication failed: ${error}`
      : `Biometric authentication failed: ${error}`,
    variant: 'error' as const,
    action: {
      label: 'Try Again',
      onClick: () => window.location.reload(),
      altText: 'Retry authentication'
    }
  }),

  cameraPermissionDenied: () => ({
    title: 'Camera Permission Denied',
    description: 'Please enable camera access in your browser settings to use face recognition.',
    variant: 'warning' as const,
    duration: 8000,
    action: {
      label: 'Help',
      onClick: () => window.open('/help/camera-permissions', '_blank'),
      altText: 'Learn how to enable camera permissions'
    }
  }),

  deviceNotSupported: () => ({
    title: 'Device Not Supported',
    description: 'Your device doesn\'t support biometric authentication. Please use an alternative method.',
    variant: 'warning' as const,
    duration: 8000,
  }),

  connectionTimeout: () => ({
    title: 'Connection Timeout',
    description: 'Please check your internet connection and try again.',
    variant: 'error' as const,
    action: {
      label: 'Retry',
      onClick: () => window.location.reload(),
      altText: 'Retry connection'
    }
  }),

  loadingAuth: (method: string) => ({
    title: `Authenticating with ${method}`,
    description: 'Please follow the prompts on your device...',
    variant: 'loading' as const,
    persistent: true,
  }),

  registrationSuccess: () => ({
    title: 'Registration Complete',
    description: 'Your biometric authentication has been successfully set up.',
    variant: 'success' as const,
    duration: 6000,
  }),

  fallbackActivated: (originalMethod: string, fallbackMethod: string) => ({
    title: 'Switched to Fallback Method',
    description: `${originalMethod} failed, now using ${fallbackMethod}.`,
    variant: 'info' as const,
  }),

  debugMode: (message: string) => ({
    title: 'Debug Info',
    description: message,
    variant: 'info' as const,
    duration: 3000,
  }),
}