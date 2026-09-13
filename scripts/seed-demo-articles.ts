import assert from 'node:assert/strict'
import { createDraft, previewDraft, publishDraft } from '../src/lib/article-service'
import { getPayloadClient } from '../src/lib/payload'

const ownerEmail = process.env.SEED_OWNER_EMAIL?.trim() || 'admin@local.test'

const topics = ['AI 实践', '开发手记', '工具效率', '独立产品', '科技观察', '数字生活', '阅读思考', '旅行见闻']

const articles = [
  {
    title: '我如何把 AI 变成每天都能用的工作搭档',
    slug: 'demo-ai-daily-workflow',
    topic: 'AI 实践',
    excerpt: '从临时问答到稳定工作流，我留下了真正有效的三个使用习惯。',
    tags: ['AI', '工作流', '效率'],
    coverStyle: 'grid' as const,
    body: `## 先从重复工作开始

我没有一开始就追求复杂的自动化，而是先记录每天反复出现的动作：整理资料、检查代码、改写说明和生成清单。

> 好的 AI 工作流不是一次惊艳的回答，而是每次都能得到可预期的结果。

## 我的三个习惯

1. 给出真实上下文，而不是只写一句命令。
2. 先让它检查现状，再决定是否修改。
3. 把最后的判断和发布动作留给自己。

这样做以后，AI 更像一位熟悉项目的协作者，而不是偶尔灵光一现的搜索框。`,
  },
  {
    title: '提示词写得越长，结果就一定越好吗？',
    slug: 'demo-prompt-length-myth',
    topic: 'AI 实践',
    excerpt: '真正决定结果的不是字数，而是目标、边界和判断标准是否清楚。',
    tags: ['提示词', 'AI', '方法'],
    coverStyle: 'notes' as const,
    body: `很多人第一次优化提示词，会不断往里面追加规则。文字越来越长，模型却未必更懂你的目标。

## 比长度更重要的三件事

- 结果要解决什么问题
- 哪些信息不能被改动
- 什么样的输出才算合格

我现在更倾向于先写一个短版本，观察错误发生在哪里，再补充必要约束。提示词应该像产品需求一样迭代，而不是一次写成说明书。`,
  },
  {
    title: '一次 Next.js 页面变慢的排查记录',
    slug: 'demo-nextjs-slow-page-debug',
    topic: '开发手记',
    excerpt: '页面一直停在 Rendering，不一定是前端渲染本身出了问题。',
    tags: ['Next.js', '性能', '排查'],
    coverStyle: 'cache' as const,
    body: `## 现象

开发环境启动正常，但第一次打开页面要等待很久，刷新后偶尔还会继续卡住。

## 排查顺序

我依次确认了端口占用、数据库连接、服务端请求和构建缓存。最后发现页面在等待一个没有及时返回的本地服务。

\`\`\`bash
lsof -nP -iTCP:3100 -sTCP:LISTEN
curl -I http://127.0.0.1:3100/blog
\`\`\`

这次经验提醒我：看到 Rendering 时，不要只盯着 React 组件，服务端依赖和数据库连接同样值得先查。`,
  },
  {
    title: '为什么本地开发总要先确认端口',
    slug: 'demo-local-port-check',
    topic: '开发手记',
    excerpt: '同一个端口上的旧进程，常常会制造最像代码缺陷的假象。',
    tags: ['本地开发', '调试', '端口'],
    coverStyle: 'none' as const,
    body: `本地项目多了以后，端口冲突几乎不可避免。最麻烦的情况不是服务启动失败，而是旧服务仍然活着，让你误以为刚改的代码没有生效。

## 我现在的启动检查

1. 确认当前仓库路径和分支。
2. 查询目标端口由哪个进程占用。
3. 检查进程的工作目录。
4. 请求一个具有项目特征的页面。

花几十秒做完这些检查，通常比清缓存、重装依赖更省时间。`,
  },
  {
    title: '我的 macOS 写作工具链',
    slug: 'demo-macos-writing-toolkit',
    topic: '工具效率',
    excerpt: '从捕捉想法到正式发布，一套克制而稳定的写作组合。',
    tags: ['macOS', '写作', '工具'],
    coverStyle: 'notes' as const,
    body: `我试过很多写作软件，最后留下来的工具并不多。真正重要的是让内容顺畅地经过记录、整理、校对和发布。

## 当前分工

- 临时想法进入收集箱
- 长文在本地编辑器完成
- 图片单独管理并补充说明
- 发布前在真实页面预览

工具越少，每一个环节的边界反而越清楚。写作系统的价值不是功能齐全，而是让人愿意持续写下去。`,
  },
  {
    title: '我为什么不再频繁更换笔记软件',
    slug: 'demo-stop-switching-note-apps',
    topic: '工具效率',
    excerpt: '迁移工具带来的新鲜感很短，内容的连续性才是长期资产。',
    tags: ['笔记', '知识管理', '选择'],
    coverStyle: 'grid' as const,
    body: `过去我会因为一个新功能就迁移整套笔记。后来发现，真正消耗时间的不是导入导出，而是重新建立使用习惯。

现在我判断工具只看四点：数据能否导出、搜索是否可靠、常用动作是否顺手、项目是否持续维护。

> 一个普通但长期可用的工具，通常比一个惊艳却不断变化的工具更有价值。

停止折腾以后，我反而写下了更多真正需要留下的内容。`,
  },
  {
    title: '独立开发产品前，我会先回答这五个问题',
    slug: 'demo-five-questions-before-building',
    topic: '独立产品',
    excerpt: '先确认真实需求和使用频率，再决定是否值得写第一行代码。',
    tags: ['独立开发', '产品', '需求'],
    coverStyle: 'grid' as const,
    body: `新点子出现时，立刻开始开发很有诱惑力。但在动手前，我会先回答五个问题。

1. 谁会在什么场景下使用它？
2. 现在没有它时，用户如何解决问题？
3. 这个动作一周会发生几次？
4. 最小可用版本可以少到什么程度？
5. 我愿意维护它多久？

这些问题不能保证产品成功，却能很快淘汰只在想象里成立的需求。`,
  },
  {
    title: '一个小工具从自用到公开发布的过程',
    slug: 'demo-tool-from-personal-to-public',
    topic: '独立产品',
    excerpt: '真正困难的部分，往往发生在功能已经能用之后。',
    tags: ['产品发布', '开源', '迭代'],
    coverStyle: 'cache' as const,
    body: `最初它只是一个解决自己问题的脚本。随着使用次数增加，我开始补上错误提示、设置保存和升级路径。

## 自用版本没有暴露的问题

- 默认配置是否安全
- 第一次启动是否容易理解
- 出错以后能否恢复
- 不同系统上的行为是否一致

公开发布不是把仓库设为公开那么简单。用户看到的是完整体验，而不是作者脑海里的使用说明。`,
  },
  {
    title: '我眼中的端侧 AI：离真正好用还有多远',
    slug: 'demo-on-device-ai-observation',
    topic: '科技观察',
    excerpt: '隐私、延迟和成本都很诱人，但端侧体验仍受硬件与模型能力限制。',
    tags: ['端侧 AI', '趋势', '隐私'],
    coverStyle: 'cache' as const,
    body: `端侧 AI 最吸引人的地方，是数据可以留在设备上，响应也不必完全依赖网络。但从演示走到日常使用，还有不少现实问题。

设备的内存、功耗和散热决定了模型能跑多大；系统提供的能力又决定了开发者能否稳定接入。

我的判断是，短期内最实用的方向不是在手机上复刻云端大模型，而是让小模型承担明确、频繁、对隐私敏感的任务。`,
  },
  {
    title: '订阅制软件为什么越来越让人疲惫',
    slug: 'demo-subscription-fatigue',
    topic: '科技观察',
    excerpt: '问题并不只是价格，而是用户越来越难判断自己真正拥有什么。',
    tags: ['订阅制', '软件', '消费'],
    coverStyle: 'none' as const,
    body: `订阅制让开发者获得持续收入，也让软件能够持续维护。但当每个小工具都要求按月付费时，用户会开始计算另一笔成本：管理这些订阅需要多少注意力。

我更愿意为持续产生价值的服务订阅，也希望买断、维护订阅和云服务费用能被清楚区分。

透明的定价不会让产品显得便宜，却能建立更长久的信任。`,
  },
  {
    title: '关掉大部分通知后，我重新拿回了注意力',
    slug: 'demo-notification-minimalism',
    topic: '数字生活',
    excerpt: '不是每一个应用都有资格随时打断你。',
    tags: ['通知', '专注', '数字生活'],
    coverStyle: 'notes' as const,
    body: `我曾经允许几乎所有应用发送通知，结果手机每隔几分钟就亮一次。大部分信息并不紧急，却不断切断正在进行的事情。

后来我只保留通信、日历、支付和少数设备提醒。新闻、社交网络和购物应用全部改为主动打开。

变化并不戏剧化，但一天结束时，大脑明显没有那么疲惫。注意力不是靠意志力守住的，也可以通过设置来保护。`,
  },
  {
    title: '数字文件也需要一次真正的断舍离',
    slug: 'demo-digital-file-cleanup',
    topic: '数字生活',
    excerpt: '下载目录、截图和重复备份，会悄悄消耗我们的查找时间。',
    tags: ['文件管理', '整理', '备份'],
    coverStyle: 'grid' as const,
    body: `硬盘容量越来越大以后，删除文件似乎不再必要。但杂乱真正占用的不是空间，而是每次寻找资料时的判断成本。

## 我的整理原则

- 明确仍在使用的项目
- 合并重复副本
- 把长期资料放入稳定目录
- 删除前先生成可复查清单

整理不应该变成另一项长期负担。最好的目录结构，是几个月后仍然能自然找到东西。`,
  },
  {
    title: '重读《设计中的设计》：克制也是一种表达',
    slug: 'demo-designing-design-reread',
    topic: '阅读思考',
    excerpt: '好的设计不急着展示技巧，而是让人更清楚地看到事物本身。',
    tags: ['阅读', '设计', '审美'],
    coverStyle: 'none' as const,
    body: `第一次读这本书时，我更关注其中的案例。几年后重读，留下印象最深的却是对“空”的讨论。

克制并不等于缺少设计。恰恰相反，它要求设计者更准确地判断：什么需要出现，什么应该退后，什么可以完全删掉。

这也改变了我做界面的方式。与其不断添加装饰，不如先让信息层级、文字节奏和交互反馈成立。`,
  },
  {
    title: '读完一本书后，怎样留下真正有用的笔记',
    slug: 'demo-useful-reading-notes',
    topic: '阅读思考',
    excerpt: '摘抄只是保存，重新组织和联系自己的问题才是理解。',
    tags: ['读书笔记', '学习', '知识'],
    coverStyle: 'notes' as const,
    body: `过去我的读书笔记里有大量划线，回头看时却很难记起为什么保存它们。

现在每读完一章，我只写三个部分：作者试图回答的问题、最重要的论证、它与我正在做的事情有什么关系。

如果一句话无法进入自己的表达，它大概率还没有被真正理解。笔记的数量少了，但再次使用它们的机会更多了。`,
  },
  {
    title: '在京都雨天散步的一小时',
    slug: 'demo-kyoto-rain-walk',
    topic: '旅行见闻',
    excerpt: '没有打卡计划的一段路，反而成了旅途中记得最清楚的部分。',
    tags: ['京都', '旅行', '散步'],
    coverStyle: 'notes' as const,
    body: `下午突然下起雨，我临时取消了原来的行程，从一条游客很少的小路慢慢走回住处。

屋檐下摆着刚收进来的花盆，便利店门口有人安静地抖伞，远处寺院的钟声被雨拉得很长。

旅行常常被安排得太满。真正留下来的，有时不是著名景点，而是一段没有目标、可以认真感受周围的时间。`,
  },
  {
    title: '第一次独自旅行，我学会了给计划留白',
    slug: 'demo-solo-travel-space',
    topic: '旅行见闻',
    excerpt: '计划提供安全感，留白则让旅途真正开始。',
    tags: ['独自旅行', '计划', '体验'],
    coverStyle: 'grid' as const,
    body: `第一次独自出发时，我把每天安排到了半小时。任何延误都会让我焦虑，仿佛少去一个地方就是浪费。

后来我每天只保留一个确定目的地，其余时间根据天气和体力决定。没有完成清单的满足感，却开始注意到街道、食物和当地人的生活节奏。

好的计划不是控制每一分钟，而是保证你有余地应对变化。`,
  },
  {
    title: '用快捷指令整理每天的零碎输入',
    slug: 'demo-shortcuts-capture-system',
    topic: '工具效率',
    excerpt: '把文字、链接和图片送到同一个入口，减少记录时的犹豫。',
    tags: ['快捷指令', '自动化', '收集'],
    coverStyle: 'cache' as const,
    body: `记录失败往往不是因为没有工具，而是入口太多。看到链接时要想放进哪个应用，截图后又要决定如何命名，几秒钟的犹豫足以让人放弃。

我做了一个很简单的快捷指令：接收分享内容，补一句备注，然后统一送入收集箱。

后续整理可以慢慢做，但捕捉动作必须足够轻。先确保信息不会丢，再决定它是否值得长期保存。`,
  },
  {
    title: '给个人网站做深色模式时踩过的坑',
    slug: 'demo-dark-mode-lessons',
    topic: '开发手记',
    excerpt: '深色模式不是把白色和黑色互换，还要重新处理层级与对比度。',
    tags: ['CSS', '深色模式', '可访问性'],
    coverStyle: 'grid' as const,
    body: `最初我只是替换了背景色和文字色，结果代码块、边框、次要文字都显得不协调。

## 后来补上的检查

- 正文和背景的对比度
- 链接、按钮与键盘焦点状态
- 图片在深色背景下的边界
- 系统主题切换后的状态同步

深色模式需要一套完整的颜色关系。单独调整某个组件，很容易在另一个页面产生新的问题。`,
  },
  {
    title: '开源项目的 README 应该先写给谁看',
    slug: 'demo-readme-first-reader',
    topic: '独立产品',
    excerpt: 'README 的第一位读者不是作者，而是第一次打开仓库的人。',
    tags: ['开源', 'README', '文档'],
    coverStyle: 'none' as const,
    body: `很多 README 一上来就介绍技术架构，却没有说明这个项目解决什么问题、适合谁、五分钟内怎样跑起来。

我现在会按这个顺序写：首页一句话说明、实际效果、快速开始、配置说明、已知限制，最后才是开发细节。

文档不是项目完成后的装饰。它决定了别人能否建立正确预期，也决定了未来的自己能不能快速回来继续维护。`,
  },
  {
    title: '我为什么开始认真维护自己的个人网站',
    slug: 'demo-why-personal-website',
    topic: '数字生活',
    excerpt: '社交平台适合传播，个人网站更适合沉淀完整而可控的表达。',
    tags: ['个人网站', '写作', '内容'],
    coverStyle: 'notes' as const,
    body: `在社交平台上发布内容很方便，但时间线会快速把旧内容推走，格式和链接也受平台规则影响。

个人网站给了我一个稳定地址，可以按照自己的方式组织主题、修订文章，并保留完整上下文。

它未必带来更多流量，却能让内容真正属于自己。对长期写作来说，这种确定性比短暂的曝光更重要。`,
  },
]

assert.equal(articles.length, 20)

const payload = await getPayloadClient()

try {
  const owners = await payload.find({
    collection: 'users',
    overrideAccess: true,
    depth: 0,
    limit: 1,
    where: { email: { equals: ownerEmail } },
  })
  const owner = owners.docs[0]
  assert(owner, `找不到测试数据所属账号：${ownerEmail}`)
  const ownerId = String(owner.id)

  const topicIds = new Map<string, string>()
  for (const name of topics) {
    const normalizedName = name.toLocaleLowerCase('zh-CN')
    const existing = await payload.find({
      collection: 'topics',
      overrideAccess: true,
      depth: 0,
      limit: 1,
      where: { and: [{ owner: { equals: ownerId } }, { normalizedName: { equals: normalizedName } }] },
    })
    const topic = existing.docs[0] ?? await payload.create({
      collection: 'topics',
      overrideAccess: true,
      data: { owner: ownerId, name, normalizedName, isSystem: false },
    })
    topicIds.set(name, String(topic.id))
  }

  let created = 0
  let reused = 0

  for (const [index, article] of articles.entries()) {
    const existing = await payload.find({
      collection: 'articles',
      overrideAccess: true,
      depth: 0,
      limit: 1,
      where: { and: [{ owner: { equals: ownerId } }, { slug: { equals: article.slug } }] },
    })

    let articleId: string
    let status: string
    if (existing.docs[0]) {
      articleId = String(existing.docs[0].id)
      status = String(existing.docs[0].status)
      reused += 1
    } else {
      const draft = await createDraft(ownerId, {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        bodyMarkdown: article.body,
        tags: article.tags,
        topic: topicIds.get(article.topic),
        coverStyle: article.coverStyle,
      })
      articleId = String(draft.id)
      status = 'draft'
      created += 1
    }

    if (status !== 'published') {
      const preview = await previewDraft(ownerId, articleId)
      await publishDraft(ownerId, articleId, preview.approvalId)
    }

    const publishedAt = new Date(Date.UTC(2026, 8, 13 - index * 8, 4, 0, 0)).toISOString()
    await payload.update({
      collection: 'articles',
      id: articleId,
      overrideAccess: true,
      data: { publishedAt },
    })
  }

  console.info(`测试文章已就绪：新建 ${created} 篇，复用 ${reused} 篇，共 ${articles.length} 篇；主题 ${topics.length} 个。`)
} finally {
  await payload.db.destroy?.()
}
