import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicPosts, getSiteProfile } from '../../../lib/blog-data'
import { Icon } from '../components/ui-icon'
import styles from '../blog-v1.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: '关于 · 苏码手记',
  description: '关于作者与这个独立博客。',
  alternates: { canonical: '/blog/about' },
  robots: { index: true, follow: true },
}

export default async function AboutPage() {
  const [site, posts] = await Promise.all([getSiteProfile(), getPublicPosts()])
  const topics = [
    ...new Map(
      posts
        .filter((post) => post.topic.name !== '未分类')
        .map((post) => [post.topic.id, post.topic]),
    ).values(),
  ]
  return (
    <main id="main-content" tabIndex={-1}>
      <article className={styles.about}>
        <header>
          <p className={styles.eyebrow}>A NOTE ABOUT ME</p>
          <h1>你好，我是 {site.authorName}。</h1>
          <span>折腾一些小工具，也认真记录生活里的小发现。</span>
        </header>
        <div className={styles.aboutGrid}>
          <div>
            <section>
              <h2>在这里写字的人</h2>
              <div>
                <p>{site.authorBio}</p>
                <p>
                  这个博客放的是比较完整的文字：做一个产品时踩过的坑，某个终于弄懂的概念，以及一些还在变化中的想法。
                </p>
              </div>
            </section>
            <section>
              <h2>这里会写些什么</h2>
              <div>
                <p>数字工具、独立开发、工程实践，偶尔也聊聊阅读和日常。</p>
                <p>我更愿意写亲手试过的东西，交代清楚过程，也留下一点当时的判断。</p>
              </div>
            </section>
            <section>
              <h2>为什么写博客</h2>
              <div>
                <p>因为我想有一个自己的地方。文字可以长一点，可以修改，可以隔很久再回来读。</p>
                <p>
                  更新没有固定频率，有值得写的东西就写。如果你也是这样，欢迎从
                  <Link href="/blog/archive">一篇旧文章</Link>开始。
                </p>
                <strong>{site.authorName}.</strong>
              </div>
            </section>
          </div>
          <aside>
            <section>
              <h2>从这里开始</h2>
              <Link href="/blog">
                <span>
                  <b>最近的文字</b>
                  <small>最近写下的实践与想法</small>
                </span>
                <Icon name="arrow" />
              </Link>
              <Link href="/blog/archive">
                <span>
                  <b>按时间翻一翻</b>
                  <small>在归档里找回一篇旧文</small>
                </span>
                <Icon name="arrow" />
              </Link>
            </section>
            {topics.length > 0 && (
              <section>
                <h2>沿着主题读</h2>
                {topics.map((topic) => (
                  <Link key={topic.id} href={`/blog/archive?topic=${encodeURIComponent(topic.id)}`}>
                    <span>{topic.name}</span>
                    <Icon name="arrow" />
                  </Link>
                ))}
              </section>
            )}
          </aside>
        </div>
      </article>
    </main>
  )
}
