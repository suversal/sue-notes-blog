'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../uses/uses.module.css'
import type { UsesLink } from '../../../../lib/uses-labels'
import type { UsesCategory, UsesItem } from '../../../../lib/uses-service'
import {
  deleteUsesCategoryFromWeb,
  deleteUsesItemFromWeb,
  moveUsesCategoryFromWeb,
  moveUsesItemFromWeb,
  saveUsesCategoryFromWeb,
  saveUsesItemFromWeb,
  setUsesItemVisibleFromWeb,
  type UsesActionState,
} from '../../../(studio)/articles/actions'
import { Icon } from './ui-icon'

export const initialState: UsesActionState = { ok: false, message: '' }

/** 运行一个立即生效的操作（移动、隐藏、删除），成功后刷新页面数据。 */
export function useQuickAction() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const run = (action: () => Promise<UsesActionState>) =>
    startTransition(async () => {
      const result = await action()
      setError(result.ok ? '' : result.message)
      if (result.ok) router.refresh()
    })
  return { pending, error, run }
}

export function ConfirmDelete({ pending, onConfirm }: { pending: boolean; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false)
  return asking ? (
    <>
      <button className={styles.danger} type="button" disabled={pending} onClick={onConfirm}>
        确认删除
      </button>
      <button type="button" disabled={pending} onClick={() => setAsking(false)}>
        取消
      </button>
    </>
  ) : (
    <button type="button" disabled={pending} onClick={() => setAsking(true)}>
      删除
    </button>
  )
}

export function ItemControls({ item, index, total, onEdit }: { item: UsesItem; index: number; total: number; onEdit: () => void }) {
  const { pending, error, run } = useQuickAction()
  return (
    <div className={styles.controls} role="group" aria-label={`管理 ${item.title}`}>
      <button type="button" aria-label="往前移" disabled={pending || index === 0} onClick={() => run(() => moveUsesItemFromWeb(item.id, -1))}>
        <Icon name="back" />
      </button>
      <button type="button" aria-label="往后移" disabled={pending || index === total - 1} onClick={() => run(() => moveUsesItemFromWeb(item.id, 1))}>
        <Icon name="arrow" />
      </button>
      <button type="button" disabled={pending} onClick={onEdit}>
        编辑
      </button>
      <button type="button" disabled={pending} onClick={() => run(() => setUsesItemVisibleFromWeb(item.id, !item.isVisible))}>
        {item.isVisible ? '隐藏' : '显示'}
      </button>
      <ConfirmDelete pending={pending} onConfirm={() => run(() => deleteUsesItemFromWeb(item.id))} />
      {error && <p role="alert">{error}</p>}
    </div>
  )
}

export function CategoryControls({ category, index, total, onEdit }: { category: UsesCategory; index: number; total: number; onEdit: () => void }) {
  const { pending, error, run } = useQuickAction()
  return (
    <div className={`${styles.controls} ${styles.categoryControls}`} role="group" aria-label={`管理分类 ${category.name}`}>
      <button type="button" aria-label="分类往前移" disabled={pending || index === 0} onClick={() => run(() => moveUsesCategoryFromWeb(category.id, -1))}>
        <Icon name="back" />
      </button>
      <button type="button" aria-label="分类往后移" disabled={pending || index === total - 1} onClick={() => run(() => moveUsesCategoryFromWeb(category.id, 1))}>
        <Icon name="arrow" />
      </button>
      <button type="button" disabled={pending} onClick={onEdit}>
        编辑分类
      </button>
      <ConfirmDelete pending={pending} onConfirm={() => run(() => deleteUsesCategoryFromWeb(category.id))} />
      {error && <p role="alert">{error}</p>}
    </div>
  )
}

export function useSavedForm(action: typeof saveUsesItemFromWeb, onDone: () => void) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, initialState)
  useEffect(() => {
    if (!state.ok) return
    router.refresh()
    onDone()
  }, [onDone, router, state])
  return { state, formAction, pending }
}

export function FormFooter({ state, pending, uploading = false, onCancel }: { state: UsesActionState; pending: boolean; uploading?: boolean; onCancel: () => void }) {
  return (
    <>
      {state.message && !state.ok && (
        <p className={styles.formError} role="alert">
          {state.message}
        </p>
      )}
      <div className={styles.formActions}>
        <button className={styles.save} type="submit" disabled={pending || uploading}>
          {pending ? '正在保存…' : '保存'}
        </button>
        <button type="button" disabled={pending} onClick={onCancel}>
          取消
        </button>
      </div>
    </>
  )
}

export function CategoryForm({ category, onDone }: { category?: UsesCategory; onDone: () => void }) {
  const { state, formAction, pending } = useSavedForm(saveUsesCategoryFromWeb, onDone)
  return (
    <form className={`${styles.form} ${styles.categoryForm}`} action={formAction} aria-label={category ? '编辑分类' : '新增分类'}>
      {category && <input type="hidden" name="categoryId" value={category.id} />}
      <div className={styles.fieldRow}>
        <label>
          <span>分类名称</span>
          <input name="name" required maxLength={20} defaultValue={category?.name} placeholder="例如：服务器" autoFocus />
        </label>
        <label>
          <span>副标题（可选）</span>
          <input name="subtitle" maxLength={40} defaultValue={category?.subtitle} placeholder="例如：备用节点、自建服务" />
        </label>
      </div>
      <label>
        <span>我的搭配（可选）</span>
        <textarea name="note" maxLength={240} rows={2} defaultValue={category?.note} placeholder="一两句话：这一类里的几个你是怎么组合着用的。" />
      </label>
      <FormFooter state={state} pending={pending} onCancel={onDone} />
    </form>
  )
}

// 上传完成前表单里还是旧地址，所以把上传状态报给表单，让它先别保存。
export function LogoField({ initial, label = 'Logo', onUploadingChange }: { initial: string; label?: string; onUploadingChange?: (uploading: boolean) => void }) {
  const [url, setUrl] = useState(initial)
  const [status, setStatus] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const upload = async (file: File | undefined) => {
    if (!file) return
    setStatus('正在上传…')
    onUploadingChange?.(true)
    const body = new FormData()
    body.set('file', file)
    body.set('alt', label)
    try {
      const response = await fetch('/api/editor/images', { method: 'POST', body })
      const result = (await response.json()) as { url?: string; message?: string }
      if (!response.ok || !result.url) throw new Error(result.message || '图片上传失败，请稍后重试。')
      setUrl(result.url)
      setStatus('')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '图片上传失败，请稍后重试。')
    } finally {
      onUploadingChange?.(false)
    }
  }
  return (
    <div className={styles.logoField}>
      <input type="hidden" name="logoUrl" value={url} />
      <button className={styles.logo} type="button" aria-label={`上传${label}`} onClick={() => input.current?.click()}>
        {url ? <img src={url} alt="" /> : <Icon name="image" />}
      </button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" hidden onChange={(event) => upload(event.target.files?.[0])} />
      <div>
        <button type="button" onClick={() => input.current?.click()}>
          {url ? `更换${label}` : `上传${label}`}
        </button>
        {url && (
          <button type="button" onClick={() => setUrl('')}>
            移除
          </button>
        )}
        {status && <small role="status">{status}</small>}
      </div>
    </div>
  )
}

export function LinksField({ initial }: { initial: UsesLink[] }) {
  const [rows, setRows] = useState(() => initial.map((link, index) => ({ ...link, key: index })))
  const nextKey = useRef(initial.length)
  return (
    <fieldset className={styles.linksField}>
      <legend>相关文章（可选）</legend>
      {rows.map((row) => (
        <div key={row.key}>
          <input name="relatedLabel" maxLength={80} defaultValue={row.label} placeholder="标题" aria-label="相关文章标题" />
          <input name="relatedHref" maxLength={500} defaultValue={row.href} placeholder="https://… 或 /blog/…" aria-label="相关文章链接" />
          <button type="button" aria-label="移除这条相关文章" onClick={() => setRows((value) => value.filter((item) => item.key !== row.key))}>
            <Icon name="close" />
          </button>
        </div>
      ))}
      {rows.length < 8 && (
        <button type="button" onClick={() => setRows((value) => [...value, { label: '', href: '', key: (nextKey.current += 1) }])}>
          <Icon name="plus" />
          添加一篇
        </button>
      )}
    </fieldset>
  )
}

export function ItemForm({ item, categoryId, categories, onDone }: { item?: UsesItem; categoryId: string; categories: UsesCategory[]; onDone: () => void }) {
  const { state, formAction, pending } = useSavedForm(saveUsesItemFromWeb, onDone)
  const [uploading, setUploading] = useState(false)
  return (
    <form className={`${styles.card} ${styles.form}`} action={formAction} aria-label={item ? `编辑 ${item.title}` : '新增条目'}>
      {item && <input type="hidden" name="itemId" value={item.id} />}
      <LogoField initial={item?.logoUrl ?? ''} onUploadingChange={setUploading} />
      {/* 卡片上不再展示「在用 / 用过」，表单里也不用选；保留原值，免得改动已有数据。 */}
      <input type="hidden" name="status" value={item?.status ?? 'using'} />
      <label>
        <span>名称</span>
        <input name="title" required maxLength={80} defaultValue={item?.title} autoFocus />
      </label>
      <label>
        <span>一句卖点（可选）</span>
        <input name="tagline" maxLength={80} defaultValue={item?.tagline} placeholder="例如：PAYG 账户有 4C24G 的免费额度" />
      </label>
      <label>
        <span>标签（可选，用顿号分隔）</span>
        <input name="tags" maxLength={120} defaultValue={item?.tags} placeholder="ARM、免费额度、需要信用卡" />
      </label>
      <label>
        <span>说明（重点词写成 **这样** 会加粗）</span>
        <textarea name="description" required maxLength={600} rows={4} defaultValue={item?.description} />
      </label>
      <LinksField initial={item?.relatedLinks ?? []} />
      <div className={styles.fieldRow}>
        <label>
          <span>访问地址（留空则不显示按钮）</span>
          <input name="href" maxLength={500} defaultValue={item?.href} placeholder="https://…" />
        </label>
        <label>
          <span>按钮文字</span>
          <input name="ctaLabel" maxLength={12} defaultValue={item?.ctaLabel ?? '去官网'} placeholder="注册 / 购买 / 下载" />
        </label>
      </div>
      <label className={styles.check}>
        <input name="isAffiliate" type="checkbox" defaultChecked={item?.isAffiliate ?? false} />
        <span>访问地址是邀请链接</span>
      </label>
      <label>
        <span>优惠说明（可选）</span>
        <input name="promoNote" maxLength={200} defaultValue={item?.promoNote} placeholder="通过邀请链接注册能得到什么" />
      </label>
      <div className={styles.fieldRow}>
        <label>
          <span>所属分类</span>
          <select name="categoryId" defaultValue={item?.categoryId ?? categoryId}>
            {categories.map((category) => (
              <option value={category.id} key={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.check}>
          <input name="isVisible" type="checkbox" defaultChecked={item?.isVisible ?? true} />
          <span>对访客显示</span>
        </label>
      </div>
      <FormFooter state={state} pending={pending} uploading={uploading} onCancel={onDone} />
    </form>
  )
}
