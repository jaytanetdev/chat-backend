import { Controller, Post, Get, Body, Headers, RawBody, HttpCode, Query, Logger, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { LineWebhookService } from '../line/line-webhook.service';
import { FacebookWebhookService } from '../facebook/facebook-webhook.service';
import { InstagramWebhookService } from '../instagram/instagram-webhook.service';
import { LineMessagingService } from '../line/line-messaging.service';
import { ChatService } from '../chat/chat.service';
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
    private readonly chatService: ChatService,
  ) {}

  /**
   * LINE Webhook — always returns 200 immediately, processes async.
   * LINE retries if it doesn't get 200 within 1 second.
   */
  @Public()
  @Post('line')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive LINE webhook events' })
  @ApiResponse({ status: 200, description: 'Accepted' })
  handleLineWebhook(
    @Req() req: Request,
    @Headers('x-line-signature') signature: string,
    @Body() body: any,
  ): { status: string } {
    // Signature verification (sync — fast)
    if (signature) {
      const isValid = this.lineWebhookService.verifySignature(JSON.stringify(req.body), signature);
      if (!isValid) {
        this.logger.warn('Invalid LINE webhook signature');
        return { status: 'ok' };
      }
    }

    // Fire-and-forget: process events in background
    this.processLineEventsAsync(body).catch((err) =>
      this.logger.error(`Unhandled error in LINE webhook processing: ${err.message}`, err.stack),
    );

    return { status: 'ok' };
  }

  private async processLineEventsAsync(body: any): Promise<void> {
    const events = body.events ?? [];
    if (events.length === 0) return;

    this.logger.debug(`Processing ${events.length} LINE event(s) for destination ${body.destination}`);

    for (const event of events) {
      if (event.type === 'message' && event.source?.userId && event.message) {
        try {
          await this.chatService.processInboundWebhook({
            destination: body.destination,
            events: [event],
          });
        } catch (error) {
          this.logger.error(`Error processing LINE message event: ${error.message}`, error.stack);
        }
      } else {
        try {
          await this.lineWebhookService.processWebhook({ ...body, events: [event] });
        } catch (error) {
          this.logger.error(`Error processing LINE ${event.type} event: ${error.message}`);
        }
      }
    }
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
  handleFacebookWebhook(
    @Req() req: Request,
    @Headers('x-hub-signature-256') signature: string,
    @Body() body: any,
  ): { status: string } {
    this.logger.debug(`Received Facebook webhook: ${JSON.stringify(body).substring(0, 500)}`);

    if (signature) {
      const isValid = this.facebookWebhookService.verifySignature(JSON.stringify(req.body), signature);
      if (!isValid) {
        this.logger.warn('Invalid Facebook webhook signature');
        return { status: 'ok' };
      }
    }

    if (body.object === 'page' && body.entry) {
      this.chatService.processInboundFacebook(body).catch((err) =>
        this.logger.error(`Error processing Facebook webhook: ${err.message}`, err.stack),
      );
    } else if (body.object === 'instagram' && body.entry) {
      this.logger.debug('Instagram event received on Facebook endpoint, routing to IG handler');
      this.chatService.processInboundInstagram(body).catch((err) =>
        this.logger.error(`Error processing Instagram webhook: ${err.message}`, err.stack),
      );
    }

    return { status: 'ok' };
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
  handleInstagramWebhook(
    @Req() req: Request,
    @Headers('x-hub-signature-256') signature: string,
    @Body() body: any,
  ): { status: string } {
    this.logger.debug(`Received Instagram webhook: ${JSON.stringify(body).substring(0, 500)}`);

    if (signature) {
      const isValid = this.facebookWebhookService.verifySignature(JSON.stringify(req.body), signature);
      if (!isValid) {
        this.logger.warn('Invalid Instagram webhook signature');
        return { status: 'ok' };
      }
    }

    if (body.object === 'instagram' && body.entry) {
      this.chatService.processInboundInstagram(body).catch((err) =>
        this.logger.error(`Error processing Instagram webhook: ${err.message}`, err.stack),
      );
    }

    return { status: 'ok' };
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