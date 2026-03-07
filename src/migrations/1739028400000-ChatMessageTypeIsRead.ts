import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChatMessageTypeIsRead1739028400000 implements MigrationInterface {
  name = 'ChatMessageTypeIsRead1739028400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasMessageType = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'chat' AND column_name = 'message_type'`,
    );
    if (!(Array.isArray(hasMessageType) && hasMessageType.length > 0)) {
      await queryRunner.query(`
        ALTER TABLE "chat"
        ADD COLUMN "message_type" varchar(50) NOT NULL DEFAULT 'TEXT'
      `);
    }

    const hasIsRead = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'chat' AND column_name = 'is_read'`,
    );
    if (!(Array.isArray(hasIsRead) && hasIsRead.length > 0)) {
      await queryRunner.query(`
        ALTER TABLE "chat"
        ADD COLUMN "is_read" boolean NOT NULL DEFAULT false
      `);
    }

    const columns = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'chat'
       AND column_name IN ('raw_payload', 'create_by')`,
    );
    const names = Array.isArray(columns) ? columns.map((r: { column_name: string }) => r.column_name) : [];
    if (names.length > 0) {
      const drops = names.map((c: string) => `DROP COLUMN "${c}"`).join(', ');
      await queryRunner.query(`ALTER TABLE "chat" ${drops}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chat" DROP COLUMN IF EXISTS "message_type"`);
    await queryRunner.query(`ALTER TABLE "chat" DROP COLUMN IF EXISTS "is_read"`);
    await queryRunner.query(`ALTER TABLE "chat" ADD COLUMN "create_by" uuid`);
    await queryRunner.query(`ALTER TABLE "chat" ADD COLUMN "raw_payload" jsonb`);
  }
}
