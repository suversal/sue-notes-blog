'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Icon } from '../../blog/components/ui-icon'
import styles from '../admin-v1.module.css'

const OUTPUT_WIDTH = 1500
const OUTPUT_HEIGHT = 600

type Point = { x: number; y: number }

function cropRect(image: HTMLImageElement, zoom: number, center: Point) {
  const sourceRatio = image.naturalWidth / image.naturalHeight
  const targetRatio = OUTPUT_WIDTH / OUTPUT_HEIGHT
  const baseWidth = sourceRatio > targetRatio ? image.naturalHeight * targetRatio : image.naturalWidth
  const baseHeight = sourceRatio > targetRatio ? image.naturalHeight : image.naturalWidth / targetRatio
  const width = baseWidth / zoom
  const height = baseHeight / zoom
  const halfX = width / image.naturalWidth / 2
  const halfY = height / image.naturalHeight / 2
  const x = Math.min(1 - halfX, Math.max(halfX, center.x))
  const y = Math.min(1 - halfY, Math.max(halfY, center.y))
  return { width, height, x, y }
}

function drawCrop(canvas: HTMLCanvasElement, image: HTMLImageElement, zoom: number, center: Point) {
  const crop = cropRect(image, zoom, center)
  const context = canvas.getContext('2d')
  if (!context) return
  context.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT)
  context.drawImage(
    image,
    crop.x * image.naturalWidth - crop.width / 2,
    crop.y * image.naturalHeight - crop.height / 2,
    crop.width,
    crop.height,
    0,
    0,
    OUTPUT_WIDTH,
    OUTPUT_HEIGHT,
  )
}

export function CoverCropper({
  file,
  onCancel,
  onConfirm,
}: {
  file: File
  onCancel: () => void
  onConfirm: (file: File) => Promise<boolean>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const dragRef = useRef<Point | null>(null)
  const [ready, setReady] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [center, setCenter] = useState<Point>({ x: 0.5, y: 0.5 })
  const [dragging, setDragging] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const url = URL.createObjectURL(file)
    const image = new Image()
    imageRef.current = null
    setReady(false)
    setError('')
    image.onload = () => {
      if (cancelled) return
      imageRef.current = image
      setError('')
      setReady(true)
    }
    image.onerror = () => {
      if (cancelled) return
      setReady(false)
      setError('无法读取这张图片，请换一张后重试。')
    }
    image.src = url
    return () => {
      cancelled = true
      image.onload = null
      image.onerror = null
      URL.revokeObjectURL(url)
    }
  }, [file])

  useEffect(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (canvas && image && ready) drawCrop(canvas, image, zoom, center)
  }, [center, ready, zoom])

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !working) onCancel()
    }
    addEventListener('keydown', close)
    return () => removeEventListener('keydown', close)
  }, [onCancel, working])

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = dragRef.current
    const image = imageRef.current
    if (!previous || !image) return
    const bounds = event.currentTarget.getBoundingClientRect()
    setCenter((current) => {
      const crop = cropRect(image, zoom, current)
      const next = {
        x: current.x - ((event.clientX - previous.x) / bounds.width) * (crop.width / image.naturalWidth),
        y: current.y - ((event.clientY - previous.y) / bounds.height) * (crop.height / image.naturalHeight),
      }
      const clamped = cropRect(image, zoom, next)
      return { x: clamped.x, y: clamped.y }
    })
    dragRef.current = { x: event.clientX, y: event.clientY }
  }

  const confirm = async () => {
    const canvas = canvasRef.current
    if (!canvas || !ready) return
    setWorking(true)
    setError('')
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error('crop')), 'image/webp', 0.92)
      })
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '-') || 'article-cover'
      const uploaded = await onConfirm(new File([blob], `${name}-5x2.webp`, { type: 'image/webp' }))
      if (!uploaded) setError('裁剪已完成，但上传失败，请重试。')
    } catch {
      setError('生成裁剪图片失败，请重新选择图片。')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div
      className={styles.modalOverlay}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !working) onCancel()
      }}
    >
      <section className={`${styles.modal} ${styles.cropDialog}`} role="dialog" aria-modal="true" aria-labelledby="cover-crop-title">
        <header>
          <div>
            <h2 id="cover-crop-title">裁剪文章封面</h2>
            <p>拖动图片调整位置，最终保存为 5:2。</p>
          </div>
          <button type="button" aria-label="关闭裁剪" disabled={working} onClick={onCancel}>
            <Icon name="close" />
          </button>
        </header>
        <div
          className={styles.cropViewport}
          data-dragging={dragging}
          onPointerDown={(event) => {
            if (!ready || working) return
            event.currentTarget.setPointerCapture(event.pointerId)
            dragRef.current = { x: event.clientX, y: event.clientY }
            setDragging(true)
          }}
          onPointerMove={move}
          onPointerUp={(event) => {
            dragRef.current = null
            setDragging(false)
            event.currentTarget.releasePointerCapture(event.pointerId)
          }}
          onPointerCancel={() => {
            dragRef.current = null
            setDragging(false)
          }}
        >
          <canvas ref={canvasRef} width={OUTPUT_WIDTH} height={OUTPUT_HEIGHT} aria-label="5:2 封面裁剪预览" />
          {!ready && !error && <span>正在读取图片…</span>}
        </div>
        <label className={styles.cropZoom}>
          <span>缩放</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            disabled={!ready || working}
            onChange={(event) => {
              const nextZoom = Number(event.target.value)
              setZoom(nextZoom)
              const image = imageRef.current
              if (image) {
                const clamped = cropRect(image, nextZoom, center)
                setCenter({ x: clamped.x, y: clamped.y })
              }
            }}
          />
          <output>{Math.round(zoom * 100)}%</output>
        </label>
        <small>输出尺寸 1500 × 600，适合 X 文章封面和博客列表。</small>
        {error && <p className={styles.fieldError} role="alert">{error}</p>}
        <div className={styles.modalActions}>
          <button type="button" disabled={working} onClick={onCancel}>取消</button>
          <button className={styles.primaryButton} type="button" disabled={!ready || working} onClick={() => void confirm()}>
            {working ? '正在处理…' : '确认裁剪并上传'}
          </button>
        </div>
      </section>
    </div>
  )
}
