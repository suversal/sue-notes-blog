import type { MetadataRoute } from 'next';
import { getPublicSitemapPosts } from '../lib/blog-data';
import { getSiteOrigin } from '../lib/env';

// 每次读取当前发布状态，文章撤回或转私密后不会留在缓存的站点地图里。
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteOrigin();
  const posts = await getPublicSitemapPosts();
  return [
    ...['/blog', '/blog/archive', '/blog/explore', '/blog/uses', '/blog/about'].map((path) => ({ url: `${origin}${path}` })),
    ...posts.map((post) => ({
      url: `${origin}/blog/${encodeURIComponent(post.slug)}`,
      ...(post.publishedAt ? { lastModified: post.publishedAt } : {}),
    })),
  ];
}
