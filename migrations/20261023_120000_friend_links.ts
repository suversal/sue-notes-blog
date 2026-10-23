import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "friend_links" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "owner_id" uuid NOT NULL,
      "name" varchar NOT NULL,
      "author" varchar,
      "url" varchar NOT NULL,
      "avatar_url" varchar,
      "motto" varchar NOT NULL,
      "note" varchar,
      "met_at" varchar NOT NULL,
      "is_visible" boolean DEFAULT true NOT NULL,
      "sort_order" numeric DEFAULT 100 NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "friend_links_id" uuid;
    ALTER TABLE "friend_links" ADD CONSTRAINT "friend_links_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_friend_links_fk" FOREIGN KEY ("friend_links_id") REFERENCES "public"."friend_links"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "friend_links_owner_idx" ON "friend_links" USING btree ("owner_id");
    CREATE INDEX "friend_links_is_visible_idx" ON "friend_links" USING btree ("is_visible");
    CREATE INDEX "friend_links_sort_order_idx" ON "friend_links" USING btree ("sort_order");
    CREATE INDEX "friend_links_updated_at_idx" ON "friend_links" USING btree ("updated_at");
    CREATE INDEX "friend_links_created_at_idx" ON "friend_links" USING btree ("created_at");
    CREATE INDEX "payload_locked_documents_rels_friend_links_id_idx" ON "payload_locked_documents_rels" USING btree ("friend_links_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_friend_links_fk";
    DROP INDEX "payload_locked_documents_rels_friend_links_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "friend_links_id";
    DROP TABLE "friend_links" CASCADE;
  `)
}
