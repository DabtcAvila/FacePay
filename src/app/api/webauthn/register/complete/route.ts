import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { WebAuthnService } from '@/services/webauthn'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/types'
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

    // Log registration completion attempt
    console.log('[WebAuthn Registration Complete] Processing registration completion:', {
      userId: user.id,
      email: user.email,
      credentialId: credential.id,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')
    })

    // Verify the registration response using SimpleWebAuthn
    const verification = await verifyRegistrationResponse({
      response: credential as RegistrationResponseJSON,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
      expectedRPID: process.env.WEBAUTHN_RP_ID || 'localhost',
      requireUserVerification: true,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return createErrorResponse('WebAuthn registration verification failed', 400)
    }

    const { credentialID, credentialPublicKey, counter, credentialBackedUp, credentialDeviceType, userVerified } = verification.registrationInfo

    // Validate biometric authentication using WebAuthn service
    const deviceInfo = {
      userAgent: request.headers.get('user-agent') || '',
      platform: 'unknown'
    }
    
    const biometricValidation = WebAuthnService.validateBiometricAuthentication({
      credentialDeviceType,
      credentialBackedUp,
      userVerified
    }, deviceInfo)

    if (!biometricValidation.isValid) {
      console.error('[WebAuthn Registration Complete] Biometric validation failed:', {
        userId: user.id,
        reason: biometricValidation.reason,
        credentialDeviceType,
        credentialBackedUp,
        userVerified
      })
      return createErrorResponse(biometricValidation.reason || 'Biometric authentication validation failed', 400)
    }

    // Log successful biometric validation
    WebAuthnService.logBiometricAuthentication(user.id, {
      verified: true,
      credentialDeviceType,
      credentialBackedUp,
      userVerified
    }, deviceInfo)

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

    // Create biometric data entry for tracking with detailed metadata
    const biometricAnalysis = WebAuthnService.analyzeBiometricAuthentication({
      credentialDeviceType,
      credentialBackedUp,
      userVerified
    }, deviceInfo)

    await prisma.biometricData.create({
      data: {
        userId: user.id,
        type: 'webauthn_passkey',
        data: JSON.stringify({
          registered: true,
          authenticatorType: biometricAnalysis.authenticatorType,
          biometricUsed: biometricAnalysis.biometricUsed,
          deviceType: biometricAnalysis.deviceType,
          credentialType: biometricAnalysis.credentialType,
          platform: biometricAnalysis.platformInfo,
          registrationDate: new Date().toISOString()
        }),
        isActive: true,
      },
    })

    // Log detailed registration completion
    console.log('[WebAuthn Registration Complete] Biometric registration completed successfully:', {
      userId: user.id,
      email: user.email,
      credentialId: Buffer.from(credentialID).toString('base64url'),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      userVerified,
      authenticatorType: biometricAnalysis.authenticatorType,
      biometricUsed: biometricAnalysis.biometricUsed,
      platform: biometricAnalysis.platformInfo,
      timestamp: new Date().toISOString()
    })

    return createSuccessResponse({
      verified: true,
      biometricVerified: userVerified,
      authenticatorType: biometricAnalysis.authenticatorType,
      biometricUsed: biometricAnalysis.biometricUsed,
      credential: {
        id: webauthnCredential.id,
        credentialId: webauthnCredential.credentialId,
        deviceType: webauthnCredential.deviceType,
        backedUp: webauthnCredential.backedUp,
        createdAt: webauthnCredential.createdAt,
      },
      deviceInfo: biometricAnalysis.platformInfo,
      message: 'Biometric registration completed successfully - platform authenticator verified'
    }, 'WebAuthn biometric registration completed')

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[WebAuthn Registration Complete] Invalid request format:', error.errors)
      return createErrorResponse('Invalid request format: ' + error.errors[0].message, 400)
    }
    
    console.error('[WebAuthn Registration Complete] Registration completion failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')
    })
    return createErrorResponse('Failed to complete biometric registration', 500)
  }
}