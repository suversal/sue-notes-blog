import { RichText } from '@payloadcms/richtext-lexical/react'
import { createElement } from 'react'
import type { ArticleContent } from '../../../lib/article-content-data'
import styles from '../blog-v1.module.css'

export function ArticleRichText({ content }: { content: ArticleContent }) {
  return (
    <RichText
      className={styles.prose ?? 'article-richtext'}
      data={content}
      converters={({ defaultConverters }) => {
        let section = 0
        return {
          ...defaultConverters,
          heading: ({ node, nodesToJSX }: any) => {
            const id = node.tag === 'h1' || node.tag === 'h2' ? `section-${section++}` : undefined
            return createElement(node.tag, { id }, nodesToJSX({ nodes: node.children }))
          },
        }
      }}
    />
  )
}
