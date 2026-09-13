'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { PublicPost, SiteProfile } from '../../../lib/blog-data'
import { readingMinutes } from '../../../lib/blog-shared'
import { Icon } from './ui-icon'
import { Plate } from './plate'
import { Reveal } from './reveal'
import { useArticleStats } from '../../../lib/use-article-stats'
import { PopularArticles } from './popular-articles'
import { BackToTop } from './back-to-top'
import styles from '../home.module.css'

function Meta({ post, showTopic = true }: { post: PublicPost; showTopic?: boolean }) {
  return (
    <div className={styles.meta}>
      {showTopic && <span>{post.topic.name}</span>}
      <time dateTime={post.publishedAt}>
        {new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(
          new Date(post.publishedAt),
        )}
      </time>
      <span>{readingMinutes(post.plainText)} 分钟阅读</span>
    </div>
  )
}

export function HomeClient({ posts, site }: { posts: PublicPost[]; site: SiteProfile }) {
  const analytics = useArticleStats(posts)
  const topics = [...new Map(posts.map((post) => [post.topic.id, post.topic])).values()]
  const featured = posts[0]
  const [topic, setTopic] = useState('all')
  const [visible, setVisible] = useState(8)
  const [loadingMore, setLoadingMore] = useState(false)
  const [topicScroll, setTopicScroll] = useState({ left: false, right: false })
  const topicRail = useRef<HTMLDivElement>(null)
  const loadMoreTrigger = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)
  const listHeading = useRef<HTMLHeadingElement>(null)
  const rows = posts.filter((post) =>
    topic === 'all' ? post.id !== featured?.id : post.topic.id === topic,
  )
  const shown = rows.slice(0, visible)

  useEffect(() => {
    const rail = topicRail.current
    if (!rail) return
    const update = () => {
      const max = Math.max(0, rail.scrollWidth - rail.clientWidth)
      setTopicScroll({ left: rail.scrollLeft > 2, right: rail.scrollLeft < max - 2 })
    }
    update()
    rail.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(rail)
    Array.from(rail.children).forEach((item) => observer.observe(item))
    return () => {
      rail.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [topics.length])

  useEffect(() => {
    const trigger = loadMoreTrigger.current
    if (!trigger || visible >= rows.length) return
    let timer: number | undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || loadingMoreRef.current) return
        observer.disconnect()
        loadingMoreRef.current = true
        setLoadingMore(true)
        timer = window.setTimeout(() => {
          loadingMoreRef.current = false
          setLoadingMore(false)
          setVisible((count) => Math.min(count + 8, rows.length))
        }, 500)
      },
      { threshold: 0.15 },
    )
    observer.observe(trigger)
    return () => {
      observer.disconnect()
      if (timer) window.clearTimeout(timer)
      loadingMoreRef.current = false
    }
  }, [rows.length, topic, visible])

  const scrollTopics = (direction: -1 | 1) => {
    const rail = topicRail.current
    if (!rail) return
    rail.scrollBy({
      left: direction * Math.max(180, rail.clientWidth * 0.72),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }

  const chooseTopic = (value: string) => {
    loadingMoreRef.current = false
    setLoadingMore(false)
    setTopic(value)
    setVisible(8)
  }

  return (
    <div className={styles.home}>
      <BackToTop />
      <section className={styles.intro} aria-label="手记介绍">
        <p className={styles.tagline}>{site.tagline}</p>
        <Link className={styles.introCount} href="/blog/archive">
          已发布 {posts.length} 篇文章 <Icon name="arrow" />
        </Link>
      </section>

      {featured ? (
        <Reveal delay={70}>
          <section
            className={`${styles.feature} ${featured.coverStyle === 'none' && !featured.coverImage ? styles.textFeature : ''}`}
            aria-labelledby="latest-title"
          >
            <div className={styles.featureCopy}>
              <p className={styles.kicker}>
                最新手记 <span className={styles.kickerLine} />{' '}
                <span className={styles.index}>01 / LATEST</span>
              </p>
              <Link href={`/blog/${featured.slug}`} className={styles.featureTitle}>
                <h1 id="latest-title">{featured.title}</h1>
              </Link>
              {featured.excerpt && <p className={styles.excerpt}>{featured.excerpt}</p>}
              <div className={styles.featureBottom}>
                <Meta post={featured} />
                <Link className={styles.readLink} href={`/blog/${featured.slug}`}>
                  阅读手记{' '}
                  <span>
                    <Icon name="arrow" />
                  </span>
                </Link>
              </div>
            </div>
            {(featured.coverStyle !== 'none' || featured.coverImage) && (
              <Link
                className={styles.featureArt}
                href={`/blog/${featured.slug}`}
                aria-label={`打开精选文章：${featured.title}`}
              >
                <Plate type={featured.coverStyle} image={featured.coverImage} />
              </Link>
            )}
          </section>
        </Reveal>
      ) : (
        <Reveal>
          <section className={styles.emptyHero}>
            <p className={styles.kicker}>最新手记</p>
            <h1>第一篇文字，正在路上。</h1>
            <p>写下来，慢慢来。</p>
          </section>
        </Reveal>
      )}

      <nav className={styles.readingShortcuts} aria-label="快速找文章">
        <a href="#home-popular">
          热门排行 <Icon name="arrow" />
        </a>
        <a href="#home-topics">
          沿着主题读 <Icon name="arrow" />
        </a>
      </nav>
      <div className={styles.homeGrid}>
        <section aria-labelledby="recent-title">
          <Reveal>
            <div className={styles.sectionHeading}>
              <div>
                <h2 id="recent-title" ref={listHeading} tabIndex={-1}>
                  最近的文字<span>{String(rows.length).padStart(2, '0')}</span>
                </h2>
              </div>
              <Link href="/blog/archive">
                查看归档 <Icon name="arrow" />
              </Link>
            </div>
            <div className={styles.topicScroller}>
              <button
                className={styles.topicArrow}
                type="button"
                aria-label="向左查看更多分类"
                disabled={!topicScroll.left}
                onClick={() => scrollTopics(-1)}
              >
                <Icon name="back" />
              </button>
              <div ref={topicRail} className={styles.topicTabs} role="group" aria-label="筛选文章主题">
                <button
                  aria-controls="home-results"
                  aria-pressed={topic === 'all'}
                  onClick={(event) => {
                    chooseTopic('all')
                    event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'center' })
                  }}
                >
                  全部
                </button>
                {topics.map((item) => (
                  <button
                    aria-controls="home-results"
                    aria-pressed={topic === item.id}
                    onClick={(event) => {
                      chooseTopic(item.id)
                      event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'center' })
                    }}
                    key={item.id}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
              <button
                className={styles.topicArrow}
                type="button"
                aria-label="向右查看更多分类"
                disabled={!topicScroll.right}
                onClick={() => scrollTopics(1)}
              >
                <Icon name="arrow" />
              </button>
            </div>
          </Reveal>
          <div
            id="home-results"
            role="region"
            aria-label="文章列表"
            className={styles.homeResults}
            key={topic}
          >
            {shown.map((post, index) => (
              <article
                className={`${styles.postRow} ${post.coverStyle !== 'none' || post.coverImage ? styles.withThumbnail : ''}`}
                key={post.id}
                style={{ '--row-delay': `${Math.min(index, 3) * 55}ms` } as CSSProperties}
              >
                <span className={styles.rowNumber} aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <Meta post={post} showTopic={false} />
                  <Link className={styles.postTitle} href={`/blog/${post.slug}`}>
                    <h3>{post.title}</h3>
                    <Icon name="arrow" />
                  </Link>
                  {post.excerpt && <p>{post.excerpt}</p>}
                  <div className={styles.postEngagement}>
                    <span className={styles.postTopic}>{post.topic.name}</span>
                    <span
                      aria-label={
                        analytics.status === 'ready'
                          ? `阅读 ${analytics.stats[`/blog/${post.slug}`]?.views ?? 0} 次`
                          : '阅读统计暂不可用'
                      }
                    >
                      <Icon name="eye" />
                      {analytics.status === 'ready'
                        ? (analytics.stats[`/blog/${post.slug}`]?.views ?? 0).toLocaleString(
                            'zh-CN',
                          )
                        : '—'}
                    </span>
                    <span
                      aria-label={
                        analytics.status === 'ready'
                          ? `点赞 ${analytics.stats[`/blog/${post.slug}`]?.likes ?? 0} 次`
                          : '点赞统计暂不可用'
                      }
                    >
                      <Icon name="heart" />
                      {analytics.status === 'ready'
                        ? (analytics.stats[`/blog/${post.slug}`]?.likes ?? 0).toLocaleString(
                            'zh-CN',
                          )
                        : '—'}
                    </span>
                  </div>
                </div>
                {(post.coverStyle !== 'none' || post.coverImage) && (
                  <Link
                    className={styles.thumbnail}
                    href={`/blog/${post.slug}`}
                    aria-label={`阅读：${post.title}`}
                  >
                    <Plate type={post.coverStyle} image={post.coverImage} compact />
                  </Link>
                )}
              </article>
            ))}
            {rows.length === 0 && (
              <div className={styles.empty}>
                <p>
                  {posts.length < 2 && topic === 'all'
                    ? '更多文字，陆续写下。'
                    : '这个主题，还在慢慢积累。'}
                </p>
                {topic !== 'all' && (
                  <button onClick={() => chooseTopic('all')}>看看全部文章</button>
                )}
              </div>
            )}
          </div>
          <div ref={loadMoreTrigger} className={styles.listBottom}>
            <span
              className={`${styles.autoLoadStatus} ${loadingMore ? styles.loading : ''}`}
              role="status"
              aria-live="polite"
            >
              {loadingMore
                ? '正在加载下一页…'
                : rows.length
                ? visible < rows.length
                  ? `已显示 ${shown.length} / ${rows.length} 篇，向下滚动继续阅读`
                  : `已显示全部 ${rows.length} 篇文章`
                : '暂无更多文章'}
            </span>
          </div>
        </section>

        <aside className={styles.homeAside}>
          <Reveal delay={120}>
            <PopularArticles posts={posts} analytics={analytics} />
            <section
              className={styles.sideTopics}
              id="home-topics"
              aria-labelledby="topics-heading"
            >
              <h2 id="topics-heading" tabIndex={-1}>
                沿着主题读
              </h2>
              {topics.length === 0 && (
                <p className={styles.sidebarEmpty}>文章发布后，主题会出现在这里。</p>
              )}
              {topics.map((item) => (
                <button
                  key={item.id}
                  aria-controls="home-results"
                  aria-pressed={topic === item.id}
                  onClick={() => {
                    chooseTopic(item.id)
                    listHeading.current?.focus({ preventScroll: true })
                    listHeading.current?.scrollIntoView({
                      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                        ? 'instant'
                        : 'smooth',
                      block: 'center',
                    })
                  }}
                >
                  <span>{item.name}</span>
                  <span>
                    {String(posts.filter((post) => post.topic.id === item.id).length).padStart(
                      2,
                      '0',
                    )}{' '}
                    <Icon name="arrow" />
                  </span>
                </button>
              ))}
              <a className={styles.allArticles} href="#recent-title">
                返回文章列表 <Icon name="arrow" />
              </a>
            </section>
          </Reveal>
        </aside>
      </div>
    </div>
  )
}
