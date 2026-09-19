import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_explore_items_kind" AS ENUM('project', 'site', 'saved');
    CREATE TABLE "explore_items" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "owner_id" uuid NOT NULL,
      "kind" "enum_explore_items_kind" NOT NULL,
      "eyebrow" varchar NOT NULL,
      "title" varchar NOT NULL,
      "description" varchar NOT NULL,
      "meta" varchar NOT NULL,
      "status" varchar NOT NULL,
      "href" varchar NOT NULL,
      "highlight_status" boolean DEFAULT false NOT NULL,
      "is_visible" boolean DEFAULT true NOT NULL,
      "sort_order" numeric DEFAULT 100 NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "explore_items_id" uuid;
    ALTER TABLE "explore_items" ADD CONSTRAINT "explore_items_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_explore_items_fk" FOREIGN KEY ("explore_items_id") REFERENCES "public"."explore_items"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "explore_items_owner_idx" ON "explore_items" USING btree ("owner_id");
    CREATE INDEX "explore_items_is_visible_idx" ON "explore_items" USING btree ("is_visible");
    CREATE INDEX "explore_items_sort_order_idx" ON "explore_items" USING btree ("sort_order");
    CREATE INDEX "explore_items_updated_at_idx" ON "explore_items" USING btree ("updated_at");
    CREATE INDEX "explore_items_created_at_idx" ON "explore_items" USING btree ("created_at");
    CREATE INDEX "payload_locked_documents_rels_explore_items_id_idx" ON "payload_locked_documents_rels" USING btree ("explore_items_id");

    INSERT INTO "explore_items" ("owner_id", "kind", "eyebrow", "title", "description", "meta", "status", "href", "highlight_status", "is_visible", "sort_order")
    SELECT "owner"."id", "seed"."kind"::"enum_explore_items_kind", "seed"."eyebrow", "seed"."title", "seed"."description", "seed"."meta", "seed"."status", "seed"."href", "seed"."highlight_status", true, "seed"."sort_order"
    FROM (
      SELECT "users"."id"
      FROM "users"
      ORDER BY (SELECT COUNT(*) FROM "articles" WHERE "articles"."owner_id" = "users"."id") DESC, "users"."created_at" ASC
      LIMIT 1
    ) AS "owner"
    CROSS JOIN (VALUES
      ('project', 'OPEN SOURCE', 'AIRadar', '持续整理值得关注的 AI 变化。', 'AI · 信息工具', '持续维护', 'https://github.com/suversal/AIRadar', false, 10),
      ('project', 'OPEN SOURCE', '果到雷达', 'Apple 到店库存监控工具。', '桌面端 · 工具', '持续维护', 'https://github.com/suversal/apple-store-inventory-monitor', false, 20),
      ('project', 'OPEN SOURCE', 'SourcePilot', '面向 Agent 的弹性信息采集平台。', 'Agent · 基础设施', '持续维护', 'https://github.com/suversal/sourcepilot', false, 30),
      ('project', 'OPEN SOURCE', 'WrapPin', 'iOS 本机虚拟定位与步行路线测试工具。', 'iOS · 开发工具', '持续维护', 'https://github.com/suversal/WrapPin', false, 40),
      ('site', 'MY SITE', 'AIRadar Web', 'AI 信息雷达的公开阅读站点。', 'radar.suversal.com', '运行中', 'https://radar.suversal.com', true, 50),
      ('site', 'MY SITE', '苏码手记', '记录工具、开发实践与数字生活。', '独立博客', '正在阅读', '/blog', false, 60)
    ) AS "seed"("kind", "eyebrow", "title", "description", "meta", "status", "href", "highlight_status", "sort_order");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_explore_items_fk";
    DROP INDEX "payload_locked_documents_rels_explore_items_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "explore_items_id";
    DROP TABLE "explore_items" CASCADE;
    DROP TYPE "public"."enum_explore_items_kind";
  `)
}
