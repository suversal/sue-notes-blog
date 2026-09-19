import { headers } from 'next/headers';
import { createLocalReq } from 'payload';
import { MAX_OBSIDIAN_ARCHIVE_SIZE, readObsidianFiles } from '../../../../lib/obsidian-import';
import { importObsidianArticle } from '../../../../lib/obsidian-import-service';
import { getPayloadClient } from '../../../../lib/payload';

export const runtime = 'nodejs';

function isArchiveFile(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value
    && typeof value === 'object'
    && 'arrayBuffer' in value
    && typeof value.arrayBuffer === 'function'
    && 'name' in value
    && typeof value.name === 'string'
    && 'size' in value
    && typeof value.size === 'number',
  );
}

export async function POST(request: Request) {
  const payload = await getPayloadClient();
  const auth = await payload.auth({ headers: await headers(), canSetHeaders: false });
  if (!auth.user) return Response.json({ message: '请先登录。' }, { status: 401 });

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return Response.json({ message: '没有读取到上传文件，请重新选择。' }, { status: 400 });
  }

  try {
    const req = await createLocalReq({ user: auth.user }, payload);
    const source = data.get('source');
    let input: { archive?: Buffer; files?: ReturnType<typeof readObsidianFiles> };
    if (source === 'files') {
      const markdown = data.get('markdown');
      const markdownPath = data.get('markdownPath');
      const assets = data.getAll('asset');
      const assetPaths = data.getAll('assetPath');
      if (!isArchiveFile(markdown) || markdown.size === 0) {
        return Response.json({ message: '请选择一篇 Markdown。' }, { status: 400 });
      }
      if (typeof markdownPath !== 'string' || !markdownPath) {
        return Response.json({ message: 'Markdown 路径信息不完整，请重新选择目录。' }, { status: 400 });
      }
      if (assets.length !== assetPaths.length || assets.some((asset) => !isArchiveFile(asset))) {
        return Response.json({ message: 'assets 文件夹信息不完整，请重新选择。' }, { status: 400 });
      }
      input = {
        files: readObsidianFiles(
          { data: Buffer.from(await markdown.arrayBuffer()), path: markdownPath },
          await Promise.all(assets.map(async (asset, index) => ({
            data: Buffer.from(await (asset as File).arrayBuffer()),
            path: String(assetPaths[index]),
          }))),
        ),
      };
    } else {
      const file = data.get('archive');
      if (!isArchiveFile(file) || file.size === 0) return Response.json({ message: '请选择一个 ZIP 文件。' }, { status: 400 });
      if (!file.name.toLowerCase().endsWith('.zip')) return Response.json({ message: '仅支持 ZIP 格式的 Obsidian 文章包。' }, { status: 415 });
      if (file.size > MAX_OBSIDIAN_ARCHIVE_SIZE) return Response.json({ message: 'ZIP 不能超过 50 MB。' }, { status: 413 });
      input = { archive: Buffer.from(await file.arrayBuffer()) };
    }
    const result = await importObsidianArticle({
      ...input,
      owner: String(auth.user.id),
      payload,
      req,
    });
    return Response.json(result);
  } catch (error) {
    payload.logger.error({ err: error }, 'Obsidian article import failed');
    const message = error instanceof Error ? error.message : 'Obsidian 文章导入失败。';
    const uploadFailure = message.includes('ImgBed') || message.includes('图床');
    return Response.json({
      message: uploadFailure ? '文章图片已读取，但上传到图片服务器失败，请稍后重试。' : message,
    }, { status: uploadFailure ? 502 : 422 });
  }
}
