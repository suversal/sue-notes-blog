import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "article_view_days" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "page_key" varchar NOT NULL,
      "day_key" varchar NOT NULL,
      "views" numeric DEFAULT 0 NOT NULL
    );
    CREATE UNIQUE INDEX "article_view_days_page_key_day_key_idx" ON "article_view_days" USING btree ("page_key", "day_key");
    CREATE INDEX "article_view_days_page_key_idx" ON "article_view_days" USING btree ("page_key");
    CREATE INDEX "article_view_days_day_key_idx" ON "article_view_days" USING btree ("day_key");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE "article_view_days";`)
}
