import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" ADD COLUMN "cover_image_id" uuid;
    ALTER TABLE "article_revisions" ADD COLUMN "cover_image_id" uuid;
    ALTER TABLE "articles" ADD CONSTRAINT "articles_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE SET NULL;
    ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE SET NULL;
    CREATE INDEX "articles_cover_image_idx" ON "articles" USING btree ("cover_image_id");
    CREATE INDEX "article_revisions_cover_image_idx" ON "article_revisions" USING btree ("cover_image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" DROP COLUMN "cover_image_id";
    ALTER TABLE "article_revisions" DROP COLUMN "cover_image_id";
  `)
}
