import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoomUniqueUserPlatforms1739027800000 implements MigrationInterface {
  name = 'RoomUniqueUserPlatforms1739027800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) room: drop old unique index, add UNIQUE(customer_identity_id, platforms_id)
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_room_customer_identity"
    `);
    await queryRunner.query(`
      ALTER TABLE "room"
      DROP CONSTRAINT IF EXISTS "room_customer_platform_unique"
    `);
    await queryRunner.query(`
      ALTER TABLE "room"
      ADD CONSTRAINT "room_customer_platform_unique"
      UNIQUE ("customer_identity_id", "platforms_id")
    `);

    // 2) users: drop external_user_id
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "external_user_id"
    `);

    // 3) user_platforms: new table
    await queryRunner.query(`
      CREATE TABLE "user_platforms" (
        "user_id" uuid NOT NULL,
        "platforms_id" uuid NOT NULL,
        CONSTRAINT "PK_user_platforms" PRIMARY KEY ("user_id", "platforms_id"),
        CONSTRAINT "FK_user_platforms_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_platforms_platform" FOREIGN KEY ("platforms_id") REFERENCES "platforms"("platforms_id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_platforms"`);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "external_user_id" varchar(255)
    `);

    await queryRunner.query(`
      ALTER TABLE "room" DROP CONSTRAINT IF EXISTS "room_customer_platform_unique"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_room_customer_identity"
      ON "room" ("customer_identity_id")
      WHERE "customer_identity_id" IS NOT NULL
    `);
  }
}
