import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchemaMultiPlatform1739027700000 implements MigrationInterface {
  name = 'SchemaMultiPlatform1739027700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) platforms: add external_account_id; platform_name nullable (idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "platforms" ADD COLUMN "external_account_id" varchar(255);
      EXCEPTION WHEN duplicate_column THEN NULL; END $$
    `);
    await queryRunner.query(`
      ALTER TABLE "platforms" ALTER COLUMN "platform_name" DROP NOT NULL
    `);

    // 2) credential: add columns one by one (idempotent); api_key nullable
    for (const col of [
      `ADD COLUMN "access_token" text`,
      `ADD COLUMN "secret" text`,
      `ADD COLUMN "verify_token" varchar(255)`,
      `ADD COLUMN "refresh_token" text`,
      `ADD COLUMN "expires_at" TIMESTAMPTZ`,
    ]) {
      await queryRunner.query(`
        DO $$ BEGIN ALTER TABLE "credential" ${col}; EXCEPTION WHEN duplicate_column THEN NULL; END $$
      `);
    }
    await queryRunner.query(`
      ALTER TABLE "credential" ALTER COLUMN "api_key" DROP NOT NULL
    `);

    // 3) customer_identities: new table (idempotent)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_identities" (
        "customer_identity_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "platform_id" uuid NOT NULL,
        "external_user_id" varchar(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customer_identities" PRIMARY KEY ("customer_identity_id"),
        CONSTRAINT "UQ_customer_identities_platform_external" UNIQUE ("platform_id", "external_user_id"),
        CONSTRAINT "FK_customer_identities_platform" FOREIGN KEY ("platform_id") REFERENCES "platforms"("platforms_id") ON DELETE CASCADE
      )
    `);

    // 4) room: add columns one by one (idempotent), then constraint, index
    for (const col of [
      `ADD COLUMN "customer_identity_id" uuid`,
      `ADD COLUMN "last_message_at" TIMESTAMPTZ`,
      `ADD COLUMN "status" varchar(50)`,
    ]) {
      await queryRunner.query(`
        DO $$ BEGIN ALTER TABLE "room" ${col}; EXCEPTION WHEN duplicate_column THEN NULL; END $$
      `);
    }
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "room"
        ADD CONSTRAINT "FK_room_customer_identity"
        FOREIGN KEY ("customer_identity_id") REFERENCES "customer_identities"("customer_identity_id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_room_customer_identity"
      ON "room" ("customer_identity_id")
      WHERE "customer_identity_id" IS NOT NULL
    `);

    // 5) chat: enum, columns, nullable, index (idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "chat_direction_enum" AS ENUM ('IN', 'OUT');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    for (const col of [
      `ADD COLUMN "direction" "chat_direction_enum" DEFAULT 'OUT'`,
      `ADD COLUMN "external_message_id" varchar(255)`,
      `ADD COLUMN "raw_payload" jsonb`,
    ]) {
      await queryRunner.query(`
        DO $$ BEGIN ALTER TABLE "chat" ${col}; EXCEPTION WHEN duplicate_column THEN NULL; END $$
      `);
    }
    await queryRunner.query(`
      ALTER TABLE "chat" ALTER COLUMN "sender_user_id" DROP NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_room_external_message"
      ON "chat" ("room_id", "external_message_id")
      WHERE "external_message_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_chat_room_external_message"`);
    await queryRunner.query(`ALTER TABLE "chat" DROP COLUMN "raw_payload", DROP COLUMN "external_message_id", DROP COLUMN "direction"`);
    await queryRunner.query(`ALTER TABLE "chat" ALTER COLUMN "sender_user_id" SET NOT NULL`);
    await queryRunner.query(`DROP TYPE "chat_direction_enum"`);

    await queryRunner.query(`DROP INDEX "UQ_room_customer_identity"`);
    await queryRunner.query(`ALTER TABLE "room" DROP CONSTRAINT "FK_room_customer_identity"`);
    await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "status", DROP COLUMN "last_message_at", DROP COLUMN "customer_identity_id"`);

    await queryRunner.query(`DROP TABLE "customer_identities"`);

    await queryRunner.query(`ALTER TABLE "credential" ALTER COLUMN "api_key" SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "credential"
      DROP COLUMN "expires_at", DROP COLUMN "refresh_token", DROP COLUMN "verify_token",
      DROP COLUMN "secret", DROP COLUMN "access_token"
    `);

    await queryRunner.query(`ALTER TABLE "platforms" ALTER COLUMN "platform_name" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "platforms" DROP COLUMN "external_account_id"`);
  }
}
