import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastMessageText1739028600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "room"
      ADD COLUMN IF NOT EXISTS "last_message_text" varchar(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "room"
      DROP COLUMN IF EXISTS "last_message_text"
    `);
  }
}
