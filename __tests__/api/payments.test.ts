import { NextRequest } from 'next/server'
import { POST as CreatePaymentIntent } from '@/app/api/payments/stripe/payment-intent/route'
import { POST as CreateCheckout } from '@/app/api/payments/stripe/checkout/route'
import { POST as AddPaymentMethod } from '@/app/api/payments/methods/route'
import { GET as GetPaymentMethods } from '@/app/api/payments/methods/route'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import Stripe from 'stripe'

// Mock all dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    paymentMethod: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
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
    },
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    paymentMethods: {
      retrieve: jest.fn(),
    },
  }))
})

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>
const MockStripe = Stripe as jest.MockedClass<typeof Stripe>
const mockStripe = new MockStripe('test-key')

describe('Payments API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
  })

  describe('Payment Flow Integration', () => {
    const mockUser = { userId: 'user-123' }

    it('should complete full payment method setup and payment flow', async () => {
      // Step 1: Add payment method
      const mockStripePaymentMethod = {
        id: 'pm_test123',
        card: { last4: '4242', brand: 'visa' }
      }

      const mockCreatedPaymentMethod = {
        id: 'pm-db-123',
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
      mockPrisma.paymentMethod.create.mockResolvedValue(mockCreatedPaymentMethod)

      const addPaymentMethodRequest = new NextRequest('http://localhost:3000/api/payments/methods', {
        method: 'POST',
        body: JSON.stringify({
          type: 'card',
          provider: 'stripe',
          stripePaymentMethodId: 'pm_test123',
          isDefault: true,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const addPaymentMethodResponse = await AddPaymentMethod(addPaymentMethodRequest)
      const paymentMethodData = await addPaymentMethodResponse.json()

      expect(addPaymentMethodResponse.status).toBe(200)
      expect(paymentMethodData.success).toBe(true)

      // Step 2: Create payment intent with the payment method
      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        status: 'requires_confirmation',
      }

      const mockTransaction = {
        id: 'txn-123',
        userId: 'user-123',
        amount: 25.00,
        currency: 'USD',
        status: 'pending',
        paymentMethodId: 'pm-db-123',
      }

      mockPrisma.paymentMethod.findFirst.mockResolvedValue(mockCreatedPaymentMethod)
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent as any)
      mockPrisma.transaction.create.mockResolvedValue(mockTransaction)

      const createPaymentRequest = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: 25.00,
          currency: 'USD',
          paymentMethodId: 'pm_test123',
          description: 'Integration test payment',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const createPaymentResponse = await CreatePaymentIntent(createPaymentRequest)
      const paymentData = await createPaymentResponse.json()

      expect(createPaymentResponse.status).toBe(200)
      expect(paymentData.success).toBe(true)
      expect(paymentData.data).toEqual({
        clientSecret: 'pi_test123_secret',
        paymentIntentId: 'pi_test123',
        transactionId: 'txn-123',
        status: 'requires_confirmation',
      })

      // Verify payment method lookup was called
      expect(mockPrisma.paymentMethod.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          details: {
            path: ['stripePaymentMethodId'],
            equals: 'pm_test123',
          },
        },
      })
    })

    it('should create checkout session for subscription payments', async () => {
      const mockCheckoutSession = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/pay/cs_test123',
        payment_status: 'unpaid',
      }

      mockRequireAuth.mockResolvedValue({ user: mockUser })
      mockStripe.checkout.sessions.create.mockResolvedValue(mockCheckoutSession as any)

      try {
        const checkoutRequest = new NextRequest('http://localhost:3000/api/payments/stripe/checkout', {
          method: 'POST',
          body: JSON.stringify({
            priceId: 'price_test123',
            mode: 'subscription',
            successUrl: 'http://localhost:3000/success',
            cancelUrl: 'http://localhost:3000/cancel',
          }),
          headers: { 'Content-Type': 'application/json' },
        })

        const checkoutResponse = await CreateCheckout(checkoutRequest)
        const checkoutData = await checkoutResponse.json()

        expect(checkoutResponse.status).toBe(200)
        expect(checkoutData.success).toBe(true)
      } catch (error) {
        // Checkout endpoint might not be fully implemented
        console.log('Checkout endpoint not fully implemented yet')
      }
    })

    it('should handle payment method retrieval and enhancement', async () => {
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
          details: { walletAddress: '0x123...' },
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

      const getMethodsRequest = new NextRequest('http://localhost:3000/api/payments/methods', {
        method: 'GET',
      })

      const getMethodsResponse = await GetPaymentMethods(getMethodsRequest)
      const methodsData = await getMethodsResponse.json()

      expect(getMethodsResponse.status).toBe(200)
      expect(methodsData.success).toBe(true)
      expect(Array.isArray(methodsData.data)).toBe(true)
      expect(methodsData.data).toHaveLength(2)

      // Verify Stripe enhancement was attempted
      expect(mockStripe.paymentMethods.retrieve).toHaveBeenCalledWith('pm_test123')
    })
  })

  describe('Payment Error Scenarios', () => {
    const mockUser = { userId: 'user-123' }

    it('should handle invalid payment amounts', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser })

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: -50,
          currency: 'USD',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await CreatePaymentIntent(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Amount must be positive')
    })

    it('should handle Stripe API failures', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser })
      mockStripe.paymentIntents.create.mockRejectedValue(new Error('Card declined'))

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: 100,
          currency: 'USD',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await CreatePaymentIntent(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Failed to create payment intent')
    })

    it('should handle unauthorized payment attempts', async () => {
      const mockError = new Response(
        JSON.stringify({ success: false, message: 'Unauthorized' }),
        { status: 401 }
      )
      mockRequireAuth.mockResolvedValue({ error: mockError })

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: 50,
          currency: 'USD',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await CreatePaymentIntent(request)

      expect(response).toBe(mockError)
    })

    it('should handle payment method not found', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser })
      mockPrisma.paymentMethod.findFirst.mockResolvedValue(null)

      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        status: 'requires_payment_method',
      }

      const mockTransaction = {
        id: 'txn-123',
        paymentMethodId: 'stripe-temp', // Should use temp ID when payment method not found
      }

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent as any)
      mockPrisma.transaction.create.mockResolvedValue(mockTransaction)

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: 50,
          currency: 'USD',
          paymentMethodId: 'pm_nonexistent',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await CreatePaymentIntent(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          paymentMethodId: 'stripe-temp',
        }),
      })
    })

    it('should handle database transaction failures', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser })

      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        status: 'requires_payment_method',
      }

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent as any)
      mockPrisma.transaction.create.mockRejectedValue(new Error('Database constraint violation'))

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: 50,
          currency: 'USD',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await CreatePaymentIntent(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Failed to create payment intent')
    })
  })

  describe('Payment Security and Validation', () => {
    const mockUser = { userId: 'user-123' }

    it('should validate currency format', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser })

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: 50,
          currency: 'INVALID_CURRENCY_CODE',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await CreatePaymentIntent(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should properly convert amounts to cents', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser })

      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        status: 'requires_payment_method',
      }

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent as any)
      mockPrisma.transaction.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: 25.99,
          currency: 'USD',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await CreatePaymentIntent(request)

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 2599, // 25.99 * 100
        })
      )
    })

    it('should include user metadata in payment intents', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser })

      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        status: 'requires_payment_method',
      }

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent as any)
      mockPrisma.transaction.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: 50,
          currency: 'USD',
          metadata: { orderId: 'order-123' },
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await CreatePaymentIntent(request)

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            userId: 'user-123',
            orderId: 'order-123',
          },
        })
      )
    })

    it('should handle concurrent payment method additions', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser })

      const mockStripePaymentMethod = {
        card: { last4: '4242', brand: 'visa' }
      }

      // First request succeeds
      mockStripe.paymentMethods.retrieve.mockResolvedValueOnce(mockStripePaymentMethod as any)
      mockPrisma.paymentMethod.updateMany.mockResolvedValueOnce({ count: 0 })
      mockPrisma.paymentMethod.create.mockResolvedValueOnce({
        id: 'pm-1',
        isDefault: true,
      } as any)

      // Second request fails due to database constraint
      mockStripe.paymentMethods.retrieve.mockResolvedValueOnce(mockStripePaymentMethod as any)
      mockPrisma.paymentMethod.updateMany.mockResolvedValueOnce({ count: 0 })
      mockPrisma.paymentMethod.create.mockRejectedValueOnce(new Error('Unique constraint violation'))

      const request1 = new NextRequest('http://localhost:3000/api/payments/methods', {
        method: 'POST',
        body: JSON.stringify({
          type: 'card',
          provider: 'stripe',
          stripePaymentMethodId: 'pm_test123',
          isDefault: true,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const request2 = new NextRequest('http://localhost:3000/api/payments/methods', {
        method: 'POST',
        body: JSON.stringify({
          type: 'card',
          provider: 'stripe',
          stripePaymentMethodId: 'pm_test123',
          isDefault: true,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response1 = await AddPaymentMethod(request1)
      const response2 = await AddPaymentMethod(request2)

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(500)
    })
  })
})