'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import archiveStyles from '../blog-v1.module.css'
import styles from '../uses/uses.module.css'
import listing from '../listing.module.css'
import { splitEmphasis, splitUsesTags } from '../../../../lib/uses-labels'
import type { UsesCategory, UsesItem } from '../../../../lib/uses-service'
import { RelatedLinks } from './related-links'
import { Icon } from './ui-icon'

// 编辑界面只有站点所有者用得到，单独打包，访客不会下载。
const CategoryControls = dynamic(() => import('./uses-editor').then((module) => module.CategoryControls))
const CategoryForm = dynamic(() => import('./uses-editor').then((module) => module.CategoryForm))
const ItemControls = dynamic(() => import('./uses-editor').then((module) => module.ItemControls))
const ItemForm = dynamic(() => import('./uses-editor').then((module) => module.ItemForm))

type Editing = { kind: 'item'; id: string } | { kind: 'newItem' } | { kind: 'category'; id: string } | { kind: 'newCategory' } | null

function ItemLink({ href, className, sponsored = false, children }: { href: string; className?: string; sponsored?: boolean; children: ReactNode }) {
  return /^https?:\/\//i.test(href) ? (
    <a className={className} href={href} target="_blank" rel={`${sponsored ? 'sponsored ' : ''}noopener noreferrer`}>
      {children}
    </a>
  ) : (
    <Link className={className} href={href}>
      {children}
    </Link>
  )
}

export function UsesCard({ item, style, children }: { item: UsesItem; style?: CSSProperties; children?: ReactNode }) {
  const tags = splitUsesTags(item.tags)
  return (
    <article className={`${styles.card} ${item.isVisible ? '' : styles.hidden}`} style={style}>
      {children}
      <div className={styles.cardHead}>
        {item.logoUrl ? (
          <img className={styles.logo} src={item.logoUrl} alt="" width="48" height="48" loading="lazy" />
        ) : (
          <span className={styles.logo} aria-hidden="true">{item.title.slice(0, 1).toUpperCase()}</span>
        )}
        <div>
          <h3>{item.title}</h3>
          {!item.isVisible && <small>已隐藏</small>}
        </div>
        {item.isAffiliate && (
          <span className={styles.affiliate} tabIndex={0} aria-describedby={`aff-${item.id}`}>
            AFF
            <span className={styles.affiliateTip} role="tooltip" id={`aff-${item.id}`}>
              下面的链接带有我的邀请码，你通过它注册，我可能会得到一点返利。介意的话可以自己搜官网注册，效果一样。
            </span>
          </span>
        )}
        <RelatedLinks links={item.relatedLinks} compact placement="fill" />
      </div>
      {(item.tagline || tags.length > 0) && (
        <div className={styles.pitch}>
          {item.tagline && <strong>{item.tagline}</strong>}
          {tags.length > 0 && (
            <ul aria-label="标签">
              {tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className={styles.description}>
        {splitEmphasis(item.description).map((part, index) =>
          part.strong ? <strong key={index}>{part.text}</strong> : <span key={index}>{part.text}</span>,
        )}
      </p>
      {item.promoNote && <p className={styles.promo}>{item.promoNote}</p>}
      {item.href && (
        <ItemLink className={styles.visit} href={item.href} sponsored={item.isAffiliate}>
          {item.ctaLabel}
          <Icon name="arrow" />
        </ItemLink>
      )}
    </article>
  )
}

export function UsesClient({ categories, items, canEdit = false }: { categories: UsesCategory[]; items: UsesItem[]; canEdit?: boolean }) {
  const [editMode, setEditMode] = useState(false)
  const [editing, setEditing] = useState<Editing>(null)
  const [picked, setPicked] = useState('')
  const publicItems = items.filter((item) => item.isVisible)
  // 访客只看到有内容的分类；编辑时所有分类都要能选中，才能往空分类里加条目。
  const shownCategories = editMode
    ? categories
    : categories.filter((category) => publicItems.some((item) => item.categoryId === category.id))
  const current = shownCategories.find((category) => category.id === picked) ?? shownCategories[0]
  const currentItems = (editMode ? items : publicItems).filter((item) => item.categoryId === current?.id)

  // 每个分类有自己的地址（/blog/uses#分类名），方便直接分享某一类。
  useEffect(() => {
    const fromHash = () => {
      const name = decodeURIComponent(window.location.hash.slice(1))
      const match = categories.find((category) => category.name === name)
      if (match) setPicked(match.id)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [categories])

  const choose = (category: UsesCategory) => {
    setPicked(category.id)
    setEditing(null)
    window.history.replaceState(null, '', `#${encodeURIComponent(category.name)}`)
  }
  const done = () => setEditing(null)

  return (
    <article>
      <section className={`${listing.head} ${styles.enter}`}>
        <div className={listing.headText}>
          <h1>我在用的。</h1>
          <span className={styles.intro}>折腾下来留在手边的服务和工具。都是我自己花钱在用，或者长期用过的。按需求挑，不必全要。</span>
        </div>
      </section>

      {(shownCategories.length > 0 || editMode) && (
        <section className={listing.toolbar} aria-label="选择分类">
          <div className={listing.chips} role="group" aria-label="分类">
            {shownCategories.map((category) => (
              <button
                className={listing.chip}
                type="button"
                aria-pressed={category.id === current?.id}
                onClick={() => choose(category)}
                key={category.id}
              >
                {category.name}{' '}
                <span>{(editMode ? items : publicItems).filter((item) => item.categoryId === category.id).length}</span>
              </button>
            ))}
            {editMode && (
              <button className={`${listing.chip} ${styles.addChip}`} type="button" onClick={() => setEditing({ kind: 'newCategory' })}>
                <Icon name="plus" />
                分类
              </button>
            )}
          </div>
        </section>
      )}

      {editMode && editing?.kind === 'newCategory' && <CategoryForm onDone={done} />}

      {current &&
        (editMode && editing?.kind === 'category' && editing.id === current.id ? (
          <CategoryForm category={current} onDone={done} />
        ) : (
          <section className={styles.category} key={`head-${current.id}`}>
            <div className={styles.categoryHead}>
              <h2>{current.name}</h2>
              {current.subtitle && <span>{current.subtitle}</span>}
              {editMode ? (
                <CategoryControls
                  category={current}
                  index={shownCategories.indexOf(current)}
                  total={shownCategories.length}
                  onEdit={() => setEditing({ kind: 'category', id: current.id })}
                />
              ) : (
                <small>{currentItems.length} 个</small>
              )}
            </div>
            {current.note && (
              <p className={styles.note}>
                <strong>我的搭配：</strong>
                {current.note}
              </p>
            )}
          </section>
        ))}

      {/* 切换分类时重新挂载，让卡片再依次浮现一遍。 */}
      <div className={styles.cards} aria-label="在用条目" key={`cards-${current?.id ?? 'empty'}`}>
        {currentItems.map((item, index) =>
          editMode && editing?.kind === 'item' && editing.id === item.id ? (
            <ItemForm item={item} categoryId={item.categoryId} categories={categories} onDone={done} key={item.id} />
          ) : (
            <UsesCard item={item} style={{ '--i': Math.min(index, 8) } as CSSProperties} key={item.id}>
              {editMode && (
                <ItemControls
                  item={item}
                  index={index}
                  total={currentItems.length}
                  onEdit={() => setEditing({ kind: 'item', id: item.id })}
                />
              )}
            </UsesCard>
          ),
        )}
        {editMode && current && (editing?.kind === 'newItem' ? (
          <ItemForm categoryId={current.id} categories={categories} onDone={done} />
        ) : (
          <button className={styles.addCard} type="button" onClick={() => setEditing({ kind: 'newItem' })}>
            <Icon name="plus" />
            添加
          </button>
        ))}
        {!editMode && currentItems.length === 0 && (
          <section className={archiveStyles.empty}>
            <h2>清单还在整理</h2>
            <p>整理好之后，我在用的服务和工具会列在这里。</p>
          </section>
        )}
      </div>

      {canEdit && (
        <button
          className={styles.editToggle}
          type="button"
          aria-pressed={editMode}
          onClick={() => {
            // 记住当前分类：编辑时调整顺序或清空条目，都不该把人带到别的分类去。
            if (current) setPicked(current.id)
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
