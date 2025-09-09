// User and Authentication Types
export interface User {
  id: string
  email: string
  name?: string | null
  createdAt: Date
  updatedAt: Date
  biometricData?: BiometricData[]
  paymentMethods?: PaymentMethod[]
}

export interface BiometricData {
  id: string
  userId: string
  type: 'face' | 'fingerprint' | 'voice'
  data: string // Encrypted biometric template
  createdAt: Date
  isActive: boolean
}

// WebAuthn Types
export interface WebAuthnCredential {
  id: string
  credentialId: string
  publicKey: string
  counter: number
  userId: string
  createdAt: Date
}

// Payment Types
export interface PaymentMethod {
  id: string
  userId: string
  type: 'card' | 'bank' | 'crypto'
  provider: 'stripe' | 'ethereum' | 'bitcoin'
  details: PaymentMethodDetails
  isDefault: boolean
  createdAt: Date
}

export interface PaymentMethodDetails {
  // Stripe card details
  stripePaymentMethodId?: string
  last4?: string
  brand?: string
  expMonth?: number
  expYear?: number
  
  // Crypto wallet details
  walletAddress?: string
  network?: string
}

export interface Transaction {
  id: string
  userId: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  paymentMethodId: string
  description?: string
  metadata?: Record<string, any>
  createdAt: Date
  completedAt?: Date
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Authentication Options
export interface AuthOptions {
  enableFaceRecognition: boolean
  enableWebAuthn: boolean
  requireBiometric: boolean
}

// Face Recognition Types
export interface FaceRecognitionResult {
  confidence: number
  userId?: string
  error?: string
  verified: boolean
}

export interface FaceEmbedding {
  vector: number[]
  quality: number
  confidence: number
  metadata: {
    extractedAt: string
    imageHash: string
    dimensions?: { width: number; height: number }
    processingTime?: number
  }
}

export interface FaceVerificationConfig {
  confidenceThreshold: number
  maxAttempts: number
  attemptWindowMinutes: number
  enableLogging: boolean
  qualityThreshold: number
  antiSpoofingEnabled: boolean
}

export interface VerificationResult {
  success: boolean
  confidence: number
  userId?: string
  attemptId: string
  riskScore: number
  message: string
  metadata?: {
    processingTime: number
    qualityScore: number
    antiSpoofingPassed: boolean
  }
}

export interface EnrollmentResult {
  success: boolean
  embeddingId: string
  quality: number
  message: string
  metadata?: {
    processingTime: number
    imageQuality: number
  }
}

export interface VerificationAttempt {
  id: string
  userId: string
  timestamp: Date
  success: boolean
  confidence: number
  ipAddress?: string
  userAgent?: string
  riskScore?: number
}

// Enhanced Face Detection Types
export interface FaceDetectionOptions {
  maxFaces: number
  flipHorizontal: boolean
  scoreThreshold: number
  iouThreshold: number
}

export interface FaceLandmark {
  x: number
  y: number
  z?: number
}

export interface FaceBox {
  xMin: number
  yMin: number
  width: number
  height: number
}

export interface DetectedFace {
  box: FaceBox
  keypoints: FaceLandmark[]
  score: number
  landmarks?: FaceLandmark[]
}

export interface FaceQualityMetrics {
  score: number
  brightness: number
  sharpness: number
  contrast: number
  faceSize: number
  centered: boolean
  frontal: boolean
  eyesOpen: boolean
  details: {
    lighting: 'poor' | 'adequate' | 'good' | 'excellent'
    position: 'off-center' | 'slightly-off' | 'centered'
    angle: 'profile' | 'angled' | 'frontal'
    size: 'too-small' | 'adequate' | 'optimal' | 'too-large'
  }
}

export interface FaceDetectionError {
  code: 'MODEL_LOAD_FAILED' | 'NO_CAMERA' | 'NO_FACE_DETECTED' | 'POOR_QUALITY' | 'MULTIPLE_FACES' | 'PROCESSING_ERROR'
  message: string
  isRecoverable: boolean
  suggestedAction: string
}