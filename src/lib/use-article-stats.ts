'use client'

import { useEffect, useState } from 'react'
import type { PublicPostSummary } from './blog-data'

export type ArticleStats = { views: number; views30d: number; likes: number; comments: number }
type ArtalkPage = { key: string; pv: number; vote_up: number }

const artalkServer =
  process.env.NEXT_PUBLIC_ARTALK_SERVER_URL?.replace(/\/$/, '') || 'http://127.0.0.1:23366'

export function useArticleStats(posts: PublicPostSummary[]) {
  const [stats, setStats] = useState<Record<string, ArticleStats>>({})
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    posts.length ? 'loading' : 'ready',
  )
  const [recentStatus, setRecentStatus] = useState<'loading' | 'ready' | 'error'>(
    posts.length ? 'loading' : 'ready',
  )

  useEffect(() => {
    if (!posts.length) return
    const controller = new AbortController()
    const pageKeys = posts.map((post) => `/blog/${post.slug}`)
    const keyParams = new URLSearchParams({
      page_keys: pageKeys.join(','),
      site_name: '苏码手记',
    })
    const pageParams = new URLSearchParams({
      limit: String(Math.max(posts.length, 1)),
      site_name: '苏码手记',
    })
    const getData = async <T>(url: string): Promise<T> => {
      const response = await fetch(url, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
      })
      if (!response.ok) throw new Error(`Artalk statistics request failed: ${response.status}`)
      return (await response.json()) as T
    }

    void getData<{ data: Record<string, number> }>(
      `/api/blog/views?${new URLSearchParams({ page_keys: pageKeys.join(',') })}`,
    )
      .then((recent) => {
        setStats((current) =>
          Object.fromEntries(
            pageKeys.map((key) => [
              key,
              {
                views: current[key]?.views ?? 0,
                views30d: Number(recent.data[key] ?? 0),
                likes: current[key]?.likes ?? 0,
                comments: current[key]?.comments ?? 0,
              },
            ]),
          ),
        )
        setRecentStatus('ready')
      })
      .catch(() => {
        if (!controller.signal.aborted) setRecentStatus('error')
      })

    void Promise.all([
      getData<{ data: Record<string, number> }>(
        `${artalkServer}/api/v2/stats/page_pv?${keyParams}`,
      ),
      getData<{ data: Record<string, number> }>(
        `${artalkServer}/api/v2/stats/page_comment?${keyParams}`,
      ),
      getData<{ data: ArtalkPage[] }>(`${artalkServer}/api/v2/stats/latest_pages?${pageParams}`),
    ])
      .then(([views, comments, pages]) => {
        const pagesByKey = new Map(pages.data.map((page) => [page.key, page]))
        setStats((current) =>
          Object.fromEntries(
            pageKeys.map((key) => [
              key,
              {
                views: Number(views.data[key] ?? pagesByKey.get(key)?.pv ?? 0),
                views30d: current[key]?.views30d ?? 0,
                likes: Number(pagesByKey.get(key)?.vote_up ?? 0),
                comments: Number(comments.data[key] ?? 0),
              },
            ]),
          ),
        )
        setStatus('ready')
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setStatus('error')
      })

    return () => controller.abort()
  }, [posts])

  return { stats, status, recentStatus }
}

export type ArticleAnalytics = ReturnType<typeof useArticleStats>
