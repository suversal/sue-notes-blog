import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ArticleRichText } from '../../src/app/blog/components/rich-text'
import type { ArticleContent } from '../../src/lib/article-content-data'

function contentWithImage(fields: Record<string, unknown>): ArticleContent {
  return {
    root: {
      type: 'root',
      children: [{
        type: 'upload',
        version: 3,
        format: '',
        id: 'upload-node',
        relationTo: 'media',
        fields,
        value: {
          id: 'media-id',
          alt: '文章配图',
          filename: 'article.png',
          height: 600,
          mimeType: 'image/png',
          url: 'https://img.suversal.com/article.png',
          width: 800,
        },
      }],
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  } as ArticleContent
}

describe('public article image layout', () => {
  it('renders the saved percentage relative to the article width', () => {
    const html = renderToStaticMarkup(<ArticleRichText content={contentWithImage({
      displayAlignment: 'right',
      displayScale: 50,
    })} />)

    expect(html).toContain('width:50%')
    expect(html).toContain('margin-left:auto')
    expect(html).toContain('margin-right:0')
    expect(html).not.toContain('aspect-ratio:')
    expect(html).toContain('alt="文章配图"')
  })

  it('renders an explicit custom width and height when requested', () => {
    const html = renderToStaticMarkup(<ArticleRichText content={contentWithImage({
      displayHeight: 300,
      displayScale: 'custom',
      displayWidth: 400,
    })} />)

    expect(html).toContain('width:400px')
    expect(html).toContain('aspect-ratio:400 / 300')
  })
})

describe('public article code blocks', () => {
  it('preserves Lexical line-break and tab nodes', () => {
    const content = {
      root: {
        type: 'root',
        children: [{
          type: 'code',
          version: 1,
          language: 'text',
          children: [
            { type: 'text', version: 1, text: 'first line' },
            { type: 'linebreak', version: 1 },
            { type: 'tab', version: 1 },
            { type: 'text', version: 1, text: 'second line' },
          ],
        }],
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    } as unknown as ArticleContent

    const html = renderToStaticMarkup(<ArticleRichText content={content} />)

    expect(html).toContain('first line')
    expect(html).toContain('\tsecond line')
    expect(html).toContain('aria-label="复制代码"')
    expect(html.match(/data-code-line/g)).toHaveLength(2)
  })
})
