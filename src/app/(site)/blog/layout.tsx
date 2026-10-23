import type { Viewport } from 'next';
import { headers } from 'next/headers';
import Script from 'next/script';
import { getPublicPosts, getSiteProfile } from '../../../lib/blog-data';
import { BLOG_BACKGROUND_COLORS } from '../../components/theme-runtime';
import { getPayloadClient } from '../../../lib/payload';
import { hasPublicFriendLinks } from '../../../lib/friend-links-service';
import { hasPublicUses, isPublicOwner } from '../../../lib/uses-service';
import { PublicShell } from './components/public-shell';
import 'artalk/Artalk.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    {
      media: '(prefers-color-scheme: light)',
      color: BLOG_BACKGROUND_COLORS.journal.light,
    },
    {
      media: '(prefers-color-scheme: dark)',
      color: BLOG_BACKGROUND_COLORS.journal.dark,
    },
  ],
};

async function viewerIsOwner() {
  const payload = await getPayloadClient();
  const auth = await payload.auth({ headers: await headers(), canSetHeaders: false });
  return isPublicOwner(auth.user ? String(auth.user.id) : undefined);
}

export default async function BlogLayout({ children }: { children: React.ReactNode }) {
  const [site, posts, hasUses, hasFriends, isOwner] = await Promise.all([getSiteProfile(), getPublicPosts(), hasPublicUses(), hasPublicFriendLinks(), viewerIsOwner()]);
  // 清单为空时访客看不到「在用」「友邻」，但所有者需要入口进去添加第一条。
  return (
    <>
      <PublicShell site={site} searchPosts={posts} showUses={hasUses || isOwner} showFriends={hasFriends || isOwner}>{children}</PublicShell>
      {process.env.NODE_ENV === 'production' && (
        <Script
          src="https://stats.suversal.com/s.js"
          data-website-id="a0eae62d-81db-4753-9959-a0a93d462f8e"
          data-domains="suversal.com"
          strategy="afterInteractive"
        />
      )}
    </>
  );
}
