import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface ShopeeMessage {
  message_id: string;
  from_user_id: string;
  to_user_id: string;
  message_type: 'text' | 'image' | 'sticker' | 'order' | 'product';
  content: {
    text?: string;
    image_url?: string;
    sticker_id?: string;
    sticker_package_id?: string;
    order_sn?: string;
    item_id?: number;
  };
  created_at: number;
}

@Injectable()
export class ShopeeMessagingService {
  private readonly logger = new Logger(ShopeeMessagingService.name);
  private readonly client: AxiosInstance;
  private readonly baseURL = 'https://partner.shopeemobile.com';

  constructor(private readonly configService: ConfigService) {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error(
          `Shopee API error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
        );
        return Promise.reject(error);
      },
    );
  }

  /**
   * Check if Shopee is configured
   */
  isConfigured(): boolean {
    const partnerId = this.configService.get<number>('SHOPEE_PARTNER_ID');
    const partnerKey = this.configService.get<string>('SHOPEE_PARTNER_KEY');
    return !!partnerId && !!partnerKey;
  }

  /**
   * Generate signature for API calls
   */
  private generateSignature(apiPath: string, timestamp: number, shopId?: number): string {
    const partnerKey = this.configService.get<string>('SHOPEE_PARTNER_KEY');
    const partnerId = this.configService.get<number>('SHOPEE_PARTNER_ID');
    if (!partnerKey) {
      throw new Error('Shopee partner key not configured');
    }
    const baseString = `${partnerId}${apiPath}${timestamp}${shopId || ''}`;
    return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
  }

  /**
   * Get messages from Shopee
   * https://open.shopee.com/documents/v2/v2.sellerchat.get_message
   */
  async getMessages(shopId: number, fromMessageId?: string): Promise<{
    messages: ShopeeMessage[];
    next_cursor: string | null;
  }> {
    if (!this.isConfigured()) {
      throw new Error('Shopee not configured');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/sellerchat/get_message';
    const signature = this.generateSignature(apiPath, timestamp, shopId);
    const partnerId = this.configService.get<number>('SHOPEE_PARTNER_ID');

    const params = {
      partner_id: partnerId,
      timestamp,
      sign: signature,
      shop_id: shopId,
      from_message_id: fromMessageId,
      limit: 100,
    };

    try {
      const response = await this.client.get(apiPath, { params });
      return {
        messages: response.data.response?.messages || [],
        next_cursor: response.data.response?.next_cursor || null,
      };
    } catch (error) {
      this.logger.error(`Failed to get Shopee messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send message to Shopee user
   * https://open.shopee.com/documents/v2/v2.sellerchat.send_message
   */
  async sendMessage(
    shopId: number,
    toUserId: string,
    messageType: 'text' | 'image',
    content: { text?: string; url?: string },
  ): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn('Shopee not configured, cannot send message');
      throw new Error('Shopee not configured');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/sellerchat/send_message';
    const signature = this.generateSignature(apiPath, timestamp, shopId);
    const partnerId = this.configService.get<number>('SHOPEE_PARTNER_ID');

    const body = {
      to_user_id: toUserId,
      message_type: messageType,
      content,
    };

    const params = {
      partner_id: partnerId,
      timestamp,
      sign: signature,
      shop_id: shopId,
    };

    try {
      await this.client.post(apiPath, body, { params });
      this.logger.debug(`Shopee message sent to ${toUserId}`);
    } catch (error) {
      this.logger.error(`Failed to send Shopee message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send text message
   */
  async sendTextMessage(shopId: number, toUserId: string, text: string): Promise<void> {
    await this.sendMessage(shopId, toUserId, 'text', { text: text.slice(0, 1000) });
  }
}