import type { Metadata } from 'next'
import Link from 'next/link'
import { getSiteProfile } from '../../../lib/blog-data'
import styles from '../blog-v1.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: '关于 · 苏码手记',
  description: '关于作者与这个独立博客。',
  alternates: { canonical: '/blog/about' },
  robots: { index: true, follow: true },
}

export default async function AboutPage() {
  const site = await getSiteProfile()

  return (
    <main id="main-content" tabIndex={-1}>
      <article className={styles.about}>
        <header className={styles.aboutHero}>
          <div className={styles.aboutKicker}>
            <p className={styles.eyebrow}>A NOTE ABOUT ME</p>
            <span>INDEPENDENT MAKER · WRITER</span>
          </div>
          <h1>
            你好，<br />我是 <em>{site.authorName}</em>。
          </h1>
          <p className={styles.aboutLead}>折腾一些小工具，也认真记录生活里的小发现。</p>
        </header>
        <div className={styles.aboutContent}>
          <section className={styles.aboutSection}>
            <span className={styles.aboutSectionNumber}>01</span>
            <h2>在这里写字的人</h2>
            <div className={styles.aboutSectionBody}>
              <p>{site.authorBio}</p>
              <p>
                这个博客放的是比较完整的文字：做一个产品时踩过的坑，某个终于弄懂的概念，以及一些还在变化中的想法。
              </p>
            </div>
          </section>
          <section className={styles.aboutSection}>
            <span className={styles.aboutSectionNumber}>02</span>
            <h2>这里会写些什么</h2>
            <div className={styles.aboutSectionBody}>
              <p>数字工具、独立开发、工程实践，偶尔也聊聊阅读和日常。</p>
              <p>我更愿意写亲手试过的东西，交代清楚过程，也留下一点当时的判断。</p>
            </div>
          </section>
          <section className={styles.aboutSection}>
            <span className={styles.aboutSectionNumber}>03</span>
            <h2>为什么写博客</h2>
            <div className={styles.aboutSectionBody}>
              <p>因为我想有一个自己的地方。文字可以长一点，可以修改，可以隔很久再回来读。</p>
              <p>
                更新没有固定频率，有值得写的东西就写。如果你也是这样，欢迎从
                <Link href="/blog/archive">一篇旧文章</Link>开始。
              </p>
              <strong>{site.authorName}.</strong>
            </div>
          </section>
        </div>
      </article>
    </main>
  )
}
