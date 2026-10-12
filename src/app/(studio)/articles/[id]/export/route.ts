import { getPayloadClient } from '../../../../../lib/payload';
import { relationId } from '../../../../../lib/blog-data';
import { articleContentToMarkdown } from '../../../../../lib/article-content-markdown';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const payload = await getPayloadClient(); const auth = await payload.auth({ headers: request.headers, canSetHeaders: false }); if (!auth.user) return new Response('Unauthorized', { status: 401 }); const article = await payload.findByID({ collection: 'articles', id: (await context.params).id, overrideAccess: true, depth: 1 }).catch(() => undefined) as any; if (!article || relationId(article.owner) !== String(auth.user.id)) return new Response('Not Found', { status: 404 }); const filename = `${String(article.slug || 'article').replace(/[^a-z0-9-]/g, '-')}.md`; const bodyMarkdown = articleContentToMarkdown(article.content); const markdown = `# ${article.title}\n\n${article.excerpt ? `${article.excerpt}\n\n` : ''}${bodyMarkdown}`;
  return new Response(markdown, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` } });
}
