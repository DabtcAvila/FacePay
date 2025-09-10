import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { AuthenticatorTransportFuture } from '@simplewebauthn/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, userName, userDisplayName } = body

    if (!userId || !userName) {
      return createErrorResponse('userId and userName are required', 400)
    }

    // Create or get demo user
    const user = await prisma.user.upsert({
      where: { email: userName },
      update: {
        name: userDisplayName || userName,
      },
      create: {
        id: userId,
        email: userName,
        name: userDisplayName || userName,
      },
      include: {
        webauthnCredentials: true,
      },
    })

    // Log demo registration attempt
    console.log('[WebAuthn Demo Registration] Starting REAL biometric registration for demo user:', {
      userId: user.id,
      email: user.email,
      existingCredentials: user.webauthnCredentials.length,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
    })

    // Get existing credentials for the user to exclude them
    const existingCredentials = user.webauthnCredentials.map(cred => ({
      id: cred.credentialId,
      type: 'public-key' as const,
      transports: ['internal', 'hybrid'] as AuthenticatorTransportFuture[],
    }))

    // Generate registration options with strict biometric requirements
    const options = await generateRegistrationOptions({
      rpName: process.env.WEBAUTHN_RP_NAME || 'FacePay Demo',
      rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
      userID: Buffer.from(user.id, 'utf8'),
      userName: user.email,
      userDisplayName: user.name || user.email,
      timeout: 60000,
      attestationType: 'direct',
      excludeCredentials: existingCredentials,
      authenticatorSelection: {
        // Force platform authenticators (built-in biometric sensors)
        authenticatorAttachment: 'platform',
        // Require resident key for better UX and security
        residentKey: 'required',
        // CRITICAL: Force biometric verification
        userVerification: 'required',
      },
      supportedAlgorithmIDs: [-7, -257], // ES256, RS256
    })

    // Log the generated options for debugging
    console.log('[WebAuthn Demo Registration] Generated REAL biometric options:', {
      userId: user.id,
      rpID: options.rp.id,
      authenticatorAttachment: options.authenticatorSelection?.authenticatorAttachment,
      userVerification: options.authenticatorSelection?.userVerification,
      residentKey: options.authenticatorSelection?.residentKey,
      attestationType: options.attestation,
      challengeLength: options.challenge.length,
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
    console.log('[WebAuthn Demo Registration] REAL biometric registration options created successfully:', {
      userId: user.id,
      email: user.email,
      biometricRequired: true,
      platformAuthenticator: true,
      realWebAuthn: true,
      timestamp: new Date().toISOString()
    })

    return createSuccessResponse({
      options,
      userId: user.id,
      biometricRequired: true,
      platformAuthenticatorRequired: true,
      realWebAuthn: true,
      message: 'REAL biometric registration started successfully - platform authenticator required'
    }, 'WebAuthn REAL biometric demo registration started')

  } catch (error) {
    console.error('[WebAuthn Demo Registration] Registration start failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')
    })
    return createErrorResponse('Failed to start REAL biometric demo registration', 500)
  }
}