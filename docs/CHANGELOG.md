# 苏码玩家变更记录

## 2026-10-23：知识库接入 Umami 访问统计

- 公开博客布局通过 `next/script` 的 `afterInteractive` 策略加载 `https://stats.suversal.com/s.js`，对应 Umami 的 `blog` 网站（ID：`a0eae62d-81db-4753-9959-a0a93d462f8e`）。只在生产模式加载，且通过 `data-domains="suversal.com"` 限制正式域名上报；登录、初始化和后台布局不注入脚本。
- 使用 Umami 自带的首次访问与客户端路由统计，不额外手动触发访问事件；Artalk 的阅读量、评论和点赞保持原有统计方式。README 补充配置和浏览器验收步骤。
- 检查：`pnpm check:fast` 通过（57 条既有 warning），114 项单元测试通过，Oracle 上的生产镜像构建通过。功能提交为 `6d58d08`，仅同步该提交的代码和 README；未带入本地许可证、Logo 等无关改动。
- 上线：仅重建并切换 `web` 容器，没有运行数据库迁移或重启其他服务；保留 `sue-notes-blog:before-umami-20261023` 镜像供回退。
- 实际验收（北京时间 01:19—01:20）：真实 Chrome 依次打开首页、点击归档、点击文章。`s.js` 返回 200，三次 `/api/collect` 上报均返回 200，网站 ID、域名、路径及标题正确，页面始终只有一个追踪脚本。Umami `blog` 实时面板显示 3 次浏览，活动日志分别包含 `/blog`、`/blog/archive`、`/blog/9ve2ogtdy6`；这是本次验收产生的流量。公网首页、站点地图、robots 和统计脚本均返回 200。

## 2026-10-22：完善文章搜索摘要与分享信息

- 文章未填写摘要时，从已发布正文的段落生成短摘要；跳过代码、标题和表格，只用于搜索元数据，不改写文章或数据库内容。手写摘要仍优先。
- 公开页面补齐 Open Graph 和 X 分享卡片，文章使用自己的封面、摘要、分类和公开地址；没有封面时使用文字卡片。
- 文章页增加 `BlogPosting` 结构化数据，标明作者、标题、发布时间和封面；不使用包含私有草稿编辑的 `updatedAt` 伪造公开修改时间，并转义 JSON-LD 中的 HTML 起始字符。
- 登录、初始化和写作后台增加 `noindex`；Markdown 下载响应增加 `X-Robots-Tag: noindex`，避免下载副本参与索引。公开正文仍允许抓取和索引。
- 复用同次请求的站点信息查询，避免页面、摘要和结构化数据重复读取站点设置。
- 验证与上线：`pnpm check:fast` 通过（57 条既有 warning），114 项单元测试通过，生产镜像构建通过；仅切换 `web`，未运行数据库迁移，并保留上线前镜像。公网检查时地图已自动增长为 19 篇文章加 5 个固定页面，共 24 个地址；全部返回 200，摘要、canonical、分享信息及 19 篇文章的 JSON-LD 一致性检查通过。
- 引擎验收：Bing 实时检测从「缺少 Meta Description」变为「未找到 SEO/GEO 问题」，抽查文章已成功请求编制索引。Google 手动索引请求因浏览器无法连接 reCAPTCHA 服务而失败，富媒体结果测试也未取得结果；不将其记为验证通过或已收录，原站点地图提交状态仍有效。

## 2026-10-22：补齐搜索引擎站长验证与站点地图

- 新增 `/sitemap.xml`：按当前发布状态动态列出公开且已发布的文章，使用已发布版本的 slug 和发布时间；不加载私有正文，不受首页 100 篇上限影响。当前为 16 篇文章加 5 个固定页面，共 21 个网址。
- 新增 `/robots.txt`：允许抓取公开页面，排除写作后台、登录、初始化、API 和评论接口，并声明站点地图地址。补齐正式域名的 `metadataBase` 和首页 canonical。
- Google Search Console：确认 `suversal.com` 当前账号为经过验证的所有者；新增博客根站点地图，后台状态为「成功」，已发现 21 个网址。原 Radar 子站地图保持不变。
- Bing Webmaster Tools：手动添加 `https://suversal.com/`，通过 `public/BingSiteAuth.xml` 完成验证；提交博客站点地图，后台状态为「成功」，已发现 21 个网址，0 错误、0 警告。
- 验证与上线：`pnpm check:fast` 通过（57 条既有 warning），107 项单元测试通过；生产镜像构建通过，仅更新 web 容器。三个公开文件、21 个地图地址及 Googlebot / bingbot 的地图请求均返回 200，首页 canonical 指向正式地址。没有数据库结构变更，保留服务器旧镜像供回退。
- Google 的 robots 报告仍保留 2026-10-01 的旧 404 检查结果，线上文件已返回 200，等待后续自动抓取刷新。

## 2026-10-12：Cloudflare 侧加固

- 范围：只改了 Cloudflare 后台（免费版）和 Spaceship 的 DS 记录，仓库代码和服务器没有动。区域 `suversal.com` 下还有 radar、stats、img 和二十多个 Tunnel 子域名，带「全区域」字样的改动对它们同样生效。
- 最低 TLS 版本：1.0 改为 1.2（全区域）。
- DNSSEC：Cloudflare 侧开启，Spaceship「高级 DNS → DNSSEC」添加 DS 记录（Key Tag 2371，算法 13，摘要类型 2）。以后要把 DNS 从 Cloudflare 迁走，必须先在 Spaceship 删掉这条 DS 记录，否则整个域名无法解析。
- WAF 自定义规则（都只匹配 `suversal.com`）：`blog-block-scanner-paths` 拦截以 `/wp-`、`/.env`、`/.git` 开头或以 `.php` 结尾的路径；`blog-challenge-login` 对 `/login` 做托管质询。质询通过后 30 分钟内有效。
- 缓存规则 `blog-cache-next-static`：把 `/_next/static/*` 标为可缓存。加完后仍是 `cf-cache-status: DYNAMIC`，当时没有效果，原因和解决见下面 10 月 13 日的记录。
- DMARC：新增 `_dmarc` TXT，内容 `v=DMARC1; p=none;`，只占位，不拦截。
- 没有动的：限速规则 `edge-flood-guard`（免费版唯一一条，全区域每 IP 10 秒 200 次）、原有三条缓存规则、回源规则。
- 验证：从公网确认 TLS 1.0/1.1 握手失败、扫描路径返回 403、`/login` 返回质询；所有者实际登录并发布了一篇文章。前台页面、阅读量和 Artalk 接口、radar/stats/img/edge/cnblog 状态码正常，Tunnel 子域名没有逐个测。
- 待办：
  - 别名邮箱与 DMARC：`@suversal.com` 目前只经 Cloudflare Email Routing 收信，没有用它发过信。研究清楚别名邮箱怎么发信之后再定策略：只收不发就把 `_dmarc` 改成 `p=quarantine`（或 `p=reject`）；要发信则先把发信渠道的 SPF、DKIM 配好再收紧。radar 子域名经 Resend 发信，有自己的 SPF 和 DKIM。
  - Oracle 安全列表里还留着 15 条「Knowledge base Cloudflare origin 8443」放行规则，已经没有用处（服务器防火墙不再放行 8443，也没有进程监听），可以在 Oracle 后台删掉。这个安全列表与 `instance-edge` 共用，删的时候不要碰 22 和 443 两条。
- 2026-10-13 回源端口从 8443 改为 443：原先 `/_next/static/*` 一直是 `cf-cache-status: DYNAMIC`，原因是 Cloudflare 不缓存经 8443 回源的内容。
  - 服务器：`edge` 只监听 443；防火墙脚本 `/usr/local/sbin/sue-notes-blog-firewall` 只对 Cloudflare 网段放行 443，原有的 8443 放行规则已删除（最初的脚本备份为同目录 `.bak-20261013`）。
  - Cloudflare：回源规则 `suversal-root-to-oracle-8443` 已删除，回源走默认端口。Oracle 后台没有改。
  - 验证：静态资源返回 `HIT`；前台页面、阅读量和 Artalk 接口、扫描路径拦截、`/login` 质询状态码与切换前一致；所有者实际登录过后台。
  - 文档：`deploy/README.md` 和 `CLAUDE.md` 里的回源端口改为 443；「443 由 Xray 使用」的说法已更正，Xray 在另一台 `instance-edge` 上。
- 账户名必须全小写：登录时会把输入转成小写再精确匹配，库里存成 `Sue` 时怎么输入都登不上，改成 `sue` 后恢复。直接改数据库里的 `users.email` 时要注意。

## 2026-10-12：手机端四处调整

- 分支：`fix/mobile-polish`。
- 后台底色：写作后台（`/articles/**`）和前台一样同步浏览器栏颜色与页面底色，手机 Safari 顶部和底部不再露出浅色；站内跳转时也会重新同步，跳到登录页时撤掉。
- 后台导航：手机上七个入口排成一行、可横向滑动，当前项自动滑到可见范围，不再折成两行。
- 主题管理：手机上每个主题两行，第一行名称在左、公开和草稿篇数在右，第二行是操作。
- 探索：带图标的卡片，标题和状态对着图标的中线。
- 归档：手机上日期列按文字宽度走，日期和标题之间只留 10px。
- 验证：`pnpm check:fast` 通过，单元测试 101/101 通过；归档、探索、后台文章、主题、站点设置五个页面在 430px 深色下截图检查过。集成测试和 e2e 本轮没有跑。

## 2026-10-11：前台改版，站名改为「苏码玩家」，新增「在用」页面

- 分支：`feat/frontend-redesign`（基于 `origin/main` 的 `ee4344f`）。设计稿：<https://claude.ai/artifact/JPjgJbVLyAsZ67RgDM1JfB>。
- 站名：默认站名、默认一句话介绍、默认作者简介和各页面标题改为「苏码玩家」；页头去掉英文副标题。Artalk 的站点名（`site: '苏码手记'`）**没有改**，改了会和已有评论、点赞数据对不上。
- 首页：头条改为置顶轮播（取 `pinPriority` 大于 0 的前 5 篇，没有置顶时显示最新一篇；6 秒自动切换，悬停暂停，手机端左右滑动；卡片高度由 5:2 的封面决定，封面不裁切，标题最多三行）；列表从带缩略图的行改为两列封面卡片，按发布时间列出全部文章，置顶文章不再从列表中剔除；去掉行序号、点赞数和侧栏的「返回文章列表」。滚动自动加载保持不变。
- 归档：按年份分组，年份标题吸顶；搜索框移到标题右侧，主题改为带篇数的胶囊，排序简化为「最新 / 最多阅读」两项，年份下拉保留；每行只保留时长和阅读量；去掉统计加载中的提示行，避免列表跳动。
- 探索：按「开源项目 / 我的站点 / 收藏」分组，不再有筛选按钮；开源项目的卡片大小一致，带标签和语言色点；勾了「显示 Star 和 Fork」的项目排在最前面并多显示这两个数字，上传了图标的会显示图标。Star 等数据由服务器从 GitHub 公开接口获取，进程内缓存 6 小时，出错时沿用上一次的结果并在 10 分钟后重试（`src/lib/github-stats.ts`）。条目可填多条相关文章；分类名「网站收藏」改为「收藏」。**没有后台管理页**，和「在用」一样由所有者在页面上直接编辑，后台侧栏的「探索页面」跳到该页。
- 在用：新增 `/blog/uses`。一次只看一个分类，每个分类有自己的地址（`/blog/uses#分类名`）；卡片包含 Logo、一句卖点、标签、说明（`**重点**` 加粗）、优惠说明、多条手填的相关文章和可自定义文字的按钮，邀请链接加 `rel="sponsored"`。**没有后台管理页**：站点所有者登录后，页面右下角出现「编辑」，可以原地增删改条目和分类、调整顺序、隐藏条目、上传 Logo（走现有图床接口）；编辑界面单独打包，访客不会加载。清单为空时访客的导航里不显示「在用」，所有者始终可见。后台侧栏的「在用清单」直接跳到该页面。
- 关于：改为左侧名片（头像、X 简介四行、社交链接）加右侧正文的两栏布局。
- 数据库：迁移 `20261011_120000_uses_and_site_rename` 新增 `uses_categories`、`uses_items` 两张表并预置六个分类（服务器、机场、手机卡、银行卡、U卡、其他），给 `explore_items` 加 `logo_url`、`related_links`、`is_featured`（默认把 WrapPin 和果到雷达设为重点项目），`meta`、`status` 改为可空；给 `articles` 加 `source_url`（X 原文链接，并按标题预填已知的 12 篇）；并把仍是旧默认值的站名、介绍、简介和探索页里的站点名更新为新值。
- 其他：文章可填「X 原文」链接（后台文章管理的行菜单里设置，文章标题下和文末显示）；后台预览的手机模式改为 390px 内嵌页面；后台文章列表默认按「最新发布」排序；首页侧栏在剩余高度放得下时显示三行站点信息（文章数、累计阅读、最近更新）；手机首页不再显示页头下面那句介绍。
- 全站字号：前台最小字号从 11px 提到 13–14px（手机端仍保留原来的紧凑字号）。文章详情页未改。
- 验证：`pnpm check:fast` 通过；单元测试 99/99、集成测试 2/2、e2e 11/11 通过；「在用」的页面内编辑用本机管理员账号在浏览器里完整走过一遍（新增、原地编辑、隐藏、调整顺序）。五个前台页面在桌面深色、桌面浅色和 390px 手机宽度下截图检查过。
- 待办：关于页头像 `src/app/blog/about/avatar.png` 是从截图裁出的 260px 临时图，需要换成原图。

## 2026-09-13：同步本轮样式与阅读交互修复

- 任务：按用户要求将本轮在旧目录完成的前台、后台修改同步到 `/Users/sue/Developer/sue-notes-blog`，后续使用新目录。
- 来源：`/Users/sue/Developer/knowhub` 中本轮对话的明确修改，未整体复制旧仓库。
- 同步文件：
  - `src/app/blog/components/home-client.tsx`
  - `src/app/blog/components/popular-articles.tsx`（新增）
  - `src/app/blog/components/reveal.tsx`（新增）
  - `src/app/blog/home.module.css`（新增）
  - `src/app/blog/components/plate.tsx`
  - `src/app/blog/components/ui-icon.tsx`
  - `src/app/articles/components/admin-shell.tsx`
  - `tests/blog/home-navigation.test.tsx`（新增）
  - `tests/blog/admin-navigation.test.tsx`（新增）
- 合并文件：`src/app/blog/components/public-shell.tsx`、`src/app/blog/blog-v1.module.css`、`src/app/articles/admin-v1.module.css`。保留新目录的隐藏移动主题按钮、简化页脚及编辑器/富文本/表格/图片尺寸/换行规则，只合并本轮外观与动效。
- 新增记录：`docs/IMPLEMENTATION_PROGRESS.md`、`docs/CHANGELOG.md`；记载用户接受的阅读布局和点赞/评论后续待办，不导入旧目录过时的项目范围与运行结论。
- 验证：36/36 单元测试通过；相关 ESLint、TypeScript、生产构建及 diff 检查通过。新目录其他 15 个已存在改动的文件哈希未变。
- 运行：临时生产服务验证完成并关闭；3100 已由新目录的 `pnpm dev` 提供。首页/后台入口 HTTP 200，进程 cwd 已核实。真实浏览器交互及视觉未复验。
- 状态：本轮同步与本地运行切换完成。保留新目录自身数据库和配置；未提交、未远程部署。

## 2026-09-13：详情页紧凑阅读排版

- 缩小文章主标题与装饰封面，收窄正文列，减少进入正文前的留白。
- 正文默认 17px / 1.7 行高、约 14px 段距；统一各级标题、列表、引用、代码块、表格和图片间距。
- 保留阅读设置、目录及富文本图片自定义尺寸；阅读设置按钮添加辅助名称。
- 相关 ESLint、TypeScript、生产构建及 2 项富文本图片测试通过；浏览器视觉尚未复验。
