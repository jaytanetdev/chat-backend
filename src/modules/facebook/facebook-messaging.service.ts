import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { CredentialService } from '../credential/credential.service';

export interface FacebookMessageAttachment {
  type: 'image' | 'video' | 'audio' | 'file';
  payload: {
    url?: string;
    is_reusable?: boolean;
  };
}

export interface FacebookMessage {
  text?: string;
  attachment?: FacebookMessageAttachment;
}

export interface FacebookSendMessagePayload {
  recipient: { id: string };
  message: FacebookMessage;
  messaging_type?: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG';
}

@Injectable()
export class FacebookMessagingService {
  private readonly logger = new Logger(FacebookMessagingService.name);
  private readonly client: AxiosInstance;
  private readonly apiVersion = 'v25.0';
  private readonly fallbackPageAccessToken: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly credentialService: CredentialService,
  ) {
    this.fallbackPageAccessToken = this.configService.get<string>('platforms.facebook.pageAccessToken');

    this.client = axios.create({
      baseURL: `https://graph.facebook.com/${this.apiVersion}`,
      timeout: 30000,
    });

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
   * Get page access token — first try credential DB, then fallback to env var
   */
  private async getAccessToken(platformId?: string): Promise<string | null> {
    if (platformId) {
      try {
        const token = await this.credentialService.getAccessTokenByPlatform(platformId);
        if (token) return token;
      } catch (error) {
        this.logger.warn(`Failed to get FB token from DB for platform ${platformId}: ${error.message}`);
      }
    }
    return this.fallbackPageAccessToken ?? null;
  }

  isConfigured(): boolean {
    return !!this.fallbackPageAccessToken;
  }

  async isConfiguredForPlatform(platformId: string): Promise<boolean> {
    const token = await this.getAccessToken(platformId);
    return !!token;
  }

  async sendMessage(
    recipientId: string,
    message: FacebookMessage,
    platformId?: string,
  ): Promise<{ recipient_id: string; message_id: string }> {
    const token = await this.getAccessToken(platformId);
    if (!token) {
      throw new Error('Facebook not configured');
    }

    const payload: FacebookSendMessagePayload = {
      recipient: { id: recipientId },
      message,
      messaging_type: 'RESPONSE',
    };

    const response = await this.client.post('/me/messages', payload, {
      params: { access_token: token },
    });
    this.logger.debug(`Facebook message sent: ${response.data.message_id}`);
    return response.data;
  }

  async sendTextMessage(recipientId: string, text: string, platformId?: string): Promise<void> {
    await this.sendMessage(recipientId, { text: text.slice(0, 2000) }, platformId);
  }

  async sendImageMessage(recipientId: string, imageUrl: string, platformId?: string): Promise<void> {
    await this.sendMessage(
      recipientId,
      { attachment: { type: 'image', payload: { url: imageUrl, is_reusable: true } } },
      platformId,
    );
  }

  async sendVideoMessage(recipientId: string, videoUrl: string, platformId?: string): Promise<void> {
    await this.sendMessage(
      recipientId,
      { attachment: { type: 'video', payload: { url: videoUrl, is_reusable: true } } },
      platformId,
    );
  }

  async sendAudioMessage(recipientId: string, audioUrl: string, platformId?: string): Promise<void> {
    await this.sendMessage(
      recipientId,
      { attachment: { type: 'audio', payload: { url: audioUrl, is_reusable: true } } },
      platformId,
    );
  }

  async sendFileMessage(recipientId: string, fileUrl: string, platformId?: string): Promise<void> {
    await this.sendMessage(
      recipientId,
      { attachment: { type: 'file', payload: { url: fileUrl, is_reusable: true } } },
      platformId,
    );
  }

  async getUserProfile(userId: string, platformId?: string): Promise<{
    id: string;
    name: string;
    profile_pic?: string;
  }> {
    const token = await this.getAccessToken(platformId);
    if (!token) throw new Error('Facebook not configured');

    const response = await this.client.get(`/${userId}`, {
      params: { access_token: token, fields: 'id,name,profile_pic' },
    });
    return response.data;
  }

  validateSignature(body: string, signature: string, appSecret: string): boolean {
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', appSecret)
      .update(body, 'utf8')
      .digest('hex');
    return signature === `sha256=${expected}`;
  }
}
