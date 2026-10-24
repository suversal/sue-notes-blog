import { defaultSiteProfile, relationId } from './blog-data'
import { parseLogoUrl, requiredText, resolvePublicOwner } from './explore-service'
import { friendXHandle } from './friend-links-labels'
import { getPayloadClient } from './payload'
import type { Where } from 'payload'
import type { FriendLink as PayloadFriendLink } from '../payload-types'

export type FriendLink = {
  id: string
  name: string
  author: string
  authorIsX: boolean
  url: string
  avatarUrl: string
  motto: string
  note: string
  metAt: string
  isVisible: boolean
  sortOrder: number
}

export type FriendLinkInput = Omit<FriendLink, 'id' | 'sortOrder'>

/** 信纸上给别人抄的本站信息；空字符串表示用默认值。 */
export type FriendCard = { name: string; url: string; avatar: string; motto: string }

function optionalText(value: unknown, label: string, maxLength: number) {
  const text = String(value ?? '').trim()
  if (text.length > maxLength) throw new Error(`${label}不能超过 ${maxLength} 个字。`)
  return text
}

/** 友链只收外部站点，必须是完整的 http(s) 地址。 */
export function parseFriendUrl(value: unknown) {
  const url = requiredText(value, '网址', 500)
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return url
  } catch {
    // 落到下面统一报错。
  }
  throw new Error('网址必须是完整的 http(s) 链接。')
}

/** 结识日期是邮戳上的日子，只接受真实存在的 YYYY-MM-DD。 */
export function parseMetAt(value: unknown) {
  const text = String(value ?? '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  const date = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : undefined
  if (!date || date.toISOString().slice(0, 10) !== text) throw new Error('请选择有效的结识日期。')
  return text
}

export function parseFriendLinkInput(input: Record<string, unknown>): FriendLinkInput {
  const author = optionalText(input.author, '站长', 40)
  // 站长留空时勾不勾都没意义，按没勾处理；填了却不是用户名就提示，免得前台链到一个不存在的主页。
  const authorIsX = Boolean(input.authorIsX) && author !== ''
  if (authorIsX && !friendXHandle(author)) throw new Error('勾选了 X 用户名时，站长只能填 X 的用户名：字母、数字或下划线，最多 15 位。')
  return {
    name: requiredText(input.name, '站名', 40),
    author,
    authorIsX,
    url: parseFriendUrl(input.url),
    avatarUrl: parseLogoUrl(input.avatarUrl, '头像地址'),
    motto: requiredText(input.motto, '一句话介绍', 80),
    note: optionalText(input.note, '推荐语', 120),
    metAt: parseMetAt(input.metAt),
    isVisible: Boolean(input.isVisible),
  }
}

export function parseFriendCardInput(input: Record<string, unknown>): FriendCard {
  const url = String(input.url ?? '').trim()
  return {
    name: optionalText(input.name, '站名', 40),
    url: url ? parseFriendUrl(url) : '',
    avatar: parseLogoUrl(input.avatar, '头像地址'),
    motto: optionalText(input.motto, '一句话', 40),
  }
}

export async function getFriendCard(owner?: string): Promise<FriendCard> {
  const payload = await getPayloadClient()
  const id = owner ?? (await resolvePublicOwner())
  if (!id) return { name: '', url: '', avatar: '', motto: '' }
  const found = await payload.find({ collection: 'site-settings', overrideAccess: true, depth: 0, limit: 1, where: { owner: { equals: id } } })
  const row = found.docs[0]
  return { name: row?.friendCardName ?? '', url: row?.friendCardUrl ?? '', avatar: row?.friendCardAvatar ?? '', motto: row?.friendCardMotto ?? '' }
}

export async function saveFriendCard(owner: string, input: FriendCard) {
  const payload = await getPayloadClient()
  const data = { friendCardName: input.name, friendCardUrl: input.url, friendCardAvatar: input.avatar, friendCardMotto: input.motto }
  const found = await payload.find({ collection: 'site-settings', overrideAccess: true, depth: 0, limit: 1, where: { owner: { equals: owner } } })
  return found.docs[0]
    ? payload.update({ collection: 'site-settings', id: found.docs[0].id, overrideAccess: true, data })
    : payload.create({ collection: 'site-settings', overrideAccess: true, data: { owner, ...defaultSiteProfile, ...data } })
}

function publicFriend(row: PayloadFriendLink): FriendLink {
  return {
    id: String(row.id),
    name: row.name,
    author: row.author ?? '',
    authorIsX: Boolean(row.authorIsX),
    url: row.url,
    avatarUrl: row.avatarUrl ?? '',
    motto: row.motto,
    note: row.note ?? '',
    metAt: row.metAt,
    isVisible: Boolean(row.isVisible),
    sortOrder: Number(row.sortOrder),
  }
}

export async function listFriendLinks(options: { owner?: string; includeHidden?: boolean } = {}) {
  const payload = await getPayloadClient()
  const owner = options.owner ?? (await resolvePublicOwner())
  if (!owner) return []
  const conditions: Where[] = [{ owner: { equals: owner } }]
  if (!options.includeHidden) conditions.push({ isVisible: { equals: true } })
  const result = await payload.find({ collection: 'friend-links', overrideAccess: true, depth: 0, limit: 500, sort: ['sortOrder', 'createdAt'], where: { and: conditions } })
  return result.docs.map(publicFriend)
}

export async function hasPublicFriendLinks() {
  const payload = await getPayloadClient()
  const owner = await resolvePublicOwner()
  if (!owner) return false
  const result = await payload.count({ collection: 'friend-links', overrideAccess: true, where: { and: [{ owner: { equals: owner } }, { isVisible: { equals: true } }] } })
  return result.totalDocs > 0
}

async function ownedFriendLink(owner: string, id: string) {
  const payload = await getPayloadClient()
  const friend = await payload.findByID({ collection: 'friend-links', id, overrideAccess: true, depth: 0 }).catch(() => undefined)
  if (!friend || relationId(friend.owner) !== owner) throw new Error('友邻不存在。')
  return payload
}

export async function createFriendLink(owner: string, input: FriendLinkInput) {
  const payload = await getPayloadClient()
  const last = await payload.find({ collection: 'friend-links', overrideAccess: true, depth: 0, limit: 1, sort: '-sortOrder', where: { owner: { equals: owner } } })
  const sortOrder = Math.min(9999, Number(last.docs[0]?.sortOrder ?? 0) + 10)
  return payload.create({ collection: 'friend-links', overrideAccess: true, data: { owner, ...input, sortOrder } })
}

export async function updateFriendLink(owner: string, id: string, input: FriendLinkInput) {
  const payload = await ownedFriendLink(owner, id)
  return payload.update({ collection: 'friend-links', id, overrideAccess: true, data: input })
}

export async function setFriendLinkVisible(owner: string, id: string, isVisible: boolean) {
  const payload = await ownedFriendLink(owner, id)
  return payload.update({ collection: 'friend-links', id, overrideAccess: true, data: { isVisible } })
}

export async function deleteFriendLink(owner: string, id: string) {
  const payload = await ownedFriendLink(owner, id)
  return payload.delete({ collection: 'friend-links', id, overrideAccess: true })
}

/** 往前或往后挪一位，然后按新顺序重新编号，避免排序值相同导致挪不动。 */
export async function moveFriendLink(owner: string, id: string, direction: -1 | 1) {
  const payload = await ownedFriendLink(owner, id)
  const rows = await payload.find({ collection: 'friend-links', overrideAccess: true, depth: 0, limit: 500, sort: ['sortOrder', 'createdAt'], where: { owner: { equals: owner } } })
  const ids = rows.docs.map((row) => String(row.id))
  const from = ids.indexOf(id)
  const to = from + direction
  if (from < 0 || to < 0 || to >= ids.length) return
  ids.splice(to, 0, ...ids.splice(from, 1))
  await Promise.all(ids.map((rowId, index) => payload.update({ collection: 'friend-links', id: rowId, overrideAccess: true, data: { sortOrder: (index + 1) * 10 } })))
}
