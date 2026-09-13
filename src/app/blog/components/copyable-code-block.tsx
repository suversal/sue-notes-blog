'use client'

import { useState } from 'react'
import styles from '../blog-v1.module.css'
import { Icon } from './ui-icon'

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('Copy failed')
}

export function CopyableCodeBlock({ code, language }: { code: string; language?: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const label = status === 'copied' ? '已复制' : status === 'failed' ? '复制失败' : '复制'
  const lines = code.split('\n')

  return (
    <figure className={styles.codeBlock}>
      <figcaption className={styles.codeBlockHeader}>
        <span>{language || 'text'}</span>
        <button
          type="button"
          aria-label={label === '复制' ? '复制代码' : label}
          onClick={async () => {
            try {
              await copyText(code)
              setStatus('copied')
            } catch {
              setStatus('failed')
            }
            window.setTimeout(() => setStatus('idle'), 2000)
          }}
        >
          <Icon name="copy" />
          {label}
        </button>
      </figcaption>
      <pre className={styles.codeViewport}>
        <code className={styles.codeLines}>
          {lines.map((line, index) => (
            <span className={styles.codeLine} data-code-line key={`${index}-${line}`}>
              {line || '\u00a0'}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  )
}
