import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface LazadaMessage {
  msg_id: string;
  session_id: string;
  sender_id: string;
  to_id: string;
  msg_type: 'text' | 'image' | 'sticker';
  content: {
    text?: string;
    url?: string;
    sticker_id?: string;
  };
  send_time: string;
}

@Injectable()
export class LazadaMessagingService {
  private readonly logger = new Logger(LazadaMessagingService.name);
  private readonly client: AxiosInstance;
  private readonly baseURL = 'https://api.lazada.com/rest';

  constructor(private readonly configService: ConfigService) {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error(
          `Lazada API error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
        );
        return Promise.reject(error);
      },
    );
  }

  /**
   * Check if Lazada is configured
   */
  isConfigured(): boolean {
    const appKey = this.configService.get<string>('LAZADA_APP_KEY');
    const appSecret = this.configService.get<string>('LAZADA_APP_SECRET');
    return !!appKey && !!appSecret;
  }

  /**
   * Generate API signature
   */
  private generateSignature(params: Record<string, any>, appSecret: string): string {
    const sortedKeys = Object.keys(params).sort();
    const baseString = sortedKeys.map(key => `${key}${params[key]}`).join('');
    return crypto.createHmac('sha256', appSecret).update(baseString).digest('hex').toUpperCase();
  }

  /**
   * Get messages from Lazada
   * https://open.lazada.com/doc/api.htm?spm=a2o9g.11193487.0.0.7cf33f27d0s0Q7#/api?cid=8&path=/api/receiver/msg/get
   */
  async getMessages(accessToken: string, sessionId?: string): Promise<{
    messages: LazadaMessage[];
    has_more: boolean;
  }> {
    if (!this.isConfigured()) {
      throw new Error('Lazada not configured');
    }

    const appKey = this.configService.get<string>('LAZADA_APP_KEY');
    const appSecret = this.configService.get<string>('LAZADA_APP_SECRET');
    const timestamp = new Date().toISOString();

    const params: any = {
      app_key: appKey,
      sign_method: 'sha256',
      timestamp,
      access_token: accessToken,
    };

    if (sessionId) {
      params.session_id = sessionId;
    }

    if (!appSecret) {
      throw new Error('Lazada app secret not configured');
    }
    params.sign = this.generateSignature(params, appSecret);

    try {
      const response = await this.client.get('/api/receiver/msg/get', { params });
      return {
        messages: response.data.data?.messages || [],
        has_more: response.data.data?.has_more || false,
      };
    } catch (error) {
      this.logger.error(`Failed to get Lazada messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send message to Lazada user
   * https://open.lazada.com/doc/api.htm?spm=a2o9g.11193487.0.0.7cf33f27d0s0Q7#/api?cid=8&path=/api/receiver/msg/send
   */
  async sendMessage(
    accessToken: string,
    sessionId: string,
    toUserId: string,
    content: { txt?: string; img_url?: string },
  ): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn('Lazada not configured, cannot send message');
      throw new Error('Lazada not configured');
    }

    const appKey = this.configService.get<string>('LAZADA_APP_KEY');
    const appSecret = this.configService.get<string>('LAZADA_APP_SECRET');
    const timestamp = new Date().toISOString();

    const params: any = {
      app_key: appKey,
      sign_method: 'sha256',
      timestamp,
      access_token: accessToken,
      session_id: sessionId,
      to_user_id: toUserId,
      ...content,
    };

    if (!appSecret) {
      throw new Error('Lazada app secret not configured');
    }
    params.sign = this.generateSignature(params, appSecret);

    try {
      await this.client.get('/api/receiver/msg/send', { params });
      this.logger.debug(`Lazada message sent to ${toUserId}`);
    } catch (error) {
      this.logger.error(`Failed to send Lazada message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send text message
   */
  async sendTextMessage(accessToken: string, sessionId: string, toUserId: string, text: string): Promise<void> {
    await this.sendMessage(accessToken, sessionId, toUserId, { txt: text.slice(0, 1000) });
  }
}