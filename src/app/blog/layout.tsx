import type { Viewport } from 'next';
import { getPublicPosts, getSiteProfile } from '../../lib/blog-data';
import { BLOG_BACKGROUND_COLORS } from '../components/theme-runtime';
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

export default async function BlogLayout({ children }: { children: React.ReactNode }) {
  const [site, posts] = await Promise.all([getSiteProfile(), getPublicPosts()]);
  return <PublicShell site={site} searchPosts={posts}>{children}</PublicShell>;
}
