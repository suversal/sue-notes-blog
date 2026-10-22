import { publicPageMetadata } from '../../../lib/blog-seo';
import { getPublicPosts, getSiteProfile } from '../../../lib/blog-data';
import { HomeClient } from './components/home-client';

export const dynamic = 'force-dynamic';
export const metadata = publicPageMetadata({ title: '苏码玩家 · 文章', description: '一个程序员的折腾记录：Apple 生态、家庭网络、出海基建，还有 AI。', path: '/blog' });

export default async function BlogIndex() {
  const [site, posts] = await Promise.all([getSiteProfile(), getPublicPosts(100, 'pinned')]);
  return <main id="main-content" tabIndex={-1}><HomeClient site={site} posts={posts} /></main>;
}
