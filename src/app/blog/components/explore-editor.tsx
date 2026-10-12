'use client'

import { useState } from 'react'
import editor from '../uses/uses.module.css'
import { exploreKindLabels } from '../../../lib/explore-labels'
import type { ExploreItem, ExploreKind } from '../../../lib/explore-service'
import {
  deleteExploreItemFromWeb,
  moveExploreItemFromWeb,
  saveExploreItemFromWeb,
  setExploreItemVisibleFromWeb,
} from '../../articles/actions'
import { ConfirmDelete, FormFooter, LinksField, LogoField, useQuickAction, useSavedForm } from './uses-editor'
import { Icon } from './ui-icon'

// 表单和操作条的样式与「在用」页共用同一套（uses.module.css 里「编辑界面」那一段）。

export function ExploreItemControls({ item, index, total, onEdit }: { item: ExploreItem; index: number; total: number; onEdit: () => void }) {
  const { pending, error, run } = useQuickAction()
  return (
    <div className={editor.controls} role="group" aria-label={`管理 ${item.title}`}>
      <button type="button" aria-label="往前移" disabled={pending || index === 0} onClick={() => run(() => moveExploreItemFromWeb(item.id, -1))}>
        <Icon name="back" />
      </button>
      <button type="button" aria-label="往后移" disabled={pending || index === total - 1} onClick={() => run(() => moveExploreItemFromWeb(item.id, 1))}>
        <Icon name="arrow" />
      </button>
      <button type="button" disabled={pending} onClick={onEdit}>
        编辑
      </button>
      <button type="button" disabled={pending} onClick={() => run(() => setExploreItemVisibleFromWeb(item.id, !item.isVisible))}>
        {item.isVisible ? '隐藏' : '显示'}
      </button>
      <ConfirmDelete pending={pending} onConfirm={() => run(() => deleteExploreItemFromWeb(item.id))} />
      {error && <p role="alert">{error}</p>}
    </div>
  )
}

const metaLabels: Record<ExploreKind, { label: string; placeholder: string }> = {
  project: { label: '标签（可选，用顿号分隔）', placeholder: 'iOS、开发工具' },
  site: { label: '补充信息（可选）', placeholder: '域名，例如 radar.suversal.com' },
  saved: { label: '类型（可选）', placeholder: '网站 / 仓库 / 文章 / 工具' },
}

export function ExploreItemForm({ item, kind: initialKind, onDone }: { item?: ExploreItem; kind: ExploreKind; onDone: () => void }) {
  const { state, formAction, pending } = useSavedForm(saveExploreItemFromWeb, onDone)
  const [uploading, setUploading] = useState(false)
  const [kind, setKind] = useState<ExploreKind>(item?.kind ?? initialKind)
  return (
    <form className={`${editor.card} ${editor.form}`} action={formAction} aria-label={item ? `编辑 ${item.title}` : '新增条目'}>
      {item && <input type="hidden" name="itemId" value={item.id} />}
      {kind !== 'saved' && <LogoField initial={item?.logoUrl ?? ''} label="图标" onUploadingChange={setUploading} />}
      <div className={editor.fieldRow}>
        <label>
          <span>名称</span>
          <input name="title" required maxLength={80} defaultValue={item?.title} autoFocus />
        </label>
        <label>
          <span>所属分组</span>
          <select name="kind" value={kind} onChange={(event) => setKind(event.target.value as ExploreKind)}>
            {Object.entries(exploreKindLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span>说明</span>
        <textarea name="description" required maxLength={240} rows={3} defaultValue={item?.description} />
      </label>
      <label>
        <span>访问地址</span>
        <input name="href" required maxLength={500} defaultValue={item?.href} placeholder="https://github.com/… 或 /blog" />
      </label>
      <label>
        <span>{metaLabels[kind].label}</span>
        <input name="meta" maxLength={100} defaultValue={item?.meta} placeholder={metaLabels[kind].placeholder} />
      </label>
      <LinksField initial={item?.relatedLinks ?? []} />
      {kind === 'project' ? (
        <label className={editor.check}>
          <input name="isFeatured" type="checkbox" defaultChecked={item?.isFeatured ?? false} />
          <span>显示 Star 和 Fork（排在最前面）</span>
        </label>
      ) : null}
      <div className={editor.fieldRow}>
        <label>
          <span>状态文字（可选）</span>
          <input name="status" maxLength={40} defaultValue={item?.status} placeholder="持续维护 / 运行中" />
        </label>
        <label className={editor.check}>
          <input name="highlightStatus" type="checkbox" defaultChecked={item?.highlightStatus ?? false} />
          <span>用绿色突出状态</span>
        </label>
      </div>
      <label className={editor.check}>
        <input name="isVisible" type="checkbox" defaultChecked={item?.isVisible ?? true} />
        <span>对访客显示</span>
      </label>
      <FormFooter state={state} pending={pending} uploading={uploading} onCancel={onDone} />
    </form>
  )
}
