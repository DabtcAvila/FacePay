import { NextRequest, NextResponse } from 'next/server'
import { compressionMiddleware } from './src/middleware/compression'
import { multitenantMiddleware } from './src/middleware/multitenancy'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const searchParams = request.nextUrl.searchParams
  const url = request.nextUrl.clone()

  // Apply multi-tenant middleware first for API routes
  const multitenantResponse = await multitenantMiddleware.handle(request)
  if (multitenantResponse) {
    return multitenantResponse
  }

  // Apply compression to all requests
  const response = compressionMiddleware(request)

  // Security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Performance headers
  response.headers.set('X-Powered-By', '') // Remove Next.js header
  
  // CORS for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  // Cache control for static assets
  if (pathname.startsWith('/_next/static/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }
  
  // Cache control for images
  if (pathname.startsWith('/images/') || pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|ico)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=2592000, stale-while-revalidate=86400')
  }

  // Cache control for fonts
  if (pathname.match(/\.(woff|woff2|eot|ttf|otf)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin')
  }

  // API route optimizations
  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600')
    
    // Add timing header for performance monitoring
    response.headers.set('X-Response-Time', `${Date.now()}`)
    
    // Rate limiting headers (implement rate limiting logic as needed)
    response.headers.set('X-RateLimit-Limit', '100')
    response.headers.set('X-RateLimit-Remaining', '99')
  }

  // Progressive Web App headers
  if (pathname === '/manifest.json') {
    response.headers.set('Content-Type', 'application/manifest+json')
    response.headers.set('Cache-Control', 'public, max-age=86400')
  }

  // Service worker caching
  if (pathname === '/sw.js' || pathname === '/service-worker.js') {
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
    response.headers.set('Service-Worker-Allowed', '/')
  }

  // Preload critical resources for specific pages
  if (pathname === '/') {
    const preloadLinks = [
      '</fonts/inter-var.woff2>; rel=preload; as=font; type=font/woff2; crossorigin=anonymous',
      '</_next/static/chunks/main.js>; rel=preload; as=script',
      '</api/health>; rel=prefetch',
    ].join(', ')
    
    response.headers.set('Link', preloadLinks)
  }

  // Face detection pages - preload AI models
  if (pathname.includes('biometric') || pathname.includes('face')) {
    const aiPreloadLinks = [
      '<https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js>; rel=preload; as=script',
      '<https://cdn.jsdelivr.net/npm/@tensorflow-models/face-detection@latest/dist/face-detection.min.js>; rel=preload; as=script',
    ].join(', ')
    
    response.headers.set('Link', aiPreloadLinks)
  }

  // Payment pages - preload Stripe
  if (pathname.includes('payment') || pathname.includes('checkout')) {
    const paymentPreloadLinks = [
      '<https://js.stripe.com/v3/>; rel=preload; as=script',
      '<https://api.stripe.com>; rel=preconnect',
    ].join(', ')
    
    response.headers.set('Link', paymentPreloadLinks)
  }

  // Handle OPTIONS requests for CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  // CSP for enhanced security (adjust as needed)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.stripe.com https://cdn.jsdelivr.net",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ')

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Content-Security-Policy', csp)
  }

  return response
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}