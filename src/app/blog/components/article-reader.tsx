'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { PublicPost, SiteProfile } from '../../../lib/blog-data'
import { articleContentHeadings } from '../../../lib/article-content-data'
import { readingMinutes } from '../../../lib/blog-shared'
import { Icon } from './ui-icon'
import { ArticleRichText } from './rich-text'
import { Plate } from './plate'
import styles from '../blog-v1.module.css'

export function ArticleReader({
  post,
  site,
  nextPost,
  preview = false,
}: {
  post: PublicPost
  site: SiteProfile
  nextPost?: PublicPost
  preview?: boolean
}) {
  const headings = articleContentHeadings(post.content)
  const [progress, setProgress] = useState(0)
  const [fontSize, setFontSize] = useState(17)
  const [settings, setSettings] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    const scroll = () => {
      const root = document.documentElement
      setProgress(
        Math.min(100, (root.scrollTop / Math.max(1, root.scrollHeight - root.clientHeight)) * 100),
      )
    }
    addEventListener('scroll', scroll, { passive: true })
    scroll()
    return () => removeEventListener('scroll', scroll)
  }, [])
  const jump = (index: number) =>
    document
      .getElementById(`section-${index}`)
      ?.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
  return (
    <>
      <div className={styles.progress} style={{ width: `${progress}%` }} />
      <div className={styles.readerTop}>
        <Link href="/blog">
          <Icon name="back" /> 全部文章
        </Link>
        <div>
          <button aria-expanded={settings} onClick={() => setSettings((value) => !value)}>
            Aa
          </button>
          {!preview && (
            <button
              aria-label="复制文章链接"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(location.href)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                } catch {
                  setCopied(false)
                }
              }}
            >
              <Icon name="copy" />
            </button>
          )}
        </div>
      </div>
      {settings && (
        <div className={styles.readingSettings} role="group" aria-label="阅读设置">
          <span>正文字号</span>
          {[16, 17, 19].map((size) => (
            <button
              key={size}
              className={fontSize === size ? styles.selected : ''}
              aria-pressed={fontSize === size}
              onClick={() => setFontSize(size)}
            >
              {size}px
            </button>
          ))}
        </div>
      )}
      {copied && (
        <p className={styles.toast} role="status">
          文章链接已复制
        </p>
      )}
      <div className={styles.readerGrid}>
        <aside className={styles.toc}>
          <p>本文目录</p>
          {headings.map((heading, index) => (
            <button key={`${heading}-${index}`} onClick={() => jump(index)}>
              {heading}
            </button>
          ))}
          <span>{Math.round(progress)}% 已读</span>
        </aside>
        <article
          className={styles.reader}
          style={{ '--reading-size': `${fontSize}px` } as React.CSSProperties}
        >
          <details className={styles.mobileToc}>
            <summary>本文目录 · {headings.length} 节</summary>
            {headings.map((heading, index) => (
              <button key={`${heading}-${index}`} onClick={() => jump(index)}>
                {heading}
              </button>
            ))}
          </details>
          <p className={styles.eyebrow}>
            {post.topic.name} <span>/ FIELD NOTES</span>
          </p>
          <h1>{post.title}</h1>
          {post.excerpt && <p className={styles.dek}>{post.excerpt}</p>}
          <div className={styles.byline}>
            <span>{site.authorName.slice(0, 1).toUpperCase()}</span>
            <strong>{site.authorName}</strong>
            <time dateTime={post.publishedAt}>
              {new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(
                new Date(post.publishedAt),
              )}
            </time>
            <small>{readingMinutes(post.plainText)} 分钟阅读</small>
          </div>
          {post.coverStyle !== 'none' && <Plate type={post.coverStyle} />}
          <ArticleRichText content={post.content} />
          {post.publicReferences.length > 0 && (
            <section className={styles.references}>
              <h2>公开引用</h2>
              <ul>
                {post.publicReferences.map((reference) => (
                  <li key={reference.url}>
                    <a href={reference.url} rel="noreferrer">
                      {reference.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className={styles.endnote}>
            <span>
              写于 {new Intl.DateTimeFormat('zh-CN').format(new Date(post.publishedAt))}
              <br />
              谢谢你读到这里。
            </span>
            <Link href="/blog/about">
              {site.authorName} <Icon name="external" />
            </Link>
          </div>
          {nextPost && (
            <Link className={styles.nextPost} href={`/blog/${nextPost.slug}`}>
              <span>接着读 / NEXT ENTRY</span>
              <h2>
                {nextPost.title} <i>↗</i>
              </h2>
            </Link>
          )}
        </article>
      </div>
    </>
  )
}
