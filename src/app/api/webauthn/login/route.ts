import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { generateTokens } from '@/lib/jwt'
import { verifyAuthenticationResponse, generateAuthenticationOptions } from '@simplewebauthn/server'
import { AuthenticatorTransportFuture } from '@simplewebauthn/types'
import { z } from 'zod'

// Schema for the login request
const biometricLoginSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
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
  challengeId: z.string().optional(), // For storing challenge in session/cache
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, credential, challengeId } = biometricLoginSchema.parse(body)

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

    // Decode the client data to extract the challenge
    let expectedChallenge: string
    try {
      const clientData = JSON.parse(
        Buffer.from(credential.response.clientDataJSON, 'base64url').toString('utf-8')
      )
      expectedChallenge = clientData.challenge
    } catch (error) {
      return createErrorResponse('Invalid client data format', 400)
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
      return createErrorResponse('Biometric authentication failed. Please try again.', 401)
    }

    // Update the credential counter to prevent replay attacks
    await prisma.webauthnCredential.update({
      where: { id: webauthnCredential.id },
      data: { 
        counter: verification.authenticationInfo.newCounter,
      },
    })

    // Generate JWT tokens for the authenticated user
    const tokens = generateTokens(webauthnCredential.user)

    // Update user's last login timestamp
    await prisma.user.update({
      where: { id: webauthnCredential.user.id },
      data: { updatedAt: new Date() },
    })

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
    }, 'Biometric login successful')

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        `Validation error: ${error.errors[0].message}`, 
        400
      )
    }
    
    console.error('WebAuthn biometric login error:', error)
    return createErrorResponse('Biometric login failed. Please try again or use an alternative login method.', 500)
  }
}

// GET method to generate authentication options for biometric login
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    let allowCredentials = undefined

    if (email) {
      // Get user's WebAuthn credentials for targeted authentication
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          webauthnCredentials: {
            where: {
              // Only include active credentials
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Within last 30 days
              }
            }
          },
        },
      })

      if (!user) {
        return createErrorResponse('User not found', 404)
      }

      if (user.webauthnCredentials.length === 0) {
        return createErrorResponse('No biometric credentials found. Please register your biometric data first.', 404)
      }

      allowCredentials = user.webauthnCredentials.map(cred => ({
        id: cred.credentialId,
        type: 'public-key' as const,
        transports: ['internal', 'hybrid'] as AuthenticatorTransportFuture[],
      }))
    }

    // Generate authentication options with biometric preferences
    const options = await generateAuthenticationOptions({
      timeout: 60000, // 60 seconds
      allowCredentials,
      userVerification: 'required', // Require biometric verification
      rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
    })

    return createSuccessResponse({
      options,
      supportsBiometric: true,
    }, 'Authentication options generated for biometric login')

  } catch (error) {
    console.error('WebAuthn authentication options error:', error)
    return createErrorResponse('Failed to generate biometric authentication options', 500)
  }
}