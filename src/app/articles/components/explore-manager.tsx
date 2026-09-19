'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { exploreKindLabels } from '../../../lib/explore-labels'
import type { ExploreItem, ExploreKind } from '../../../lib/explore-service'
import { deleteExploreItemFromWeb, saveExploreItemFromWeb, type ExploreActionState } from '../actions'
import { Icon } from '../../blog/components/ui-icon'
import styles from '../admin-v1.module.css'

const initialState: ExploreActionState = { ok: false, message: '' }
type Dialog = { kind: 'create' } | { kind: 'edit' | 'delete'; item: ExploreItem }

function ItemDialog({ dialog, onClose }: { dialog: Dialog; onClose: () => void }) {
  const router = useRouter()
  const isDelete = dialog.kind === 'delete'
  const item = dialog.kind === 'create' ? undefined : dialog.item
  const [state, action, pending] = useActionState(isDelete ? deleteExploreItemFromWeb : saveExploreItemFromWeb, initialState)
  const [kind, setKind] = useState<ExploreKind>(item?.kind ?? 'project')
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!state.ok) return
    router.refresh()
    onClose()
  }, [onClose, router, state.ok])

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    const timer = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>('[autofocus], button')?.focus(), 0)
    return () => {
      window.clearTimeout(timer)
      before?.focus()
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose()
      if (event.key === 'Tab' && dialogRef.current) {
        const controls = [...dialogRef.current.querySelectorAll<HTMLElement>('button,input,select,textarea,[tabindex="0"]')].filter((control) => !control.hasAttribute('disabled'))
        const first = controls[0]
        const last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, pending])

  return (
    <div className={styles.modalOverlay} onMouseDown={(event) => event.target === event.currentTarget && !pending && onClose()}>
      <section ref={dialogRef} className={`${styles.modal} ${styles.exploreDialog}`} role="dialog" aria-modal="true" aria-labelledby="explore-dialog-title">
        <header>
          <div>
            <h2 id="explore-dialog-title">{isDelete ? '删除探索条目' : item ? '编辑探索条目' : '新增探索条目'}</h2>
            {!isDelete && <p>{item ? '修改后会同步到前台探索页。' : '填写一个真实项目、站点或收藏。'}</p>}
          </div>
          <button type="button" aria-label="关闭" disabled={pending} onClick={onClose}><Icon name="close" /></button>
        </header>
        <form action={action} className={styles.exploreForm}>
          {item && <input type="hidden" name="itemId" value={item.id} />}
          {isDelete ? (
            <>
              <p>确定删除“<strong>{item?.title}</strong>”吗？删除后前台会立即移除，且无法恢复。</p>
              <div className={styles.confirmTitle}>{item && exploreKindLabels[item.kind]} · {item?.title}</div>
            </>
          ) : (
            <>
              <div className={styles.exploreFieldGrid}>
                <label>
                  <span>分类</span>
                  <select name="kind" value={kind} onChange={(event) => setKind(event.target.value as ExploreKind)}>
                    {Object.entries(exploreKindLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                </label>
                <label>
                  <span>排序</span>
                  <input name="sortOrder" type="number" min="0" max="9999" step="1" required defaultValue={item?.sortOrder ?? 100} />
                  <small>数字越小越靠前。</small>
                </label>
              </div>
              <label>
                <span>名称</span>
                <input name="title" required maxLength={80} defaultValue={item?.title} autoFocus />
              </label>
              <label>
                <span>简介</span>
                <textarea name="description" required maxLength={240} defaultValue={item?.description} />
              </label>
              <label>
                <span>访问地址</span>
                <input name="href" required maxLength={500} defaultValue={item?.href} placeholder="https://example.com 或 /blog" />
                <small>外部 http(s) 地址会在新标签页打开；以 / 开头的站内地址直接跳转。</small>
              </label>
              <div className={styles.exploreFieldGrid}>
                <label>
                  <span>补充信息</span>
                  <input name="meta" required maxLength={100} defaultValue={item?.meta} placeholder="域名或项目类型" />
                </label>
                <label>
                  <span>状态文字</span>
                  <input name="status" required maxLength={40} defaultValue={item?.status} placeholder="持续维护" />
                </label>
              </div>
              <div className={styles.exploreChecks}>
                <label><input name="isVisible" type="checkbox" defaultChecked={item?.isVisible ?? true} /><span>在前台显示</span></label>
                <label><input name="highlightStatus" type="checkbox" defaultChecked={item?.highlightStatus ?? false} /><span>用强调色突出状态</span></label>
              </div>
            </>
          )}
          {state.message && !state.ok && <p className={styles.error} role="alert">{state.message}</p>}
          <div className={styles.modalActions}>
            <button type="button" disabled={pending} onClick={onClose}>取消</button>
            <button className={isDelete ? styles.dangerButton : styles.primaryButton} disabled={pending} type="submit">
              {pending ? '正在保存…' : isDelete ? '确认删除' : '保存条目'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export function ExploreManager({ items }: { items: ExploreItem[] }) {
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const visibleCount = items.filter((item) => item.isVisible).length
  const closeDialog = () => setDialog(null)
  return (
    <>
      <div className={styles.breadcrumb}><span>站点 / 探索管理</span><span>前台实时读取</span></div>
      <header className={styles.pageHead}>
        <div><h1>探索管理</h1><p>维护公开项目、个人站点和日常收藏。</p></div>
        <button className={styles.primaryButton} type="button" onClick={() => setDialog({ kind: 'create' })}><Icon name="plus" />新增条目</button>
      </header>
      <div className={styles.exploreSummary}>
        <span>{items.length} 个条目 · {visibleCount} 个正在显示</span>
        <a href="/blog/explore" target="_blank" rel="noopener noreferrer">查看探索页 <Icon name="external" /></a>
      </div>
      {items.length ? (
        <div className={styles.exploreTable} role="table" aria-label="探索条目管理列表">
          <div className={styles.exploreHead} role="row"><span>排序</span><span>条目</span><span>分类</span><span>状态</span><span>显示</span><span>操作</span></div>
          {items.map((item) => (
            <div className={styles.exploreRow} role="row" key={item.id}>
              <span className={styles.exploreOrder}>{String(item.sortOrder).padStart(2, '0')}</span>
              <div><strong>{item.title}</strong><small>{exploreKindLabels[item.kind]} · {item.meta}</small></div>
              <span>{exploreKindLabels[item.kind]}</span>
              <span>{item.status}</span>
              <span className={`${styles.status} ${item.isVisible ? styles.published : styles.draft}`}>{item.isVisible ? '显示中' : '已隐藏'}</span>
              <div className={styles.exploreActions}><button type="button" onClick={() => setDialog({ kind: 'edit', item })}>编辑</button><button className={styles.dangerText} type="button" onClick={() => setDialog({ kind: 'delete', item })}>删除</button></div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}><h2>还没有探索条目。</h2><p>新增第一条真实项目、站点或收藏，前台会自动显示。</p><button type="button" onClick={() => setDialog({ kind: 'create' })}>新增条目</button></div>
      )}
      <p className={styles.note}>前台分类数量会根据正在显示的条目自动计算；隐藏条目不会出现在探索页。</p>
      {dialog && <ItemDialog key={`${dialog.kind}-${'item' in dialog ? dialog.item.id : 'new'}`} dialog={dialog} onClose={closeDialog} />}
    </>
  )
}
