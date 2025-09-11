import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken, generateTokens } from '@/lib/jwt'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { z } from 'zod'

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refreshToken } = refreshSchema.parse(body)

    const payload = verifyRefreshToken(refreshToken)
    if (!payload) {
      return createErrorResponse('Invalid or expired refresh token', 401)
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!user) {
      return createErrorResponse('User not found', 404)
    }

    const tokens = generateTokens(user)

    return createSuccessResponse({
      user,
      tokens
    }, 'Tokens refreshed successfully')

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Token refresh error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
// Prevent static generation
export const dynamic = 'force-dynamic'
