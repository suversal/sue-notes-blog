# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 项目概览

苏码手记：Next.js 16（App Router）+ Payload CMS 3 + PostgreSQL 的个人博客，包含公开前台和自建写作后台。评论、点赞由独立的 Artalk 服务提供，图片存放在外部 ImgBed。界面文案、注释和文档均为中文。

## 常用命令

包管理器固定为 pnpm 11，Node 22。

```bash
docker compose up -d          # 本机 PostgreSQL（55433）与 Artalk（23366）
pnpm payload migrate          # 应用迁移；空库首次启动前必须执行
pnpm dev                      # http://127.0.0.1:3100
pnpm devsafe                  # 清掉 .next 后再启动

pnpm check:fast               # lint + typecheck，提交前的最小检查
pnpm test:unit                # tests/blog/**/*.test.{ts,tsx}，不需要数据库
pnpm test:int                 # tests/int/**/*.int.spec.ts，需要已迁移的数据库
pnpm test:e2e                 # Playwright，复用或自启 3100 上的 dev server
pnpm smoke:blog               # 对真实数据库跑一遍 草稿→预览→发布→转私密
pnpm build

pnpm generate:types           # 改动 collection 后重新生成 src/payload-types.ts
pnpm generate:importmap       # 改动 Lexical feature / 管理端组件后重新生成 importMap
```

运行单个测试：

```bash
pnpm vitest run --config ./vitest.unit.config.ts tests/blog/article-slug.test.ts
pnpm vitest run --config ./vitest.unit.config.ts -t '用例名'
pnpm test:e2e tests/e2e/frontend.e2e.spec.ts
```

单元测试的 vitest 环境是 `node`；需要 DOM 的测试在文件首行写 `// @vitest-environment jsdom`。CI（`.github/workflows/ci.yml`）只跑 `check:fast`、`test:unit`、迁移和 `test:int`，不跑 e2e。

本机测试账户：`LOCAL_ADMIN_PASSWORD='admin' pnpm configure:local-admin`；空库也可访问 `/setup` 创建所有者。

## 数据库结构变更

`src/payload.config.ts` 中 `push: false`，开发模式不会自动同步 schema。改动 `src/collections/*` 后必须在 `migrations/` 新增显式迁移并登记到 `migrations/index.ts`，再运行 `pnpm payload migrate` 和 `pnpm generate:types`。生产环境由 `migrate` 容器在 `web` 启动前执行迁移，失败则网站不启动。

Artalk 与博客共用同一个数据库，表名以 `artalk_` 为前缀，迁移不要触碰这些表。

## 架构

### 路由分区

- `/blog/**`：公开前台。`/` 永久跳转到 `/blog`。
- `/articles/**`：自建写作后台（文章、主题、探索、设置、Obsidian 导入）。`(studio)/articles/layout.tsx` 统一做登录校验，未登录跳 `/login`。
- `/admin/**`：`next.config.ts` 将其重定向到 `/articles`，Payload 自带管理界面不对外暴露（e2e 有回归测试）。`src/app/(payload)` 仍保留 Payload 的 REST/GraphQL 路由。
- `/api/blog/views`、`/api/editor/*`：阅读量统计、编辑器图片上传与 Markdown/Obsidian 导入。
- 没有 middleware/proxy；鉴权在 layout 与每个 server action 内通过 `payload.auth({ headers })` 完成。

`src/app` 下没有顶层 `layout.tsx`，而是两个各带根布局的路由分组（分组名不出现在 URL 里）：

- `(site)`：`blog`、`login`、`setup`，根布局是普通的 `<html>`，页面内容在服务端渲染。
- `(studio)`：`articles`，根布局使用 Payload 的 `RootLayout`，因为写作后台直接内嵌 Payload 的 Lexical 编辑器，需要它的 server functions 和 `src/app/importMap.ts`。

不要把前台放回 Payload 的根布局里：它会把页面内容推迟到浏览器端渲染，搜索引擎和链接预览拿到的是空页面。两个分组共用的部分在 `src/app/root-shared.tsx`。跨分组跳转（例如文章页的「编辑」入口）是整页刷新。

### 数据访问方式

页面和 server action 不直接操作集合，而是经由 `src/lib/*-service.ts`。服务层通过 `getPayloadClient()`（延迟加载配置，避免构建阶段连库）调用 Payload 本地 API，并一律使用 `overrideAccess: true`，所有权由服务层自己校验（`ownedArticle` 等按 `owner` 比对）。集合上的 `access` 规则（`ownerOnly`、全部拒绝的 `publish-approvals` / `article-view-days`）只约束 REST/GraphQL 入口，所以新增服务函数时必须自行带上 owner 条件。

`src/app/(studio)/articles/actions.ts` 是后台所有表单的 server action 入口：解析 FormData → `currentUser()` → 调服务 → `revalidatePath` / `redirect`。

### 文章版本与发布模型

核心逻辑在 `src/lib/article-service.ts`，涉及 `articles`、`article-revisions`、`publish-approvals` 三个集合：

- 每次保存都向 `article-revisions` 追加一条不可变修订（内容、元数据及其 SHA-256 `revisionHash`），`articles` 行只是私有工作副本，`currentRevision` 指向最新修订。
- 发布分两步：`previewDraft` 为当前修订生成 10 分钟有效的批准记录；`publishDraft` 校验批准与当前修订及哈希一致后，才设置 `publishedRevision` / `publishedSlug` 并公开。预览后再编辑会使批准失效，必须重新预览。
- 前台（`src/lib/blog-data.ts`）只读取 `publishedRevision` 指向的修订，因此已发布文章继续编辑不会影响线上内容，直到再次走完预览与发布。
- 文章不可删除，只能归档（`status: 'archived'`）；`makePrivate` 把文章退回草稿。
- slug 留空时自动生成随机串；`reservedSlugs` 列出了与顶层路由冲突的保留字。

### 正文内容

正文以 Lexical 编辑器状态（`ArticleContent`）存储。

- `article-content.ts`：编辑器 feature 配置与 Markdown→Lexical 转换，依赖 Payload 配置，只能在服务端使用。
- `article-content-data.ts`：类型、解析校验、纯文本提取、链接自动识别等纯函数，客户端与测试可直接引用。
- `article-content-markdown.ts` / `markdown-to-article-content.ts`：导出与导入 Markdown（基于 mdast）。
- `src/lexical/*`：自定义 feature，按 Payload 约定拆成 `.server.ts` 与 `.client.tsx`；新增或改名后需要 `pnpm generate:importmap`。
- 前台渲染在 `src/app/(site)/blog/components/rich-text.tsx`。

### 图片

`media` 集合的 `beforeChange` 钩子把上传文件转存到 ImgBed（`src/lib/imgbed.ts`），数据库只存外链与 `sha256`、`storageKey`。`IMGBED_API_TOKEN` 仅限服务端，渠道名固定为 `Tel_Channel`。粘贴网页或导入 Obsidian 时，远程图片经 `remote-image.ts` / `media-import.ts` 抓取后转存。

### 互动数据

评论与点赞来自 Artalk（`NEXT_PUBLIC_ARTALK_SERVER_URL`，生产环境经同源网关 `/artalk/*`）。阅读量由自有的 `article-view-days` 集合按 `pageKey` + 上海时区日期累计，通过 `/api/blog/views` 读写；前端汇总在 `src/lib/use-article-stats.ts`。

### 主题

明暗模式与配色（`journal` / `paper` / `mountain` / `indigo`）以 `<html>` 上的 `data-blog-theme*`、`data-blog-palette` 属性驱动，逻辑集中在 `src/app/components/theme-runtime.ts`，偏好保存在 localStorage。样式使用 CSS Modules 与 `globals.css` 中的变量，没有 Tailwind。

## 其他约定

- 环境变量统一经 `src/lib/env.ts` 的 zod schema 读取；`PAYLOAD_SECRET` 至少 32 位。
- `designs/` 是设计稿原型，不参与构建和 lint。
- 生产部署（Oracle 机器、Caddy 网关、Cloudflare 回源 8443）见 `deploy/README.md`，与根目录的本机 `docker-compose.yml` 是两套配置。
- `docs/CHANGELOG.md` 与 `docs/IMPLEMENTATION_PROGRESS.md` 记录各轮改动与验收状态。
