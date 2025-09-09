import { PrismaClient } from '@prisma/client'

// Configuration for database sharding and read replicas
export interface DatabaseConfig {
  primary: {
    url: string
    maxConnections: number
  }
  readReplicas: Array<{
    url: string
    maxConnections: number
    weight: number // Load balancing weight
  }>
  shards: Array<{
    id: string
    url: string
    maxConnections: number
    keyRange: {
      start: string
      end: string
    }
  }>
}

// Default configuration (should be loaded from environment)
export const databaseConfig: DatabaseConfig = {
  primary: {
    url: process.env.DATABASE_URL || '',
    maxConnections: 20
  },
  readReplicas: [
    {
      url: process.env.DATABASE_READ_REPLICA_1 || process.env.DATABASE_URL || '',
      maxConnections: 10,
      weight: 1
    },
    {
      url: process.env.DATABASE_READ_REPLICA_2 || process.env.DATABASE_URL || '',
      maxConnections: 10,
      weight: 1
    }
  ],
  shards: [
    {
      id: 'shard_1',
      url: process.env.DATABASE_SHARD_1 || process.env.DATABASE_URL || '',
      maxConnections: 15,
      keyRange: {
        start: '00000000',
        end: '7FFFFFFF'
      }
    },
    {
      id: 'shard_2', 
      url: process.env.DATABASE_SHARD_2 || process.env.DATABASE_URL || '',
      maxConnections: 15,
      keyRange: {
        start: '80000000',
        end: 'FFFFFFFF'
      }
    }
  ]
}

// Connection pool management
class ConnectionPool {
  private pools: Map<string, PrismaClient> = new Map()
  private readReplicaIndex = 0

  constructor(private config: DatabaseConfig) {
    this.initializePools()
  }

  private initializePools() {
    // Initialize primary connection
    this.pools.set('primary', new PrismaClient({
      datasources: {
        db: {
          url: this.config.primary.url
        }
      }
    }))

    // Initialize read replica connections
    this.config.readReplicas.forEach((replica, index) => {
      this.pools.set(`read_replica_${index}`, new PrismaClient({
        datasources: {
          db: {
            url: replica.url
          }
        }
      }))
    })

    // Initialize shard connections
    this.config.shards.forEach(shard => {
      this.pools.set(`shard_${shard.id}`, new PrismaClient({
        datasources: {
          db: {
            url: shard.url
          }
        }
      }))
    })
  }

  // Get primary database connection (for writes)
  getPrimary(): PrismaClient {
    return this.pools.get('primary')!
  }

  // Get read replica connection (round-robin load balancing)
  getReadReplica(): PrismaClient {
    if (this.config.readReplicas.length === 0) {
      return this.getPrimary()
    }

    const replicaKey = `read_replica_${this.readReplicaIndex}`
    this.readReplicaIndex = (this.readReplicaIndex + 1) % this.config.readReplicas.length
    
    return this.pools.get(replicaKey) || this.getPrimary()
  }

  // Get shard connection based on key
  getShard(key: string): PrismaClient {
    const shardId = this.getShardId(key)
    return this.pools.get(`shard_${shardId}`) || this.getPrimary()
  }

  // Determine which shard a key belongs to
  private getShardId(key: string): string {
    const hash = this.hashKey(key)
    
    for (const shard of this.config.shards) {
      if (hash >= shard.keyRange.start && hash <= shard.keyRange.end) {
        return shard.id
      }
    }
    
    // Fallback to first shard
    return this.config.shards[0]?.id || 'shard_1'
  }

  // Simple hash function for sharding
  private hashKey(key: string): string {
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    // Convert to hex and pad to 8 characters
    return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')
  }

  // Close all connections
  async disconnect() {
    await Promise.all(
      Array.from(this.pools.values()).map(client => client.$disconnect())
    )
    this.pools.clear()
  }

  // Health check for all connections
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {}
    
    // Convert entries to array for better compatibility
    const poolEntries = Array.from(this.pools.entries())
    for (const [key, client] of poolEntries) {
      try {
        await client.$queryRaw`SELECT 1`
        results[key] = true
      } catch (error) {
        results[key] = false
        console.error(`Health check failed for ${key}:`, error)
      }
    }
    
    return results
  }
}

// Singleton connection pool instance
let connectionPool: ConnectionPool | null = null

export function getConnectionPool(): ConnectionPool {
  if (!connectionPool) {
    connectionPool = new ConnectionPool(databaseConfig)
  }
  return connectionPool
}

// Database router that automatically routes queries to appropriate databases
export class DatabaseRouter {
  private connectionPool: ConnectionPool

  constructor() {
    this.connectionPool = getConnectionPool()
  }

  // Route read operations to read replicas
  async executeRead<T>(
    operation: (client: PrismaClient) => Promise<T>,
    options: { forceMain?: boolean } = {}
  ): Promise<T> {
    const client = options.forceMain 
      ? this.connectionPool.getPrimary()
      : this.connectionPool.getReadReplica()
      
    return await operation(client)
  }

  // Route write operations to primary database
  async executeWrite<T>(
    operation: (client: PrismaClient) => Promise<T>
  ): Promise<T> {
    const client = this.connectionPool.getPrimary()
    return await operation(client)
  }

  // Route operations to specific shard based on key
  async executeOnShard<T>(
    key: string,
    operation: (client: PrismaClient) => Promise<T>
  ): Promise<T> {
    const client = this.connectionPool.getShard(key)
    return await operation(client)
  }

  // Execute distributed query across all shards
  async executeDistributed<T>(
    operation: (client: PrismaClient) => Promise<T[]>
  ): Promise<T[]> {
    const shardOperations = databaseConfig.shards.map(shard => {
      const client = this.connectionPool.getShard(shard.id)
      return operation(client)
    })

    const results = await Promise.all(shardOperations)
    return results.flat()
  }

  // Transaction across multiple shards (distributed transaction)
  async executeDistributedTransaction<T>(
    operations: Array<{
      key: string
      operation: (client: PrismaClient) => Promise<T>
    }>
  ): Promise<T[]> {
    // Group operations by shard
    const shardGroups = new Map<string, Array<typeof operations[0]>>()
    
    operations.forEach(op => {
      const shardId = this.connectionPool.getShard(op.key)
      const key = `shard_${shardId}`
      
      if (!shardGroups.has(key)) {
        shardGroups.set(key, [])
      }
      shardGroups.get(key)!.push(op)
    })

    // Execute transactions on each shard
    const shardTransactions = Array.from(shardGroups.entries()).map(
      async ([shardKey, ops]) => {
        const client = this.connectionPool.getShard(shardKey.replace('shard_', ''))
        
        return await client.$transaction(async (tx) => {
          return Promise.all(ops.map(op => op.operation(tx as PrismaClient)))
        })
      }
    )

    const results = await Promise.all(shardTransactions)
    return results.flat()
  }

  // Get health status of all database connections
  async getHealthStatus() {
    return await this.connectionPool.healthCheck()
  }

  // Graceful shutdown
  async shutdown() {
    await this.connectionPool.disconnect()
  }
}

// Singleton router instance
let databaseRouter: DatabaseRouter | null = null

export function getDatabaseRouter(): DatabaseRouter {
  if (!databaseRouter) {
    databaseRouter = new DatabaseRouter()
  }
  return databaseRouter
}

// Utility functions for common sharding patterns

// Shard user-related data by user ID
export async function executeUserOperation<T>(
  userId: string,
  operation: (client: PrismaClient) => Promise<T>,
  readOnly: boolean = false
): Promise<T> {
  const router = getDatabaseRouter()
  
  if (readOnly) {
    return router.executeRead(operation)
  } else {
    return router.executeOnShard(userId, operation)
  }
}

// Shard transaction data by user ID or transaction ID
export async function executeTransactionOperation<T>(
  key: string, // userId or transactionId
  operation: (client: PrismaClient) => Promise<T>,
  readOnly: boolean = false
): Promise<T> {
  const router = getDatabaseRouter()
  
  if (readOnly) {
    return router.executeRead(operation)
  } else {
    return router.executeOnShard(key, operation)
  }
}

// Execute analytics queries across all shards
export async function executeAnalyticsQuery<T>(
  operation: (client: PrismaClient) => Promise<T[]>
): Promise<T[]> {
  const router = getDatabaseRouter()
  return router.executeDistributed(operation)
}

// Graceful shutdown for the entire database layer
export async function shutdownDatabaseConnections() {
  if (databaseRouter) {
    await databaseRouter.shutdown()
    databaseRouter = null
  }
  if (connectionPool) {
    await connectionPool.disconnect()
    connectionPool = null
  }
}

// Setup process handlers for graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    console.log('Shutting down database connections...')
    await shutdownDatabaseConnections()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('Shutting down database connections...')
    await shutdownDatabaseConnections()
    process.exit(0)
  })
}

export default DatabaseRouter