import { headers } from 'next/headers';
import { createLocalReq } from 'payload';
import { isEditorImageFile } from '../../../../lib/editor-image-file';
import { getPayloadClient } from '../../../../lib/payload';
import { isMP4, MAX_VIDEO_SIZE, videoFileError } from '../../../../lib/video-file';

export async function POST(request: Request) {
  const payload = await getPayloadClient();
  const auth = await payload.auth({ headers: await headers(), canSetHeaders: false });
  if (!auth.user) return Response.json({ message: '请先登录。' }, { status: 401 });
  if (Number(request.headers.get('content-length')) > MAX_VIDEO_SIZE + 1024 * 1024) {
    return Response.json({ message: '视频不能超过 50 MB。' }, { status: 413 });
  }

  let form: FormData;
  try { form = await request.formData(); } catch {
    return Response.json({ message: '没有读取到视频文件，请重新选择。' }, { status: 400 });
  }
  const file = form.get('file');
  if (!isEditorImageFile(file)) return Response.json({ message: '没有读取到视频文件，请重新选择。' }, { status: 400 });
  const error = videoFileError(file);
  if (error) return Response.json({ message: error }, { status: file.size > MAX_VIDEO_SIZE ? 413 : 415 });
  const requestedAlt = String(form.get('alt') ?? '').trim();
  if (requestedAlt.length > 240) return Response.json({ message: '视频说明不能超过 240 字。' }, { status: 400 });

  const data = Buffer.from(await file.arrayBuffer());
  if (!isMP4(data)) return Response.json({ message: '文件内容不是有效的 MP4 视频。' }, { status: 415 });
  const name = file.name.split(/[\\/]/).at(-1) || 'video.mp4';
  const alt = requestedAlt || name.replace(/\.mp4$/i, '').replace(/[-_]+/g, ' ').trim().slice(0, 240) || '文章视频';
  try {
    const req = await createLocalReq({ user: auth.user }, payload);
    const media = await payload.create({
      collection: 'media',
      req,
      data: { owner: auth.user.id, alt, provider: 'imgbed', storageKey: 'pending', sha256: 'pending', uploadedAt: new Date().toISOString() },
      file: { data, mimetype: 'video/mp4', name, size: data.length },
    });
    return Response.json({ id: String(media.id), alt: media.alt, filename: media.filename, mimeType: media.mimeType, url: media.url });
  } catch (error) {
    payload.logger.error({ err: error }, 'Article video upload failed');
    const message = error instanceof Error && error.message.includes('IMGBED_API_TOKEN')
      ? '媒体服务尚未配置，请先设置服务端 Token。'
      : error instanceof Error && error.message.includes('超时')
        ? '图床响应超时，请重试。'
        : '视频上传失败，请确认图床渠道允许 MP4 后重试。';
    return Response.json({ message }, { status: 502 });
  }
}
