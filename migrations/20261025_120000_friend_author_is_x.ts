import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// 已有的友邻里，站长填的就是 X 用户名的，直接勾上，前台照旧链到 X 主页。
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "friend_links" ADD COLUMN "author_is_x" boolean DEFAULT false NOT NULL;
    UPDATE "friend_links" SET "author_is_x" = true WHERE "author" ~ '^@?[A-Za-z0-9_]{1,15}$';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "friend_links" DROP COLUMN "author_is_x";
  `)
}
