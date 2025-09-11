/**
 * Configuration and constants for face detection service
 * Centralized configuration for production-ready face detection
 */

export const FACE_DETECTION_CONFIG = {
  // Model configuration
  MODELS: {
    FACE_DETECTION: {
      scoreThreshold: 0.5,
      iouThreshold: 0.3,
      maxFaces: 1,
      flipHorizontal: false,
      refineLandmarks: true
    },
    FACE_LANDMARKS: {
      maxFaces: 1,
      refineLandmarks: true,
      scoreThreshold: 0.5
    }
  },

  // Quality thresholds for different use cases
  QUALITY_THRESHOLDS: {
    AUTHENTICATION: {
      minOverallQuality: 0.70,
      minBrightness: 0.25,
      maxBrightness: 0.90,
      minSharpness: 0.40,
      minContrast: 0.25,
      minFaceSize: 0.15,
      maxFaceSize: 0.75,
      centerTolerance: 0.20,
      requireFrontal: true,
      requireEyesOpen: true
    },
    ENROLLMENT: {
      minOverallQuality: 0.85,
      minBrightness: 0.30,
      maxBrightness: 0.85,
      minSharpness: 0.60,
      minContrast: 0.35,
      minFaceSize: 0.20,
      maxFaceSize: 0.65,
      centerTolerance: 0.15,
      requireFrontal: true,
      requireEyesOpen: true
    },
    DEMO: {
      minOverallQuality: 0.40,
      minBrightness: 0.15,
      maxBrightness: 0.95,
      minSharpness: 0.25,
      minContrast: 0.15,
      minFaceSize: 0.10,
      maxFaceSize: 0.85,
      centerTolerance: 0.30,
      requireFrontal: false,
      requireEyesOpen: false
    }
  },

  // Camera settings
  CAMERA: {
    PREFERRED_WIDTH: 1280,
    PREFERRED_HEIGHT: 720,
    MIN_WIDTH: 640,
    MIN_HEIGHT: 480,
    FRAME_RATE: 30,
    FACING_MODE: 'user' as const
  },

  // Detection intervals (ms)
  DETECTION_INTERVALS: {
    REAL_TIME: 100,      // Very fast for real-time feedback
    CONTINUOUS: 200,     // Standard continuous detection
    PERIODIC: 500,       // Periodic checks
    ON_DEMAND: 0         // Only on explicit calls
  },

  // Performance settings
  PERFORMANCE: {
    MAX_PROCESSING_TIME: 5000,    // Max time for single detection (ms)
    MODEL_LOAD_TIMEOUT: 30000,    // Max time to load models (ms)
    MEMORY_CLEANUP_INTERVAL: 60000, // Cleanup interval (ms)
    MAX_CONCURRENT_DETECTIONS: 1   // Prevent multiple simultaneous detections
  },

  // Error retry configuration
  ERROR_HANDLING: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    RECOVERABLE_ERRORS: [
      'NO_FACE_DETECTED',
      'POOR_QUALITY',
      'PROCESSING_ERROR'
    ],
    FATAL_ERRORS: [
      'MODEL_LOAD_FAILED',
      'NO_CAMERA'
    ]
  },

  // Biometric template settings
  BIOMETRIC_TEMPLATE: {
    MAX_LANDMARKS: 68,        // Key facial landmarks to store
    TEMPLATE_VERSION: '1.0',
    ENCRYPTION_REQUIRED: true,
    MAX_TEMPLATE_SIZE: 10240  // Max size in bytes
  }
} as const

/**
 * Environment-specific configuration
 */
export const getEnvironmentConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    isDevelopment,
    isProduction,
    
    // Enable more detailed logging in development
    enableDebugLogging: isDevelopment,
    
    // Use stricter quality in production
    qualityProfile: isProduction ? 'AUTHENTICATION' : 'DEMO',
    
    // More frequent detection in development for testing
    detectionInterval: isDevelopment 
      ? FACE_DETECTION_CONFIG.DETECTION_INTERVALS.REAL_TIME
      : FACE_DETECTION_CONFIG.DETECTION_INTERVALS.CONTINUOUS,
      
    // More lenient timeouts in development
    processingTimeout: isDevelopment 
      ? FACE_DETECTION_CONFIG.PERFORMANCE.MAX_PROCESSING_TIME * 2
      : FACE_DETECTION_CONFIG.PERFORMANCE.MAX_PROCESSING_TIME
  }
}

/**
 * Device capability detection
 */
export const getDeviceCapabilities = () => {
  if (typeof window === 'undefined') {
    return {
      hasCamera: false,
      hasWebGL: false,
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      supportsWebRTC: false
    }
  }

  const userAgent = navigator.userAgent.toLowerCase()
  const isIOS = /iphone|ipad|ipod/.test(userAgent)
  const isAndroid = /android/.test(userAgent)
  const isMobile = isIOS || isAndroid || /mobile/.test(userAgent)

  return {
    hasCamera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    hasWebGL: !!window.WebGLRenderingContext,
    isMobile,
    isIOS,
    isAndroid,
    supportsWebRTC: !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection),
    
    // Performance hints based on device
    recommendedInterval: isMobile 
      ? FACE_DETECTION_CONFIG.DETECTION_INTERVALS.CONTINUOUS 
      : FACE_DETECTION_CONFIG.DETECTION_INTERVALS.REAL_TIME,
      
    recommendedQuality: isMobile ? 'DEMO' : 'AUTHENTICATION'
  }
}

/**
 * Quality profile selector
 */
export const getQualityProfile = (profile: 'AUTHENTICATION' | 'ENROLLMENT' | 'DEMO' = 'AUTHENTICATION') => {
  return FACE_DETECTION_CONFIG.QUALITY_THRESHOLDS[profile]
}

/**
 * Camera constraints generator
 */
export const getCameraConstraints = (options?: {
  width?: number
  height?: number
  facingMode?: 'user' | 'environment'
}) => {
  const config = FACE_DETECTION_CONFIG.CAMERA
  
  return {
    video: {
      width: {
        ideal: options?.width || config.PREFERRED_WIDTH,
        min: config.MIN_WIDTH
      },
      height: {
        ideal: options?.height || config.PREFERRED_HEIGHT,
        min: config.MIN_HEIGHT
      },
      frameRate: {
        ideal: config.FRAME_RATE
      },
      facingMode: options?.facingMode || config.FACING_MODE
    },
    audio: false
  } as MediaStreamConstraints
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static timings: Map<string, number> = new Map()
  private static counters: Map<string, number> = new Map()

  static startTiming(label: string): void {
    this.timings.set(label, performance.now())
  }

  static endTiming(label: string): number {
    const start = this.timings.get(label)
    if (!start) return 0
    
    const duration = performance.now() - start
    this.timings.delete(label)
    return duration
  }

  static increment(counter: string): void {
    const current = this.counters.get(counter) || 0
    this.counters.set(counter, current + 1)
  }

  static getCounter(counter: string): number {
    return this.counters.get(counter) || 0
  }

  static getStats(): Record<string, number> {
    return Object.fromEntries(this.counters)
  }

  static reset(): void {
    this.timings.clear()
    this.counters.clear()
  }
}

/**
 * Feature flags for experimental features
 */
export const FEATURE_FLAGS = {
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_DETAILED_LANDMARKS: true,
  ENABLE_QUALITY_CACHING: true,
  ENABLE_BACKGROUND_PROCESSING: false, // Experimental
  ENABLE_MULTI_FACE_DETECTION: false,  // For future use
  ENABLE_EMOTION_DETECTION: false      // Requires additional models
} as const

/**
 * Error messages localization
 */
export const ERROR_MESSAGES = {
  en: {
    MODEL_LOAD_FAILED: 'Failed to load face detection models',
    NO_CAMERA: 'Camera not available or access denied',
    NO_FACE_DETECTED: 'No face detected in the camera view',
    POOR_QUALITY: 'Face quality is too low for authentication',
    MULTIPLE_FACES: 'Multiple faces detected - please ensure only one person is visible',
    PROCESSING_ERROR: 'An error occurred while processing the face detection'
  },
  es: {
    MODEL_LOAD_FAILED: 'Error al cargar los modelos de detección facial',
    NO_CAMERA: 'Cámara no disponible o acceso denegado',
    NO_FACE_DETECTED: 'No se detectó ningún rostro en la vista de la cámara',
    POOR_QUALITY: 'La calidad del rostro es demasiado baja para la autenticación',
    MULTIPLE_FACES: 'Se detectaron múltiples rostros - asegúrese de que solo una persona sea visible',
    PROCESSING_ERROR: 'Ocurrió un error al procesar la detección facial'
  }
} as const