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