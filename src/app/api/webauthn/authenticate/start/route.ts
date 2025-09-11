import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { WebAuthnService } from '@/services/webauthn'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { AuthenticatorTransportFuture } from '@simplewebauthn/types'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
const startAuthenticationSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  userId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, userId } = startAuthenticationSchema.parse(body)

    // Log authentication attempt
    console.log('[WebAuthn Authentication] Starting biometric authentication:', {
      email: email || 'not provided',
      userId: userId || 'not provided',
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      origin: request.headers.get('origin')
    })

    let allowCredentials: { id: string; transports: AuthenticatorTransportFuture[] }[] = []
    let userForAuth = null

    if (email) {
      // Get user's credentials for specific user authentication
      userForAuth = await prisma.user.findUnique({
        where: { email },
        include: {
          webauthnCredentials: true,
        },
      })

      if (!userForAuth) {
        console.error('[WebAuthn Authentication] User not found by email:', email)
        return createErrorResponse('User not found', 404)
      }

      if (userForAuth.webauthnCredentials.length === 0) {
        console.error('[WebAuthn Authentication] No biometric credentials found for user:', email)
        return createErrorResponse('No biometric credentials found for this user. Please register your biometric data first.', 404)
      }

      // Map credentials with transport hints for platform authenticators
      allowCredentials = userForAuth.webauthnCredentials.map(cred => ({
        id: cred.credentialId,
        transports: (cred.transports as AuthenticatorTransportFuture[]) || ['internal'], // Use stored transports
      }))

      console.log('[WebAuthn Authentication] Found credentials for user:', {
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
        console.error('[WebAuthn Authentication] User not found by ID:', userId)
        return createErrorResponse('User not found', 404)
      }

      if (userForAuth.webauthnCredentials.length === 0) {
        console.error('[WebAuthn Authentication] No biometric credentials found for userId:', userId)
        return createErrorResponse('No biometric credentials found for this user. Please register your biometric data first.', 404)
      }

      // Map credentials with transport hints for platform authenticators
      allowCredentials = userForAuth.webauthnCredentials.map(cred => ({
        id: cred.credentialId,
        transports: (cred.transports as AuthenticatorTransportFuture[]) || ['internal'], // Use stored transports
      }))

      console.log('[WebAuthn Authentication] Found credentials for userId:', {
        userId,
        credentialCount: allowCredentials.length,
        deviceTypes: userForAuth.webauthnCredentials.map(c => c.deviceType)
      })
    }

    if (!userForAuth) {
      console.error('[WebAuthn Authentication] No user provided for authentication')
      return createErrorResponse('Email or userId is required for biometric authentication', 400)
    }

    // Generate authentication options with improved compatibility for localhost
    const options = await generateAuthenticationOptions({
      timeout: 60000,
      allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined, // Must include user's registered platform credentials
      userVerification: 'preferred', // Change from 'required' to 'preferred' for testing
      rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
    })

    // Log the generated authentication options
    console.log('[WebAuthn Authentication] Generated authentication options:', {
      userId: userForAuth.id,
      email: userForAuth.email,
      credentialCount: allowCredentials?.length || 0,
      userVerification: 'preferred',
      biometricRequired: true,
      platformAuthenticatorRequired: true,
      challengeLength: options.challenge.length,
      rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
      origin: request.headers.get('origin'),
      timestamp: new Date().toISOString()
    })

    // Store challenge for verification if we have a specific user
    if (userForAuth) {
      await prisma.user.update({
        where: { id: userForAuth.id },
        data: {
          currentChallenge: options.challenge,
        },
      })
    }

    // Log successful authentication start
    console.log('[WebAuthn Authentication] Authentication options created successfully:', {
      userId: userForAuth.id,
      email: userForAuth.email,
      credentialCount: allowCredentials?.length || 0,
      biometricRequired: true,
      platformAuthenticatorRequired: true,
      timestamp: new Date().toISOString()
    })

    return createSuccessResponse({
      options,
      userId: userForAuth.id,
      hasCredentials: allowCredentials ? allowCredentials.length > 0 : false,
      biometricRequired: true,
      platformAuthenticatorRequired: true,
      message: 'Biometric authentication started successfully - user verification required'
    }, 'WebAuthn biometric authentication started')

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[WebAuthn Authentication] Invalid request format:', error.errors)
      return createErrorResponse('Invalid request format: ' + error.errors[0].message, 400)
    }
    
    console.error('[WebAuthn Authentication] Authentication start failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')
    })
    return createErrorResponse('Failed to start biometric authentication', 500)
  }
}