export interface PushConfig {
  provider: 'onesignal' | 'firebase' | 'web-push' | 'apns';
  appId?: string; // OneSignal
  restApiKey?: string; // OneSignal
  serviceAccount?: string; // Firebase (path to service account JSON)
  vapidKeys?: {
    publicKey: string;
    privateKey: string;
  }; // Web Push
  apnsConfig?: {
    keyId: string;
    teamId: string;
    bundleId: string;
    keyPath: string;
  }; // APNS
}

export interface PushData {
  tokens: string[];
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: number;
  sound?: string;
  data?: Record<string, any>;
  url?: string; // Deep link or URL to open
}

export interface PushOptions {
  priority?: 'normal' | 'high';
  ttl?: number; // Time to live in seconds
  silent?: boolean;
  collapseKey?: string; // Android
  category?: string; // iOS
  threadId?: string; // iOS
  scheduledAt?: Date;
  filters?: {
    tags?: Record<string, any>;
    segments?: string[];
    locations?: Array<{ lat: number; lng: number; radius: number }>;
  };
}

export interface PushResponse {
  success: boolean;
  messageId?: string;
  successfulTokens?: string[];
  failedTokens?: Array<{ token: string; error: string }>;
  totalSent?: number;
  totalFailed?: number;
}

class PushNotificationService {
  private config: PushConfig;
  private client: any;

  constructor(config: PushConfig) {
    this.config = config;
    this.initializeClient();
  }

  private async initializeClient() {
    switch (this.config.provider) {
      case 'onesignal':
        // OneSignal REST API client
        this.client = {
          appId: this.config.appId,
          restApiKey: this.config.restApiKey,
        };
        break;

      case 'firebase':
        const admin = await import('firebase-admin');
        const serviceAccount = require(this.config.serviceAccount!);
        
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        }
        
        this.client = admin.messaging();
        break;

      case 'web-push':
        const webpush = await import('web-push');
        webpush.setVapidDetails(
          'mailto:your-email@domain.com',
          this.config.vapidKeys!.publicKey,
          this.config.vapidKeys!.privateKey
        );
        this.client = webpush;
        break;

      case 'apns':
        const apn = await import('apn');
        this.client = new apn.Provider({
          token: {
            key: this.config.apnsConfig!.keyPath,
            keyId: this.config.apnsConfig!.keyId,
            teamId: this.config.apnsConfig!.teamId,
          },
          production: process.env.NODE_ENV === 'production',
        });
        break;

      default:
        throw new Error(`Unsupported push provider: ${this.config.provider}`);
    }
  }

  public async send(pushData: PushData, options: PushOptions = {}): Promise<PushResponse> {
    try {
      // Validate tokens
      const validTokens = pushData.tokens.filter(token => this.validateToken(token));
      if (validTokens.length === 0) {
        return {
          success: false,
          totalSent: 0,
          totalFailed: pushData.tokens.length,
          failedTokens: pushData.tokens.map(token => ({ 
            token, 
            error: 'Invalid token format' 
          })),
        };
      }

      switch (this.config.provider) {
        case 'onesignal':
          return this.sendViaOneSignal(pushData, options);

        case 'firebase':
          return this.sendViaFirebase(pushData, options);

        case 'web-push':
          return this.sendViaWebPush(pushData, options);

        case 'apns':
          return this.sendViaAPNS(pushData, options);

        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      return {
        success: false,
        totalSent: 0,
        totalFailed: pushData.tokens.length,
        failedTokens: pushData.tokens.map(token => ({ 
          token, 
          error: error.message 
        })),
      };
    }
  }

  private async sendViaOneSignal(pushData: PushData, options: PushOptions): Promise<PushResponse> {
    const payload = {
      app_id: this.client.appId,
      include_player_ids: pushData.tokens,
      headings: { en: pushData.title },
      contents: { en: pushData.body },
      data: pushData.data,
      url: pushData.url,
      ios_badgeType: 'Increase',
      ios_badgeCount: pushData.badge || 1,
      android_sound: pushData.sound,
      ios_sound: pushData.sound,
      priority: options.priority === 'high' ? 10 : 5,
      ttl: options.ttl,
      send_after: options.scheduledAt?.toISOString(),
      collapse_id: options.collapseKey,
      ios_category: options.category,
      thread_id: options.threadId,
    };

    // Add image if provided
    if (pushData.image) {
      payload['big_picture'] = pushData.image;
      payload['ios_attachments'] = { image: pushData.image };
    }

    // Add icon if provided
    if (pushData.icon) {
      payload['chrome_web_icon'] = pushData.icon;
      payload['android_large_icon'] = pushData.icon;
    }

    try {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.client.restApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: result.id,
          totalSent: result.recipients || 0,
          successfulTokens: pushData.tokens,
        };
      } else {
        return {
          success: false,
          totalSent: 0,
          totalFailed: pushData.tokens.length,
          failedTokens: pushData.tokens.map(token => ({ 
            token, 
            error: result.errors?.join(', ') || 'Unknown error' 
          })),
        };
      }
    } catch (error) {
      throw new Error(`OneSignal error: ${error.message}`);
    }
  }

  private async sendViaFirebase(pushData: PushData, options: PushOptions): Promise<PushResponse> {
    const messages = pushData.tokens.map(token => ({
      token,
      notification: {
        title: pushData.title,
        body: pushData.body,
        imageUrl: pushData.image,
      },
      data: pushData.data ? Object.fromEntries(
        Object.entries(pushData.data).map(([key, value]) => [key, String(value)])
      ) : undefined,
      android: {
        priority: options.priority === 'high' ? 'high' : 'normal',
        ttl: options.ttl ? options.ttl * 1000 : undefined,
        collapseKey: options.collapseKey,
        notification: {
          icon: pushData.icon,
          sound: pushData.sound || 'default',
          imageUrl: pushData.image,
        },
      },
      apns: {
        payload: {
          aps: {
            badge: pushData.badge,
            sound: pushData.sound || 'default',
            category: options.category,
            threadId: options.threadId,
          },
        },
        fcmOptions: {
          imageUrl: pushData.image,
        },
      },
      webpush: {
        headers: {
          Urgency: options.priority === 'high' ? 'high' : 'normal',
          TTL: options.ttl?.toString(),
        },
        notification: {
          icon: pushData.icon,
          image: pushData.image,
          badge: pushData.badge?.toString(),
        },
        fcmOptions: {
          link: pushData.url,
        },
      },
    }));

    try {
      const response = await this.client.sendAll(messages);
      
      const successfulTokens: string[] = [];
      const failedTokens: Array<{ token: string; error: string }> = [];

      response.responses.forEach((resp: any, index: number) => {
        if (resp.success) {
          successfulTokens.push(pushData.tokens[index]);
        } else {
          failedTokens.push({
            token: pushData.tokens[index],
            error: resp.error?.message || 'Unknown error',
          });
        }
      });

      return {
        success: successfulTokens.length > 0,
        totalSent: successfulTokens.length,
        totalFailed: failedTokens.length,
        successfulTokens,
        failedTokens,
      };
    } catch (error) {
      throw new Error(`Firebase error: ${error.message}`);
    }
  }

  private async sendViaWebPush(pushData: PushData, options: PushOptions): Promise<PushResponse> {
    const payload = JSON.stringify({
      title: pushData.title,
      body: pushData.body,
      icon: pushData.icon,
      image: pushData.image,
      badge: pushData.badge,
      data: pushData.data,
      url: pushData.url,
      silent: options.silent,
    });

    const webPushOptions = {
      priority: options.priority,
      TTL: options.ttl,
    };

    const results = await Promise.allSettled(
      pushData.tokens.map(async (subscription) => {
        try {
          const subscriptionObject = typeof subscription === 'string' 
            ? JSON.parse(subscription) 
            : subscription;
          
          await this.client.sendNotification(subscriptionObject, payload, webPushOptions);
          return { token: subscription, success: true };
        } catch (error) {
          return { 
            token: subscription, 
            success: false, 
            error: error.message 
          };
        }
      })
    );

    const successfulTokens: string[] = [];
    const failedTokens: Array<{ token: string; error: string }> = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successfulTokens.push(result.value.token);
        } else {
          failedTokens.push({
            token: result.value.token,
            error: result.value.error,
          });
        }
      } else {
        failedTokens.push({
          token: 'unknown',
          error: result.reason?.message || 'Unknown error',
        });
      }
    });

    return {
      success: successfulTokens.length > 0,
      totalSent: successfulTokens.length,
      totalFailed: failedTokens.length,
      successfulTokens,
      failedTokens,
    };
  }

  private async sendViaAPNS(pushData: PushData, options: PushOptions): Promise<PushResponse> {
    const apn = await import('apn');
    
    const note = new apn.Notification();
    note.alert = {
      title: pushData.title,
      body: pushData.body,
    };
    
    note.badge = pushData.badge;
    note.sound = pushData.sound || 'ping.aiff';
    note.category = options.category;
    note.threadId = options.threadId;
    note.payload = pushData.data || {};
    note.priority = options.priority === 'high' ? 10 : 5;
    note.expiry = options.ttl ? Math.floor(Date.now() / 1000) + options.ttl : undefined;
    note.collapseId = options.collapseKey;
    
    if (pushData.url) {
      note.urlArgs = [pushData.url];
    }

    try {
      const result = await this.client.send(note, pushData.tokens);
      
      const successfulTokens: string[] = [];
      const failedTokens: Array<{ token: string; error: string }> = [];

      if (result.sent && result.sent.length > 0) {
        result.sent.forEach((sent: any) => {
          successfulTokens.push(sent.device);
        });
      }

      if (result.failed && result.failed.length > 0) {
        result.failed.forEach((failed: any) => {
          failedTokens.push({
            token: failed.device,
            error: `${failed.error} - ${failed.response?.reason}`,
          });
        });
      }

      return {
        success: successfulTokens.length > 0,
        totalSent: successfulTokens.length,
        totalFailed: failedTokens.length,
        successfulTokens,
        failedTokens,
      };
    } catch (error) {
      throw new Error(`APNS error: ${error.message}`);
    }
  }

  public async sendToSegments(
    pushData: Omit<PushData, 'tokens'>,
    segments: string[],
    options: PushOptions = {}
  ): Promise<PushResponse> {
    if (this.config.provider !== 'onesignal') {
      throw new Error('Segment targeting is only supported with OneSignal');
    }

    const payload = {
      app_id: this.client.appId,
      included_segments: segments,
      headings: { en: pushData.title },
      contents: { en: pushData.body },
      data: pushData.data,
      url: pushData.url,
      priority: options.priority === 'high' ? 10 : 5,
      ttl: options.ttl,
      send_after: options.scheduledAt?.toISOString(),
    };

    try {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.client.restApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      return {
        success: response.ok,
        messageId: result.id,
        totalSent: result.recipients || 0,
      };
    } catch (error) {
      throw new Error(`OneSignal segment error: ${error.message}`);
    }
  }

  public async scheduleNotification(
    pushData: PushData,
    scheduledAt: Date,
    options: PushOptions = {}
  ): Promise<PushResponse> {
    return this.send(pushData, { ...options, scheduledAt });
  }

  public async cancelScheduledNotification(notificationId: string): Promise<boolean> {
    if (this.config.provider !== 'onesignal') {
      throw new Error('Canceling scheduled notifications is only supported with OneSignal');
    }

    try {
      const response = await fetch(`https://onesignal.com/api/v1/notifications/${notificationId}?app_id=${this.client.appId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${this.client.restApiKey}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error canceling scheduled notification:', error);
      return false;
    }
  }

  public async getNotificationStatus(notificationId: string) {
    if (this.config.provider !== 'onesignal') {
      throw new Error('Getting notification status is only supported with OneSignal');
    }

    try {
      const response = await fetch(`https://onesignal.com/api/v1/notifications/${notificationId}?app_id=${this.client.appId}`, {
        headers: {
          'Authorization': `Basic ${this.client.restApiKey}`,
        },
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Error getting notification status: ${error.message}`);
    }
  }

  private validateToken(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    
    // Basic validation - tokens should be reasonable length
    return token.length > 10 && token.length < 2000;
  }

  public async testConnection(): Promise<boolean> {
    try {
      switch (this.config.provider) {
        case 'onesignal':
          const response = await fetch(`https://onesignal.com/api/v1/apps/${this.client.appId}`, {
            headers: {
              'Authorization': `Basic ${this.client.restApiKey}`,
            },
          });
          return response.ok;

        case 'firebase':
          // Firebase doesn't have a simple test endpoint
          // We'll assume it's working if initialization succeeded
          return !!this.client;

        case 'web-push':
          // Web-push doesn't have a test endpoint
          return !!this.client;

        case 'apns':
          // APNS connection test would require actual push attempt
          return !!this.client;

        default:
          return false;
      }
    } catch (error) {
      console.error('Push service connection test failed:', error);
      return false;
    }
  }

  // Device management
  public async addDevice(userId: string, token: string, platform: 'ios' | 'android' | 'web'): Promise<boolean> {
    // This would typically store device tokens in your database
    // Implementation depends on your data model
    try {
      // Example database operation
      // await prisma.pushToken.create({
      //   data: { userId, token, platform, active: true }
      // });
      
      return true;
    } catch (error) {
      console.error('Error adding device:', error);
      return false;
    }
  }

  public async removeDevice(token: string): Promise<boolean> {
    try {
      // Example database operation
      // await prisma.pushToken.update({
      //   where: { token },
      //   data: { active: false }
      // });
      
      return true;
    } catch (error) {
      console.error('Error removing device:', error);
      return false;
    }
  }

  // Analytics
  public async getAnalytics(notificationId: string) {
    // Implementation would depend on provider's analytics API
    return {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
    };
  }
}

// Factory function
export function createPushService(): PushNotificationService {
  const provider = process.env.PUSH_PROVIDER as PushConfig['provider'] || 'onesignal';
  
  const config: PushConfig = {
    provider,
    appId: process.env.ONESIGNAL_APP_ID,
    restApiKey: process.env.ONESIGNAL_REST_API_KEY,
    serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    vapidKeys: {
      publicKey: process.env.VAPID_PUBLIC_KEY || '',
      privateKey: process.env.VAPID_PRIVATE_KEY || '',
    },
    apnsConfig: {
      keyId: process.env.APNS_KEY_ID || '',
      teamId: process.env.APNS_TEAM_ID || '',
      bundleId: process.env.APNS_BUNDLE_ID || '',
      keyPath: process.env.APNS_KEY_PATH || '',
    },
  };

  return new PushNotificationService(config);
}

export { PushNotificationService };