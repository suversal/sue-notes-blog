# 苏码手记

苏码手记是一个基于 Next.js、Payload CMS 和 PostgreSQL 的个人博客。仓库只保留博客前台、写作后台和它们直接依赖的服务。

代码目录：`/Users/sue/Developer/sue-notes-blog`。这是一个独立项目。

## 功能范围

- 博客首页、归档、关于页和文章详情
- 登录、站点设置、主题管理和文章管理
- Lexical 富文本编辑、Markdown/网页图文粘贴和图片上传
- 草稿、预览批准、发布、更新后二次确认、转为私密
- Payload 管理后台和 PostgreSQL 持久化
- Artalk 阅读量、文章点赞、评论与评论管理

## 本地启动

1. 安装 Node.js 22 和 pnpm 11。
2. 复制 `.env.example` 为 `.env`，填写 `PAYLOAD_SECRET`。
3. 如需粘贴图片，填写 ImgBed 服务端配置，Token 只放在本地 `.env`。
4. 启动数据库并安装依赖：

   ```bash
   docker compose up -d
   pnpm install
   ```

5. 首次使用空数据库时，先执行迁移：

   ```bash
   pnpm payload migrate
   ```

   数据库结构使用显式迁移，开发请求不再触发交互式 schema push。已有通过开发模式建表的数据库需要先核对迁移基线，不要直接重放初始迁移。当前本地库的文章封面增量字段已于 2026-09-13 应用。

6. 启动应用：

   ```bash
   pnpm dev
   ```

访问入口：

- `http://127.0.0.1:3100/`：永久跳转到博客首页
- `http://127.0.0.1:3100/blog`：博客前台
- `http://127.0.0.1:3100/articles`：写作后台
- `http://127.0.0.1:3100/admin`：Payload 管理后台
- `http://127.0.0.1:23366/sidebar/`：Artalk 评论管理后台

首次使用可访问 `/setup` 创建所有者账户。仅本机开发时，也可运行 `LOCAL_ADMIN_PASSWORD='admin' pnpm configure:local-admin` 配置测试管理员。

首次管理评论前，需要为 Artalk 创建管理员：

```bash
docker compose exec artalk artalk admin
```

Artalk 与博客复用同一个 PostgreSQL 数据库，数据表统一使用 `artalk_` 前缀，与 Payload 表隔离。生产环境通过 `NEXT_PUBLIC_ARTALK_SERVER_URL` 指向公开可访问的 Artalk 服务地址，并把博客域名加入 `ATK_TRUSTED_DOMAINS`。

## 常用命令

```bash
pnpm check:fast
pnpm test:unit
pnpm test:int
pnpm test:e2e
pnpm smoke:blog
pnpm build
```

文章公开前必须先生成预览批准；批准只对当时的版本有效，编辑后需要重新预览和确认。图片上传使用 ImgBed 服务端 Token，并固定传递渠道名 `Tel_Channel`。

甲骨文机器的生产服务与上线检查见 [deploy/README.md](deploy/README.md)。
