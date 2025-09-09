import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

export interface EmailConfig {
  provider: 'sendgrid' | 'resend' | 'smtp' | 'ses';
  apiKey?: string;
  region?: string; // for AWS SES
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  defaults: {
    from: string;
    fromName: string;
  };
}

export interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface SendEmailOptions {
  template?: string;
  templateData?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  trackOpens?: boolean;
  trackClicks?: boolean;
  tags?: string[];
}

class EmailService {
  private config: EmailConfig;
  private client: any;
  private templates = new Map<string, Handlebars.TemplateDelegate>();

  constructor(config: EmailConfig) {
    this.config = config;
    this.initializeClient();
    this.loadTemplates();
  }

  private async initializeClient() {
    switch (this.config.provider) {
      case 'sendgrid':
        const sgMail = await import('@sendgrid/mail');
        sgMail.setApiKey(this.config.apiKey!);
        this.client = sgMail;
        break;

      case 'resend':
        const { Resend } = await import('resend');
        this.client = new Resend(this.config.apiKey!);
        break;

      case 'smtp':
        const nodemailer = await import('nodemailer');
        this.client = nodemailer.createTransporter(this.config.smtpConfig!);
        break;

      case 'ses':
        const AWS = await import('aws-sdk');
        AWS.config.update({ region: this.config.region });
        this.client = new AWS.SES();
        break;

      default:
        throw new Error(`Unsupported email provider: ${this.config.provider}`);
    }
  }

  private loadTemplates() {
    const templatesDir = path.join(process.cwd(), 'src/lib/email-templates');
    
    try {
      const files = fs.readdirSync(templatesDir);
      
      files.forEach(file => {
        if (file.endsWith('.html')) {
          const templateName = file.replace('.html', '');
          const templatePath = path.join(templatesDir, file);
          const templateContent = fs.readFileSync(templatePath, 'utf8');
          
          // Register partials for Handlebars
          if (templateName === 'base') {
            Handlebars.registerPartial('base', templateContent);
          } else {
            this.templates.set(templateName, Handlebars.compile(templateContent));
          }
        }
      });

      // Register base template as partial
      const basePath = path.join(templatesDir, 'base.html');
      if (fs.existsSync(basePath)) {
        const baseTemplate = fs.readFileSync(basePath, 'utf8');
        Handlebars.registerPartial('base', baseTemplate);
      }

      console.log(`Loaded ${this.templates.size} email templates`);
    } catch (error) {
      console.warn('Could not load email templates:', error.message);
    }
  }

  public async send(emailData: EmailData, options: SendEmailOptions = {}): Promise<boolean> {
    try {
      let finalEmailData = { ...emailData };

      // Use template if specified
      if (options.template && this.templates.has(options.template)) {
        const template = this.templates.get(options.template)!;
        const templateData = {
          ...this.getDefaultTemplateData(),
          ...options.templateData,
        };

        finalEmailData.html = template(templateData);
        finalEmailData.text = this.htmlToText(finalEmailData.html);
      }

      // Add default sender
      const fromEmail = this.config.defaults.from;
      const fromName = this.config.defaults.fromName;

      switch (this.config.provider) {
        case 'sendgrid':
          return this.sendViaSendGrid(finalEmailData, fromEmail, fromName, options);

        case 'resend':
          return this.sendViaResend(finalEmailData, fromEmail, fromName, options);

        case 'smtp':
          return this.sendViaSMTP(finalEmailData, fromEmail, fromName, options);

        case 'ses':
          return this.sendViaSES(finalEmailData, fromEmail, fromName, options);

        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  private async sendViaSendGrid(
    emailData: EmailData,
    fromEmail: string,
    fromName: string,
    options: SendEmailOptions
  ): Promise<boolean> {
    const msg = {
      to: emailData.to,
      from: { email: fromEmail, name: fromName },
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      attachments: emailData.attachments?.map(att => ({
        filename: att.filename,
        content: att.content.toString('base64'),
        type: att.contentType,
        disposition: 'attachment',
      })),
      trackingSettings: {
        clickTracking: { enable: options.trackClicks ?? false },
        openTracking: { enable: options.trackOpens ?? false },
      },
      customArgs: {
        priority: options.priority || 'normal',
        tags: options.tags?.join(','),
      },
    };

    const response = await this.client.send(msg);
    return response[0].statusCode >= 200 && response[0].statusCode < 300;
  }

  private async sendViaResend(
    emailData: EmailData,
    fromEmail: string,
    fromName: string,
    options: SendEmailOptions
  ): Promise<boolean> {
    const emailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      attachments: emailData.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
      })),
      tags: options.tags,
    };

    const response = await this.client.emails.send(emailOptions);
    return !!response.data?.id;
  }

  private async sendViaSMTP(
    emailData: EmailData,
    fromEmail: string,
    fromName: string,
    options: SendEmailOptions
  ): Promise<boolean> {
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      attachments: emailData.attachments,
      priority: options.priority === 'high' ? 'high' : 'normal',
    };

    const info = await this.client.sendMail(mailOptions);
    return !!info.messageId;
  }

  private async sendViaSES(
    emailData: EmailData,
    fromEmail: string,
    fromName: string,
    options: SendEmailOptions
  ): Promise<boolean> {
    const params = {
      Source: `${fromName} <${fromEmail}>`,
      Destination: {
        ToAddresses: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
      },
      Message: {
        Subject: { Data: emailData.subject },
        Body: {
          Html: { Data: emailData.html },
          Text: { Data: emailData.text },
        },
      },
      Tags: options.tags?.map(tag => ({ Name: 'tag', Value: tag })),
    };

    const result = await this.client.sendEmail(params).promise();
    return !!result.MessageId;
  }

  public async sendBulk(
    emails: Array<EmailData & { options?: SendEmailOptions }>
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    const results = { successful: 0, failed: 0, errors: [] as string[] };
    
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      const promises = batch.map(async ({ options, ...emailData }) => {
        try {
          const success = await this.send(emailData, options);
          if (success) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push(`Failed to send email to ${emailData.to}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Error sending to ${emailData.to}: ${error.message}`);
        }
      });

      await Promise.allSettled(promises);
      
      // Small delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  public async validateTemplate(templateName: string): Promise<boolean> {
    return this.templates.has(templateName);
  }

  public getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  public async testConnection(): Promise<boolean> {
    try {
      switch (this.config.provider) {
        case 'sendgrid':
          // SendGrid doesn't have a direct test method, try a simple API call
          const sgResponse = await fetch('https://api.sendgrid.com/v3/user/profile', {
            headers: { Authorization: `Bearer ${this.config.apiKey}` }
          });
          return sgResponse.ok;

        case 'resend':
          // Test with Resend's API
          const resendResponse = await fetch('https://api.resend.com/domains', {
            headers: { Authorization: `Bearer ${this.config.apiKey}` }
          });
          return resendResponse.ok;

        case 'smtp':
          // Test SMTP connection
          await this.client.verify();
          return true;

        case 'ses':
          // Test SES connection
          await this.client.getSendQuota().promise();
          return true;

        default:
          return false;
      }
    } catch (error) {
      console.error('Email service connection test failed:', error);
      return false;
    }
  }

  private getDefaultTemplateData() {
    return {
      website_url: process.env.NEXT_PUBLIC_APP_URL || 'https://facepay.app',
      support_url: process.env.NEXT_PUBLIC_APP_URL + '/support' || 'https://facepay.app/support',
      privacy_url: process.env.NEXT_PUBLIC_APP_URL + '/privacy' || 'https://facepay.app/privacy',
      unsubscribe_url: process.env.NEXT_PUBLIC_APP_URL + '/unsubscribe' || 'https://facepay.app/unsubscribe',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@facepay.app',
      securityEmail: process.env.SECURITY_EMAIL || 'security@facepay.app',
      securityHotline: process.env.SECURITY_HOTLINE || '+1-800-FACEPAY',
      helpCenterUrl: process.env.NEXT_PUBLIC_APP_URL + '/help' || 'https://facepay.app/help',
      emergencyUrl: process.env.NEXT_PUBLIC_APP_URL + '/emergency' || 'https://facepay.app/emergency',
      year: new Date().getFullYear(),
    };
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Analytics methods
  public async getDeliveryStats(startDate: Date, endDate: Date) {
    // This would integrate with your email provider's analytics API
    // Implementation depends on the provider
    return {
      sent: 0,
      delivered: 0,
      bounced: 0,
      opened: 0,
      clicked: 0,
      unsubscribed: 0,
    };
  }
}

// Factory function to create email service with proper configuration
export function createEmailService(): EmailService {
  const provider = process.env.EMAIL_PROVIDER as EmailConfig['provider'] || 'smtp';
  
  const config: EmailConfig = {
    provider,
    apiKey: process.env.EMAIL_API_KEY,
    region: process.env.AWS_REGION,
    smtpConfig: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    },
    defaults: {
      from: process.env.FROM_EMAIL || 'noreply@facepay.app',
      fromName: process.env.FROM_NAME || 'FacePay',
    },
  };

  return new EmailService(config);
}

export { EmailService };