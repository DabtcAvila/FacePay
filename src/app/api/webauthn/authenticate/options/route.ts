import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { AuthenticatorTransportFuture } from '@simplewebauthn/types'
import { z } from 'zod'

const startAuthenticationSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  userId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, userId } = startAuthenticationSchema.parse(body)

    console.log('[WebAuthn Authentication Options] Starting biometric authentication:', {
      email: email || 'not provided',
      userId: userId || 'not provided',
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      origin: request.headers.get('origin')
    })

    let allowCredentials: { id: string; transports: AuthenticatorTransportFuture[] }[] = []
    let userForAuth = null

    if (email) {
      // Get user's credentials from database
      userForAuth = await prisma.user.findUnique({
        where: { email },
        include: {
          webauthnCredentials: true,
        },
      })

      if (!userForAuth) {
        console.error('[WebAuthn Authentication Options] User not found by email:', email)
        return createErrorResponse('User not found', 404)
      }

      if (userForAuth.webauthnCredentials.length === 0) {
        console.error('[WebAuthn Authentication Options] No credentials found for user:', email)
        return createErrorResponse('No biometric credentials found for this user. Please register your biometric data first.', 404)
      }

      allowCredentials = userForAuth.webauthnCredentials.map(cred => ({
        id: cred.credentialId,
        type: 'public-key' as const,
        transports: (cred.transports as AuthenticatorTransportFuture[]) || ['internal']
      }))

      console.log('[WebAuthn Authentication Options] Found credentials for user:', {
        email,
        credentialCount: allowCredentials.length,
        deviceTypes: userForAuth.webauthnCredentials.map(c => c.deviceType)
      })
    } else if (userId) {
      // Get user's credentials using userId
      userForAuth = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          webauthnCredentials: true,
        },
      })

      if (!userForAuth) {
        console.error('[WebAuthn Authentication Options] User not found by ID:', userId)
        return createErrorResponse('User not found', 404)
      }

      if (userForAuth.webauthnCredentials.length === 0) {
        console.error('[WebAuthn Authentication Options] No credentials found for userId:', userId)
        return createErrorResponse('No biometric credentials found for this user. Please register your biometric data first.', 404)
      }

      allowCredentials = userForAuth.webauthnCredentials.map(cred => ({
        id: cred.credentialId,
        type: 'public-key' as const,
        transports: (cred.transports as AuthenticatorTransportFuture[]) || ['internal']
      }))

      console.log('[WebAuthn Authentication Options] Found credentials for userId:', {
        userId,
        credentialCount: allowCredentials.length,
        deviceTypes: userForAuth.webauthnCredentials.map(c => c.deviceType)
      })
    }

    if (!userForAuth) {
      console.error('[WebAuthn Authentication Options] No user provided for authentication')
      return createErrorResponse('Email or userId is required for biometric authentication', 400)
    }

    const options = await generateAuthenticationOptions({
      allowCredentials: allowCredentials.map(cred => ({
        id: cred.id,
        type: 'public-key',
        transports: cred.transports
      })),
      userVerification: 'required',
      rpID: process.env.WEBAUTHN_RP_ID || 'localhost'
    })

    // Store challenge for verification
    await prisma.user.update({
      where: { id: userForAuth.id },
      data: {
        currentChallenge: options.challenge,
      },
    })

    console.log('[WebAuthn Authentication Options] Authentication options generated successfully:', {
      userId: userForAuth.id,
      email: userForAuth.email,
      credentialCount: allowCredentials.length,
      challengeLength: options.challenge.length,
      biometricRequired: true,
      platformAuthenticatorRequired: true,
      timestamp: new Date().toISOString()
    })

    return createSuccessResponse({
      options,
      userId: userForAuth.id,
      hasCredentials: allowCredentials.length > 0,
      biometricRequired: true,
      platformAuthenticatorRequired: true,
      message: 'Authentication options generated successfully'
    }, 'WebAuthn authentication options generated')

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[WebAuthn Authentication Options] Invalid request format:', error.errors)
      return createErrorResponse('Invalid request format: ' + error.errors[0].message, 400)
    }
    
    console.error('[WebAuthn Authentication Options] Authentication options generation failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')
    })
    return createErrorResponse('Failed to generate authentication options', 500)
  }
}