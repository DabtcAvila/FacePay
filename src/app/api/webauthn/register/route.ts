import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server'
import { z } from 'zod'

// Schema for registration initiation
const initiateRegistrationSchema = z.object({
  action: z.literal('initiate'),
})

// Schema for registration verification
const verifyRegistrationSchema = z.object({
  action: z.literal('verify'),
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

const requestSchema = z.union([initiateRegistrationSchema, verifyRegistrationSchema])

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const parsedBody = requestSchema.parse(body)

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

    if (parsedBody.action === 'initiate') {
      return await handleRegistrationInitiation(user)
    } else {
      return await handleRegistrationVerification(user, parsedBody.credential)
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('Invalid request format: ' + error.errors[0].message, 400)
    }
    
    console.error('WebAuthn registration error:', error)
    return createErrorResponse('Failed to process registration request', 500)
  }
}

async function handleRegistrationInitiation(user: any) {
  try {
    // Get existing credentials for the user to exclude them
    const existingCredentials = user.webauthnCredentials.map((cred: any) => ({
      id: Buffer.from(cred.credentialId, 'base64url'),
      type: 'public-key' as const,
    }))

    // Generate registration options
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

    // Store the challenge in the database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentChallenge: options.challenge,
      },
    })

    return createSuccessResponse({
      options,
      userId: user.id,
    }, 'Registration options generated successfully')

  } catch (error) {
    console.error('Failed to generate registration options:', error)
    return createErrorResponse('Failed to generate registration options', 500)
  }
}

async function handleRegistrationVerification(user: any, credential: any) {
  try {
    // Retrieve the stored challenge
    if (!user.currentChallenge) {
      return createErrorResponse('No active registration challenge found', 400)
    }

    // Verify the registration response
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
    }, 'Biometric registration completed successfully')

  } catch (error) {
    console.error('Failed to verify registration:', error)
    return createErrorResponse('Failed to verify registration', 500)
  }
}