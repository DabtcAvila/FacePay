import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
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
  userId: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { credential, userId } = completeRegistrationSchema.parse(body)

    // Get demo user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return createErrorResponse('Demo user not found', 404)
    }

    // Verify that we have a stored challenge
    if (!user.currentChallenge) {
      return createErrorResponse('No active registration challenge found. Please restart registration.', 400)
    }

    // Log registration completion attempt
    console.log('[WebAuthn Demo Registration Complete] Processing REAL biometric registration completion:', {
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
      requireUserVerification: true, // CRITICAL: Ensure biometric verification was used
    })

    if (!verification.verified || !verification.registrationInfo) {
      console.error('[WebAuthn Demo Registration Complete] REAL biometric verification FAILED:', {
        verified: verification.verified,
        registrationInfo: !!verification.registrationInfo
      })
      return createErrorResponse('REAL WebAuthn biometric registration verification failed', 400)
    }

    const { credentialID, credentialPublicKey, counter, credentialBackedUp, credentialDeviceType, userVerified } = verification.registrationInfo

    // Validate biometric authentication using WebAuthn service
    const deviceInfo = {
      userAgent: request.headers.get('user-agent') || '',
      platform: 'demo'
    }
    
    const biometricValidation = WebAuthnService.validateBiometricAuthentication({
      credentialDeviceType,
      credentialBackedUp,
      userVerified
    }, deviceInfo)

    if (!biometricValidation.isValid) {
      console.error('[WebAuthn Demo Registration Complete] REAL biometric validation failed:', {
        userId: user.id,
        reason: biometricValidation.reason,
        credentialDeviceType,
        credentialBackedUp,
        userVerified
      })
      return createErrorResponse(biometricValidation.reason || 'REAL biometric authentication validation failed', 400)
    }

    // Log successful biometric validation
    WebAuthnService.logBiometricAuthenticationResult({}, user.id, {
      verified: true,
      credentialDeviceType,
      credentialBackedUp,
      userVerified
    })

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
        type: 'webauthn_passkey_demo',
        data: JSON.stringify({
          registered: true,
          authenticatorType: biometricAnalysis.authenticatorType,
          biometricUsed: biometricAnalysis.biometricUsed,
          deviceType: biometricAnalysis.deviceType,
          credentialType: biometricAnalysis.credentialType,
          platform: biometricAnalysis.platformInfo,
          registrationDate: new Date().toISOString(),
          realWebAuthn: true,
          demo: true
        }),
        isActive: true,
      },
    })

    // Log detailed registration completion
    console.log('[WebAuthn Demo Registration Complete] REAL biometric registration completed successfully:', {
      userId: user.id,
      email: user.email,
      credentialId: Buffer.from(credentialID).toString('base64url'),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      userVerified,
      authenticatorType: biometricAnalysis.authenticatorType,
      biometricUsed: biometricAnalysis.biometricUsed,
      platform: biometricAnalysis.platformInfo,
      realWebAuthn: true,
      demo: true,
      timestamp: new Date().toISOString()
    })

    return createSuccessResponse({
      verified: true,
      biometricVerified: userVerified,
      authenticatorType: biometricAnalysis.authenticatorType,
      biometricUsed: biometricAnalysis.biometricUsed,
      realWebAuthn: true,
      demo: true,
      credential: {
        id: webauthnCredential.id,
        credentialId: webauthnCredential.credentialId,
        deviceType: webauthnCredential.deviceType,
        backedUp: webauthnCredential.backedUp,
        createdAt: webauthnCredential.createdAt,
      },
      deviceInfo: biometricAnalysis.platformInfo,
      message: 'REAL biometric demo registration completed successfully - platform authenticator verified'
    }, 'WebAuthn REAL biometric demo registration completed')

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[WebAuthn Demo Registration Complete] Invalid request format:', error.errors)
      return createErrorResponse('Invalid request format: ' + error.errors[0].message, 400)
    }
    
    console.error('[WebAuthn Demo Registration Complete] Registration completion failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')
    })
    return createErrorResponse('Failed to complete REAL biometric demo registration', 500)
  }
}