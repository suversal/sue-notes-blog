import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPayloadClient } from '../../../../lib/payload'
import {
  getSiteProfile,
  publicCoverImage,
  relationId,
  type PublicPost,
} from '../../../../lib/blog-data'
import { articleContentPlainText } from '../../../../lib/article-content-data'
import { PreviewScreen } from './preview-screen'
import styles from '../../admin-v1.module.css'

export const dynamic = 'force-dynamic'

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ approval?: string; notice?: string }>
}) {
  const payload = await getPayloadClient()
  const auth = await payload.auth({ headers: await headers(), canSetHeaders: false })
  if (!auth.user) redirect('/login')
  const owner = String(auth.user.id)
  const id = (await params).id
  const query = await searchParams
  const article = (await payload
    .findByID({ collection: 'articles', id, overrideAccess: true, depth: 1 })
    .catch(() => undefined)) as any
  if (!article || relationId(article.owner) !== owner || article.status === 'archived') notFound()
  if (query.notice === 'published')
    return (
      <main id="main-content" tabIndex={-1} className={styles.publishSuccess}>
        <span>✓</span>
        <h1>文章已经准备好与读者见面。</h1>
        <p>“{article.title}”的新版本已经公开。</p>
        <div>
          <Link href="/articles">返回文章</Link>
          <Link
            className={styles.primaryButton}
            href={`/blog/${article.publishedSlug || article.slug}`}
          >
            查看文章
          </Link>
        </div>
      </main>
    )
  let revision = article
  if (query.approval) {
    const approval = (await payload
      .findByID({
        collection: 'publish-approvals',
        id: query.approval,
        overrideAccess: true,
        depth: 0,
      })
      .catch(() => undefined)) as any
    if (
      !approval ||
      relationId(approval.article) !== id ||
      approval.usedAt ||
      new Date(approval.expiresAt) < new Date()
    )
      redirect(`/articles/${id}/preview`)
    revision = await payload.findByID({
      collection: 'article-revisions',
      id: relationId(approval.revision),
      overrideAccess: true,
      depth: 1,
    })
  } else if (article.currentRevision) {
    revision = await payload.findByID({
      collection: 'article-revisions',
      id: relationId(article.currentRevision),
      overrideAccess: true,
      depth: 1,
    })
  }
  const topic =
    revision.topic && typeof revision.topic === 'object'
      ? { id: String(revision.topic.id), name: revision.topic.name }
      : {
          id: relationId(revision.topic) || 'uncategorized',
          name: revision.tags?.[0]?.value || '未分类',
        }
  const post: PublicPost = {
    id,
    title: revision.title,
    slug: revision.slug,
    excerpt: revision.excerpt || '',
    content: revision.content,
    plainText: articleContentPlainText(revision.content),
    topic,
    coverStyle: revision.coverStyle || 'none',
    coverImage: publicCoverImage(revision.coverImage),
    pinPriority: Number(article.pinPriority) || 0,
    publishedAt: article.publishedAt || new Date().toISOString(),
    updatedAt: article.updatedAt,
    publicReferences: revision.publicReferences ?? [],
  }
  const site = await getSiteProfile(owner)
  return (
    <main id="main-content" tabIndex={-1}>
      <PreviewScreen
        post={post}
        site={site}
        approvalId={query.approval}
        updating={article.status === 'published'}
      />
    </main>
  )
}
