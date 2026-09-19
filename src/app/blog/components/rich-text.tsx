/* eslint-disable @next/next/no-img-element */
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedUploadNode } from '@payloadcms/richtext-lexical'
import type { SerializedCodeNode } from '@lexical/code'
import type { SerializedLexicalNode } from 'lexical'
import { createElement, type CSSProperties } from 'react'
import { linkifyArticleContentUrls, type ArticleContent } from '../../../lib/article-content-data'
import styles from '../blog-v1.module.css'
import { CopyableCodeBlock } from './copyable-code-block'

type SerializedTextContainer = SerializedLexicalNode & { children?: SerializedLexicalNode[]; text?: string }

function serializedText(node: SerializedTextContainer): string {
  if (node.type === 'linebreak') return '\n'
  if (node.type === 'tab') return '\t'
  if (typeof node.text === 'string') return node.text
  return Array.isArray(node.children) ? node.children.map((child) => serializedText(child as SerializedTextContainer)).join('') : ''
}

function positiveImageSize(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null
}

function imageScale(value: unknown) {
  return value === 25 || value === 50 || value === 75 || value === 100 ? value : null
}

function imageAlignment(value: unknown) {
  return value === 'left' || value === 'right' ? value : 'center'
}

function renderArticleUpload(node: SerializedUploadNode) {
  if (!node.value || typeof node.value !== 'object') return null
  const upload = node.value as unknown as Record<string, unknown>
  const url = typeof upload.url === 'string' ? upload.url : ''
  const filename = typeof upload.filename === 'string' ? upload.filename : '附件'
  const mimeType = typeof upload.mimeType === 'string' ? upload.mimeType : ''
  if (!url) return null
  if (!mimeType.startsWith('image/')) return <a href={url} rel="noopener noreferrer">{filename}</a>

  const fields = node.fields ?? {}
  const alt = typeof fields.alt === 'string'
    ? fields.alt
    : typeof upload.alt === 'string' ? upload.alt : filename
  const sourceWidth = positiveImageSize(upload.width) ?? undefined
  const sourceHeight = positiveImageSize(upload.height) ?? undefined
  const displayWidth = positiveImageSize(fields.displayWidth)
  const displayHeight = positiveImageSize(fields.displayHeight)
  const displayScale = imageScale(fields.displayScale)
  const displayAlignment = imageAlignment(fields.displayAlignment)
  const usesCustomFrame = fields.displayScale === 'custom' && Boolean(displayWidth)

  if (!displayScale && !usesCustomFrame) return <img alt={alt} height={sourceHeight} src={url} width={sourceWidth} />

  const frameStyle: CSSProperties = {
    marginLeft: displayAlignment === 'left' ? 0 : 'auto',
    marginRight: displayAlignment === 'right' ? 0 : 'auto',
    width: displayScale ? `${displayScale}%` : displayWidth ?? undefined,
  }
  if (usesCustomFrame && displayWidth && displayHeight) frameStyle.aspectRatio = `${displayWidth} / ${displayHeight}`
  return (
    <figure className={`${styles.articleImageFrame}${usesCustomFrame ? ` ${styles.articleImageCustom}` : ''}`} style={frameStyle}>
      <img alt={alt} height={sourceHeight} src={url} width={sourceWidth} />
    </figure>
  )
}

export function ArticleRichText({ content }: { content: ArticleContent }) {
  return (
    <RichText
      className={styles.prose ?? 'article-richtext'}
      data={linkifyArticleContentUrls(content)}
      converters={({ defaultConverters }) => {
        let section = 0
        return {
          ...defaultConverters,
          code: ({ node }: { node: SerializedCodeNode }) => (
            <CopyableCodeBlock
              code={serializedText(node)}
              language={typeof node.language === 'string' ? node.language : undefined}
            />
          ),
          upload: ({ node }: { node: SerializedUploadNode }) => renderArticleUpload(node),
          heading: ({ node, nodesToJSX }: any) => {
            const id = node.tag === 'h1' || node.tag === 'h2' ? `section-${section++}` : undefined
            return createElement(node.tag, { id }, nodesToJSX({ nodes: node.children }))
          },
        }
      }}
    />
  )
}
