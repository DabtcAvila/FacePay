import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { z } from 'zod'

const authenticateOptionsSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = authenticateOptionsSchema.parse(body)

    let allowCredentials = undefined

    if (email) {
      // Get user's credentials for specific user authentication
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          webauthnCredentials: true,
        },
      })

      if (user && user.webauthnCredentials.length > 0) {
        allowCredentials = user.webauthnCredentials.map(cred => ({
          id: cred.credentialId,
          type: 'public-key' as const,
        }))
      }
    }

    const options = await generateAuthenticationOptions({
      timeout: 60000,
      allowCredentials,
      userVerification: 'preferred',
      rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
    })

    return createSuccessResponse(options)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('WebAuthn authentication options error:', error)
    return createErrorResponse('Failed to generate authentication options', 500)
  }
}