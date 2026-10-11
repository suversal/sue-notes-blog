import { describe, expect, it } from 'vitest'
import { parseArticleSourceUrl } from '../../src/lib/article-service'

describe('文章的 X 原文链接', () => {
  it('接受 x.com 和 twitter.com 的 https 链接，留空表示清除', () => {
    expect(parseArticleSourceUrl(' https://x.com/suversal/status/123 ')).toBe('https://x.com/suversal/status/123')
    expect(parseArticleSourceUrl('https://twitter.com/suversal/status/123')).toBe('https://twitter.com/suversal/status/123')
    expect(parseArticleSourceUrl('')).toBe('')
  })

  it('拒绝其他网站、非 https 和伪装成 x.com 的域名', () => {
    expect(() => parseArticleSourceUrl('https://example.com/post')).toThrow('x.com')
    expect(() => parseArticleSourceUrl('http://x.com/suversal/status/123')).toThrow('x.com')
    expect(() => parseArticleSourceUrl('https://x.com.evil.test/suversal')).toThrow('x.com')
    expect(() => parseArticleSourceUrl('javascript:alert(1)')).toThrow('x.com')
    expect(() => parseArticleSourceUrl('不是链接')).toThrow('完整的 X 链接')
  })
})
