import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" ALTER COLUMN "pin_priority" DROP DEFAULT;
    ALTER TABLE "articles" ALTER COLUMN "pin_priority" DROP NOT NULL;
    UPDATE "articles" SET "pin_priority" = NULL WHERE "pin_priority" = 0;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "articles" SET "pin_priority" = 0 WHERE "pin_priority" IS NULL;
    ALTER TABLE "articles" ALTER COLUMN "pin_priority" SET DEFAULT 0;
    ALTER TABLE "articles" ALTER COLUMN "pin_priority" SET NOT NULL;
  `)
}
