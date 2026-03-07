import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoomMembersUniqueRoomUser1739028100000
  implements MigrationInterface
{
  name = 'RoomMembersUniqueRoomUser1739028100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "room_members"
        ADD CONSTRAINT "UQ_room_members_room_user" UNIQUE ("room_id", "user_id");
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "room_members" DROP CONSTRAINT IF EXISTS "UQ_room_members_room_user"
    `);
  }
}
