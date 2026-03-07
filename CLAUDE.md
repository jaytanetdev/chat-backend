# Backend - AI Documentation

## Architecture
NestJS modular architecture with Domain-Driven Design patterns.

```
src/
├── app.module.ts              # Root module
├── main.ts                    # Bootstrap with Swagger
├── data-source.ts             # TypeORM CLI config
├── config/                    # Environment configuration
├── common/                    # Shared utilities
│   ├── errors/               # Error codes & AppException
│   └── filters/              # Global exception filter
├── entities/                 # TypeORM entities (10 tables)
├── migrations/               # Database migrations
└── modules/                  # Feature modules
    ├── auth/                 # JWT authentication
    ├── chat/                 # Core chat + WebSocket
    ├── credential/           # Platform API credentials
    ├── customer-identity/    # External user mapping
    ├── platform/             # Platform configuration
    ├── room/                 # Chat rooms
    ├── shop/                 # Shop/tenant management
    ├── user/                 # Admin users
    └── user-platform/        # User-platform assignments
```

## Database Schema

### Core Entities (10 tables)

#### 1. Shop (Tenant)
```typescript
@Entity('shops')
class Shop {
  @PrimaryGeneratedColumn('uuid') shop_id: string;
  @Column() shop_name: string;
  @Column({ default: true }) is_active: boolean;
}
```

#### 2. Platform (Channel Config)
```typescript
@Entity('platforms')
class Platform {
  @PrimaryGeneratedColumn('uuid') platforms_id: string;
  @Column({ type: 'enum', enum: ['LINE', 'FACEBOOK', 'INSTAGRAM', 'SHOPEE', 'LAZADA'] })
  platform_type: PlatformType;
  @Column() external_account_id: string;  // LINE bot ID, FB page ID
  @Column() platform_name: string;
  @ManyToOne(() => Shop) shop: Shop;
}
```

#### 3. Credential (API Keys)
```typescript
@Entity('credentials')
class Credential {
  @PrimaryGeneratedColumn('uuid') credential_id: string;
  @Column() api_key: string;
  @Column() access_token: string;
  @Column() secret: string;
  @Column({ nullable: true }) refresh_token: string;
  @Column({ nullable: true }) expires_at: Date;
}
```

#### 4. CustomerIdentity (External Users)
```typescript
@Entity('customer_identities')
class CustomerIdentity {
  @PrimaryGeneratedColumn('uuid') customer_identity_id: string;
  @Column() external_user_id: string;  // LINE userId, FB PSID
  @Column() display_name: string;
  @Column({ nullable: true }) avatar_url: string;
}
```

#### 5. User (Admin Users)
```typescript
@Entity('users')
class User {
  @PrimaryGeneratedColumn('uuid') user_id: string;
  @Column({ enum: ['ADMIN', 'USER'] }) role: UserRole;
  @Column({ unique: true }) username: string;
  @Column() password: string;  // bcrypt hashed
}
```

#### 6. Room (Chat Rooms)
```typescript
@Entity('rooms')
class Room {
  @PrimaryGeneratedColumn('uuid') room_id: string;
  @Column({ enum: ['ACTIVE', 'PENDING', 'RESOLVED', 'CLOSED'] })
  status: RoomStatus;
  @Column({ default: 0 }) unread_count: number;
  @Column({ nullable: true }) assigned_user_id: string;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
```

#### 7. RoomMember
```typescript
@Entity('room_members')
class RoomMember {
  @PrimaryGeneratedColumn('uuid') room_member_id: string;
  @Column({ enum: ['PRIMARY', 'SECONDARY', 'OBSERVER'] })
  role: MemberRole;
}
```

#### 8. Chat (Messages)
```typescript
@Entity('chats')
class Chat {
  @PrimaryGeneratedColumn('uuid') chat_id: string;
  @Column({ enum: ['IN', 'OUT'] }) direction: ChatDirection;
  @Column({ enum: ['CUSTOMER', 'ADMIN', 'SYSTEM'] })
  sender_type: SenderType;
  @Column({ nullable: true }) sender_id: string;
  @Column({ enum: ['TEXT', 'IMAGE', 'VIDEO', 'FILE'] })
  message_type: MessageType;
  @Column({ type: 'text' }) content: string;
  @Column({ nullable: true }) external_message_id: string;
  @CreateDateColumn() created_at: Date;
}
```

#### 9. ChatReadReceipt
```typescript
@Entity('chat_read_receipts')
class ChatReadReceipt {
  @PrimaryGeneratedColumn('uuid') read_receipt_id: string;
  @Column() chat_id: string;
  @Column() user_id: string;
  @CreateDateColumn() read_at: Date;
}
```

#### 10. UserPlatform (Junction)
```typescript
@Entity('user_platforms')
class UserPlatform {
  @PrimaryGeneratedColumn('uuid') user_platform_id: string;
  // Links User to Platform
}
```

## Key Design Patterns

### 1. Polymorphic Sender
Chat entity uses `sender_type` + `sender_id` to support multiple sender types:
- CUSTOMER + customer_id
- ADMIN + user_id
- SYSTEM (null id)

### 2. External ID Mapping
- `Platform.external_account_id` = LINE bot ID, FB page ID
- `CustomerIdentity.external_user_id` = LINE userId, FB PSID
- `Chat.external_message_id` = Platform's message ID (for deduplication)

### 3. Unique Constraints
- Room: unique per `(customer_identity_id, platforms_id)`
- Chat: unique per `(room_id, external_message_id)`
- CustomerIdentity: unique per `(platforms_id, external_user_id)`

## Authentication

### JWT Strategy
```typescript
// JwtStrategy validates token and attaches user to request
@Injectable()
class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.jwt.secret,
    });
  }
}
```

### Guards
- `JwtAuthGuard` - Validates JWT token
- `RolesGuard` - Checks user role

### Decorators
- `@Public()` - Skip auth (for webhooks)
- `@Roles('ADMIN', 'USER')` - Role requirement
- `@CurrentUser()` - Get current user from request

## WebSocket (Socket.io)

### Gateway: ChatGateway
```typescript
@WebSocketGateway({ namespace: 'chat', cors: { origin: '*' } })
class ChatGateway {
  @SubscribeMessage('join_room')
  handleJoinRoom(client: Socket, roomId: string) {}

  @SubscribeMessage('send_message')
  async handleSendMessage(client: Socket, data: SendMessageDto) {}

  @SubscribeMessage('typing')
  handleTyping(client: Socket, data: TypingDto) {}

  @SubscribeMessage('mark_read')
  async handleMarkRead(client: Socket, data: MarkReadDto) {}
}
```

### Events
**Client → Server:**
- `join_room` / `leave_room`
- `send_message`
- `typing`
- `mark_read`

**Server → Client:**
- `new_message` - New message in room
- `room_updated` - Room metadata changed
- `messages_read` - Read receipts updated
- `typing` - Typing indicator

## Services Pattern

### Standard Service Structure
```typescript
@Injectable()
class EntityService {
  constructor(
    @InjectRepository(Entity)
    private readonly repo: Repository<Entity>,
    private readonly relatedService: RelatedService,
  ) {}

  async findAll(options?: FindOptions): Promise<Entity[]> {}
  async findOne(id: string): Promise<Entity> {}
  async create(dto: CreateDto): Promise<Entity> {}
  async update(id: string, dto: UpdateDto): Promise<Entity> {}
  async remove(id: string): Promise<void> {}
}
```

## Error Handling

### AppException
```typescript
throw new AppException(
  'ERROR_CODE',           // From error-codes.ts
  'Human readable message',
  HttpStatus.BAD_REQUEST
);
```

### Error Codes (error-codes.ts)
- `AUTH_001` - Invalid credentials
- `AUTH_002` - Token expired
- `ENTITY_001` - Entity not found
- `PLATFORM_001` - Platform not configured
- etc.

## Configuration

### Config Service (config/configuration.ts)
```typescript
export default () => ({
  port: parseInt(process.env.PORT, 10) || 9000,
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  platforms: {
    line: {
      channelSecret: process.env.LINE_CHANNEL_SECRET,
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    },
    facebook: {
      appSecret: process.env.FB_APP_SECRET,
      pageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN,
    },
    instagram: {
      verifyToken: process.env.IG_VERIFY_TOKEN,
    },
  },
});
```

## Migrations

### Run Migrations
```bash
npm run migration:run
```

### Generate Migration
```bash
npm run migration:generate -- -n MigrationName
```

## Platform Integration Pattern

### Inbound Webhook Flow
1. Platform sends webhook → `POST /webhooks/:platform`
2. Verify webhook signature (platform-specific)
3. Extract `external_account_id`, `external_user_id`
4. Find/create Platform, CustomerIdentity, Room
5. Create Chat with direction=IN
6. Emit `new_message` via WebSocket
7. Increment room unread_count

### Outbound Message Flow
1. Admin sends message via WebSocket or API
2. Create Chat with direction=OUT
3. Call Platform API to send message
4. Handle success/failure
5. Emit `new_message` via WebSocket

## Testing

### Unit Tests
```bash
npm test
```

### E2E Tests
```bash
npm run test:e2e
```

## Important Files

| File | Purpose |
|------|---------|
| `main.ts` | Bootstrap, Swagger setup |
| `app.module.ts` | Root module, imports all modules |
| `data-source.ts` | TypeORM CLI configuration |
| `config/configuration.ts` | Environment variables |
| `common/errors/error-codes.ts` | Error code definitions |
| `common/filters/http-exception.filter.ts` | Global error handler |
| `entities/index.ts` | Entity exports |

## API Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

## Development Guidelines

1. **Always use DTOs** for API inputs (class-validator decorators)
2. **Always use transactions** for multi-table operations
3. **Use soft deletes** where appropriate
4. **Never expose sensitive fields** (use class-transformer @Exclude)
5. **Use pagination** for list endpoints (cursor-based for chats)
6. **Add Swagger decorators** to all controllers
7. **Follow existing naming conventions** (snake_case DB, camelCase TS)

## Platform-Specific Notes

### LINE
- Webhook signature verification using channel secret
- Message types: text, image, video, audio, location, sticker
- Reply token valid for 1 minute only

### Facebook
- Webhook verification using app secret
- PSID (Page-scoped ID) for users
- Message types: text, image, video, audio, file, quick replies

### Instagram
- Uses Facebook Graph API
- Instagram-scoped ID for users
- Story replies and mentions supported

### Shopee
- API key + shop ID authentication
- Polling-based message retrieval
- Message types: text, image

### Lazada
- API key + shop code authentication
- Polling-based message retrieval
- Message types: text, image
