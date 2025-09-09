import { NextRequest } from 'next/server'
import { POST } from '@/app/api/webauthn/register-options/route'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { generateRegistrationOptions } from '@simplewebauthn/server'

// Mock the dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth-middleware', () => ({
  requireAuth: jest.fn(),
  createErrorResponse: jest.fn((message: string, status: number) => ({
    json: () => Promise.resolve({ success: false, message }),
    status,
  })),
  createSuccessResponse: jest.fn((data: any) => ({
    json: () => Promise.resolve({ success: true, data }),
    status: 200,
  })),
}))

jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>
const mockGenerateRegistrationOptions = generateRegistrationOptions as jest.MockedFunction<typeof generateRegistrationOptions>

describe('/api/webauthn/register-options', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/webauthn/register-options', () => {
    it('should generate registration options successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        webauthnCredentials: [
          {
            credentialId: 'existing-credential-id',
          },
        ],
      }

      const mockOptions = {
        challenge: 'mock-challenge',
        rp: {
          name: 'FacePay',
          id: 'localhost',
        },
        user: {
          id: Buffer.from('1', 'utf8'),
          name: 'test@example.com',
          displayName: 'Test User',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        timeout: 60000,
        attestation: 'none',
        excludeCredentials: [
          {
            id: 'existing-credential-id',
            type: 'public-key',
          },
        ],
        authenticatorSelection: {
          residentKey: 'discouraged',
          userVerification: 'preferred',
          authenticatorAttachment: 'platform',
        },
      }

      mockRequireAuth.mockResolvedValue({ user: { userId: '1' } })
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockGenerateRegistrationOptions.mockResolvedValue(mockOptions)
      mockPrisma.user.update.mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/webauthn/register-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockOptions)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          webauthnCredentials: true,
        },
      })
      expect(mockGenerateRegistrationOptions).toHaveBeenCalledWith({
        rpName: 'FacePay',
        rpID: 'localhost',
        userID: Buffer.from('1', 'utf8'),
        userName: 'test@example.com',
        userDisplayName: 'Test User',
        timeout: 60000,
        attestationType: 'none',
        excludeCredentials: [
          {
            id: 'existing-credential-id',
            type: 'public-key',
          },
        ],
        authenticatorSelection: {
          residentKey: 'discouraged',
          userVerification: 'preferred',
          authenticatorAttachment: 'platform',
        },
        supportedAlgorithmIDs: [-7, -257],
      })
    })

    it('should generate registration options for user with no existing credentials', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        webauthnCredentials: [],
      }

      const mockOptions = {
        challenge: 'mock-challenge',
        rp: {
          name: 'FacePay',
          id: 'localhost',
        },
        user: {
          id: Buffer.from('1', 'utf8'),
          name: 'test@example.com',
          displayName: 'Test User',
        },
      }

      mockRequireAuth.mockResolvedValue({ user: { userId: '1' } })
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockGenerateRegistrationOptions.mockResolvedValue(mockOptions)
      mockPrisma.user.update.mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/webauthn/register-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockGenerateRegistrationOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          excludeCredentials: [],
        })
      )
    })

    it('should return error when user not found', async () => {
      mockRequireAuth.mockResolvedValue({ user: { userId: '1' } })
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/webauthn/register-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.message).toBe('User not found')
    })

    it('should return unauthorized error without auth', async () => {
      const mockError = {
        json: () => Promise.resolve({ success: false, message: 'Unauthorized' }),
        status: 401,
      }
      mockRequireAuth.mockResolvedValue({ error: mockError })

      const request = new NextRequest('http://localhost:3000/api/webauthn/register-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)

      expect(response).toBe(mockError)
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('should handle WebAuthn generation errors', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        webauthnCredentials: [],
      }

      mockRequireAuth.mockResolvedValue({ user: { userId: '1' } })
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockGenerateRegistrationOptions.mockRejectedValue(new Error('WebAuthn error'))

      const request = new NextRequest('http://localhost:3000/api/webauthn/register-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Failed to generate registration options')
    })

    it('should handle database errors', async () => {
      mockRequireAuth.mockResolvedValue({ user: { userId: '1' } })
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/webauthn/register-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Failed to generate registration options')
    })

    it('should use email as displayName when name is not provided', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: null,
        webauthnCredentials: [],
      }

      const mockOptions = {
        challenge: 'mock-challenge',
      }

      mockRequireAuth.mockResolvedValue({ user: { userId: '1' } })
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockGenerateRegistrationOptions.mockResolvedValue(mockOptions)
      mockPrisma.user.update.mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/webauthn/register-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      await POST(request)

      expect(mockGenerateRegistrationOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          userDisplayName: 'test@example.com',
        })
      )
    })
  })
})