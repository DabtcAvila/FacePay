import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

// Database query optimization utilities

// Connection pooling configuration for serverless environments
export const CONNECTION_POOL_CONFIG = {
  maxConnections: 10,
  connectionTimeout: 10000, // 10 seconds
  poolTimeout: 10000, // 10 seconds
  idleTimeout: 300000, // 5 minutes
}

// Query optimization helpers
export class QueryOptimizer {
  // Cached query results with TTL
  private static cache = new Map<string, { data: any; expiry: number }>()
  private static readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

  static getCached<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }

  static setCache<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    })
  }

  static clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  // Execute query with caching
  static async cachedQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = this.getCached<T>(key)
    if (cached) return cached

    const result = await queryFn()
    this.setCache(key, result, ttl)
    return result
  }

  // Batch queries to reduce round trips
  static async batchQueries<T>(queries: (() => Promise<T>)[]): Promise<T[]> {
    return Promise.all(queries.map(query => query()))
  }

  // Transaction with retry logic
  static async executeTransaction<T>(
    operations: Prisma.PrismaPromise<any>[],
    maxRetries = 3
  ): Promise<T[]> {
    let retries = 0
    
    while (retries < maxRetries) {
      try {
        return await prisma.$transaction(operations, {
          timeout: 15000, // 15 second timeout
          maxWait: 5000,  // 5 second max wait
        })
      } catch (error) {
        retries++
        
        if (retries >= maxRetries) {
          throw error
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000))
      }
    }
    
    throw new Error('Transaction failed after maximum retries')
  }
}

// Optimized user queries
export class UserQueries {
  static async findUserWithCache(id: string) {
    return QueryOptimizer.cachedQuery(
      `user:${id}`,
      () => prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          // Don't select sensitive fields unless needed
        }
      }),
      2 * 60 * 1000 // 2 minutes TTL for user data
    )
  }

  static async getUserProfile(userId: string) {
    return QueryOptimizer.cachedQuery(
      `profile:${userId}`,
      () => prisma.user.findUnique({
        where: { id: userId },
        include: {
          accounts: {
            select: {
              provider: true,
              providerAccountId: true,
                }
          },
          // Include other related data efficiently
        }
      }),
      5 * 60 * 1000 // 5 minutes TTL
    )
  }

  static async updateUserLastActive(userId: string) {
    // Use upsert for better performance
    await prisma.user.update({
      where: { id: userId },
      data: { 
        updatedAt: new Date(),
        // Add last_active field if it exists
      }
    })
    
    // Clear cache for this user
    QueryOptimizer.clearCache(`user:${userId}`)
    QueryOptimizer.clearCache(`profile:${userId}`)
  }
}

// Optimized payment/transaction queries
export class PaymentQueries {
  static async getUserTransactions(userId: string, limit = 20, offset = 0) {
    return QueryOptimizer.cachedQuery(
      `transactions:${userId}:${limit}:${offset}`,
      () => prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          description: true,
          createdAt: true,
          // Don't select sensitive payment data
        }
      }),
      2 * 60 * 1000 // 2 minutes TTL
    )
  }

  static async getTransactionStats(userId: string) {
    return QueryOptimizer.cachedQuery(
      `transaction-stats:${userId}`,
      () => prisma.transaction.aggregate({
        where: { userId },
        _count: true,
        _sum: { amount: true },
        _avg: { amount: true },
      }),
      10 * 60 * 1000 // 10 minutes TTL
    )
  }

  static async createTransactionWithRetry(data: Prisma.TransactionCreateInput) {
    return QueryOptimizer.executeTransaction([
      prisma.transaction.create({ data }),
      // Add any related operations
    ])
  }
}

// Optimized analytics queries
export class AnalyticsQueries {
  static async getDashboardMetrics(userId: string) {
    return QueryOptimizer.cachedQuery(
      `dashboard:${userId}`,
      async () => {
        const [
          transactionCount,
          totalSpent,
          recentTransactions,
          paymentMethods
        ] = await Promise.all([
          prisma.transaction.count({ where: { userId } }),
          prisma.transaction.aggregate({
            where: { userId, status: 'completed' },
            _sum: { amount: true }
          }),
          prisma.transaction.findMany({
            where: { userId },
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              amount: true,
              description: true,
              createdAt: true,
              status: true,
            }
          }),
          prisma.paymentMethod.count({ where: { userId } })
        ])

        return {
          transactionCount,
          totalSpent: totalSpent._sum.amount || 0,
          recentTransactions,
          paymentMethodsCount: paymentMethods,
        }
      },
      5 * 60 * 1000 // 5 minutes TTL
    )
  }

  static async getSystemMetrics() {
    return QueryOptimizer.cachedQuery(
      'system-metrics',
      async () => {
        const [
          totalUsers,
          totalTransactions,
          todayTransactions,
          averageTransactionValue
        ] = await Promise.all([
          prisma.user.count(),
          prisma.transaction.count(),
          prisma.transaction.count({
            where: {
              createdAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
              }
            }
          }),
          prisma.transaction.aggregate({
            where: { status: 'completed' },
            _avg: { amount: true }
          })
        ])

        return {
          totalUsers,
          totalTransactions,
          todayTransactions,
          averageTransactionValue: averageTransactionValue._avg.amount || 0,
        }
      },
      15 * 60 * 1000 // 15 minutes TTL
    )
  }
}

// Database maintenance and optimization
export class DatabaseMaintenance {
  static async cleanupExpiredSessions() {
    // Note: Session model not defined in schema
    // Implement when session management is added
    console.log('Session cleanup not implemented - no session model in schema')
    return { count: 0 }
  }

  static async cleanupExpiredTokens() {
    // Note: VerificationToken model not defined in schema
    // Implement when token management is added
    console.log('Token cleanup not implemented - no verificationToken model in schema')
    return { count: 0 }
  }

  static async optimizeDatabase() {
    if (process.env.NODE_ENV === 'production') {
      try {
        // Run database maintenance
        await Promise.all([
          this.cleanupExpiredSessions(),
          this.cleanupExpiredTokens(),
        ])
        
        console.log('Database optimization completed')
      } catch (error) {
        console.error('Database optimization failed:', error)
      }
    }
  }

  static async getSlowQueries(threshold = 1000) {
    // This would need to be implemented based on your database provider
    // For PostgreSQL, you might query pg_stat_statements
    // For now, just return an empty array
    return []
  }
}

// Query performance monitoring
export class QueryPerformanceMonitor {
  private static metrics = new Map<string, { count: number; totalTime: number; avgTime: number }>()

  static recordQuery(operation: string, duration: number) {
    const existing = this.metrics.get(operation) || { count: 0, totalTime: 0, avgTime: 0 }
    
    existing.count++
    existing.totalTime += duration
    existing.avgTime = existing.totalTime / existing.count

    this.metrics.set(operation, existing)
  }

  static getMetrics() {
    return Array.from(this.metrics.entries()).map(([operation, metrics]) => ({
      operation,
      ...metrics
    }))
  }

  static getSlowestQueries(limit = 10) {
    return this.getMetrics()
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, limit)
  }

  static reset() {
    this.metrics.clear()
  }
}

// Setup database monitoring
if (process.env.NODE_ENV === 'production') {
  // Monitor query performance
  prisma.$use(async (params, next) => {
    const start = Date.now()
    const result = await next(params)
    const duration = Date.now() - start
    
    QueryPerformanceMonitor.recordQuery(
      `${params.model || 'unknown'}.${params.action}`,
      duration
    )
    
    return result
  })
}

