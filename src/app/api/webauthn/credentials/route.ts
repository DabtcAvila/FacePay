import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    // Get user's WebAuthn credentials
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      include: {
        webauthnCredentials: {
          select: {
            id: true,
            credentialId: true,
            backedUp: true,
            deviceType: true,
            counter: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
      },
    })

    if (!user) {
      return createErrorResponse('User not found', 404)
    }

    // Format credentials for response
    const credentials = user.webauthnCredentials.map(cred => ({
      id: cred.id,
      credentialId: cred.credentialId,
      deviceType: cred.deviceType || 'unknown',
      backedUp: cred.backedUp || false,
      counter: cred.counter,
      createdAt: cred.createdAt,
      lastUsed: cred.updatedAt,
      // Add user-friendly names based on device type
      friendlyName: getFriendlyCredentialName(cred.deviceType, cred.backedUp),
    }))

    return createSuccessResponse({
      credentials,
      total: credentials.length,
      hasCredentials: credentials.length > 0,
    }, `Found ${credentials.length} WebAuthn credentials`)

  } catch (error) {
    console.error('WebAuthn credentials list error:', error)
    return createErrorResponse('Failed to retrieve WebAuthn credentials', 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const credentialId = searchParams.get('credentialId')

    if (!credentialId) {
      return createErrorResponse('Credential ID is required', 400)
    }

    // Verify that the credential belongs to the authenticated user
    const webauthnCredential = await prisma.webauthnCredential.findFirst({
      where: {
        credentialId: credentialId,
        userId: auth.user.userId,
      },
    })

    if (!webauthnCredential) {
      return createErrorResponse('Credential not found or does not belong to user', 404)
    }

    // Delete the credential
    await prisma.webauthnCredential.delete({
      where: { id: webauthnCredential.id },
    })

    // Also remove associated biometric data if exists
    await prisma.biometricData.deleteMany({
      where: {
        userId: auth.user.userId,
        type: 'webauthn_passkey',
      },
    })

    return createSuccessResponse({
      deleted: true,
      credentialId: credentialId,
    }, 'WebAuthn credential deleted successfully')

  } catch (error) {
    console.error('WebAuthn credential deletion error:', error)
    return createErrorResponse('Failed to delete WebAuthn credential', 500)
  }
}

/**
 * Generate user-friendly names for credentials based on device type and backup status
 */
function getFriendlyCredentialName(deviceType: string | null, backedUp: boolean | null): string {
  if (!deviceType) {
    return backedUp ? 'Cloud-synced Passkey' : 'Device Passkey'
  }

  switch (deviceType.toLowerCase()) {
    case 'singledevice':
      return 'Device Biometric (Face ID/Touch ID)'
    case 'multidevice':
      return 'Cross-device Passkey'
    default:
      return backedUp ? `${deviceType} (Cloud-synced)` : `${deviceType} (Device-only)`
  }
}