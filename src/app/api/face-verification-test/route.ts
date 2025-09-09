import { NextRequest, NextResponse } from 'next/server'
import { faceVerificationService } from '@/services/faceVerification'

// Simple test endpoint for the face verification service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, imageData, userId, embeddingId } = body

    if (action === 'enroll') {
      if (!userId || !imageData) {
        return NextResponse.json({ error: 'userId and imageData are required for enrollment' }, { status: 400 })
      }

      const result = await faceVerificationService.enrollFace(userId, imageData, false)
      return NextResponse.json(result)
    }

    if (action === 'verify') {
      if (!imageData) {
        return NextResponse.json({ error: 'imageData is required for verification' }, { status: 400 })
      }

      const result = await faceVerificationService.verifyFace(
        imageData, 
        embeddingId,
        {
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      )
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid action. Use "enroll" or "verify"' }, { status: 400 })

  } catch (error) {
    console.error('Face verification test error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}