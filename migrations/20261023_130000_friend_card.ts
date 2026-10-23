import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings" ADD COLUMN "friend_card_name" varchar;
    ALTER TABLE "site_settings" ADD COLUMN "friend_card_url" varchar;
    ALTER TABLE "site_settings" ADD COLUMN "friend_card_avatar" varchar;
    ALTER TABLE "site_settings" ADD COLUMN "friend_card_motto" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings" DROP COLUMN "friend_card_name";
    ALTER TABLE "site_settings" DROP COLUMN "friend_card_url";
    ALTER TABLE "site_settings" DROP COLUMN "friend_card_avatar";
    ALTER TABLE "site_settings" DROP COLUMN "friend_card_motto";
  `)
}
