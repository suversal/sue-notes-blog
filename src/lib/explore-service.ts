import { relationId } from './blog-data'
import { exploreKindLabels } from './explore-labels'
import { getPayloadClient } from './payload'
import type { UsesLink } from './uses-labels'
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
  logoUrl: string
  relatedLinks: UsesLink[]
  isFeatured: boolean
  highlightStatus: boolean
  isVisible: boolean
  sortOrder: number
}

export type ExploreItemInput = Omit<ExploreItem, 'id' | 'sortOrder'>

const kinds = new Set<ExploreKind>(['project', 'site', 'saved'])

export function requiredText(value: unknown, label: string, maxLength: number) {
  const text = String(value ?? '').trim()
  if (!text || text.length > maxLength) throw new Error(`${label}需要填写，且不能超过 ${maxLength} 个字。`)
  return text
}

export function validateExploreHref(value: unknown, label = '访问地址') {
  const href = requiredText(value, label, 500)
  if (/^https?:\/\//i.test(href) || (/^\/(?!\/)/.test(href) && !/\s/.test(href))) return href
  throw new Error(`${label}必须是 http(s) 链接或以 / 开头的站内路径。`)
}

function optionalText(value: unknown, label: string, maxLength: number) {
  const text = String(value ?? '').trim()
  if (text.length > maxLength) throw new Error(`${label}不能超过 ${maxLength} 个字。`)
  return text
}

/** 相关文章是手填的标题加链接，可以有多条；空行忽略，半填的行报错。 */
export function parseRelatedLinks(labels: unknown[], hrefs: unknown[]): UsesLink[] {
  const links: UsesLink[] = []
  for (let index = 0; index < Math.max(labels.length, hrefs.length); index += 1) {
    const label = String(labels[index] ?? '').trim()
    const href = String(hrefs[index] ?? '').trim()
    if (!label && !href) continue
    if (!label || !href) throw new Error('相关文章的标题和链接需要同时填写。')
    links.push({ label: requiredText(label, '相关文章标题', 80), href: validateExploreHref(href, '相关文章链接') })
  }
  if (links.length > 8) throw new Error('相关文章最多 8 条。')
  return links
}

export function storedLinks(value: unknown): UsesLink[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((link) =>
    link && typeof link === 'object' && typeof link.label === 'string' && typeof link.href === 'string'
      ? [{ label: link.label, href: link.href }]
      : [],
  )
}

export function parseLogoUrl(value: unknown, label = '图标地址') {
  const logoUrl = String(value ?? '').trim()
  if (logoUrl && (logoUrl.length > 500 || !/^https?:\/\//i.test(logoUrl))) throw new Error(`${label}必须是 http(s) 链接。`)
  return logoUrl
}

export function parseExploreItemInput(input: Record<string, unknown>): ExploreItemInput {
  const kind = String(input.kind ?? '') as ExploreKind
  if (!kinds.has(kind)) throw new Error('请选择有效的探索分类。')
  return {
    kind,
    eyebrow: exploreKindLabels[kind],
    title: requiredText(input.title, '名称', 80),
    description: requiredText(input.description, '简介', 240),
    meta: optionalText(input.meta, '标签或补充信息', 100),
    status: optionalText(input.status, '状态文字', 40),
    href: validateExploreHref(input.href),
    logoUrl: parseLogoUrl(input.logoUrl),
    relatedLinks: parseRelatedLinks(
      Array.isArray(input.relatedLabels) ? input.relatedLabels : [],
      Array.isArray(input.relatedHrefs) ? input.relatedHrefs : [],
    ),
    // 大卡片只对开源项目有意义。
    isFeatured: kind === 'project' && Boolean(input.isFeatured),
    highlightStatus: Boolean(input.highlightStatus),
    isVisible: Boolean(input.isVisible),
  }
}

function publicItem(row: PayloadExploreItem): ExploreItem {
  return {
    id: String(row.id),
    kind: row.kind,
    eyebrow: row.eyebrow,
    title: row.title,
    description: row.description,
    meta: row.meta ?? '',
    status: row.status ?? '',
    href: row.href,
    logoUrl: row.logoUrl ?? '',
    relatedLinks: storedLinks(row.relatedLinks),
    isFeatured: Boolean(row.isFeatured),
    highlightStatus: Boolean(row.highlightStatus),
    isVisible: Boolean(row.isVisible),
    sortOrder: Number(row.sortOrder),
  }
}

// 前台没有登录用户时，把文章最多的账号视为站点所有者。
export async function resolvePublicOwner() {
  const payload = await getPayloadClient()
  const articles = await payload.find({ collection: 'articles', overrideAccess: true, depth: 0, limit: 500 })
  const counts = new Map<string, number>()
  for (const article of articles.docs) {
    const id = relationId(article.owner)
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const owner = [...counts].sort((left, right) => right[1] - left[1])[0]?.[0]
  if (owner) return owner
  const users = await payload.find({ collection: 'users', overrideAccess: true, depth: 0, limit: 1, sort: 'createdAt' })
  return users.docs[0] ? String(users.docs[0].id) : undefined
}

export async function listExploreItems(options: { owner?: string; includeHidden?: boolean } = {}) {
  const payload = await getPayloadClient()
  const owner = options.owner ?? (await resolvePublicOwner())
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
  const last = await payload.find({ collection: 'explore-items', overrideAccess: true, depth: 0, limit: 1, sort: '-sortOrder', where: { and: [{ owner: { equals: owner } }, { kind: { equals: input.kind } }] } })
  const sortOrder = Math.min(9999, Number(last.docs[0]?.sortOrder ?? 0) + 10)
  return payload.create({ collection: 'explore-items', overrideAccess: true, data: { owner, ...input, sortOrder } })
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

export async function setExploreItemVisible(owner: string, id: string, isVisible: boolean) {
  const { payload } = await ownedExploreItem(owner, id)
  return payload.update({ collection: 'explore-items', id, overrideAccess: true, data: { isVisible } })
}

/** 在同一分组、同一种卡片（重点或普通）里往前或往后挪一位，然后整组重新编号。 */
export async function moveExploreItem(owner: string, id: string, direction: -1 | 1) {
  const { payload, item } = await ownedExploreItem(owner, id)
  const rows = await payload.find({ collection: 'explore-items', overrideAccess: true, depth: 0, limit: 500, sort: ['sortOrder', 'createdAt'], where: { and: [{ owner: { equals: owner } }, { kind: { equals: item.kind } }] } })
  const peers = rows.docs.filter((row) => Boolean(row.isFeatured) === Boolean(item.isFeatured)).map((row) => String(row.id))
  const from = peers.indexOf(id)
  const to = from + direction
  if (from < 0 || to < 0 || to >= peers.length) return
  peers.splice(to, 0, ...peers.splice(from, 1))
  // 重点项目始终排在普通项目前面，所以两段各自保持相对顺序后首尾相接。
  const others = rows.docs.filter((row) => Boolean(row.isFeatured) !== Boolean(item.isFeatured)).map((row) => String(row.id))
  const ordered = item.isFeatured ? [...peers, ...others] : [...others, ...peers]
  await Promise.all(ordered.map((rowId, index) => payload.update({ collection: 'explore-items', id: rowId, overrideAccess: true, data: { sortOrder: (index + 1) * 10 } })))
}

export async function deleteExploreItem(owner: string, id: string) {
  const { payload } = await ownedExploreItem(owner, id)
  return payload.delete({ collection: 'explore-items', id, overrideAccess: true })
}
