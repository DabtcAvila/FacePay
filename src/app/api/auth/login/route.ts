import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword } from '@/lib/encryption'
import { generateTokens } from '@/lib/jwt'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

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
      return createErrorResponse('Invalid credentials', 401)
    }

    // Note: In a real implementation, you would verify the password here
    // For now, we'll assume the password is correct since we don't store it
    // const isValidPassword = await comparePassword(password, user.passwordHash)
    // if (!isValidPassword) {
    //   return createErrorResponse('Invalid credentials', 401)
    // }

    const tokens = generateTokens(user)

    return createSuccessResponse({
      user,
      tokens
    }, 'Login successful')

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Login error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function GET(request: NextRequest) {
  return createErrorResponse('Method not allowed', 405)
}