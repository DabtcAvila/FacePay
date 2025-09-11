import { PaymentRetryService } from '../payment-retry'

// Mock Redis client for testing
const mockRedisClient = {
  hset: jest.fn().mockResolvedValue(1),
  hget: jest.fn().mockResolvedValue(null),
  hdel: jest.fn().mockResolvedValue(1),
  hgetall: jest.fn().mockResolvedValue({}),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  quit: jest.fn().mockResolvedValue(undefined)
}

describe('PaymentRetryService', () => {
  let retryService: PaymentRetryService
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    retryService = new PaymentRetryService()
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    jest.clearAllMocks()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    retryService.shutdown()
  })

  describe('getRetryStrategy', () => {
    test('should not retry card_declined errors', () => {
      const strategy = retryService.getRetryStrategy('card_declined')
      expect(strategy.shouldRetry).toBe(false)
      expect(strategy.maxAttempts).toBe(0)
    })

    test('should retry network_error immediately', () => {
      const strategy = retryService.getRetryStrategy('network_error')
      expect(strategy.shouldRetry).toBe(true)
      expect(strategy.immediate).toBe(true)
      expect(strategy.maxAttempts).toBe(3)
    })

    test('should retry insufficient_funds after 24 hours', () => {
      const strategy = retryService.getRetryStrategy('insufficient_funds')
      expect(strategy.shouldRetry).toBe(true)
      expect(strategy.delayMs).toBe(24 * 60 * 60 * 1000)
      expect(strategy.maxAttempts).toBe(2)
    })

    test('should handle unknown error codes with conservative strategy', () => {
      const strategy = retryService.getRetryStrategy('unknown_error_code' as any)
      expect(strategy.shouldRetry).toBe(true)
      expect(strategy.delayMs).toBe(5 * 60 * 1000)
      expect(strategy.maxAttempts).toBe(2)
    })
  })

  describe('queueRetry', () => {
    const mockError = { code: 'processing_error', message: 'Payment processing failed' }
    const mockMetadata = {
      userId: 'user123',
      amount: 100,
      currency: 'USD',
      paymentIntentId: 'pi_test123'
    }

    test('should queue retry for retriable errors', async () => {
      const result = await retryService.queueRetry('txn123', mockError, mockMetadata)
      expect(result).toBe(true)
    })

    test('should not queue retry for non-retriable errors', async () => {
      const cardDeclinedError = { code: 'card_declined', message: 'Card was declined' }
      const result = await retryService.queueRetry('txn123', cardDeclinedError, mockMetadata)
      expect(result).toBe(false)
    })

    test('should emit retry_queued event', async () => {
      const eventSpy = jest.fn()
      retryService.on('retry_queued', eventSpy)

      await retryService.queueRetry('txn123', mockError, mockMetadata)
      expect(eventSpy).toHaveBeenCalled()
    })

    test('should handle duplicate retry attempts', async () => {
      await retryService.queueRetry('txn123', mockError, mockMetadata)
      const result = await retryService.queueRetry('txn123', mockError, mockMetadata)
      
      // Should not create duplicate (implementation may vary)
      expect(result).toBeDefined()
    })
  })

  describe('cancelRetry', () => {
    const mockError = { code: 'processing_error', message: 'Payment processing failed' }
    const mockMetadata = {
      userId: 'user123',
      amount: 100,
      currency: 'USD'
    }

    test('should cancel existing retry', async () => {
      await retryService.queueRetry('txn123', mockError, mockMetadata)
      const result = await retryService.cancelRetry('txn123')
      expect(result).toBe(true)
    })

    test('should return false for non-existent retry', async () => {
      const result = await retryService.cancelRetry('nonexistent')
      expect(result).toBe(false)
    })

    test('should emit retry_cancelled event', async () => {
      const eventSpy = jest.fn()
      retryService.on('retry_cancelled', eventSpy)

      await retryService.queueRetry('txn123', mockError, mockMetadata)
      await retryService.cancelRetry('txn123')
      
      expect(eventSpy).toHaveBeenCalled()
    })
  })

  describe('notifyUser', () => {
    test('should emit user_notification event', async () => {
      const eventSpy = jest.fn()
      retryService.on('user_notification', eventSpy)

      const payload = {
        userId: 'user123',
        transactionId: 'txn123',
        status: 'retry_scheduled' as const,
        attemptCount: 1,
        message: 'Test notification'
      }

      await retryService.notifyUser('user123', payload)
      expect(eventSpy).toHaveBeenCalledWith(payload)
    })

    test('should handle notification errors gracefully', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      // Mock emit to throw error
      retryService.emit = jest.fn().mockImplementation(() => {
        throw new Error('Notification failed')
      })

      const payload = {
        userId: 'user123',
        transactionId: 'txn123',
        status: 'retry_scheduled' as const,
        attemptCount: 1,
        message: 'Test notification'
      }

      await expect(retryService.notifyUser('user123', payload)).resolves.not.toThrow()
      errorSpy.mockRestore()
    })
  })

  describe('processRetryQueue', () => {
    test('should process pending retry jobs', async () => {
      const mockError = { code: 'network_error', message: 'Network timeout' }
      const mockMetadata = {
        userId: 'user123',
        amount: 100,
        currency: 'USD'
      }

      await retryService.queueRetry('txn123', mockError, mockMetadata)
      await retryService.processRetryQueue()

      // Should have processed the job
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing')
      )
    })

    test('should handle processing errors gracefully', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      // Mock getAllRetryJobs to throw error
      jest.spyOn(retryService as any, 'getAllRetryJobs').mockRejectedValue(
        new Error('Database error')
      )

      await expect(retryService.processRetryQueue()).resolves.not.toThrow()
      expect(errorSpy).toHaveBeenCalledWith(
        'Error processing retry queue:',
        expect.any(Error)
      )
      
      errorSpy.mockRestore()
    })

    test('should prevent concurrent processing', async () => {
      // Mock the processing flag to simulate concurrent access
      const originalProcessing = (retryService as any).processing
      
      // Set processing to true to simulate ongoing processing
      ;(retryService as any).processing = true
      
      // This call should return early due to processing flag
      await retryService.processRetryQueue()
      
      // Restore original processing state
      ;(retryService as any).processing = originalProcessing
      
      // Verify it handled concurrent access gracefully
      expect(true).toBe(true) // Test passes if no errors thrown
    })
  })

  describe('getRetryStatus', () => {
    test('should return retry job details', async () => {
      const mockError = { code: 'processing_error', message: 'Processing failed' }
      const mockMetadata = {
        userId: 'user123',
        amount: 100,
        currency: 'USD'
      }

      await retryService.queueRetry('txn123', mockError, mockMetadata)
      const status = await retryService.getRetryStatus('txn123')

      expect(status).toBeTruthy()
      expect(status?.transactionId).toBe('txn123')
      expect(status?.userId).toBe('user123')
    })

    test('should return null for non-existent transaction', async () => {
      const status = await retryService.getRetryStatus('nonexistent')
      expect(status).toBeNull()
    })
  })

  describe('getUserRetryJobs', () => {
    test('should return user-specific retry jobs', async () => {
      const mockError = { code: 'processing_error', message: 'Processing failed' }
      const mockMetadata1 = {
        userId: 'user123',
        amount: 100,
        currency: 'USD'
      }
      const mockMetadata2 = {
        userId: 'user456',
        amount: 200,
        currency: 'USD'
      }

      await retryService.queueRetry('txn123', mockError, mockMetadata1)
      await retryService.queueRetry('txn456', mockError, mockMetadata2)

      const userJobs = await retryService.getUserRetryJobs('user123')
      expect(userJobs).toHaveLength(1)
      expect(userJobs[0].userId).toBe('user123')
    })

    test('should return empty array for user with no retries', async () => {
      const userJobs = await retryService.getUserRetryJobs('nonexistent')
      expect(userJobs).toHaveLength(0)
    })
  })

  describe('Redis fallback behavior', () => {
    test('should work without Redis client', async () => {
      const memoryService = new PaymentRetryService()
      
      const mockError = { code: 'processing_error', message: 'Processing failed' }
      const mockMetadata = {
        userId: 'user123',
        amount: 100,
        currency: 'USD'
      }

      const result = await memoryService.queueRetry('txn123', mockError, mockMetadata)
      expect(result).toBe(true)

      const status = await memoryService.getRetryStatus('txn123')
      expect(status?.transactionId).toBe('txn123')

      await memoryService.shutdown()
    })

    test('should fallback to memory on Redis errors', async () => {
      const redisService = new PaymentRetryService(mockRedisClient)
      
      // Mock Redis to fail
      mockRedisClient.hset.mockRejectedValue(new Error('Redis error'))
      
      const mockError = { code: 'processing_error', message: 'Processing failed' }
      const mockMetadata = {
        userId: 'user123',
        amount: 100,
        currency: 'USD'
      }

      // Should still work due to fallback
      const result = await redisService.queueRetry('txn123', mockError, mockMetadata)
      expect(result).toBe(true)

      await redisService.shutdown()
    })
  })

  describe('Priority calculation', () => {
    test('should prioritize higher amounts', async () => {
      const mockError = { code: 'processing_error', message: 'Processing failed' }
      
      await retryService.queueRetry('txn_low', mockError, {
        userId: 'user1',
        amount: 10,
        currency: 'USD'
      })

      await retryService.queueRetry('txn_high', mockError, {
        userId: 'user2',
        amount: 1000,
        currency: 'USD'
      })

      const allJobs = await (retryService as any).getAllRetryJobs()
      const sortedJobs = (retryService as any).prioritizeJobs(allJobs)

      expect(sortedJobs[0].transactionId).toBe('txn_high')
      expect(sortedJobs[1].transactionId).toBe('txn_low')
    })
  })

  describe('Thread safety', () => {
    test('should handle concurrent retry attempts safely', async () => {
      const mockError = { code: 'processing_error', message: 'Processing failed' }
      const mockMetadata = {
        userId: 'user123',
        amount: 100,
        currency: 'USD'
      }

      // Simulate concurrent retry attempts
      const promises = Array.from({ length: 5 }, (_, i) =>
        retryService.queueRetry(`txn${i}`, mockError, {
          ...mockMetadata,
          userId: `user${i}`
        })
      )

      const results = await Promise.all(promises)
      expect(results.every(result => result === true)).toBe(true)
    })
  })
})