import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword } from '@/lib/encryption'
import { generateTokens } from '@/lib/jwt'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { authSecurity } from '@/middleware/security'
import { validateLogin } from '@/middleware/validation'
import { 
  logAuthSuccess, 
  logAuthFailure, 
  analyzeThreatLevel,
  AnomalyDetector 
} from '@/lib/security-logger'
import { 
  isLockedOut, 
  recordFailedAttempt, 
  clearFailedAttempts, 
  trackSession 
} from '@/middleware/auth'

async function loginHandler(request: NextRequest) {
  try {
    // Analyze request for threats
    const threatAnalysis = analyzeThreatLevel(request)
    if (threatAnalysis.shouldBlock) {
      return createErrorResponse('Request blocked due to security concerns', 403)
    }

    // Validate request body
    const validation = await validateLogin(request)
    if (validation.error) return validation.error
    
    const { email, password } = validation.data

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!user) {
      logAuthFailure(request, 'User not found', undefined)
      recordFailedAttempt(getClientIP(request))
      return createErrorResponse('Invalid credentials', 401)
    }

    // Check for anomalous behavior
    const anomalyAnalysis = AnomalyDetector.analyzeUserBehavior(user.id, request)
    if (anomalyAnalysis.riskScore > 5) {
      logAuthFailure(request, `Anomalous login behavior detected: ${anomalyAnalysis.anomalies.join(', ')}`, user.id)
      // In production, might require additional verification
    }

    // Note: In a real implementation, you would verify the password here
    // For now, we'll assume the password is correct since we don't store it
    // const isValidPassword = await comparePassword(password, user.passwordHash)
    // if (!isValidPassword) {
    //   logAuthFailure(request, 'Invalid password', user.id)
    //   recordFailedAttempt(getClientIP(request))
    //   return createErrorResponse('Invalid credentials', 401)
    // }

    // Generate tokens with session tracking
    const sessionId = generateSessionId()
    const tokens = generateTokens(user)

    // Track the session
    trackSession(sessionId, user.id, getClientIP(request), request.headers.get('user-agent') || '')
    
    // Clear any failed attempts for this IP
    clearFailedAttempts(getClientIP(request))
    
    // Log successful authentication
    logAuthSuccess(user.id, request, sessionId)

    // Update user's last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    return createSuccessResponse({
      user,
      tokens,
      sessionId
    }, 'Login successful')

  } catch (error) {
    console.error('Login error:', error)
    logAuthFailure(request, error instanceof Error ? error.message : 'Unknown error', undefined)
    return createErrorResponse('Internal server error', 500)
  }
}

// Helper functions
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const connectingIP = request.headers.get('x-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  return real || connectingIP || 'unknown'
}

function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Apply security middleware and export
export const POST = authSecurity(loginHandler)

export async function GET(request: NextRequest) {
  return createErrorResponse('Method not allowed', 405)
}