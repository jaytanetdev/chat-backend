---
name: api-developer
description: >-
  Build NestJS REST APIs: controllers, services, DTOs, entities, migrations, and guards.
  Use when creating new API endpoints, CRUD modules, database schema changes, or backend business logic.
---

# API Developer

Specialist for building backend APIs in this NestJS 11 + TypeORM + PostgreSQL project.

## When to Use

- Creating new REST endpoints or modules
- Adding/modifying entities and database schema
- Writing DTOs with validation
- Creating migrations
- Implementing business logic in services

## New Module Checklist

1. Create entity in `src/entities/` → export from `src/entities/index.ts` → register in `app.module.ts`
2. Create module directory: `src/modules/feature-name/`
3. Create files: `feature.module.ts`, `feature.controller.ts`, `feature.service.ts`, `dto/`
4. Import module in `app.module.ts`
5. Generate migration: `npm run migration:generate src/migrations/TIMESTAMP-Description`
6. Write unit tests: `feature.service.spec.ts`, `feature.controller.spec.ts`

## Entity Template

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('table_name')
export class FeatureName {
  @PrimaryGeneratedColumn('uuid')
  feature_name_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
```

## Service Template

```typescript
@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);

  constructor(
    @InjectRepository(Feature)
    private readonly featureRepo: Repository<Feature>,
  ) {}

  async findAll(): Promise<Feature[]> {
    return this.featureRepo.find();
  }

  async findOne(id: string): Promise<Feature> {
    const entity = await this.featureRepo.findOne({ where: { feature_id: id } });
    if (!entity) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Feature not found', HttpStatus.NOT_FOUND);
    }
    return entity;
  }
}
```

## DTO Template

```typescript
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  name: string;

  @IsUUID()
  @IsOptional()
  parent_id?: string;
}
```

## Validation Rules

- Always use `AppException` from `common/errors` for errors
- Always add `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)` unless public
- Use `@Public()` for unauthenticated routes
- Run `npm run test` after changes
