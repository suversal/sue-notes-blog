'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { PublicPost } from '../../../lib/blog-data'
import { readingMinutes } from '../../../lib/blog-shared'
import { Icon } from './ui-icon'
import styles from '../blog-v1.module.css'

export function ArchiveClient({
  posts,
  initialTopic = 'all',
}: {
  posts: PublicPost[]
  initialTopic?: string
}) {
  const topics = [
    ...new Map(
      posts
        .filter((post) => post.topic.name !== '未分类')
        .map((post) => [post.topic.id, post.topic]),
    ).values(),
  ]
  const years = [...new Set(posts.map((post) => post.publishedAt.slice(0, 4)))].sort().reverse()
  const [topic, setTopic] = useState(initialTopic)
  const [year, setYear] = useState('all')
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState<'newest' | 'oldest'>('newest')
  const keyword = query.trim().toLocaleLowerCase('zh-CN')
  const rows = posts
    .filter(
      (post) =>
        (topic === 'all' || post.topic.id === topic) &&
        (year === 'all' || post.publishedAt.startsWith(year)) &&
        (!keyword || `${post.title} ${post.excerpt}`.toLocaleLowerCase('zh-CN').includes(keyword)),
    )
    .sort((a, b) =>
      order === 'newest'
        ? b.publishedAt.localeCompare(a.publishedAt)
        : a.publishedAt.localeCompare(b.publishedAt),
    )
  const groups = [...new Set(rows.map((post) => post.publishedAt.slice(0, 4)))]
  const filtered = topic !== 'all' || year !== 'all' || Boolean(query)
  const reset = () => {
    setTopic('all')
    setYear('all')
    setQuery('')
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
          <label>
            <span>年份</span>
            <select value={year} onChange={(event) => setYear(event.target.value)}>
              <option value="all">全部年份</option>
              {years.map((item) => (
                <option value={item} key={item}>
                  {item} 年
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>排序</span>
            <select
              value={order}
              onChange={(event) => setOrder(event.target.value as 'newest' | 'oldest')}
            >
              <option value="newest">最新在前</option>
              <option value="oldest">最早在前</option>
            </select>
          </label>
        </div>
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
      </section>
      <div className={styles.resultBar}>
        <span role="status">
          {filtered ? '找到' : '共'} <strong>{rows.length}</strong> 篇文章
          {topic !== 'all' && ` · ${topics.find((item) => item.id === topic)?.name ?? ''}`}
          {year !== 'all' && ` · ${year} 年`}
        </span>
        <button disabled={!filtered} onClick={reset}>
          清除筛选
        </button>
      </div>
      <div className={styles.archiveResults}>
        {groups.map((group) => (
          <section className={styles.archiveYear} key={group}>
            <div>
              <h2>{group}</h2>
              <span>{rows.filter((post) => post.publishedAt.startsWith(group)).length} 篇文章</span>
            </div>
            <div>
              {rows
                .filter((post) => post.publishedAt.startsWith(group))
                .map((post) => (
                  <article key={post.id}>
                    <time dateTime={post.publishedAt}>
                      {post.publishedAt.slice(5, 10).replace('-', ' / ')}
                    </time>
                    <h3>
                      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </h3>
                    <span>{post.topic.name}</span>
                    <small>{readingMinutes(post.plainText)} 分钟</small>
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
    </>
  )
}
