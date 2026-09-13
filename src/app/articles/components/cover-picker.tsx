'use client'

import { useRef, useState } from 'react'
import { Plate } from '../../blog/components/plate'
import { Icon } from '../../blog/components/ui-icon'
import { StudioSelect } from '../../components/studio-select'
import styles from '../admin-v1.module.css'
import { CoverCropper } from './cover-cropper'

export type CoverValue = {
  style: 'none' | 'notes' | 'grid' | 'cache'
  image?: { id: string; url: string; alt: string }
}
export function CoverPicker({
  value,
  onChange,
  onBusyChange,
}: {
  value: CoverValue
  onChange: (value: CoverValue) => void
  onBusyChange: (busy: boolean) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cropFile, setCropFile] = useState<File>()
  const upload = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(file.type)) {
      setError('请选择 JPG、PNG、WebP、GIF 或 AVIF 图片。')
      return false
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('封面不能超过 10 MB。')
      return false
    }
    setBusy(true)
    onBusyChange(true)
    setError('')
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('alt', '文章封面')
      const response = await fetch('/api/editor/images', { method: 'POST', body })
      const data = await response.json()
      if (!response.ok || !data.id || !data.url)
        throw new Error(data.message || '封面上传失败，请重试。')
      onChange({ style: 'none', image: { id: data.id, url: data.url, alt: data.alt } })
      return true
    } catch (error) {
      setError(error instanceof Error ? error.message : '封面上传失败，请重试。')
      return false
    } finally {
      setBusy(false)
      onBusyChange(false)
      if (input.current) input.current.value = ''
    }
  }
  return (
    <div className={styles.coverPicker}>
      <span>文章封面</span>
      <input type="hidden" name="coverStyle" value={value.style} />
      <input type="hidden" name="coverImage" value={value.image?.id || ''} />
      <input
        ref={input}
        className={styles.srOnly}
        type="file"
        tabIndex={-1}
        aria-label="选择文章封面文件"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.currentTarget.value = ''
          if (!file) return
          if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(file.type)) {
            setError('请选择 JPG、PNG、WebP、GIF 或 AVIF 图片。')
            return
          }
          if (file.size > 10 * 1024 * 1024) {
            setError('封面不能超过 10 MB。')
            return
          }
          setError('')
          setCropFile(file)
        }}
      />
      {value.image ? (
        <img className={styles.coverPreview} src={value.image.url} alt="当前文章封面" />
      ) : value.style !== 'none' ? (
        <Plate type={value.style} compact />
      ) : null}
      <button
        type="button"
        className={styles.coverUpload}
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <Icon name="image" />
        {busy ? '正在上传封面…' : value.image ? '更换封面' : '上传自定义封面'}
      </button>
      <small>JPG、PNG、WebP、GIF、AVIF，最大 10 MB。</small>
      <StudioSelect
        label="封面样式"
        disabled={busy}
        value={value.image ? 'custom' : value.style}
        options={[
          ...(value.image ? [{ value: 'custom', label: '已上传的封面' }] : []),
          { value: 'none', label: '无封面 · 纯文字' },
          { value: 'notes', label: '手记 · 纸张' },
          { value: 'grid', label: '创造 · 网格' },
          { value: 'cache', label: '工程 · 路径' },
        ]}
        onChange={(style) => {
          if (style !== 'custom') onChange({ style: style as CoverValue['style'] })
        }}
      />
      {error && (
        <p className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
      {cropFile && (
        <CoverCropper
          file={cropFile}
          onCancel={() => setCropFile(undefined)}
          onConfirm={async (file) => {
            const uploaded = await upload(file)
            if (uploaded) setCropFile(undefined)
            return uploaded
          }}
        />
      )}
    </div>
  )
}
