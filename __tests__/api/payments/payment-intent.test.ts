import { NextRequest } from 'next/server'
import { POST, PUT } from '@/app/api/payments/stripe/payment-intent/route'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import Stripe from 'stripe'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    paymentMethod: {
      findFirst: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth-middleware', () => ({
  requireAuth: jest.fn(),
  createErrorResponse: jest.fn((message: string, status: number) => 
    new Response(JSON.stringify({ success: false, message }), { status })
  ),
  createSuccessResponse: jest.fn((data: any, message?: string) => 
    new Response(JSON.stringify({ success: true, data, message }), { status: 200 })
  ),
}))

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
      confirm: jest.fn(),
    },
  }))
})

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>
const MockStripe = Stripe as jest.MockedClass<typeof Stripe>
const mockStripe = new MockStripe('test-key')

describe('/api/payments/stripe/payment-intent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock environment variables
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
  })

  describe('POST /api/payments/stripe/payment-intent', () => {
    const mockUser = { userId: 'user-123' }

    it('should create payment intent successfully without payment method', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        status: 'requires_payment_method',
        amount: 2000,
        currency: 'usd',
      }

      const mockTransaction = {
        id: 'txn-123',
        userId: 'user-123',
        amount: 20.00,
        currency: 'USD',
        status: 'pending',
        paymentMethodId: 'stripe-temp',
        description: 'Stripe payment',
        metadata: {
          stripePaymentIntentId: 'pi_test123',
        },
      }

      mockRequireAuth.mockResolvedValue({ user: mockUser })
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent as any)
      mockPrisma.transaction.create.mockResolvedValue(mockTransaction)

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: 20.00,
          currency: 'USD',
          description: 'Test payment',
          metadata: { orderId: 'order-123' },
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({
        clientSecret: 'pi_test123_secret',
        paymentIntentId: 'pi_test123',
        transactionId: 'txn-123',
        status: 'requires_payment_method',
      })

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 2000, // Amount in cents
        currency: 'usd',
        customer: 'user-123',
        description: 'Test payment',
        metadata: {
          userId: 'user-123',
          orderId: 'order-123',
        },
      })

      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          amount: 20.00,
          currency: 'USD',
          status: 'pending',
          paymentMethodId: 'stripe-temp',
          description: 'Test payment',
          metadata: {
            stripePaymentIntentId: 'pi_test123',
            orderId: 'order-123',
          },
        },
      })
    })

    it('should create payment intent with payment method and confirm', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        status: 'requires_confirmation',
        amount: 5000,
        currency: 'usd',
      }

      const mockPaymentMethod = {
        id: 'pm-123',
        userId: 'user-123',
        type: 'card',
        provider: 'stripe',
        details: { stripePaymentMethodId: 'pm_stripe123' },
        isDefault: true,
      }

      const mockTransaction = {
        id: 'txn-123',
        userId: 'user-123',
        amount: 50.00,
        currency: 'USD',
        status: 'pending',
        paymentMethodId: 'pm-123',
        description: 'Premium subscription',
        metadata: { stripePaymentIntentId: 'pi_test123' },
      }

      mockRequireAuth.mockResolvedValue({ user: mockUser })
      mockPrisma.paymentMethod.findFirst.mockResolvedValue(mockPaymentMethod)
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent as any)
      mockPrisma.transaction.create.mockResolvedValue(mockTransaction)

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: 50.00,
          currency: 'USD',
          paymentMethodId: 'pm_stripe123',
          description: 'Premium subscription',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 5000,
        currency: 'usd',
        customer: 'user-123',
        description: 'Premium subscription',
        metadata: { userId: 'user-123' },
        payment_method: 'pm_stripe123',
        confirmation_method: 'manual',
        confirm: true,
        return_url: 'http://localhost:3000/payments/success',
      })

      expect(mockPrisma.paymentMethod.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          details: {
            path: ['stripePaymentMethodId'],
            equals: 'pm_stripe123',
          },
        },
      })

      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          amount: 50.00,
          currency: 'USD',
          status: 'pending',
          paymentMethodId: 'pm-123',
          description: 'Premium subscription',
          metadata: { stripePaymentIntentId: 'pi_test123' },
        },
      })
    })

    it('should handle invalid amount', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser })

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: -10,
          currency: 'USD',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Amount must be positive')
    })

    it('should handle unauthorized access', async () => {
      const mockError = new Response(
        JSON.stringify({ success: false, message: 'Unauthorized' }),
        { status: 401 }
      )
      mockRequireAuth.mockResolvedValue({ error: mockError })

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: 20.00,
          currency: 'USD',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)

      expect(response).toBe(mockError)
    })

    it('should handle Stripe errors', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser })
      mockStripe.paymentIntents.create.mockRejectedValue(
        new Error('Your card was declined.')
      )

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: 20.00,
          currency: 'USD',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Failed to create payment intent')
    })

    it('should handle database errors during transaction creation', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        status: 'requires_payment_method',
      }

      mockRequireAuth.mockResolvedValue({ user: mockUser })
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent as any)
      mockPrisma.transaction.create.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: 20.00,
          currency: 'USD',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Failed to create payment intent')
    })

    it('should use default currency when not provided', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        status: 'requires_payment_method',
      }

      mockRequireAuth.mockResolvedValue({ user: mockUser })
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent as any)
      mockPrisma.transaction.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: 20.00,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'usd', // Default currency
        })
      )
    })

    it('should handle malformed JSON', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser })

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'POST',
        body: 'invalid-json',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Failed to create payment intent')
    })
  })

  describe('PUT /api/payments/stripe/payment-intent', () => {
    const mockUser = { userId: 'user-123' }

    it('should confirm payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        status: 'succeeded',
      }

      mockRequireAuth.mockResolvedValue({ user: mockUser })
      mockStripe.paymentIntents.confirm.mockResolvedValue(mockPaymentIntent as any)
      mockPrisma.transaction.updateMany.mockResolvedValue({ count: 1 })

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'PUT',
        body: JSON.stringify({
          paymentIntentId: 'pi_test123',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({
        paymentIntentId: 'pi_test123',
        status: 'succeeded',
      })

      expect(mockStripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_test123')
      expect(mockPrisma.transaction.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          metadata: {
            path: ['stripePaymentIntentId'],
            equals: 'pi_test123',
          },
        },
        data: {
          status: 'completed',
          completedAt: expect.any(Date),
        },
      })
    })

    it('should handle failed payment confirmation', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        status: 'payment_failed',
      }

      mockRequireAuth.mockResolvedValue({ user: mockUser })
      mockStripe.paymentIntents.confirm.mockResolvedValue(mockPaymentIntent as any)
      mockPrisma.transaction.updateMany.mockResolvedValue({ count: 1 })

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'PUT',
        body: JSON.stringify({
          paymentIntentId: 'pi_test123',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockPrisma.transaction.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          metadata: {
            path: ['stripePaymentIntentId'],
            equals: 'pi_test123',
          },
        },
        data: {
          status: 'failed',
          completedAt: null,
        },
      })
    })

    it('should handle missing payment intent ID', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser })

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'PUT',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Payment intent ID is required')
    })

    it('should handle unauthorized access', async () => {
      const mockError = new Response(
        JSON.stringify({ success: false, message: 'Unauthorized' }),
        { status: 401 }
      )
      mockRequireAuth.mockResolvedValue({ error: mockError })

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'PUT',
        body: JSON.stringify({
          paymentIntentId: 'pi_test123',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request)

      expect(response).toBe(mockError)
    })

    it('should handle Stripe confirmation errors', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser })
      mockStripe.paymentIntents.confirm.mockRejectedValue(
        new Error('Payment intent cannot be confirmed')
      )

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'PUT',
        body: JSON.stringify({
          paymentIntentId: 'pi_test123',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Failed to confirm payment intent')
    })

    it('should handle database errors during transaction update', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        status: 'succeeded',
      }

      mockRequireAuth.mockResolvedValue({ user: mockUser })
      mockStripe.paymentIntents.confirm.mockResolvedValue(mockPaymentIntent as any)
      mockPrisma.transaction.updateMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'PUT',
        body: JSON.stringify({
          paymentIntentId: 'pi_test123',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Failed to confirm payment intent')
    })
  })
})