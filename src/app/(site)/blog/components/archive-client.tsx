'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { PublicPostSummary } from '../../../../lib/blog-data'
import { useArticleStats } from '../../../../lib/use-article-stats'
import { ArchiveSelect } from './archive-select'
import { Icon } from './ui-icon'
import styles from '../blog-v1.module.css'
import listing from '../listing.module.css'

export function ArchiveClient({
  posts,
  initialTopic = 'all',
}: {
  posts: PublicPostSummary[]
  initialTopic?: string
}) {
  const overlayRoot = useRef<HTMLDivElement>(null)
  const { stats, status } = useArticleStats(posts)
  const topics = [...new Map(posts.map((post) => [post.topic.id, post.topic])).values()]
    .map((item) => ({ ...item, count: posts.filter((post) => post.topic.id === item.id).length }))
    .sort((a, b) => b.count - a.count)
  const years = [...new Set(posts.map((post) => post.publishedAt.slice(0, 4)))].sort().reverse()
  const [topic, setTopic] = useState(initialTopic)
  const [year, setYear] = useState('all')
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState<'newest' | 'views'>('newest')
  // 只在刚打开页面时让前几行依次浮现；动画播完就撤掉，之后筛选出来的新行不再重播。
  const [intro, setIntro] = useState(true)
  const results = useRef<HTMLDivElement>(null)
  const filterKey = useRef('')
  const byViews = order === 'views' && status === 'ready'
  const keyword = query.trim().toLocaleLowerCase('zh-CN')
  const rows = posts
    .filter(
      (post) =>
        (topic === 'all' || post.topic.id === topic) &&
        (year === 'all' || post.publishedAt.startsWith(year)) &&
        (!keyword || `${post.title} ${post.excerpt}`.toLocaleLowerCase('zh-CN').includes(keyword)),
    )
    .sort((a, b) => {
      if (byViews) {
        const difference =
          (stats[`/blog/${b.slug}`]?.views ?? 0) - (stats[`/blog/${a.slug}`]?.views ?? 0)
        if (difference) return difference
      }
      return b.publishedAt.localeCompare(a.publishedAt)
    })
  // 按时间排序时按年份分组；按阅读量排序时年份不再连续，退回单一列表。
  const groups = byViews
    ? [{ year: '', rows }]
    : [...new Set(rows.map((post) => post.publishedAt.slice(0, 4)))].map((item) => ({
        year: item,
        rows: rows.filter((post) => post.publishedAt.startsWith(item)),
      }))
  const filtered = topic !== 'all' || year !== 'all' || Boolean(query) || order !== 'newest'
  useEffect(() => {
    const timer = window.setTimeout(() => setIntro(false), 1400)
    return () => window.clearTimeout(timer)
  }, [])
  // 换主题、年份或排序时，结果整体淡入一下；搜索框打字不加，免得每敲一个字闪一次。
  useEffect(() => {
    const key = `${topic}|${year}|${order}`
    const changed = filterKey.current && filterKey.current !== key
    filterKey.current = key
    if (!changed || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    results.current?.animate(
      [
        { opacity: 0.45, transform: 'translateY(5px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 240, easing: 'ease' },
    )
  }, [topic, year, order])
  // 每行在整张列表里的序号，用来错开进场；年份标题跟着它那组的第一行一起出来。
  let rowIndex = 0
  const reset = () => {
    setTopic('all')
    setYear('all')
    setQuery('')
    setOrder('newest')
  }
  return (
    <>
      <section className={listing.head}>
        <div className={listing.headText}>
          <h1>按时间，翻一翻。</h1>
          <span>{posts.length} 篇，按时间排好。想找某篇文章，直接搜，或者只看一个主题。</span>
        </div>
        <label className={`${styles.archiveSearch} ${listing.search}`}>
          <Icon name="search" />
          <span className={styles.srOnly}>搜索标题或摘要</span>
          <input
            type="search"
            placeholder="搜索标题或摘要"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button aria-label="清除关键词" onClick={() => setQuery('')}>
              <Icon name="close" />
            </button>
          )}
        </label>
      </section>
      <section className={listing.toolbar} aria-label="筛选归档文章">
        <div className={listing.chips} role="group" aria-label="归档主题">
          <button
            className={listing.chip}
            type="button"
            aria-pressed={topic === 'all'}
            onClick={() => setTopic('all')}
          >
            全部 <span>{posts.length}</span>
          </button>
          {topics.map((item) => (
            <button
              className={listing.chip}
              type="button"
              aria-pressed={topic === item.id}
              onClick={() => setTopic(item.id)}
              key={item.id}
            >
              {item.name} <span>{item.count}</span>
            </button>
          ))}
        </div>
        <div className={listing.controls}>
          <div className={listing.yearSelect}>
            <ArchiveSelect
              label="选择年份"
              value={year}
              onChange={setYear}
              portalContainer={overlayRoot}
              active={year !== 'all'}
              options={[
                { value: 'all', label: '全部年份' },
                ...years.map((item) => ({ value: item, label: `${item} 年` })),
              ]}
            />
          </div>
          <div className={listing.segment} role="group" aria-label="排序方式">
            <button type="button" aria-pressed={order === 'newest'} onClick={() => setOrder('newest')}>
              最新
            </button>
            <button
              type="button"
              aria-pressed={order === 'views'}
              disabled={status !== 'ready'}
              onClick={() => setOrder('views')}
            >
              最多阅读
            </button>
          </div>
        </div>
      </section>
      {status === 'error' && (
        <p className={styles.archiveStatsStatus} role="status">
          阅读统计暂不可用，暂时无法按阅读量排序。
        </p>
      )}
      <div ref={results} className={`${styles.archiveResults} ${intro ? styles.archiveIntro : ''}`}>
        {groups.map((group) => (
          <section
            className={`${styles.archiveGroup} ${group.year ? '' : styles.archiveGroupFlat}`}
            aria-label={group.year ? `${group.year} 年` : '全部文章'}
            key={group.year || 'all'}
          >
            {group.year && (
              <header className={styles.archiveYearHead} style={{ '--i': rowIndex } as CSSProperties}>
                <strong>{group.year}</strong>
                <span>{group.rows.length} 篇</span>
              </header>
            )}
            <div className={styles.archiveYear}>
              {group.rows.map((post) => (
                <article key={post.id} style={{ '--i': rowIndex++ } as CSSProperties}>
                  <time dateTime={post.publishedAt}>
                    {post.publishedAt.slice(group.year ? 5 : 0, 10).replaceAll('-', '/')}
                  </time>
                  <h3>
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h3>
                  <span>{post.topic.name}</span>
                  <small className={styles.archiveRowMeta}>
                    <span>{post.readingMinutes} 分钟</span>
                    <span
                      className={`${styles.archiveMetric} ${byViews ? styles.archiveMetricActive : ''}`}
                      aria-label={`阅读：${status === 'ready' ? (stats[`/blog/${post.slug}`]?.views ?? 0) : '暂无统计'}`}
                    >
                      <Icon name="eye" />
                      {status === 'ready'
                        ? (stats[`/blog/${post.slug}`]?.views ?? 0).toLocaleString('zh-CN')
                        : '—'}
                    </span>
                  </small>
                </article>
              ))}
            </div>
          </section>
        ))}
        {rows.length === 0 && (
          <div className={styles.empty}>
            <h2>{posts.length ? '没有找到符合条件的文章' : '还没有公开的文章'}</h2>
            <p>
              {posts.length
                ? '试试其他关键词，或放宽年份和主题范围。'
                : '第一篇文字发布后，会按时间收录在这里。'}
            </p>
            {filtered && <button onClick={reset}>查看全部文章</button>}
          </div>
        )}
      </div>
      <div ref={overlayRoot} className={styles.archiveOverlayRoot} />
    </>
  )
}
