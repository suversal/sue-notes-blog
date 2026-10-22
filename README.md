# 苏码玩家

苏码玩家是一个基于 Next.js、Payload CMS 和 PostgreSQL 的个人博客，包含公开前台和自建的写作后台。

线上地址：<https://suversal.com>

## 技术栈

- Next.js 16（App Router）+ React 19
- Payload CMS 3 + PostgreSQL，Lexical 富文本编辑器
- [Artalk](https://github.com/ArtalkJS/Artalk)：评论、点赞与总阅读量
- [CloudFlare-ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed)：图片存储
- [Umami](https://github.com/umami-software/umami)：访问统计
- 生产环境：Docker Compose 部署在甲骨文服务器，前面是 Cloudflare CDN

## 功能范围

- 博客前台：首页、归档、探索、在用、关于页和文章详情，文章支持置顶和 Markdown 导出
- 四套配色与明暗模式
- 写作后台：登录、站点设置、主题管理和文章管理
- Lexical 富文本编辑、Markdown/网页图文粘贴、图片上传和 Obsidian 笔记导入
- 草稿、预览批准、发布、更新后二次确认、转为私密
- Artalk 总阅读量、文章点赞、评论与评论管理；近 30 天阅读量和热门排行由博客自己的 `article_view_days` 表统计
- SEO：站点地图、robots、Open Graph 与 X 分享卡片、文章结构化数据
- Umami 访问统计

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

   数据库结构使用显式迁移，开发请求不再触发交互式 schema push。已有通过开发模式建表的数据库需要先核对迁移基线，不要直接重放初始迁移。

6. 启动应用：

   ```bash
   pnpm dev
   ```

访问入口：

- `http://127.0.0.1:3100/`：永久跳转到博客首页
- `http://127.0.0.1:3100/blog`：博客前台
- `http://127.0.0.1:3100/articles`：写作后台（`/admin` 会重定向到这里，Payload 自带的管理界面不对外开放）
- `http://127.0.0.1:23366/sidebar/`：Artalk 评论管理后台

首次使用可访问 `/setup` 创建所有者账户。仅本机开发时，也可运行 `LOCAL_ADMIN_PASSWORD='admin' pnpm configure:local-admin` 配置测试管理员。

首次管理评论前，需要为 Artalk 创建管理员：

```bash
docker compose exec artalk artalk admin
```

Artalk 与博客复用同一个 PostgreSQL 数据库，数据表统一使用 `artalk_` 前缀，与 Payload 表隔离。生产环境通过 `NEXT_PUBLIC_ARTALK_SERVER_URL` 指向公开可访问的 Artalk 服务地址，并把博客域名加入 `ATK_TRUSTED_DOMAINS`。

## 图片存储

图片上传到自建的 [CloudFlare-ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed)，数据库只保存外链。服务端配置见 `.env.example` 中的 `IMGBED_*`：上传 Token 只在服务端使用；上传渠道名由 `IMGBED_CHANNEL_NAME` 指定，默认 `Tel_Channel`，需要与你的 ImgBed 实例中实际存在的渠道一致，否则上传会失败。

## Umami 访问统计

博客前台在生产模式下通过 `next/script` 加载 `https://stats.suversal.com/s.js`，站点 ID 为 `a0eae62d-81db-4753-9959-a0a93d462f8e`，对应 Umami 后台的 `blog` 网站。脚本位于 `src/app/(site)/blog/layout.tsx`，采用 `afterInteractive` 策略，由 Umami 自动记录页面访问和前台路由切换。`data-domains="suversal.com"` 限制正式域名上报，开发模式不加载；登录、初始设置、写作后台和 Payload 页面均不接入脚本。

这组公开追踪参数不需要 API Key，也不替换现有 Artalk 阅读量、点赞和评论统计。部署后需用浏览器确认脚本和上报请求成功，再到 Umami 仪表盘核对数据；代码或构建检查不代表线上统计已经生效。

部署验收：

1. 在正式站打开 `/blog`，确认 `s.js` 加载成功且页面只有一个 Umami 脚本。
2. 点击文章或归档链接，确认首次访问及客户端路由切换均自动向 `stats.suversal.com` 上报，网站 ID、域名和路径正确；不额外手动调用 `umami.track()`，避免重复计数。
3. 打开 Umami 的 `blog` 网站实时面板，确认出现刚访问的路径。广告拦截器或浏览器隐私设置可能阻止统计，排查时以浏览器网络请求和后台数据为准。

## 自己部署时需要替换的内容

以下配置属于本站，自己部署时请换成自己的或删除：

- Umami：`src/app/(site)/blog/layout.tsx` 中的脚本地址、站点 ID 和 `data-domains`。
- Bing 站长验证文件：`public/BingSiteAuth.xml`。
- 站点名称、作者信息等在写作后台的站点设置里修改。

## 常用命令

```bash
pnpm check:fast
pnpm test:unit
pnpm test:int
pnpm test:e2e
pnpm smoke:blog
pnpm build
```

文章公开前必须先生成预览批准；批准只对当时的版本有效，编辑后需要重新预览和确认。

甲骨文机器的生产服务与上线检查见 [deploy/README.md](deploy/README.md)。

## 许可证

[MIT](LICENSE)
