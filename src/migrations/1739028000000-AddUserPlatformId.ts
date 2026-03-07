import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPlatformId1739028000000 implements MigrationInterface {
  name = 'AddUserPlatformId1739028000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'user_platforms' AND column_name = 'user_platform_id'`,
    );
    if (Array.isArray(hasColumn) && hasColumn.length > 0) return;

    await queryRunner.query(`
      ALTER TABLE "user_platforms"
      ADD COLUMN "user_platform_id" uuid NOT NULL DEFAULT gen_random_uuid()
    `);
    await queryRunner.query(`
      ALTER TABLE "user_platforms" DROP CONSTRAINT "PK_user_platforms"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_platforms"
      ADD CONSTRAINT "PK_user_platforms" PRIMARY KEY ("user_platform_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "user_platforms"
      ADD CONSTRAINT "UQ_user_platforms_user_platform" UNIQUE ("user_id", "platforms_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_platforms" DROP CONSTRAINT IF EXISTS "UQ_user_platforms_user_platform"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_platforms" DROP CONSTRAINT "PK_user_platforms"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_platforms"
      ADD CONSTRAINT "PK_user_platforms" PRIMARY KEY ("user_id", "platforms_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "user_platforms" DROP COLUMN "user_platform_id"
    `);
  }
}
