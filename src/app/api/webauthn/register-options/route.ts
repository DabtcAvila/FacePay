import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { generateRegistrationOptions } from '@simplewebauthn/server'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

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

    // Get existing credentials for the user
    const existingCredentials = user.webauthnCredentials.map(cred => ({
      id: cred.credentialId,
      type: 'public-key' as const,
    }))

    const options = await generateRegistrationOptions({
      rpName: 'FacePay',
      rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
      userID: Buffer.from(user.id, 'utf8'),
      userName: user.email,
      userDisplayName: user.name || user.email,
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials: existingCredentials,
      authenticatorSelection: {
        residentKey: 'discouraged',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
      supportedAlgorithmIDs: [-7, -257], // ES256, RS256
    })

    // Store challenge temporarily (in production, use Redis or session storage)
    // For now, we'll store it in the database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        // You would need to add a challenge field to the user model
        // For this demo, we'll use metadata or another approach
      },
    })

    return createSuccessResponse(options)

  } catch (error) {
    console.error('WebAuthn registration options error:', error)
    return createErrorResponse('Failed to generate registration options', 500)
  }
}