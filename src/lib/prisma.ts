import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Database connection pool configuration
const databaseUrl = process.env.DATABASE_URL
const isProduction = process.env.NODE_ENV === 'production'

// Optimized Prisma client configuration
export const prisma = globalForPrisma.prisma ??= new PrismaClient({
  // Logging configuration
  log: isProduction 
    ? ['error', 'warn'] 
    : ['query', 'error', 'warn', 'info'],
    
  // Database connection configuration
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
  
  // Connection pooling and performance settings
  ...(!isProduction && {
    // Development settings
    errorFormat: 'pretty',
  }),
  
  ...(isProduction && {
    // Production optimizations
    errorFormat: 'minimal',
  }),
})

// Connection pool optimization
if (isProduction) {
  // Set up connection pool monitoring
  prisma.$on('query', (e) => {
    if (e.duration > 1000) { // Log slow queries (> 1s)
      console.warn(`[SLOW QUERY] ${e.duration}ms: ${e.query}`)
    }
  })
  
  // Error handling
  prisma.$on('error', (e) => {
    console.error('[PRISMA ERROR]:', e)
  })
}

// Development-only optimizations
if (!isProduction) {
  globalForPrisma.prisma = prisma
  
  // Log all queries in development
  prisma.$on('query', (e) => {
    console.log(`[QUERY] ${e.duration}ms: ${e.query.substring(0, 100)}${e.query.length > 100 ? '...' : ''}`)
  })
}

// Graceful shutdown handler
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

// Health check function
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'healthy', timestamp: new Date().toISOString() }
  } catch (error) {
    console.error('Database health check failed:', error)
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString() 
    }
  }
}

// Connection metrics
export async function getDatabaseMetrics() {
  try {
    const metrics = await prisma.$metrics.json()
    return {
      counters: metrics.counters,
      gauges: metrics.gauges,
      histograms: metrics.histograms,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.warn('Could not retrieve database metrics:', error)
    return null
  }
}