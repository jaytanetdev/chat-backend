import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenamePlatformChannelNameToPlatformName1739027600000
  implements MigrationInterface
{
  name = 'RenamePlatformChannelNameToPlatformName1739027600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'platforms' AND column_name = 'chanell_name'`,
    );
    if (Array.isArray(hasColumn) && hasColumn.length > 0) {
      await queryRunner.renameColumn(
        'platforms',
        'chanell_name',
        'platform_name',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'platforms' AND column_name = 'platform_name'`,
    );
    if (Array.isArray(hasColumn) && hasColumn.length > 0) {
      await queryRunner.renameColumn(
        'platforms',
        'platform_name',
        'chanell_name',
      );
    }
  }
}
