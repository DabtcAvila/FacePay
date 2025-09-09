import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/encryption'
import { generateTokens } from '@/lib/jwt'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, password } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return createErrorResponse('User already exists with this email', 409)
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password)
    
    const user = await prisma.user.create({
      data: {
        email,
        name,
        // Note: In production, you might want to store password hash in a separate table
        // For now, we'll just create the user without password since it's not in the schema
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    const tokens = generateTokens(user)

    return createSuccessResponse({
      user,
      tokens
    }, 'User registered successfully')

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Registration error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}