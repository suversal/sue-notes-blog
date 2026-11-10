import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { File as PayloadFile } from 'payload';
import { getServerEnv } from './env';
import { isMP4, videoFileError } from './video-file';

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
  throw new Error('没有收到可上传的文件内容。');
}

function normalizedBaseUrl(value: string) {
  return new URL(value.endsWith('/') ? value : `${value}/`);
}

export async function uploadMediaToImgBed(
  file: PayloadFile,
  options: {
    env?: Record<string, string | undefined>;
    fetch?: typeof fetch;
    retryDelayMs?: number;
    timeoutMs?: number;
  } = {},
): Promise<ImgBedUploadResult> {
  const isVideo = file.mimetype === 'video/mp4';
  if (!file.mimetype.startsWith('image/') && !isVideo) throw new Error('只支持图片和 MP4 视频。');

  const env = getServerEnv(options.env);
  if (!env.IMGBED_API_TOKEN) throw new Error('图片服务尚未配置，请设置 IMGBED_API_TOKEN。');

  const buffer = await fileBuffer(file);
  if (isVideo) {
    const error = videoFileError({ name: file.name, type: file.mimetype, size: buffer.length });
    if (error) throw new Error(error);
    if (!isMP4(buffer)) throw new Error('文件内容不是有效的 MP4 视频。');
  }
  const endpoint = new URL('upload', normalizedBaseUrl(env.IMGBED_API_URL));
  endpoint.searchParams.set('returnFormat', 'full');
  endpoint.searchParams.set('uploadFolder', env.IMGBED_UPLOAD_FOLDER);
  endpoint.searchParams.set('uploadNameType', 'default');
  endpoint.searchParams.set('channelName', env.IMGBED_CHANNEL_NAME);

  const request = options.fetch ?? fetch;
  const retryDelayMs = options.retryDelayMs ?? 350;
  const timeoutMs = options.timeoutMs ?? (isVideo ? 120_000 : 15_000);
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
  if (!rawUrl) throw new Error('ImgBed 没有返回文件地址。');

  const publicUrl = new URL(rawUrl, env.IMGBED_PUBLIC_BASE_URL);
  const allowedOrigin = normalizedBaseUrl(env.IMGBED_PUBLIC_BASE_URL).origin;
  if (publicUrl.protocol !== 'https:' || publicUrl.origin !== allowedOrigin) {
    throw new Error('ImgBed 返回了不受信任的文件地址。');
  }

  return {
    publicUrl: publicUrl.toString(),
    sha256: createHash('sha256').update(buffer).digest('hex'),
    storageKey: publicUrl.pathname.replace(/^\/+/, ''),
  };
}

export function uploadImageToImgBed(file: PayloadFile, options: Parameters<typeof uploadMediaToImgBed>[1] = {}) {
  if (!file.mimetype.startsWith('image/')) return Promise.reject(new Error('此接口只接受图片文件。'));
  return uploadMediaToImgBed(file, options);
}
