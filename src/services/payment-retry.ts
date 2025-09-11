import { EventEmitter } from 'events'

/**
 * Payment Retry Service - Intelligent retry system for failed payments
 * 
 * Features:
 * - Exponential backoff strategies
 * - Error-specific retry logic
 * - Queue prioritization by amount
 * - Thread-safe operations with Redis fallback to memory
 * - User notifications
 */

interface RetryJob {
  id: string
  transactionId: string
  userId: string
  amount: number
  currency: string
  errorCode: string
  errorMessage: string
  attemptCount: number
  maxAttempts: number
  nextRetryAt: Date
  createdAt: Date
  priority: number
  metadata?: Record<string, any>
}

interface RetryStrategy {
  shouldRetry: boolean
  delayMs: number
  maxAttempts: number
  immediate?: boolean
}

interface NotificationPayload {
  userId: string
  transactionId: string
  status: 'retry_scheduled' | 'retry_failed' | 'max_attempts_reached' | 'retry_success'
  attemptCount: number
  nextRetryAt?: Date
  message: string
}

type ErrorCode = 
  | 'card_declined' 
  | 'insufficient_funds' 
  | 'network_error' 
  | 'processing_error'
  | 'authentication_failed'
  | 'rate_limit_exceeded'
  | 'service_unavailable'
  | 'unknown_error'

export class PaymentRetryService extends EventEmitter {
  private retryJobs = new Map<string, RetryJob>()
  private processing = false
  private processingInterval: NodeJS.Timeout | null = null
  private lockKeys = new Set<string>()
  
  // Redis client placeholder - falls back to memory if not available
  private redisClient: any = null
  
  // Configuration
  private readonly DEFAULT_MAX_ATTEMPTS = 3
  private readonly QUEUE_PROCESSING_INTERVAL = 30000 // 30 seconds
  private readonly LOCK_TIMEOUT = 300000 // 5 minutes
  
  constructor(redisClient?: any) {
    super()
    this.redisClient = redisClient
    this.startQueueProcessor()
  }

  /**
   * Queue a payment for retry with intelligent strategy selection
   */
  async queueRetry(
    transactionId: string, 
    error: { code: string; message: string },
    metadata: {
      userId: string
      amount: number
      currency: string
      paymentIntentId?: string
    }
  ): Promise<boolean> {
    const lockKey = `retry:${transactionId}`
    
    try {
      // Acquire lock to prevent duplicate processing
      if (!await this.acquireLock(lockKey)) {
        console.warn(`Retry already queued for transaction ${transactionId}`)
        return false
      }

      const strategy = this.getRetryStrategy(error.code as ErrorCode)
      
      if (!strategy.shouldRetry) {
        await this.notifyUser(metadata.userId, {
          userId: metadata.userId,
          transactionId,
          status: 'retry_failed',
          attemptCount: 0,
          message: `Payment cannot be retried due to error: ${error.code}`
        })
        return false
      }

      // Check if retry job already exists
      const existingJob = await this.getRetryJob(transactionId)
      if (existingJob && existingJob.attemptCount >= strategy.maxAttempts) {
        await this.notifyUser(metadata.userId, {
          userId: metadata.userId,
          transactionId,
          status: 'max_attempts_reached',
          attemptCount: existingJob.attemptCount,
          message: `Maximum retry attempts (${strategy.maxAttempts}) reached for transaction`
        })
        return false
      }

      const attemptCount = existingJob ? existingJob.attemptCount + 1 : 1
      const nextRetryAt = strategy.immediate ? 
        new Date() : 
        new Date(Date.now() + strategy.delayMs)

      const retryJob: RetryJob = {
        id: existingJob?.id || `retry_${transactionId}_${Date.now()}`,
        transactionId,
        userId: metadata.userId,
        amount: metadata.amount,
        currency: metadata.currency,
        errorCode: error.code,
        errorMessage: error.message,
        attemptCount,
        maxAttempts: strategy.maxAttempts,
        nextRetryAt,
        createdAt: existingJob?.createdAt || new Date(),
        priority: this.calculatePriority(metadata.amount, attemptCount),
        metadata: {
          paymentIntentId: metadata.paymentIntentId,
          originalError: error
        }
      }

      await this.saveRetryJob(retryJob)
      
      // Notify user about retry scheduling
      await this.notifyUser(metadata.userId, {
        userId: metadata.userId,
        transactionId,
        status: 'retry_scheduled',
        attemptCount,
        nextRetryAt,
        message: `Payment retry scheduled for ${nextRetryAt.toLocaleString()}`
      })

      this.emit('retry_queued', retryJob)
      console.log(`Retry queued for transaction ${transactionId}, attempt ${attemptCount}/${strategy.maxAttempts}`)
      
      return true
      
    } finally {
      await this.releaseLock(lockKey)
    }
  }

  /**
   * Process the retry queue - called periodically
   */
  async processRetryQueue(): Promise<void> {
    if (this.processing) {
      return
    }

    this.processing = true
    
    try {
      const pendingJobs = await this.getPendingRetryJobs()
      const sortedJobs = this.prioritizeJobs(pendingJobs)
      
      console.log(`Processing ${sortedJobs.length} pending retry jobs`)
      
      for (const job of sortedJobs) {
        if (new Date() >= job.nextRetryAt) {
          await this.processRetryJob(job)
        }
      }
      
    } catch (error) {
      console.error('Error processing retry queue:', error)
      this.emit('queue_error', error)
    } finally {
      this.processing = false
    }
  }

  /**
   * Get retry strategy based on error code
   */
  getRetryStrategy(errorCode: ErrorCode): RetryStrategy {
    const strategies: Record<ErrorCode, RetryStrategy> = {
      // Never retry - permanent failures
      card_declined: {
        shouldRetry: false,
        delayMs: 0,
        maxAttempts: 0
      },
      
      // Retry immediately - temporary network issues
      network_error: {
        shouldRetry: true,
        delayMs: 0,
        maxAttempts: 3,
        immediate: true
      },
      
      // Retry after 24 hours - user might add funds
      insufficient_funds: {
        shouldRetry: true,
        delayMs: 24 * 60 * 60 * 1000, // 24 hours
        maxAttempts: 2
      },
      
      // Exponential backoff for processing errors
      processing_error: {
        shouldRetry: true,
        delayMs: 60 * 1000, // Start with 1 minute
        maxAttempts: 3
      },
      
      // Auth issues - retry with backoff
      authentication_failed: {
        shouldRetry: true,
        delayMs: 5 * 60 * 1000, // 5 minutes
        maxAttempts: 2
      },
      
      // Rate limiting - retry after backoff
      rate_limit_exceeded: {
        shouldRetry: true,
        delayMs: 30 * 60 * 1000, // 30 minutes
        maxAttempts: 3
      },
      
      // Service issues - exponential backoff
      service_unavailable: {
        shouldRetry: true,
        delayMs: 60 * 1000, // 1 minute
        maxAttempts: 3
      },
      
      // Unknown errors - conservative retry
      unknown_error: {
        shouldRetry: true,
        delayMs: 5 * 60 * 1000, // 5 minutes
        maxAttempts: 2
      }
    }
    
    const strategy = strategies[errorCode]
    if (!strategy) {
      return strategies.unknown_error
    }
    
    return strategy
  }

  /**
   * Cancel a retry for a specific transaction
   */
  async cancelRetry(transactionId: string): Promise<boolean> {
    const lockKey = `retry:${transactionId}`
    
    try {
      if (!await this.acquireLock(lockKey)) {
        return false
      }

      const job = await this.getRetryJob(transactionId)
      if (!job) {
        return false
      }

      await this.deleteRetryJob(transactionId)
      
      await this.notifyUser(job.userId, {
        userId: job.userId,
        transactionId,
        status: 'retry_failed',
        attemptCount: job.attemptCount,
        message: 'Payment retry cancelled'
      })
      
      this.emit('retry_cancelled', job)
      console.log(`Retry cancelled for transaction ${transactionId}`)
      
      return true
      
    } finally {
      await this.releaseLock(lockKey)
    }
  }

  /**
   * Send notification to user about retry status
   */
  async notifyUser(userId: string, payload: NotificationPayload): Promise<void> {
    try {
      // Emit event for notification service to pick up
      this.emit('user_notification', payload)
      
      // Log notification
      console.log(`Notification sent to user ${userId}: ${payload.status} - ${payload.message}`)
      
      // Here you could integrate with:
      // - Push notification service
      // - Email service
      // - SMS service
      // - WebSocket for real-time updates
      
    } catch (error) {
      console.error(`Failed to notify user ${userId}:`, error)
    }
  }

  /**
   * Get retry job status and details
   */
  async getRetryStatus(transactionId: string): Promise<RetryJob | null> {
    return await this.getRetryJob(transactionId)
  }

  /**
   * Get all active retry jobs for a user
   */
  async getUserRetryJobs(userId: string): Promise<RetryJob[]> {
    const allJobs = await this.getAllRetryJobs()
    return allJobs.filter(job => job.userId === userId)
  }

  // Private helper methods

  private async processRetryJob(job: RetryJob): Promise<void> {
    const lockKey = `processing:${job.transactionId}`
    
    try {
      if (!await this.acquireLock(lockKey)) {
        return
      }

      console.log(`Processing retry for transaction ${job.transactionId}, attempt ${job.attemptCount}`)
      
      // Here you would integrate with your payment service
      // For now, we'll simulate the retry logic
      const success = await this.attemptPaymentRetry(job)
      
      if (success) {
        await this.deleteRetryJob(job.transactionId)
        
        await this.notifyUser(job.userId, {
          userId: job.userId,
          transactionId: job.transactionId,
          status: 'retry_success',
          attemptCount: job.attemptCount,
          message: 'Payment retry successful'
        })
        
        this.emit('retry_success', job)
        
      } else if (job.attemptCount >= job.maxAttempts) {
        await this.deleteRetryJob(job.transactionId)
        
        await this.notifyUser(job.userId, {
          userId: job.userId,
          transactionId: job.transactionId,
          status: 'max_attempts_reached',
          attemptCount: job.attemptCount,
          message: `Payment retry failed after ${job.maxAttempts} attempts`
        })
        
        this.emit('retry_exhausted', job)
        
      } else {
        // Schedule next retry with exponential backoff
        const strategy = this.getRetryStrategy(job.errorCode as ErrorCode)
        const backoffMultiplier = Math.pow(2, job.attemptCount - 1)
        const nextDelayMs = strategy.delayMs * backoffMultiplier
        
        job.nextRetryAt = new Date(Date.now() + nextDelayMs)
        job.attemptCount++
        
        await this.saveRetryJob(job)
        
        await this.notifyUser(job.userId, {
          userId: job.userId,
          transactionId: job.transactionId,
          status: 'retry_scheduled',
          attemptCount: job.attemptCount,
          nextRetryAt: job.nextRetryAt,
          message: `Payment retry rescheduled for ${job.nextRetryAt.toLocaleString()}`
        })
      }
      
    } finally {
      await this.releaseLock(lockKey)
    }
  }

  private async attemptPaymentRetry(job: RetryJob): Promise<boolean> {
    try {
      // This is where you would integrate with your actual payment service
      // For example, using the PaymentService from payments.ts
      
      // Simulate payment retry logic
      const PaymentService = (await import('./payments')).PaymentService
      
      if (job.metadata?.paymentIntentId) {
        // For Stripe payments, you might confirm the payment intent again
        // const result = await stripe.paymentIntents.confirm(job.metadata.paymentIntentId)
        // return result.status === 'succeeded'
      }
      
      // For now, simulate success/failure
      const successRate = job.errorCode === 'network_error' ? 0.8 : 0.3
      return Math.random() < successRate
      
    } catch (error) {
      console.error(`Payment retry failed for transaction ${job.transactionId}:`, error)
      return false
    }
  }

  private calculatePriority(amount: number, attemptCount: number): number {
    // Higher amounts get higher priority
    // Earlier attempts get higher priority
    return Math.floor(amount * 100) - (attemptCount * 1000)
  }

  private prioritizeJobs(jobs: RetryJob[]): RetryJob[] {
    return jobs.sort((a, b) => b.priority - a.priority)
  }

  private async getPendingRetryJobs(): Promise<RetryJob[]> {
    const allJobs = await this.getAllRetryJobs()
    return allJobs.filter(job => job.attemptCount < job.maxAttempts)
  }

  private startQueueProcessor(): void {
    this.processingInterval = setInterval(
      () => this.processRetryQueue(),
      this.QUEUE_PROCESSING_INTERVAL
    )
  }

  private stopQueueProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
  }

  // Storage methods with Redis fallback to memory

  private async saveRetryJob(job: RetryJob): Promise<void> {
    try {
      if (this.redisClient) {
        await this.redisClient.hset(
          'payment_retries',
          job.transactionId,
          JSON.stringify(job)
        )
      } else {
        this.retryJobs.set(job.transactionId, job)
      }
    } catch (error) {
      console.error('Failed to save retry job:', error)
      // Fallback to memory
      this.retryJobs.set(job.transactionId, job)
    }
  }

  private async getRetryJob(transactionId: string): Promise<RetryJob | null> {
    try {
      if (this.redisClient) {
        const data = await this.redisClient.hget('payment_retries', transactionId)
        return data ? JSON.parse(data) : null
      } else {
        return this.retryJobs.get(transactionId) || null
      }
    } catch (error) {
      console.error('Failed to get retry job:', error)
      return this.retryJobs.get(transactionId) || null
    }
  }

  private async deleteRetryJob(transactionId: string): Promise<void> {
    try {
      if (this.redisClient) {
        await this.redisClient.hdel('payment_retries', transactionId)
      }
      this.retryJobs.delete(transactionId)
    } catch (error) {
      console.error('Failed to delete retry job:', error)
      this.retryJobs.delete(transactionId)
    }
  }

  private async getAllRetryJobs(): Promise<RetryJob[]> {
    try {
      if (this.redisClient) {
        const data = await this.redisClient.hgetall('payment_retries')
        return Object.values(data).map((job: string) => JSON.parse(job))
      } else {
        return Array.from(this.retryJobs.values())
      }
    } catch (error) {
      console.error('Failed to get all retry jobs:', error)
      return Array.from(this.retryJobs.values())
    }
  }

  private async acquireLock(lockKey: string): Promise<boolean> {
    try {
      if (this.redisClient) {
        const result = await this.redisClient.set(
          lockKey,
          'locked',
          'PX',
          this.LOCK_TIMEOUT,
          'NX'
        )
        return result === 'OK'
      } else {
        // Memory-based locking
        if (this.lockKeys.has(lockKey)) {
          return false
        }
        this.lockKeys.add(lockKey)
        
        // Auto-release lock after timeout
        setTimeout(() => {
          this.lockKeys.delete(lockKey)
        }, this.LOCK_TIMEOUT)
        
        return true
      }
    } catch (error) {
      console.error('Failed to acquire lock:', error)
      return false
    }
  }

  private async releaseLock(lockKey: string): Promise<void> {
    try {
      if (this.redisClient) {
        await this.redisClient.del(lockKey)
      } else {
        this.lockKeys.delete(lockKey)
      }
    } catch (error) {
      console.error('Failed to release lock:', error)
      this.lockKeys.delete(lockKey)
    }
  }

  // Cleanup method
  async shutdown(): Promise<void> {
    this.stopQueueProcessor()
    
    if (this.redisClient) {
      try {
        await this.redisClient.quit()
      } catch (error) {
        console.error('Error closing Redis connection:', error)
      }
    }
    
    this.removeAllListeners()
    console.log('PaymentRetryService shutdown completed')
  }
}

// Export singleton instance
export const paymentRetryService = new PaymentRetryService()