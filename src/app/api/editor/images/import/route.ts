import { headers } from 'next/headers';
import { createLocalReq } from 'payload';
import { importRemoteMedia } from '../../../../../lib/media-import';
import { getPayloadClient } from '../../../../../lib/payload';

export async function POST(request: Request) {
  const payload = await getPayloadClient();
  const auth = await payload.auth({ headers: await headers(), canSetHeaders: false });
  if (!auth.user) return Response.json({ message: '请先登录。' }, { status: 401 });

  let source = '';
  let alt = '';
  try {
    const body = await request.json() as { alt?: unknown; source?: unknown };
    source = typeof body.source === 'string' ? body.source.trim() : '';
    alt = typeof body.alt === 'string' ? body.alt.trim() : '';
  } catch {
    return Response.json({ message: '请提供有效的图片地址。' }, { status: 400 });
  }
  if (!source) return Response.json({ message: '图片地址为空。' }, { status: 400 });
  if (alt.length > 240) return Response.json({ message: '图片说明不能超过 240 字。' }, { status: 400 });

  try {
    const req = await createLocalReq({ user: auth.user }, payload);
    const media = await importRemoteMedia({ alt, owner: String(auth.user.id), payload, req, source });
    return Response.json(media);
  } catch (error) {
    payload.logger.error({ err: error }, 'Remote article image import failed');
    const rawMessage = error instanceof Error ? error.message : '图片导入失败。';
    const isUploadFailure = rawMessage.includes('ImgBed') || rawMessage.includes('图床');
    return Response.json({
      message: isUploadFailure ? '图片已读取，但上传到图床失败，请稍后重试。' : rawMessage,
    }, { status: isUploadFailure ? 502 : 422 });
  }
}
