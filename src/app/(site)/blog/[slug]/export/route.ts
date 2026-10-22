import { articleContentToMarkdown } from '../../../../../lib/article-content-markdown'
import { getPublicPost } from '../../../../../lib/blog-data'

export const dynamic = 'force-dynamic'

function markdownFilename(slug: string) {
  const fallback = slug.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'article'
  return {
    ascii: `${fallback}.md`,
    encoded: encodeURIComponent(`${slug || 'article'}.md`),
  }
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const post = await getPublicPost((await context.params).slug)
  if (!post) return new Response('Not Found', { status: 404 })

  const body = articleContentToMarkdown(post.content)
  const references = post.publicReferences.length
    ? `\n\n## 公开引用\n\n${post.publicReferences
        .map((reference) => `- [${reference.label}](${reference.url})`)
        .join('\n')}`
    : ''
  const markdown = `# ${post.title}\n\n${post.excerpt ? `${post.excerpt}\n\n` : ''}${body}${references}\n`
  const filename = markdownFilename(post.slug)

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Robots-Tag': 'noindex',
      'Content-Disposition': `attachment; filename="${filename.ascii}"; filename*=UTF-8''${filename.encoded}`,
    },
  })
}
