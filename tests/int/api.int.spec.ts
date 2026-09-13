import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { markdownToArticleContent } from '@/lib/article-content'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

describe('API', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('fetches users', async () => {
    const users = await payload.find({
      collection: 'users',
    })
    expect(users).toBeDefined()
  })

  it('imports common Markdown block components', () => {
    const content = markdownToArticleContent(payload, [
      '# 标题',
      '',
      '> 引用',
      '',
      '---',
      '',
      '```ts',
      'const answer = 42;',
      '```',
      '',
      '| 名称 | 值 |',
      '| --- | --- |',
      '| answer | 42 |',
    ].join('\n')) as unknown as { root: { children: Array<{ type: string }> } }

    expect(content.root.children.map((node) => node.type)).toEqual(
      expect.arrayContaining(['heading', 'quote', 'horizontalrule', 'code', 'table']),
    )
  })
})
