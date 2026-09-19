'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import type { PublicPost } from '../../../lib/blog-data'
import { readingMinutes } from '../../../lib/blog-shared'
import { useArticleStats, type ArticleStats } from '../../../lib/use-article-stats'
import { ArchiveSelect } from './archive-select'
import { Icon } from './ui-icon'
import styles from '../blog-v1.module.css'

const archiveMetrics = [
  { key: 'views', label: '阅读', icon: 'eye' },
  { key: 'likes', label: '点赞', icon: 'heart' },
  { key: 'comments', label: '评论', icon: 'comment' },
] as const

export function ArchiveClient({
  posts,
  initialTopic = 'all',
}: {
  posts: PublicPost[]
  initialTopic?: string
}) {
  const overlayRoot = useRef<HTMLDivElement>(null)
  const { stats, status } = useArticleStats(posts)
  const topics = [...new Map(posts.map((post) => [post.topic.id, post.topic])).values()]
  const years = [...new Set(posts.map((post) => post.publishedAt.slice(0, 4)))].sort().reverse()
  const [topic, setTopic] = useState(initialTopic)
  const [year, setYear] = useState('all')
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState<'newest' | 'oldest' | keyof ArticleStats>('newest')
  const metric = order === 'views' || order === 'likes' || order === 'comments' ? order : null
  const keyword = query.trim().toLocaleLowerCase('zh-CN')
  const rows = posts
    .filter(
      (post) =>
        (topic === 'all' || post.topic.id === topic) &&
        (year === 'all' || post.publishedAt.startsWith(year)) &&
        (!keyword || `${post.title} ${post.excerpt}`.toLocaleLowerCase('zh-CN').includes(keyword)),
    )
    .sort((a, b) => {
      if (metric && status === 'ready') {
        const difference =
          (stats[`/blog/${b.slug}`]?.[metric] ?? 0) - (stats[`/blog/${a.slug}`]?.[metric] ?? 0)
        if (difference) return difference
      }
      return order === 'oldest'
        ? a.publishedAt.localeCompare(b.publishedAt)
        : b.publishedAt.localeCompare(a.publishedAt)
    })
  const filtered = topic !== 'all' || year !== 'all' || Boolean(query) || order !== 'newest'
  const reset = () => {
    setTopic('all')
    setYear('all')
    setQuery('')
    setOrder('newest')
  }
  return (
    <>
      <section className={styles.archiveTitle}>
        <p className={styles.eyebrow}>THE ARCHIVE</p>
        <h1>按时间，翻一翻。</h1>
        <span>{posts.length} 篇文章，按时间收藏。也可以沿着一个主题找回旧文字。</span>
      </section>
      <section className={styles.archiveFilters} aria-label="筛选归档文章">
        <div className={styles.archiveControls}>
          <label className={styles.archiveSearch}>
            <Icon name="search" />
            <span className={styles.srOnly}>搜索标题或摘要</span>
            <input
              type="search"
              placeholder="搜索标题或摘要…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button aria-label="清除关键词" onClick={() => setQuery('')}>
                <Icon name="close" />
              </button>
            )}
          </label>
          <div className={styles.archiveControl}>
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
          <div className={styles.archiveControl}>
            <ArchiveSelect
              label="选择排序方式"
              value={order}
              onChange={(value) => setOrder(value as typeof order)}
              portalContainer={overlayRoot}
              active={order !== 'newest'}
              options={[
                { value: 'newest', label: '最新在前' },
                { value: 'oldest', label: '最早在前' },
                { value: 'views', label: '阅读量最多', disabled: status !== 'ready' },
                { value: 'likes', label: '点赞最多', disabled: status !== 'ready' },
                { value: 'comments', label: '评论最多', disabled: status !== 'ready' },
              ]}
            />
          </div>
        </div>
        <div className={styles.archiveTopicLine}>
          <div className={styles.archiveTopicsScroller}>
            <div className={styles.archiveTopics} role="group" aria-label="归档主题">
              <button
                className={topic === 'all' ? styles.selected : ''}
                aria-pressed={topic === 'all'}
                onClick={() => setTopic('all')}
              >
                全部
              </button>
              {topics.map((item) => (
                <button
                  className={topic === item.id ? styles.selected : ''}
                  aria-pressed={topic === item.id}
                  onClick={() => setTopic(item.id)}
                  key={item.id}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <span className={styles.archiveCount} role="status">共 <strong>{rows.length}</strong> 篇文章</span>
        </div>
      </section>
      {status !== 'ready' && (
        <p className={styles.archiveStatsStatus} role="status">
          {status === 'loading'
            ? '阅读与互动统计加载中…'
            : '互动统计暂不可用，暂时无法按阅读、点赞或评论排序。'}
        </p>
      )}
      <div className={styles.archiveResults}>
        <div className={styles.archiveYear}>
          {rows.map((post) => (
            <article key={post.id}>
              <time dateTime={post.publishedAt}>
                {post.publishedAt.slice(0, 10).replaceAll('-', '/')}
              </time>
              <h3>
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h3>
              <span>{post.topic.name}</span>
              <small className={styles.archiveRowMeta}>
                <span>{readingMinutes(post.plainText)} 分钟</span>
                {archiveMetrics.map((item) => (
                  <span
                    className={`${styles.archiveMetric} ${metric === item.key ? styles.archiveMetricActive : ''}`}
                    aria-label={`${item.label}：${status === 'ready' ? (stats[`/blog/${post.slug}`]?.[item.key] ?? 0) : '暂无统计'}`}
                    key={item.key}
                  >
                    <Icon name={item.icon} />
                    {status === 'ready'
                      ? (stats[`/blog/${post.slug}`]?.[item.key] ?? 0).toLocaleString('zh-CN')
                      : '—'}
                  </span>
                ))}
              </small>
            </article>
          ))}
        </div>
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
