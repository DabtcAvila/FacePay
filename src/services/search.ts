import { Prisma } from '@prisma/client'
import prismaOptimized from '../lib/prisma-optimized'
import { cachedQuery, paginateWithCursor, CursorPaginationParams, PaginationResult } from '../lib/database-utils'

// Search result interfaces
export interface SearchResult<T> {
  id: string
  type: string
  title: string
  description?: string
  score: number
  data: T
  highlights?: string[]
}

export interface SearchOptions {
  query: string
  types?: SearchType[]
  limit?: number
  offset?: number
  filters?: SearchFilters
  sortBy?: 'relevance' | 'date' | 'amount'
  sortOrder?: 'asc' | 'desc'
}

export interface SearchFilters {
  userId?: string
  dateRange?: {
    from: Date
    to: Date
  }
  amountRange?: {
    min: number
    max: number
  }
  status?: string[]
  currency?: string[]
}

export type SearchType = 'users' | 'transactions' | 'refunds' | 'receipts' | 'paymentMethods'

export class SearchService {
  // Main search function that searches across multiple entities
  static async search(options: SearchOptions): Promise<SearchResult<any>[]> {
    const { query, types = ['users', 'transactions', 'refunds'], limit = 50 } = options
    const cacheKey = `search_${JSON.stringify(options)}`

    return cachedQuery(cacheKey, async () => {
      const searchPromises: Promise<SearchResult<any>[]>[] = []

      if (types.includes('users')) {
        searchPromises.push(this.searchUsers(query, options.filters, limit))
      }

      if (types.includes('transactions')) {
        searchPromises.push(this.searchTransactions(query, options.filters, limit))
      }

      if (types.includes('refunds')) {
        searchPromises.push(this.searchRefunds(query, options.filters, limit))
      }

      if (types.includes('receipts')) {
        searchPromises.push(this.searchReceipts(query, options.filters, limit))
      }

      if (types.includes('paymentMethods')) {
        searchPromises.push(this.searchPaymentMethods(query, options.filters, limit))
      }

      const results = await Promise.all(searchPromises)
      const flatResults = results.flat()

      // Sort by relevance score and limit results
      return flatResults
        .sort((a, b) => {
          if (options.sortBy === 'date') {
            const dateA = new Date(a.data.createdAt || a.data.generatedAt).getTime()
            const dateB = new Date(b.data.createdAt || b.data.generatedAt).getTime()
            return options.sortOrder === 'asc' ? dateA - dateB : dateB - dateA
          }
          if (options.sortBy === 'amount' && (a.data.amount || b.data.amount)) {
            const amountA = parseFloat(a.data.amount || 0)
            const amountB = parseFloat(b.data.amount || 0)
            return options.sortOrder === 'asc' ? amountA - amountB : amountB - amountA
          }
          return b.score - a.score // Default: relevance
        })
        .slice(0, limit)
    }, 60000) // Cache for 1 minute
  }

  // Search users by name and email
  private static async searchUsers(
    query: string, 
    filters?: SearchFilters, 
    limit: number = 20
  ): Promise<SearchResult<any>[]> {
    const whereClause: any = {
      deletedAt: null,
      OR: [
        { name: { search: query } },
        { email: { search: query } },
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } }
      ]
    }

    if (filters?.userId) {
      whereClause.id = filters.userId
    }

    if (filters?.dateRange) {
      whereClause.createdAt = {
        gte: filters.dateRange.from,
        lte: filters.dateRange.to
      }
    }

    const users = await prismaOptimized.user.findMany({
      where: whereClause,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        lastLoginAt: true,
        _relevance: {
          fields: ['name', 'email'],
          search: query,
          sort: 'desc'
        }
      }
    })

    return users.map(user => ({
      id: user.id,
      type: 'user',
      title: user.name || user.email,
      description: user.email !== (user.name || user.email) ? user.email : undefined,
      score: this.calculateRelevanceScore(query, [user.name, user.email].filter(Boolean) as string[]),
      data: user,
      highlights: this.extractHighlights(query, [user.name, user.email].filter(Boolean) as string[])
    }))
  }

  // Search transactions by description and reference
  private static async searchTransactions(
    query: string, 
    filters?: SearchFilters, 
    limit: number = 20
  ): Promise<SearchResult<any>[]> {
    const whereClause: any = {
      deletedAt: null,
      OR: [
        { description: { search: query } },
        { reference: { search: query } },
        { description: { contains: query, mode: 'insensitive' } },
        { reference: { contains: query, mode: 'insensitive' } }
      ]
    }

    if (filters?.userId) {
      whereClause.userId = filters.userId
    }

    if (filters?.dateRange) {
      whereClause.createdAt = {
        gte: filters.dateRange.from,
        lte: filters.dateRange.to
      }
    }

    if (filters?.amountRange) {
      whereClause.amount = {
        gte: filters.amountRange.min,
        lte: filters.amountRange.max
      }
    }

    if (filters?.status) {
      whereClause.status = { in: filters.status }
    }

    if (filters?.currency) {
      whereClause.currency = { in: filters.currency }
    }

    const transactions = await prismaOptimized.transaction.findMany({
      where: whereClause,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        },
        paymentMethod: {
          select: { type: true, provider: true }
        }
      }
    })

    return transactions.map(transaction => ({
      id: transaction.id,
      type: 'transaction',
      title: transaction.description || `Transaction ${transaction.reference || transaction.id.slice(-8)}`,
      description: `${transaction.amount} ${transaction.currency} - ${transaction.status}`,
      score: this.calculateRelevanceScore(query, [
        transaction.description, 
        transaction.reference
      ].filter(Boolean) as string[]),
      data: transaction,
      highlights: this.extractHighlights(query, [
        transaction.description, 
        transaction.reference
      ].filter(Boolean) as string[])
    }))
  }

  // Search refunds by reason
  private static async searchRefunds(
    query: string, 
    filters?: SearchFilters, 
    limit: number = 20
  ): Promise<SearchResult<any>[]> {
    const whereClause: any = {
      deletedAt: null,
      OR: [
        { reason: { search: query } },
        { reference: { search: query } },
        { reason: { contains: query, mode: 'insensitive' } },
        { reference: { contains: query, mode: 'insensitive' } }
      ]
    }

    if (filters?.dateRange) {
      whereClause.createdAt = {
        gte: filters.dateRange.from,
        lte: filters.dateRange.to
      }
    }

    if (filters?.amountRange) {
      whereClause.amount = {
        gte: filters.amountRange.min,
        lte: filters.amountRange.max
      }
    }

    if (filters?.status) {
      whereClause.status = { in: filters.status }
    }

    const refunds = await prismaOptimized.refund.findMany({
      where: whereClause,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        transaction: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        }
      }
    })

    return refunds.map(refund => ({
      id: refund.id,
      type: 'refund',
      title: `Refund: ${refund.reason}`,
      description: `${refund.amount} - ${refund.status}`,
      score: this.calculateRelevanceScore(query, [refund.reason, refund.reference].filter(Boolean) as string[]),
      data: refund,
      highlights: this.extractHighlights(query, [refund.reason, refund.reference].filter(Boolean) as string[])
    }))
  }

  // Search receipts (placeholder for now)
  private static async searchReceipts(
    query: string, 
    filters?: SearchFilters, 
    limit: number = 20
  ): Promise<SearchResult<any>[]> {
    const whereClause: any = {
      deletedAt: null,
      receiptNumber: { contains: query, mode: 'insensitive' }
    }

    if (filters?.dateRange) {
      whereClause.generatedAt = {
        gte: filters.dateRange.from,
        lte: filters.dateRange.to
      }
    }

    const receipts = await prismaOptimized.receipt.findMany({
      where: whereClause,
      take: limit,
      orderBy: { generatedAt: 'desc' },
      include: {
        transaction: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        }
      }
    })

    return receipts.map(receipt => ({
      id: receipt.id,
      type: 'receipt',
      title: `Receipt ${receipt.receiptNumber}`,
      description: `${receipt.format} format`,
      score: this.calculateRelevanceScore(query, [receipt.receiptNumber]),
      data: receipt,
      highlights: this.extractHighlights(query, [receipt.receiptNumber])
    }))
  }

  // Search payment methods by nickname
  private static async searchPaymentMethods(
    query: string, 
    filters?: SearchFilters, 
    limit: number = 20
  ): Promise<SearchResult<any>[]> {
    const whereClause: any = {
      deletedAt: null,
      OR: [
        { nickname: { contains: query, mode: 'insensitive' } },
        { type: { contains: query, mode: 'insensitive' } },
        { provider: { contains: query, mode: 'insensitive' } }
      ]
    }

    if (filters?.userId) {
      whereClause.userId = filters.userId
    }

    const paymentMethods = await prismaOptimized.paymentMethod.findMany({
      where: whereClause,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    })

    return paymentMethods.map(pm => ({
      id: pm.id,
      type: 'paymentMethod',
      title: pm.nickname || `${pm.type} via ${pm.provider}`,
      description: `${pm.type} payment method`,
      score: this.calculateRelevanceScore(query, [pm.nickname, pm.type, pm.provider].filter(Boolean) as string[]),
      data: pm,
      highlights: this.extractHighlights(query, [pm.nickname, pm.type, pm.provider].filter(Boolean) as string[])
    }))
  }

  // Calculate relevance score based on query matches
  private static calculateRelevanceScore(query: string, fields: string[]): number {
    const queryLower = query.toLowerCase()
    let score = 0

    fields.forEach(field => {
      if (!field) return

      const fieldLower = field.toLowerCase()
      
      // Exact match gets highest score
      if (fieldLower === queryLower) {
        score += 100
      }
      // Starts with query gets high score
      else if (fieldLower.startsWith(queryLower)) {
        score += 50
      }
      // Contains query gets medium score
      else if (fieldLower.includes(queryLower)) {
        score += 25
      }
      // Word boundary match gets some score
      else if (new RegExp(`\\b${queryLower}`, 'i').test(field)) {
        score += 10
      }
    })

    return score
  }

  // Extract highlights for search results
  private static extractHighlights(query: string, fields: string[]): string[] {
    const highlights: string[] = []
    const queryLower = query.toLowerCase()

    fields.forEach(field => {
      if (!field) return

      const fieldLower = field.toLowerCase()
      const index = fieldLower.indexOf(queryLower)
      
      if (index !== -1) {
        const start = Math.max(0, index - 20)
        const end = Math.min(field.length, index + query.length + 20)
        let highlight = field.substring(start, end)
        
        if (start > 0) highlight = '...' + highlight
        if (end < field.length) highlight = highlight + '...'
        
        // Bold the matched text (using markdown-style)
        highlight = highlight.replace(
          new RegExp(`(${query})`, 'gi'), 
          '**$1**'
        )
        
        highlights.push(highlight)
      }
    })

    return highlights
  }

  // Advanced search with complex queries
  static async advancedSearch(options: {
    query: string
    filters: SearchFilters
    facets?: string[]
    pagination?: CursorPaginationParams
  }): Promise<{
    results: PaginationResult<SearchResult<any>>
    facets?: Record<string, Array<{ value: string; count: number }>>
  }> {
    const { query, filters, facets = [], pagination } = options

    // Build complex search query
    const searchResults = await this.search({
      query,
      filters,
      limit: pagination?.take || 50
    })

    // Paginate results if needed
    let paginatedResults: PaginationResult<SearchResult<any>>
    if (pagination) {
      const startIndex = pagination.skip || 0
      const endIndex = startIndex + (pagination.take || 50)
      paginatedResults = {
        data: searchResults.slice(startIndex, endIndex),
        hasNextPage: endIndex < searchResults.length,
        hasPreviousPage: startIndex > 0,
        total: searchResults.length
      }
    } else {
      paginatedResults = {
        data: searchResults,
        hasNextPage: false,
        hasPreviousPage: false,
        total: searchResults.length
      }
    }

    // Calculate facets if requested
    const facetResults: Record<string, Array<{ value: string; count: number }>> = {}
    
    if (facets.includes('type')) {
      const typeCount = searchResults.reduce((acc, result) => {
        acc[result.type] = (acc[result.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      facetResults.type = Object.entries(typeCount).map(([value, count]) => ({ value, count }))
    }

    if (facets.includes('status') && filters.userId) {
      // Get status facets for transactions
      const statusCount = searchResults
        .filter(r => r.type === 'transaction')
        .reduce((acc, result) => {
          const status = result.data.status
          acc[status] = (acc[status] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      
      facetResults.status = Object.entries(statusCount).map(([value, count]) => ({ value, count }))
    }

    return {
      results: paginatedResults,
      facets: Object.keys(facetResults).length > 0 ? facetResults : undefined
    }
  }

  // Suggest search queries based on user input
  static async getSuggestions(query: string, limit: number = 5): Promise<string[]> {
    if (query.length < 2) return []

    const cacheKey = `suggestions_${query}_${limit}`
    
    return cachedQuery(cacheKey, async () => {
      const suggestions = new Set<string>()

      // Get suggestions from transaction descriptions
      const transactions = await prismaOptimized.$queryRaw<Array<{ description: string }>>`
        SELECT DISTINCT description 
        FROM transactions 
        WHERE description IS NOT NULL 
          AND description ILIKE ${'%' + query + '%'}
          AND deleted_at IS NULL
        LIMIT ${limit}
      `

      transactions.forEach(t => {
        if (t.description && suggestions.size < limit) {
          suggestions.add(t.description)
        }
      })

      // Get suggestions from user names
      if (suggestions.size < limit) {
        const users = await prismaOptimized.$queryRaw<Array<{ name: string }>>`
          SELECT DISTINCT name 
          FROM users 
          WHERE name IS NOT NULL 
            AND name ILIKE ${'%' + query + '%'}
            AND deleted_at IS NULL
          LIMIT ${limit - suggestions.size}
        `

        users.forEach(u => {
          if (u.name && suggestions.size < limit) {
            suggestions.add(u.name)
          }
        })
      }

      return Array.from(suggestions)
    }, 300000) // Cache for 5 minutes
  }
}

export default SearchService