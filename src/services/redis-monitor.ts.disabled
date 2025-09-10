import { getRedisClient, getRedisHealth } from '@/lib/redis';
import { getCacheManager } from '@/lib/cache';
import { getSessionStore } from './session-store';
import { getRateLimiter } from './rate-limiter';
import { getDistributedLockManager } from './distributed-lock';
import { getPubSubManager } from './pubsub';

export interface RedisMetrics {
  connection: {
    status: 'connected' | 'disconnected' | 'error';
    uptime: number;
    latency: number;
    version: string;
  };
  memory: {
    used: string;
    peak: string;
    fragmentation: number;
    efficiency: number;
  };
  performance: {
    commandsPerSecond: number;
    hitRate: number;
    missRate: number;
    keyspaceHits: number;
    keyspaceMisses: number;
  };
  cache: {
    totalKeys: number;
    hitRate: number;
    strategies: string[];
  };
  sessions: {
    total: number;
    active: number;
    expired: number;
    uniqueUsers: number;
  };
  rateLimiting: {
    totalKeys: number;
    activeWindows: number;
    topKeys: Array<{ key: string; requests: number }>;
  };
  locks: {
    activeLocks: number;
    lockTypes: Record<string, number>;
  };
  pubsub: {
    channels: number;
    subscribers: number;
    messagesPerSecond: number;
  };
}

export interface AlertConfig {
  memoryUsageThreshold: number; // Percentage
  latencyThreshold: number; // Milliseconds
  hitRateThreshold: number; // Percentage
  connectionDownThreshold: number; // Minutes
  locksThreshold: number; // Number of locks
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
  metadata: any;
}

/**
 * Redis Monitoring and Health Check Service for FacePay
 */
export class RedisMonitor {
  private redis: ReturnType<typeof getRedisClient>;
  private cache: ReturnType<typeof getCacheManager>;
  private sessionStore: ReturnType<typeof getSessionStore>;
  private rateLimiter: ReturnType<typeof getRateLimiter>;
  private lockManager: ReturnType<typeof getDistributedLockManager>;
  private pubsub: ReturnType<typeof getPubSubManager>;
  
  private alerts: Map<string, Alert> = new Map();
  private metricsHistory: RedisMetrics[] = [];
  private maxHistorySize: number = 100;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;

  private defaultAlertConfig: AlertConfig = {
    memoryUsageThreshold: 80, // 80%
    latencyThreshold: 100, // 100ms
    hitRateThreshold: 70, // 70%
    connectionDownThreshold: 5, // 5 minutes
    locksThreshold: 50, // 50 active locks
  };

  constructor(alertConfig: Partial<AlertConfig> = {}) {
    this.redis = getRedisClient();
    this.cache = getCacheManager();
    this.sessionStore = getSessionStore();
    this.rateLimiter = getRateLimiter();
    this.lockManager = getDistributedLockManager();
    this.pubsub = getPubSubManager();
    
    this.defaultAlertConfig = { ...this.defaultAlertConfig, ...alertConfig };
  }

  /**
   * Start monitoring Redis metrics
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      console.log('⚠️ Redis monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    console.log('🔍 Starting Redis monitoring...');

    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.storeMetrics(metrics);
        await this.checkAlerts(metrics);
      } catch (error) {
        console.error('Redis monitoring error:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.isMonitoring = false;
    console.log('🛑 Redis monitoring stopped');
  }

  /**
   * Collect comprehensive Redis metrics
   */
  async collectMetrics(): Promise<RedisMetrics> {
    try {
      // Get Redis server info
      const info = await this.redis.info();
      const infoLines = this.parseInfo(info);
      
      // Get health data
      const healthData = await getRedisHealth();

      // Get cache stats
      const cacheStats = await this.cache.getStats();

      // Get session stats
      const sessionStats = await this.sessionStore.getSessionStats();

      // Get rate limiting stats
      const rateLimitStats = await this.rateLimiter.getStats();

      // Get lock stats
      const activeLocks = await this.lockManager.getActiveLocks();
      const lockTypes = this.categorizeLocks(activeLocks);

      // Calculate performance metrics
      const keyspaceHits = parseInt(infoLines.keyspace_hits || '0', 10);
      const keyspaceMisses = parseInt(infoLines.keyspace_misses || '0', 10);
      const totalCommands = keyspaceHits + keyspaceMisses;
      const hitRate = totalCommands > 0 ? (keyspaceHits / totalCommands) * 100 : 0;
      const missRate = totalCommands > 0 ? (keyspaceMisses / totalCommands) * 100 : 0;

      const metrics: RedisMetrics = {
        connection: {
          status: healthData.status === 'healthy' ? 'connected' : 'error',
          uptime: parseInt(infoLines.uptime_in_seconds || '0', 10),
          latency: healthData.latency,
          version: healthData.version,
        },
        memory: {
          used: healthData.memory,
          peak: infoLines.used_memory_peak_human || 'unknown',
          fragmentation: parseFloat(infoLines.mem_fragmentation_ratio || '1'),
          efficiency: parseFloat(infoLines.mem_efficiency_ratio || '1') * 100,
        },
        performance: {
          commandsPerSecond: parseInt(infoLines.instantaneous_ops_per_sec || '0', 10),
          hitRate: Math.round(hitRate * 100) / 100,
          missRate: Math.round(missRate * 100) / 100,
          keyspaceHits,
          keyspaceMisses,
        },
        cache: {
          totalKeys: cacheStats.totalKeys,
          hitRate: cacheStats.hitRate,
          strategies: ['API_RESPONSE', 'DATABASE_QUERY', 'USER_SESSION', 'STATIC_DATA'],
        },
        sessions: {
          total: sessionStats.totalSessions,
          active: sessionStats.activeSessions,
          expired: sessionStats.expiredSessions,
          uniqueUsers: sessionStats.uniqueUsers,
        },
        rateLimiting: {
          totalKeys: rateLimitStats.totalKeys,
          activeWindows: rateLimitStats.activeWindows,
          topKeys: rateLimitStats.topKeys,
        },
        locks: {
          activeLocks: activeLocks.length,
          lockTypes,
        },
        pubsub: {
          channels: parseInt(infoLines.pubsub_channels || '0', 10),
          subscribers: parseInt(infoLines.connected_clients || '0', 10),
          messagesPerSecond: 0, // Would need historical data to calculate
        },
      };

      return metrics;
    } catch (error) {
      console.error('Error collecting Redis metrics:', error);
      throw error;
    }
  }

  /**
   * Check for alerts based on metrics
   */
  private async checkAlerts(metrics: RedisMetrics): Promise<void> {
    const config = this.defaultAlertConfig;

    // Connection status alert
    if (metrics.connection.status !== 'connected') {
      this.createAlert('connection_down', 'critical', 'Redis connection is down', {
        status: metrics.connection.status,
        latency: metrics.connection.latency,
      });
    } else {
      this.resolveAlert('connection_down');
    }

    // High latency alert
    if (metrics.connection.latency > config.latencyThreshold) {
      this.createAlert('high_latency', 'warning', 
        `Redis latency is high: ${metrics.connection.latency}ms`, {
        latency: metrics.connection.latency,
        threshold: config.latencyThreshold,
      });
    } else {
      this.resolveAlert('high_latency');
    }

    // Low hit rate alert
    if (metrics.performance.hitRate < config.hitRateThreshold) {
      this.createAlert('low_hit_rate', 'warning',
        `Cache hit rate is low: ${metrics.performance.hitRate}%`, {
        hitRate: metrics.performance.hitRate,
        threshold: config.hitRateThreshold,
      });
    } else {
      this.resolveAlert('low_hit_rate');
    }

    // Memory usage alert (if we can calculate percentage)
    if (metrics.memory.fragmentation > 1.5) {
      this.createAlert('memory_fragmentation', 'warning',
        `Memory fragmentation is high: ${metrics.memory.fragmentation}`, {
        fragmentation: metrics.memory.fragmentation,
      });
    } else {
      this.resolveAlert('memory_fragmentation');
    }

    // Too many locks alert
    if (metrics.locks.activeLocks > config.locksThreshold) {
      this.createAlert('too_many_locks', 'error',
        `Too many active locks: ${metrics.locks.activeLocks}`, {
        activeLocks: metrics.locks.activeLocks,
        threshold: config.locksThreshold,
      });
    } else {
      this.resolveAlert('too_many_locks');
    }
  }

  /**
   * Create or update an alert
   */
  private createAlert(id: string, type: Alert['type'], message: string, metadata: any): void {
    const existingAlert = this.alerts.get(id);
    
    if (!existingAlert || existingAlert.resolved) {
      const alert: Alert = {
        id,
        type,
        message,
        timestamp: Date.now(),
        resolved: false,
        metadata,
      };

      this.alerts.set(id, alert);
      console.log(`🚨 Redis Alert [${type.toUpperCase()}]: ${message}`);
    }
  }

  /**
   * Resolve an alert
   */
  private resolveAlert(id: string): void {
    const alert = this.alerts.get(id);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      console.log(`✅ Redis Alert Resolved: ${alert.message}`);
    }
  }

  /**
   * Store metrics in history
   */
  private storeMetrics(metrics: RedisMetrics): void {
    this.metricsHistory.push({
      ...metrics,
      // Add timestamp to metrics
      timestamp: Date.now(),
    } as any);

    // Keep only recent metrics
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get current metrics
   */
  async getCurrentMetrics(): Promise<RedisMetrics> {
    return this.collectMetrics();
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): RedisMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts (including resolved)
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear resolved alerts
   */
  clearResolvedAlerts(): void {
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.resolved) {
        this.alerts.delete(id);
      }
    }
  }

  /**
   * Export metrics for external monitoring systems
   */
  async exportMetrics(): Promise<string> {
    const metrics = await this.getCurrentMetrics();
    
    // Format as Prometheus metrics
    const prometheusMetrics = [
      `# Redis Connection Metrics`,
      `redis_connection_status{status="${metrics.connection.status}"} ${metrics.connection.status === 'connected' ? 1 : 0}`,
      `redis_connection_latency_ms ${metrics.connection.latency}`,
      `redis_connection_uptime_seconds ${metrics.connection.uptime}`,
      ``,
      `# Redis Memory Metrics`,
      `redis_memory_fragmentation_ratio ${metrics.memory.fragmentation}`,
      `redis_memory_efficiency_ratio ${metrics.memory.efficiency}`,
      ``,
      `# Redis Performance Metrics`,
      `redis_commands_per_second ${metrics.performance.commandsPerSecond}`,
      `redis_keyspace_hits_total ${metrics.performance.keyspaceHits}`,
      `redis_keyspace_misses_total ${metrics.performance.keyspaceMisses}`,
      `redis_hit_rate_percent ${metrics.performance.hitRate}`,
      ``,
      `# FacePay Cache Metrics`,
      `facepay_cache_total_keys ${metrics.cache.totalKeys}`,
      `facepay_cache_hit_rate_percent ${metrics.cache.hitRate}`,
      ``,
      `# FacePay Sessions Metrics`,
      `facepay_sessions_total ${metrics.sessions.total}`,
      `facepay_sessions_active ${metrics.sessions.active}`,
      `facepay_sessions_expired ${metrics.sessions.expired}`,
      `facepay_sessions_unique_users ${metrics.sessions.uniqueUsers}`,
      ``,
      `# FacePay Rate Limiting Metrics`,
      `facepay_rate_limit_total_keys ${metrics.rateLimiting.totalKeys}`,
      `facepay_rate_limit_active_windows ${metrics.rateLimiting.activeWindows}`,
      ``,
      `# FacePay Locks Metrics`,
      `facepay_locks_active ${metrics.locks.activeLocks}`,
    ];

    return prometheusMetrics.join('\n');
  }

  /**
   * Parse Redis INFO output
   */
  private parseInfo(info: string): Record<string, string> {
    const lines = info.split('\r\n');
    const parsed: Record<string, string> = {};

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        parsed[key] = value;
      }
    }

    return parsed;
  }

  /**
   * Categorize locks by type
   */
  private categorizeLocks(locks: any[]): Record<string, number> {
    const categories: Record<string, number> = {};

    for (const lock of locks) {
      const category = this.getLockCategory(lock.resource);
      categories[category] = (categories[category] || 0) + 1;
    }

    return categories;
  }

  /**
   * Get lock category from resource name
   */
  private getLockCategory(resource: string): string {
    if (resource.includes('payment')) return 'payment';
    if (resource.includes('user')) return 'user';
    if (resource.includes('biometric')) return 'biometric';
    if (resource.includes('webauthn')) return 'webauthn';
    if (resource.includes('session')) return 'session';
    if (resource.includes('cache')) return 'cache';
    if (resource.includes('system')) return 'system';
    return 'other';
  }
}

// Singleton instance
let redisMonitor: RedisMonitor | null = null;

/**
 * Get the global Redis monitor instance
 */
export function getRedisMonitor(): RedisMonitor {
  if (!redisMonitor) {
    redisMonitor = new RedisMonitor();
  }
  return redisMonitor;
}

/**
 * Initialize Redis monitoring
 */
export async function initializeRedisMonitoring(intervalMs: number = 30000): Promise<void> {
  const monitor = getRedisMonitor();
  monitor.startMonitoring(intervalMs);
  console.log('🔍 Redis monitoring initialized');
}

/**
 * Create health check endpoint data
 */
export async function getRedisHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: RedisMetrics;
  alerts: Alert[];
  timestamp: number;
}> {
  const monitor = getRedisMonitor();
  const metrics = await monitor.getCurrentMetrics();
  const alerts = monitor.getActiveAlerts();

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (metrics.connection.status !== 'connected') {
    status = 'unhealthy';
  } else if (alerts.some(alert => alert.type === 'error' || alert.type === 'critical')) {
    status = 'degraded';
  }

  return {
    status,
    metrics,
    alerts,
    timestamp: Date.now(),
  };
}

export default {
  RedisMonitor,
  getRedisMonitor,
  initializeRedisMonitoring,
  getRedisHealthCheck,
};