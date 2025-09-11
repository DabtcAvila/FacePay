import Stripe from 'stripe'
import { ethers } from 'ethers'
import { paymentMonitor, TransactionData } from './payment-monitoring'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export class PaymentService {
  // Stripe Checkout Methods
  static async createCheckoutSession(params: {
    amount: number
    currency?: string
    customerId?: string
    successUrl?: string
    cancelUrl?: string
    description?: string
    metadata?: Record<string, string>
  }) {
    const {
      amount,
      currency = 'usd',
      customerId,
      successUrl,
      cancelUrl,
      description,
      metadata
    } = params

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: description || 'FacePay Payment',
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/payments/cancel`,
      metadata,
    }

    if (customerId) {
      sessionParams.customer = customerId
    }

    return await stripe.checkout.sessions.create(sessionParams)
  }

  static async retrieveCheckoutSession(sessionId: string) {
    return await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'customer'],
    })
  }

  // Stripe Payment Methods
  static async createPaymentIntent(amount: number, currency: string = 'usd') {
    return await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
    })
  }

  static async createPaymentMethod(type: string, card?: any) {
    return await stripe.paymentMethods.create({
      type: type as any,
      card,
    })
  }

  static async attachPaymentMethodToCustomer(paymentMethodId: string, customerId: string) {
    return await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    })
  }

  static async createCustomer(email: string, name?: string) {
    return await stripe.customers.create({
      email,
      name,
    })
  }

  // Ethereum/Web3 Payment Methods
  static async createEthereumPayment(
    recipientAddress: string, 
    amountInEth: string, 
    privateKey: string
  ) {
    const provider = new ethers.JsonRpcProvider(
      `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
    )
    
    const wallet = new ethers.Wallet(privateKey, provider)
    
    const transaction = {
      to: recipientAddress,
      value: ethers.parseEther(amountInEth),
      gasLimit: 21000,
    }

    return await wallet.sendTransaction(transaction)
  }

  static async getEthBalance(address: string): Promise<string> {
    const provider = new ethers.JsonRpcProvider(
      `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
    )
    
    const balance = await provider.getBalance(address)
    return ethers.formatEther(balance)
  }

  static validateEthereumAddress(address: string): boolean {
    return ethers.isAddress(address)
  }

  // Webhook Processing Methods
  static async processWebhookEvent(event: any) {
    switch (event.type) {
      case 'checkout.session.completed':
        return await this.handleCheckoutSessionCompleted(event.data.object)
      case 'payment_intent.succeeded':
        return await this.handlePaymentIntentSucceeded(event.data.object)
      case 'payment_intent.payment_failed':
        return await this.handlePaymentIntentFailed(event.data.object)
      default:
        console.log('Unhandled webhook event type:', event.type)
        return null
    }
  }

  private static async handleCheckoutSessionCompleted(session: any) {
    // This would typically update your database
    console.log('Checkout session completed:', session.id)
    
    // Track successful transaction
    const startTime = Date.now();
    await paymentMonitor.trackTransaction({
      id: session.id,
      userId: session.customer || 'anonymous',
      amount: session.amount_total / 100, // Convert from cents
      currency: session.currency.toUpperCase(),
      status: 'completed',
      paymentMethod: 'stripe_checkout',
      timestamp: new Date(),
      responseTime: Date.now() - startTime,
      metadata: {
        sessionId: session.id,
        paymentStatus: session.payment_status
      }
    });

    return {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
    }
  }

  private static async handlePaymentIntentSucceeded(paymentIntent: any) {
    console.log('Payment intent succeeded:', paymentIntent.id)
    
    // Track successful transaction
    await paymentMonitor.trackTransaction({
      id: paymentIntent.id,
      userId: paymentIntent.customer || 'anonymous',
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency.toUpperCase(),
      status: 'completed',
      paymentMethod: 'stripe_payment_intent',
      timestamp: new Date(),
      metadata: {
        paymentIntentId: paymentIntent.id,
        charges: paymentIntent.charges?.data?.length || 0
      }
    });

    return {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    }
  }

  private static async handlePaymentIntentFailed(paymentIntent: any) {
    console.log('Payment intent failed:', paymentIntent.id)
    
    // Track failed transaction
    await paymentMonitor.trackTransaction({
      id: paymentIntent.id,
      userId: paymentIntent.customer || 'anonymous',
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency.toUpperCase(),
      status: 'failed',
      paymentMethod: 'stripe_payment_intent',
      timestamp: new Date(),
      errorCode: paymentIntent.last_payment_error?.code,
      errorMessage: paymentIntent.last_payment_error?.message,
      metadata: {
        paymentIntentId: paymentIntent.id,
        failureReason: paymentIntent.last_payment_error?.type,
        declineCode: paymentIntent.last_payment_error?.decline_code
      }
    });

    return {
      paymentIntentId: paymentIntent.id,
      errorMessage: paymentIntent.last_payment_error?.message,
    }
  }

  // Customer Management
  static async getOrCreateCustomer(email: string, name?: string, userId?: string) {
    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0]
    }

    // Create new customer
    return await stripe.customers.create({
      email,
      name,
      metadata: userId ? { userId } : undefined,
    })
  }

  // Payment Method Management
  static async listPaymentMethods(customerId: string) {
    return await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })
  }

  static async detachPaymentMethod(paymentMethodId: string) {
    return await stripe.paymentMethods.detach(paymentMethodId)
  }

  // Refund Management
  static async createRefund(paymentIntentId: string, amount?: number) {
    const refundParams: any = {
      payment_intent: paymentIntentId,
    }

    if (amount) {
      refundParams.amount = Math.round(amount * 100) // Convert to cents
    }

    return await stripe.refunds.create(refundParams)
  }

  static async listRefunds(paymentIntentId: string) {
    return await stripe.refunds.list({
      payment_intent: paymentIntentId,
    })
  }
}