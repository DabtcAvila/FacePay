import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { WebAuthnService } from '@/services/webauthn'
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
      console.error('[WebAuthn Registration] User not found:', auth.user.userId)
      return createErrorResponse('User not found', 404)
    }

    // Log biometric registration attempt
    console.log('[WebAuthn Registration] Starting biometric registration for user:', {
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

    // Generate registration options with improved compatibility for localhost
    const options = await generateRegistrationOptions({
      rpName: process.env.WEBAUTHN_RP_NAME || 'FacePay',
      rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
      userID: user.id,
      userName: user.email,
      userDisplayName: user.name || user.email,
      timeout: 60000,
      attestationType: 'none', // Change to 'none' for better compatibility
      excludeCredentials: existingCredentials,
      authenticatorSelection: {
        // Force platform authenticators (built-in biometric sensors)
        authenticatorAttachment: 'platform',
        // Change to false for better compatibility during testing
        requireResidentKey: false,
        // Change from 'required' to 'preferred' for testing
        userVerification: 'preferred',
      },
      supportedAlgorithmIDs: [-7, -257], // ES256, RS256
    })

    // Log the generated options for debugging
    console.log('[WebAuthn Registration] Generated options:', {
      userId: user.id,
      rpID: options.rp.id,
      authenticatorAttachment: options.authenticatorSelection?.authenticatorAttachment,
      userVerification: options.authenticatorSelection?.userVerification,
      requireResidentKey: options.authenticatorSelection?.requireResidentKey,
      attestationType: options.attestation,
      challengeLength: options.challenge.length,
      hostname: process.env.WEBAUTHN_RP_ID || 'localhost',
      origin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
      timestamp: new Date().toISOString()
    })

    // Store the challenge in the database for verification
    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentChallenge: options.challenge,
      },
    })

    // Log successful registration start
    console.log('[WebAuthn Registration] Registration options created successfully:', {
      userId: user.id,
      email: user.email,
      biometricRequired: true,
      platformAuthenticator: true,
      timestamp: new Date().toISOString()
    })

    return createSuccessResponse({
      options,
      userId: user.id,
      biometricRequired: true,
      platformAuthenticatorRequired: true,
      message: 'Biometric registration started successfully - platform authenticator required'
    }, 'WebAuthn biometric registration started')

  } catch (error) {
    console.error('[WebAuthn Registration] Registration start failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')
    })
    return createErrorResponse('Failed to start biometric registration', 500)
  }
}