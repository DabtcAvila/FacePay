import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { strictSecurity } from '@/middleware/security'
import { validateUpdateProfile } from '@/middleware/validation'
import { requireAuth, hasPermission } from '@/middleware/auth'
import { logSuspiciousActivity, SecuritySeverity, analyzeThreatLevel } from '@/lib/security-logger'
import { z } from 'zod'

async function getProfileHandler(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    // Check permissions
    if (!hasPermission(auth.user, 'read:own_profile')) {
      logSuspiciousActivity(request, 'Unauthorized profile access attempt', auth.user.userId, SecuritySeverity.MEDIUM)
      return createErrorResponse('Insufficient permissions', 403)
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        biometricData: {
          where: { isActive: true },
          select: {
            id: true,
            type: true,
            createdAt: true,
            isActive: true,
          }
        },
        paymentMethods: {
          select: {
            id: true,
            type: true,
            provider: true,
            isDefault: true,
            createdAt: true,
          }
        },
        _count: {
          select: {
            transactions: true,
          }
        }
      }
    })

    if (!user) {
      return createErrorResponse('User not found', 404)
    }

    return createSuccessResponse(user)

  } catch (error) {
    console.error('Get profile error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function updateProfileHandler(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    // Check permissions
    if (!hasPermission(auth.user, 'update:own_profile')) {
      logSuspiciousActivity(request, 'Unauthorized profile update attempt', auth.user.userId, SecuritySeverity.MEDIUM)
      return createErrorResponse('Insufficient permissions', 403)
    }

    // Analyze request for threats
    const threatAnalysis = analyzeThreatLevel(request)
    if (threatAnalysis.shouldBlock) {
      logSuspiciousActivity(request, 'Profile update blocked due to security threats', auth.user.userId, SecuritySeverity.HIGH)
      return createErrorResponse('Request blocked due to security concerns', 403)
    }

    // Validate update data
    const validation = await validateUpdateProfile(request)
    if (validation.error) return validation.error
    
    const { name, email } = validation.data

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: {
            id: auth.user.userId
          }
        }
      })

      if (existingUser) {
        return createErrorResponse('Email is already taken', 409)
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: auth.user.userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return createSuccessResponse(updatedUser, 'Profile updated successfully')

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Update profile error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function deleteProfileHandler(request: NextRequest) {
  let auth: any = null;
  try {
    auth = await requireAuth(request)
    if (auth.error) return auth.error

    // Check permissions
    if (!hasPermission(auth.user, 'delete:own_account')) {
      logSuspiciousActivity(request, 'Unauthorized account deletion attempt', auth.user.userId, SecuritySeverity.HIGH)
      return createErrorResponse('Insufficient permissions', 403)
    }

    // Additional security: Require fresh authentication for account deletion
    if (auth.user.needsRefresh) {
      logSuspiciousActivity(request, 'Account deletion attempted with stale token', auth.user.userId, SecuritySeverity.HIGH)
      return createErrorResponse('Fresh authentication required for account deletion', 401)
    }

    // Log the account deletion attempt
    console.log(`[Security] Account deletion requested by user ${auth.user.userId}`)

    // Delete user and all related data (cascade)
    await prisma.user.delete({
      where: { id: auth.user.userId }
    })

    return createSuccessResponse(null, 'Account deleted successfully')

  } catch (error) {
    console.error('Delete account error:', error)
    logSuspiciousActivity(request, 'Account deletion failed', auth?.user?.userId, SecuritySeverity.MEDIUM)
    return createErrorResponse('Internal server error', 500)
  }
}

// Apply security middleware and export handlers
export const GET = strictSecurity(getProfileHandler)
export const PUT = strictSecurity(updateProfileHandler)  
export const DELETE = strictSecurity(deleteProfileHandler)