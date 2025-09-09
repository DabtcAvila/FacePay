export interface SMSConfig {
  provider: 'twilio' | 'aws-sns' | 'messagebird' | 'vonage';
  accountSid?: string; // Twilio
  authToken?: string; // Twilio
  apiKey?: string; // Other providers
  region?: string; // AWS SNS
  defaults: {
    from: string;
  };
  rateLimits: {
    perSecond: number;
    perMinute: number;
    perHour: number;
  };
}

export interface SMSData {
  to: string;
  message: string;
  mediaUrls?: string[]; // MMS
}

export interface SendSMSOptions {
  priority?: 'low' | 'normal' | 'high';
  scheduledAt?: Date;
  maxPrice?: number; // Maximum price willing to pay
  validityPeriod?: number; // Message validity in seconds
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  cost?: number;
  error?: string;
  deliveryStatus?: 'queued' | 'sent' | 'delivered' | 'failed';
}

class SMSService {
  private config: SMSConfig;
  private client: any;
  private rateLimiter: Map<string, number[]> = new Map();

  constructor(config: SMSConfig) {
    this.config = config;
    this.initializeClient();
  }

  private async initializeClient() {
    switch (this.config.provider) {
      case 'twilio':
        const twilio = await import('twilio');
        this.client = twilio(this.config.accountSid!, this.config.authToken!);
        break;

      case 'aws-sns':
        const AWS = await import('aws-sdk');
        AWS.config.update({ region: this.config.region });
        this.client = new AWS.SNS();
        break;

      case 'messagebird':
        const MessageBird = await import('messagebird');
        this.client = MessageBird(this.config.apiKey!);
        break;

      case 'vonage':
        const { Vonage } = await import('@vonage/server-sdk');
        this.client = new Vonage({
          apiKey: this.config.apiKey!,
          apiSecret: this.config.authToken!,
        });
        break;

      default:
        throw new Error(`Unsupported SMS provider: ${this.config.provider}`);
    }
  }

  public async send(smsData: SMSData, options: SendSMSOptions = {}): Promise<SMSResponse> {
    try {
      // Check rate limits
      if (!this.checkRateLimit(smsData.to)) {
        return {
          success: false,
          error: 'Rate limit exceeded for this phone number',
        };
      }

      // Validate phone number
      if (!this.validatePhoneNumber(smsData.to)) {
        return {
          success: false,
          error: 'Invalid phone number format',
        };
      }

      // Truncate message if too long
      const truncatedMessage = this.truncateMessage(smsData.message);
      if (truncatedMessage !== smsData.message) {
        console.warn(`SMS message truncated for ${smsData.to}`);
      }

      const finalSMSData = {
        ...smsData,
        message: truncatedMessage,
      };

      switch (this.config.provider) {
        case 'twilio':
          return this.sendViaTwilio(finalSMSData, options);

        case 'aws-sns':
          return this.sendViaAWS(finalSMSData, options);

        case 'messagebird':
          return this.sendViaMessageBird(finalSMSData, options);

        case 'vonage':
          return this.sendViaVonage(finalSMSData, options);

        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async sendViaTwilio(smsData: SMSData, options: SendSMSOptions): Promise<SMSResponse> {
    try {
      const messageOptions: any = {
        to: smsData.to,
        from: this.config.defaults.from,
        body: smsData.message,
      };

      // Add MMS support
      if (smsData.mediaUrls && smsData.mediaUrls.length > 0) {
        messageOptions.mediaUrl = smsData.mediaUrls;
      }

      // Add scheduling support
      if (options.scheduledAt) {
        messageOptions.sendAt = options.scheduledAt;
      }

      // Add max price limit
      if (options.maxPrice) {
        messageOptions.maxPrice = options.maxPrice.toString();
      }

      // Add validity period
      if (options.validityPeriod) {
        messageOptions.validityPeriod = options.validityPeriod;
      }

      const message = await this.client.messages.create(messageOptions);

      return {
        success: true,
        messageId: message.sid,
        cost: parseFloat(message.price) || undefined,
        deliveryStatus: message.status,
      };
    } catch (error) {
      return {
        success: false,
        error: `Twilio error: ${error.message}`,
      };
    }
  }

  private async sendViaAWS(smsData: SMSData, options: SendSMSOptions): Promise<SMSResponse> {
    try {
      const params = {
        PhoneNumber: smsData.to,
        Message: smsData.message,
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: 'FacePay',
          },
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: options.priority === 'high' ? 'Transactional' : 'Promotional',
          },
        },
      };

      if (options.maxPrice) {
        params.MessageAttributes['AWS.SNS.SMS.MaxPrice'] = {
          DataType: 'String',
          StringValue: options.maxPrice.toString(),
        };
      }

      const result = await this.client.publish(params).promise();

      return {
        success: true,
        messageId: result.MessageId,
      };
    } catch (error) {
      return {
        success: false,
        error: `AWS SNS error: ${error.message}`,
      };
    }
  }

  private async sendViaMessageBird(smsData: SMSData, options: SendSMSOptions): Promise<SMSResponse> {
    try {
      const messageOptions = {
        originator: this.config.defaults.from,
        recipients: [smsData.to],
        body: smsData.message,
        scheduledDatetime: options.scheduledAt?.toISOString(),
        validity: options.validityPeriod,
      };

      const response = await new Promise((resolve, reject) => {
        this.client.messages.create(messageOptions, (err: any, response: any) => {
          if (err) reject(err);
          else resolve(response);
        });
      });

      return {
        success: true,
        messageId: (response as any).id,
      };
    } catch (error) {
      return {
        success: false,
        error: `MessageBird error: ${error.message}`,
      };
    }
  }

  private async sendViaVonage(smsData: SMSData, options: SendSMSOptions): Promise<SMSResponse> {
    try {
      const response = await this.client.sms.send({
        to: smsData.to,
        from: this.config.defaults.from,
        text: smsData.message,
        type: options.priority === 'high' ? 'text' : 'text',
      });

      const message = response.messages[0];
      
      return {
        success: message.status === '0',
        messageId: message['message-id'],
        error: message.status !== '0' ? message['error-text'] : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: `Vonage error: ${error.message}`,
      };
    }
  }

  public async sendBulk(
    messages: Array<SMSData & { options?: SendSMSOptions }>
  ): Promise<{ successful: number; failed: number; results: SMSResponse[] }> {
    const results: SMSResponse[] = [];
    let successful = 0;
    let failed = 0;

    // Process in smaller batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      const promises = batch.map(async ({ options, ...smsData }) => {
        const result = await this.send(smsData, options);
        results.push(result);
        
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
        
        return result;
      });

      await Promise.allSettled(promises);
      
      // Delay between batches
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { successful, failed, results };
  }

  public async checkDeliveryStatus(messageId: string): Promise<{
    status: string;
    delivered: boolean;
    error?: string;
  }> {
    try {
      switch (this.config.provider) {
        case 'twilio':
          const message = await this.client.messages(messageId).fetch();
          return {
            status: message.status,
            delivered: message.status === 'delivered',
          };

        case 'aws-sns':
          // AWS SNS doesn't provide delivery status tracking
          return {
            status: 'unknown',
            delivered: false,
            error: 'AWS SNS does not support delivery status tracking',
          };

        case 'messagebird':
          const mbMessage = await new Promise((resolve, reject) => {
            this.client.messages.read(messageId, (err: any, response: any) => {
              if (err) reject(err);
              else resolve(response);
            });
          });
          return {
            status: (mbMessage as any).status,
            delivered: (mbMessage as any).status === 'delivered',
          };

        case 'vonage':
          // Vonage requires webhook setup for delivery receipts
          return {
            status: 'unknown',
            delivered: false,
            error: 'Vonage requires webhook setup for delivery status',
          };

        default:
          return {
            status: 'unknown',
            delivered: false,
            error: 'Provider not supported for status checking',
          };
      }
    } catch (error) {
      return {
        status: 'error',
        delivered: false,
        error: error.message,
      };
    }
  }

  private checkRateLimit(phoneNumber: string): boolean {
    const now = Date.now();
    const key = phoneNumber;
    
    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, []);
    }

    const timestamps = this.rateLimiter.get(key)!;
    
    // Remove timestamps older than 1 hour
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentTimestamps = timestamps.filter(ts => ts > oneHourAgo);
    
    // Check limits
    const oneMinuteAgo = now - 60 * 1000;
    const oneSecondAgo = now - 1000;
    
    const lastSecond = recentTimestamps.filter(ts => ts > oneSecondAgo).length;
    const lastMinute = recentTimestamps.filter(ts => ts > oneMinuteAgo).length;
    const lastHour = recentTimestamps.length;

    if (lastSecond >= this.config.rateLimits.perSecond ||
        lastMinute >= this.config.rateLimits.perMinute ||
        lastHour >= this.config.rateLimits.perHour) {
      return false;
    }

    // Add current timestamp
    recentTimestamps.push(now);
    this.rateLimiter.set(key, recentTimestamps);
    
    return true;
  }

  private validatePhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 format validation
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  private truncateMessage(message: string): string {
    const maxLength = 1600; // SMS maximum length
    if (message.length <= maxLength) {
      return message;
    }
    
    return message.substring(0, maxLength - 3) + '...';
  }

  public async testConnection(): Promise<boolean> {
    try {
      switch (this.config.provider) {
        case 'twilio':
          await this.client.api.accounts(this.config.accountSid).fetch();
          return true;

        case 'aws-sns':
          await this.client.getSMSAttributes().promise();
          return true;

        case 'messagebird':
          await new Promise((resolve, reject) => {
            this.client.balance.read((err: any, data: any) => {
              if (err) reject(err);
              else resolve(data);
            });
          });
          return true;

        case 'vonage':
          const balance = await this.client.account.getBalance();
          return balance.value >= 0;

        default:
          return false;
      }
    } catch (error) {
      console.error('SMS service connection test failed:', error);
      return false;
    }
  }

  public async getBalance(): Promise<{ balance: number; currency: string }> {
    try {
      switch (this.config.provider) {
        case 'twilio':
          const account = await this.client.api.accounts(this.config.accountSid).fetch();
          return {
            balance: parseFloat(account.balance),
            currency: account.currency || 'USD',
          };

        case 'messagebird':
          const balance = await new Promise((resolve, reject) => {
            this.client.balance.read((err: any, data: any) => {
              if (err) reject(err);
              else resolve(data);
            });
          });
          return {
            balance: (balance as any).amount,
            currency: (balance as any).currency,
          };

        case 'vonage':
          const vonageBalance = await this.client.account.getBalance();
          return {
            balance: parseFloat(vonageBalance.value),
            currency: 'EUR',
          };

        default:
          return { balance: 0, currency: 'USD' };
      }
    } catch (error) {
      console.error('Error getting SMS balance:', error);
      return { balance: 0, currency: 'USD' };
    }
  }

  // Template support for SMS
  public createSMSFromTemplate(
    template: string,
    data: Record<string, any>
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  // Analytics methods
  public async getUsageStats(startDate: Date, endDate: Date) {
    return {
      sent: 0,
      delivered: 0,
      failed: 0,
      cost: 0,
      // Implementation would depend on provider's analytics API
    };
  }

  // Opt-out management
  public async addToOptOutList(phoneNumber: string): Promise<boolean> {
    // Implementation would store opt-out preferences in database
    // and integrate with provider's opt-out systems
    try {
      // Store in database
      // await prisma.smsOptOut.create({ data: { phoneNumber } });
      
      // Add to provider's opt-out list if supported
      switch (this.config.provider) {
        case 'twilio':
          // Twilio handles opt-outs automatically
          break;
        // Add other providers as needed
      }
      
      return true;
    } catch (error) {
      console.error('Error adding to opt-out list:', error);
      return false;
    }
  }

  public async isOptedOut(phoneNumber: string): Promise<boolean> {
    // Check database for opt-out status
    // return await prisma.smsOptOut.findUnique({ where: { phoneNumber } }) !== null;
    return false; // Placeholder
  }
}

// Factory function
export function createSMSService(): SMSService {
  const provider = process.env.SMS_PROVIDER as SMSConfig['provider'] || 'twilio';
  
  const config: SMSConfig = {
    provider,
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    apiKey: process.env.SMS_API_KEY,
    region: process.env.AWS_REGION,
    defaults: {
      from: process.env.SMS_FROM || '+1234567890',
    },
    rateLimits: {
      perSecond: 1,
      perMinute: 10,
      perHour: 100,
    },
  };

  return new SMSService(config);
}

export { SMSService };