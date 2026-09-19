import { describe, expect, it } from 'vitest'
import { parseArticlePinPriority } from '../../src/lib/article-service'
import { comparePublicPostPriority } from '../../src/lib/blog-data'

describe('文章置顶优先级', () => {
  it.each([
    ['0', 0],
    ['1', 1],
    ['999', 999],
  ])('将 %s 解析为 %i', (input, expected) => {
    expect(parseArticlePinPriority(input)).toBe(expected)
  })

  it.each(['', '-1', '1.5', '1000', 'abc'])('拒绝无效优先级 %s', (input) => {
    expect(() => parseArticlePinPriority(input)).toThrow('0–999')
  })

  it('置顶文章按小号优先，同号再按发布时间倒序，未置顶排在最后', () => {
    const posts = [
      { id: 'normal', pinPriority: 0, publishedAt: '2026-09-20T10:00:00.000Z' },
      { id: 'normal-old', pinPriority: 0, publishedAt: '2026-09-16T10:00:00.000Z' },
      { id: 'pinned-old', pinPriority: 10, publishedAt: '2026-09-18T10:00:00.000Z' },
      { id: 'pinned-new', pinPriority: 10, publishedAt: '2026-09-19T10:00:00.000Z' },
      { id: 'highest', pinPriority: 1, publishedAt: '2026-09-17T10:00:00.000Z' },
    ]

    expect(posts.sort(comparePublicPostPriority).map((post) => post.id)).toEqual([
      'highest',
      'pinned-new',
      'pinned-old',
      'normal',
      'normal-old',
    ])
  })
})
