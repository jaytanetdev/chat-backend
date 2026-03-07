import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropChatSenderUserId1739028300000 implements MigrationInterface {
  name = 'DropChatSenderUserId1739028300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat" DROP COLUMN IF EXISTS "sender_user_id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat" ADD COLUMN "sender_user_id" uuid
    `);
  }
}
