import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { WebAuthnService } from '@/services/webauthn'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { z } from 'zod'

const startAuthenticationSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  userId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, userId } = startAuthenticationSchema.parse(body)

    let allowCredentials = undefined
    let userForAuth = null

    if (email) {
      // Get user's credentials for specific user authentication
      userForAuth = await prisma.user.findUnique({
        where: { email },
        include: {
          webauthnCredentials: true,
        },
      })

      if (!userForAuth) {
        return createErrorResponse('User not found', 404)
      }

      if (userForAuth.webauthnCredentials.length === 0) {
        return createErrorResponse('No WebAuthn credentials found for this user', 404)
      }

      allowCredentials = userForAuth.webauthnCredentials.map(cred => ({
        id: cred.credentialId,
        type: 'public-key' as const,
      }))
    } else if (userId) {
      // Get user's credentials using userId
      userForAuth = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          webauthnCredentials: true,
        },
      })

      if (!userForAuth) {
        return createErrorResponse('User not found', 404)
      }

      if (userForAuth.webauthnCredentials.length === 0) {
        return createErrorResponse('No WebAuthn credentials found for this user', 404)
      }

      allowCredentials = userForAuth.webauthnCredentials.map(cred => ({
        id: cred.credentialId,
        type: 'public-key' as const,
      }))
    }

    // Use WebAuthn service for additional processing if needed
    if (userForAuth) {
      const serviceResponse = await WebAuthnService.startAuthentication(userForAuth.id)
      
      if (!serviceResponse.success) {
        return createErrorResponse('Failed to start authentication', 500)
      }
    }

    // Generate authentication options using SimpleWebAuthn
    const options = await generateAuthenticationOptions({
      timeout: 60000,
      allowCredentials,
      userVerification: 'required', // Require biometric verification
      rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
    })

    // Store challenge for verification if we have a specific user
    if (userForAuth) {
      await prisma.user.update({
        where: { id: userForAuth.id },
        data: {
          currentChallenge: options.challenge,
        },
      })
    }

    return createSuccessResponse({
      options,
      userId: userForAuth?.id,
      hasCredentials: allowCredentials ? allowCredentials.length > 0 : false,
      message: 'Authentication started successfully'
    }, 'WebAuthn authentication started')

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('Invalid request format: ' + error.errors[0].message, 400)
    }
    
    console.error('WebAuthn authentication start error:', error)
    return createErrorResponse('Failed to start WebAuthn authentication', 500)
  }
}