import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { CredentialService } from '../credential/credential.service';

export interface LineMessage {
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  text?: string;
  originalContentUrl?: string;
  previewImageUrl?: string;
  duration?: number;
  contentProvider?: {
    type: 'line' | 'external';
    originalContentUrl?: string;
    previewImageUrl?: string;
  };
}

export interface LinePushMessagePayload {
  to: string;
  messages: LineMessage[];
  notificationDisabled?: boolean;
}

export interface LineReplyMessagePayload {
  replyToken: string;
  messages: LineMessage[];
  notificationDisabled?: boolean;
}

@Injectable()
export class LineMessagingService {
  private readonly logger = new Logger(LineMessagingService.name);
  private readonly client: AxiosInstance;

  constructor(
    private readonly configService: ConfigService,
    private readonly credentialService: CredentialService,
  ) {
    this.client = axios.create({
      baseURL: 'https://api.line.me/v2/bot',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error(
          `LINE API error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
        );
        return Promise.reject(error);
      },
    );
  }

  /**
   * Get access token from database for platform
   */
  private async getAccessToken(platformId: string): Promise<string | null> {
    try {
      const token = await this.credentialService.getAccessTokenByPlatform(platformId);
      this.logger.debug(`LINE access token for platform ${platformId}: ${token ? 'FOUND' : 'NOT FOUND'}`);
      return token;
    } catch (error) {
      this.logger.error(`Failed to get LINE access token for platform ${platformId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if LINE is configured for a specific platform
   */
  async isConfigured(platformId: string): Promise<boolean> {
    const token = await this.getAccessToken(platformId);
    return !!token;
  }

  /**
   * Send push message to LINE user
   * https://developers.line.biz/en/reference/messaging-api/#send-push-message
   */
  async sendPushMessage(platformId: string, userId: string, messages: LineMessage[]): Promise<void> {
    const accessToken = await this.getAccessToken(platformId);
    if (!accessToken) {
      this.logger.warn(`LINE not configured for platform ${platformId}, cannot send message`);
      throw new Error(`LINE not configured for platform ${platformId}`);
    }

    const payload: LinePushMessagePayload = {
      to: userId,
      messages: messages.slice(0, 5), // LINE allows max 5 messages per request
    };

    try {
      const response = await this.client.post('/message/push', payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      this.logger.debug(`LINE push message sent: ${response.status}`);
    } catch (error) {
      this.logger.error(`Failed to send LINE push message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send reply message (requires reply token from webhook)
   * https://developers.line.biz/en/reference/messaging-api/#send-reply-message
   */
  async sendReplyMessage(platformId: string, replyToken: string, messages: LineMessage[]): Promise<void> {
    const accessToken = await this.getAccessToken(platformId);
    if (!accessToken) {
      this.logger.warn(`LINE not configured for platform ${platformId}, cannot send reply`);
      throw new Error(`LINE not configured for platform ${platformId}`);
    }

    const payload: LineReplyMessagePayload = {
      replyToken,
      messages: messages.slice(0, 5),
    };

    try {
      const response = await this.client.post('/message/reply', payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      this.logger.debug(`LINE reply message sent: ${response.status}`);
    } catch (error) {
      this.logger.error(`Failed to send LINE reply message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send text message
   */
  async sendTextMessage(platformId: string, userId: string, text: string): Promise<void> {
    const message: LineMessage = {
      type: 'text',
      text: text.slice(0, 2000), // LINE limit: 2000 characters
    };
    await this.sendPushMessage(platformId, userId, [message]);
  }

  /**
   * Send image message
   */
  async sendImageMessage(platformId: string, userId: string, originalContentUrl: string, previewImageUrl?: string): Promise<void> {
    const message: LineMessage = {
      type: 'image',
      originalContentUrl,
      previewImageUrl: previewImageUrl || originalContentUrl,
    };
    await this.sendPushMessage(platformId, userId, [message]);
  }

  /**
   * Get user profile
   * https://developers.line.biz/en/reference/messaging-api/#get-profile
   */
  async getUserProfile(platformId: string, userId: string): Promise<{
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
  }> {
    const accessToken = await this.getAccessToken(platformId);
    if (!accessToken) {
      throw new Error(`LINE not configured for platform ${platformId}`);
    }

    try {
      const response = await this.client.get(`/profile/${userId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get LINE user profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate webhook signature
   * https://developers.line.biz/en/reference/messaging-api/#signature-validation
   */
  validateSignature(body: string, signature: string, channelSecret: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', channelSecret)
      .update(body, 'utf8')
      .digest('base64');
    return hash === signature;
  }

  /**
   * Parse webhook events
   */
  parseWebhook(body: any): {
    destination: string;
    events: Array<{
      type: string;
      timestamp: number;
      source: {
        type: 'user' | 'group' | 'room';
        userId?: string;
        groupId?: string;
        roomId?: string;
      };
      message?: any;
      replyToken?: string;
    }>;
  } {
    return {
      destination: body.destination,
      events: body.events || [],
    };
  }

  /**
   * Convert LINE message type to our ChatMessageType
   */
  convertMessageType(lineType: string): string {
    const typeMap: Record<string, string> = {
      text: 'TEXT',
      image: 'IMAGE',
      video: 'VIDEO',
      audio: 'AUDIO',
      file: 'FILE',
      sticker: 'TEXT', // Treat stickers as text for now
      location: 'TEXT', // Treat location as text for now
    };
    return typeMap[lineType] || 'TEXT';
  }
}