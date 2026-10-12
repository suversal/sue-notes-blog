import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getPublicPost, getPublicPosts } from '../../../../lib/blog-data';
import { getPayloadClient } from '../../../../lib/payload';
import { ArticleReader } from '../components/article-reader';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPublicPost((await params).slug); if (!post) notFound();
  const title = `${post.title} · 苏码玩家`; return { title, description: post.excerpt, alternates: { canonical: `/blog/${post.slug}` }, openGraph: { title, description: post.excerpt, type: 'article', url: `/blog/${post.slug}`, publishedTime: post.publishedAt }, robots: { index: true, follow: true } };
}

export default async function PublicArticle({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const payload = await getPayloadClient();
  const requestHeaders = await headers();
  const [post, posts, auth] = await Promise.all([
    getPublicPost(slug),
    getPublicPosts(),
    payload.auth({ headers: requestHeaders, canSetHeaders: false }),
  ]);
  if (!post) notFound();
  const currentIndex = posts.findIndex((item) => item.id === post.id);
  const previousPost = currentIndex > 0 ? posts[currentIndex - 1] : undefined;
  const nextPost = currentIndex >= 0 ? posts[currentIndex + 1] : undefined;
  const editHref = auth.user ? `/articles/${encodeURIComponent(post.id)}` : undefined;
  return <main id="main-content" tabIndex={-1}><ArticleReader post={post} {...(editHref ? { editHref } : {})} {...(previousPost ? { previousPost } : {})} {...(nextPost ? { nextPost } : {})} /></main>;
}
