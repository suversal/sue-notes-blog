import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { File as PayloadFile } from 'payload';
import { getServerEnv } from './env';

type ImgBedUpload = {
  publicUrl?: unknown;
  src?: unknown;
};

export type ImgBedUploadResult = {
  publicUrl: string;
  sha256: string;
  storageKey: string;
};

async function fileBuffer(file: PayloadFile) {
  if (file.data.length > 0) return file.data;
  if (file.tempFilePath) return readFile(file.tempFilePath);
  throw new Error('没有收到可上传的图片内容。');
}

function normalizedBaseUrl(value: string) {
  return new URL(value.endsWith('/') ? value : `${value}/`);
}

export async function uploadImageToImgBed(
  file: PayloadFile,
  options: {
    env?: Record<string, string | undefined>;
    fetch?: typeof fetch;
    retryDelayMs?: number;
    timeoutMs?: number;
  } = {},
): Promise<ImgBedUploadResult> {
  if (!file.mimetype.startsWith('image/')) throw new Error('ImgBed 只接受图片文件。');

  const env = getServerEnv(options.env);
  if (!env.IMGBED_API_TOKEN) throw new Error('图片服务尚未配置，请设置 IMGBED_API_TOKEN。');

  const buffer = await fileBuffer(file);
  const endpoint = new URL('upload', normalizedBaseUrl(env.IMGBED_API_URL));
  endpoint.searchParams.set('returnFormat', 'full');
  endpoint.searchParams.set('uploadFolder', env.IMGBED_UPLOAD_FOLDER);
  endpoint.searchParams.set('uploadNameType', 'default');
  endpoint.searchParams.set('channelName', env.IMGBED_CHANNEL_NAME);

  const request = options.fetch ?? fetch;
  const retryDelayMs = options.retryDelayMs ?? 350;
  const timeoutMs = options.timeoutMs ?? 15_000;
  let response: Response | undefined;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const form = new FormData();
    form.set('file', new Blob([new Uint8Array(buffer)], { type: file.mimetype }), file.name);
    try {
      response = await request(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.IMGBED_API_TOKEN}` },
        body: form,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok || (response.status < 500 && response.status !== 429)) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt === 0 && retryDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  if (!response) throw new Error('图床上传超时。', { cause: lastError });

  if (!response.ok) throw new Error(`ImgBed 上传失败（HTTP ${response.status}）。`);

  const body: unknown = await response.json();
  const first = Array.isArray(body) ? body[0] as ImgBedUpload | undefined : undefined;
  const rawUrl = typeof first?.publicUrl === 'string'
    ? first.publicUrl
    : typeof first?.src === 'string'
      ? first.src
      : undefined;
  if (!rawUrl) throw new Error('ImgBed 没有返回图片地址。');

  const publicUrl = new URL(rawUrl, env.IMGBED_PUBLIC_BASE_URL);
  const allowedOrigin = normalizedBaseUrl(env.IMGBED_PUBLIC_BASE_URL).origin;
  if (publicUrl.protocol !== 'https:' || publicUrl.origin !== allowedOrigin) {
    throw new Error('ImgBed 返回了不受信任的图片地址。');
  }

  return {
    publicUrl: publicUrl.toString(),
    sha256: createHash('sha256').update(buffer).digest('hex'),
    storageKey: publicUrl.pathname.replace(/^\/+/, ''),
  };
}
