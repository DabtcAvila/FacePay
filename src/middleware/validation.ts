import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

// Common validation schemas
export const emailSchema = z.string()
  .email('Invalid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must not exceed 255 characters')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format')

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')

export const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name can only contain letters, spaces, hyphens, apostrophes, and periods')

export const idSchema = z.string()
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format')
  .min(1, 'ID is required')
  .max(255, 'ID too long')

export const uuidSchema = z.string()
  .uuid('Invalid UUID format')

export const positiveIntSchema = z.number()
  .int('Must be an integer')
  .positive('Must be positive')

export const amountSchema = z.number()
  .positive('Amount must be positive')
  .max(1000000, 'Amount too large')
  .multipleOf(0.01, 'Amount must have at most 2 decimal places')

export const currencySchema = z.string()
  .length(3, 'Currency must be 3 characters')
  .regex(/^[A-Z]{3}$/, 'Currency must be uppercase letters')

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// Authentication schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

// Profile schemas
export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
}).refine(data => data.name || data.email, {
  message: 'At least one field must be provided',
})

// Payment schemas
export const paymentIntentSchema = z.object({
  amount: amountSchema,
  currency: currencySchema.default('USD'),
  paymentMethodId: z.string().optional(),
  description: z.string().max(500, 'Description too long').optional(),
  metadata: z.record(z.string()).optional(),
})

export const paymentMethodSchema = z.object({
  type: z.enum(['card', 'bank_account', 'wallet']),
  provider: z.enum(['stripe', 'paypal', 'apple_pay', 'google_pay']),
  details: z.record(z.any()),
  isDefault: z.boolean().default(false),
})

// Transaction schemas
export const transactionQuerySchema = z.object({
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.coerce.number().positive().optional(),
  maxAmount: z.coerce.number().positive().optional(),
  paymentMethodId: idSchema.optional(),
}).merge(paginationSchema)

export const refundSchema = z.object({
  amount: amountSchema.optional(),
  reason: z.string().max(500, 'Reason too long').optional(),
})

// WebAuthn schemas
export const webauthnChallengeSchema = z.object({
  challenge: z.string().min(1, 'Challenge is required'),
  userVerification: z.enum(['required', 'preferred', 'discouraged']).default('preferred'),
})

export const webauthnCredentialSchema = z.object({
  id: z.string().min(1),
  rawId: z.string().min(1),
  response: z.object({
    authenticatorData: z.string().optional(),
    clientDataJSON: z.string().min(1),
    signature: z.string().optional(),
    attestationObject: z.string().optional(),
  }),
  type: z.literal('public-key'),
  clientExtensionResults: z.record(z.any()).optional(),
})

export const webauthnRegistrationSchema = z.object({
  credential: webauthnCredentialSchema,
})

export const webauthnAuthenticationSchema = z.object({
  credential: webauthnCredentialSchema,
})

// Analytics schemas
export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
  metrics: z.array(z.enum(['transactions', 'revenue', 'users', 'success_rate'])).default(['transactions', 'revenue']),
})

// Biometric schemas
export const biometricDataSchema = z.object({
  type: z.enum(['face_scan', 'webauthn_passkey', 'fingerprint']),
  data: z.record(z.any()),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.any()).optional(),
})

// Validation middleware factory
export function createValidationMiddleware<T>(
  schema: z.ZodSchema<T>,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return async (
    request: NextRequest,
    extractedData?: any
  ): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> => {
    try {
      let rawData: any

      switch (source) {
        case 'body':
          try {
            rawData = await request.json()
          } catch (error) {
            return {
              data: null,
              error: NextResponse.json(
                {
                  success: false,
                  error: 'Invalid JSON in request body',
                  code: 'INVALID_JSON'
                },
                { status: 400 }
              )
            }
          }
          break
        case 'query':
          rawData = Object.fromEntries(request.nextUrl.searchParams.entries())
          break
        case 'params':
          rawData = extractedData || {}
          break
      }

      // Sanitize data (basic XSS prevention)
      const sanitizedData = sanitizeData(rawData)
      
      // Validate with Zod
      const result = schema.safeParse(sanitizedData)

      if (!result.success) {
        const firstError = result.error.errors[0]
        
        console.warn('[Validation] Schema validation failed:', {
          path: request.nextUrl.pathname,
          source,
          error: firstError.message,
          field: firstError.path.join('.'),
          timestamp: new Date().toISOString()
        })

        return {
          data: null,
          error: NextResponse.json(
            {
              success: false,
              error: `Validation failed: ${firstError.message}`,
              code: 'VALIDATION_ERROR',
              field: firstError.path.join('.'),
              details: result.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code
              }))
            },
            { status: 400 }
          )
        }
      }

      return { data: result.data, error: null }

    } catch (error) {
      console.error('[Validation] Unexpected validation error:', {
        error: error instanceof Error ? error.message : String(error),
        path: request.nextUrl.pathname,
        source,
        timestamp: new Date().toISOString()
      })

      return {
        data: null,
        error: NextResponse.json(
          {
            success: false,
            error: 'Validation processing error',
            code: 'VALIDATION_PROCESSING_ERROR'
          },
          { status: 500 }
        )
      }
    }
  }
}

// Data sanitization function
function sanitizeData(data: any): any {
  if (typeof data === 'string') {
    return data
      .replace(/[<>]/g, '') // Remove basic HTML brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData)
  }

  if (data && typeof data === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(data)) {
      // Sanitize the key as well
      const sanitizedKey = typeof key === 'string' ? 
        key.replace(/[<>]/g, '').replace(/[^\w.-]/g, '').substring(0, 100) : 
        key
      
      sanitized[sanitizedKey] = sanitizeData(value)
    }
    return sanitized
  }

  return data
}

// Pre-configured validation middleware
export const validateLogin = createValidationMiddleware(loginSchema)
export const validateRegister = createValidationMiddleware(registerSchema)
export const validateRefreshToken = createValidationMiddleware(refreshTokenSchema)
export const validateUpdateProfile = createValidationMiddleware(updateProfileSchema)
export const validatePaymentIntent = createValidationMiddleware(paymentIntentSchema)
export const validatePaymentMethod = createValidationMiddleware(paymentMethodSchema)
export const validateTransactionQuery = createValidationMiddleware(transactionQuerySchema, 'query')
export const validateRefund = createValidationMiddleware(refundSchema)
export const validateWebAuthnRegistration = createValidationMiddleware(webauthnRegistrationSchema)
export const validateWebAuthnAuthentication = createValidationMiddleware(webauthnAuthenticationSchema)
export const validateAnalyticsQuery = createValidationMiddleware(analyticsQuerySchema, 'query')
export const validateBiometricData = createValidationMiddleware(biometricDataSchema)
export const validatePagination = createValidationMiddleware(paginationSchema, 'query')

// Enhanced validation for specific use cases
export function validateFileUpload(request: NextRequest): NextResponse | null {
  const contentType = request.headers.get('content-type')
  const contentLength = request.headers.get('content-length')

  if (!contentType || !contentType.includes('multipart/form-data')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid content type for file upload',
        code: 'INVALID_CONTENT_TYPE'
      },
      { status: 400 }
    )
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (contentLength && parseInt(contentLength) > maxSize) {
    return NextResponse.json(
      {
        success: false,
        error: 'File too large',
        code: 'FILE_TOO_LARGE',
        maxSize
      },
      { status: 413 }
    )
  }

  return null
}

// Advanced validation patterns
export const validationPatterns = {
  phoneNumber: /^\+?[1-9]\d{1,14}$/,
  creditCard: /^\d{13,19}$/,
  cvv: /^\d{3,4}$/,
  postalCode: /^[A-Z0-9\s-]{3,10}$/i,
  ipAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  macAddress: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
  base64: /^[A-Za-z0-9+/]*={0,2}$/,
  hex: /^[0-9a-fA-F]+$/,
  jwt: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
}

// Custom validators
export const customValidators = {
  isValidCreditCard: (value: string): boolean => {
    // Luhn algorithm
    let sum = 0
    let isEven = false
    
    for (let i = value.length - 1; i >= 0; i--) {
      let digit = parseInt(value.charAt(i))
      
      if (isEven) {
        digit *= 2
        if (digit > 9) {
          digit -= 9
        }
      }
      
      sum += digit
      isEven = !isEven
    }
    
    return sum % 10 === 0
  },

  isValidIBAN: (value: string): boolean => {
    // Basic IBAN validation
    const iban = value.replace(/\s/g, '').toUpperCase()
    if (iban.length < 15 || iban.length > 34) return false
    
    const rearranged = iban.slice(4) + iban.slice(0, 4)
    const numericString = rearranged.replace(/[A-Z]/g, char => 
      (char.charCodeAt(0) - 55).toString()
    )
    
    // Simple mod 97 check (simplified)
    return numericString.length > 0
  },

  isStrongPassword: (value: string): boolean => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value)
  },

  isValidAge: (birthDate: string): boolean => {
    const birth = new Date(birthDate)
    const today = new Date()
    const age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1 >= 18
    }
    
    return age >= 18
  }
}