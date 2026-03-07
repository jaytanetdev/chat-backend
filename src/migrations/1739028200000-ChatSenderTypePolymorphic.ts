import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChatSenderTypePolymorphic1739028200000
  implements MigrationInterface
{
  name = 'ChatSenderTypePolymorphic1739028200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "chat_sender_type_enum" AS ENUM ('customer', 'admin', 'system');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    const hasSenderType = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'chat' AND column_name = 'sender_type'`,
    );
    if (Array.isArray(hasSenderType) && hasSenderType.length > 0) return;

    await queryRunner.query(`
      ALTER TABLE "chat"
      ADD COLUMN "sender_type" "chat_sender_type_enum" NOT NULL DEFAULT 'customer',
      ADD COLUMN "sender_id" uuid
    `);

    await queryRunner.query(`
      UPDATE "chat"
      SET "sender_type" = 'admin', "sender_id" = "sender_user_id"
      WHERE "sender_user_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "chat_sender_idx"
      ON "chat" ("sender_type", "sender_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "chat_sender_idx"`);
    await queryRunner.query(`
      ALTER TABLE "chat"
      DROP COLUMN IF EXISTS "sender_type",
      DROP COLUMN IF EXISTS "sender_id"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "chat_sender_type_enum"`);
  }
}
