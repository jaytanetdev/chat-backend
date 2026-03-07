import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class InstagramMessagingService {
  private readonly logger = new Logger(InstagramMessagingService.name);
  private readonly client: AxiosInstance;
  private readonly pageAccessToken: string | undefined;
  private readonly apiVersion = 'v18.0';

  constructor(private readonly configService: ConfigService) {
    this.pageAccessToken = this.configService.get<string>('platforms.facebook.pageAccessToken');

    this.client = axios.create({
      baseURL: `https://graph.facebook.com/${this.apiVersion}`,
      timeout: 30000,
    });

    this.client.interceptors.request.use((config) => {
      const token = this.configService.get<string>('platforms.facebook.pageAccessToken');
      if (token) {
        config.params = config.params || {};
        config.params.access_token = token;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error(
          `Instagram API error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
        );
        return Promise.reject(error);
      },
    );
  }

  isConfigured(): boolean {
    return !!this.pageAccessToken;
  }

  /**
   * Send message to Instagram user
   * https://developers.facebook.com/docs/instagram-api/reference/ig-user/messages
   */
  async sendMessage(recipientId: string, message: { text?: string; attachment?: any }): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn('Instagram not configured, cannot send message');
      throw new Error('Instagram not configured');
    }

    const igUserId = this.configService.get<string>('INSTAGRAM_IG_USER_ID');
    if (!igUserId) {
      throw new Error('Instagram IG User ID not configured');
    }

    const payload = {
      recipient: { id: recipientId },
      message,
    };

    try {
      await this.client.post(`/${igUserId}/messages`, payload);
      this.logger.debug(`Instagram message sent to ${recipientId}`);
    } catch (error) {
      this.logger.error(`Failed to send Instagram message: ${error.message}`);
      throw error;
    }
  }

  async sendTextMessage(recipientId: string, text: string): Promise<void> {
    await this.sendMessage(recipientId, { text: text.slice(0, 2000) });
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Instagram not configured');
    }

    try {
      const response = await this.client.get(`/${userId}`, {
        params: { fields: 'id,username,profile_picture_url' },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get Instagram user profile: ${error.message}`);
      throw error;
    }
  }
}