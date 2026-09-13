'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { ArticleAnalytics } from '../../../lib/use-article-stats'
import type { PublicPost } from '../../../lib/blog-data'
import { Icon } from './ui-icon'
import styles from '../home.module.css'

export function PopularArticles({
  posts,
  analytics,
}: {
  posts: PublicPost[]
  analytics: ArticleAnalytics
}) {
  const { stats, status, recentStatus } = analytics
  const [period, setPeriod] = useState<'30d' | 'all'>('30d')
  const rankingStatus = period === '30d' ? recentStatus : status

  const ranked = useMemo(
    () =>
      [...posts]
        .sort((a, b) => {
          const metric = period === '30d' ? 'views30d' : 'views'
          const viewDifference =
            (stats[`/blog/${b.slug}`]?.[metric] ?? 0) - (stats[`/blog/${a.slug}`]?.[metric] ?? 0)
          return viewDifference || Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
        })
        .slice(0, 5),
    [period, posts, stats],
  )

  return (
    <section id="home-popular" className={styles.popularSection} aria-labelledby="popular-heading">
      <div className={styles.popularHeading}>
        <h2 id="popular-heading" tabIndex={-1}>
          热门排行
        </h2>
        <span className={styles.statsPending} role="status">
          {rankingStatus === 'loading'
            ? '统计加载中'
            : rankingStatus === 'error'
              ? '统计暂不可用'
              : period === '30d'
                ? '近 30 天统计'
                : '实时统计'}
        </span>
      </div>
      <div className={styles.popularPeriods}>
        <div className={styles.periodButtons} role="group" aria-label="排行时间范围">
          <button
            type="button"
            aria-pressed={period === '30d'}
            aria-controls="popular-results"
            onClick={() => setPeriod('30d')}
          >
            近 30 天
          </button>
          <button
            type="button"
            aria-pressed={period === 'all'}
            aria-controls="popular-results"
            onClick={() => setPeriod('all')}
          >
            累计
          </button>
        </div>
        <span>按阅读量</span>
      </div>
      <div id="popular-results">
        {posts.length === 0 && (
          <p className={styles.sidebarEmpty} role="status">
            文章发布并产生访问后，这里会显示阅读排行。
          </p>
        )}
        {ranked.length > 0 && (
          <ol
            className={styles.popularList}
            aria-label={`${period === '30d' ? '近 30 天' : '累计'}阅读排行`}
          >
            {ranked.map((post, index) => {
              const item = stats[`/blog/${post.slug}`]
              const displayedViews = period === '30d' ? item?.views30d : item?.views
              return (
                <li key={post.id}>
                  <Link className={styles.popularTitle} href={`/blog/${post.slug}`}>
                    <span
                      className={`${styles.rankNumber} ${index < 3 ? styles.topRank : ''}`}
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>{post.title}</span>
                    <Icon name="arrow" />
                  </Link>
                  <div className={styles.engagement}>
                    <span
                      aria-label={
                        rankingStatus === 'ready'
                          ? `阅读 ${displayedViews ?? 0} 次`
                          : '阅读统计加载中'
                      }
                    >
                      {rankingStatus === 'ready'
                        ? (displayedViews ?? 0).toLocaleString('zh-CN')
                        : '—'}{' '}
                      阅读
                    </span>
                    <span
                      aria-label={
                        status === 'ready' ? `点赞 ${item?.likes ?? 0} 次` : '点赞统计加载中'
                      }
                    >
                      <Icon name="heart" />
                      <span aria-hidden="true">
                        {status === 'ready' ? (item?.likes ?? 0).toLocaleString('zh-CN') : '—'}
                      </span>
                    </span>
                    <span
                      aria-label={
                        status === 'ready' ? `评论 ${item?.comments ?? 0} 条` : '评论统计加载中'
                      }
                    >
                      <Icon name="comment" />
                      <span aria-hidden="true">
                        {status === 'ready' ? (item?.comments ?? 0).toLocaleString('zh-CN') : '—'}
                      </span>
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
