import { getRedisClient, REDIS_KEYS } from '@/lib/redis';
import { getCacheManager, CacheStrategies } from '@/lib/cache';
import { Redis, Cluster } from 'ioredis';
import { randomBytes } from 'crypto';

export interface SessionData {
  userId?: string;
  email?: string;
  username?: string;
  role?: string;
  permissions?: string[];
  biometricVerified?: boolean;
  webauthnVerified?: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;
  metadata?: Record<string, any>;
}

export interface SessionOptions {
  maxAge?: number; // Session duration in seconds
  rolling?: boolean; // Extend session on each access
  secure?: boolean; // Require HTTPS
  httpOnly?: boolean; // Prevent XSS attacks
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Redis-based session store for FacePay
 */
export class SessionStore {
  private redis: Redis | Cluster;
  private cache: ReturnType<typeof getCacheManager>;
  private defaultMaxAge: number;
  private keyPrefix: string;

  constructor(options: {
    maxAge?: number;
    keyPrefix?: string;
  } = {}) {
    this.redis = getRedisClient();
    this.cache = getCacheManager();
    this.defaultMaxAge = options.maxAge || 3600; // 1 hour default
    this.keyPrefix = options.keyPrefix || 'facepay:session';
  }

  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    sessionData: Partial<SessionData> = {},
    options: SessionOptions = {}
  ): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      const maxAge = options.maxAge || this.defaultMaxAge;
      const now = Date.now();

      const session: SessionData = {
        userId,
        ...sessionData,
        createdAt: now,
        lastAccessedAt: now,
        expiresAt: now + (maxAge * 1000),
      };

      const sessionKey = REDIS_KEYS.SESSION(sessionId);
      const userSessionKey = REDIS_KEYS.USER_SESSION(userId);

      // Store session data
      await Promise.all([
        this.redis.setex(sessionKey, maxAge, JSON.stringify(session)),
        this.redis.setex(userSessionKey, maxAge, sessionId),
      ]);

      // Cache session data for faster access
      await this.cache.set(
        `session:${sessionId}`,
        session,
        {
          ...CacheStrategies.USER_SESSION,
          ttl: Math.min(maxAge, CacheStrategies.USER_SESSION.ttl!),
        }
      );

      console.log(`✅ Session created for user ${userId}: ${sessionId}`);
      return sessionId;
    } catch (error) {
      console.error('Session creation error:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Get session data by session ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      // Try cache first
      const cached = await this.cache.get<SessionData>(`session:${sessionId}`);
      if (cached) {
        // Check if session is expired
        if (cached.expiresAt < Date.now()) {
          await this.deleteSession(sessionId);
          return null;
        }
        return cached;
      }

      // Fallback to Redis
      const sessionKey = REDIS_KEYS.SESSION(sessionId);
      const sessionData = await this.redis.get(sessionKey);

      if (!sessionData) {
        return null;
      }

      const session: SessionData = JSON.parse(sessionData);

      // Check if session is expired
      if (session.expiresAt < Date.now()) {
        await this.deleteSession(sessionId);
        return null;
      }

      // Update cache
      await this.cache.set(`session:${sessionId}`, session, CacheStrategies.USER_SESSION);

      return session;
    } catch (error) {
      console.error('Session retrieval error:', error);
      return null;
    }
  }

  /**
   * Update session data
   */
  async updateSession(
    sessionId: string,
    updates: Partial<SessionData>,
    options: { rolling?: boolean } = {}
  ): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      const now = Date.now();
      const updatedSession: SessionData = {
        ...session,
        ...updates,
        lastAccessedAt: now,
      };

      // Extend session if rolling is enabled
      if (options.rolling) {
        const maxAge = Math.floor((session.expiresAt - session.createdAt) / 1000);
        updatedSession.expiresAt = now + (maxAge * 1000);
      }

      const sessionKey = REDIS_KEYS.SESSION(sessionId);
      const ttl = Math.floor((updatedSession.expiresAt - now) / 1000);

      if (ttl <= 0) {
        await this.deleteSession(sessionId);
        return false;
      }

      // Update Redis and cache
      await Promise.all([
        this.redis.setex(sessionKey, ttl, JSON.stringify(updatedSession)),
        this.cache.set(`session:${sessionId}`, updatedSession, CacheStrategies.USER_SESSION),
      ]);

      return true;
    } catch (error) {
      console.error('Session update error:', error);
      return false;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      const sessionKey = REDIS_KEYS.SESSION(sessionId);
      const userSessionKey = REDIS_KEYS.USER_SESSION(session.userId!);

      // Delete from Redis and cache
      await Promise.all([
        this.redis.del(sessionKey),
        this.redis.del(userSessionKey),
        this.cache.delete(`session:${sessionId}`),
      ]);

      console.log(`🗑️  Session deleted: ${sessionId}`);
      return true;
    } catch (error) {
      console.error('Session deletion error:', error);
      return false;
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<number> {
    try {
      const pattern = `${this.keyPrefix}:*`;
      const keys = await this.redis.keys(pattern);
      let deletedCount = 0;

      for (const key of keys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session: SessionData = JSON.parse(sessionData);
          if (session.userId === userId) {
            await this.redis.del(key);
            const sessionId = key.replace(`${this.keyPrefix}:`, '');
            await this.cache.delete(`session:${sessionId}`);
            deletedCount++;
          }
        }
      }

      // Clear user session mapping
      await this.redis.del(REDIS_KEYS.USER_SESSION(userId));

      console.log(`🗑️  Deleted ${deletedCount} sessions for user ${userId}`);
      return deletedCount;
    } catch (error) {
      console.error('User sessions deletion error:', error);
      return 0;
    }
  }

  /**
   * Verify session and extend if needed
   */
  async verifyAndExtendSession(
    sessionId: string,
    options: { rolling?: boolean } = {}
  ): Promise<SessionData | null> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return null;
      }

      // Update last accessed time and potentially extend session
      const updated = await this.updateSession(sessionId, {}, options);
      if (!updated) {
        return null;
      }

      return await this.getSession(sessionId);
    } catch (error) {
      console.error('Session verification error:', error);
      return null;
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const pattern = `${this.keyPrefix}:*`;
      const keys = await this.redis.keys(pattern);
      const userSessions: SessionData[] = [];

      for (const key of keys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session: SessionData = JSON.parse(sessionData);
          if (session.userId === userId && session.expiresAt > Date.now()) {
            userSessions.push(session);
          }
        }
      }

      return userSessions.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
    } catch (error) {
      console.error('Get user sessions error:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const pattern = `${this.keyPrefix}:*`;
      const keys = await this.redis.keys(pattern);
      let cleanedCount = 0;

      for (const key of keys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session: SessionData = JSON.parse(sessionData);
          if (session.expiresAt < Date.now()) {
            await this.redis.del(key);
            const sessionId = key.replace(`${this.keyPrefix}:`, '');
            await this.cache.delete(`session:${sessionId}`);
            cleanedCount++;
          }
        }
      }

      console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
      return cleanedCount;
    } catch (error) {
      console.error('Session cleanup error:', error);
      return 0;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    uniqueUsers: number;
  }> {
    try {
      const pattern = `${this.keyPrefix}:*`;
      const keys = await this.redis.keys(pattern);
      
      let totalSessions = 0;
      let activeSessions = 0;
      let expiredSessions = 0;
      const uniqueUsers = new Set<string>();
      const now = Date.now();

      for (const key of keys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          totalSessions++;
          const session: SessionData = JSON.parse(sessionData);
          
          if (session.expiresAt > now) {
            activeSessions++;
            if (session.userId) {
              uniqueUsers.add(session.userId);
            }
          } else {
            expiredSessions++;
          }
        }
      }

      return {
        totalSessions,
        activeSessions,
        expiredSessions,
        uniqueUsers: uniqueUsers.size,
      };
    } catch (error) {
      console.error('Session stats error:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        expiredSessions: 0,
        uniqueUsers: 0,
      };
    }
  }

  /**
   * Store biometric verification state
   */
  async setBiometricVerification(
    sessionId: string,
    verified: boolean,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    return this.updateSession(sessionId, {
      biometricVerified: verified,
      metadata: {
        ...((await this.getSession(sessionId))?.metadata || {}),
        biometric: {
          verified,
          verifiedAt: Date.now(),
          ...metadata,
        },
      },
    });
  }

  /**
   * Store WebAuthn verification state
   */
  async setWebAuthnVerification(
    sessionId: string,
    verified: boolean,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    return this.updateSession(sessionId, {
      webauthnVerified: verified,
      metadata: {
        ...((await this.getSession(sessionId))?.metadata || {}),
        webauthn: {
          verified,
          verifiedAt: Date.now(),
          ...metadata,
        },
      },
    });
  }

  /**
   * Check if session has multi-factor authentication
   */
  async hasMFA(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return !!(session?.biometricVerified || session?.webauthnVerified);
  }

  /**
   * Generate secure session ID
   */
  private generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }
}

// Singleton instance
let sessionStore: SessionStore | null = null;

/**
 * Get the global session store instance
 */
export function getSessionStore(): SessionStore {
  if (!sessionStore) {
    sessionStore = new SessionStore();
  }
  return sessionStore;
}

/**
 * Session middleware for Next.js API routes
 */
export async function withSession<T = any>(
  handler: (req: any, session: SessionData | null) => Promise<T>,
  options: { required?: boolean } = {}
): Promise<(req: any) => Promise<T>> {
  return async function (req: any): Promise<T> {
    const sessionStore = getSessionStore();
    const sessionId = extractSessionId(req);
    
    let session: SessionData | null = null;
    
    if (sessionId) {
      session = await sessionStore.verifyAndExtendSession(sessionId, { rolling: true });
    }
    
    if (options.required && !session) {
      throw new Error('Session required');
    }
    
    return handler(req, session);
  };
}

/**
 * Extract session ID from request
 */
function extractSessionId(req: any): string | null {
  // Try cookie first
  const cookies = req.cookies || {};
  const sessionCookie = cookies['facepay-session'] || cookies['sessionId'];
  
  if (sessionCookie) {
    return sessionCookie;
  }
  
  // Try Authorization header
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try custom header
  return req.headers?.['x-session-id'] || req.headers?.['X-Session-Id'] || null;
}

/**
 * Scheduled job to clean up expired sessions
 */
export async function sessionCleanupJob(): Promise<void> {
  try {
    const sessionStore = getSessionStore();
    const cleaned = await sessionStore.cleanupExpiredSessions();
    console.log(`🧹 Session cleanup job completed: ${cleaned} sessions cleaned`);
  } catch (error) {
    console.error('❌ Session cleanup job failed:', error);
  }
}

export default {
  SessionStore,
  getSessionStore,
  withSession,
  sessionCleanupJob,
};