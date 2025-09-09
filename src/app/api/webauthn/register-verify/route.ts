import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { z } from 'zod'

const verifyRegistrationSchema = z.object({
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
    const { credential } = verifyRegistrationSchema.parse(body)

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
    })

    if (!user) {
      return createErrorResponse('User not found', 404)
    }

    // In production, retrieve the challenge from secure storage
    // For this demo, we'll use a placeholder
    const expectedChallenge = 'placeholder-challenge'

    const verification = await verifyRegistrationResponse({
      response: credential as any, // Simplified for demo
      expectedChallenge,
      expectedOrigin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
      expectedRPID: process.env.WEBAUTHN_RP_ID || 'localhost',
    })

    if (!verification.verified || !verification.registrationInfo) {
      return createErrorResponse('WebAuthn registration verification failed', 400)
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo

    // Check if credential already exists
    const existingCredential = await prisma.webauthnCredential.findUnique({
      where: { credentialId: Buffer.from(credentialID).toString('base64url') },
    })

    if (existingCredential) {
      return createErrorResponse('Credential already exists', 409)
    }

    // Save the credential
    const webauthnCredential = await prisma.webauthnCredential.create({
      data: {
        userId: user.id,
        credentialId: Buffer.from(credentialID).toString('base64url'),
        publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
      },
      select: {
        id: true,
        credentialId: true,
        createdAt: true,
      },
    })

    return createSuccessResponse({
      verified: true,
      credential: webauthnCredential,
    }, 'WebAuthn credential registered successfully')

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('WebAuthn registration verification error:', error)
    return createErrorResponse('Failed to verify registration', 500)
  }
}