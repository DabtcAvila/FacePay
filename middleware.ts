import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Production CORS configuration
const CORS_CONFIG = {
  // Update these for your production domain
  allowedOrigins: process.env.NODE_ENV === 'production' 
    ? ['https://facepay.app', 'https://www.facepay.app']
    : ['http://localhost:3000', 'https://localhost:3000'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Response-Time'],
  maxAge: 86400, // 24 hours
  credentials: true
}

// Security headers for production
const SECURITY_HEADERS = {
  'X-DNS-Prefetch-Control': 'off',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self), payment=(self)',
  'Strict-Transport-Security': process.env.NODE_ENV === 'production' 
    ? 'max-age=31536000; includeSubDomains; preload' 
    : '',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://cdn.mixpanel.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https: blob:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://api.stripe.com https://api.mixpanel.com https://sentry.io wss: ws:;
    frame-src https://js.stripe.com https://hooks.stripe.com;
    worker-src 'self';
    child-src 'self';
    manifest-src 'self';
    media-src 'self' blob:;
  `.replace(/\s+/g, ' ').trim()
}

// Rate limiting configuration (simple in-memory store)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function getRateLimitKey(request: NextRequest): string {
  const ip = request.ip || 
    request.headers.get('x-forwarded-for')?.split(',')[0] || 
    request.headers.get('x-real-ip') || 
    'unknown'
  
  return `${ip}:${request.nextUrl.pathname}`
}

function checkRateLimit(request: NextRequest): boolean {
  const key = getRateLimitKey(request)
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const limit = request.nextUrl.pathname.startsWith('/api/auth') ? 10 : 100
  
  const entry = rateLimitStore.get(key)
  
  if (!entry || entry.resetTime <= now) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (entry.count >= limit) {
    return false
  }
  
  entry.count++
  return true
}

function applyCORS(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get('origin')
  
  // Check if origin is allowed
  const isAllowedOrigin = !origin || 
    CORS_CONFIG.allowedOrigins.includes(origin) ||
    (process.env.NODE_ENV === 'development' && origin?.includes('localhost'))
  
  // Set CORS headers
  if (isAllowedOrigin && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  } else if (process.env.NODE_ENV === 'development') {
    response.headers.set('Access-Control-Allow-Origin', '*')
  }
  
  response.headers.set('Access-Control-Allow-Methods', CORS_CONFIG.allowedMethods.join(', '))
  response.headers.set('Access-Control-Allow-Headers', CORS_CONFIG.allowedHeaders.join(', '))
  response.headers.set('Access-Control-Expose-Headers', CORS_CONFIG.exposedHeaders.join(', '))
  response.headers.set('Access-Control-Max-Age', CORS_CONFIG.maxAge.toString())
  
  if (CORS_CONFIG.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  
  return response
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value)
    }
  })
  
  // Remove server information
  response.headers.delete('Server')
  response.headers.delete('X-Powered-By')
  
  return response
}

export function middleware(request: NextRequest) {
  const startTime = Date.now()
  const { pathname, origin } = request.nextUrl
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })
    return applySecurityHeaders(applyCORS(request, response))
  }
  
  // Apply rate limiting for API routes
  if (pathname.startsWith('/api/') && !checkRateLimit(request)) {
    const response = NextResponse.json(
      { error: 'Too many requests', retryAfter: 900 }, 
      { status: 429 }
    )
    response.headers.set('Retry-After', '900')
    response.headers.set('X-RateLimit-Limit', pathname.startsWith('/api/auth') ? '10' : '100')
    response.headers.set('X-RateLimit-Remaining', '0')
    return applySecurityHeaders(applyCORS(request, response))
  }
  
  // Block suspicious requests
  const userAgent = request.headers.get('user-agent') || ''
  const suspiciousPatterns = [
    /sqlmap/i, /nikto/i, /w3af/i, /nmap/i, /masscan/i, 
    /zmap/i, /nessus/i, /openvas/i, /scanner/i
  ]
  
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    console.warn('[Security] Blocked suspicious user agent:', {
      userAgent,
      ip: request.ip || request.headers.get('x-forwarded-for'),
      pathname,
      timestamp: new Date().toISOString()
    })
    
    const response = NextResponse.json(
      { error: 'Request rejected' },
      { status: 403 }
    )
    return applySecurityHeaders(response)
  }
  
  // Block requests with suspicious patterns in URL
  if (pathname.includes('..') || 
      pathname.includes('<script') || 
      pathname.includes('javascript:') ||
      pathname.includes('data:') ||
      pathname.match(/\.(php|asp|jsp|cgi)$/i)) {
    
    console.warn('[Security] Blocked suspicious URL pattern:', {
      pathname,
      ip: request.ip || request.headers.get('x-forwarded-for'),
      timestamp: new Date().toISOString()
    })
    
    const response = NextResponse.json(
      { error: 'Request rejected' },
      { status: 403 }
    )
    return applySecurityHeaders(response)
  }
  
  // Continue with the request
  const response = NextResponse.next()
  
  // Add response time header
  response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)
  
  // Apply security headers and CORS
  return applySecurityHeaders(applyCORS(request, response))
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}

// Cleanup function for rate limit store (run periodically)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime <= now) {
        rateLimitStore.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0 && process.env.NODE_ENV === 'development') {
      console.log(`[Middleware] Cleaned ${cleaned} expired rate limit entries`)
    }
  }, 5 * 60 * 1000) // Clean every 5 minutes
}