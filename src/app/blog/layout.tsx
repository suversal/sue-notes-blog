import type { Viewport } from 'next';
import { headers } from 'next/headers';
import { getPublicPosts, getSiteProfile } from '../../lib/blog-data';
import { BLOG_BACKGROUND_COLORS } from '../components/theme-runtime';
import { getPayloadClient } from '../../lib/payload';
import { hasPublicUses, isPublicOwner } from '../../lib/uses-service';
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
  const [site, posts, hasUses, isOwner] = await Promise.all([getSiteProfile(), getPublicPosts(), hasPublicUses(), viewerIsOwner()]);
  // 清单为空时访客看不到「在用」，但所有者需要入口进去添加第一条。
  return <PublicShell site={site} searchPosts={posts} showUses={hasUses || isOwner}>{children}</PublicShell>;
}
