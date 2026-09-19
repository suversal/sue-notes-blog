import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "pin_priority" numeric DEFAULT 0 NOT NULL;
    CREATE INDEX IF NOT EXISTS "articles_pin_priority_idx" ON "articles" USING btree ("pin_priority");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "articles_pin_priority_idx";
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "pin_priority";
  `)
}
