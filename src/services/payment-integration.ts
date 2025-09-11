import { PaymentService } from './payments'
import { paymentRetryService } from './payment-retry'
import Stripe from 'stripe'

/**
 * Payment Integration Service - Bridges PaymentService with PaymentRetryService
 * 
 * This service demonstrates how to integrate the intelligent retry system
 * with the existing payment processing infrastructure.
 */

interface PaymentRequest {
  userId: string
  amount: number
  currency: string
  paymentMethodId?: string
  customerId?: string
  description?: string
  metadata?: Record<string, string>
}

interface PaymentResult {
  success: boolean
  paymentIntentId?: string
  errorCode?: string
  errorMessage?: string
  shouldRetry?: boolean
}

export class PaymentIntegrationService {
  /**
   * Process payment with automatic retry handling
   */
  static async processPaymentWithRetry(
    transactionId: string,
    paymentRequest: PaymentRequest
  ): Promise<PaymentResult> {
    try {
      // Attempt initial payment
      const result = await this.attemptPayment(paymentRequest)
      
      if (result.success) {
        console.log(`Payment successful for transaction ${transactionId}`)
        return result
      }

      // Payment failed - determine if we should queue for retry
      if (result.errorCode && result.shouldRetry) {
        const retryQueued = await paymentRetryService.queueRetry(
          transactionId,
          {
            code: result.errorCode,
            message: result.errorMessage || 'Payment failed'
          },
          {
            userId: paymentRequest.userId,
            amount: paymentRequest.amount,
            currency: paymentRequest.currency,
            paymentIntentId: result.paymentIntentId
          }
        )

        if (retryQueued) {
          console.log(`Payment retry queued for transaction ${transactionId}`)
        }
      }

      return result

    } catch (error) {
      console.error(`Payment processing failed for transaction ${transactionId}:`, error)
      
      // Queue unknown errors for retry
      await paymentRetryService.queueRetry(
        transactionId,
        {
          code: 'unknown_error',
          message: error instanceof Error ? error.message : 'Unknown payment error'
        },
        {
          userId: paymentRequest.userId,
          amount: paymentRequest.amount,
          currency: paymentRequest.currency
        }
      )

      return {
        success: false,
        errorCode: 'unknown_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        shouldRetry: true
      }
    }
  }

  /**
   * Process a retry attempt (called by PaymentRetryService)
   */
  static async processRetryAttempt(
    transactionId: string,
    retryJob: any
  ): Promise<boolean> {
    try {
      console.log(`Processing retry attempt for transaction ${transactionId}`)

      const paymentRequest: PaymentRequest = {
        userId: retryJob.userId,
        amount: retryJob.amount,
        currency: retryJob.currency,
        description: `Retry attempt ${retryJob.attemptCount} for transaction ${transactionId}`
      }

      const result = await this.attemptPayment(paymentRequest)
      return result.success

    } catch (error) {
      console.error(`Retry attempt failed for transaction ${transactionId}:`, error)
      return false
    }
  }

  /**
   * Attempt payment using various payment methods
   */
  private static async attemptPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      // Create payment intent
      const paymentIntent = await PaymentService.createPaymentIntent(
        request.amount,
        request.currency
      )

      // Simulate different payment scenarios for testing
      const errorScenarios = this.simulatePaymentErrors()
      
      if (errorScenarios.shouldFail) {
        return {
          success: false,
          paymentIntentId: paymentIntent.id,
          errorCode: errorScenarios.errorCode,
          errorMessage: errorScenarios.errorMessage,
          shouldRetry: errorScenarios.shouldRetry
        }
      }

      // In a real implementation, you would:
      // 1. Confirm the payment intent with the payment method
      // 2. Handle 3D Secure authentication if required
      // 3. Process webhooks for async payment updates

      return {
        success: true,
        paymentIntentId: paymentIntent.id
      }

    } catch (error) {
      return this.handlePaymentError(error)
    }
  }

  /**
   * Handle and categorize payment errors
   */
  private static handlePaymentError(error: any): PaymentResult {
    // Handle Stripe errors
    if (error.type) {
      switch (error.type) {
        case 'StripeCardError':
          return {
            success: false,
            errorCode: this.mapStripeErrorCode(error.code),
            errorMessage: error.message,
            shouldRetry: this.shouldRetryStripeError(error.code)
          }

        case 'StripeRateLimitError':
          return {
            success: false,
            errorCode: 'rate_limit_exceeded',
            errorMessage: 'Too many requests',
            shouldRetry: true
          }

        case 'StripeConnectionError':
          return {
            success: false,
            errorCode: 'network_error',
            errorMessage: 'Network connection failed',
            shouldRetry: true
          }

        case 'StripeAPIError':
          return {
            success: false,
            errorCode: 'service_unavailable',
            errorMessage: 'Payment service temporarily unavailable',
            shouldRetry: true
          }

        case 'StripeAuthenticationError':
          return {
            success: false,
            errorCode: 'authentication_failed',
            errorMessage: 'Authentication with payment service failed',
            shouldRetry: true
          }

        default:
          return {
            success: false,
            errorCode: 'unknown_error',
            errorMessage: error.message || 'Unknown payment error',
            shouldRetry: true
          }
      }
    }

    // Handle other types of errors
    return {
      success: false,
      errorCode: 'unknown_error',
      errorMessage: error.message || 'Unknown error occurred',
      shouldRetry: true
    }
  }

  /**
   * Map Stripe error codes to our internal error codes
   */
  private static mapStripeErrorCode(stripeCode: string): string {
    const errorCodeMap: Record<string, string> = {
      'card_declined': 'card_declined',
      'insufficient_funds': 'insufficient_funds',
      'processing_error': 'processing_error',
      'expired_card': 'card_declined',
      'incorrect_cvc': 'card_declined',
      'incorrect_number': 'card_declined',
      'invalid_cvc': 'card_declined',
      'invalid_expiry_month': 'card_declined',
      'invalid_expiry_year': 'card_declined',
      'invalid_number': 'card_declined'
    }

    return errorCodeMap[stripeCode] || 'unknown_error'
  }

  /**
   * Determine if a Stripe error should be retried
   */
  private static shouldRetryStripeError(stripeCode: string): boolean {
    const nonRetriableErrors = [
      'card_declined',
      'expired_card',
      'incorrect_cvc',
      'incorrect_number',
      'invalid_cvc',
      'invalid_expiry_month',
      'invalid_expiry_year',
      'invalid_number'
    ]

    return !nonRetriableErrors.includes(stripeCode)
  }

  /**
   * Simulate different payment error scenarios for testing
   */
  private static simulatePaymentErrors() {
    // In production, remove this method
    const scenarios = [
      {
        shouldFail: false,
        errorCode: '',
        errorMessage: '',
        shouldRetry: false
      },
      {
        shouldFail: true,
        errorCode: 'network_error',
        errorMessage: 'Network timeout during payment processing',
        shouldRetry: true
      },
      {
        shouldFail: true,
        errorCode: 'processing_error',
        errorMessage: 'Payment processor temporarily unavailable',
        shouldRetry: true
      },
      {
        shouldFail: true,
        errorCode: 'card_declined',
        errorMessage: 'Your card was declined',
        shouldRetry: false
      },
      {
        shouldFail: true,
        errorCode: 'insufficient_funds',
        errorMessage: 'Your card has insufficient funds',
        shouldRetry: true
      }
    ]

    // Return random scenario (80% success rate)
    return Math.random() < 0.8 ? scenarios[0] : scenarios[Math.floor(Math.random() * (scenarios.length - 1)) + 1]
  }

  /**
   * Get payment and retry status for a transaction
   */
  static async getTransactionStatus(transactionId: string) {
    const retryStatus = await paymentRetryService.getRetryStatus(transactionId)
    
    return {
      transactionId,
      hasRetryPending: !!retryStatus,
      retryAttempts: retryStatus?.attemptCount || 0,
      maxRetryAttempts: retryStatus?.maxAttempts || 0,
      nextRetryAt: retryStatus?.nextRetryAt,
      lastError: retryStatus ? {
        code: retryStatus.errorCode,
        message: retryStatus.errorMessage
      } : null
    }
  }

  /**
   * Cancel payment retry for a transaction
   */
  static async cancelTransactionRetry(transactionId: string): Promise<boolean> {
    return await paymentRetryService.cancelRetry(transactionId)
  }

  /**
   * Get all retry jobs for a user
   */
  static async getUserPaymentRetries(userId: string) {
    const retryJobs = await paymentRetryService.getUserRetryJobs(userId)
    
    return retryJobs.map(job => ({
      transactionId: job.transactionId,
      amount: job.amount,
      currency: job.currency,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      nextRetryAt: job.nextRetryAt,
      errorCode: job.errorCode,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt
    }))
  }
}

// Set up event listeners for payment retry notifications
paymentRetryService.on('user_notification', (payload) => {
  // Here you can integrate with your notification system
  console.log(`Payment notification: ${payload.status} for user ${payload.userId}`)
  
  // Example integrations:
  // - Send push notification
  // - Send email
  // - Update real-time dashboard
  // - Log to analytics
})

paymentRetryService.on('retry_success', (job) => {
  console.log(`Payment retry succeeded for transaction ${job.transactionId}`)
  // Update database, send confirmation, etc.
})

paymentRetryService.on('retry_exhausted', (job) => {
  console.log(`Payment retry exhausted for transaction ${job.transactionId}`)
  // Handle failed payments, notify support team, etc.
})

export { paymentRetryService }