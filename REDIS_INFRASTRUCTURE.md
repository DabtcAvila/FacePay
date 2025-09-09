# Redis Caching Infrastructure for FacePay

## Overview

This document describes the comprehensive Redis-based caching infrastructure implemented for the FacePay application. The system provides high-performance caching, session management, rate limiting, distributed locking, and real-time features using Redis as the primary backend.

## Architecture Components

### 🏗️ Core Components

1. **Redis Client Configuration** (`src/lib/redis.ts`)
   - Multi-instance Redis client with support for standalone, sentinel, and cluster modes
   - Automatic failover and reconnection handling
   - Health monitoring and metrics collection

2. **Unified Cache System** (`src/lib/cache.ts`)
   - Cache-aside, write-through, and write-behind patterns
   - TTL management and cache invalidation strategies
   - Tag-based cache invalidation
   - Cache warming and statistics

3. **Session Store** (`src/services/session-store.ts`)
   - Redis-backed session management
   - User session tracking and cleanup
   - Biometric and WebAuthn verification state storage

4. **Rate Limiter** (`src/services/rate-limiter.ts`)
   - Multiple rate limiting algorithms (fixed window, sliding window, token bucket)
   - Per-user, per-IP, and per-endpoint rate limiting
   - Configurable windows and limits

5. **Distributed Locks** (`src/services/distributed-lock.ts`)
   - Redis-based distributed locking with automatic expiration
   - Deadlock prevention and lock extension
   - Resource-specific lock configurations

6. **Pub/Sub System** (`src/services/pubsub.ts`)
   - Real-time messaging and notifications
   - User-specific channels and system broadcasts
   - Message persistence for offline users

7. **Database Query Cache** (`src/services/db-cache.ts`)
   - Prisma query result caching
   - Automatic cache invalidation on database changes
   - Query-specific TTL configurations

8. **Monitoring & Health Checks** (`src/services/redis-monitor.ts`)
   - Comprehensive Redis metrics collection
   - Alert system with configurable thresholds
   - Prometheus-compatible metrics export

## 📁 File Structure

```
src/
├── lib/
│   ├── redis.ts                 # Redis client configuration
│   └── cache.ts                 # Unified cache system
├── middleware/
│   └── cache.ts                 # HTTP cache middleware
├── services/
│   ├── session-store.ts         # Session management
│   ├── rate-limiter.ts          # Rate limiting
│   ├── distributed-lock.ts      # Distributed locking
│   ├── pubsub.ts               # Pub/Sub messaging
│   ├── db-cache.ts             # Database query caching
│   └── redis-monitor.ts        # Monitoring & metrics
├── app/api/health/redis/
│   └── route.ts                # Health check endpoint
config/
├── redis.conf                  # Redis server configuration
├── sentinel.conf              # Redis Sentinel configuration
├── prometheus.yml             # Prometheus configuration
└── grafana-datasources.yml    # Grafana configuration
scripts/
└── setup-redis.js             # Setup automation script
docker-compose.yml              # Docker infrastructure
```

## 🚀 Quick Start

### 1. Setup Redis Infrastructure

```bash
# Run the automated setup script
node scripts/setup-redis.js

# Or manually start Redis
docker-compose up -d redis

# Start management tools
docker-compose --profile tools up -d

# Start monitoring stack
docker-compose --profile monitoring up -d
```

### 2. Configure Environment Variables

Update your `.env` file:

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=facepay123
REDIS_DB=0

# Redis Cluster (optional)
# REDIS_CLUSTER_NODES=localhost:7000,localhost:7001,localhost:7002

# Redis Sentinel (optional)
# REDIS_SENTINEL_HOSTS=localhost:26379
# REDIS_SENTINEL_NAME=mymaster
```

### 3. Initialize in Your Application

```typescript
import { initializePubSub } from '@/services/pubsub';
import { initializeRedisMonitoring } from '@/services/redis-monitor';
import { testRedisConnection } from '@/lib/redis';

// In your app initialization
async function initializeApp() {
  // Test Redis connection
  const isConnected = await testRedisConnection();
  if (!isConnected) {
    throw new Error('Redis connection failed');
  }

  // Initialize services
  await initializePubSub();
  await initializeRedisMonitoring();
  
  console.log('✅ Redis infrastructure initialized');
}
```

## 💼 Usage Examples

### Cache Management

```typescript
import { getCacheManager, CacheStrategies } from '@/lib/cache';

const cache = getCacheManager();

// Cache API responses
const apiData = await cache.get('user:123', async () => {
  return fetchUserFromAPI('123');
}, CacheStrategies.API_RESPONSE);

// Cache with tags for invalidation
await cache.set('user:123:profile', userData, {
  ttl: 3600,
  tags: ['user', 'profile'],
});

// Invalidate by tags
await cache.invalidateByTags(['user']);
```

### Session Management

```typescript
import { getSessionStore } from '@/services/session-store';

const sessionStore = getSessionStore();

// Create session
const sessionId = await sessionStore.createSession('user123', {
  email: 'user@example.com',
  role: 'user',
});

// Get session
const session = await sessionStore.getSession(sessionId);

// Update session with biometric verification
await sessionStore.setBiometricVerification(sessionId, true);
```

### Rate Limiting

```typescript
import { getRateLimiter, RateLimitConfigs } from '@/services/rate-limiter';

const rateLimiter = getRateLimiter();

// Check rate limit
const result = await rateLimiter.increment(
  'user:123', 
  RateLimitConfigs.PAYMENT
);

if (!result.allowed) {
  throw new Error('Rate limit exceeded');
}
```

### Distributed Locking

```typescript
import { getDistributedLockManager, LockResources } from '@/services/distributed-lock';

const lockManager = getDistributedLockManager();

// Execute with automatic locking
await lockManager.withLock(
  LockResources.PAYMENT_PROCESSING('payment123'),
  async () => {
    // Critical payment processing logic
    return processPayment(paymentData);
  }
);
```

### Pub/Sub Messaging

```typescript
import { notificationService, PubSubChannels } from '@/services/pubsub';

// Send user notification
await notificationService.notifyUser(
  'user123',
  'payment_completed',
  { paymentId: 'pay123', amount: 100 }
);

// Listen for messages
pubsub.on('type:payment_completed', (message) => {
  console.log('Payment completed:', message.data);
});
```

### Database Query Caching

```typescript
import { getDbCache, QueryCacheConfigs } from '@/services/db-cache';

const dbCache = getDbCache();

// Cache Prisma query
const users = await dbCache.cachePrismaQuery(
  'findMany',
  'User',
  { where: { active: true } },
  () => prisma.user.findMany({ where: { active: true } }),
  QueryCacheConfigs.USER
);
```

## 🔧 Configuration

### Cache Strategies

```typescript
export const CacheStrategies = {
  API_RESPONSE: { ttl: 300, tags: ['api'] },           // 5 minutes
  DATABASE_QUERY: { ttl: 1800, tags: ['db'] },        // 30 minutes
  STATIC_DATA: { ttl: 86400, tags: ['static'] },      // 24 hours
  USER_SESSION: { ttl: 3600, tags: ['session'] },     // 1 hour
  PAYMENT_DATA: { ttl: 300, tags: ['payment'] },      // 5 minutes
  BIOMETRIC_DATA: { ttl: 60, tags: ['biometric'] },   // 1 minute
};
```

### Rate Limit Configurations

```typescript
export const RateLimitConfigs = {
  API_DEFAULT: { windowMs: 900000, maxRequests: 100 },  // 15 min, 100 req
  AUTH: { windowMs: 900000, maxRequests: 5 },           // 15 min, 5 req
  PAYMENT: { windowMs: 3600000, maxRequests: 10 },      // 1 hour, 10 req
  BIOMETRIC: { windowMs: 300000, maxRequests: 3 },      // 5 min, 3 req
};
```

### Lock Configurations

```typescript
export const LockConfigs = {
  QUICK: { ttl: 5000, retryAttempts: 3 },      // 5 seconds
  STANDARD: { ttl: 30000, retryAttempts: 3 },   // 30 seconds
  PAYMENT: { ttl: 60000, retryAttempts: 2 },    // 1 minute
  BIOMETRIC: { ttl: 45000, retryAttempts: 1 },  // 45 seconds
};
```

## 📊 Monitoring

### Health Check Endpoint

```bash
# Check Redis health
curl http://localhost:3000/api/health/redis

# Get Prometheus metrics
curl -X POST http://localhost:3000/api/health/redis
```

### Management Tools

- **Redis Commander**: http://localhost:8081
- **RedisInsight**: http://localhost:8001
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001

### Key Metrics

- Connection status and latency
- Memory usage and fragmentation
- Cache hit/miss rates
- Active sessions and locks
- Rate limiting statistics
- Pub/Sub channel activity

## 🏗️ High Availability

### Redis Sentinel

```bash
# Start with Sentinel
docker-compose --profile ha up -d

# Configure environment
REDIS_SENTINEL_HOSTS=localhost:26379
REDIS_SENTINEL_NAME=mymaster
```

### Redis Cluster

```bash
# Start cluster nodes
docker-compose --profile cluster up -d

# Initialize cluster
docker exec facepay-redis-cluster-1 redis-cli --cluster create \
  redis-cluster-1:6379 redis-cluster-2:6379 redis-cluster-3:6379 \
  --cluster-replicas 0 --cluster-yes

# Configure environment
REDIS_CLUSTER_NODES=localhost:7000,localhost:7001,localhost:7002
```

## 🔒 Security

### Authentication

- Password-protected Redis instances
- Client SSL/TLS support
- Network isolation with Docker

### Data Protection

- Encryption at rest (Redis Enterprise)
- Memory encryption
- Secure key management

### Access Control

- Redis ACL support
- Role-based permissions
- IP allowlisting

## 🧪 Testing

### Unit Tests

```bash
# Test Redis connection
npm test -- redis-connection

# Test cache operations
npm test -- cache-operations

# Test session management
npm test -- session-store
```

### Load Testing

```bash
# Redis performance test
redis-benchmark -h localhost -p 6379 -a facepay123

# Application load test
artillery run load-tests/redis-cache.yml
```

## 🚀 Deployment

### Production Considerations

1. **Resource Allocation**
   - Memory: 4-8GB minimum
   - CPU: 2-4 cores
   - Network: Low latency connection

2. **Persistence**
   - Enable AOF for durability
   - Regular RDB snapshots
   - Backup to external storage

3. **Monitoring**
   - Set up alerting
   - Monitor memory usage
   - Track performance metrics

### Scaling

1. **Vertical Scaling**
   - Increase memory and CPU
   - Optimize Redis configuration
   - Use faster storage

2. **Horizontal Scaling**
   - Redis Cluster
   - Read replicas
   - Sharding strategies

## 🐛 Troubleshooting

### Common Issues

1. **Connection Timeouts**
   ```bash
   # Check Redis status
   docker exec facepay-redis redis-cli ping
   
   # Check logs
   docker logs facepay-redis
   ```

2. **Memory Issues**
   ```bash
   # Check memory usage
   docker exec facepay-redis redis-cli INFO memory
   
   # Set memory policy
   docker exec facepay-redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```

3. **Performance Issues**
   ```bash
   # Monitor slow queries
   docker exec facepay-redis redis-cli SLOWLOG GET 10
   
   # Check fragmentation
   docker exec facepay-redis redis-cli INFO memory | grep fragmentation
   ```

### Maintenance Tasks

```bash
# Clean up expired sessions
node -e "require('./src/services/session-store').sessionCleanupJob()"

# Clean up expired locks
node -e "require('./src/services/distributed-lock').lockCleanupJob()"

# Cache statistics
curl http://localhost:3000/api/health/redis | jq '.details.metrics'
```

## 📚 Additional Resources

- [Redis Documentation](https://redis.io/documentation)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [ioredis Documentation](https://github.com/luin/ioredis)
- [FacePay Architecture Guide](./ARCHITECTURE.md)

---

**Note**: This Redis infrastructure is production-ready and includes comprehensive error handling, monitoring, and high availability features. Always review and adjust configurations based on your specific requirements and load patterns.