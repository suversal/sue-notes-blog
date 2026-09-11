import type { Metadata } from 'next';
import { getPublicPosts, getSiteProfile } from '../../lib/blog-data';
import { HomeClient } from './components/home-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '苏码手记 · 文章', description: '关于工具、创造，以及认真生活的小事。', robots: { index: true, follow: true } };

export default async function BlogIndex() {
  const [site, posts] = await Promise.all([getSiteProfile(), getPublicPosts()]);
  return <main id="main-content" tabIndex={-1}><HomeClient site={site} posts={posts} /></main>;
}
