# 甲骨文机器发布准备

此目录定义 Oracle 生产服务；仓库根目录的 `docker-compose.yml` 用于本机开发。公开入口是 `https://suversal.com`：Cloudflare 橙云 A 记录指向 Oracle 公网 IP，回源走默认的 `443`。知识库不走 Cloudflare Tunnel。Xray 在另一台机器 `instance-edge` 上，与这台共用同一个 Oracle 安全列表（其中 TCP `443` 对全网放行），这台机器靠系统防火墙只放行 Cloudflare。最初回源用的是 `8443`，Cloudflare 不缓存经它回源的内容，2026-10-13 已停用。

## 服务与边界

- `postgres`：PostgreSQL 17，数据保存在独立 Docker 卷；不映射到宿主机端口。
- `artalk`：评论和点赞，与博客共用数据库但使用 `artalk_` 表前缀；不映射到宿主机端口。
- `migrate`：先运行 Payload 显式迁移（`scripts/run-migrations.ts`，结束后会核对每个迁移都已记录）；失败时网站不会启动。不要改回 `pnpm payload migrate`：2026-10-12 部署时发现它在生产镜像里不输出、以 0 退出却没有执行迁移。
- `web`：Next.js + Payload，只在 Docker 网络内监听 3100。
- `gateway`：仅在宿主机 `127.0.0.1:3100` 提供 HTTP，把 `/artalk/*` 转到 Artalk，其余路径转到网站。
- `edge`：以宿主机网络模式在 `443` 提供 HTTPS，使用 Oracle 上单独签发的 Cloudflare Origin CA 证书，再转发到本机 `3100`。它只接受 Cloudflare 官方回源 IP 段和本机环回地址；证书与私钥放在 `/etc/sue-notes-blog/tls`，不进入仓库或镜像。使用宿主机网络模式是为了让来源 IP 检查针对实际连接地址生效。

## 首次上线前

1. 2026-09-22 首次上线已按用户要求同步本机完整数据库：11 篇已发布文章、2 个用户、6 个主题和 55 个修订。源库保持不变；服务器仅 root 可读的导入备份保存在 `/root/sue-notes-blog-preinstall-20260922/source-db.dump`。不要在已有正式内容的库上重复恢复。
2. 在服务器安装 Docker Engine 与 Compose 插件。安装前留存当前 Xray、Cloudflare Tunnel、监听端口和防火墙状态；安装后复查这些服务。本机安装实测 Docker 把 IPv4 `FORWARD` 默认策略从 `ACCEPT` 改成 `DROP`，已通过 `/etc/docker/daemon.json` 的 `ip-forward-no-drop` 配置和恢复原策略处理；后续 Docker 升级仍需复查。
3. 把仓库代码复制到服务器的 `/home/ubuntu/sue-notes-blog`，不复制 `.env`、本机缓存、测试输出或 Docker 卷。在服务器以 `root:root`、`0600` 权限新建私有 `deploy/.env.production`，参考 `.env.production.example`。`POSTGRES_PASSWORD` 使用 URL 安全的随机十六进制；`PAYLOAD_SECRET` 和 `ARTALK_APP_KEY` 分别生成，不能复用。运行 Compose 时用 `sudo`，不把 `ubuntu` 加入具备 root 等效权限的 Docker 用户组。
4. 用 `sudo docker compose --env-file deploy/.env.production -f deploy/compose.production.yml config --quiet` 检查配置，记录目标 Git commit 与服务器目录。先运行 `sudo docker compose --env-file deploy/.env.production -f deploy/compose.production.yml build migrate` 和 `sudo docker compose --env-file deploy/.env.production -f deploy/compose.production.yml up -d postgres`。把数据库备份恢复到这一空库，核对文章、修订、用户、主题和迁移记录数量，再运行 `sudo docker compose --env-file deploy/.env.production -f deploy/compose.production.yml up -d`；检查迁移任务退出码、数据库健康状态和容器日志。
5. 在 Oracle 上生成独立私钥和 CSR，在 Cloudflare 创建包含 `suversal.com` 的 Origin CA 证书，将证书安装为 `/etc/sue-notes-blog/tls/origin.pem`，私钥为同目录的 `origin.key`。证书需与私钥匹配，且有效期内覆盖根域名。系统防火墙（`/usr/local/sbin/sue-notes-blog-firewall`）仅允许 Cloudflare 官方 IPv4 回源网段访问 TCP `443`；应用层也按官方回源网段过滤。Oracle 安全列表里的 `443` 是给另一台机器的 Xray 开的，不要改。
6. 设 `PUBLIC_URL=https://suversal.com`，启动 `edge` 后先从本机检查 443 的 TLS、域名和反向代理。Cloudflare 区域保持 Full (strict)，不需要改写回源端口，直接创建根域名的橙云 A 记录。Cloudflare 的“始终使用 HTTPS”保持启用，不让 HTTP 请求回源到未开放的 80。
7. 从公网用真实浏览器验证首页、文章、登录、后台、图片、评论和手机布局；检查 `/artalk/api/v2/` 经过同源网关，并复查 Xray 与现有其他 Tunnel 服务。HTTP 200 和容器运行只属于基础检查。生产账号密码未存入此仓库，登录验收需由持有账号的人完成。

## 数据与更新

本机数据库与云端数据库分开。本次复制本机完整数据库，包含文章、修订、账户、主题、站点设置和 Artalk 表；不能在已经写入正式内容的目标库上直接覆盖。ImgBed 图片是外部资源，还要核对图片链接及上传 Token。初次恢复在迁移前完成，迁移会根据备份内的 `payload_migrations` 记录跳过已执行的步骤。

每次后续更新前，先记录当前镜像和迁移版本，再用 `pg_dump -Fc` 生成并在服务器外保存数据库备份。构建新镜像并运行迁移后，验证公开页面与写作后台。代码可以回退到先前镜像；数据库结构变更需要使用部署前备份恢复，不能仅靠镜像回退。

## 回源网段维护

`Caddyfile.edge` 中的地址来自 Cloudflare 官方 `ips-v4` / `ips-v6` 列表，记录日期见文件注释。Cloudflare 更新地址时，应核对官方列表并更新配置、验证 Caddyfile、重建 `edge`；否则新网段回源会收到 403。旧的 Tunnel 仍为其他服务运行，知识库根域名不配置 Tunnel 路由。
