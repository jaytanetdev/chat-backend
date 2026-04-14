---
name: integrator
description: >-
  Integrate external platform APIs: LINE, Facebook, Instagram, Shopee, Lazada.
  Use when connecting third-party messaging APIs, handling webhooks, or building platform connectors.
---

# Integrator

Specialist for integrating external messaging platform APIs.

## Supported Platforms

| Platform | Module | Messaging Service | Webhook/Polling |
|----------|--------|-------------------|-----------------|
| LINE | `modules/line/` | `LineMessagingService` | `LineWebhookService` |
| Facebook | `modules/facebook/` | `FacebookMessagingService` | `FacebookWebhookService` |
| Instagram | `modules/instagram/` | `InstagramMessagingService` | `InstagramWebhookService` |
| Shopee | `modules/shopee/` | `ShopeeMessagingService` | `ShopeePollingService` (stub) |
| Lazada | `modules/lazada/` | `LazadaMessagingService` | `LazadaPollingService` (stub) |

## Integration Pattern

### Inbound (Customer → System)

```
Webhook POST → WebhooksController → Platform WebhookService
  → POST /chats/webhook/inbound → ChatService.processInboundWebhook()
    → Find Platform → FindOrCreate CustomerIdentity → FindOrCreate Room
    → Save Chat → Emit via WebSocket
```

### Outbound (Admin → Customer)

```
POST /chats/send → ChatService → save Chat → sendMessageToPlatform()
  → switch(platform_type) → PlatformMessagingService.sendTextMessage()
```

## LINE API Reference

- **Base URL**: `https://api.line.me/v2/bot`
- **Content URL**: `https://api-data.line.me/v2/bot/message/{messageId}/content`
- **Auth**: `Authorization: Bearer {channel_access_token}` (from Credential table)
- **Push message**: `POST /message/push` (max 5 messages)
- **Get profile**: `GET /profile/{userId}` → `{ displayName, pictureUrl, statusMessage }`
- **Message types**: text, image, video, audio, file, sticker, location

### LINE Webhook Event Structure

```json
{
  "destination": "LINE_CHANNEL_ID",
  "events": [{
    "type": "message",
    "source": { "type": "user", "userId": "U..." },
    "message": { "type": "text|image|video|audio|sticker", "id": "...", "text": "..." },
    "replyToken": "..."
  }]
}
```

## Credential Management

Tokens are stored in `credential` table per platform. Use `CredentialService.getAccessTokenByPlatform(platformId)` to retrieve.

## Adding a New Platform Integration

1. Create module: `src/modules/platform-name/`
2. Create `PlatformMessagingService` with `sendTextMessage()`, `isConfigured()`
3. Create webhook handler or polling service
4. Add case in `ChatService.sendMessageToPlatform()` switch
5. Register module in `app.module.ts`
6. Add webhook route in `WebhooksController`
7. Add env vars to `configuration.ts`
8. Write tests for the messaging service

## Verification After Integration

- Test inbound: send message from platform → verify Chat record created + WebSocket emitted
- Test outbound: send from UI → verify platform API called
- Check error handling for API failures (timeouts, auth errors)
- Verify idempotency (duplicate message handling via external_message_id)
