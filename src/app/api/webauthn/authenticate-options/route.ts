import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import { AuthenticatorTransportFuture } from '@simplewebauthn/types'

export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  try {
    // Require authentication to get user's credentials
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    // Get user's credentials
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      include: {
        webauthnCredentials: true,
      },
    })

    if (!user) {
      return createErrorResponse('User not found', 404)
    }

    // Only allow credentials owned by this user - force internal transport for platform authenticators
    const allowCredentials = user.webauthnCredentials.map(cred => ({
      id: isoBase64URL.toBuffer(cred.credentialId), // Convert base64url to buffer
      type: 'public-key' as const,
      transports: ['internal'] as AuthenticatorTransportFuture[], // Force platform authenticator transport
    }))

    // Log authentication options generation
    console.log('[WebAuthn Authentication Options] Generating options for user:', {
      userId: user.id,
      email: user.email,
      credentialCount: allowCredentials.length,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')
    })

    const options = await generateAuthenticationOptions({
      timeout: 60000,
      allowCredentials,
      userVerification: 'required', // CRITICAL: Force biometric verification
      rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
    })

    // Log generated options
    console.log('[WebAuthn Authentication Options] Options generated successfully:', {
      userId: user.id,
      userVerification: 'required',
      biometricRequired: true,
      challengeLength: options.challenge.length,
      timestamp: new Date().toISOString()
    })

    // Store challenge temporarily for verification
    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentChallenge: options.challenge,
      },
    })

    return createSuccessResponse({
      ...options,
      biometricRequired: true,
      platformAuthenticatorRequired: true,
      message: 'Biometric authentication options generated successfully'
    })

  } catch (error) {
    console.error('[WebAuthn Authentication Options] Failed to generate options:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')
    })
    return createErrorResponse('Failed to generate biometric authentication options', 500)
  }
}