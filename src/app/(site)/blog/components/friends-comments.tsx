'use client'

import { useEffect, useRef, useState } from 'react'
import styles from '../blog-v1.module.css'

const artalkServer =
  process.env.NEXT_PUBLIC_ARTALK_SERVER_URL?.replace(/\/$/, '') || 'http://127.0.0.1:23366'

/** 友邻页的留言区：交换友链的申请直接留在这里，不另做表单。 */
export function FriendsComments() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

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
          pageKey: '/blog/friends',
          pageTitle: '友邻',
          locale: 'zh-CN',
          placeholder: '附上你的站名、地址、头像和一句话介绍…',
          noComment: '还没有人来信，做第一个吧。',
          sendBtn: '寄出',
          darkMode: document.documentElement.dataset.blogTheme === 'dark',
          emoticons: false,
          imgUpload: false,
          preview: true,
          vote: true,
          voteDown: false,
          pvAdd: false,
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
  }, [])

  return (
    <div id="friends-comments" className={styles.comments}>
      {status === 'loading' && (
        <p className={styles.commentsStatus} role="status">
          正在加载留言…
        </p>
      )}
      {status === 'error' && (
        <p className={styles.commentsStatus} role="alert">
          留言暂时无法加载，请稍后再试。
        </p>
      )}
      <div ref={mountRef} className={styles.commentsMount} aria-busy={status === 'loading'} />
    </div>
  )
}
