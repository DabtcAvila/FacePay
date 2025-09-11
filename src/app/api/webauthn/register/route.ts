import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server'
import { analytics, EVENTS, FUNNELS } from '@/lib/analytics'
import { monitoring } from '@/lib/monitoring'
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
  const startTime = Date.now();
  
  try {
    // Track biometric setup funnel step 1 - Initiation Started
    analytics.trackFunnelStep(FUNNELS.BIOMETRIC_SETUP, 'initiation_started', 1, {
      user_id: user.id,
      existing_credentials_count: user.webauthnCredentials?.length || 0,
      has_existing_biometric: user.webauthnCredentials?.length > 0
    });

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

    // Track successful options generation
    analytics.trackFunnelStep(FUNNELS.BIOMETRIC_SETUP, 'options_generated', 2, {
      user_id: user.id,
      challenge_length: options.challenge.length,
      timeout: 60000,
      authenticator_attachment: 'platform'
    });

    // Track feature usage
    analytics.trackFeatureUsage('webauthn', 'registration_options_generated', {
      user_id: user.id,
      generation_time_ms: Date.now() - startTime,
      excluded_credentials_count: existingCredentials.length
    });

    // Add monitoring breadcrumb
    monitoring.addBreadcrumb(
      `WebAuthn registration options generated for user ${user.id}`,
      'biometric_setup',
      'info',
      { 
        userId: user.id, 
        challengeGenerated: true,
        existingCredentials: existingCredentials.length
      }
    );

    // Track performance
    monitoring.trackPerformanceMetric('webauthn_options_generation', Date.now() - startTime, {
      success: true,
      excluded_credentials: existingCredentials.length
    });

    return createSuccessResponse({
      options,
      userId: user.id,
    }, 'Registration options generated successfully')

  } catch (error) {
    const duration = Date.now() - startTime;

    // Track biometric setup failure
    analytics.track('Biometric Setup Failed', {
      reason: 'options_generation_failed',
      user_id: user.id,
      error_message: (error as Error).message,
      funnel: FUNNELS.BIOMETRIC_SETUP,
      step: 'options_generation'
    });

    // Capture exception in monitoring
    monitoring.captureException(error as Error, {
      extra: {
        context: 'webauthn_registration_initiation',
        user_id: user.id,
        duration,
        existing_credentials_count: user.webauthnCredentials?.length || 0
      },
      tags: {
        endpoint: '/api/webauthn/register',
        operation: 'registration_initiation'
      }
    });

    console.error('Failed to generate registration options:', error)
    return createErrorResponse('Failed to generate registration options', 500)
  }
}

async function handleRegistrationVerification(user: any, credential: any) {
  const startTime = Date.now();
  
  try {
    // Track biometric setup funnel step 3 - Verification Started
    analytics.trackFunnelStep(FUNNELS.BIOMETRIC_SETUP, 'verification_started', 3, {
      user_id: user.id,
      credential_id: credential.id,
      has_challenge: !!user.currentChallenge
    });

    // Retrieve the stored challenge
    if (!user.currentChallenge) {
      analytics.track('Biometric Setup Failed', {
        reason: 'no_active_challenge',
        user_id: user.id,
        funnel: FUNNELS.BIOMETRIC_SETUP,
        step: 'verification'
      });

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
      // Track verification failure
      analytics.track('Biometric Setup Failed', {
        reason: 'verification_failed',
        user_id: user.id,
        verification_result: verification.verified,
        has_registration_info: !!verification.registrationInfo,
        funnel: FUNNELS.BIOMETRIC_SETUP,
        step: 'verification'
      });

      monitoring.addBreadcrumb(
        `WebAuthn verification failed for user ${user.id}`,
        'biometric_setup',
        'warning',
        { userId: user.id, verified: verification.verified }
      );

      return createErrorResponse('WebAuthn registration verification failed', 400)
    }

    const { credentialID, credentialPublicKey, counter, credentialBackedUp, credentialDeviceType } = verification.registrationInfo

    // Check if credential already exists
    const existingCredential = await prisma.webauthnCredential.findUnique({
      where: { credentialId: Buffer.from(credentialID).toString('base64url') },
    })

    if (existingCredential) {
      analytics.track('Biometric Setup Failed', {
        reason: 'credential_already_exists',
        user_id: user.id,
        credential_id: Buffer.from(credentialID).toString('base64url'),
        funnel: FUNNELS.BIOMETRIC_SETUP,
        step: 'verification'
      });

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

    // Track successful biometric registration - Final Step
    analytics.trackFunnelStep(FUNNELS.BIOMETRIC_SETUP, 'registration_completed', 4, {
      user_id: user.id,
      credential_id: webauthnCredential.credentialId,
      device_type: webauthnCredential.deviceType,
      backed_up: webauthnCredential.backedUp,
      completion_time_ms: Date.now() - startTime
    });

    // Track biometric enrollment
    analytics.track(EVENTS.BIOMETRIC_ENROLLED, {
      user_id: user.id,
      biometric_type: 'webauthn_passkey',
      device_type: webauthnCredential.deviceType,
      backed_up: webauthnCredential.backedUp,
      enrollment_timestamp: webauthnCredential.createdAt
    });

    // Track user registration with biometric method
    analytics.trackUserRegistration('webauthn', {
      user_id: user.id,
      credential_id: webauthnCredential.credentialId,
      device_type: webauthnCredential.deviceType,
      backed_up: webauthnCredential.backedUp,
      completion_time_ms: Date.now() - startTime
    });

    // Track biometric authentication success
    // Use face_id for iOS devices, fingerprint as default for others
    const biometricType = webauthnCredential.deviceType?.toLowerCase().includes('ios') ? 'face_id' : 'fingerprint';
    analytics.trackBiometricAuth(biometricType, true, {
      user_id: user.id,
      operation: 'registration',
      device_type: webauthnCredential.deviceType,
      webauthn_method: 'platform_authenticator'
    });

    // Add monitoring breadcrumb for success
    monitoring.addBreadcrumb(
      `WebAuthn registration completed successfully for user ${user.id}`,
      'biometric_setup',
      'info',
      { 
        userId: user.id,
        credentialId: webauthnCredential.credentialId,
        deviceType: webauthnCredential.deviceType,
        backedUp: webauthnCredential.backedUp
      }
    );

    // Track performance metric
    monitoring.trackPerformanceMetric('webauthn_registration_verification', Date.now() - startTime, {
      success: true,
      device_type: webauthnCredential.deviceType,
      backed_up: webauthnCredential.backedUp
    });

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
    const duration = Date.now() - startTime;

    // Track verification system error
    analytics.track('Biometric Setup Failed', {
      reason: 'verification_system_error',
      user_id: user.id,
      error_message: (error as Error).message,
      funnel: FUNNELS.BIOMETRIC_SETUP,
      step: 'verification'
    });

    // Capture exception in monitoring
    monitoring.captureException(error as Error, {
      extra: {
        context: 'webauthn_registration_verification',
        user_id: user.id,
        credential_id: credential.id,
        duration,
        has_challenge: !!user.currentChallenge
      },
      tags: {
        endpoint: '/api/webauthn/register',
        operation: 'registration_verification'
      }
    });

    console.error('Failed to verify registration:', error)
    return createErrorResponse('Failed to verify registration', 500)
  }
}
// Prevent static generation
export const dynamic = 'force-dynamic'
