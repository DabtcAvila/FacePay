import { getRedisSubscriber, getRedisPublisher } from '@/lib/redis';
import { Redis } from 'ioredis';
import EventEmitter from 'events';

export interface PubSubMessage {
  channel: string;
  data: any;
  timestamp: number;
  messageId: string;
  userId?: string;
  sessionId?: string;
  type: string;
}

export interface SubscriptionOptions {
  pattern?: boolean; // Whether to use pattern subscription
  userId?: string; // Filter messages for specific user
  sessionId?: string; // Filter messages for specific session
}

export interface PublishOptions {
  userId?: string;
  sessionId?: string;
  persist?: boolean; // Whether to persist message for offline users
  ttl?: number; // Message TTL if persisted
}

/**
 * Redis Pub/Sub Manager for real-time features in FacePay
 */
export class PubSubManager extends EventEmitter {
  private subscriber: Redis;
  private publisher: Redis;
  private subscriptions: Map<string, Set<string>> = new Map(); // channel -> subscribers
  private userChannels: Map<string, Set<string>> = new Map(); // userId -> channels
  private isConnected: boolean = false;

  constructor() {
    super();
    this.subscriber = getRedisSubscriber();
    this.publisher = getRedisPublisher();
    this.setupSubscriber();
  }

  /**
   * Setup Redis subscriber event handlers
   */
  private setupSubscriber(): void {
    this.subscriber.on('connect', () => {
      console.log('✅ PubSub subscriber connected');
      this.isConnected = true;
      this.emit('connected');
    });

    this.subscriber.on('error', (error) => {
      console.error('❌ PubSub subscriber error:', error);
      this.isConnected = false;
      this.emit('error', error);
    });

    this.subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message, false);
    });

    this.subscriber.on('pmessage', (pattern, channel, message) => {
      this.handleMessage(channel, message, true);
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(channel: string, message: string, isPattern: boolean): void {
    try {
      const parsedMessage: PubSubMessage = JSON.parse(message);
      
      console.log(`📨 Received message on channel: ${channel}`, {
        type: parsedMessage.type,
        timestamp: parsedMessage.timestamp,
        messageId: parsedMessage.messageId,
      });

      // Emit the message to application event handlers
      this.emit('message', parsedMessage);
      this.emit(`channel:${channel}`, parsedMessage);
      
      if (parsedMessage.type) {
        this.emit(`type:${parsedMessage.type}`, parsedMessage);
      }

      if (parsedMessage.userId) {
        this.emit(`user:${parsedMessage.userId}`, parsedMessage);
      }

      if (parsedMessage.sessionId) {
        this.emit(`session:${parsedMessage.sessionId}`, parsedMessage);
      }
    } catch (error) {
      console.error('Error parsing PubSub message:', error);
    }
  }

  /**
   * Publish a message to a channel
   */
  async publish(
    channel: string,
    type: string,
    data: any,
    options: PublishOptions = {}
  ): Promise<boolean> {
    try {
      const message: PubSubMessage = {
        channel,
        type,
        data,
        timestamp: Date.now(),
        messageId: this.generateMessageId(),
        userId: options.userId,
        sessionId: options.sessionId,
      };

      const messageString = JSON.stringify(message);
      const result = await this.publisher.publish(channel, messageString);

      // Persist message if requested (for offline users)
      if (options.persist && options.userId) {
        await this.persistMessage(message, options.ttl || 86400); // 24 hours default
      }

      console.log(`📤 Published message to channel: ${channel}`, {
        type,
        subscribers: result,
        messageId: message.messageId,
      });

      return result > 0;
    } catch (error) {
      console.error('Publish error:', error);
      return false;
    }
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(
    channel: string,
    options: SubscriptionOptions = {}
  ): Promise<boolean> {
    try {
      if (options.pattern) {
        await this.subscriber.psubscribe(channel);
      } else {
        await this.subscriber.subscribe(channel);
      }

      // Track subscription
      if (!this.subscriptions.has(channel)) {
        this.subscriptions.set(channel, new Set());
      }

      const subscriberId = this.generateSubscriberId();
      this.subscriptions.get(channel)!.add(subscriberId);

      // Track user channels
      if (options.userId) {
        if (!this.userChannels.has(options.userId)) {
          this.userChannels.set(options.userId, new Set());
        }
        this.userChannels.get(options.userId)!.add(channel);
      }

      console.log(`📥 Subscribed to channel: ${channel}`, {
        pattern: options.pattern,
        userId: options.userId,
        subscriberId,
      });

      return true;
    } catch (error) {
      console.error('Subscribe error:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string, pattern: boolean = false): Promise<boolean> {
    try {
      if (pattern) {
        await this.subscriber.punsubscribe(channel);
      } else {
        await this.subscriber.unsubscribe(channel);
      }

      // Remove tracking
      this.subscriptions.delete(channel);

      // Remove from user channels
      for (const [userId, channels] of this.userChannels.entries()) {
        channels.delete(channel);
        if (channels.size === 0) {
          this.userChannels.delete(userId);
        }
      }

      console.log(`📤 Unsubscribed from channel: ${channel}`);
      return true;
    } catch (error) {
      console.error('Unsubscribe error:', error);
      return false;
    }
  }

  /**
   * Get persisted messages for a user
   */
  async getPersistedMessages(userId: string, limit: number = 50): Promise<PubSubMessage[]> {
    try {
      const key = `facepay:pubsub:persisted:${userId}`;
      const messages = await this.publisher.lrange(key, 0, limit - 1);
      
      return messages.map(msg => {
        try {
          return JSON.parse(msg);
        } catch {
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      console.error('Get persisted messages error:', error);
      return [];
    }
  }

  /**
   * Clear persisted messages for a user
   */
  async clearPersistedMessages(userId: string): Promise<boolean> {
    try {
      const key = `facepay:pubsub:persisted:${userId}`;
      await this.publisher.del(key);
      return true;
    } catch (error) {
      console.error('Clear persisted messages error:', error);
      return false;
    }
  }

  /**
   * Get active subscriptions
   */
  getSubscriptions(): Map<string, Set<string>> {
    return new Map(this.subscriptions);
  }

  /**
   * Get user channels
   */
  getUserChannels(userId: string): Set<string> {
    return this.userChannels.get(userId) || new Set();
  }

  /**
   * Check if connected
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Persist message for offline users
   */
  private async persistMessage(message: PubSubMessage, ttl: number): Promise<void> {
    if (!message.userId) return;

    try {
      const key = `facepay:pubsub:persisted:${message.userId}`;
      const messageString = JSON.stringify(message);
      
      // Add to list and set TTL
      await this.publisher.multi()
        .lpush(key, messageString)
        .ltrim(key, 0, 99) // Keep last 100 messages
        .expire(key, ttl)
        .exec();
    } catch (error) {
      console.error('Persist message error:', error);
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate subscriber ID
   */
  private generateSubscriberId(): string {
    return `sub-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
let pubsubManager: PubSubManager | null = null;

/**
 * Get the global PubSub manager instance
 */
export function getPubSubManager(): PubSubManager {
  if (!pubsubManager) {
    pubsubManager = new PubSubManager();
  }
  return pubsubManager;
}

/**
 * Real-time notification service
 */
export class NotificationService {
  private pubsub: PubSubManager;

  constructor() {
    this.pubsub = getPubSubManager();
  }

  /**
   * Send notification to a specific user
   */
  async notifyUser(
    userId: string,
    type: string,
    data: any,
    options: { persist?: boolean; ttl?: number } = {}
  ): Promise<boolean> {
    const channel = PubSubChannels.USER_NOTIFICATION(userId);
    return this.pubsub.publish(channel, type, data, {
      userId,
      ...options,
    });
  }

  /**
   * Send notification to a session
   */
  async notifySession(
    sessionId: string,
    type: string,
    data: any
  ): Promise<boolean> {
    const channel = PubSubChannels.SESSION_NOTIFICATION(sessionId);
    return this.pubsub.publish(channel, type, data, { sessionId });
  }

  /**
   * Broadcast system notification
   */
  async broadcastSystem(type: string, data: any): Promise<boolean> {
    return this.pubsub.publish(PubSubChannels.SYSTEM_BROADCAST, type, data);
  }

  /**
   * Send payment status update
   */
  async notifyPaymentStatus(
    userId: string,
    paymentId: string,
    status: string,
    data: any
  ): Promise<boolean> {
    return this.notifyUser(userId, 'payment_status', {
      paymentId,
      status,
      ...data,
    }, { persist: true });
  }

  /**
   * Send biometric verification result
   */
  async notifyBiometricResult(
    sessionId: string,
    success: boolean,
    data: any
  ): Promise<boolean> {
    return this.notifySession(sessionId, 'biometric_result', {
      success,
      ...data,
    });
  }

  /**
   * Send WebAuthn authentication result
   */
  async notifyWebAuthnResult(
    sessionId: string,
    success: boolean,
    data: any
  ): Promise<boolean> {
    return this.notifySession(sessionId, 'webauthn_result', {
      success,
      ...data,
    });
  }
}

/**
 * Real-time activity tracker
 */
export class ActivityTracker {
  private pubsub: PubSubManager;

  constructor() {
    this.pubsub = getPubSubManager();
  }

  /**
   * Track user activity
   */
  async trackActivity(
    userId: string,
    activity: string,
    metadata: any = {}
  ): Promise<boolean> {
    return this.pubsub.publish(
      PubSubChannels.USER_ACTIVITY,
      'activity',
      {
        userId,
        activity,
        metadata,
        timestamp: Date.now(),
      }
    );
  }

  /**
   * Track payment activity
   */
  async trackPayment(
    userId: string,
    paymentId: string,
    action: string,
    amount: number,
    currency: string
  ): Promise<boolean> {
    return this.trackActivity(userId, 'payment', {
      paymentId,
      action,
      amount,
      currency,
    });
  }

  /**
   * Track security event
   */
  async trackSecurityEvent(
    userId: string,
    event: string,
    severity: 'low' | 'medium' | 'high',
    details: any
  ): Promise<boolean> {
    return this.pubsub.publish(
      PubSubChannels.SECURITY_EVENTS,
      'security_event',
      {
        userId,
        event,
        severity,
        details,
        timestamp: Date.now(),
      }
    );
  }
}

/**
 * Channel definitions for different types of real-time communications
 */
export const PubSubChannels = {
  // User-specific channels
  USER_NOTIFICATION: (userId: string) => `user:${userId}:notifications`,
  USER_ACTIVITY: 'user:activity',
  
  // Session-specific channels
  SESSION_NOTIFICATION: (sessionId: string) => `session:${sessionId}:notifications`,
  
  // System channels
  SYSTEM_BROADCAST: 'system:broadcast',
  SYSTEM_MAINTENANCE: 'system:maintenance',
  
  // Payment channels
  PAYMENT_STATUS: 'payments:status',
  PAYMENT_WEBHOOKS: 'payments:webhooks',
  
  // Biometric channels
  BIOMETRIC_RESULTS: 'biometric:results',
  FACE_DETECTION: 'biometric:face_detection',
  
  // WebAuthn channels
  WEBAUTHN_CHALLENGES: 'webauthn:challenges',
  WEBAUTHN_RESULTS: 'webauthn:results',
  
  // Security channels
  SECURITY_EVENTS: 'security:events',
  FRAUD_ALERTS: 'security:fraud_alerts',
  
  // Cache channels
  CACHE_INVALIDATION: 'cache:invalidation',
  
  // Real-time data channels
  ANALYTICS: 'analytics:realtime',
  HEALTH_CHECKS: 'system:health',
} as const;

/**
 * Message types for type-safe communication
 */
export const MessageTypes = {
  // Payment messages
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_REFUNDED: 'payment_refunded',
  
  // Authentication messages
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  
  // Biometric messages
  BIOMETRIC_VERIFICATION_START: 'biometric_verification_start',
  BIOMETRIC_VERIFICATION_SUCCESS: 'biometric_verification_success',
  BIOMETRIC_VERIFICATION_FAILED: 'biometric_verification_failed',
  
  // WebAuthn messages
  WEBAUTHN_CHALLENGE_READY: 'webauthn_challenge_ready',
  WEBAUTHN_VERIFICATION_SUCCESS: 'webauthn_verification_success',
  WEBAUTHN_VERIFICATION_FAILED: 'webauthn_verification_failed',
  
  // System messages
  SYSTEM_MAINTENANCE_START: 'system_maintenance_start',
  SYSTEM_MAINTENANCE_END: 'system_maintenance_end',
  SYSTEM_ERROR: 'system_error',
  
  // Security messages
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  ACCOUNT_LOCKED: 'account_locked',
  FRAUD_DETECTED: 'fraud_detected',
} as const;

/**
 * Initialize PubSub system
 */
export async function initializePubSub(): Promise<void> {
  const pubsub = getPubSubManager();
  
  // Subscribe to system channels
  await pubsub.subscribe(PubSubChannels.SYSTEM_BROADCAST);
  await pubsub.subscribe(PubSubChannels.CACHE_INVALIDATION);
  await pubsub.subscribe(PubSubChannels.SECURITY_EVENTS);
  
  console.log('🚀 PubSub system initialized');
}

/**
 * Cleanup PubSub connections
 */
export async function cleanupPubSub(): Promise<void> {
  if (pubsubManager) {
    // Unsubscribe from all channels
    const subscriptions = pubsubManager.getSubscriptions();
    for (const channel of subscriptions.keys()) {
      await pubsubManager.unsubscribe(channel);
    }
    
    console.log('🧹 PubSub cleanup completed');
  }
}

// Export singleton instances
export const notificationService = new NotificationService();
export const activityTracker = new ActivityTracker();

export default {
  PubSubManager,
  getPubSubManager,
  NotificationService,
  ActivityTracker,
  PubSubChannels,
  MessageTypes,
  initializePubSub,
  cleanupPubSub,
  notificationService,
  activityTracker,
};