import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "uses_categories" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "owner_id" uuid NOT NULL,
      "name" varchar NOT NULL,
      "subtitle" varchar,
      "note" varchar,
      "sort_order" numeric DEFAULT 100 NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TYPE "public"."enum_uses_items_status" AS ENUM('using', 'used');
    CREATE TABLE "uses_items" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "owner_id" uuid NOT NULL,
      "category_id" uuid NOT NULL,
      "title" varchar NOT NULL,
      "tagline" varchar,
      "tags" varchar,
      "description" varchar NOT NULL,
      "status" "enum_uses_items_status" DEFAULT 'using' NOT NULL,
      "href" varchar,
      "cta_label" varchar DEFAULT '去官网' NOT NULL,
      "is_affiliate" boolean DEFAULT false NOT NULL,
      "promo_note" varchar,
      "logo_url" varchar,
      "related_links" jsonb,
      "is_visible" boolean DEFAULT true NOT NULL,
      "sort_order" numeric DEFAULT 100 NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "uses_categories_id" uuid;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "uses_items_id" uuid;
    ALTER TABLE "uses_categories" ADD CONSTRAINT "uses_categories_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "uses_items" ADD CONSTRAINT "uses_items_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "uses_items" ADD CONSTRAINT "uses_items_category_id_uses_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."uses_categories"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_uses_categories_fk" FOREIGN KEY ("uses_categories_id") REFERENCES "public"."uses_categories"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_uses_items_fk" FOREIGN KEY ("uses_items_id") REFERENCES "public"."uses_items"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "uses_categories_owner_idx" ON "uses_categories" USING btree ("owner_id");
    CREATE INDEX "uses_categories_sort_order_idx" ON "uses_categories" USING btree ("sort_order");
    CREATE INDEX "uses_categories_updated_at_idx" ON "uses_categories" USING btree ("updated_at");
    CREATE INDEX "uses_categories_created_at_idx" ON "uses_categories" USING btree ("created_at");
    CREATE INDEX "uses_items_owner_idx" ON "uses_items" USING btree ("owner_id");
    CREATE INDEX "uses_items_category_idx" ON "uses_items" USING btree ("category_id");
    CREATE INDEX "uses_items_is_visible_idx" ON "uses_items" USING btree ("is_visible");
    CREATE INDEX "uses_items_sort_order_idx" ON "uses_items" USING btree ("sort_order");
    CREATE INDEX "uses_items_updated_at_idx" ON "uses_items" USING btree ("updated_at");
    CREATE INDEX "uses_items_created_at_idx" ON "uses_items" USING btree ("created_at");
    CREATE INDEX "payload_locked_documents_rels_uses_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("uses_categories_id");
    CREATE INDEX "payload_locked_documents_rels_uses_items_id_idx" ON "payload_locked_documents_rels" USING btree ("uses_items_id");

    -- 「在用」页面的预置分类和条目，之后可以在页面上直接增删改。
    INSERT INTO "uses_categories" ("owner_id", "name", "subtitle", "note", "sort_order")
    SELECT "owner"."id", "seed"."name", NULLIF("seed"."subtitle", ''), NULLIF("seed"."note", ''), "seed"."sort_order"
    FROM (
      SELECT "users"."id"
      FROM "users"
      ORDER BY (SELECT COUNT(*) FROM "articles" WHERE "articles"."owner_id" = "users"."id") DESC, "users"."created_at" ASC
      LIMIT 1
    ) AS "owner"
    CROSS JOIN (VALUES
      ('服务器', '线路、备用节点和家里的机器', '主力用 DMIT 的优化线路，甲骨文的免费额度搭备用节点，GreenCloud 的促销机跑不挑线路的服务。家里 Mac mini 做旁路由，群晖负责备份、时间机器和软路由。', 10),
      ('机场', '多线路，另备一份便宜流量', '红杏和 VPN07 线路多，都有不限时的流量包。赔钱机场更便宜，留着当大流量备用。', 20),
      ('手机卡', '保号、接码和出门流量', '英国用 giffgaff 和 CTExcel，美国用 Tello，想要便宜的美国号码再加一个 Saily，香港用 Club SIM，爱沙尼亚的乌龟电信拿来保号接码，DITO 是给菲律宾的 Maya 准备的。出门的流量用红茶移动、Jetpac、eSimCC 和 BNE Esim，这四张不带号码。', 30),
      ('银行卡', '境内信用卡和跨境账户', '境内刷农行、招行和中信的白金卡，外币订阅走招行全币卡。跨境账户是 Wise 和 StarryBlu，Wise 第一笔入金必须从本人同名账户转。菲律宾钱包是 Maya，号码用 DITO。', 40),
      ('U卡', '用加密资产消费，或换成欧元打出', '日常消费用 Gate、Bitget、Bybit 和 Plasma One，其中 Plasma 的虚拟卡绑了 Apple Pay。Neverless 不是消费卡，用来把 U 换成欧元转出去。', 50),
      ('其他', '', '', 60)
    ) AS "seed"("name", "subtitle", "note", "sort_order");

    INSERT INTO "uses_items" ("owner_id", "category_id", "title", "tagline", "tags", "description", "status", "href", "cta_label", "is_affiliate", "promo_note", "logo_url", "related_links", "is_visible", "sort_order")
    SELECT "category"."owner_id", "category"."id", "seed"."title", NULLIF("seed"."tagline", ''), NULLIF("seed"."tags", ''), "seed"."description", "seed"."status"::"enum_uses_items_status", NULLIF("seed"."href", ''), "seed"."cta_label", "seed"."is_affiliate", NULLIF("seed"."promo_note", ''), NULLIF("seed"."logo_url", ''), "seed"."related_links"::jsonb, "seed"."is_visible", "seed"."sort_order"
    FROM (VALUES
      ('服务器', 'Oracle Cloud', 'PAYG 账户有 4C24G 的免费额度', 'ARM、免费额度、需要信用卡', '升级成 PAYG 账户后，A1 实例仍有 **4C24G 的免费额度**（名下所有 A1 实例加起来算）；没升级的 Always Free 账户已经缩到 2C12G。我拿它当备用节点，顺便部署自己的服务。注册和升级的坑都写在文章里。', 'using', 'https://www.oracle.com/cloud/free/', '注册', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721132468_%E6%9C%8D%E5%8A%A1%E5%99%A8-Oracle_Cloud.jpg', '[{"href": "https://x.com/suversal/status/2104473411561074952", "label": "白嫖 4C24G 云服务器！甲骨文注册、升级 PAYG、创建实例完整教程"}, {"href": "https://x.com/suversal/status/2105153390762483742", "label": "白嫖甲骨文服务器 + AI Agent，10 分钟搭好备用节点"}]', true, 10),
      ('服务器', 'DMIT', '三网优化线路，晚高峰稳定', 'CN2 GIA、洛杉矶、香港、东京', '主打面向大陆的**优化线路**：电信走 CN2 GIA，联通、移动也有对应的优化。晚高峰稳定、丢包少，价格偏高。别只看最便宜的套餐，优化线路在 Pro 套餐上。', 'using', 'https://www.dmit.io', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721152280_%E6%9C%8D%E5%8A%A1%E5%99%A8-DMIT.png', '[{"href": "https://x.com/suversal/status/2108829483100954990?s=20", "label": "2026年VPS选购全方位指南：线路、机房、套餐一次讲清"}]', true, 20),
      ('服务器', 'GreenCloudVPS', '机房多，促销机便宜', '多机房、年付促销、大硬盘', '机房很多，日本、香港、新加坡、美国、欧洲都有。平时价格一般，**值得买的是不定期的促销机**，配置给得足，适合跑不挑线路的服务。', 'using', 'https://greencloudvps.com', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721171571_%E6%9C%8D%E5%8A%A1%E5%99%A8-GreenCloudVPS.png', '[]', true, 30),
      ('服务器', 'Mac mini', '放在家里常开的小主机', '低功耗、旁路由、家庭网络', '放在家里常年开机，相当于一台**免费的个人服务器**，上面跑了一堆 Docker 服务，同时兼做旁路由。在外面通过公网 IPv6、Tailscale 或 Cloudflare Tunnel 连回来，随时能用上家里的 Hermes 和 ChatGPT。', 'using', 'https://www.apple.com.cn/mac-mini/', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721190939_%E6%9C%8D%E5%8A%A1%E5%99%A8-Mac_mini.png', '[{"href": "https://x.com/suversal/status/2106958745725293002", "label": "不买软路由！我把家里的 Mac mini 变成了旁路由"}]', true, 40),
      ('服务器', '群晖 NAS', '备份、时间机器、Docker、软路由', '群晖、备份、Docker、软路由', '家里常开的存储主机。给各台设备做**备份**，当 Mac 的**时间机器**，用 Docker 跑一些自建服务，同时还兼着**软路由**。', 'using', 'https://www.synology.cn', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791723986737_%E6%9C%8D%E5%8A%A1%E5%99%A8-%E7%BE%A4%E6%99%96_NAS.png', '[{"href": "https://x.com/suversal/status/2108036233737941048?s=20", "label": "软路由保姆级教程：不用买设备，NAS、旧电脑都能装"}]', true, 50),
      ('机场', '红杏', '多线路，支持不限时套餐', '多线路、不限时套餐', '2024 年开始运营，冷门线路多。除了按月的套餐，还有**不限时的流量包**，买了慢慢用，适合用量不固定的人。', 'using', 'https://hxlove26s.cc/web/#/login?code=RgjaPFJk', '注册', true, '', 'https://img.suversal.com/file/sue-notes-blog/1791721227876_%E6%9C%BA%E5%9C%BA-%E7%BA%A2%E6%9D%8F.png', '[]', true, 10),
      ('机场', 'VPN07', '多线路，支持不限时套餐', '多线路、不限时套餐', '2015 年开始运营，冷门线路更多。同样有按月套餐和**不限时的流量包**，我拿它当备用。', 'using', 'https://vpn07.com/index.html#/register?code=nupxiFTW', '注册', true, '', 'https://img.suversal.com/file/sue-notes-blog/1791721243303_%E6%9C%BA%E5%9C%BA-VPN02.png', '[]', true, 20),
      ('机场', '赔钱机场', '20块 1T不限时套餐，那还能说啥', '便宜、不限时套餐', '**20 元 1TB** 的不限时流量，我留着当大流量备用。懂得都懂。', 'using', 'https://xn--mes358aby2apfg.com/register?code=RMd1zfmy&cover=sfw', '注册', true, '', 'https://img.suversal.com/file/sue-notes-blog/1791724639821_logo.png', '[]', true, 30),
      ('手机卡', 'CTExcel UK', '英国号码，中国电信欧洲旗下', '英国、eSIM、一卡双号、保号', '中国电信（欧洲）的移动品牌，走英国 EE 网络。**一张卡同时带英国和大陆两个号码**，支持 eSIM，有中文客服。激活时要校验定位和网络，我手里只有它有这一步。保号：**连续 180 天没有任何使用会停机**，发一条短信（人在国内约 0.10 英镑）或充值都算使用，一年大约 0.20 英镑。', 'using', 'https://www.ctexcel.com', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721835760_IMG_6066.JPG', '[]', true, 10),
      ('手机卡', 'giffgaff', '英国号码，没有月租', '英国、无月租、eSIM、保号', '英国的老牌预付费卡，**没有月租**，按量扣费，支持 eSIM。保号：**大约每 180 天要有一次主动使用**，发短信、打电话、用流量或充值都算，只收短信不算。没被封的话很值得留；我的号被封之后，余额申请退回了银行卡。', 'using', 'https://www.giffgaff.com', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721280786_%E6%89%8B%E6%9C%BA%E5%8D%A1-giffgaff.jpg', '[{"href": "https://x.com/suversal/status/2099328135791886338", "label": "giffgaff 号都没了，我居然把余额退回来了？"}]', true, 20),
      ('手机卡', 'Saily', '旅行流量 eSIM，可加购美国号码', 'eSIM、流量、美国号码', 'Nord Security 做的旅行 eSIM，覆盖 200 多个国家和地区，以流量套餐为主，激活不查定位。可以在 App 里**加购一个美国 +1 号码**，能接打电话、收验证码。保号：号码是流量之外单独的月费，目前 **1.99 美元/月**，一年约 24 美元。', 'using', 'https://saily.com', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721301118_%E6%89%8B%E6%9C%BA%E5%8D%A1-Saily.jpg', '[]', true, 30),
      ('手机卡', 'Tello', '美国号码，套餐可以自己搭', '美国、eSIM、Wi-Fi Calling、保号', '美国号码，通话、短信和流量可以**按需自己搭配**，支持 eSIM 和 Wi-Fi Calling，在国内也能收发短信、接打电话。保号：要一直有一个每 30 天续费的方案，能收短信的**最低 5 美元/月**；只保留号码、不能收短信的是 3 美元/月。', 'using', 'https://tello.com', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721310356_%E6%89%8B%E6%9C%BA%E5%8D%A1-Tello.jpg', '[{"href": "https://x.com/suversal/status/2100469057455812739", "label": "Tello 激活与 Wi-Fi Calling 开通教程：WrapPin 失败后，重走 WLOC 方案"}]', true, 40),
      ('手机卡', 'Club SIM', '香港号码，没有月租', '香港、无月租、eSIM、保号', '香港的预付费号码，**没有月租**，实体卡和 eSIM 都有，在大陆可以漫游收短信。保号：号码到期后的 **365 天内再买任意一个组合**就能继续用，目前最便宜的组合是 15 港币。', 'using', 'https://www.clubsim.com.hk', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721328459_%E6%89%8B%E6%9C%BA%E5%8D%A1-Club_SIM.jpg', '[]', true, 50),
      ('手机卡', '乌龟电信', '爱沙尼亚号码，连一次基站保一年', '爱沙尼亚、eSIM、+372、保号', '官网是 esim.gg，图标是一只乌龟，所以叫乌龟电信。爱沙尼亚 **+372** 号码，走 Elisa 网络，购买不用上传证件，激活不查定位。收短信免费，在国内漫游也能收验证码。保号：**连一次基站通常能再延一年**，不另收费；一整年都不启用会从余额里扣保号费，卡里留几欧元比较稳。', 'using', 'https://esim.gg', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791722046791_%E6%89%8B%E6%9C%BA%E5%8D%A1-%E4%B9%8C%E9%BE%9F%E7%94%B5%E4%BF%A1.png', '[]', true, 60),
      ('手机卡', 'DITO', '菲律宾号码，注册 Maya 用得上', '菲律宾、eSIM、Maya、保号', '菲律宾运营商的预付费 eSIM，我主要拿这个号码**注册 Maya**。现在注册要填菲律宾地址，比以前麻烦，过程见文章。保号：没有月租，**余额保持在 1 比索以上**即可；低于 1 比索又没有生效的套餐会临时停机，满 90 天号码永久停用。', 'using', 'https://dito.ph', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721347389_%E6%89%8B%E6%9C%BA%E5%8D%A1-DITO.jpg', '[{"href": "https://x.com/suversal/status/2102952634705645590", "label": "DITO 注册现在要地址证明和返程机票"}]', true, 70),
      ('手机卡', '红茶移动', '纯流量 eSIM', 'eSIM、纯流量', '也叫 RedteaGO。我用的是**纯流量**套餐：不带号码，在 App 里按国家或地区买流量包，出门前装好就能用。官网另有带通话的套餐，覆盖范围以 App 为准。', 'using', 'https://redteago.com', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721354504_%E6%89%8B%E6%9C%BA%E5%8D%A1-%E7%BA%A2%E8%8C%B6%E7%A7%BB%E5%8A%A8.jpg', '[]', true, 80),
      ('手机卡', 'Jetpac', '免费领流量的 eSIM', 'eSIM、免费流量、纯流量', '旅行 eSIM，我领的是 **Jetpac Eterna** 的免费流量：一年最多 4 次、每次 100MB，两次之间要隔两个月。出口 IP 在新加坡，100MB 只够应急。纯数据卡，不带号码。活动页写 WhatsApp、Google Maps、Uber、Grab 不计入这点流量，规则以领取页为准。', 'using', 'https://www.jetpacglobal.com', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721367989_%E6%89%8B%E6%9C%BA%E5%8D%A1-Jetpac.jpg', '[{"href": "https://x.com/suversal/status/2108120673621307422", "label": "Jetpac Eterna 免费流量实测"}]', true, 90),
      ('手机卡', 'eSimCC', '纯流量 eSIM，落地再开始计时', 'eSIM、纯流量、140+ 地区', '只有流量的旅行 eSIM，覆盖 **140 多个**国家和地区。选套餐、扫码安装，**有效期从在当地启用那一刻开始算**，不是从付款当天算。不带号码，不能打电话，也不能收短信。', 'using', 'https://www.esim.cc', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721396267_%E6%89%8B%E6%9C%BA%E5%8D%A1-eSimCC.jpg', '[]', true, 100),
      ('手机卡', 'BNE Esim', '纯流量 eSIM，流量可以不过期', 'eSIM、纯流量、不限时套餐、200+ 国家', '纯流量 eSIM，覆盖 **200 多个**国家。除了按天、按月的套餐，还有**买了不过期的流量包**，适合不常出国、想囤一点的人。卡本身不收费，支持银行卡和加密货币付款，套餐以 App 为准。', 'using', 'https://www.bnesim.com', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791722055794_%E6%89%8B%E6%9C%BA%E5%8D%A1-BNESIM.jpg', '[]', true, 110),
      ('银行卡', '农行万事达尊然白金信用卡', '农行的大白金信用卡', '信用卡、万事达', '农业银行的白金信用卡。万事达版可以参加万事达的消费活动。贵宾厅等权益近年有调整，办卡前先看最新公告。', 'using', 'https://www.abchina.com', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721431939_%E9%93%B6%E8%A1%8C%E5%8D%A1-%E5%86%9C%E4%B8%9A%E9%93%B6%E8%A1%8C.jpg', '[]', true, 10),
      ('银行卡', '招商银行自由人生白金信用卡', '招行的白金信用卡', '信用卡、白金', '招商银行的白金信用卡，**主卡年费 800 元**，消费达标可以免次年年费。每个月能用积分薅点羊毛，境外消费、酒店和贵宾厅看当期活动，以官方说明为准。', 'using', 'https://cc.cmbchina.com', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721445691_%E9%93%B6%E8%A1%8C%E5%8D%A1-%E6%8B%9B%E5%95%86%E9%93%B6%E8%A1%8C.jpg', '[]', true, 20),
      ('银行卡', '中信万事达 i 白金信用卡', '中信的万事达白金信用卡', '信用卡、万事达', '中信银行的万事达白金信用卡。权益包是「**36+1**」，贵宾厅、高尔夫练习场按卡片等级给。年费分精英级和尊贵级，差别很大，以动卡空间里的页面为准。', 'using', 'https://creditcard.ecitic.com', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721459743_%E9%93%B6%E8%A1%8C%E5%8D%A1-%E4%B8%AD%E4%BF%A1%E9%93%B6%E8%A1%8C.jpg', '[]', true, 30),
      ('银行卡', '招行全币卡 Visa', '外币消费免货币转换费', '信用卡、Visa、全币种', '招商银行的全币种国际信用卡。**外币消费免货币转换费**，人民币入账、人民币还款，卡片有效期内免年费，订阅海外服务很省事。境外返现看掌上生活的当期活动。', 'using', 'https://cc.cmbchina.com', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721478926_%E9%93%B6%E8%A1%8C%E5%8D%A1-%E6%8B%9B%E5%95%86%E9%93%B6%E8%A1%8C.jpg', '[]', true, 40),
      ('银行卡', 'StarryBlu', '多币种账户加 Mastercard', '多币种、Mastercard、虚拟卡', '总部在新加坡的多币种账户，一个 App 里管多种货币、跨境汇款和刷卡，可以申请 **Mastercard 虚拟卡和实体卡**。实体卡要在新加坡网络下申请，页面写着能寄大陆；我这张从 9 月申到 10 月还停在「制卡中」，虚拟卡不受影响。开户条件以官方为准。', 'using', 'https://www.starryblu.com', '注册', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721486024_%E9%93%B6%E8%A1%8C%E5%8D%A1-StarryBlu.jpg', '[{"href": "https://x.com/suversal/status/2108746841168990293", "label": "StarryBlu 实体卡一直停在「制卡中」"}]', true, 50),
      ('银行卡', 'Wise', '多币种账户', '多币种、跨境汇款', '多币种账户，换汇和跨境汇款都方便。**首次入金必须从本人同名账户转入**，从 StarryBlu 公司户转过来的钱激活不了。从注册到首次入金，过程和坑都写在文章里。', 'using', 'https://wise.com', '注册', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721502467_%E9%93%B6%E8%A1%8C%E5%8D%A1-Wise.jpg', '[{"href": "https://x.com/suversal/status/2095387827819434331", "label": "中国大陆用户 Wise 最新开户指南：从注册到首次入金激活"}]', true, 60),
      ('银行卡', 'Maya', '菲律宾钱包，升级后有虚拟卡', '菲律宾、电子钱包、虚拟卡', '菲律宾的电子钱包，原来叫 PayMaya。注册要绑菲律宾手机号，我的 DITO 就是为这一步准备的。外国人用护照升级账户，不收费；升级后钱包里有 100 比索以上，就能免费开一张**虚拟卡**，是 Visa 还是 Mastercard 由 App 分配。外币消费在卡组织汇率之外再加 1.75%。', 'using', 'https://www.maya.ph', '去官网', false, '', '', '[]', true, 70),
      ('U卡', 'Gate', '交易所发行的加密货币消费卡', '交易所、加密货币、返现', 'Gate 交易所的消费卡，直接用账户里的加密资产刷卡，不用先换成法币。返现按等级递增，**宣传的最高档门槛很高，普通档低得多**。支持的地区和费率以官方为准。', 'using', 'https://www.gate.com', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721522222_U%E5%8D%A1-Gate.jpg', '[]', true, 10),
      ('U卡', 'Plasma One', '稳定币账户带 Visa 卡', '稳定币、Visa、返现', '围绕稳定币做的账户，带虚拟卡和实体 Visa 卡，直接用稳定币消费，还有**消费返现**。我把虚拟卡绑在 Apple Pay 上，主要用来订 ChatGPT 和 Claude。实体卡直接寄大陆有风险，我那张就在浦东被海关拦下了。', 'using', 'https://www.plasma.to', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721534963_U%E5%8D%A1-Plasma_One.jpg', '[{"href": "https://x.com/suversal/status/2102915803171758439", "label": "Plasma One 实体卡到浦东被海关拦下了"}]', true, 20),
      ('U卡', 'Bitget', '交易所发行的加密货币消费卡', '交易所、加密货币、返现', 'Bitget 的消费卡，完成身份认证后可用，虚拟卡和实体卡都有，带返现。非美元消费可能有换汇费，新用户奖励经常变，支持地区以官方为准。', 'using', 'https://www.bitget.com', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721552929_U%E5%8D%A1-Bitget.jpg', '[]', true, 30),
      ('U卡', 'Bybit', '返现分档的加密货币消费卡', '交易所、加密货币、返现', 'Bybit 的消费卡，**返现按档位递增**，基础档有月度上限；最高档要很高的月消费才够得着，日常按基础档算就好。卡组织和费用因发卡地区而不同。', 'using', 'https://www.bybit.com', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721558214_U%E5%8D%A1-Bybit.jpg', '[]', true, 40),
      ('U卡', 'Neverless', '欧盟持牌，加密资产换成欧元打出', '加密货币、欧元、IBAN、MiCA', '拉脱维亚持牌的投资 App。可以充 USDT、USDC，**换成欧元后用 SEPA 转到自己的银行账户**。主流币交易官方宣传零佣金，也做股票、ETF 和贵金属。它目前没有消费卡，大家主要拿它做出金中转。开户地区和费率以 App 为准。', 'using', 'https://neverless.com', '去官网', false, '', 'https://img.suversal.com/file/sue-notes-blog/1791721589359_U%E5%8D%A1-Neverless.jpg', '[]', true, 50)
    ) AS "seed"("category", "title", "tagline", "tags", "description", "status", "href", "cta_label", "is_affiliate", "promo_note", "logo_url", "related_links", "is_visible", "sort_order")
    JOIN "uses_categories" AS "category" ON "category"."name" = "seed"."category";

    -- 探索页：图标、多条相关文章、重点项目；标签和状态文字改为可选。
    ALTER TABLE "explore_items" ADD COLUMN "logo_url" varchar;
    ALTER TABLE "explore_items" ADD COLUMN "related_links" jsonb;
    ALTER TABLE "explore_items" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;
    ALTER TABLE "explore_items" ALTER COLUMN "meta" DROP NOT NULL;
    ALTER TABLE "explore_items" ALTER COLUMN "status" DROP NOT NULL;
    UPDATE "explore_items" SET "is_featured" = true
    WHERE "kind" = 'project' AND ("href" ILIKE '%github.com/suversal/WrapPin' OR "href" ILIKE '%github.com/suversal/apple-store-inventory-monitor');

    -- 文章可以挂一个 X 上的原文链接；已知的几篇按标题预先填好，其余在后台文章列表里补。
    ALTER TABLE "articles" ADD COLUMN "source_url" varchar;
    UPDATE "articles" AS "article" SET "source_url" = 'https://x.com/suversal/status/' || "known"."status_id"
    FROM (VALUES
      ('不买软路由！我把家里的Mac mini变成了旁路由%', '2106958745725293002'),
      ('白嫖甲骨文服务器+AI Agent%', '2105153390762483742'),
      ('需求可以预判，爆款不能%', '2101569255439483166'),
      ('还在共享外区 Apple ID%', '2100785297865036157'),
      ('Tello激活与%', '2100469057455812739'),
      ('iOS 27 模拟定位备选方案%', '2100103579021504842'),
      ('iPhone iOS 27修改定位保姆级教程%', '2099748317672734865'),
      ('giffgaff号都没了%', '2099328135791886338'),
      ('别再找代充了%', '2097245420397404529'),
      ('中国大陆用户 Wise 最新开户指南%', '2095387827819434331'),
      ('Claude 被封号后一定要做的 5 件事%', '2092867784623718643'),
      ('还在忍受烦人 App 广告吗%', '2092133834100019412')
    ) AS "known"("title_pattern", "status_id")
    WHERE "article"."title" LIKE "known"."title_pattern";

    -- 站名改为「苏码玩家」：只替换仍是旧默认值的字段，手动改过的内容保持不变。
    UPDATE "site_settings" SET "site_name" = '苏码玩家' WHERE "site_name" = '苏码手记';
    UPDATE "site_settings" SET "tagline" = '一个程序员的折腾记录：Apple 生态、家庭网络、出海基建，还有 AI。' WHERE "tagline" = '关于工具、创造，以及认真生活的小事。';
    UPDATE "site_settings" SET "author_bio" = '我喜欢折腾。遇到感兴趣的东西，就自己动手试一遍，试明白了再写下来。' WHERE "author_bio" = '一个爱折腾工具的独立开发者。把亲手做过的事、慢慢想明白的问题，写在这里。';
    UPDATE "explore_items" SET "title" = '苏码玩家' WHERE "title" = '苏码手记' AND "kind" = 'site';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" DROP COLUMN "source_url";
    UPDATE "explore_items" SET "meta" = '' WHERE "meta" IS NULL;
    UPDATE "explore_items" SET "status" = '' WHERE "status" IS NULL;
    ALTER TABLE "explore_items" ALTER COLUMN "status" SET NOT NULL;
    ALTER TABLE "explore_items" ALTER COLUMN "meta" SET NOT NULL;
    ALTER TABLE "explore_items" DROP COLUMN "is_featured";
    ALTER TABLE "explore_items" DROP COLUMN "related_links";
    ALTER TABLE "explore_items" DROP COLUMN "logo_url";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_uses_items_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_uses_categories_fk";
    DROP INDEX "payload_locked_documents_rels_uses_items_id_idx";
    DROP INDEX "payload_locked_documents_rels_uses_categories_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "uses_items_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "uses_categories_id";
    DROP TABLE "uses_items" CASCADE;
    DROP TABLE "uses_categories" CASCADE;
    DROP TYPE "public"."enum_uses_items_status";
  `)
}
