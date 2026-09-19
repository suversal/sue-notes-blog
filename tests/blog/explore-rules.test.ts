import { describe, expect, it } from 'vitest'
import { parseExploreItemInput, validateExploreHref } from '../../src/lib/explore-service'

describe('探索条目规则', () => {
  it('允许 https 地址和站内路径', () => {
    expect(validateExploreHref('https://example.com/project')).toBe('https://example.com/project')
    expect(validateExploreHref('/blog')).toBe('/blog')
  })

  it('拒绝脚本地址、协议相对地址和无效排序', () => {
    expect(() => validateExploreHref('javascript:alert(1)')).toThrow('http(s)')
    expect(() => validateExploreHref('//example.com')).toThrow('http(s)')
    expect(() => parseExploreItemInput({
      kind: 'project', eyebrow: 'OPEN SOURCE', title: 'Test', description: 'Test item',
      meta: 'Tool', status: 'Active', href: 'https://example.com', sortOrder: '1.5',
    })).toThrow('整数')
  })

  it('解析可见性和状态强调开关', () => {
    expect(parseExploreItemInput({
      kind: 'site', eyebrow: 'MY SITE', title: 'Test', description: 'Test item',
      meta: 'example.com', status: '运行中', href: 'https://example.com', sortOrder: '20',
      isVisible: true, highlightStatus: true,
    })).toMatchObject({ kind: 'site', sortOrder: 20, isVisible: true, highlightStatus: true })
  })
})
