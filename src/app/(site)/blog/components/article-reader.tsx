'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { PublicPost, PublicPostSummary } from '../../../../lib/blog-data'
import { articleContentHeadings } from '../../../../lib/article-content-data'
import { formatBlogDateTime } from '../../../../lib/blog-shared'
import { ArticleEngagement } from './article-engagement'
import { Icon } from './ui-icon'
import { ArticleRichText } from './rich-text'
import { Plate } from './plate'
import styles from '../blog-v1.module.css'

export function ArticleReader({
  post,
  previousPost,
  nextPost,
  preview = false,
  editHref,
}: {
  post: PublicPost
  previousPost?: PublicPostSummary
  nextPost?: PublicPostSummary
  preview?: boolean
  editHref?: string
}) {
  const headings = articleContentHeadings(post.content)
  const [progress, setProgress] = useState(0)
  const [fontSize, setFontSize] = useState(16)
  const [settings, setSettings] = useState(false)
  const [copied, setCopied] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const copyFeedbackRef = useRef<HTMLDivElement>(null)
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
  useEffect(() => {
    if (!settings) return
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !settingsRef.current?.contains(event.target)) setSettings(false)
    }
    const closeWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettings(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeWithKeyboard)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeWithKeyboard)
    }
  }, [settings])
  useEffect(() => {
    if (!copied) return
    const dismissTimer = window.setTimeout(() => setCopied(false), 2000)
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !copyFeedbackRef.current?.contains(event.target)) {
        setCopied(false)
      }
    }
    const closeWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCopied(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeWithKeyboard)
    return () => {
      window.clearTimeout(dismissTimer)
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeWithKeyboard)
    }
  }, [copied])
  const jump = (index: number) =>
    document.getElementById(`section-${index}`)?.scrollIntoView({
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
          {editHref && (
            <Link
              className={`${styles.readerEdit} ${styles.readerTooltip}`}
              href={editHref}
              aria-label={`编辑文章：${post.title}`}
              data-tooltip="编辑文章"
            >
              <Icon name="edit" />
            </Link>
          )}
          <div ref={settingsRef} className={styles.readingSettingsWrap}>
            <button
              className={styles.readerTooltip}
              aria-label="阅读设置"
              aria-expanded={settings}
              data-tooltip="调整字号"
              onClick={() => setSettings((value) => !value)}
            >
              Aa
            </button>
            <div
              className={`${styles.readingSettings} ${settings ? styles.readingSettingsOpen : ''}`}
              role="group"
              aria-label="正文字号"
              aria-hidden={!settings}
            >
              <span>字号</span>
              {[15, 16, 17].map((size) => (
                <button
                  key={size}
                  className={fontSize === size ? styles.selected : ''}
                  aria-pressed={fontSize === size}
                  tabIndex={settings ? 0 : -1}
                  onClick={() => {
                    setFontSize(size)
                    setSettings(false)
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          {!preview && (
            <>
              <a
                className={`${styles.readerTool} ${styles.readerTooltip}`}
                href={`/blog/${encodeURIComponent(post.slug)}/export`}
                aria-label={`导出 Markdown：${post.title}`}
                data-tooltip="导出 Markdown"
              >
                <Icon name="download" />
              </a>
              <div ref={copyFeedbackRef} className={styles.copyFeedbackWrap}>
                <button
                  className={`${styles.readerTooltip} ${copied ? styles.readerTooltipSuppressed : ''}`}
                  aria-label="复制文章链接"
                  data-tooltip="复制链接"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(location.href)
                      setCopied(true)
                    } catch {
                      setCopied(false)
                    }
                  }}
                >
                  <Icon name="copy" />
                </button>
                {copied && (
                  <p className={styles.copyToast} role="status">
                    文章链接已复制
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
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
            <time dateTime={post.publishedAt}>
              {formatBlogDateTime(post.publishedAt)}
            </time>
            <small>{post.readingMinutes} 分钟阅读</small>
            {post.sourceUrl && (
              <a className={styles.sourceLink} href={post.sourceUrl} target="_blank" rel="noopener noreferrer">
                <Icon name="x" />
                原文
              </a>
            )}
          </div>
          {(post.coverStyle !== 'none' || post.coverImage) && <Plate type={post.coverStyle} image={post.coverImage} />}
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
              写于 <time dateTime={post.publishedAt}>{formatBlogDateTime(post.publishedAt)}</time>
              <br />
              谢谢你读到这里。
            </span>
            {post.sourceUrl && (
              <a className={styles.sourceButton} href={post.sourceUrl} target="_blank" rel="noopener noreferrer">
                <Icon name="x" />
                在 X 上查看原文
                <Icon name="arrow" />
              </a>
            )}
          </div>
          {(previousPost || nextPost) && (
            <nav className={styles.articlePager} aria-label="上一篇和下一篇文章">
              {previousPost && (
                <Link className={styles.previousPost} href={`/blog/${previousPost.slug}`}>
                  <span>← 上一篇 / PREVIOUS</span>
                  <h2>{previousPost.title}</h2>
                </Link>
              )}
              {nextPost && (
                <Link className={styles.nextPost} href={`/blog/${nextPost.slug}`}>
                  <span>下一篇 / NEXT →</span>
                  <h2>{nextPost.title}</h2>
                </Link>
              )}
            </nav>
          )}
          {!preview && <ArticleEngagement slug={post.slug} title={post.title} />}
        </article>
      </div>
    </>
  )
}
