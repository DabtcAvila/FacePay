import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { WebAuthnService } from '@/services/webauthn'
import { generateRegistrationOptions } from '@simplewebauthn/server'

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
      return createErrorResponse('User not found', 404)
    }

    // Get existing credentials for the user to exclude them
    const existingCredentials = user.webauthnCredentials.map(cred => ({
      id: Buffer.from(cred.credentialId, 'base64url'),
      type: 'public-key' as const,
    }))

    // Generate registration options using the WebAuthn service
    const serviceResponse = await WebAuthnService.startRegistration(user.id, user.email)
    
    if (!serviceResponse.success) {
      return createErrorResponse('Failed to start registration', 500)
    }

    // Generate proper registration options using SimpleWebAuthn
    const options = await generateRegistrationOptions({
      rpName: process.env.WEBAUTHN_RP_NAME || 'FacePay',
      rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
      userID: Buffer.from(user.id, 'utf8'),
      userName: user.email,
      userDisplayName: user.name || user.email,
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials: existingCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
        authenticatorAttachment: 'platform', // Prefer platform authenticators (biometric)
      },
      supportedAlgorithmIDs: [-7, -257], // ES256, RS256
    })

    // Store the challenge in the database for verification
    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentChallenge: options.challenge,
      },
    })

    return createSuccessResponse({
      options,
      userId: user.id,
      message: 'Registration started successfully'
    }, 'WebAuthn registration started')

  } catch (error) {
    console.error('WebAuthn registration start error:', error)
    return createErrorResponse('Failed to start WebAuthn registration', 500)
  }
}