import { webSocketManager, NotificationPayload } from './websocket';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export interface NotificationConfig {
  channels: {
    realtime: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduleAt?: Date;
  expiresAt?: Date;
  retryAttempts?: number;
  template?: string;
  templateData?: Record<string, any>;
}

export interface NotificationRecipient {
  userId: string;
  email?: string;
  phone?: string;
  pushTokens?: string[];
  preferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  email: {
    payments: boolean;
    security: boolean;
    system: boolean;
    promotions: boolean;
    reminders: boolean;
  };
  sms: {
    payments: boolean;
    security: boolean;
    system: boolean;
    promotions: boolean;
    reminders: boolean;
  };
  push: {
    payments: boolean;
    security: boolean;
    system: boolean;
    promotions: boolean;
    reminders: boolean;
  };
  realtime: {
    payments: boolean;
    security: boolean;
    system: boolean;
    promotions: boolean;
    reminders: boolean;
  };
  quiet_hours: {
    enabled: boolean;
    start_time: string; // HH:MM format
    end_time: string; // HH:MM format
    timezone: string;
  };
  frequency_limits: {
    max_per_hour: number;
    max_per_day: number;
  };
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationPayload['type'];
  channels: {
    email?: {
      subject: string;
      html: string;
      text: string;
    };
    sms?: {
      message: string;
    };
    push?: {
      title: string;
      body: string;
      icon?: string;
      badge?: string;
    };
    realtime?: {
      title: string;
      message: string;
    };
  };
}

class NotificationService {
  private templates = new Map<string, NotificationTemplate>();
  private emailService: any;
  private smsService: any;
  private pushService: any;
  private queueService: any;

  constructor() {
    this.loadDefaultTemplates();
  }

  // Initialize services
  public async initialize(config: {
    emailService?: any;
    smsService?: any;
    pushService?: any;
    queueService?: any;
  }) {
    this.emailService = config.emailService;
    this.smsService = config.smsService;
    this.pushService = config.pushService;
    this.queueService = config.queueService;
  }

  // Main notification sending method
  public async sendNotification(
    recipient: NotificationRecipient,
    type: NotificationPayload['type'],
    config: NotificationConfig,
    customData?: Record<string, any>
  ): Promise<{ success: boolean; channels: Record<string, boolean>; errors: string[] }> {
    const errors: string[] = [];
    const channelResults: Record<string, boolean> = {};
    
    try {
      // Check user preferences
      const preferences = await this.getUserPreferences(recipient.userId);
      const effectiveConfig = this.applyUserPreferences(config, preferences, type);

      // Check quiet hours
      if (this.isInQuietHours(preferences) && config.priority !== 'critical') {
        // Schedule for later if not critical
        if (effectiveConfig.scheduleAt) {
          return this.scheduleNotification(recipient, type, effectiveConfig, customData);
        }
      }

      // Check frequency limits
      if (!await this.checkFrequencyLimits(recipient.userId, preferences)) {
        errors.push('Frequency limit exceeded');
        return { success: false, channels: channelResults, errors };
      }

      const notificationId = uuidv4();
      const timestamp = new Date();

      // Prepare notification data
      const baseNotification: Omit<NotificationPayload, 'id'> = {
        type,
        title: customData?.title || this.getDefaultTitle(type),
        message: customData?.message || this.getDefaultMessage(type),
        metadata: customData,
        userId: recipient.userId,
        timestamp: timestamp.toISOString(),
        read: false,
      };

      // Send through enabled channels
      const channelPromises: Promise<void>[] = [];

      // Real-time notification
      if (effectiveConfig.channels.realtime) {
        channelPromises.push(
          this.sendRealtimeNotification(notificationId, baseNotification)
            .then(() => { channelResults.realtime = true; })
            .catch(error => { 
              channelResults.realtime = false; 
              errors.push(`Realtime: ${error instanceof Error ? error.message : 'Unknown error'}`);
            })
        );
      }

      // Email notification
      if (effectiveConfig.channels.email && recipient.email) {
        channelPromises.push(
          this.sendEmailNotification(recipient, baseNotification, effectiveConfig)
            .then(() => { channelResults.email = true; })
            .catch(error => { 
              channelResults.email = false; 
              errors.push(`Email: ${error instanceof Error ? error.message : 'Unknown error'}`);
            })
        );
      }

      // SMS notification
      if (effectiveConfig.channels.sms && recipient.phone) {
        channelPromises.push(
          this.sendSMSNotification(recipient, baseNotification, effectiveConfig)
            .then(() => { channelResults.sms = true; })
            .catch(error => { 
              channelResults.sms = false; 
              errors.push(`SMS: ${error instanceof Error ? error.message : 'Unknown error'}`);
            })
        );
      }

      // Push notification
      if (effectiveConfig.channels.push && recipient.pushTokens?.length) {
        channelPromises.push(
          this.sendPushNotification(recipient, baseNotification, effectiveConfig)
            .then(() => { channelResults.push = true; })
            .catch(error => { 
              channelResults.push = false; 
              errors.push(`Push: ${error instanceof Error ? error.message : 'Unknown error'}`);
            })
        );
      }

      // Wait for all channels to complete
      await Promise.allSettled(channelPromises);

      // Log notification attempt
      await this.logNotificationAttempt({
        id: notificationId,
        userId: recipient.userId,
        type,
        channels: effectiveConfig.channels,
        results: channelResults,
        errors,
        priority: config.priority,
        timestamp,
      });

      const success = Object.values(channelResults).some(result => result === true);
      return { success, channels: channelResults, errors };

    } catch (error) {
      errors.push(`System error: ${error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'}`);
      return { success: false, channels: channelResults, errors };
    }
  }

  // Send notification to multiple recipients
  public async sendBulkNotification(
    recipients: NotificationRecipient[],
    type: NotificationPayload['type'],
    config: NotificationConfig,
    customData?: Record<string, any>
  ): Promise<{ totalSent: number; results: Array<{ userId: string; success: boolean; errors: string[] }> }> {
    const results: Array<{ userId: string; success: boolean; errors: string[] }> = [];
    let totalSent = 0;

    // Process in batches to avoid overwhelming services
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recipient) => {
        try {
          const result = await this.sendNotification(recipient, type, config, customData);
          const success = result.success;
          if (success) totalSent++;
          
          results.push({
            userId: recipient.userId,
            success,
            errors: result.errors,
          });
        } catch (error) {
          results.push({
            userId: recipient.userId,
            success: false,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
          });
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Small delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return { totalSent, results };
  }

  // Real-time notification via WebSocket
  private async sendRealtimeNotification(
    notificationId: string,
    notification: Omit<NotificationPayload, 'id'>
  ): Promise<void> {
    const success = await webSocketManager.sendNotificationToUser(
      notification.userId,
      { id: notificationId, ...notification }
    );

    if (!success) {
      throw new Error('Failed to send real-time notification');
    }
  }

  // Email notification
  private async sendEmailNotification(
    recipient: NotificationRecipient,
    notification: Omit<NotificationPayload, 'id'>,
    config: NotificationConfig
  ): Promise<void> {
    if (!this.emailService) {
      throw new Error('Email service not initialized');
    }

    const template = config.template ? this.templates.get(config.template) : null;
    const emailContent = template?.channels.email || {
      subject: notification.title,
      html: notification.message,
      text: notification.message,
    };

    // Apply template data if provided
    if (config.templateData) {
      emailContent.subject = this.interpolateTemplate(emailContent.subject, config.templateData);
      emailContent.html = this.interpolateTemplate(emailContent.html, config.templateData);
      emailContent.text = this.interpolateTemplate(emailContent.text, config.templateData);
    }

    await this.emailService.send({
      to: recipient.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  }

  // SMS notification
  private async sendSMSNotification(
    recipient: NotificationRecipient,
    notification: Omit<NotificationPayload, 'id'>,
    config: NotificationConfig
  ): Promise<void> {
    if (!this.smsService) {
      throw new Error('SMS service not initialized');
    }

    const template = config.template ? this.templates.get(config.template) : null;
    let message = template?.channels.sms?.message || notification.message;

    // Apply template data if provided
    if (config.templateData) {
      message = this.interpolateTemplate(message, config.templateData);
    }

    await this.smsService.send({
      to: recipient.phone,
      message: message.substring(0, 160), // SMS character limit
    });
  }

  // Push notification
  private async sendPushNotification(
    recipient: NotificationRecipient,
    notification: Omit<NotificationPayload, 'id'>,
    config: NotificationConfig
  ): Promise<void> {
    if (!this.pushService) {
      throw new Error('Push service not initialized');
    }

    const template = config.template ? this.templates.get(config.template) : null;
    const pushContent = template?.channels.push || {
      title: notification.title,
      body: notification.message,
    };

    // Apply template data if provided
    if (config.templateData) {
      pushContent.title = this.interpolateTemplate(pushContent.title, config.templateData);
      pushContent.body = this.interpolateTemplate(pushContent.body, config.templateData);
    }

    for (const token of recipient.pushTokens || []) {
      await this.pushService.send({
        token,
        title: pushContent.title,
        body: pushContent.body,
        icon: pushContent.icon,
        badge: pushContent.badge,
        data: notification.metadata,
      });
    }
  }

  // Get user preferences
  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    // TODO: Implement when notificationPreferences model is added to Prisma schema
    // const preferences = await prisma.notificationPreferences.findUnique({
    //   where: { userId },
    // });
    // return preferences ? JSON.parse(preferences.preferences) : this.getDefaultPreferences();
    return this.getDefaultPreferences();
  }

  // Apply user preferences to config
  private applyUserPreferences(
    config: NotificationConfig,
    preferences: NotificationPreferences,
    type: NotificationPayload['type']
  ): NotificationConfig {
    const applied = { ...config };

    // Simplified preferences application - TODO: implement proper type mapping
    applied.channels.email = applied.channels.email && preferences.email.payments;
    applied.channels.sms = applied.channels.sms && preferences.sms.payments;
    applied.channels.push = applied.channels.push && preferences.push.payments;
    applied.channels.realtime = applied.channels.realtime && preferences.realtime.payments;

    return applied;
  }

  // Check if current time is in quiet hours
  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quiet_hours.enabled) return false;

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: preferences.quiet_hours.timezone 
    });

    const startTime = preferences.quiet_hours.start_time;
    const endTime = preferences.quiet_hours.end_time;

    // Handle overnight quiet hours (e.g., 22:00 to 06:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  // Check frequency limits
  private async checkFrequencyLimits(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<boolean> {
    // TODO: Implement when notificationLog model is added to Prisma schema
    // const now = new Date();
    // const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    // const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    // const [hourCount, dayCount] = await Promise.all([
    //   prisma.notificationLog.count({
    //     where: { userId, timestamp: { gte: hourAgo } },
    //   }),
    //   prisma.notificationLog.count({
    //     where: { userId, timestamp: { gte: dayAgo } },
    //   }),
    // ]);
    // return hourCount < preferences.frequency_limits.max_per_hour &&
    //        dayCount < preferences.frequency_limits.max_per_day;
    
    // For now, always allow notifications (no frequency limiting)
    return true;
  }

  // Schedule notification for later
  private async scheduleNotification(
    recipient: NotificationRecipient,
    type: NotificationPayload['type'],
    config: NotificationConfig,
    customData?: Record<string, any>
  ) {
    if (!this.queueService) {
      throw new Error('Queue service not available for scheduling');
    }

    await this.queueService.schedule('notification', {
      recipient,
      type,
      config,
      customData,
    }, config.scheduleAt);

    return { success: true, channels: { scheduled: true }, errors: [] };
  }

  // Template interpolation
  private interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  // Log notification attempt
  private async logNotificationAttempt(data: any) {
    try {
      // TODO: Implement when notificationLog model is added to Prisma schema
      // await prisma.notificationLog.create({ data });
      console.log('Notification attempt logged (mock):', data.type);
    } catch (error) {
      console.error('Failed to log notification attempt:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Default preferences
  private getDefaultPreferences(): NotificationPreferences {
    return {
      email: { payments: true, security: true, system: true, promotions: false, reminders: true },
      sms: { payments: true, security: true, system: false, promotions: false, reminders: false },
      push: { payments: true, security: true, system: true, promotions: true, reminders: true },
      realtime: { payments: true, security: true, system: true, promotions: true, reminders: true },
      quiet_hours: {
        enabled: false,
        start_time: '22:00',
        end_time: '08:00',
        timezone: 'UTC',
      },
      frequency_limits: {
        max_per_hour: 10,
        max_per_day: 50,
      },
    };
  }

  // Default titles and messages
  private getDefaultTitle(type: NotificationPayload['type']): string {
    const titles = {
      payment: 'Payment Notification',
      security: 'Security Alert',
      system: 'System Notification',
      promotion: 'Special Offer',
      reminder: 'Reminder',
    };
    return titles[type] || 'Notification';
  }

  private getDefaultMessage(type: NotificationPayload['type']): string {
    const messages = {
      payment: 'You have a payment update',
      security: 'Security event detected',
      system: 'System information',
      promotion: 'Check out this offer',
      reminder: 'You have a reminder',
    };
    return messages[type] || 'You have a new notification';
  }

  // Load default templates
  private loadDefaultTemplates() {
    // Payment success template
    this.templates.set('payment-success', {
      id: 'payment-success',
      name: 'Payment Success',
      type: 'payment',
      channels: {
        email: {
          subject: 'Payment Successful - ${{amount}}',
          html: '<h2>Payment Successful</h2>' +
                '<p>Your payment of <strong>$' + '{{amount}}</strong> has been processed successfully.</p>' +
                '<p><strong>Transaction ID:</strong> ' + '{{transactionId}}</p>' +
                '<p><strong>Date:</strong> ' + '{{date}}</p>' +
                '<p>Thank you for using FacePay!</p>',
          text: 'Your payment of $' + '{{amount}} has been processed successfully. Transaction ID: ' + '{{transactionId}}',
        },
        sms: {
          message: 'FacePay: Payment of ${{amount}} successful. ID: {{transactionId}}',
        },
        push: {
          title: 'Payment Successful',
          body: 'Your payment of ${{amount}} has been processed',
          icon: '/icons/payment-success.png',
        },
        realtime: {
          title: 'Payment Successful',
          message: 'Your payment of ${{amount}} has been processed successfully',
        },
      },
    });

    // Security alert template
    this.templates.set('security-alert', {
      id: 'security-alert',
      name: 'Security Alert',
      type: 'security',
      channels: {
        email: {
          subject: 'Security Alert - {{alertType}}',
          html: `
            <h2 style="color: #e74c3c;">Security Alert</h2>
            <p>A security event has been detected on your account:</p>
            <p><strong>Alert Type:</strong> {{alertType}}</p>
            <p><strong>Time:</strong> {{timestamp}}</p>
            <p><strong>Location:</strong> {{location}}</p>
            <p>If this wasn't you, please secure your account immediately.</p>
          `,
          text: 'Security alert: {{alertType}} detected at {{timestamp}}. If this wasn\'t you, secure your account.',
        },
        sms: {
          message: 'FacePay Security Alert: {{alertType}} detected. If not you, secure account immediately.',
        },
        push: {
          title: 'Security Alert',
          body: '{{alertType}} detected on your account',
          icon: '/icons/security-alert.png',
        },
        realtime: {
          title: 'Security Alert',
          message: '{{alertType}} detected on your account',
        },
      },
    });
  }

  // Template management
  public addTemplate(template: NotificationTemplate) {
    this.templates.set(template.id, template);
  }

  public getTemplate(id: string): NotificationTemplate | undefined {
    return this.templates.get(id);
  }

  public listTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }
}

// Singleton instance
export const notificationService = new NotificationService();

export { NotificationService };