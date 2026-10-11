import { describe, expect, it } from 'vitest'
import { parseExploreItemInput, validateExploreHref } from '../../src/lib/explore-service'

describe('探索条目规则', () => {
  it('允许 https 地址和站内路径', () => {
    expect(validateExploreHref('https://example.com/project')).toBe('https://example.com/project')
    expect(validateExploreHref('/blog')).toBe('/blog')
  })

  it('拒绝脚本地址和协议相对地址', () => {
    expect(() => validateExploreHref('javascript:alert(1)')).toThrow('http(s)')
    expect(() => validateExploreHref('//example.com')).toThrow('http(s)')
  })

  it('解析可见性、状态强调和重点项目；标签与状态文字可以留空', () => {
    expect(parseExploreItemInput({
      kind: 'site', title: 'Test', description: 'Test item', meta: 'example.com', status: '运行中',
      href: 'https://example.com', isVisible: true, highlightStatus: true, isFeatured: true,
    })).toMatchObject({ kind: 'site', isVisible: true, highlightStatus: true, isFeatured: false })
    expect(parseExploreItemInput({
      kind: 'project', title: 'Test', description: 'Test item', href: 'https://github.com/a/b', isFeatured: true,
    })).toMatchObject({ meta: '', status: '', isFeatured: true, relatedLinks: [], logoUrl: '' })
  })
})
