# 甲骨文机器发布准备

此目录只定义生产服务；仓库根目录的 `docker-compose.yml` 仍用于本机开发。生产入口由服务器上已经运行的 Cloudflare Tunnel 转发到 `http://127.0.0.1:3100`。`443` 由现有 Xray 使用，不在此方案中改动。

## 服务与边界

- `postgres`：PostgreSQL 17，数据保存在独立 Docker 卷；不映射到宿主机端口。
- `artalk`：评论和点赞，与博客共用数据库但使用 `artalk_` 表前缀；不映射到宿主机端口。
- `migrate`：先运行 Payload 显式迁移；失败时网站不会启动。
- `web`：Next.js + Payload，只在 Docker 网络内监听 3100。
- `gateway`：在宿主机 `127.0.0.1:3100` 监听，把 `/artalk/*` 转到 Artalk，其余路径转到网站。Tunnel 只需一个公开域名。

## 首次上线前

1. 确定公开域名。2026-09-22 首次上线按用户要求同步本机完整数据库：11 篇已发布文章、2 个用户、6 个主题和 55 个修订。源库保持不变；先生成 PostgreSQL 自定义格式备份，核对文件大小与哈希，再传到服务器。
2. 在服务器安装 Docker Engine 与 Compose 插件。安装前留存当前 Xray、Cloudflare Tunnel、监听端口和防火墙状态；安装后复查这些服务。本机安装实测 Docker 把 IPv4 `FORWARD` 默认策略从 `ACCEPT` 改成 `DROP`，已通过 `/etc/docker/daemon.json` 的 `ip-forward-no-drop` 配置和恢复原策略处理；后续 Docker 升级仍需复查。
3. 把仓库代码复制到服务器的 `/home/ubuntu/sue-notes-blog`，不复制 `.env`、本机缓存、测试输出或 Docker 卷。在服务器以 `root:root`、`0600` 权限新建私有 `deploy/.env.production`，参考 `.env.production.example`。`POSTGRES_PASSWORD` 使用 URL 安全的随机十六进制；`PAYLOAD_SECRET` 和 `ARTALK_APP_KEY` 分别生成，不能复用。运行 Compose 时用 `sudo`，不把 `ubuntu` 加入具备 root 等效权限的 Docker 用户组。
4. 用 `sudo docker compose --env-file deploy/.env.production -f deploy/compose.production.yml config --quiet` 检查配置，记录目标 Git commit 与服务器目录。先运行 `sudo docker compose --env-file deploy/.env.production -f deploy/compose.production.yml build migrate` 和 `sudo docker compose --env-file deploy/.env.production -f deploy/compose.production.yml up -d postgres`。把数据库备份恢复到这一空库，核对文章、修订、用户、主题和迁移记录数量，再运行 `sudo docker compose --env-file deploy/.env.production -f deploy/compose.production.yml up -d`；检查迁移任务退出码、数据库健康状态和容器日志。
5. 在公开 Tunnel 路由之前，通过 SSH 端口转发验证已迁移账户能登录，且 `/setup` 不能再创建所有者。然后把公开主机名路由到 `http://127.0.0.1:3100`。站点域名必须与 `PUBLIC_URL` 一致。
6. 从公网用真实浏览器验证首页、文章、登录、后台、图片、评论和手机布局；同时检查 `/artalk/api/v2/` 请求是否经过同源网关，Xray 与现有 Tunnel 仍正常。HTTP 200 和容器运行只属于基础检查。

## 数据与更新

本机数据库与云端数据库分开。本次复制本机完整数据库，包含文章、修订、账户、主题、站点设置和 Artalk 表；不能在已经写入正式内容的目标库上直接覆盖。ImgBed 图片是外部资源，还要核对图片链接及上传 Token。初次恢复在迁移前完成，迁移会根据备份内的 `payload_migrations` 记录跳过已执行的步骤。

每次后续更新前，先记录当前镜像和迁移版本，再用 `pg_dump -Fc` 生成并在服务器外保存数据库备份。构建新镜像并运行迁移后，验证公开页面与写作后台。代码可以回退到先前镜像；数据库结构变更需要使用部署前备份恢复，不能仅靠镜像回退。

## 尚需确定

- 公开域名与 Cloudflare Tunnel 的主机名路由。
- 生产 ImgBed Token 的安全传递方式。
