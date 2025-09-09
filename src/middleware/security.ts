import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Security configuration
export const SECURITY_CONFIG = {
  // Rate limiting
  DEFAULT_WINDOW: 15 * 60 * 1000, // 15 minutes
  DEFAULT_MAX_REQUESTS: 100,
  STRICT_MAX_REQUESTS: 50,
  AUTH_MAX_REQUESTS: 10,
  PAYMENT_MAX_REQUESTS: 20,
  
  // CORS
  ALLOWED_ORIGINS: [
    'http://localhost:3000',
    'https://facepay.app',
    process.env.NEXT_PUBLIC_BASE_URL
  ].filter(Boolean),
  
  // Security headers
  CSP: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com wss:; frame-src https://js.stripe.com https://hooks.stripe.com",
  HSTS: 'max-age=31536000; includeSubDomains; preload'
}

// Rate limiting interface
interface RateLimitOptions {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const connectingIP = request.headers.get('x-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  return real || connectingIP || 'unknown'
}

// Rate limiting middleware
export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests, skipSuccessfulRequests = false } = options

  return (request: NextRequest): NextResponse | null => {
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Create a unique key for this client
    const key = `${clientIP}:${request.nextUrl.pathname}:${userAgent.substring(0, 50)}`
    
    const now = Date.now()
    const windowStart = now - windowMs
    
    // Get or create rate limit entry
    const existing = rateLimitStore.get(key)
    
    if (!existing || existing.resetTime <= now) {
      // Create new window
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      })
      return null // Allow request
    }
    
    if (existing.count >= maxRequests) {
      console.warn('[Security] Rate limit exceeded:', {
        ip: clientIP,
        path: request.nextUrl.pathname,
        userAgent: userAgent.substring(0, 100),
        count: existing.count,
        maxRequests,
        timestamp: new Date().toISOString()
      })
      
      // Return rate limit response
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please try again later.',
          rateLimitExceeded: true
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((existing.resetTime - now) / 1000).toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': existing.resetTime.toString()
          }
        }
      )
    }
    
    // Increment counter
    existing.count++
    rateLimitStore.set(key, existing)
    
    return null // Allow request
  }
}

// CORS middleware
export function applyCORS(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get('origin')
  
  // Check if origin is allowed
  const isAllowed = !origin || 
    SECURITY_CONFIG.ALLOWED_ORIGINS.includes('*') || 
    SECURITY_CONFIG.ALLOWED_ORIGINS.includes(origin)
  
  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Max-Age', '86400')
  
  return response
}

// Security headers middleware
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set('Content-Security-Policy', SECURITY_CONFIG.CSP)
  
  // HTTP Strict Transport Security
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', SECURITY_CONFIG.HSTS)
  }
  
  // X-Frame-Options
  response.headers.set('X-Frame-Options', 'DENY')
  
  // X-Content-Type-Options
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // X-XSS-Protection
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions Policy
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  
  // Remove server information
  response.headers.delete('Server')
  response.headers.delete('X-Powered-By')
  
  return response
}

// Enhanced request validation
export function validateRequest(request: NextRequest): NextResponse | null {
  const userAgent = request.headers.get('user-agent')
  const contentType = request.headers.get('content-type')
  const contentLength = request.headers.get('content-length')
  const referer = request.headers.get('referer')
  
  // Block requests without user agent (potential bots)
  if (!userAgent) {
    console.warn('[Security] Request blocked - missing user agent:', {
      ip: getClientIP(request),
      path: request.nextUrl.pathname,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    )
  }
  
  // Block suspicious user agents
  const suspiciousUAPatterns = [
    /sqlmap/i,
    /nikto/i,
    /w3af/i,
    /nmap/i,
    /masscan/i,
    /zmap/i,
    /nessus/i,
    /openvas/i,
    /bot.*crawler/i,
    /scanner/i
  ]
  
  if (suspiciousUAPatterns.some(pattern => pattern.test(userAgent))) {
    console.warn('[Security] Suspicious user agent blocked:', {
      ip: getClientIP(request),
      userAgent,
      path: request.nextUrl.pathname,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json(
      { success: false, error: 'Request rejected' },
      { status: 403 }
    )
  }
  
  // Validate content-length for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const maxSize = 50 * 1024 * 1024 // 50MB
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      console.warn('[Security] Request blocked - payload too large:', {
        ip: getClientIP(request),
        contentLength,
        path: request.nextUrl.pathname,
        timestamp: new Date().toISOString()
      })
      
      return NextResponse.json(
        { success: false, error: 'Payload too large' },
        { status: 413 }
      )
    }
    
    // Validate content type for JSON endpoints
    if (contentType && !contentType.includes('application/json') && 
        !contentType.includes('multipart/form-data') &&
        !contentType.includes('text/plain')) {
      console.warn('[Security] Invalid content type:', {
        ip: getClientIP(request),
        contentType,
        path: request.nextUrl.pathname,
        timestamp: new Date().toISOString()
      })
    }
  }
  
  return null // Request is valid
}

// Main security middleware
export function withSecurity(
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse,
  options: {
    rateLimitOptions?: RateLimitOptions
    skipValidation?: boolean
    skipRateLimit?: boolean
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Handle OPTIONS requests for CORS
      if (request.method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 200 })
        return applyCORS(request, applySecurityHeaders(response))
      }
      
      // Apply request validation
      if (!options.skipValidation) {
        const validationResult = validateRequest(request)
        if (validationResult) {
          return applySecurityHeaders(validationResult)
        }
      }
      
      // Apply rate limiting
      if (!options.skipRateLimit) {
        const rateLimitOptions = options.rateLimitOptions || {
          windowMs: SECURITY_CONFIG.DEFAULT_WINDOW,
          maxRequests: SECURITY_CONFIG.DEFAULT_MAX_REQUESTS
        }
        
        const rateLimiter = createRateLimiter(rateLimitOptions)
        const rateLimitResult = rateLimiter(request)
        if (rateLimitResult) {
          return applySecurityHeaders(rateLimitResult)
        }
      }
      
      // Execute the actual handler
      const response = await handler(request)
      
      // Apply security headers and CORS
      return applyCORS(request, applySecurityHeaders(response))
      
    } catch (error) {
      console.error('[Security] Middleware error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        path: request.nextUrl.pathname,
        method: request.method,
        ip: getClientIP(request),
        timestamp: new Date().toISOString()
      })
      
      const errorResponse = NextResponse.json(
        { success: false, error: 'Internal security error' },
        { status: 500 }
      )
      
      return applySecurityHeaders(errorResponse)
    }
  }
}

// Pre-configured security middleware for different endpoint types
export const authSecurity = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withSecurity(handler, {
    rateLimitOptions: {
      windowMs: SECURITY_CONFIG.DEFAULT_WINDOW,
      maxRequests: SECURITY_CONFIG.AUTH_MAX_REQUESTS
    }
  })

export const paymentSecurity = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withSecurity(handler, {
    rateLimitOptions: {
      windowMs: SECURITY_CONFIG.DEFAULT_WINDOW,
      maxRequests: SECURITY_CONFIG.PAYMENT_MAX_REQUESTS
    }
  })

export const strictSecurity = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withSecurity(handler, {
    rateLimitOptions: {
      windowMs: SECURITY_CONFIG.DEFAULT_WINDOW,
      maxRequests: SECURITY_CONFIG.STRICT_MAX_REQUESTS
    }
  })

export const webhookSecurity = (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) =>
  withSecurity(handler, {
    skipRateLimit: true, // Webhooks should not be rate limited
    skipValidation: true // Webhooks have different validation requirements
  })

// Cleanup function to remove old rate limit entries
export function cleanupRateLimit() {
  const now = Date.now()
  let cleaned = 0
  
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime <= now) {
      rateLimitStore.delete(key)
      cleaned++
    }
  }
  
  if (cleaned > 0) {
    console.log(`[Security] Cleaned up ${cleaned} expired rate limit entries`)
  }
}

// Schedule cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimit, 5 * 60 * 1000)
}