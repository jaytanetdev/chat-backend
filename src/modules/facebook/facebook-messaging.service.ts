import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface FacebookMessageAttachment {
  type: 'image' | 'video' | 'audio' | 'file';
  payload: {
    url: string;
  };
}

export interface FacebookQuickReply {
  content_type?: 'text' | 'location' | 'user_phone_number' | 'user_email';
  title: string;
  payload: string;
  image_url?: string;
}

export interface FacebookMessage {
  text?: string;
  attachment?: FacebookMessageAttachment;
  quick_replies?: FacebookQuickReply[];
}

export interface FacebookSendMessagePayload {
  recipient: {
    id: string;
  };
  message: FacebookMessage;
  messaging_type?: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG';
  notification_type?: 'REGULAR' | 'SILENT_PUSH' | 'NO_PUSH';
}

@Injectable()
export class FacebookMessagingService {
  private readonly logger = new Logger(FacebookMessagingService.name);
  private readonly client: AxiosInstance;
  private readonly pageAccessToken: string | undefined;
  private readonly apiVersion = 'v18.0';

  constructor(private readonly configService: ConfigService) {
    this.pageAccessToken = this.configService.get<string>('platforms.facebook.pageAccessToken');

    this.client = axios.create({
      baseURL: `https://graph.facebook.com/${this.apiVersion}`,
      timeout: 30000,
    });

    // Add access token to all requests
    this.client.interceptors.request.use((config) => {
      const token = this.configService.get<string>('platforms.facebook.pageAccessToken');
      if (token) {
        config.params = config.params || {};
        config.params.access_token = token;
      }
      return config;
    });

    // Error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error(
          `Facebook API error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
        );
        return Promise.reject(error);
      },
    );
  }

  /**
   * Check if Facebook is configured
   */
  isConfigured(): boolean {
    return !!this.pageAccessToken;
  }

  /**
   * Send message to Facebook user
   * https://developers.facebook.com/docs/messenger-platform/reference/send-api/
   */
  async sendMessage(recipientId: string, message: FacebookMessage): Promise<{
    recipient_id: string;
    message_id: string;
  }> {
    if (!this.isConfigured()) {
      this.logger.warn('Facebook not configured, cannot send message');
      throw new Error('Facebook not configured');
    }

    const payload: FacebookSendMessagePayload = {
      recipient: { id: recipientId },
      message,
      messaging_type: 'RESPONSE',
    };

    try {
      const response = await this.client.post('/me/messages', payload);
      this.logger.debug(`Facebook message sent: ${response.data.message_id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send Facebook message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send text message
   */
  async sendTextMessage(recipientId: string, text: string): Promise<void> {
    const message: FacebookMessage = {
      text: text.slice(0, 2000), // Facebook limit: 2000 characters
    };
    await this.sendMessage(recipientId, message);
  }

  /**
   * Send image message
   */
  async sendImageMessage(recipientId: string, imageUrl: string): Promise<void> {
    const message: FacebookMessage = {
      attachment: {
        type: 'image',
        payload: { url: imageUrl },
      },
    };
    await this.sendMessage(recipientId, message);
  }

  /**
   * Send message with quick replies
   */
  async sendQuickReplyMessage(
    recipientId: string,
    text: string,
    quickReplies: FacebookQuickReply[],
  ): Promise<void> {
    const message: FacebookMessage = {
      text,
      quick_replies: quickReplies.slice(0, 13), // Max 13 quick replies
    };
    await this.sendMessage(recipientId, message);
  }

  /**
   * Get user profile
   * https://developers.facebook.com/docs/messenger-platform/identity/user-profile/
   */
  async getUserProfile(userId: string, pageAccessToken?: string): Promise<{
    id: string;
    name: string;
    profile_pic?: string;
  }> {
    const token = pageAccessToken || this.pageAccessToken;
    if (!token) {
      throw new Error('Facebook not configured');
    }

    try {
      const response = await this.client.get(`/${userId}`, {
        params: {
          access_token: token,
          fields: 'id,name,profile_pic',
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get Facebook user profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate webhook signature
   * https://developers.facebook.com/docs/messenger-platform/webhooks#security
   */
  validateSignature(body: string, signature: string, appSecret: string): boolean {
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', appSecret)
      .update(body, 'utf8')
      .digest('hex');
    return signature === `sha256=${expected}`;
  }

  /**
   * Verify webhook (for initial setup)
   * https://developers.facebook.com/docs/messenger-platform/webhooks#verification-requests
   */
  verifyWebhook(mode: string, token: string, challenge: string, verifyToken: string): string | null {
    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('Facebook webhook verified');
      return challenge;
    }
    this.logger.warn('Facebook webhook verification failed');
    return null;
  }
}