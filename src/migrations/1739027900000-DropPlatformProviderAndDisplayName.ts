import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropPlatformProviderAndDisplayName1739027900000
  implements MigrationInterface
{
  name = 'DropPlatformProviderAndDisplayName1739027900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop unique constraint (uses provider + external_account_id); in PG it's a constraint, not a plain index
    await queryRunner.query(`
      ALTER TABLE "platforms" DROP CONSTRAINT IF EXISTS "UQ_platforms_provider_external_account"
    `);
    // Drop columns provider and display_name if they exist
    const columns = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'platforms'
       AND column_name IN ('provider', 'display_name')`,
    );
    const names = Array.isArray(columns) ? columns.map((r: { column_name: string }) => r.column_name) : [];
    if (names.includes('provider') || names.includes('display_name')) {
      const drops = names.map((c: string) => `DROP COLUMN "${c}"`).join(', ');
      await queryRunner.query(`ALTER TABLE "platforms" ${drops}`);
    }
    // Drop enum type if exists (no longer used)
    await queryRunner.query(`
      DROP TYPE IF EXISTS "platforms_provider_enum"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "platforms_provider_enum" AS ENUM ('LINE', 'FACEBOOK', 'IG');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      ALTER TABLE "platforms" ADD COLUMN "provider" "platforms_provider_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "platforms" ADD COLUMN "display_name" varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "platforms"
      ADD CONSTRAINT "UQ_platforms_provider_external_account"
      UNIQUE ("provider", "external_account_id")
    `);
  }
}
