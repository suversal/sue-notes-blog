'use client'

import { useEffect, useState } from 'react'
import { Icon } from './ui-icon'
import styles from '../blog-v1.module.css'

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const updateVisibility = () => setVisible(document.documentElement.scrollTop > 400)

    addEventListener('scroll', updateVisibility, { passive: true })
    updateVisibility()
    return () => removeEventListener('scroll', updateVisibility)
  }, [])

  return (
    <button
      type="button"
      className={`${styles.backToTopButton} ${visible ? styles.backToTopButtonVisible : ''}`}
      aria-label="回到顶部"
      tabIndex={visible ? 0 : -1}
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        })
      }
    >
      <Icon name="up" />
    </button>
  )
}
