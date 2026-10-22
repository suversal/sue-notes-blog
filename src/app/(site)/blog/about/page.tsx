import { publicPageMetadata } from '../../../../lib/blog-seo'
import Link from 'next/link'
import { getSiteProfile } from '../../../../lib/blog-data'
import { hasPublicUses } from '../../../../lib/uses-service'
import { GrowArrow, Icon } from '../components/ui-icon'
import styles from './about.module.css'
import avatar from './avatar.png'

export const dynamic = 'force-dynamic'
export const metadata = publicPageMetadata({
  title: '关于 · 苏码玩家',
  description: '关于作者与这个站点。',
  path: '/blog/about',
})

// 名片上的四行简介与 X 个人资料保持一致。
const bioLines = [
  {
    text: '程序员｜探索 AI 与 Vibe Coding',
    icon: (
      <>
        <rect x="4" y="5" width="16" height="11" rx="2" />
        <path d="M2 20h20M10 9l-2 1.500 2 1.500M14 9l2 1.500-2 1.500" />
      </>
    ),
  },
  {
    text: '关注技术、产品与数字生活',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.500 8.500-2 5-5 2 2-5z" />
      </>
    ),
  },
  {
    text: '折腾 VPS、NAS、Apple 生态、家庭网络与出海基建',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.500 2.600 3.800 5.600 3.800 9s-1.300 6.400-3.800 9c-2.500-2.600-3.800-5.600-3.800-9s1.300-6.400 3.800-9z" />
      </>
    ),
  },
  {
    text: '长期实践，持续分享好用的工具和经验，有问题欢迎私聊',
    icon: <path d="M4 5h5v15H4zM9 5h5v15H9zM15.200 6.300l4.300-1.200 3 13.500-4.300 1.200z" />,
  },
]

export default async function AboutPage() {
  const [site, showUses] = await Promise.all([getSiteProfile(), hasPublicUses()])
  const doing = [
    { mark: '写', text: '把亲手试过的工具和经验写清楚，过程和坑都留着。', label: '文章', href: '/blog' },
    { mark: '做', text: '用 AI 做一些小工具，能开源的都开源。', label: '探索', href: '/blog/explore' },
    ...(showUses
      ? [{ mark: '用', text: '长期在用的服务和工具，整理成一份清单。', label: '在用', href: '/blog/uses' }]
      : []),
  ]

  return (
    <main id="main-content" tabIndex={-1}>
      <article className={styles.about}>
        <div className={styles.top}>
          <aside className={styles.card} aria-label="个人名片">
            <div className={styles.identity}>
              <img src={avatar.src} alt={`${site.siteName}的头像`} width="92" height="92" />
              <div>
                <strong>{site.siteName}</strong>
                <span>@suversal</span>
              </div>
            </div>
            <ul className={styles.bio}>
              {bioLines.map((line) => (
                <li key={line.text}>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {line.icon}
                  </svg>
                  <span>{line.text}</span>
                </li>
              ))}
            </ul>
            <div className={styles.links}>
              <a
                className={styles.primaryLink}
                href="https://x.com/suversal"
                target="_blank"
                rel="me noopener noreferrer"
              >
                <Icon name="x" />在 X 上关注
              </a>
            </div>
          </aside>

          <div className={styles.body}>
            <h1>
              你好，
              <br />
              我是<em>{site.siteName}</em>。
            </h1>
            <div className={styles.lead}>
              <p>{site.authorBio}</p>
              <p>
                这里是我的长期存档：好用的工具，走通的流程，踩过的坑。内容一般先发在
                X，再整理到这里，方便搜索，也方便回头查。
              </p>
            </div>
            <div className={styles.doing}>
              {doing.map((item) => (
                <Link href={item.href} key={item.mark}>
                  <strong>{item.mark}</strong>
                  <span>{item.text}</span>
                  <small>
                    {item.label} <GrowArrow />
                  </small>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <section className={styles.why}>
          <h2>为什么还要有个网站</h2>
          <div>
            <p>因为我想有一个自己的地方。文字可以长一点，可以修改，可以隔很久再回来读。</p>
            <strong>{site.authorName}.</strong>
          </div>
        </section>
      </article>
    </main>
  )
}
