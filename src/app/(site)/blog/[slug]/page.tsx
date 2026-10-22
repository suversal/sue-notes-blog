import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getPublicPost, getPublicPosts, getSiteProfile } from '../../../../lib/blog-data';
import { articleJsonLd, articleMetadata, serializeJsonLd } from '../../../../lib/blog-seo';
import { getPayloadClient } from '../../../../lib/payload';
import { ArticleReader } from '../components/article-reader';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [post, site] = await Promise.all([getPublicPost((await params).slug), getSiteProfile()]);
  if (!post) notFound();
  return articleMetadata(post, site);
}

export default async function PublicArticle({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const payload = await getPayloadClient();
  const requestHeaders = await headers();
  const [post, posts, auth, site] = await Promise.all([
    getPublicPost(slug),
    getPublicPosts(),
    payload.auth({ headers: requestHeaders, canSetHeaders: false }),
    getSiteProfile(),
  ]);
  if (!post) notFound();
  const currentIndex = posts.findIndex((item) => item.id === post.id);
  const previousPost = currentIndex > 0 ? posts[currentIndex - 1] : undefined;
  const nextPost = currentIndex >= 0 ? posts[currentIndex + 1] : undefined;
  const editHref = auth.user ? `/articles/${encodeURIComponent(post.id)}` : undefined;
  return (
    <main id="main-content" tabIndex={-1}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd(post, site)) }} />
      <ArticleReader post={post} {...(editHref ? { editHref } : {})} {...(previousPost ? { previousPost } : {})} {...(nextPost ? { nextPost } : {})} />
    </main>
  );
}
