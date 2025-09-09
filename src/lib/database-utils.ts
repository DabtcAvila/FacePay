import { Prisma } from '@prisma/client'
import prismaOptimized from './prisma-optimized'

// Cache configuration
interface CacheConfig {
  ttl: number // Time to live in milliseconds
  maxSize: number // Maximum number of items in cache
}

// Simple in-memory cache implementation
class MemoryCache<T> {
  private cache = new Map<string, { data: T; expires: number }>()
  private config: CacheConfig

  constructor(config: CacheConfig = { ttl: 300000, maxSize: 1000 }) {
    this.config = config
  }

  set(key: string, data: T): void {
    // Clear expired items if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.clearExpired()
      
      // If still full, remove oldest items
      if (this.cache.size >= this.config.maxSize) {
        const firstKey = this.cache.keys().next().value
        if (firstKey !== undefined) {
          this.cache.delete(firstKey)
        }
      }
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + this.config.ttl
    })
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key)
    
    if (!item) return undefined
    
    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return undefined
    }
    
    return item.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  private clearExpired(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key)
      }
    }
  }

  size(): number {
    return this.cache.size
  }
}

// Global cache instances
const queryCache = new MemoryCache({ ttl: 300000, maxSize: 500 }) // 5 minutes
const userCache = new MemoryCache({ ttl: 600000, maxSize: 1000 }) // 10 minutes

// Cursor-based pagination interface
export interface CursorPaginationParams {
  cursor?: string
  take: number
  skip?: number
  orderBy?: any
}

export interface PaginationResult<T> {
  data: T[]
  nextCursor?: string
  previousCursor?: string
  hasNextPage: boolean
  hasPreviousPage: boolean
  total?: number
}

// Generic cursor-based pagination function
export async function paginateWithCursor<T extends { id: string }>(
  model: any,
  params: CursorPaginationParams,
  where: any = {},
  include: any = undefined
): Promise<PaginationResult<T>> {
  const { cursor, take, skip = 0, orderBy = { createdAt: 'desc' } } = params

  // Build query
  const query: any = {
    where: { ...where, deletedAt: null }, // Soft delete filter
    take: take + 1, // Take one extra to check if there's a next page
    skip,
    orderBy,
  }

  if (include) {
    query.include = include
  }

  if (cursor) {
    query.cursor = { id: cursor }
    query.skip = 1 // Skip the cursor item itself
  }

  const results = await model.findMany(query)
  const hasNextPage = results.length > take
  
  if (hasNextPage) {
    results.pop() // Remove the extra item
  }

  const nextCursor = hasNextPage ? results[results.length - 1]?.id : undefined
  const previousCursor = cursor || undefined

  return {
    data: results,
    nextCursor,
    previousCursor,
    hasNextPage,
    hasPreviousPage: !!cursor,
  }
}

// Offset-based pagination (for when you need total count)
export interface OffsetPaginationParams {
  page: number
  limit: number
  orderBy?: any
}

export async function paginateWithOffset<T>(
  model: any,
  params: OffsetPaginationParams,
  where: any = {},
  include: any = undefined
): Promise<PaginationResult<T> & { totalPages: number }> {
  const { page, limit, orderBy = { createdAt: 'desc' } } = params
  const skip = (page - 1) * limit

  const whereClause = { ...where, deletedAt: null }

  // Get total count and data in parallel
  const [total, data] = await Promise.all([
    model.count({ where: whereClause }),
    model.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy,
      include,
    })
  ])

  const totalPages = Math.ceil(total / limit)
  const hasNextPage = page < totalPages
  const hasPreviousPage = page > 1

  return {
    data,
    total,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  }
}

// Cached query wrapper
export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = queryCache.get(key)
  if (cached) {
    return cached as T
  }

  const result = await queryFn()
  queryCache.set(key, result)
  return result
}

// Batch loading utility to prevent N+1 queries
export class DataLoader<K, V> {
  private batchFn: (keys: K[]) => Promise<V[]>
  private cache = new Map<string, V>()
  private queue: Array<{
    key: K
    resolve: (value: V) => void
    reject: (error: Error) => void
  }> = []
  private scheduled = false

  constructor(batchFn: (keys: K[]) => Promise<V[]>) {
    this.batchFn = batchFn
  }

  async load(key: K): Promise<V> {
    const cacheKey = JSON.stringify(key)
    const cached = this.cache.get(cacheKey)
    
    if (cached) {
      return cached
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject })
      
      if (!this.scheduled) {
        this.scheduled = true
        process.nextTick(() => this.processBatch())
      }
    })
  }

  private async processBatch(): Promise<void> {
    const batch = this.queue.splice(0)
    this.scheduled = false

    try {
      const keys = batch.map(item => item.key)
      const values = await this.batchFn(keys)

      batch.forEach((item, index) => {
        const cacheKey = JSON.stringify(item.key)
        const value = values[index]
        
        if (value !== undefined) {
          this.cache.set(cacheKey, value)
          item.resolve(value)
        } else {
          item.reject(new Error('Value not found'))
        }
      })
    } catch (error) {
      batch.forEach(item => item.reject(error as Error))
    }
  }

  clear(): void {
    this.cache.clear()
  }
}

// User data loader to prevent N+1 queries
export const userLoader = new DataLoader(async (userIds: string[]) => {
  const users = await prismaOptimized.user.findMany({
    where: { id: { in: userIds }, deletedAt: null }
  })
  
  // Return users in the same order as requested IDs
  return userIds.map(id => users.find(user => user.id === id))
})

// Transaction aggregation utilities
export class TransactionAggregator {
  static async getUserTransactionStats(userId: string, dateRange?: { from: Date; to: Date }) {
    const cacheKey = `user_stats_${userId}_${dateRange?.from}_${dateRange?.to}`
    
    return cachedQuery(cacheKey, async () => {
      const where: any = {
        userId,
        deletedAt: null,
      }

      if (dateRange) {
        where.createdAt = {
          gte: dateRange.from,
          lte: dateRange.to,
        }
      }

      const [totalTransactions, completedTransactions, totalAmount, avgAmount] = await Promise.all([
        prismaOptimized.transaction.count({ where }),
        prismaOptimized.transaction.count({ 
          where: { ...where, status: 'completed' }
        }),
        prismaOptimized.transaction.aggregate({
          where: { ...where, status: 'completed' },
          _sum: { amount: true }
        }),
        prismaOptimized.transaction.aggregate({
          where: { ...where, status: 'completed' },
          _avg: { amount: true }
        })
      ])

      return {
        totalTransactions,
        completedTransactions,
        totalAmount: totalAmount._sum.amount || 0,
        avgAmount: avgAmount._avg.amount || 0,
        completionRate: totalTransactions > 0 ? (completedTransactions / totalTransactions) * 100 : 0
      }
    })
  }

  static async getDailyTransactionVolume(days: number = 30) {
    const cacheKey = `daily_volume_${days}`
    
    return cachedQuery(cacheKey, async () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const result = await prismaOptimized.$queryRaw<Array<{
        date: Date
        count: bigint
        total_amount: number
      }>>`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          SUM(amount) as total_amount
        FROM transactions 
        WHERE created_at >= ${startDate} 
          AND status = 'completed' 
          AND deleted_at IS NULL
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `

      return result.map(row => ({
        date: row.date,
        count: Number(row.count),
        totalAmount: row.total_amount
      }))
    }, 600000) // Cache for 10 minutes
  }
}

// Database maintenance utilities
export class DatabaseMaintenance {
  // Clean up expired soft-deleted records
  static async cleanupSoftDeleted(olderThanDays: number = 90) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const models = [
      'user', 'biometricData', 'webauthnCredential', 
      'paymentMethod', 'transaction', 'refund', 'receipt'
    ]

    const results = []
    
    for (const model of models) {
      try {
        const result = await (prismaOptimized as any)[model].deleteMany({
          where: {
            deletedAt: {
              lt: cutoffDate
            }
          }
        })
        results.push({ model, deletedCount: result.count })
      } catch (error) {
        results.push({ model, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    return results
  }

  // Clean up old audit logs
  static async cleanupAuditLogs(olderThanDays: number = 365) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    return await prismaOptimized.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    })
  }

  // Update database statistics
  static async updateStatistics() {
    try {
      await prismaOptimized.$executeRaw`ANALYZE`
      return { success: true, message: 'Statistics updated successfully' }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

// Query optimization helpers
export class QueryOptimizer {
  // Check for missing indexes
  static async analyzeMissingIndexes() {
    try {
      const result = await prismaOptimized.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
          AND n_distinct > 100
          AND correlation < 0.1
        ORDER BY n_distinct DESC
      `
      return result
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Get slow queries (requires pg_stat_statements extension)
  static async getSlowQueries(limit: number = 10) {
    try {
      const result = await prismaOptimized.$queryRaw`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        ORDER BY mean_time DESC 
        LIMIT ${limit}
      `
      return result
    } catch (error) {
      return { error: 'pg_stat_statements extension may not be enabled' }
    }
  }
}

// Export cache instances for external use
export { queryCache, userCache }