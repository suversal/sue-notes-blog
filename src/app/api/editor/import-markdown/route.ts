import { headers } from 'next/headers';
import { createLocalReq } from 'payload';
import { rewriteMarkdownImages } from '../../../../lib/article-import';
import { importRemoteMedia } from '../../../../lib/media-import';
import { getPayloadClient } from '../../../../lib/payload';

const MAX_MARKDOWN_SIZE = 2_000_000;

export async function POST(request: Request) {
  const payload = await getPayloadClient();
  const auth = await payload.auth({ headers: await headers(), canSetHeaders: false });
  if (!auth.user) return Response.json({ message: '请先登录。' }, { status: 401 });

  let markdown = '';
  try {
    const body = await request.json() as { markdown?: unknown };
    markdown = typeof body.markdown === 'string' ? body.markdown : '';
  } catch {
    return Response.json({ message: 'Markdown 内容格式无效。' }, { status: 400 });
  }
  if (!markdown.trim()) return Response.json({ message: 'Markdown 内容为空。' }, { status: 400 });
  if (Buffer.byteLength(markdown, 'utf8') > MAX_MARKDOWN_SIZE) return Response.json({ message: 'Markdown 内容不能超过 2 MB。' }, { status: 413 });

  try {
    const req = await createLocalReq({ user: auth.user }, payload);
    const rewritten = await rewriteMarkdownImages(markdown, async ({ alt, source }) => importRemoteMedia({
      alt,
      owner: String(auth.user!.id),
      payload,
      req,
      source,
    }));
    return Response.json({
      markdown: rewritten.markdown,
      imageCount: rewritten.imageCount,
    });
  } catch (error) {
    payload.logger.error({ err: error }, 'Markdown article import failed');
    const rawMessage = error instanceof Error ? error.message : 'Markdown 导入失败。';
    const isUploadFailure = rawMessage.includes('ImgBed') || rawMessage.includes('图床');
    return Response.json({
      message: isUploadFailure ? '图片已读取，但上传到图床失败，请稍后重试。' : rawMessage,
    }, { status: isUploadFailure ? 502 : 422 });
  }
}
