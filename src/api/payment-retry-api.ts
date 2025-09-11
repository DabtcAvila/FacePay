import express from 'express'
import { paymentRetryService } from '../services/payment-retry'
import { PaymentIntegrationService } from '../services/payment-integration'

const router = express.Router()

/**
 * Payment Retry API Endpoints
 * 
 * These endpoints demonstrate how to integrate the payment retry system
 * into your API layer for real-world usage.
 */

/**
 * POST /api/payments/retry/:transactionId
 * Manual retry trigger for a specific transaction
 */
router.post('/retry/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params
    const { error, metadata } = req.body

    if (!error || !metadata) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: error, metadata'
      })
    }

    const result = await paymentRetryService.queueRetry(
      transactionId,
      error,
      metadata
    )

    if (result) {
      res.json({
        success: true,
        message: `Retry queued for transaction ${transactionId}`,
        transactionId
      })
    } else {
      res.status(400).json({
        success: false,
        message: `Failed to queue retry for transaction ${transactionId}`
      })
    }

  } catch (error) {
    console.error('Error queuing payment retry:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * DELETE /api/payments/retry/:transactionId
 * Cancel retry for a specific transaction
 */
router.delete('/retry/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params

    const result = await paymentRetryService.cancelRetry(transactionId)

    if (result) {
      res.json({
        success: true,
        message: `Retry cancelled for transaction ${transactionId}`
      })
    } else {
      res.status(404).json({
        success: false,
        message: `No retry found for transaction ${transactionId}`
      })
    }

  } catch (error) {
    console.error('Error cancelling payment retry:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * GET /api/payments/retry/:transactionId
 * Get retry status for a specific transaction
 */
router.get('/retry/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params

    const status = await PaymentIntegrationService.getTransactionStatus(transactionId)

    res.json({
      success: true,
      data: status
    })

  } catch (error) {
    console.error('Error getting retry status:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * GET /api/payments/retry/user/:userId
 * Get all retry jobs for a user
 */
router.get('/retry/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    const retries = await PaymentIntegrationService.getUserPaymentRetries(userId)

    res.json({
      success: true,
      data: {
        userId,
        retries,
        totalRetries: retries.length
      }
    })

  } catch (error) {
    console.error('Error getting user retries:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * POST /api/payments/process
 * Process payment with automatic retry handling
 */
router.post('/process', async (req, res) => {
  try {
    const { transactionId, paymentRequest } = req.body

    if (!transactionId || !paymentRequest) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: transactionId, paymentRequest'
      })
    }

    const result = await PaymentIntegrationService.processPaymentWithRetry(
      transactionId,
      paymentRequest
    )

    if (result.success) {
      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          transactionId,
          paymentIntentId: result.paymentIntentId
        }
      })
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment failed',
        data: {
          transactionId,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          willRetry: result.shouldRetry
        }
      })
    }

  } catch (error) {
    console.error('Error processing payment:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * POST /api/payments/retry/process-queue
 * Manually trigger retry queue processing (admin endpoint)
 */
router.post('/retry/process-queue', async (req, res) => {
  try {
    // This should be protected with admin authentication
    await paymentRetryService.processRetryQueue()

    res.json({
      success: true,
      message: 'Retry queue processing triggered'
    })

  } catch (error) {
    console.error('Error processing retry queue:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * GET /api/payments/retry/stats
 * Get retry system statistics (admin endpoint)
 */
router.get('/retry/stats', async (req, res) => {
  try {
    // Get all jobs from memory/Redis
    const allJobs = await (paymentRetryService as any).getAllRetryJobs()
    
    const stats = {
      totalJobs: allJobs.length,
      pendingJobs: allJobs.filter((job: any) => job.attemptCount < job.maxAttempts).length,
      exhaustedJobs: allJobs.filter((job: any) => job.attemptCount >= job.maxAttempts).length,
      jobsByErrorCode: allJobs.reduce((acc: any, job: any) => {
        acc[job.errorCode] = (acc[job.errorCode] || 0) + 1
        return acc
      }, {}),
      jobsByAttemptCount: allJobs.reduce((acc: any, job: any) => {
        acc[job.attemptCount] = (acc[job.attemptCount] || 0) + 1
        return acc
      }, {}),
      totalAmount: allJobs.reduce((sum: number, job: any) => sum + job.amount, 0)
    }

    res.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Error getting retry stats:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * WebSocket endpoint for real-time retry notifications
 * This would integrate with your WebSocket server
 */
export const setupRetryWebSocket = (io: any) => {
  // Listen for retry events and broadcast to relevant users
  paymentRetryService.on('user_notification', (payload) => {
    io.to(`user:${payload.userId}`).emit('payment_retry_notification', payload)
  })

  paymentRetryService.on('retry_success', (job) => {
    io.to(`user:${job.userId}`).emit('payment_success', {
      transactionId: job.transactionId,
      message: 'Your payment has been processed successfully'
    })
  })

  paymentRetryService.on('retry_exhausted', (job) => {
    io.to(`user:${job.userId}`).emit('payment_failed', {
      transactionId: job.transactionId,
      message: 'Your payment could not be processed after multiple attempts'
    })
  })
}

export default router