import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/payments/methods/route'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import Stripe from 'stripe'

// Mock the dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    paymentMethod: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth-middleware', () => ({
  requireAuth: jest.fn(),
  createErrorResponse: jest.fn((message: string, status: number) => ({
    json: () => Promise.resolve({ success: false, message }),
    status,
  })),
  createSuccessResponse: jest.fn((data: any, message?: string) => ({
    json: () => Promise.resolve({ success: true, data, message }),
    status: 200,
  })),
}))

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentMethods: {
      retrieve: jest.fn(),
    },
  }))
})

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>
const MockStripe = Stripe as jest.MockedClass<typeof Stripe>
const mockStripe = new MockStripe('test-key')

describe('/api/payments/methods', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/payments/methods', () => {
    it('should get user payment methods successfully', async () => {
      const mockUser = { userId: '1' }
      const mockPaymentMethods = [
        {
          id: '1',
          type: 'card',
          provider: 'stripe',
          details: { stripePaymentMethodId: 'pm_test123' },
          isDefault: true,
          createdAt: new Date(),
        },
        {
          id: '2',
          type: 'crypto',
          provider: 'ethereum',
          details: { walletAddress: '0x123...', network: 'mainnet' },
          isDefault: false,
          createdAt: new Date(),
        },
      ]

      const mockStripePaymentMethod = {
        card: {
          last4: '4242',
          brand: 'visa',
          exp_month: 12,
          exp_year: 2025,
        },
      }

      mockRequireAuth.mockResolvedValue({ user: mockUser })
      mockPrisma.paymentMethod.findMany.mockResolvedValue(mockPaymentMethods)
      mockStripe.paymentMethods.retrieve.mockResolvedValue(mockStripePaymentMethod as any)

      const request = new NextRequest('http://localhost:3000/api/payments/methods', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
      expect(mockPrisma.paymentMethod.findMany).toHaveBeenCalledWith({
        where: { userId: '1' },
        select: {
          id: true,
          type: true,
          provider: true,
          details: true,
          isDefault: true,
          createdAt: true,
        },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' },
        ],
      })
    })

    it('should return unauthorized error without auth', async () => {
      const mockError = {
        json: () => Promise.resolve({ success: false, message: 'Unauthorized' }),
        status: 401,
      }
      mockRequireAuth.mockResolvedValue({ error: mockError })

      const request = new NextRequest('http://localhost:3000/api/payments/methods', {
        method: 'GET',
      })

      const response = await GET(request)

      expect(response).toBe(mockError)
      expect(mockPrisma.paymentMethod.findMany).not.toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      const mockUser = { userId: '1' }
      mockRequireAuth.mockResolvedValue({ user: mockUser })
      mockPrisma.paymentMethod.findMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/payments/methods', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Internal server error')
    })
  })

  describe('POST /api/payments/methods', () => {
    it('should add Stripe payment method successfully', async () => {
      const mockUser = { userId: '1' }
      const mockStripePaymentMethod = {
        card: {
          last4: '4242',
          brand: 'visa',
        },
      }
      const mockCreatedMethod = {
        id: '1',
        type: 'card',
        provider: 'stripe',
        details: {
          stripePaymentMethodId: 'pm_test123',
          last4: '4242',
          brand: 'visa',
        },
        isDefault: true,
        createdAt: new Date(),
      }

      mockRequireAuth.mockResolvedValue({ user: mockUser })
      mockStripe.paymentMethods.retrieve.mockResolvedValue(mockStripePaymentMethod as any)
      mockPrisma.paymentMethod.updateMany.mockResolvedValue({ count: 0 })
      mockPrisma.paymentMethod.create.mockResolvedValue(mockCreatedMethod)

      const request = new NextRequest('http://localhost:3000/api/payments/methods', {
        method: 'POST',
        body: JSON.stringify({
          type: 'card',
          provider: 'stripe',
          stripePaymentMethodId: 'pm_test123',
          isDefault: true,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Payment method added successfully')
      expect(mockPrisma.paymentMethod.updateMany).toHaveBeenCalledWith({
        where: {
          userId: '1',
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
      expect(mockPrisma.paymentMethod.create).toHaveBeenCalledWith({
        data: {
          userId: '1',
          type: 'card',
          provider: 'stripe',
          details: {
            stripePaymentMethodId: 'pm_test123',
            last4: '4242',
            brand: 'visa',
          },
          isDefault: true,
        },
        select: {
          id: true,
          type: true,
          provider: true,
          details: true,
          isDefault: true,
          createdAt: true,
        },
      })
    })

    it('should add crypto wallet payment method successfully', async () => {
      const mockUser = { userId: '1' }
      const mockCreatedMethod = {
        id: '2',
        type: 'crypto',
        provider: 'ethereum',
        details: {
          walletAddress: '0x123...',
          network: 'mainnet',
        },
        isDefault: false,
        createdAt: new Date(),
      }

      mockRequireAuth.mockResolvedValue({ user: mockUser })
      mockPrisma.paymentMethod.create.mockResolvedValue(mockCreatedMethod)

      const request = new NextRequest('http://localhost:3000/api/payments/methods', {
        method: 'POST',
        body: JSON.stringify({
          type: 'crypto',
          provider: 'ethereum',
          walletAddress: '0x123...',
          network: 'mainnet',
          isDefault: false,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Payment method added successfully')
      expect(mockPrisma.paymentMethod.updateMany).not.toHaveBeenCalled()
    })

    it('should return error for invalid Stripe payment method', async () => {
      const mockUser = { userId: '1' }
      mockRequireAuth.mockResolvedValue({ user: mockUser })
      mockStripe.paymentMethods.retrieve.mockRejectedValue(new Error('Payment method not found'))

      const request = new NextRequest('http://localhost:3000/api/payments/methods', {
        method: 'POST',
        body: JSON.stringify({
          type: 'card',
          provider: 'stripe',
          stripePaymentMethodId: 'pm_invalid',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Invalid Stripe payment method')
    })

    it('should return validation error for invalid input', async () => {
      const mockUser = { userId: '1' }
      mockRequireAuth.mockResolvedValue({ user: mockUser })

      const request = new NextRequest('http://localhost:3000/api/payments/methods', {
        method: 'POST',
        body: JSON.stringify({
          type: 'invalid-type',
          provider: 'stripe',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should return unauthorized error without auth', async () => {
      const mockError = {
        json: () => Promise.resolve({ success: false, message: 'Unauthorized' }),
        status: 401,
      }
      mockRequireAuth.mockResolvedValue({ error: mockError })

      const request = new NextRequest('http://localhost:3000/api/payments/methods', {
        method: 'POST',
        body: JSON.stringify({
          type: 'card',
          provider: 'stripe',
          stripePaymentMethodId: 'pm_test123',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)

      expect(response).toBe(mockError)
    })
  })
})