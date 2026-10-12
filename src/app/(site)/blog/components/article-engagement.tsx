'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from './ui-icon'
import styles from '../blog-v1.module.css'

const artalkServer =
  process.env.NEXT_PUBLIC_ARTALK_SERVER_URL?.replace(/\/$/, '') || 'http://127.0.0.1:23366'

export function ArticleEngagement({ slug, title }: { slug: string; title: string }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const likeButtonRef = useRef<HTMLButtonElement>(null)
  const viewRecordedRef = useRef(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [liked, setLiked] = useState(false)
  const pageKey = `/blog/${slug}`

  useEffect(() => {
    if (viewRecordedRef.current) return
    viewRecordedRef.current = true
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
    const storageKey = `article-view:${date}:${pageKey}`
    try {
      if (window.sessionStorage.getItem(storageKey)) return
    } catch {
      // Storage can be unavailable in restricted browsing modes; counting can still continue.
    }

    void fetch('/api/blog/views', {
      method: 'POST',
      body: JSON.stringify({ pageKey }),
      headers: { 'content-type': 'application/json' },
      keepalive: true,
    }).then((response) => {
      if (!response.ok) return
      try {
        window.sessionStorage.setItem(storageKey, '1')
      } catch {
        // The view was recorded even if this browser does not allow session storage.
      }
    }).catch(() => undefined)
  }, [pageKey])

  useEffect(() => {
    const button = likeButtonRef.current
    if (!button) return

    const syncLikedState = () => setLiked(button.classList.contains('active'))
    const observer = new MutationObserver(syncLikedState)
    observer.observe(button, { attributeFilter: ['class'], attributes: true })
    syncLikedState()

    return () => observer.disconnect()
  }, [pageKey])

  useEffect(() => {
    let cancelled = false
    let instance: { destroy: () => void; setDarkMode: (darkMode: boolean) => void } | undefined
    let themeObserver: MutationObserver | undefined

    void import('artalk')
      .then(({ default: Artalk }) => {
        if (cancelled || !mountRef.current) return

        const artalk = Artalk.init({
          el: mountRef.current,
          server: artalkServer,
          site: '苏码手记',
          pageKey,
          pageTitle: title,
          locale: 'zh-CN',
          placeholder: '写下你的想法…',
          noComment: '还没有评论，来聊聊你的想法吧。',
          sendBtn: '发布评论',
          darkMode: document.documentElement.dataset.blogTheme === 'dark',
          emoticons: false,
          imgUpload: false,
          preview: true,
          vote: true,
          voteDown: false,
          pageVote: {
            upBtnEl: '#article-like-button',
            upCountEl: '#article-like-count',
            downBtnEl: '#article-like-down-unused',
            downCountEl: '#article-like-down-count-unused',
            activeClass: 'active',
          },
          pvAdd: true,
          preferRemoteConf: false,
          versionCheck: false,
        })

        instance = artalk
        artalk.on('mounted', () => {
          mountRef.current?.querySelector('.atk-list-footer')?.remove()
          if (!cancelled) setStatus('ready')
        })
        artalk.on('list-loaded', () => {
          mountRef.current?.querySelector('.atk-list-footer')?.remove()
        })
        artalk.on('list-failed', () => {
          if (!cancelled) setStatus('error')
        })

        themeObserver = new MutationObserver(() => {
          artalk.setDarkMode(document.documentElement.dataset.blogTheme === 'dark')
        })
        themeObserver.observe(document.documentElement, {
          attributeFilter: ['data-blog-theme'],
          attributes: true,
        })
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      themeObserver?.disconnect()
      instance?.destroy()
    }
  }, [pageKey, title])

  return (
    <section className={styles.engagement} aria-labelledby="article-discussion-title">
      <div className={styles.engagementHeader}>
        <div>
          <p>读者互动</p>
          <h2 id="article-discussion-title">喜欢这篇文章吗？</h2>
        </div>
        <div className={styles.engagementStats} aria-label="文章互动数据">
          <span>
            <Icon name="eye" />
            <strong className="artalk-pv-count">—</strong>
            <small>阅读</small>
          </span>
          <button
            ref={likeButtonRef}
            id="article-like-button"
            className="artalk-page-vote-up"
            type="button"
            aria-label={liked ? '取消点赞这篇文章' : '点赞这篇文章'}
            aria-pressed={liked}
            title={liked ? '取消点赞' : '点赞'}
          >
            <Icon name="heart" />
            <strong id="article-like-count" className="artalk-page-vote-up-count" aria-live="polite">—</strong>
            <small>喜欢</small>
          </button>
          <a href="#article-comments" aria-label="跳到文章评论">
            <Icon name="comment" />
            <strong className="artalk-comment-count">—</strong>
            <small>评论</small>
          </a>
        </div>
      </div>

      <div id="article-comments" className={styles.comments}>
        {status === 'loading' && (
          <p className={styles.commentsStatus} role="status">
            正在加载评论…
          </p>
        )}
        {status === 'error' && (
          <p className={styles.commentsStatus} role="alert">
            评论暂时无法加载，请稍后再试。
          </p>
        )}
        <div ref={mountRef} className={styles.commentsMount} aria-busy={status === 'loading'} />
      </div>
    </section>
  )
}
