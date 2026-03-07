import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchemaEnhancements1739028500000 implements MigrationInterface {
  name = 'SchemaEnhancements1739028500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Platform: add platform_type enum
    await queryRunner.query(`
      CREATE TYPE "platform_type_enum" AS ENUM ('LINE', 'FACEBOOK', 'INSTAGRAM', 'SHOPEE', 'LAZADA')
    `);
    await queryRunner.query(`
      ALTER TABLE "platforms"
      ADD "platform_type" "platform_type_enum" NOT NULL DEFAULT 'LINE'
    `);

    // 2. Room: add assigned_user_id, unread_count, convert status to enum
    await queryRunner.query(`
      ALTER TABLE "room"
      ADD "assigned_user_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "room"
      ADD "unread_count" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      CREATE TYPE "room_status_enum" AS ENUM ('ACTIVE', 'PENDING', 'RESOLVED', 'CLOSED')
    `);
    await queryRunner.query(`
      ALTER TABLE "room"
      ALTER COLUMN "status" TYPE "room_status_enum"
      USING COALESCE("status"::text::"room_status_enum", 'ACTIVE'::"room_status_enum")
    `);
    await queryRunner.query(`
      ALTER TABLE "room"
      ALTER COLUMN "status" SET DEFAULT 'ACTIVE'
    `);
    await queryRunner.query(`
      ALTER TABLE "room"
      ALTER COLUMN "status" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "room"
      ADD CONSTRAINT "FK_room_assigned_user"
      FOREIGN KEY ("assigned_user_id") REFERENCES "users"("user_id")
      ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_room_assigned_user_id" ON "room" ("assigned_user_id")
    `);

    // 3. Chat: add metadata (jsonb)
    await queryRunner.query(`
      ALTER TABLE "chat"
      ADD "metadata" jsonb
    `);

    // 4. ChatReadReceipt table
    await queryRunner.query(`
      CREATE TABLE "chat_read_receipts" (
        "chat_read_receipt_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "chat_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "read_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_read_receipts" PRIMARY KEY ("chat_read_receipt_id"),
        CONSTRAINT "UQ_chat_read_receipts_chat_user" UNIQUE ("chat_id", "user_id"),
        CONSTRAINT "FK_chat_read_receipts_chat" FOREIGN KEY ("chat_id") REFERENCES "chat"("chat_id") ON DELETE CASCADE,
        CONSTRAINT "FK_chat_read_receipts_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE
      )
    `);

    // 5. CustomerIdentity: add display_name, avatar_url
    await queryRunner.query(`
      ALTER TABLE "customer_identities"
      ADD "display_name" varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "customer_identities"
      ADD "avatar_url" text
    `);

    // 6. RoomMember: add role enum, joined_at
    await queryRunner.query(`
      CREATE TYPE "room_member_role_enum" AS ENUM ('PRIMARY', 'SECONDARY', 'OBSERVER')
    `);
    await queryRunner.query(`
      ALTER TABLE "room_members"
      ADD "role" "room_member_role_enum" NOT NULL DEFAULT 'SECONDARY'
    `);
    await queryRunner.query(`
      ALTER TABLE "room_members"
      ADD "joined_at" TIMESTAMP NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 6. RoomMember: drop role, joined_at
    await queryRunner.query(`ALTER TABLE "room_members" DROP COLUMN "joined_at"`);
    await queryRunner.query(`ALTER TABLE "room_members" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE "room_member_role_enum"`);

    // 5. CustomerIdentity: drop display_name, avatar_url
    await queryRunner.query(`ALTER TABLE "customer_identities" DROP COLUMN "avatar_url"`);
    await queryRunner.query(`ALTER TABLE "customer_identities" DROP COLUMN "display_name"`);

    // 4. ChatReadReceipt: drop table
    await queryRunner.query(`DROP TABLE "chat_read_receipts"`);

    // 3. Chat: drop metadata
    await queryRunner.query(`ALTER TABLE "chat" DROP COLUMN "metadata"`);

    // 2. Room: revert status, drop unread_count, assigned_user_id
    await queryRunner.query(`DROP INDEX "IDX_room_assigned_user_id"`);
    await queryRunner.query(`ALTER TABLE "room" DROP CONSTRAINT "FK_room_assigned_user"`);
    await queryRunner.query(`ALTER TABLE "room" ALTER COLUMN "status" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "room" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "room" ALTER COLUMN "status" TYPE varchar(50) USING "status"::text`);
    await queryRunner.query(`DROP TYPE "room_status_enum"`);
    await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "unread_count"`);
    await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "assigned_user_id"`);

    // 1. Platform: drop platform_type
    await queryRunner.query(`ALTER TABLE "platforms" DROP COLUMN "platform_type"`);
    await queryRunner.query(`DROP TYPE "platform_type_enum"`);
  }
}
