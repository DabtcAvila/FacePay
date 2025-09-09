import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, extractTokenFromHeader, JWTPayload } from './jwt'
import { prisma } from './prisma'
import { ApiResponse } from '@/types'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
  }
}

export async function requireAuth(request: NextRequest): Promise<{ user: JWTPayload; error: null } | { user: null; error: NextResponse }> {
  const authHeader = request.headers.get('authorization')
  const token = extractTokenFromHeader(authHeader)

  if (!token) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Authorization token required'
    }
    return {
      user: null,
      error: NextResponse.json(response, { status: 401 })
    }
  }

  const payload = verifyAccessToken(token)
  if (!payload) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid or expired token'
    }
    return {
      user: null,
      error: NextResponse.json(response, { status: 401 })
    }
  }

  // Verify user still exists
  const user = await prisma.user.findUnique({
    where: { id: payload.userId }
  })

  if (!user) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'User not found'
    }
    return {
      user: null,
      error: NextResponse.json(response, { status: 401 })
    }
  }

  return { user: payload, error: null }
}

export function createErrorResponse(message: string, statusCode: number = 400): NextResponse {
  const response: ApiResponse<null> = {
    success: false,
    error: message
  }
  return NextResponse.json(response, { status: statusCode })
}

export function createSuccessResponse<T>(data: T, message?: string): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message
  }
  return NextResponse.json(response)
}