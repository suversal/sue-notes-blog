'use client'

import { useState } from 'react'
import styles from '../friends/friends.module.css'
import usesStyles from '../uses/uses.module.css'
import type { FriendCard, FriendLink } from '../../../../lib/friend-links-service'
import { deleteFriendLinkFromWeb, moveFriendLinkFromWeb, saveFriendCardFromWeb, saveFriendLinkFromWeb, setFriendLinkVisibleFromWeb } from '../../../(studio)/articles/actions'
import { ConfirmDelete, FormFooter, LogoField, useQuickAction, useSavedForm } from './uses-editor'
import { Icon } from './ui-icon'

export function FriendControls({ friend, index, total, onEdit }: { friend: FriendLink; index: number; total: number; onEdit: () => void }) {
  const { pending, error, run } = useQuickAction()
  return (
    <div className={`${usesStyles.controls} ${styles.controls}`} role="group" aria-label={`管理 ${friend.name}`}>
      <button type="button" aria-label="往前移" disabled={pending || index === 0} onClick={() => run(() => moveFriendLinkFromWeb(friend.id, -1))}>
        <Icon name="back" />
      </button>
      <button type="button" aria-label="往后移" disabled={pending || index === total - 1} onClick={() => run(() => moveFriendLinkFromWeb(friend.id, 1))}>
        <Icon name="arrow" />
      </button>
      <button type="button" disabled={pending} onClick={onEdit}>
        编辑
      </button>
      <button type="button" disabled={pending} onClick={() => run(() => setFriendLinkVisibleFromWeb(friend.id, !friend.isVisible))}>
        {friend.isVisible ? '隐藏' : '显示'}
      </button>
      <ConfirmDelete pending={pending} onConfirm={() => run(() => deleteFriendLinkFromWeb(friend.id))} />
      {error && <p role="alert">{error}</p>}
    </div>
  )
}

// 新增时结识日期默认填今天（按上海时区）。
function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function FriendForm({ friend, onDone }: { friend?: FriendLink; onDone: () => void }) {
  const { state, formAction, pending } = useSavedForm(saveFriendLinkFromWeb, onDone)
  const [uploading, setUploading] = useState(false)
  return (
    <form className={`${usesStyles.form} ${styles.form}`} action={formAction} aria-label={friend ? `编辑 ${friend.name}` : '新增友邻'}>
      {friend && <input type="hidden" name="friendId" value={friend.id} />}
      <LogoField initial={friend?.avatarUrl ?? ''} label="头像" onUploadingChange={setUploading} />
      <div className={usesStyles.fieldRow}>
        <label>
          <span>站名</span>
          <input name="name" required maxLength={40} defaultValue={friend?.name} autoFocus />
        </label>
        <label>
          <span>站长（可选）</span>
          <input name="author" maxLength={40} defaultValue={friend?.author} />
        </label>
      </div>
      <label>
        <span>网址</span>
        <input name="url" type="url" required maxLength={500} defaultValue={friend?.url} placeholder="https://…" />
      </label>
      <label>
        <span>一句话介绍</span>
        <input name="motto" required maxLength={80} defaultValue={friend?.motto} placeholder="对方怎么介绍自己的站" />
      </label>
      <label>
        <span>推荐语（可选，卡片上会用引号包起来）</span>
        <input name="note" maxLength={120} defaultValue={friend?.note} placeholder="我为什么常去这个站" />
      </label>
      <div className={usesStyles.fieldRow}>
        <label>
          <span>结识日期（印在邮戳上）</span>
          <input name="metAt" type="date" required defaultValue={friend?.metAt ?? today()} />
        </label>
        <label className={usesStyles.check}>
          <input name="isVisible" type="checkbox" defaultChecked={friend?.isVisible ?? true} />
          <span>对访客显示</span>
        </label>
      </div>
      <FormFooter state={state} pending={pending} uploading={uploading} onCancel={onDone} />
    </form>
  )
}

/** 信纸上的本站信息。每项都能留空，留空就用占位符里的默认值。 */
export function FriendCardForm({ card, defaults, onDone }: { card: FriendCard; defaults: FriendCard; onDone: () => void }) {
  const { state, formAction, pending } = useSavedForm(saveFriendCardFromWeb, onDone)
  return (
    <form className={`${usesStyles.form} ${styles.form} ${styles.cardForm}`} action={formAction} aria-label="编辑信纸">
      <p className={styles.formHint}>这几项会出现在「致新朋友」信纸上，供别人复制。留空就用灰色的默认值。</p>
      <label>
        <span>站名</span>
        <input name="name" maxLength={40} defaultValue={card.name} placeholder={defaults.name} autoFocus />
      </label>
      <label>
        <span>地址</span>
        <input name="url" type="url" maxLength={500} defaultValue={card.url} placeholder={defaults.url} />
      </label>
      <label>
        <span>头像地址</span>
        <input name="avatar" type="url" maxLength={500} defaultValue={card.avatar} placeholder={defaults.avatar} />
      </label>
      <label>
        <span>一句话（建议 20 字以内，信纸上保持一行）</span>
        <input name="motto" maxLength={40} defaultValue={card.motto} placeholder={defaults.motto} />
      </label>
      <FormFooter state={state} pending={pending} onCancel={onDone} />
    </form>
  )
}
