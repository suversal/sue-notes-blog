import { describe, expect, it } from 'vitest'
import { splitEmphasis, splitUsesTags } from '../../src/lib/uses-labels'
import { parseUsesCategoryInput, parseUsesItemInput, parseUsesLinks } from '../../src/lib/uses-service'

const item = {
  categoryId: 'category', title: 'Test', description: 'Test item', status: 'using',
  href: 'https://example.com',
}

describe('在用清单规则', () => {
  it('分类需要名称，副标题和「我的搭配」可以留空', () => {
    expect(parseUsesCategoryInput({ name: ' 服务器 ', subtitle: '', note: '' })).toEqual({
      name: '服务器', subtitle: '', note: '',
    })
    expect(() => parseUsesCategoryInput({ name: '' })).toThrow('分类名称')
  })

  it('解析邀请链接、可见性和使用状态，按钮文字留空时用默认值', () => {
    expect(parseUsesItemInput({ ...item, status: 'used', isAffiliate: true, isVisible: true })).toMatchObject({
      status: 'used', isAffiliate: true, isVisible: true, ctaLabel: '去官网', logoUrl: '', relatedLinks: [],
    })
    expect(parseUsesItemInput({ ...item, ctaLabel: '注册' }).ctaLabel).toBe('注册')
    expect(parseUsesItemInput({ ...item, href: '' }).href).toBe('')
  })

  it('拒绝无效状态、脚本地址、非 http(s) 的 Logo 地址和过多标签', () => {
    expect(() => parseUsesItemInput({ ...item, status: 'someday' })).toThrow('使用状态')
    expect(() => parseUsesItemInput({ ...item, href: 'javascript:alert(1)' })).toThrow('http(s)')
    expect(() => parseUsesItemInput({ ...item, logoUrl: '/logo.png' })).toThrow('Logo')
    expect(() => parseUsesItemInput({ ...item, tags: '一、二、三、四、五、六、七' })).toThrow('标签最多')
  })

  it('相关文章可以有多条，空行忽略，半填的行报错', () => {
    expect(parseUsesLinks(['教程', '', '外链'], ['/blog/guide', '', 'https://x.com/post'])).toEqual([
      { label: '教程', href: '/blog/guide' },
      { label: '外链', href: 'https://x.com/post' },
    ])
    expect(() => parseUsesLinks(['教程'], [''])).toThrow('同时填写')
    expect(() => parseUsesLinks(['教程'], ['javascript:alert(1)'])).toThrow('http(s)')
  })

  it('标签按顿号或逗号拆分，说明里的 **重点** 拆成加粗片段', () => {
    expect(splitUsesTags('ARM、免费额度, 需要信用卡，')).toEqual(['ARM', '免费额度', '需要信用卡'])
    expect(splitEmphasis('仍然是 **4C24G** 的额度')).toEqual([
      { text: '仍然是 ', strong: false },
      { text: '4C24G', strong: true },
      { text: ' 的额度', strong: false },
    ])
  })
})
