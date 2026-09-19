'use client'

import Link from 'next/link'
import { useState } from 'react'
import archiveStyles from '../blog-v1.module.css'
import styles from '../explore/explore.module.css'
import { exploreKindLabels } from '../../../lib/explore-labels'
import type { ExploreItem, ExploreKind } from '../../../lib/explore-service'

const kinds = ['project', 'site', 'saved'] as const satisfies readonly ExploreKind[]
const filters: { key: 'all' | ExploreKind; label: string }[] = [
  { key: 'all', label: '全部' },
  ...kinds.map((kind) => ({ key: kind, label: exploreKindLabels[kind] })),
]

export function ExploreClient({ items }: { items: ExploreItem[] }) {
  const [filter, setFilter] = useState<(typeof filters)[number]['key']>('all')
  const visibleItems = filter === 'all' ? items : items.filter((item) => item.kind === filter)
  return (
    <article>
      <section className={archiveStyles.archiveTitle}>
        <p className={archiveStyles.eyebrow}>EXPLORE</p>
        <h1>项目、站点与收藏。</h1>
        <span>我做的项目、维护的网站，以及愿意反复回访的互联网角落。</span>
      </section>

      <section
        className={`${archiveStyles.archiveFilters} ${styles.filters}`}
        aria-label="筛选探索内容"
      >
        <div className={`${archiveStyles.archiveTopicLine} ${styles.filterLine}`}>
          <div className={archiveStyles.archiveTopicsScroller}>
            <div
              className={`${archiveStyles.archiveTopics} ${styles.topics}`}
              role="group"
              aria-label="内容类型"
            >
              {filters.map((item) => (
                <button
                  className={filter === item.key ? archiveStyles.selected : ''}
                  type="button"
                  aria-pressed={filter === item.key}
                  onClick={() => setFilter(item.key)}
                  key={item.key}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <span className={archiveStyles.archiveCount} role="status" aria-atomic="true">
            共 <strong>{visibleItems.length}</strong> 个项目
          </span>
        </div>
      </section>

      <div className={styles.list} aria-label="探索条目">
        {visibleItems.map((item) => {
          const external = /^https?:\/\//i.test(item.href)
          return (
            <article className={styles.row} key={item.id}>
              <h3>
                {external ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer">
                    {item.title}
                  </a>
                ) : (
                  <Link href={item.href}>{item.title}</Link>
                )}
              </h3>
              <p>{item.description}</p>
              <div className={styles.labels}>
                <span className={styles.kind}>{exploreKindLabels[item.kind]}</span>
                <span className={`${styles.status} ${item.highlightStatus ? styles.live : ''}`}>
                  {item.highlightStatus && <i aria-hidden="true" />}
                  {item.status}
                </span>
              </div>
              <small className={styles.meta}>{item.meta}</small>
            </article>
          )
        })}
        {visibleItems.length === 0 && (
          <section className={archiveStyles.empty}>
            <h2>这个分类暂时还没有条目</h2>
            <p>可以查看其他项目、站点与收藏。</p>
            <button type="button" onClick={() => setFilter('all')}>查看全部条目</button>
          </section>
        )}
      </div>
    </article>
  )
}
