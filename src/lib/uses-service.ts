import { relationId } from './blog-data'
import { parseLogoUrl, parseRelatedLinks, requiredText, resolvePublicOwner, storedLinks, validateExploreHref } from './explore-service'
import { getPayloadClient } from './payload'
import { splitUsesTags, usesStatusLabels, type UsesLink, type UsesStatus } from './uses-labels'
import type { Where } from 'payload'
import type { UsesCategory as PayloadUsesCategory, UsesItem as PayloadUsesItem } from '../payload-types'

export type UsesCategory = {
  id: string
  name: string
  subtitle: string
  note: string
  sortOrder: number
}

export type UsesItem = {
  id: string
  categoryId: string
  title: string
  tagline: string
  tags: string
  description: string
  status: UsesStatus
  href: string
  ctaLabel: string
  isAffiliate: boolean
  promoNote: string
  logoUrl: string
  relatedLinks: UsesLink[]
  isVisible: boolean
  sortOrder: number
}

export type UsesCategoryInput = Omit<UsesCategory, 'id' | 'sortOrder'>
export type UsesItemInput = Omit<UsesItem, 'id' | 'sortOrder'>

function optionalText(value: unknown, label: string, maxLength: number) {
  const text = String(value ?? '').trim()
  if (text.length > maxLength) throw new Error(`${label}不能超过 ${maxLength} 个字。`)
  return text
}

export function parseUsesCategoryInput(input: Record<string, unknown>): UsesCategoryInput {
  return {
    name: requiredText(input.name, '分类名称', 20),
    subtitle: optionalText(input.subtitle, '副标题', 40),
    note: optionalText(input.note, '「我的搭配」', 240),
  }
}

export const parseUsesLinks = parseRelatedLinks

export function parseUsesItemInput(input: Record<string, unknown>): UsesItemInput {
  const status = String(input.status ?? '') as UsesStatus
  if (!(status in usesStatusLabels)) throw new Error('请选择有效的使用状态。')
  const logoUrl = parseLogoUrl(input.logoUrl, 'Logo 图片地址')
  const tags = optionalText(input.tags, '标签', 120)
  if (splitUsesTags(tags).length > 6) throw new Error('标签最多 6 个。')
  return {
    categoryId: requiredText(input.categoryId, '分类', 64),
    title: requiredText(input.title, '名称', 80),
    tagline: optionalText(input.tagline, '一句卖点', 80),
    tags,
    description: requiredText(input.description, '说明', 600),
    status,
    // 访问地址可以留空：没有官网的条目不显示按钮。
    href: String(input.href ?? '').trim() ? validateExploreHref(input.href) : '',
    ctaLabel: optionalText(input.ctaLabel, '按钮文字', 12) || '去官网',
    isAffiliate: Boolean(input.isAffiliate),
    promoNote: optionalText(input.promoNote, '优惠说明', 200),
    logoUrl,
    relatedLinks: parseUsesLinks(
      Array.isArray(input.relatedLabels) ? input.relatedLabels : [],
      Array.isArray(input.relatedHrefs) ? input.relatedHrefs : [],
    ),
    isVisible: Boolean(input.isVisible),
  }
}

function publicCategory(row: PayloadUsesCategory): UsesCategory {
  return { id: String(row.id), name: row.name, subtitle: row.subtitle ?? '', note: row.note ?? '', sortOrder: Number(row.sortOrder) }
}

function publicItem(row: PayloadUsesItem): UsesItem {
  return {
    id: String(row.id),
    categoryId: relationId(row.category),
    title: row.title,
    tagline: row.tagline ?? '',
    tags: row.tags ?? '',
    description: row.description,
    status: row.status,
    href: row.href ?? '',
    ctaLabel: row.ctaLabel || '去官网',
    isAffiliate: Boolean(row.isAffiliate),
    promoNote: row.promoNote ?? '',
    logoUrl: row.logoUrl ?? '',
    relatedLinks: storedLinks(row.relatedLinks),
    isVisible: Boolean(row.isVisible),
    sortOrder: Number(row.sortOrder),
  }
}

export async function listUses(options: { owner?: string; includeHidden?: boolean } = {}) {
  const payload = await getPayloadClient()
  const owner = options.owner ?? (await resolvePublicOwner())
  if (!owner) return { categories: [], items: [] }
  const itemConditions: Where[] = [{ owner: { equals: owner } }]
  if (!options.includeHidden) itemConditions.push({ isVisible: { equals: true } })
  const [categories, items] = await Promise.all([
    payload.find({ collection: 'uses-categories', overrideAccess: true, depth: 0, limit: 200, sort: ['sortOrder', 'createdAt'], where: { owner: { equals: owner } } }),
    payload.find({ collection: 'uses-items', overrideAccess: true, depth: 0, limit: 500, sort: ['sortOrder', 'createdAt'], where: { and: itemConditions } }),
  ])
  return { categories: categories.docs.map(publicCategory), items: items.docs.map(publicItem) }
}

export async function hasPublicUses() {
  const payload = await getPayloadClient()
  const owner = await resolvePublicOwner()
  if (!owner) return false
  const result = await payload.count({ collection: 'uses-items', overrideAccess: true, where: { and: [{ owner: { equals: owner } }, { isVisible: { equals: true } }] } })
  return result.totalDocs > 0
}

/** 前台只有站点所有者本人登录时才出现编辑入口。 */
export async function isPublicOwner(userId: string | undefined) {
  return Boolean(userId) && userId === (await resolvePublicOwner())
}

async function ownedUsesCategory(owner: string, id: string) {
  const payload = await getPayloadClient()
  const category = await payload.findByID({ collection: 'uses-categories', id, overrideAccess: true, depth: 0 }).catch(() => undefined)
  if (!category || relationId(category.owner) !== owner) throw new Error('在用分类不存在。')
  return { payload, category }
}

async function ownedUsesItem(owner: string, id: string) {
  const payload = await getPayloadClient()
  const item = await payload.findByID({ collection: 'uses-items', id, overrideAccess: true, depth: 0 }).catch(() => undefined)
  if (!item || relationId(item.owner) !== owner) throw new Error('在用条目不存在。')
  return { payload, item }
}

async function nextSortOrder(collection: 'uses-categories' | 'uses-items', where: Where) {
  const payload = await getPayloadClient()
  const last = await payload.find({ collection, overrideAccess: true, depth: 0, limit: 1, sort: '-sortOrder', where })
  return Math.min(9999, Number(last.docs[0]?.sortOrder ?? 0) + 10)
}

export async function createUsesCategory(owner: string, input: UsesCategoryInput) {
  const payload = await getPayloadClient()
  const sortOrder = await nextSortOrder('uses-categories', { owner: { equals: owner } })
  return payload.create({ collection: 'uses-categories', overrideAccess: true, data: { owner, ...input, sortOrder } })
}

export async function updateUsesCategory(owner: string, id: string, input: UsesCategoryInput) {
  const { payload } = await ownedUsesCategory(owner, id)
  return payload.update({ collection: 'uses-categories', id, overrideAccess: true, data: input })
}

export async function deleteUsesCategory(owner: string, id: string) {
  const { payload } = await ownedUsesCategory(owner, id)
  const used = await payload.count({ collection: 'uses-items', overrideAccess: true, where: { and: [{ owner: { equals: owner } }, { category: { equals: id } }] } })
  if (used.totalDocs > 0) throw new Error(`这个分类下还有 ${used.totalDocs} 个条目，请先移走或删除它们。`)
  return payload.delete({ collection: 'uses-categories', id, overrideAccess: true })
}

function itemData({ categoryId, ...rest }: UsesItemInput) {
  return { ...rest, category: categoryId }
}

export async function createUsesItem(owner: string, input: UsesItemInput) {
  const { payload } = await ownedUsesCategory(owner, input.categoryId)
  const sortOrder = await nextSortOrder('uses-items', { and: [{ owner: { equals: owner } }, { category: { equals: input.categoryId } }] })
  return payload.create({ collection: 'uses-items', overrideAccess: true, data: { owner, ...itemData(input), sortOrder } })
}

export async function updateUsesItem(owner: string, id: string, input: UsesItemInput) {
  await ownedUsesCategory(owner, input.categoryId)
  const { payload } = await ownedUsesItem(owner, id)
  return payload.update({ collection: 'uses-items', id, overrideAccess: true, data: itemData(input) })
}

export async function setUsesItemVisible(owner: string, id: string, isVisible: boolean) {
  const { payload } = await ownedUsesItem(owner, id)
  return payload.update({ collection: 'uses-items', id, overrideAccess: true, data: { isVisible } })
}

export async function deleteUsesItem(owner: string, id: string) {
  const { payload } = await ownedUsesItem(owner, id)
  return payload.delete({ collection: 'uses-items', id, overrideAccess: true })
}

/** 把一行往前或往后挪一位，然后按新顺序重新编号，避免排序值相同导致挪不动。 */
async function moveRow(collection: 'uses-categories' | 'uses-items', where: Where, id: string, direction: -1 | 1) {
  const payload = await getPayloadClient()
  const rows = await payload.find({ collection, overrideAccess: true, depth: 0, limit: 500, sort: ['sortOrder', 'createdAt'], where })
  const ids = rows.docs.map((row) => String(row.id))
  const from = ids.indexOf(id)
  const to = from + direction
  if (from < 0 || to < 0 || to >= ids.length) return
  ids.splice(to, 0, ...ids.splice(from, 1))
  await Promise.all(ids.map((rowId, index) => payload.update({ collection, id: rowId, overrideAccess: true, data: { sortOrder: (index + 1) * 10 } })))
}

export async function moveUsesCategory(owner: string, id: string, direction: -1 | 1) {
  await ownedUsesCategory(owner, id)
  await moveRow('uses-categories', { owner: { equals: owner } }, id, direction)
}

export async function moveUsesItem(owner: string, id: string, direction: -1 | 1) {
  const { item } = await ownedUsesItem(owner, id)
  await moveRow('uses-items', { and: [{ owner: { equals: owner } }, { category: { equals: relationId(item.category) } }] }, id, direction)
}
