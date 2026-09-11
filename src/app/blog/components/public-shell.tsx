'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { PublicPost, SiteProfile } from '../../../lib/blog-data'
import { Icon } from './ui-icon'
import styles from '../blog-v1.module.css'

function Brand({ site }: { site: SiteProfile }) {
  return (
    <Link href="/blog" className={styles.brand}>
      <img src="/icon.svg" alt="" width="36" height="36" />
      <span>
        {site.siteName}
        <small>SUE NOTES · AN INDEPENDENT JOURNAL</small>
      </span>
    </Link>
  )
}

export function PublicShell({
  site,
  searchPosts,
  children,
}: {
  site: SiteProfile
  searchPosts: PublicPost[]
  children: ReactNode
}) {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const dialog = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = localStorage.getItem('sue-notes-theme')
      const next = saved === 'dark' ? 'dark' : 'light'
      setTheme(next)
      document.documentElement.dataset.blogTheme = next
    })
    return () => cancelAnimationFrame(frame)
  }, [])
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((value) => !value)
      }
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [])
  useEffect(() => {
    if (!searchOpen) return
    const before = document.activeElement as HTMLElement | null
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = setTimeout(
      () => dialog.current?.querySelector<HTMLInputElement>('input')?.focus(),
      20,
    )
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSearchOpen(false)
      if (event.key === 'Tab' && dialog.current) {
        const items = [
          ...dialog.current.querySelectorAll<HTMLElement>('a,button,input,[tabindex="0"]'),
        ].filter((item) => !item.hasAttribute('disabled'))
        const first = items[0]
        const last = items.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', key)
    return () => {
      clearTimeout(timer)
      document.body.style.overflow = old
      document.removeEventListener('keydown', key)
      before?.focus()
    }
  }, [searchOpen])
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('sue-notes-theme', next)
    document.documentElement.dataset.blogTheme = next
  }
  const keyword = query.trim().toLocaleLowerCase('zh-CN')
  const found = searchPosts
    .filter(
      (post) =>
        !keyword ||
        `${post.title} ${post.excerpt} ${post.topic.name}`
          .toLocaleLowerCase('zh-CN')
          .includes(keyword),
    )
    .slice(0, 8)
  return (
    <div className={styles.publicRoot}>
      <div className={styles.publicShell}>
        <header className={styles.masthead}>
          <Brand site={site} />
          <nav aria-label="博客导航">
            <Link className={pathname === '/blog' ? styles.active : ''} href="/blog">
              文章
            </Link>
            <Link
              className={pathname === '/blog/archive' ? styles.active : ''}
              href="/blog/archive"
            >
              归档
            </Link>
            <Link className={pathname === '/blog/about' ? styles.active : ''} href="/blog/about">
              关于
            </Link>
          </nav>
          <div className={styles.navTools}>
            <button aria-label="搜索文章" onClick={() => setSearchOpen(true)}>
              <Icon name="search" />
            </button>
            <button
              className={styles.themeToggle}
              aria-label={`切换到${theme === 'light' ? '深色' : '浅色'}主题`}
              onClick={toggleTheme}
            >
              <Icon name="sun" />
            </button>
          </div>
        </header>
        {children}
        <footer className={styles.footer}>
          <span>
            © {new Date().getFullYear()} {site.siteName} · 写下来，慢慢来。
          </span>
          <div>
            <Link href="/blog/about">关于作者</Link>
            <Link href="/blog/archive">全部文章</Link>
          </div>
        </footer>
      </div>
      {searchOpen && (
        <div
          className={styles.overlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSearchOpen(false)
          }}
        >
          <div
            ref={dialog}
            className={styles.searchDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-title"
          >
            <div className={styles.dialogHead}>
              <h2 id="search-title" className={styles.srOnly}>
                搜索公开文章
              </h2>
              <button aria-label="关闭搜索" onClick={() => setSearchOpen(false)}>
                <Icon name="close" />
              </button>
            </div>
            <label className={styles.searchField}>
              <Icon name="search" />
              <span className={styles.srOnly}>关键词</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜一个关键词，找一篇旧文章…"
              />
            </label>
            <div className={styles.searchResults}>
              <p>{query ? `找到 ${found.length} 篇文章` : '从这些文章开始'}</p>
              {found.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  onClick={() => setSearchOpen(false)}
                >
                  <small>
                    {post.topic.name} ·{' '}
                    {new Intl.DateTimeFormat('zh-CN').format(new Date(post.publishedAt))}
                  </small>
                  <strong>{post.title}</strong>
                  <span>{post.excerpt}</span>
                </Link>
              ))}
              {found.length === 0 && (
                <div className={styles.empty}>
                  <h3>暂时没有找到。</h3>
                  <p>试试“工具”“文章”或“缓存”。</p>
                  <button onClick={() => setQuery('')}>清除关键词</button>
                </div>
              )}
            </div>
            <div className={styles.dialogFoot}>
              仅搜索公开文章 <span>ESC 关闭 · ⌘ K 搜索</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
