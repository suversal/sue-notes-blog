import { relationId } from './blog-data'
import { exploreKindLabels } from './explore-labels'
import { getPayloadClient } from './payload'
import type { Where } from 'payload'
import type { ExploreItem as PayloadExploreItem } from '../payload-types'

export type ExploreKind = 'project' | 'site' | 'saved'

export type ExploreItem = {
  id: string
  kind: ExploreKind
  eyebrow: string
  title: string
  description: string
  meta: string
  status: string
  href: string
  highlightStatus: boolean
  isVisible: boolean
  sortOrder: number
}

export type ExploreItemInput = Omit<ExploreItem, 'id'>

const kinds = new Set<ExploreKind>(['project', 'site', 'saved'])

function requiredText(value: unknown, label: string, maxLength: number) {
  const text = String(value ?? '').trim()
  if (!text || text.length > maxLength) throw new Error(`${label}需要填写，且不能超过 ${maxLength} 个字。`)
  return text
}

export function validateExploreHref(value: unknown) {
  const href = requiredText(value, '访问地址', 500)
  if (/^https?:\/\//i.test(href) || (/^\/(?!\/)/.test(href) && !/\s/.test(href))) return href
  throw new Error('访问地址必须是 http(s) 链接或以 / 开头的站内路径。')
}

export function parseExploreItemInput(input: Record<string, unknown>): ExploreItemInput {
  const kind = String(input.kind ?? '') as ExploreKind
  if (!kinds.has(kind)) throw new Error('请选择有效的探索分类。')
  const sortOrder = Number(input.sortOrder)
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) throw new Error('排序必须是 0–9999 之间的整数。')
  return {
    kind,
    eyebrow: exploreKindLabels[kind],
    title: requiredText(input.title, '名称', 80),
    description: requiredText(input.description, '简介', 240),
    meta: requiredText(input.meta, '补充信息', 100),
    status: requiredText(input.status, '状态文字', 40),
    href: validateExploreHref(input.href),
    highlightStatus: Boolean(input.highlightStatus),
    isVisible: Boolean(input.isVisible),
    sortOrder,
  }
}

function publicItem(row: PayloadExploreItem): ExploreItem {
  return {
    id: String(row.id),
    kind: row.kind,
    eyebrow: row.eyebrow,
    title: row.title,
    description: row.description,
    meta: row.meta,
    status: row.status,
    href: row.href,
    highlightStatus: Boolean(row.highlightStatus),
    isVisible: Boolean(row.isVisible),
    sortOrder: Number(row.sortOrder),
  }
}

export async function listExploreItems(options: { owner?: string; includeHidden?: boolean } = {}) {
  const payload = await getPayloadClient()
  let owner = options.owner
  if (!owner) {
    const articles = await payload.find({ collection: 'articles', overrideAccess: true, depth: 0, limit: 500 })
    const counts = new Map<string, number>()
    for (const article of articles.docs) {
      const id = relationId(article.owner)
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    owner = [...counts].sort((left, right) => right[1] - left[1])[0]?.[0]
    if (!owner) {
      const users = await payload.find({ collection: 'users', overrideAccess: true, depth: 0, limit: 1, sort: 'createdAt' })
      owner = users.docs[0] ? String(users.docs[0].id) : undefined
    }
  }
  if (!owner) return []
  const conditions: Where[] = []
  conditions.push({ owner: { equals: owner } })
  if (!options.includeHidden) conditions.push({ isVisible: { equals: true } })
  const result = await payload.find({
    collection: 'explore-items',
    overrideAccess: true,
    depth: 0,
    limit: 500,
    sort: ['sortOrder', 'createdAt'],
    ...(conditions.length ? { where: { and: conditions } } : {}),
  })
  return result.docs.map(publicItem)
}

export async function createExploreItem(owner: string, input: ExploreItemInput) {
  const payload = await getPayloadClient()
  return payload.create({ collection: 'explore-items', overrideAccess: true, data: { owner, ...input } })
}

async function ownedExploreItem(owner: string, id: string) {
  const payload = await getPayloadClient()
  const item = await payload.findByID({ collection: 'explore-items', id, overrideAccess: true, depth: 0 }).catch(() => undefined)
  if (!item || relationId(item.owner) !== owner) throw new Error('探索条目不存在。')
  return { payload, item }
}

export async function updateExploreItem(owner: string, id: string, input: ExploreItemInput) {
  const { payload } = await ownedExploreItem(owner, id)
  return payload.update({ collection: 'explore-items', id, overrideAccess: true, data: input })
}

export async function deleteExploreItem(owner: string, id: string) {
  const { payload } = await ownedExploreItem(owner, id)
  return payload.delete({ collection: 'explore-items', id, overrideAccess: true })
}
