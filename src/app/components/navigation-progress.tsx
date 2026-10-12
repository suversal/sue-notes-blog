'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import styles from './navigation-progress.module.css'

/** 这次点击会不会让页面跳到另一个地址（新标签页、下载、站外、仅锚点变化都不算）。 */
export function startsNavigation(event: MouseEvent, current: URL) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
  if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download')) return false
  if (anchor.target && anchor.target !== '_self') return false
  const next = new URL(anchor.getAttribute('href') ?? '', current)
  return next.origin === current.origin && (next.pathname !== current.pathname || next.search !== current.search)
}

function Bar() {
  const pathname = usePathname()
  const here = `${pathname}?${useSearchParams()}`
  // 记下点击那一刻所在的地址：地址还没变就是加载中，变了就是新页面已经到了。
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const start = (event: MouseEvent) => {
      const current = new URL(window.location.href)
      if (!startsNavigation(event, current)) return
      setStartedAt(`${current.pathname}?${current.searchParams}`)
      // 跳转被取消或出错时不让进度条一直挂着。
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setStartedAt(null), 15_000)
    }
    // 从浏览器的前进/后退缓存里恢复出来的页面，进度条要归零。
    const reset = () => setStartedAt(null)
    // 捕获阶段监听：Next 的链接会在自己的点击处理里取消默认行为，等冒泡上来就分辨不出了。
    document.addEventListener('click', start, true)
    window.addEventListener('pageshow', reset)
    return () => {
      document.removeEventListener('click', start, true)
      window.removeEventListener('pageshow', reset)
      clearTimeout(timer.current)
    }
  }, [])

  const phase = startedAt === null ? '' : startedAt === here ? styles.loading : styles.done
  return <div aria-hidden="true" className={`${styles.bar} ${phase}`} />
}

/** 页面顶部的细进度条：站内链接一点下去就出现，给"确实点上了"的反馈。 */
export function NavigationProgress() {
  // useSearchParams 需要 Suspense 边界，否则会把整页推迟到浏览器端渲染。
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  )
}
