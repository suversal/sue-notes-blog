'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState, type CSSProperties, type ReactNode } from 'react'
import archiveStyles from '../blog-v1.module.css'
import styles from '../explore/explore.module.css'
import editor from '../uses/uses.module.css'
import listing from '../listing.module.css'
import { exploreKindLabels } from '../../../lib/explore-labels'
import type { ExploreItem, ExploreKind } from '../../../lib/explore-service'
import type { RepoStats } from '../../../lib/github-stats'
import { splitUsesTags } from '../../../lib/uses-labels'
import { RelatedLinks } from './related-links'
import { Reveal } from './reveal'
import { Icon } from './ui-icon'

// 编辑界面只有站点所有者用得到，单独打包，访客不会下载。
const ExploreItemControls = dynamic(() => import('./explore-editor').then((module) => module.ExploreItemControls))
const ExploreItemForm = dynamic(() => import('./explore-editor').then((module) => module.ExploreItemForm))

const kinds = ['project', 'site', 'saved'] as const satisfies readonly ExploreKind[]
const savedIntro = '别人做的好东西：网站、仓库、文章，我自己会反复打开的那些。'
// GitHub 上各语言的代表色，没有列出的语言用中性色。
const languageColors: Record<string, string> = {
  Swift: '#F05138', Rust: '#DEA584', Python: '#3572A5', TypeScript: '#3178C6', JavaScript: '#F1E05A',
  Go: '#00ADD8', Java: '#B07219', Kotlin: '#A97BFF', Shell: '#89E051', HTML: '#E34C26', CSS: '#563D7C', 'C++': '#F34B7D',
}

type Editing = { id: string } | { newIn: ExploreKind } | null

function ItemLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return /^https?:\/\//i.test(href) ? (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <Link className={className} href={href}>
      {children}
    </Link>
  )
}

function Tags({ value }: { value: string }) {
  const tags = splitUsesTags(value)
  if (tags.length === 0) return null
  return (
    <ul className={styles.tags} aria-label="标签">
      {tags.map((tag) => (
        <li key={tag}>{tag}</li>
      ))}
    </ul>
  )
}

function Language({ stats }: { stats?: RepoStats }) {
  if (!stats?.language) return null
  return (
    <span className={styles.language}>
      <i aria-hidden="true" style={{ background: languageColors[stats.language] ?? 'currentColor' }} />
      {stats.language}
    </span>
  )
}

function Status({ item }: { item: ExploreItem }) {
  if (!item.status) return null
  return (
    <span className={`${styles.status} ${item.highlightStatus ? styles.live : ''}`}>
      {item.highlightStatus && <i aria-hidden="true" />}
      {item.status}
    </span>
  )
}

export function ExploreClient({ items, stats = {}, canEdit = false }: { items: ExploreItem[]; stats?: Record<string, RepoStats>; canEdit?: boolean }) {
  const [editMode, setEditMode] = useState(false)
  const [editing, setEditing] = useState<Editing>(null)
  const done = () => setEditing(null)
  const shown = editMode ? items : items.filter((item) => item.isVisible)
  const sections = kinds
    .map((kind) => ({ kind, rows: shown.filter((item) => item.kind === kind) }))
    // 编辑时空分组也要显示出来，才有地方添加第一条。
    .filter((section) => editMode || section.rows.length > 0)

  const wrap = (item: ExploreItem, index: number, total: number, card: (controls: ReactNode, className: string) => ReactNode) => {
    if (editMode && editing && 'id' in editing && editing.id === item.id)
      return <ExploreItemForm item={item} kind={item.kind} onDone={done} key={item.id} />
    const controls = editMode ? (
      <ExploreItemControls item={item} index={index} total={total} onEdit={() => setEditing({ id: item.id })} />
    ) : null
    return card(controls, `${editMode ? styles.editable : ''} ${item.isVisible ? '' : styles.hidden}`)
  }

  return (
    <article>
      <section className={`${listing.head} ${styles.enter}`}>
        <div className={listing.headText}>
          <h1>项目、站点与收藏。</h1>
          <span>我做的东西，我维护的网站，以及愿意反复回访的互联网角落。</span>
        </div>
      </section>

      <div className={styles.sections} aria-label="探索条目">
        {sections.map(({ kind, rows }, sectionIndex) => {
          // 勾了「显示 Star 和 Fork」的项目排在前面，卡片大小和其他项目一样。
          const featured = kind === 'project' ? rows.filter((item) => item.isFeatured) : []
          const regular = rows.filter((item) => !featured.includes(item))
          const cards = [
            ...featured.map((item, index) => ({ item, index, total: featured.length })),
            ...regular.map((item, index) => ({ item, index, total: regular.length })),
          ]
          // 整组状态相同时只在标题旁说一次，避免每张卡片重复同一个标签。
          const sharedStatus =
            rows.length > 1 && rows[0].status && rows.every((item) => item.status === rows[0].status && !item.highlightStatus)
              ? rows[0].status
              : ''
          const adding = editMode && editing && 'newIn' in editing && editing.newIn === kind
          const addCard = editMode && (adding ? (
            <ExploreItemForm kind={kind} onDone={done} />
          ) : (
            <button className={editor.addCard} type="button" onClick={() => setEditing({ newIn: kind })}>
              <Icon name="plus" />
              添加
            </button>
          ))
          // 首屏分组随页面进入，后面的分组滚动到时再浮现。
          const group = (
            <section className={styles.group} aria-labelledby={`explore-${kind}`}>
              <header className={styles.groupHead}>
                <h2 id={`explore-${kind}`}>{exploreKindLabels[kind]}</h2>
                <span>
                  {kind === 'saved' ? savedIntro : `${rows.length} 个${sharedStatus && ` · ${sharedStatus}`}`}
                </span>
              </header>

              {kind === 'saved' ? (
                <div className={styles.savedList}>
                  {regular.map((item, index) =>
                    wrap(item, index, regular.length, (controls, className) => (
                      <article className={`${styles.savedRow} ${className}`} style={{ '--i': Math.min(index, 8) } as CSSProperties} key={item.id}>
                        {controls}
                        <span className={styles.savedKind}>{item.meta}</span>
                        <div className={styles.savedBody}>
                          <h3>
                            <ItemLink href={item.href}>{item.title}</ItemLink>
                          </h3>
                          <p>{item.description}</p>
                        </div>
                        <RelatedLinks links={item.relatedLinks} compact />
                        <Icon name="arrow" />
                      </article>
                    )),
                  )}
                  {addCard}
                </div>
              ) : (
                <div className={styles.cards}>
                  {cards.map(({ item, index, total }, position) =>
                    wrap(item, index, total, (controls, className) => {
                      const repo = stats[item.id]
                      const counts = item.isFeatured ? repo : undefined
                      return (
                        <article className={`${styles.card} ${className}`} style={{ '--i': Math.min(position, 8) } as CSSProperties} key={item.id}>
                          {controls}
                          <div className={styles.cardHead}>
                            {item.logoUrl && <img className={styles.logo} src={item.logoUrl} alt="" width="36" height="36" loading="lazy" />}
                            <h3>
                              <ItemLink href={item.href}>{item.title}</ItemLink>
                            </h3>
                            {sharedStatus || !item.status ? <Icon name="arrow" /> : <Status item={item} />}
                          </div>
                          <p>{item.description}</p>
                          {kind === 'project' ? (
                            <Tags value={item.meta} />
                          ) : (
                            item.meta && (
                              <small className={styles.meta} data-mono={/^[\w-]+(\.[\w-]+)+$/.test(item.meta) || undefined}>
                                {item.meta}
                              </small>
                            )
                          )}
                          {(repo?.language || counts || item.relatedLinks.length > 0) && (
                            <div className={styles.cardFoot}>
                              <Language stats={repo} />
                              {counts && (
                                <span className={styles.counts}>
                                  <span aria-label={`${counts.stars} 个 Star`}>
                                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12 2.500l2.900 6.200 6.600.800-4.900 4.600 1.300 6.600L12 17.400l-5.900 3.300 1.300-6.600L2.500 9.500l6.600-.800z" />
                                    </svg>
                                    {counts.stars.toLocaleString('zh-CN')}
                                  </span>
                                  <span aria-label={`${counts.forks} 个 Fork`}>
                                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="6" cy="5" r="2.200" />
                                      <circle cx="18" cy="5" r="2.200" />
                                      <circle cx="12" cy="19" r="2.200" />
                                      <path d="M6 7.200v2.300a2.500 2.500 0 0 0 2.500 2.500h7a2.500 2.500 0 0 0 2.500-2.500V7.200M12 12v4.800" />
                                    </svg>
                                    {counts.forks.toLocaleString('zh-CN')}
                                  </span>
                                </span>
                              )}
                              <RelatedLinks links={item.relatedLinks} compact />
                            </div>
                          )}
                        </article>
                      )
                    }),
                  )}
                  {addCard}
                </div>
              )}
            </section>
          )
          return sectionIndex === 0 || editMode ? <div key={kind}>{group}</div> : <Reveal key={kind}>{group}</Reveal>
        })}
        {sections.length === 0 && (
          <section className={archiveStyles.empty}>
            <h2>这里暂时还没有条目</h2>
            <p>项目、站点和收藏整理好之后会出现在这里。</p>
          </section>
        )}
      </div>

      {canEdit && (
        <button
          className={editor.editToggle}
          type="button"
          aria-pressed={editMode}
          onClick={() => {
            setEditMode((value) => !value)
            setEditing(null)
          }}
        >
          <Icon name={editMode ? 'published' : 'edit'} />
          {editMode ? '完成' : '编辑'}
        </button>
      )}
    </article>
  )
}
