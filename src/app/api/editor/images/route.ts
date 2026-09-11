import { headers } from 'next/headers';
import { createLocalReq } from 'payload';
import { isEditorImageFile } from '../../../../lib/editor-image-file';
import { getPayloadClient } from '../../../../lib/payload';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const payload = await getPayloadClient();
  const auth = await payload.auth({ headers: await headers(), canSetHeaders: false });
  if (!auth.user) return Response.json({ message: '请先登录。' }, { status: 401 });

  const form = await request.formData();
  const file = form.get('file');
  const requestedAlt = String(form.get('alt') ?? '').trim();
  if (!isEditorImageFile(file)) return Response.json({ message: '没有读取到图片文件，请重新复制图片后再试。' }, { status: 400 });
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return Response.json({ message: '支持 JPG、PNG、WebP、GIF 和 AVIF。' }, { status: 415 });
  if (file.size > MAX_IMAGE_SIZE) return Response.json({ message: '图片不能超过 10 MB。' }, { status: 413 });
  if (requestedAlt.length > 240) return Response.json({ message: '图片说明不能超过 240 字。' }, { status: 400 });
  const filenameAlt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  const alt = requestedAlt || (filenameAlt && !/^(image|pasted image)$/i.test(filenameAlt) ? filenameAlt : '粘贴图片');

  try {
    const req = await createLocalReq({ user: auth.user }, payload);
    const media = await payload.create({
      collection: 'media',
      req,
      data: {
        owner: auth.user.id,
        alt,
        provider: 'imgbed',
        storageKey: 'pending',
        sha256: 'pending',
        uploadedAt: new Date().toISOString(),
      },
      file: {
        data: Buffer.from(await file.arrayBuffer()),
        mimetype: file.type,
        name: file.name,
        size: file.size,
      },
    });
    return Response.json({
      id: String(media.id),
      alt,
      filename: media.filename,
      height: media.height,
      mimeType: media.mimeType,
      url: media.url,
      width: media.width,
    });
  } catch (error) {
    payload.logger.error({ err: error }, 'Article image upload failed');
    const message = error instanceof Error && error.message.includes('IMGBED_API_TOKEN')
      ? '图片服务尚未配置，请先设置服务端 Token。'
      : error instanceof Error && error.message.includes('超时')
        ? '图床响应超时，已自动重试；请稍后再试。'
        : '图片上传失败，请稍后重试。';
    return Response.json({ message }, { status: 502 });
  }
}
