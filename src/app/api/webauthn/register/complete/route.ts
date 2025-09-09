import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { WebAuthnService } from '@/services/webauthn'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { z } from 'zod'

const completeRegistrationSchema = z.object({
  credential: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      attestationObject: z.string(),
      clientDataJSON: z.string(),
    }),
    type: z.literal('public-key'),
    clientExtensionResults: z.record(z.any()).optional(),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { credential } = completeRegistrationSchema.parse(body)

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
    })

    if (!user) {
      return createErrorResponse('User not found', 404)
    }

    // Verify that we have a stored challenge
    if (!user.currentChallenge) {
      return createErrorResponse('No active registration challenge found. Please restart registration.', 400)
    }

    // Use WebAuthn service for additional processing if needed
    const serviceResponse = await WebAuthnService.completeRegistration(credential, user.id)
    
    if (!serviceResponse.success) {
      return createErrorResponse('WebAuthn service validation failed', 400)
    }

    // Verify the registration response using SimpleWebAuthn
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
      expectedRPID: process.env.WEBAUTHN_RP_ID || 'localhost',
      requireUserVerification: true,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return createErrorResponse('WebAuthn registration verification failed', 400)
    }

    const { credentialID, credentialPublicKey, counter, credentialBackedUp, credentialDeviceType } = verification.registrationInfo

    // Check if credential already exists
    const existingCredential = await prisma.webauthnCredential.findUnique({
      where: { credentialId: Buffer.from(credentialID).toString('base64url') },
    })

    if (existingCredential) {
      return createErrorResponse('Credential already registered', 409)
    }

    // Save the new credential and clear the challenge
    const [webauthnCredential] = await prisma.$transaction([
      prisma.webauthnCredential.create({
        data: {
          userId: user.id,
          credentialId: Buffer.from(credentialID).toString('base64url'),
          publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
          counter,
          backedUp: credentialBackedUp,
          deviceType: credentialDeviceType,
        },
        select: {
          id: true,
          credentialId: true,
          backedUp: true,
          deviceType: true,
          createdAt: true,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { currentChallenge: null }, // Clear the challenge
      }),
    ])

    // Create biometric data entry for tracking
    await prisma.biometricData.create({
      data: {
        userId: user.id,
        type: 'webauthn_passkey',
        data: 'registered', // Encrypted placeholder - in production would store relevant metadata
        isActive: true,
      },
    })

    return createSuccessResponse({
      verified: true,
      credential: {
        id: webauthnCredential.id,
        credentialId: webauthnCredential.credentialId,
        deviceType: webauthnCredential.deviceType,
        backedUp: webauthnCredential.backedUp,
        createdAt: webauthnCredential.createdAt,
      },
      message: 'Registration completed successfully'
    }, 'WebAuthn registration completed')

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('Invalid request format: ' + error.errors[0].message, 400)
    }
    
    console.error('WebAuthn registration complete error:', error)
    return createErrorResponse('Failed to complete WebAuthn registration', 500)
  }
}