import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { generateTokens } from '@/lib/jwt'
import { WebAuthnService } from '@/services/webauthn'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { z } from 'zod'

const completeAuthenticationSchema = z.object({
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
  email: z.string().email().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { credential, email } = completeAuthenticationSchema.parse(body)

    // Find the credential in our database
    const webauthnCredential = await prisma.webauthnCredential.findUnique({
      where: { credentialId: credential.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            currentChallenge: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    if (!webauthnCredential) {
      return createErrorResponse('Credential not found. Please register your biometric data first.', 404)
    }

    // Optional: Verify email matches if provided
    if (email && webauthnCredential.user.email !== email) {
      return createErrorResponse('Credential does not match the provided email', 403)
    }

    // Use WebAuthn service for additional processing if needed
    const serviceResponse = await WebAuthnService.completeAuthentication(credential, webauthnCredential.user.id)
    
    if (!serviceResponse.success) {
      return createErrorResponse('WebAuthn service validation failed', 400)
    }

    // Get the expected challenge - try from stored challenge first, then decode from client data
    let expectedChallenge = webauthnCredential.user.currentChallenge

    if (!expectedChallenge) {
      // Fallback: decode the client data to extract the challenge
      try {
        const clientData = JSON.parse(
          Buffer.from(credential.response.clientDataJSON, 'base64url').toString('utf-8')
        )
        expectedChallenge = clientData.challenge
      } catch (error) {
        return createErrorResponse('Invalid client data format and no stored challenge found', 400)
      }
    }

    // Verify the WebAuthn authentication response
    const verification = await verifyAuthenticationResponse({
      response: credential as any,
      expectedChallenge,
      expectedOrigin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
      expectedRPID: process.env.WEBAUTHN_RP_ID || 'localhost',
      authenticator: {
        credentialID: webauthnCredential.credentialId,
        credentialPublicKey: Buffer.from(webauthnCredential.publicKey, 'base64url'),
        counter: webauthnCredential.counter,
      },
      requireUserVerification: true, // Enforce biometric verification
    })

    if (!verification.verified) {
      return createErrorResponse('WebAuthn authentication verification failed', 401)
    }

    // Update the credential counter to prevent replay attacks and clear challenge
    await prisma.$transaction([
      prisma.webauthnCredential.update({
        where: { id: webauthnCredential.id },
        data: { 
          counter: verification.authenticationInfo.newCounter,
        },
      }),
      prisma.user.update({
        where: { id: webauthnCredential.user.id },
        data: { 
          currentChallenge: null, // Clear the challenge
          updatedAt: new Date() // Update last login timestamp
        },
      }),
    ])

    // Generate JWT tokens for the authenticated user
    const tokens = generateTokens(webauthnCredential.user)

    return createSuccessResponse({
      verified: true,
      user: {
        id: webauthnCredential.user.id,
        email: webauthnCredential.user.email,
        name: webauthnCredential.user.name,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
      loginMethod: 'webauthn_biometric',
      message: 'Authentication completed successfully'
    }, 'WebAuthn authentication completed')

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('Invalid request format: ' + error.errors[0].message, 400)
    }
    
    console.error('WebAuthn authentication complete error:', error)
    return createErrorResponse('Failed to complete WebAuthn authentication', 500)
  }
}