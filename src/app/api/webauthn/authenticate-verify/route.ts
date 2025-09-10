import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { generateTokens } from '@/lib/jwt'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { z } from 'zod'

const verifyAuthenticationSchema = z.object({
  credential: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      authenticatorData: z.string(),
      clientDataJSON: z.string(),
      signature: z.string(),
      userHandle: z.string().optional(),
    }),
    type: z.literal('public-key'),
    clientExtensionResults: z.record(z.any()).optional(),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { credential } = verifyAuthenticationSchema.parse(body)

    // Find the credential in our database
    const webauthnCredential = await prisma.webauthnCredential.findUnique({
      where: { credentialId: credential.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            updatedAt: true,
            currentChallenge: true,
          },
        },
      },
    })

    if (!webauthnCredential) {
      return createErrorResponse('Credential not found', 404)
    }

    // Get the challenge from the user record
    const expectedChallenge = webauthnCredential.user.currentChallenge
    
    if (!expectedChallenge) {
      return createErrorResponse('No authentication challenge found', 400)
    }

    const verification = await verifyAuthenticationResponse({
      response: credential as any, // Simplified for demo
      expectedChallenge,
      expectedOrigin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
      expectedRPID: process.env.WEBAUTHN_RP_ID || 'localhost',
      authenticator: {
        credentialID: webauthnCredential.credentialId,
        credentialPublicKey: Buffer.from(webauthnCredential.publicKey, 'base64url'),
        counter: Number(webauthnCredential.counter),
      },
    })

    if (!verification.verified) {
      return createErrorResponse('WebAuthn authentication verification failed', 401)
    }

    // Update counter and clear challenge
    await prisma.webauthnCredential.update({
      where: { id: webauthnCredential.id },
      data: { counter: verification.authenticationInfo.newCounter },
    })

    // Clear the challenge after successful authentication
    await prisma.user.update({
      where: { id: webauthnCredential.userId },
      data: {
        currentChallenge: null,
      },
    })

    // Generate tokens for the user
    const tokens = generateTokens(webauthnCredential.user)

    return createSuccessResponse({
      verified: true,
      user: webauthnCredential.user,
      tokens,
    }, 'WebAuthn authentication successful')

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('WebAuthn authentication verification error:', error)
    return createErrorResponse('Failed to verify authentication', 500)
  }
}