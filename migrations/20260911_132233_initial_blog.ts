import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_media_provider" AS ENUM('imgbed');
  CREATE TYPE "public"."enum_articles_cover_style" AS ENUM('none', 'notes', 'grid', 'cache');
  CREATE TYPE "public"."enum_articles_visibility" AS ENUM('private', 'public');
  CREATE TYPE "public"."enum_articles_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "public"."enum_article_revisions_cover_style" AS ENUM('none', 'notes', 'grid', 'cache');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"display_name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"owner_id" uuid NOT NULL,
  	"alt" varchar NOT NULL,
  	"provider" "enum_media_provider" DEFAULT 'imgbed' NOT NULL,
  	"storage_key" varchar NOT NULL,
  	"sha256" varchar NOT NULL,
  	"uploaded_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric
  );
  
  CREATE TABLE "topics" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"owner_id" uuid NOT NULL,
  	"name" varchar NOT NULL,
  	"normalized_name" varchar NOT NULL,
  	"is_system" boolean DEFAULT false NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"owner_id" uuid NOT NULL,
  	"site_name" varchar DEFAULT '苏码手记' NOT NULL,
  	"author_name" varchar DEFAULT 'Sue' NOT NULL,
  	"tagline" varchar DEFAULT '关于工具、创造，以及认真生活的小事。' NOT NULL,
  	"author_bio" varchar DEFAULT '一个爱折腾工具的独立开发者。把亲手做过的事、慢慢想明白的问题，写在这里。' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "articles_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "articles_public_references" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "articles" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"owner_id" uuid NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"excerpt" varchar,
  	"content" jsonb NOT NULL,
  	"topic_id" uuid,
  	"cover_style" "enum_articles_cover_style" DEFAULT 'none',
  	"visibility" "enum_articles_visibility" DEFAULT 'private' NOT NULL,
  	"status" "enum_articles_status" DEFAULT 'draft' NOT NULL,
  	"revision_hash" varchar NOT NULL,
  	"current_revision_id" uuid,
  	"published_revision_id" uuid,
  	"published_at" timestamp(3) with time zone,
  	"published_slug" varchar,
  	"private_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "article_revisions_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "article_revisions_public_references" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "article_revisions" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"article_id" uuid NOT NULL,
  	"owner_id" uuid NOT NULL,
  	"revision_number" numeric NOT NULL,
  	"revision_hash" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"excerpt" varchar,
  	"content" jsonb NOT NULL,
  	"topic_id" uuid,
  	"cover_style" "enum_article_revisions_cover_style" DEFAULT 'none',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "publish_approvals" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"article_id" uuid NOT NULL,
  	"revision_id" uuid,
  	"revision_hash" varchar NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"used_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" uuid,
  	"media_id" uuid,
  	"topics_id" uuid,
  	"site_settings_id" uuid,
  	"articles_id" uuid,
  	"article_revisions_id" uuid,
  	"publish_approvals_id" uuid
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" uuid
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "topics" ADD CONSTRAINT "topics_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_tags" ADD CONSTRAINT "articles_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_public_references" ADD CONSTRAINT "articles_public_references_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_current_revision_id_article_revisions_id_fk" FOREIGN KEY ("current_revision_id") REFERENCES "public"."article_revisions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_published_revision_id_article_revisions_id_fk" FOREIGN KEY ("published_revision_id") REFERENCES "public"."article_revisions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "article_revisions_tags" ADD CONSTRAINT "article_revisions_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."article_revisions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "article_revisions_public_references" ADD CONSTRAINT "article_revisions_public_references_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."article_revisions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "publish_approvals" ADD CONSTRAINT "publish_approvals_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "publish_approvals" ADD CONSTRAINT "publish_approvals_revision_id_article_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."article_revisions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_site_settings_fk" FOREIGN KEY ("site_settings_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_article_revisions_fk" FOREIGN KEY ("article_revisions_id") REFERENCES "public"."article_revisions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_publish_approvals_fk" FOREIGN KEY ("publish_approvals_id") REFERENCES "public"."publish_approvals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_owner_idx" ON "media" USING btree ("owner_id");
  CREATE UNIQUE INDEX "media_storage_key_idx" ON "media" USING btree ("storage_key");
  CREATE INDEX "media_sha256_idx" ON "media" USING btree ("sha256");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "topics_owner_idx" ON "topics" USING btree ("owner_id");
  CREATE INDEX "topics_updated_at_idx" ON "topics" USING btree ("updated_at");
  CREATE INDEX "topics_created_at_idx" ON "topics" USING btree ("created_at");
  CREATE UNIQUE INDEX "owner_normalizedName_idx" ON "topics" USING btree ("owner_id","normalized_name");
  CREATE INDEX "site_settings_owner_idx" ON "site_settings" USING btree ("owner_id");
  CREATE INDEX "site_settings_updated_at_idx" ON "site_settings" USING btree ("updated_at");
  CREATE INDEX "site_settings_created_at_idx" ON "site_settings" USING btree ("created_at");
  CREATE UNIQUE INDEX "owner_idx" ON "site_settings" USING btree ("owner_id");
  CREATE INDEX "articles_tags_order_idx" ON "articles_tags" USING btree ("_order");
  CREATE INDEX "articles_tags_parent_id_idx" ON "articles_tags" USING btree ("_parent_id");
  CREATE INDEX "articles_public_references_order_idx" ON "articles_public_references" USING btree ("_order");
  CREATE INDEX "articles_public_references_parent_id_idx" ON "articles_public_references" USING btree ("_parent_id");
  CREATE INDEX "articles_owner_idx" ON "articles" USING btree ("owner_id");
  CREATE INDEX "articles_topic_idx" ON "articles" USING btree ("topic_id");
  CREATE INDEX "articles_current_revision_idx" ON "articles" USING btree ("current_revision_id");
  CREATE INDEX "articles_published_revision_idx" ON "articles" USING btree ("published_revision_id");
  CREATE INDEX "articles_published_slug_idx" ON "articles" USING btree ("published_slug");
  CREATE INDEX "articles_updated_at_idx" ON "articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");
  CREATE UNIQUE INDEX "owner_slug_idx" ON "articles" USING btree ("owner_id","slug");
  CREATE UNIQUE INDEX "visibility_status_slug_idx" ON "articles" USING btree ("visibility","status","slug");
  CREATE UNIQUE INDEX "publishedSlug_idx" ON "articles" USING btree ("published_slug");
  CREATE INDEX "article_revisions_tags_order_idx" ON "article_revisions_tags" USING btree ("_order");
  CREATE INDEX "article_revisions_tags_parent_id_idx" ON "article_revisions_tags" USING btree ("_parent_id");
  CREATE INDEX "article_revisions_public_references_order_idx" ON "article_revisions_public_references" USING btree ("_order");
  CREATE INDEX "article_revisions_public_references_parent_id_idx" ON "article_revisions_public_references" USING btree ("_parent_id");
  CREATE INDEX "article_revisions_article_idx" ON "article_revisions" USING btree ("article_id");
  CREATE INDEX "article_revisions_owner_idx" ON "article_revisions" USING btree ("owner_id");
  CREATE INDEX "article_revisions_topic_idx" ON "article_revisions" USING btree ("topic_id");
  CREATE INDEX "article_revisions_updated_at_idx" ON "article_revisions" USING btree ("updated_at");
  CREATE INDEX "article_revisions_created_at_idx" ON "article_revisions" USING btree ("created_at");
  CREATE UNIQUE INDEX "article_revisionNumber_idx" ON "article_revisions" USING btree ("article_id","revision_number");
  CREATE UNIQUE INDEX "article_revisionHash_idx" ON "article_revisions" USING btree ("article_id","revision_hash");
  CREATE INDEX "publish_approvals_article_idx" ON "publish_approvals" USING btree ("article_id");
  CREATE INDEX "publish_approvals_revision_idx" ON "publish_approvals" USING btree ("revision_id");
  CREATE INDEX "publish_approvals_updated_at_idx" ON "publish_approvals" USING btree ("updated_at");
  CREATE INDEX "publish_approvals_created_at_idx" ON "publish_approvals" USING btree ("created_at");
  CREATE INDEX "article_revisionHash_usedAt_idx" ON "publish_approvals" USING btree ("article_id","revision_hash","used_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_topics_id_idx" ON "payload_locked_documents_rels" USING btree ("topics_id");
  CREATE INDEX "payload_locked_documents_rels_site_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("site_settings_id");
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_article_revisions_id_idx" ON "payload_locked_documents_rels" USING btree ("article_revisions_id");
  CREATE INDEX "payload_locked_documents_rels_publish_approvals_id_idx" ON "payload_locked_documents_rels" USING btree ("publish_approvals_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "topics" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "articles_tags" CASCADE;
  DROP TABLE "articles_public_references" CASCADE;
  DROP TABLE "articles" CASCADE;
  DROP TABLE "article_revisions_tags" CASCADE;
  DROP TABLE "article_revisions_public_references" CASCADE;
  DROP TABLE "article_revisions" CASCADE;
  DROP TABLE "publish_approvals" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_media_provider";
  DROP TYPE "public"."enum_articles_cover_style";
  DROP TYPE "public"."enum_articles_visibility";
  DROP TYPE "public"."enum_articles_status";
  DROP TYPE "public"."enum_article_revisions_cover_style";`)
}
