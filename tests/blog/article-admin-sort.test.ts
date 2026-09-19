import { describe, expect, it } from 'vitest'
import { compareArticleAdminOrder, formatArticleAdminDateTime, type ArticleAdminOrder } from '../../src/lib/article-admin-sort'

const articles = [
  { id: 'draft', updatedAt: '2026-09-20T12:00:00.000Z' },
  { id: 'published-old', publishedAt: '2026-09-18T12:00:00.000Z', updatedAt: '2026-09-19T12:00:00.000Z' },
  { id: 'published-new', publishedAt: '2026-09-19T12:00:00.000Z', updatedAt: '2026-09-18T12:00:00.000Z' },
]

function sortedIds(order: ArticleAdminOrder) {
  return [...articles].sort((a, b) => compareArticleAdminOrder(a, b, order)).map((article) => article.id)
}

describe('后台文章排序', () => {
  it('支持按发布时间从新到旧，未发布草稿排在最后', () => {
    expect(sortedIds('published-newest')).toEqual(['published-new', 'published-old', 'draft'])
  })

  it('支持按发布时间从旧到新，未发布草稿排在最后', () => {
    expect(sortedIds('published-oldest')).toEqual(['published-old', 'published-new', 'draft'])
  })

  it('保留原有按修改时间排序', () => {
    expect(sortedIds('newest')).toEqual(['draft', 'published-old', 'published-new'])
    expect(sortedIds('oldest')).toEqual(['published-new', 'published-old', 'draft'])
  })

  it('后台时间显示到秒，并统一使用北京时间', () => {
    expect(formatArticleAdminDateTime('2026-09-20T05:05:42.000Z')).toMatch(/2026.*09.*20.*13.*05.*42/)
  })
})
