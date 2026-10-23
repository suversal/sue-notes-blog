import { publicPageMetadata } from '../../../../lib/blog-seo'
import { headers } from 'next/headers'
import { FriendsClient } from '../components/friends-client'
import { getSiteProfile } from '../../../../lib/blog-data'
import { getSiteOrigin } from '../../../../lib/env'
import { shortMotto } from '../../../../lib/friend-links-labels'
import { getFriendCard, listFriendLinks } from '../../../../lib/friend-links-service'
import { getPayloadClient } from '../../../../lib/payload'
import { isPublicOwner } from '../../../../lib/uses-service'

export const metadata = publicPageMetadata({
  title: '友邻 · 苏码玩家',
  description: '常去串门的独立博客，以及交换友链的方式。',
  path: '/blog/friends',
})

export const dynamic = 'force-dynamic'

export default async function FriendsPage() {
  const payload = await getPayloadClient()
  const auth = await payload.auth({ headers: await headers(), canSetHeaders: false })
  const userId = auth.user ? String(auth.user.id) : undefined
  // 所有者本人能看到隐藏条目并在页面上直接编辑；其他人只拿到公开数据。
  const canEdit = await isPublicOwner(userId)
  const [friends, site, card] = await Promise.all([
    listFriendLinks(canEdit ? { owner: userId, includeHidden: true } : {}),
    getSiteProfile(),
    getFriendCard(canEdit ? userId : undefined),
  ])
  const origin = getSiteOrigin()
  // 信纸上每一项都可以在页面上改；没填的项用站点本身的信息。
  const cardDefaults = { name: site.siteName, url: origin, avatar: `${origin}/icon.svg`, motto: shortMotto(site.tagline) }
  const self = {
    name: card.name || cardDefaults.name,
    url: card.url || cardDefaults.url,
    avatar: card.avatar || cardDefaults.avatar,
    motto: card.motto || cardDefaults.motto,
    author: site.authorName,
  }
  return (
    <main id="main-content" tabIndex={-1}>
      <FriendsClient friends={friends} canEdit={canEdit} self={self} {...(canEdit ? { card, cardDefaults } : {})} />
    </main>
  )
}
