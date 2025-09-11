import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { AuthenticatorTransportFuture, PublicKeyCredentialDescriptorFuture } from '@simplewebauthn/types'
import { isoBase64URL } from '@simplewebauthn/server/helpers'

export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      include: {
        webauthnCredentials: true,
      },
    })

    if (!user) {
      console.error('[WebAuthn Registration Options] User not found:', auth.user.userId)
      return createErrorResponse('User not found', 404)
    }

    // Log biometric registration attempt
    console.log('[WebAuthn Registration Options] Generating registration options for user:', {
      userId: user.id,
      email: user.email,
      existingCredentials: user.webauthnCredentials.length,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
    })

    // Get existing credentials for the user to exclude them
    const existingCredentials: PublicKeyCredentialDescriptorFuture[] = user.webauthnCredentials.map(cred => ({
      id: isoBase64URL.toBuffer(cred.credentialId),
      type: 'public-key' as const,
      transports: ['internal', 'hybrid'] as AuthenticatorTransportFuture[],
    }))

    // Generate REAL registration options
    const options = await generateRegistrationOptions({
      rpName: process.env.WEBAUTHN_RP_NAME || 'FacePay',
      rpID: process.env.WEBAUTHN_RP_ID || 'localhost', // or your domain
      userID: user.id,
      userName: user.email,
      userDisplayName: user.name || user.email,
      timeout: 60000,
      attestationType: 'direct',
      excludeCredentials: existingCredentials,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: true,
        userVerification: 'required'
      },
      supportedAlgorithmIDs: [-7, -257] // ES256, RS256
    })

    // Store challenge in session/database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentChallenge: options.challenge,
      },
    })

    console.log('[WebAuthn Registration Options] Registration options generated successfully:', {
      userId: user.id,
      email: user.email,
      challengeLength: options.challenge.length,
      rpID: options.rp.id,
      biometricRequired: true,
      platformAuthenticator: true,
      timestamp: new Date().toISOString()
    })

    return createSuccessResponse({
      options,
      userId: user.id,
      biometricRequired: true,
      platformAuthenticatorRequired: true,
      message: 'Registration options generated successfully'
    }, 'WebAuthn registration options generated')

  } catch (error) {
    console.error('[WebAuthn Registration Options] Failed to generate options:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')
    })
    return createErrorResponse('Failed to generate registration options', 500)
  }
}