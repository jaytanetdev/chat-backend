---
name: test-engineer
description: >-
  Write and run unit tests, integration tests, and E2E tests for NestJS backend.
  Use when creating test files, improving coverage, or verifying functionality with tests.
---

# Test Engineer

Specialist for writing comprehensive tests using Jest + @nestjs/testing.

## When to Use

- Writing unit tests for new or existing services/controllers
- Writing E2E tests for API endpoints
- Improving test coverage
- Fixing broken tests

## Test Commands

```bash
npm run test              # Run all unit tests
npm run test:watch        # Watch mode
npm run test:cov          # Coverage report (output: coverage/)
npm run test:e2e          # E2E tests (test/jest-e2e.json)
```

## Service Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('FeatureService', () => {
  let service: FeatureService;
  let repo: jest.Mocked<Repository<Entity>>;

  const mockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn((entity) => Promise.resolve({ ...entity, id: 'uuid' })),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getRawAndEntities: jest.fn().mockResolvedValue({ entities: [], raw: [] }),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureService,
        { provide: getRepositoryToken(Entity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get(FeatureService);
    repo = module.get(getRepositoryToken(Entity));
    jest.clearAllMocks();
  });
});
```

## What to Test per Service

| Method | Test Cases |
|--------|-----------|
| findAll | Returns array, handles empty |
| findOne | Returns entity, throws AppException when not found |
| create | Calls repo.create + repo.save, returns created entity |
| update | Validates existence, partial update, returns updated |
| remove | Validates existence, calls delete |
| Business logic | Edge cases, validation, external service calls |

## Mocking External Services

```typescript
{ provide: LineMessagingService, useValue: { getUserProfile: jest.fn(), sendTextMessage: jest.fn(), isConfigured: jest.fn().mockResolvedValue(true) } }
{ provide: ChatEmitterService, useValue: { emitNewMessage: jest.fn(), emitRoomUpdated: jest.fn() } }
{ provide: ConfigService, useValue: { get: jest.fn((key) => configMap[key]) } }
```

## Coverage Goals

- All service public methods: >80% branch coverage
- All controller routes tested
- Error paths tested (AppException scenarios)
- Platform integrations: mock external HTTP calls

## After Writing Tests

1. Run `npm run test` — all must pass
2. Run `npm run test:cov` — check coverage for the module
3. Fix any failing tests before moving on
