# 苏码手记变更记录

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
