import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { faceVerificationService } from '@/services/faceVerification'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
const enrollFaceSchema = z.object({
  imageData: z.string().min(1, 'Image data is required'),
  replaceExisting: z.boolean().optional().default(false),
})

const verifyFaceSchema = z.object({
  imageData: z.string().min(1, 'Image data is required'),
  threshold: z.number().min(0).max(1).optional().default(0.85),
  embeddingId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { imageData, replaceExisting } = enrollFaceSchema.parse(body)

    // Enroll face using the verification service
    const result = await faceVerificationService.enrollFace(
      auth.user.userId,
      imageData,
      replaceExisting
    )

    if (!result.success) {
      return createErrorResponse(result.message, 400)
    }

    return createSuccessResponse({
      embeddingId: result.embeddingId,
      quality: result.quality,
      metadata: result.metadata,
    }, result.message)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Face enrollment error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageData, threshold, embeddingId } = verifyFaceSchema.parse(body)

    // Get request metadata for security logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Configure service with custom threshold if provided
    const serviceConfig = threshold !== 0.85 ? { confidenceThreshold: threshold } : undefined
    const service = serviceConfig ? 
      (await import('@/services/faceVerification')).createFaceVerificationService(serviceConfig) :
      faceVerificationService

    // Verify face using the verification service
    const result = await service.verifyFace(imageData, embeddingId, {
      ipAddress,
      userAgent,
    })

    return createSuccessResponse({
      verified: result.success,
      confidence: result.confidence,
      userId: result.userId,
      attemptId: result.attemptId,
      riskScore: result.riskScore,
      metadata: result.metadata,
    }, result.message)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Face verification error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const biometricData = await prisma.biometricData.findMany({
      where: {
        userId: auth.user.userId,
        type: 'face',
        isActive: true,
      },
      select: {
        id: true,
        type: true,
        createdAt: true,
        isActive: true,
      }
    })

    return createSuccessResponse(biometricData)

  } catch (error) {
    console.error('Get face data error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (id) {
      // Delete specific face data record
      await prisma.biometricData.delete({
        where: {
          id,
          userId: auth.user.userId,
          type: 'face',
        }
      })
    } else {
      // Deactivate all face data for user
      await prisma.biometricData.updateMany({
        where: {
          userId: auth.user.userId,
          type: 'face',
          isActive: true,
        },
        data: {
          isActive: false,
        }
      })
    }

    return createSuccessResponse(null, 'Face data removed successfully')

  } catch (error) {
    console.error('Delete face data error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

