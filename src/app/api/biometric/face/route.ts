import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { encryptData, decryptData } from '@/lib/encryption'
import { z } from 'zod'

const storeFaceDataSchema = z.object({
  faceData: z.string().min(1, 'Face data is required'),
  replaceExisting: z.boolean().optional().default(false),
})

const verifyFaceSchema = z.object({
  faceData: z.string().min(1, 'Face data is required'),
  threshold: z.number().min(0).max(1).optional().default(0.8),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { faceData, replaceExisting } = storeFaceDataSchema.parse(body)

    // If replacing existing data, deactivate current face data
    if (replaceExisting) {
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

    // Encrypt the face data
    const encryptedFaceData = encryptData(faceData)
    const encryptedDataString = JSON.stringify(encryptedFaceData)

    // Store the encrypted face data
    const biometricRecord = await prisma.biometricData.create({
      data: {
        userId: auth.user.userId,
        type: 'face',
        data: encryptedDataString,
        isActive: true,
      },
      select: {
        id: true,
        type: true,
        createdAt: true,
        isActive: true,
      }
    })

    return createSuccessResponse(biometricRecord, 'Face data stored successfully')

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Store face data error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { faceData, threshold } = verifyFaceSchema.parse(body)

    // Get user's active face data
    const userFaceData = await prisma.biometricData.findFirst({
      where: {
        userId: auth.user.userId,
        type: 'face',
        isActive: true,
      }
    })

    if (!userFaceData) {
      return createErrorResponse('No face data found for user', 404)
    }

    // Decrypt stored face data
    const encryptedData = JSON.parse(userFaceData.data)
    const storedFaceData = decryptData(encryptedData)

    // In a real implementation, you would use a face recognition library
    // to compare the face data. For now, we'll simulate this.
    const similarity = simulateFaceComparison(faceData, storedFaceData)
    const verified = similarity >= threshold

    return createSuccessResponse({
      verified,
      confidence: similarity,
      threshold,
      userId: verified ? auth.user.userId : undefined,
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Verify face data error:', error)
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

// Simulate face comparison - in production, use a proper face recognition library
function simulateFaceComparison(faceData1: string, faceData2: string): number {
  // Simple similarity check based on string comparison
  // In reality, this would use proper face recognition algorithms
  const similarity = faceData1 === faceData2 ? 1.0 : 0.3 + Math.random() * 0.4
  return Math.min(similarity, 1.0)
}