import { Controller, Post, Get, Body, Headers, RawBody, HttpCode, Query, Logger, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { LineWebhookService } from '../line/line-webhook.service';
import { FacebookWebhookService } from '../facebook/facebook-webhook.service';
import { InstagramWebhookService } from '../instagram/instagram-webhook.service';
import { LineMessagingService } from '../line/line-messaging.service';
import { Public } from '../../modules/auth/decorators/public.decorator';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly lineWebhookService: LineWebhookService,
    private readonly lineMessagingService: LineMessagingService,
    private readonly facebookWebhookService: FacebookWebhookService,
    private readonly instagramWebhookService: InstagramWebhookService,
  ) {}

  /**
   * LINE Webhook
   * https://developers.line.biz/en/reference/messaging-api/#request-headers
   */
  @Public()
  @Post('line')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive LINE webhook events' })
  @ApiResponse({ status: 200, description: 'Events processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid signature or payload' })
  async handleLineWebhook(
    @Req() req: Request,
    @Headers('x-line-signature') signature: string,
    @Body() body: any,
  ): Promise<{ status: string; processed: number }> {
    this.logger.debug(`Received LINE webhook: ${JSON.stringify(body)}`);

    // Verify signature
    if (signature) {
      const isValid = this.lineWebhookService.verifySignature(JSON.stringify(req.body), signature);
      if (!isValid) {
        this.logger.warn('Invalid LINE webhook signature');
        return { status: 'error', processed: 0 };
      }
    }

    // Process webhook
    const result = await this.lineWebhookService.processWebhook(body);

    return {
      status: 'success',
      processed: result.processed,
    };
  }

  /**
   * Facebook Webhook
   * https://developers.facebook.com/docs/messenger-platform/webhooks#setup
   */
  @Public()
  @Get('facebook')
  @ApiOperation({ summary: 'Verify Facebook webhook' })
  verifyFacebookWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string | null {
    this.logger.debug(`Facebook webhook verification: mode=${mode}, token=${token}`);
    return this.facebookWebhookService.verifyWebhook(mode, token, challenge);
  }

  @Public()
  @Post('facebook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Facebook webhook events' })
  async handleFacebookWebhook(
    @Req() req: Request,
    @Headers('x-hub-signature-256') signature: string,
    @Body() body: any,
  ): Promise<{ status: string; processed: number }> {
    this.logger.debug(`Received Facebook webhook: ${JSON.stringify(body)}`);

    // Verify signature
    if (signature) {
      const isValid = this.facebookWebhookService.verifySignature(JSON.stringify(req.body), signature);
      if (!isValid) {
        this.logger.warn('Invalid Facebook webhook signature');
        return { status: 'error', processed: 0 };
      }
    }

    // Process webhook
    const result = await this.facebookWebhookService.processWebhook(body);

    return {
      status: 'success',
      processed: result.processed,
    };
  }

  /**
   * Instagram Webhook
   * Uses same webhook endpoint as Facebook
   */
  @Public()
  @Get('instagram')
  @ApiOperation({ summary: 'Verify Instagram webhook' })
  verifyInstagramWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string | null {
    this.logger.debug(`Instagram webhook verification: mode=${mode}, token=${token}`);
    return this.instagramWebhookService.verifyWebhook(mode, token, challenge);
  }

  @Public()
  @Post('instagram')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Instagram webhook events' })
  async handleInstagramWebhook(
    @Req() req: Request,
    @Headers('x-hub-signature-256') signature: string,
    @Body() body: any,
  ): Promise<{ status: string; processed: number }> {
    this.logger.debug(`Received Instagram webhook: ${JSON.stringify(body)}`);

    // Instagram uses same signature verification as Facebook
    if (signature) {
      const isValid = this.facebookWebhookService.verifySignature(JSON.stringify(req.body), signature);
      if (!isValid) {
        this.logger.warn('Invalid Instagram webhook signature');
        return { status: 'error', processed: 0 };
      }
    }

    // Process webhook
    const result = await this.instagramWebhookService.processWebhook(body);

    return {
      status: 'success',
      processed: result.processed,
    };
  }

  /**
   * Shopee Webhook (if supported by Shopee)
   * Currently Shopee uses polling instead of webhooks
   */
  @Public()
  @Post('shopee')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Shopee webhook events (if available)' })
  handleShopeeWebhook(@Body() body: any): { status: string } {
    this.logger.debug(`Received Shopee webhook: ${JSON.stringify(body)}`);
    return { status: 'received' };
  }

  /**
   * Lazada Webhook (if supported by Lazada)
   * Currently Lazada uses polling instead of webhooks
   */
  @Public()
  @Post('lazada')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Lazada webhook events (if available)' })
  handleLazadaWebhook(@Body() body: any): { status: string } {
    this.logger.debug(`Received Lazada webhook: ${JSON.stringify(body)}`);
    return { status: 'received' };
  }
}