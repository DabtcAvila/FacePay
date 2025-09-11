import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateTokens } from '@/lib/jwt'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
  try {
    // Create or get demo user
    let demoUser = await prisma.user.findUnique({
      where: { email: 'demo@facepay.com' }
    })

    if (!demoUser) {
      demoUser = await prisma.user.create({
        data: {
          email: 'demo@facepay.com',
          name: 'Demo User',
        }
      })
    }

    // Generate tokens for the demo user
    const tokens = generateTokens(demoUser)

    // Set tokens in cookies
    const response = createSuccessResponse({
      user: {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
      },
      tokens,
    }, 'Demo login successful')

    // Set httpOnly cookie for refresh token
    response.cookies.set('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    return response

  } catch (error) {
    console.error('Demo login error:', error)
    return createErrorResponse('Failed to login demo user', 500)
  }
}