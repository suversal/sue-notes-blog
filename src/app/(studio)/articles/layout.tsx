import type { Viewport } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPayloadClient } from '../../../lib/payload';
import { getSiteProfile } from '../../../lib/blog-data';
import { BLOG_BACKGROUND_COLORS } from '../../components/theme-runtime';
import { AdminShell } from './components/admin-shell';
import './editor-overlays.css';

export const dynamic = 'force-dynamic';

// 和前台一致：首屏先按系统明暗给浏览器栏上色，脚本加载后再换成所选配色。
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: BLOG_BACKGROUND_COLORS.journal.light },
    { media: '(prefers-color-scheme: dark)', color: BLOG_BACKGROUND_COLORS.journal.dark },
  ],
};

export default async function ArticlesLayout({ children }: { children: React.ReactNode }) {
  const payload = await getPayloadClient(); const auth = await payload.auth({ headers: await headers(), canSetHeaders: false }); if (!auth.user) redirect('/login'); const owner = String(auth.user.id);
  const [site, articles] = await Promise.all([getSiteProfile(owner), payload.count({ collection: 'articles', overrideAccess: true, where: { owner: { equals: owner } } })]);
  return <AdminShell siteName={site.siteName} authorName={site.authorName} articleCount={articles.totalDocs}>{children}</AdminShell>;
}
