import Link from 'next/link'
import type { UsesLink } from '../../../lib/uses-labels'
import { Icon } from './ui-icon'
import styles from './related-links.module.css'

/**
 * 卡片上的「相关文章」入口。只占一个图标的位置，文章标题在悬停、键盘聚焦或
 * 手机上点一下时才弹出来，这样有没有相关文章都不会影响卡片高度。
 */
export function RelatedLinks({ links, compact = false, align = 'end', placement = 'above' }: { links: UsesLink[]; compact?: boolean; align?: 'start' | 'end'; placement?: 'above' | 'below' | 'fill' }) {
  if (links.length === 0) return null
  return (
    <span className={`${styles.wrap} ${compact ? styles.compact : ''} ${align === 'start' ? styles.alignStart : ''} ${placement === 'below' ? styles.below : ''} ${placement === 'fill' ? styles.fill : ''}`}>
      <button className={styles.trigger} type="button" aria-label={`相关文章 ${links.length} 篇`}>
        <Icon name="file" />
        {links.length}
      </button>
      <span className={styles.pop}>
        <span className={styles.list} role="group" aria-label="相关文章">
          <strong>相关文章</strong>
          {links.map((link, index) => {
            const content = `${index + 1}. ${link.label}`
            return /^https?:\/\//i.test(link.href) ? (
              <a href={link.href} target="_blank" rel="noopener noreferrer" key={`${link.label}-${link.href}`}>
                {content}
              </a>
            ) : (
              <Link href={link.href} key={`${link.label}-${link.href}`}>
                {content}
              </Link>
            )
          })}
        </span>
      </span>
    </span>
  )
}
