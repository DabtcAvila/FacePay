import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, extractTokenFromHeader, JWTPayload } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

// Enhanced authentication configuration
export const AUTH_CONFIG = {
  TOKEN_REFRESH_THRESHOLD: 15 * 60 * 1000, // 15 minutes before expiry
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  CONCURRENT_SESSIONS_LIMIT: 5,
  REQUIRE_FRESH_TOKEN_FOR: [
    '/api/users/profile',
    '/api/payments/stripe/payment-intent',
    '/api/payments/stripe/refund',
    '/api/webauthn/register',
    '/api/transactions/bulk'
  ]
}

// Session storage (in production, use Redis)
const activeSessions = new Map<string, {
  userId: string
  lastActivity: number
  ipAddress: string
  userAgent: string
  refreshCount: number
}>()

// Login attempt tracking
const loginAttempts = new Map<string, {
  attempts: number
  lockedUntil: number
  lastAttempt: number
}>()

// Enhanced authentication result interface
export interface AuthResult {
  success: boolean
  user?: {
    userId: string
    email: string
    sessionId: string
    tokenExpiresAt: number
    needsRefresh: boolean
  }
  error?: string
  statusCode?: number
}

// Get client information
function getClientInfo(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const connectingIP = request.headers.get('x-connecting-ip')
  
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : 
                   real || connectingIP || 'unknown'
  
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  return { ipAddress, userAgent }
}

// Check if IP is locked out due to failed attempts
export function isLockedOut(ipAddress: string): boolean {
  const attempts = loginAttempts.get(ipAddress)
  if (!attempts) return false
  
  const now = Date.now()
  
  if (attempts.lockedUntil > now) {
    return true
  }
  
  // Clear expired lockout
  if (attempts.lockedUntil <= now && attempts.attempts >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
    loginAttempts.delete(ipAddress)
  }
  
  return false
}

// Record failed login attempt
export function recordFailedAttempt(ipAddress: string): void {
  const now = Date.now()
  const existing = loginAttempts.get(ipAddress)
  
  if (!existing) {
    loginAttempts.set(ipAddress, {
      attempts: 1,
      lockedUntil: 0,
      lastAttempt: now
    })
    return
  }
  
  existing.attempts++
  existing.lastAttempt = now
  
  if (existing.attempts >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
    existing.lockedUntil = now + AUTH_CONFIG.LOCKOUT_DURATION
    
    console.warn('[Auth Security] IP locked out due to failed attempts:', {
      ipAddress,
      attempts: existing.attempts,
      lockedUntil: new Date(existing.lockedUntil).toISOString(),
      timestamp: new Date().toISOString()
    })
  }
  
  loginAttempts.set(ipAddress, existing)
}

// Clear failed attempts on successful login
export function clearFailedAttempts(ipAddress: string): void {
  loginAttempts.delete(ipAddress)
}

// Track active session
export function trackSession(
  sessionId: string, 
  userId: string, 
  ipAddress: string, 
  userAgent: string
): void {
  activeSessions.set(sessionId, {
    userId,
    lastActivity: Date.now(),
    ipAddress,
    userAgent,
    refreshCount: 0
  })
  
  // Clean up old sessions for this user
  cleanupUserSessions(userId)
}

// Update session activity
export function updateSessionActivity(sessionId: string): void {
  const session = activeSessions.get(sessionId)
  if (session) {
    session.lastActivity = Date.now()
    activeSessions.set(sessionId, session)
  }
}

// Clean up old sessions for a user (keep only the latest N sessions)
function cleanupUserSessions(userId: string): void {
  const userSessions = Array.from(activeSessions.entries())
    .filter(([_, session]) => session.userId === userId)
    .sort((a, b) => b[1].lastActivity - a[1].lastActivity)
  
  if (userSessions.length > AUTH_CONFIG.CONCURRENT_SESSIONS_LIMIT) {
    const sessionsToRemove = userSessions.slice(AUTH_CONFIG.CONCURRENT_SESSIONS_LIMIT)
    sessionsToRemove.forEach(([sessionId]) => {
      activeSessions.delete(sessionId)
    })
    
    console.log(`[Auth] Cleaned up ${sessionsToRemove.length} old sessions for user ${userId}`)
  }
}

// Validate session
export function validateSession(sessionId: string, ipAddress: string): boolean {
  const session = activeSessions.get(sessionId)
  if (!session) return false
  
  const now = Date.now()
  
  // Check session timeout
  if (now - session.lastActivity > AUTH_CONFIG.SESSION_TIMEOUT) {
    activeSessions.delete(sessionId)
    return false
  }
  
  // Optionally check IP consistency (can be disabled for mobile users)
  // if (session.ipAddress !== ipAddress) {
  //   console.warn('[Auth] Session IP mismatch:', {
  //     sessionId,
  //     originalIP: session.ipAddress,
  //     currentIP: ipAddress
  //   })
  //   return false
  // }
  
  return true
}

// Enhanced authentication middleware
export async function requireAuth(request: NextRequest): Promise<{
  user: JWTPayload & { sessionId: string; needsRefresh: boolean }
  error: null
} | {
  user: null
  error: NextResponse
}> {
  try {
    const clientInfo = getClientInfo(request)
    
    // Check if IP is locked out
    if (isLockedOut(clientInfo.ipAddress)) {
      const attempts = loginAttempts.get(clientInfo.ipAddress)
      const unlockTime = attempts ? new Date(attempts.lockedUntil).toISOString() : 'unknown'
      
      console.warn('[Auth] Request from locked out IP:', {
        ipAddress: clientInfo.ipAddress,
        path: request.nextUrl.pathname,
        unlockTime,
        timestamp: new Date().toISOString()
      })
      
      const response: ApiResponse<null> = {
        success: false,
        error: 'Too many failed login attempts. Please try again later.',
        code: 'IP_LOCKED_OUT'
      }
      
      return {
        user: null,
        error: NextResponse.json(response, { status: 429 })
      }
    }
    
    // Extract and verify token
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Authorization token required',
        code: 'MISSING_TOKEN'
      }
      
      return {
        user: null,
        error: NextResponse.json(response, { status: 401 })
      }
    }
    
    // Verify token
    const payload = verifyAccessToken(token)
    if (!payload) {
      console.warn('[Auth] Invalid token attempt:', {
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent.substring(0, 100),
        path: request.nextUrl.pathname,
        timestamp: new Date().toISOString()
      })
      
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      }
      
      return {
        user: null,
        error: NextResponse.json(response, { status: 401 })
      }
    }
    
    // Validate session if sessionId is present
    if (payload.sessionId) {
      if (!validateSession(payload.sessionId, clientInfo.ipAddress)) {
        console.warn('[Auth] Invalid session:', {
          sessionId: payload.sessionId,
          userId: payload.userId,
          ipAddress: clientInfo.ipAddress,
          path: request.nextUrl.pathname,
          timestamp: new Date().toISOString()
        })
        
        const response: ApiResponse<null> = {
          success: false,
          error: 'Session expired or invalid',
          code: 'INVALID_SESSION'
        }
        
        return {
          user: null,
          error: NextResponse.json(response, { status: 401 })
        }
      }
      
      // Update session activity
      updateSessionActivity(payload.sessionId)
    }
    
    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        isActive: true,
        lastLogin: true
      }
    })
    
    if (!user || !user.isActive) {
      console.warn('[Auth] User not found or inactive:', {
        userId: payload.userId,
        userExists: !!user,
        isActive: user?.isActive,
        ipAddress: clientInfo.ipAddress,
        timestamp: new Date().toISOString()
      })
      
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found or account deactivated',
        code: 'USER_NOT_FOUND'
      }
      
      return {
        user: null,
        error: NextResponse.json(response, { status: 401 })
      }
    }
    
    // Check if token needs refresh
    const now = Date.now()
    const expiresAt = payload.exp * 1000
    const needsRefresh = (expiresAt - now) < AUTH_CONFIG.TOKEN_REFRESH_THRESHOLD
    
    // Check if fresh token is required for this endpoint
    const requiresFreshToken = AUTH_CONFIG.REQUIRE_FRESH_TOKEN_FOR.some(path => 
      request.nextUrl.pathname.startsWith(path)
    )
    
    if (requiresFreshToken && needsRefresh) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Fresh authentication required for this operation',
        code: 'FRESH_TOKEN_REQUIRED'
      }
      
      return {
        user: null,
        error: NextResponse.json(response, { status: 401 })
      }
    }
    
    // Log successful authentication
    console.log('[Auth] Successful authentication:', {
      userId: payload.userId,
      email: user.email,
      sessionId: payload.sessionId,
      ipAddress: clientInfo.ipAddress,
      path: request.nextUrl.pathname,
      needsRefresh,
      timestamp: new Date().toISOString()
    })
    
    return {
      user: {
        ...payload,
        sessionId: payload.sessionId || 'legacy',
        needsRefresh
      },
      error: null
    }
    
  } catch (error) {
    console.error('[Auth] Authentication middleware error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      path: request.nextUrl.pathname,
      timestamp: new Date().toISOString()
    })
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'Authentication processing error',
      code: 'AUTH_PROCESSING_ERROR'
    }
    
    return {
      user: null,
      error: NextResponse.json(response, { status: 500 })
    }
  }
}

// Optional authentication (for endpoints that work with or without auth)
export async function optionalAuth(request: NextRequest): Promise<{
  user: (JWTPayload & { sessionId: string; needsRefresh: boolean }) | null
  error: null
}> {
  const authResult = await requireAuth(request)
  
  if (authResult.error) {
    // Return null user instead of error for optional auth
    return { user: null, error: null }
  }
  
  return { user: authResult.user, error: null }
}

// Check permissions for specific operations
export function hasPermission(user: JWTPayload, operation: string, resource?: any): boolean {
  // Basic permission system - can be extended
  switch (operation) {
    case 'read:own_profile':
      return true // All authenticated users can read their own profile
    
    case 'update:own_profile':
      return true // All authenticated users can update their own profile
    
    case 'delete:own_account':
      return true // All authenticated users can delete their own account
    
    case 'create:payment':
      return true // All authenticated users can create payments
    
    case 'read:own_transactions':
      return true // All authenticated users can read their own transactions
    
    case 'create:refund':
      // Only allow refunds for own transactions within 30 days
      return resource?.userId === user.userId && 
             resource?.createdAt && 
             (Date.now() - new Date(resource.createdAt).getTime()) < (30 * 24 * 60 * 60 * 1000)
    
    case 'admin:read_all_users':
      return user.role === 'admin' || user.role === 'super_admin'
    
    case 'admin:read_analytics':
      return user.role === 'admin' || user.role === 'super_admin'
    
    default:
      return false
  }
}

// Cleanup expired sessions and login attempts
export function cleanupAuthData(): void {
  const now = Date.now()
  let cleanedSessions = 0
  let cleanedAttempts = 0
  
  // Clean up expired sessions
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastActivity > AUTH_CONFIG.SESSION_TIMEOUT) {
      activeSessions.delete(sessionId)
      cleanedSessions++
    }
  }
  
  // Clean up expired login attempts
  for (const [ipAddress, attempts] of loginAttempts.entries()) {
    if (attempts.lockedUntil > 0 && attempts.lockedUntil <= now) {
      loginAttempts.delete(ipAddress)
      cleanedAttempts++
    }
  }
  
  if (cleanedSessions > 0 || cleanedAttempts > 0) {
    console.log(`[Auth] Cleaned up ${cleanedSessions} expired sessions and ${cleanedAttempts} expired lockouts`)
  }
}

// Schedule cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupAuthData, 10 * 60 * 1000)
}

// Get authentication statistics
export function getAuthStats(): {
  activeSessions: number
  lockedIPs: number
  totalLoginAttempts: number
} {
  const now = Date.now()
  
  const activeSessions = Array.from(activeSessions.values())
    .filter(session => now - session.lastActivity <= AUTH_CONFIG.SESSION_TIMEOUT)
    .length
  
  const lockedIPs = Array.from(loginAttempts.values())
    .filter(attempts => attempts.lockedUntil > now)
    .length
  
  const totalLoginAttempts = Array.from(loginAttempts.values())
    .reduce((total, attempts) => total + attempts.attempts, 0)
  
  return {
    activeSessions,
    lockedIPs,
    totalLoginAttempts
  }
}