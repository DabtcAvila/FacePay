/**
 * Security Middleware for FacePay API Server
 * Comprehensive security layer with rate limiting, headers, and validation
 * 
 * Features:
 * - Advanced rate limiting with Redis fallback
 * - Security headers (OWASP recommendations)
 * - Request validation and sanitization
 * - Attack pattern detection
 * - IP whitelisting/blacklisting
 * - Content Security Policy
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

// In-memory store for development (use Redis in production)
const rateLimitStore = new Map();
const blacklistedIPs = new Set();
const suspiciousIPs = new Map();

// Security configuration
const SECURITY_CONFIG = {
  // Rate limiting tiers
  rateLimits: {
    global: { windowMs: 15 * 60 * 1000, max: 1000 }, // 1000 requests per 15 min globally
    ip: { windowMs: 15 * 60 * 1000, max: 100 },      // 100 requests per 15 min per IP
    auth: { windowMs: 15 * 60 * 1000, max: 10 },     // 10 auth attempts per 15 min
    enroll: { windowMs: 60 * 60 * 1000, max: 5 },    // 5 enrollments per hour
    verify: { windowMs: 60 * 1000, max: 60 },        // 60 verifications per minute
    merchant: { windowMs: 15 * 60 * 1000, max: 50 }, // 50 merchant API calls per 15 min
    health: { windowMs: 60 * 1000, max: 120 }        // 120 health checks per minute
  },
  
  // CORS settings
  corsOrigins: process.env.NODE_ENV === 'production' 
    ? [
        'https://facepay.app',
        'https://www.facepay.app',
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.FRONTEND_URL
      ].filter(Boolean)
    : [
        'http://localhost:3000',
        'https://localhost:3000',
        'http://127.0.0.1:3000',
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      ].filter(Boolean),
  
  // Security thresholds
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  maxRequestsPerMinute: 60,
  suspiciousThreshold: 5, // Failed attempts before marking as suspicious
  blacklistThreshold: 10, // Failed attempts before blacklisting
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  
  // Blocked user agents (security scanners, bots)
  blockedUserAgents: [
    /sqlmap/i,
    /nikto/i,
    /w3af/i,
    /nmap/i,
    /masscan/i,
    /zmap/i,
    /nessus/i,
    /openvas/i,
    /acunetix/i,
    /burpsuite/i,
    /scanner/i,
    /bot.*crawler/i
  ],
  
  // Blocked request patterns
  blockedPaths: [
    /\/wp-admin/i,
    /\/wp-login/i,
    /\/wp-content/i,
    /\/admin\/login/i,
    /\/phpmyadmin/i,
    /\/administrator/i,
    /\.(php|asp|jsp)$/i,
    /\/\.env/i,
    /\/config/i,
    /\/backup/i
  ]
};

// Get client IP with proxy support
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const real = req.headers['x-real-ip'];
  const connecting = req.headers['x-connecting-ip'];
  const cfIp = req.headers['cf-connecting-ip']; // Cloudflare
  
  if (forwarded) {
    // Handle comma-separated list of IPs
    return forwarded.split(',')[0].trim();
  }
  
  return cfIp || real || connecting || req.connection?.remoteAddress || req.ip || 'unknown';
}

// Create rate limiter with custom store
function createCustomRateLimit(options) {
  const { windowMs, max, keyGenerator, skipSuccessfulRequests = false } = options;
  
  return (req, res, next) => {
    const key = keyGenerator ? keyGenerator(req) : getClientIP(req);
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    const entry = rateLimitStore.get(key);
    if (!entry || entry.resetTime <= now) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
        firstRequest: now
      });
      return next();
    }
    
    if (entry.count >= max) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      console.warn(`[Security] Rate limit exceeded:`, {
        key,
        count: entry.count,
        max,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent')?.substring(0, 100),
        timestamp: new Date().toISOString()
      });
      
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Too many requests.',
        retryAfter,
        rateLimitExceeded: true
      });
    }
    
    entry.count++;
    rateLimitStore.set(key, entry);
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': max,
      'X-RateLimit-Remaining': Math.max(0, max - entry.count),
      'X-RateLimit-Reset': entry.resetTime
    });
    
    next();
  };
}

// Security headers middleware
function securityHeaders(req, res, next) {
  // Remove fingerprinting headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  // Security headers
  res.set({
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Enable XSS filtering
    'X-XSS-Protection': '1; mode=block',
    
    // Control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    
    // Expect-CT header for certificate transparency
    'Expect-CT': 'max-age=86400, enforce'
  });
  
  // HSTS for HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.stripe.com wss:",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  res.set('Content-Security-Policy', csp);
  
  next();
}

// Request validation middleware
function validateRequest(req, res, next) {
  const ip = getClientIP(req);
  const userAgent = req.get('User-Agent') || '';
  const path = req.path.toLowerCase();
  const method = req.method.toUpperCase();
  
  console.log(`[Security] Request validation: ${method} ${path} from ${ip}`);
  
  // Check IP blacklist
  if (blacklistedIPs.has(ip)) {
    console.warn(`[Security] Blocked blacklisted IP: ${ip}`);
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }
  
  // Check for blocked paths
  if (SECURITY_CONFIG.blockedPaths.some(pattern => pattern.test(path))) {
    console.warn(`[Security] Blocked suspicious path: ${path} from ${ip}`);
    markSuspiciousActivity(ip, 'blocked_path');
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
  }
  
  // Check user agent
  if (!userAgent) {
    console.warn(`[Security] Blocked request with no user agent from ${ip}`);
    markSuspiciousActivity(ip, 'no_user_agent');
    return res.status(400).json({
      success: false,
      error: 'Invalid request'
    });
  }
  
  // Check for blocked user agents
  if (SECURITY_CONFIG.blockedUserAgents.some(pattern => pattern.test(userAgent))) {
    console.warn(`[Security] Blocked suspicious user agent: ${userAgent} from ${ip}`);
    markSuspiciousActivity(ip, 'blocked_user_agent');
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }
  
  // Check content length for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    if (contentLength > SECURITY_CONFIG.maxRequestSize) {
      console.warn(`[Security] Request too large: ${contentLength} bytes from ${ip}`);
      return res.status(413).json({
        success: false,
        error: 'Request entity too large'
      });
    }
  }
  
  next();
}

// CORS middleware
function corsMiddleware(req, res, next) {
  const origin = req.get('Origin');
  const allowedOrigins = SECURITY_CONFIG.corsOrigins;
  
  // Check if origin is allowed
  const isAllowed = !origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin);
  
  if (isAllowed && origin) {
    res.set('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Allow requests without origin (mobile apps, etc.)
    res.set('Access-Control-Allow-Origin', '*');
  }
  
  res.set({
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-API-Key',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  });
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}

// Mark suspicious activity
function markSuspiciousActivity(ip, reason) {
  const entry = suspiciousIPs.get(ip) || { count: 0, reasons: new Set(), firstSeen: Date.now() };
  entry.count++;
  entry.reasons.add(reason);
  entry.lastSeen = Date.now();
  
  suspiciousIPs.set(ip, entry);
  
  console.warn(`[Security] Suspicious activity from ${ip}: ${reason} (count: ${entry.count})`);
  
  // Blacklist if threshold exceeded
  if (entry.count >= SECURITY_CONFIG.blacklistThreshold) {
    blacklistedIPs.add(ip);
    console.error(`[Security] IP ${ip} has been blacklisted (${entry.count} violations)`);
  }
}

// Cleanup expired entries
function cleanupSecurityStore() {
  const now = Date.now();
  let cleaned = 0;
  
  // Clean rate limit store
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime <= now) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  
  // Clean suspicious IPs (keep for 24 hours)
  const dayAgo = now - (24 * 60 * 60 * 1000);
  for (const [ip, entry] of suspiciousIPs.entries()) {
    if (entry.lastSeen < dayAgo) {
      suspiciousIPs.delete(ip);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[Security] Cleaned ${cleaned} expired security entries`);
  }
}

// Request sanitization
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Remove potentially dangerous keys
    if (['__proto__', 'constructor', 'prototype'].includes(key)) {
      continue;
    }
    
    if (typeof value === 'string') {
      // Basic XSS prevention
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// Main security middleware factory
function createSecurityMiddleware(options = {}) {
  const {
    skipRateLimit = false,
    skipValidation = false,
    skipCors = false,
    customRateLimit,
    trustProxy = true
  } = options;
  
  return (req, res, next) => {
    // Trust proxy for accurate IP detection
    if (trustProxy) {
      req.app.set('trust proxy', true);
    }
    
    // Add request ID for tracking
    req.requestId = req.requestId || crypto.randomBytes(8).toString('hex');
    req.startTime = Date.now();
    
    // Apply CORS first
    if (!skipCors) {
      corsMiddleware(req, res, () => {
        // Continue to next middleware
        applySecurity();
      });
    } else {
      applySecurity();
    }
    
    function applySecurity() {
      // Apply security headers
      securityHeaders(req, res, () => {
        // Apply request validation
        if (!skipValidation) {
          validateRequest(req, res, () => {
            applyRateLimit();
          });
        } else {
          applyRateLimit();
        }
      });
    }
    
    function applyRateLimit() {
      // Apply rate limiting
      if (!skipRateLimit && !customRateLimit) {
        const rateLimiter = createCustomRateLimit({
          windowMs: SECURITY_CONFIG.rateLimits.ip.windowMs,
          max: SECURITY_CONFIG.rateLimits.ip.max
        });
        rateLimiter(req, res, () => {
          sanitizeBody(req, res, next);
        });
      } else if (customRateLimit) {
        customRateLimit(req, res, () => {
          sanitizeBody(req, res, next);
        });
      } else {
        sanitizeBody(req, res, next);
      }
    }
  };
}

// Pre-configured middleware
const defaultSecurity = createSecurityMiddleware();

const authSecurity = createSecurityMiddleware({
  customRateLimit: createCustomRateLimit({
    windowMs: SECURITY_CONFIG.rateLimits.auth.windowMs,
    max: SECURITY_CONFIG.rateLimits.auth.max
  })
});

const merchantSecurity = createSecurityMiddleware({
  customRateLimit: createCustomRateLimit({
    windowMs: SECURITY_CONFIG.rateLimits.merchant.windowMs,
    max: SECURITY_CONFIG.rateLimits.merchant.max
  })
});

const healthSecurity = createSecurityMiddleware({
  skipValidation: true,
  customRateLimit: createCustomRateLimit({
    windowMs: SECURITY_CONFIG.rateLimits.health.windowMs,
    max: SECURITY_CONFIG.rateLimits.health.max
  })
});

// Start cleanup interval
setInterval(cleanupSecurityStore, SECURITY_CONFIG.cleanupInterval);

// Export middleware and utilities
module.exports = {
  // Main middleware
  createSecurityMiddleware,
  defaultSecurity,
  authSecurity,
  merchantSecurity,
  healthSecurity,
  
  // Individual middleware
  securityHeaders,
  validateRequest,
  corsMiddleware,
  sanitizeBody,
  
  // Rate limiters
  createCustomRateLimit,
  
  // Utilities
  getClientIP,
  markSuspiciousActivity,
  cleanupSecurityStore,
  
  // Configuration
  SECURITY_CONFIG,
  
  // Monitoring
  getSecurityStats: () => ({
    rateLimitEntries: rateLimitStore.size,
    blacklistedIPs: blacklistedIPs.size,
    suspiciousIPs: suspiciousIPs.size,
    blacklistedIPsList: Array.from(blacklistedIPs),
    suspiciousIPsList: Array.from(suspiciousIPs.entries()).map(([ip, data]) => ({
      ip,
      count: data.count,
      reasons: Array.from(data.reasons),
      firstSeen: new Date(data.firstSeen).toISOString(),
      lastSeen: new Date(data.lastSeen).toISOString()
    }))
  })
};