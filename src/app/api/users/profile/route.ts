import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

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

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { name, email } = updateProfileSchema.parse(body)

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

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    // Delete user and all related data (cascade)
    await prisma.user.delete({
      where: { id: auth.user.userId }
    })

    return createSuccessResponse(null, 'Account deleted successfully')

  } catch (error) {
    console.error('Delete account error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}