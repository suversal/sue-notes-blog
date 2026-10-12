'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type CSSProperties, type TouchEvent } from 'react'
import type { PublicPostSummary, SiteProfile } from '../../../../lib/blog-data'
import { GrowArrow, Icon } from './ui-icon'
import { Plate } from './plate'
import { Reveal } from './reveal'
import { useArticleStats } from '../../../../lib/use-article-stats'
import { PopularArticles } from './popular-articles'
import { BackToTop } from './back-to-top'
import styles from '../home.module.css'

function Meta({ post }: { post: PublicPostSummary }) {
  return (
    <div className={styles.meta}>
      <time dateTime={post.publishedAt}>
        {new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(
          new Date(post.publishedAt),
        )}
      </time>
      <span>{post.readingMinutes} 分钟阅读</span>
    </div>
  )
}

const hasCover = (post: PublicPostSummary) => post.coverStyle !== 'none' || Boolean(post.coverImage)

function FeaturedCarousel({ posts }: { posts: PublicPostSummary[] }) {
  const [index, setIndex] = useState(0)
  // 切换方向决定文字从哪一侧滑入：往后翻从右边来，往前翻从左边来。
  const [direction, setDirection] = useState<1 | -1>(1)
  // 记住上一张，让它和新的一张同时横向移动：一张推出去，一张推进来。
  const [leaving, setLeaving] = useState<string | null>(null)
  const paused = useRef(false)
  const touchStart = useRef<number | null>(null)
  const count = posts.length
  const current = posts[index % count]
  const pinned = current.pinPriority > 0
  const go = (next: number) => {
    if ((next + count) % count === index) return
    setDirection(next < index ? -1 : 1)
    setLeaving(posts[index].id)
    setIndex((next + count) % count)
  }

  useEffect(() => {
    if (count < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => {
      if (paused.current || document.hidden) return
      setDirection(1)
      setIndex((value) => {
        setLeaving(posts[value].id)
        return (value + 1) % count
      })
    }, 6000)
    return () => window.clearInterval(timer)
  }, [count, posts])

  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (start === null || count < 2) return
    const distance = event.changedTouches[0].clientX - start
    if (Math.abs(distance) > 48) go(index + (distance < 0 ? 1 : -1))
  }

  return (
    <section
      className={`${styles.feature} ${hasCover(current) ? '' : styles.textFeature} ${count > 1 ? styles.carousel : ''}`}
      aria-labelledby="latest-title"
      aria-roledescription={count > 1 ? '轮播' : undefined}
      style={{ '--slide-from': `${direction * 22}px`, '--push-from': `${direction * 100}%` } as CSSProperties}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocusCapture={() => (paused.current = true)}
      onBlurCapture={() => (paused.current = false)}
      onTouchStart={(event) => (touchStart.current = event.touches[0].clientX)}
      onTouchEnd={onTouchEnd}
    >
      <div className={styles.featureCopy} key={current.id}>
        <p className={styles.kicker}>
          {pinned ? '置顶' : '最新手记'} · {current.topic.name}
        </p>
        <Link href={`/blog/${current.slug}`} className={styles.featureTitle} title={current.title}>
          <h1 id="latest-title">{current.title}</h1>
        </Link>
        {current.excerpt && <p className={styles.excerpt}>{current.excerpt}</p>}
        <div className={styles.featureBottom}>
          <Meta post={current} />
          <Link className={styles.readLink} href={`/blog/${current.slug}`}>
            阅读手记{' '}
            <span>
              <GrowArrow />
            </span>
          </Link>
        </div>
      </div>
      {hasCover(current) && (
        <div className={styles.featureArt}>
          {/* 所有封面叠在同一位置，切换时新的一张从翻页方向推进来，旧的一张同步被推出去。 */}
          {posts.filter(hasCover).map((post) => {
            const active = post.id === current.id
            return (
              <Link
                className={`${styles.artSlide} ${active ? styles.artActive : ''} ${active && leaving ? styles.artEntering : ''} ${!active && post.id === leaving ? styles.artLeaving : ''}`}
                href={`/blog/${post.slug}`}
                aria-label={`打开精选文章：${post.title}`}
                aria-hidden={!active}
                tabIndex={active ? undefined : -1}
                key={post.id}
              >
                <Plate type={post.coverStyle} image={post.coverImage} />
              </Link>
            )
          })}
        </div>
      )}
      {count > 1 && (
        <>
          <button
            className={`${styles.carouselArrow} ${styles.carouselPrev}`}
            type="button"
            aria-label="上一篇置顶"
            onClick={() => go(index - 1)}
          >
            <Icon name="back" />
          </button>
          <button
            className={`${styles.carouselArrow} ${styles.carouselNext}`}
            type="button"
            aria-label="下一篇置顶"
            onClick={() => go(index + 1)}
          >
            <Icon name="arrow" />
          </button>
          <div className={styles.carouselDots} role="group" aria-label="选择置顶文章">
            {posts.map((post, dot) => (
              <button
                type="button"
                aria-label={`第 ${dot + 1} 篇：${post.title}`}
                aria-current={dot === index ? 'true' : undefined}
                onClick={() => go(dot)}
                key={post.id}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

export function HomeClient({ posts, site }: { posts: PublicPostSummary[]; site: SiteProfile }) {
  const analytics = useArticleStats(posts)
  const topics = [...new Map(posts.map((post) => [post.topic.id, post.topic])).values()]
  const pinnedPosts = posts.filter((post) => post.pinPriority > 0).slice(0, 5)
  const featuredPosts = pinnedPosts.length ? pinnedPosts : posts.slice(0, 1)
  const [topic, setTopic] = useState('all')
  const [visible, setVisible] = useState(8)
  const [loadingMore, setLoadingMore] = useState(false)
  const [topicScroll, setTopicScroll] = useState({ left: false, right: false })
  const topicRail = useRef<HTMLDivElement>(null)
  const loadMoreTrigger = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)
  const listHeading = useRef<HTMLHeadingElement>(null)
  const aside = useRef<HTMLElement>(null)
  const siteInfo = useRef<HTMLElement>(null)
  const [siteInfoFits, setSiteInfoFits] = useState(false)
  // 站点信息只在侧栏剩余高度放得下时才显示，放不下就不显示，避免侧栏自己出现滚动条。
  useEffect(() => {
    const rail = aside.current
    const info = siteInfo.current
    const content = rail?.firstElementChild as HTMLElement | null
    if (!rail || !info || !content) return
    const check = () => {
      const style = getComputedStyle(rail)
      const available = parseFloat(style.maxHeight) - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      const needed = content.offsetHeight - info.offsetHeight + info.scrollHeight
      setSiteInfoFits(Number.isFinite(available) && needed <= available)
    }
    check()
    const observer = new ResizeObserver(check)
    observer.observe(content)
    window.addEventListener('resize', check)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', check)
    }
  }, [])
  // 置顶只是额外的展示位：列表始终按发布时间列出全部文章。
  const rows = posts
    .filter((post) => topic === 'all' || post.topic.id === topic)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
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
          已发布 {posts.length} 篇文章 <GrowArrow />
        </Link>
      </section>

      {featuredPosts.length ? (
        <Reveal delay={70}>
          <FeaturedCarousel posts={featuredPosts} />
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
        <section className={styles.articlePanel} aria-labelledby="recent-title">
          <div className={styles.articleHeader}>
            <Reveal>
              <div className={styles.sectionHeading}>
                <div>
                  <h2 id="recent-title" ref={listHeading} tabIndex={-1}>
                    最近的文字
                  </h2>
                </div>
                <Link href="/blog/archive">
                  查看归档 <GrowArrow />
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
                <div
                  ref={topicRail}
                  className={styles.topicTabs}
                  role="group"
                  aria-label="筛选文章主题"
                >
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
          </div>
          <div
            id="home-results"
            role="region"
            aria-label="文章列表"
            className={styles.postGrid}
            key={topic}
          >
            {shown.map((post, index) => {
              const views = analytics.stats[`/blog/${post.slug}`]?.views ?? 0
              return (
                <article
                  className={styles.postCard}
                  key={post.id}
                  style={{ '--row-delay': `${Math.min(index, 3) * 55}ms` } as CSSProperties}
                >
                  {hasCover(post) && (
                    <Link
                      className={styles.cardCover}
                      href={`/blog/${post.slug}`}
                      aria-hidden="true"
                      tabIndex={-1}
                    >
                      <Plate type={post.coverStyle} image={post.coverImage} compact />
                    </Link>
                  )}
                  <Link className={styles.postTitle} href={`/blog/${post.slug}`}>
                    <h3>{post.title}</h3>
                  </Link>
                  {!hasCover(post) && post.excerpt && <p>{post.excerpt}</p>}
                  <div className={styles.cardMeta}>
                    <span className={styles.postTopic}>{post.topic.name}</span>
                    <span>{post.readingMinutes} 分钟阅读</span>
                    {analytics.status === 'ready' && (
                      <span>{views.toLocaleString('zh-CN')} 阅读</span>
                    )}
                  </div>
                </article>
              )
            })}
            {rows.length === 0 && (
              <div className={styles.empty}>
                <p>
                  {topic === 'all' ? '更多文字，陆续写下。' : '这个主题，还在慢慢积累。'}
                </p>
                {topic !== 'all' && (
                  <button onClick={() => chooseTopic('all')}>看看全部文章</button>
                )}
              </div>
            )}
          </div>
          {visible < rows.length && (
            <div ref={loadMoreTrigger} className={styles.listBottom}>
              <span
                className={`${styles.autoLoadStatus} ${loadingMore ? styles.loading : ''}`}
                role="status"
                aria-live="polite"
              >
                {loadingMore
                  ? '正在加载下一页…'
                  : `已显示 ${shown.length} / ${rows.length} 篇，向下滚动继续阅读`}
              </span>
            </div>
          )}
        </section>

        <aside className={styles.homeAside} ref={aside}>
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
                    <GrowArrow />
                  </span>
                </button>
              ))}
            </section>
            {posts.length > 0 && (
              <section className={styles.siteInfo} ref={siteInfo} data-fits={siteInfoFits || undefined} aria-label="站点信息">
                <dl>
                  <div>
                    <dt>文章</dt>
                    <dd>{posts.length} 篇</dd>
                  </div>
                  <div>
                    <dt>累计阅读</dt>
                    <dd>
                      {analytics.status === 'ready'
                        ? posts.reduce((sum, post) => sum + (analytics.stats[`/blog/${post.slug}`]?.views ?? 0), 0).toLocaleString('zh-CN')
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>最近更新</dt>
                    <dd>
                      {new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeZone: 'Asia/Shanghai' }).format(
                        new Date(posts.reduce((latest, post) => (post.publishedAt > latest ? post.publishedAt : latest), '')),
                      )}
                    </dd>
                  </div>
                </dl>
              </section>
            )}
          </Reveal>
        </aside>
      </div>
    </div>
  )
}
