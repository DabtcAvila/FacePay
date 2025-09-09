import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/refresh/route'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken, generateTokens } from '@/lib/jwt'

// Mock the dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('@/lib/jwt', () => ({
  verifyRefreshToken: jest.fn(),
  generateTokens: jest.fn(),
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockVerifyRefreshToken = verifyRefreshToken as jest.MockedFunction<typeof verifyRefreshToken>
const mockGenerateTokens = generateTokens as jest.MockedFunction<typeof generateTokens>

describe('/api/auth/refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/refresh', () => {
    const validRefreshData = {
      refreshToken: 'valid-refresh-token'
    }

    it('should refresh tokens successfully with valid refresh token', async () => {
      const mockPayload = { userId: '1', type: 'refresh' }
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockNewTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }

      mockVerifyRefreshToken.mockReturnValue(mockPayload)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockGenerateTokens.mockReturnValue(mockNewTokens)

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify(validRefreshData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Tokens refreshed successfully')
      expect(data.data.user).toEqual(mockUser)
      expect(data.data.tokens).toEqual(mockNewTokens)

      expect(mockVerifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token')
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        }
      })
      expect(mockGenerateTokens).toHaveBeenCalledWith(mockUser)
    })

    it('should return error for invalid refresh token', async () => {
      mockVerifyRefreshToken.mockReturnValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify(validRefreshData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Invalid or expired refresh token')
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('should return error for expired refresh token', async () => {
      mockVerifyRefreshToken.mockReturnValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refreshToken: 'expired-refresh-token'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Invalid or expired refresh token')
    })

    it('should return error when user no longer exists', async () => {
      const mockPayload = { userId: 'non-existent-user', type: 'refresh' }
      mockVerifyRefreshToken.mockReturnValue(mockPayload)
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify(validRefreshData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.message).toBe('User not found')
      expect(mockGenerateTokens).not.toHaveBeenCalled()
    })

    it('should return error for missing refresh token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Refresh token is required')
    })

    it('should return error for empty refresh token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refreshToken: ''
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Refresh token is required')
    })

    it('should handle database errors during user lookup', async () => {
      const mockPayload = { userId: '1', type: 'refresh' }
      mockVerifyRefreshToken.mockReturnValue(mockPayload)
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection error'))

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify(validRefreshData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Internal server error')
    })

    it('should handle JWT verification errors', async () => {
      mockVerifyRefreshToken.mockImplementation(() => {
        throw new Error('JWT verification failed')
      })

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify(validRefreshData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Internal server error')
    })

    it('should handle token generation errors', async () => {
      const mockPayload = { userId: '1', type: 'refresh' }
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockVerifyRefreshToken.mockReturnValue(mockPayload)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockGenerateTokens.mockImplementation(() => {
        throw new Error('Token generation failed')
      })

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify(validRefreshData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Internal server error')
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: 'invalid-json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Internal server error')
    })

    it('should handle null payload from token verification', async () => {
      mockVerifyRefreshToken.mockReturnValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refreshToken: 'malformed-token'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Invalid or expired refresh token')
    })

    it('should handle token verification with undefined return', async () => {
      mockVerifyRefreshToken.mockReturnValue(undefined as any)

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify(validRefreshData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Invalid or expired refresh token')
    })
  })
})