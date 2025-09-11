/**
 * Payment Retry System - Usage Examples
 * 
 * This file demonstrates various ways to use the intelligent payment retry system
 * in different scenarios and contexts.
 */

import { PaymentRetryService, paymentRetryService } from '../src/services/payment-retry'
import { PaymentIntegrationService } from '../src/services/payment-integration'

// Example 1: Basic retry setup with error handling
async function basicRetryExample() {
  console.log('=== Basic Retry Example ===')
  
  try {
    // Simulate a failed payment
    const transactionId = 'txn_' + Date.now()
    const error = {
      code: 'processing_error',
      message: 'Payment processor temporarily unavailable'
    }
    const metadata = {
      userId: 'user123',
      amount: 99.99,
      currency: 'USD',
      paymentIntentId: 'pi_test123'
    }

    // Queue retry
    const retryQueued = await paymentRetryService.queueRetry(
      transactionId,
      error,
      metadata
    )

    if (retryQueued) {
      console.log(`✅ Retry queued successfully for ${transactionId}`)
      
      // Check retry status
      const status = await paymentRetryService.getRetryStatus(transactionId)
      console.log('Retry Status:', {
        attemptCount: status?.attemptCount,
        maxAttempts: status?.maxAttempts,
        nextRetryAt: status?.nextRetryAt?.toISOString(),
        errorCode: status?.errorCode
      })
    }
    
  } catch (error) {
    console.error('Basic retry example failed:', error)
  }
}

// Example 2: Different error types and their retry behaviors
async function errorTypesExample() {
  console.log('\n=== Error Types Example ===')
  
  const errorTypes = [
    { code: 'card_declined', message: 'Card was declined by issuer' },
    { code: 'network_error', message: 'Network timeout occurred' },
    { code: 'insufficient_funds', message: 'Insufficient funds on card' },
    { code: 'processing_error', message: 'Payment processor error' },
    { code: 'rate_limit_exceeded', message: 'Too many requests' }
  ]

  for (const error of errorTypes) {
    const strategy = paymentRetryService.getRetryStrategy(error.code as any)
    console.log(`Error: ${error.code}`)
    console.log(`  Should Retry: ${strategy.shouldRetry}`)
    console.log(`  Max Attempts: ${strategy.maxAttempts}`)
    console.log(`  Delay: ${strategy.delayMs}ms`)
    console.log(`  Immediate: ${strategy.immediate || false}`)
    console.log('')
  }
}

// Example 3: Processing payments with automatic retry
async function paymentWithRetryExample() {
  console.log('\n=== Payment with Automatic Retry Example ===')
  
  const transactionId = 'auto_retry_' + Date.now()
  const paymentRequest = {
    userId: 'user456',
    amount: 149.99,
    currency: 'USD',
    description: 'Test payment with retry',
    metadata: { orderId: 'order123' }
  }

  try {
    const result = await PaymentIntegrationService.processPaymentWithRetry(
      transactionId,
      paymentRequest
    )

    console.log('Payment Result:', {
      success: result.success,
      errorCode: result.errorCode,
      shouldRetry: result.shouldRetry
    })

    if (!result.success) {
      // Check if retry was queued
      const retryStatus = await PaymentIntegrationService.getTransactionStatus(transactionId)
      console.log('Transaction Status:', retryStatus)
    }
    
  } catch (error) {
    console.error('Payment with retry example failed:', error)
  }
}

// Example 4: User notification handling
async function notificationExample() {
  console.log('\n=== Notification Example ===')
  
  // Set up notification listeners
  paymentRetryService.on('user_notification', (payload) => {
    console.log(`📱 User Notification:`)
    console.log(`   User: ${payload.userId}`)
    console.log(`   Status: ${payload.status}`)
    console.log(`   Message: ${payload.message}`)
    console.log(`   Attempt: ${payload.attemptCount}`)
    
    if (payload.nextRetryAt) {
      console.log(`   Next Retry: ${payload.nextRetryAt.toISOString()}`)
    }
  })

  // Queue a retry to trigger notification
  await paymentRetryService.queueRetry(
    'notification_test_' + Date.now(),
    { code: 'network_error', message: 'Connection timeout' },
    {
      userId: 'notification_user',
      amount: 25.00,
      currency: 'USD'
    }
  )
}

// Example 5: Queue processing and monitoring
async function queueProcessingExample() {
  console.log('\n=== Queue Processing Example ===')
  
  // Add multiple retries to queue
  const transactions = [
    { id: 'bulk_1', amount: 50, error: 'network_error' },
    { id: 'bulk_2', amount: 200, error: 'processing_error' },
    { id: 'bulk_3', amount: 10, error: 'insufficient_funds' }
  ]

  for (const txn of transactions) {
    await paymentRetryService.queueRetry(
      txn.id + '_' + Date.now(),
      { code: txn.error, message: `${txn.error} occurred` },
      {
        userId: 'bulk_user',
        amount: txn.amount,
        currency: 'USD'
      }
    )
  }

  console.log('Added transactions to queue')

  // Process queue manually
  await paymentRetryService.processRetryQueue()
  console.log('Queue processing completed')
}

// Example 6: User retry management
async function userRetryManagementExample() {
  console.log('\n=== User Retry Management Example ===')
  
  const userId = 'management_user'
  
  // Add several retries for a user
  for (let i = 1; i <= 3; i++) {
    await paymentRetryService.queueRetry(
      `user_txn_${i}_${Date.now()}`,
      { code: 'processing_error', message: 'Processing failed' },
      {
        userId,
        amount: i * 25,
        currency: 'USD'
      }
    )
  }

  // Get all retries for user
  const userRetries = await PaymentIntegrationService.getUserPaymentRetries(userId)
  console.log(`User ${userId} has ${userRetries.length} pending retries:`)
  
  userRetries.forEach((retry, index) => {
    console.log(`  ${index + 1}. Transaction ${retry.transactionId}`)
    console.log(`     Amount: ${retry.amount} ${retry.currency}`)
    console.log(`     Attempts: ${retry.attemptCount}/${retry.maxAttempts}`)
    console.log(`     Next Retry: ${retry.nextRetryAt?.toISOString()}`)
  })
}

// Example 7: Advanced scenarios with Redis
async function redisIntegrationExample() {
  console.log('\n=== Redis Integration Example ===')
  
  // This would use a real Redis client in production
  const mockRedisClient = {
    hset: async (key: string, field: string, value: string) => {
      console.log(`Redis HSET: ${key} ${field}`)
      return 1
    },
    hget: async (key: string, field: string) => {
      console.log(`Redis HGET: ${key} ${field}`)
      return null
    },
    hdel: async (key: string, field: string) => {
      console.log(`Redis HDEL: ${key} ${field}`)
      return 1
    },
    set: async (key: string, value: string, ...args: any[]) => {
      console.log(`Redis SET: ${key} with args:`, args)
      return 'OK'
    },
    del: async (key: string) => {
      console.log(`Redis DEL: ${key}`)
      return 1
    },
    quit: async () => console.log('Redis connection closed')
  }

  // Create service with Redis
  const redisRetryService = new PaymentRetryService(mockRedisClient)
  
  await redisRetryService.queueRetry(
    'redis_test_' + Date.now(),
    { code: 'processing_error', message: 'Redis test' },
    {
      userId: 'redis_user',
      amount: 100,
      currency: 'USD'
    }
  )

  console.log('Redis integration test completed')
  await redisRetryService.shutdown()
}

// Example 8: Error handling and edge cases
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===')
  
  // Test duplicate retry prevention
  const duplicateTransactionId = 'duplicate_test_' + Date.now()
  
  console.log('Testing duplicate retry prevention...')
  const result1 = await paymentRetryService.queueRetry(
    duplicateTransactionId,
    { code: 'network_error', message: 'First attempt' },
    { userId: 'test_user', amount: 50, currency: 'USD' }
  )
  
  const result2 = await paymentRetryService.queueRetry(
    duplicateTransactionId,
    { code: 'network_error', message: 'Second attempt' },
    { userId: 'test_user', amount: 50, currency: 'USD' }
  )
  
  console.log(`First queue: ${result1}, Second queue: ${result2}`)
  
  // Test cancellation
  console.log('Testing retry cancellation...')
  const cancelResult = await paymentRetryService.cancelRetry(duplicateTransactionId)
  console.log(`Cancellation result: ${cancelResult}`)
  
  // Test non-existent transaction
  const nonExistentResult = await paymentRetryService.getRetryStatus('non_existent_txn')
  console.log(`Non-existent transaction status: ${nonExistentResult}`)
}

// Main execution function
async function runExamples() {
  console.log('🚀 Payment Retry System - Usage Examples\n')
  
  try {
    await basicRetryExample()
    await errorTypesExample()
    await paymentWithRetryExample()
    await notificationExample()
    await queueProcessingExample()
    await userRetryManagementExample()
    await redisIntegrationExample()
    await errorHandlingExample()
    
    console.log('\n✅ All examples completed successfully!')
    
  } catch (error) {
    console.error('❌ Example execution failed:', error)
  } finally {
    // Clean up
    await paymentRetryService.shutdown()
  }
}

// Export for use in other files
export {
  basicRetryExample,
  errorTypesExample,
  paymentWithRetryExample,
  notificationExample,
  queueProcessingExample,
  userRetryManagementExample,
  redisIntegrationExample,
  errorHandlingExample,
  runExamples
}

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples()
}