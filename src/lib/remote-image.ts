import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const ALLOWED_TYPES = new Set(['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp']);
const extensionByType: Record<string, string> = {
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const blocked = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blocked.addSubnet(network, prefix, 'ipv4');
for (const [network, prefix] of [
  ['::', 128], ['::1', 128], ['100::', 64], ['2001:db8::', 32],
  ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
] as const) blocked.addSubnet(network, prefix, 'ipv6');

export function isForbiddenRemoteAddress(address: string) {
  const family = isIP(address);
  return family === 0 || blocked.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

export function detectImageMimeType(buffer: Buffer): string | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) return 'image/gif';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp' && ['avif', 'avis'].includes(buffer.subarray(8, 12).toString('ascii'))) return 'image/avif';
  return null;
}

export function parseDataImage(source: string) {
  const match = /^data:([^;,]+);base64,([a-z\d+/=\s]+)$/i.exec(source);
  if (!match || !ALLOWED_TYPES.has(match[1]!.toLowerCase())) throw new Error('不支持该图片数据格式。');
  const data = Buffer.from(match[2]!.replace(/\s/g, ''), 'base64');
  if (!data.length || data.length > MAX_IMAGE_SIZE) throw new Error('图片为空或超过 10 MB。');
  const mimeType = detectImageMimeType(data);
  if (mimeType !== match[1]!.toLowerCase()) throw new Error('图片内容与声明的格式不一致。');
  return { data, filename: `pasted-image${extensionByType[mimeType]}`, mimeType };
}

async function validatedTarget(raw: string) {
  if (raw.length > 4096) throw new Error('图片地址过长。');
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('仅支持 HTTP(S) 远程图片或内嵌图片数据。');
  if (url.username || url.password || (url.port && !['80', '443'].includes(url.port))) throw new Error('图片地址包含不允许的凭证或端口。');
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isForbiddenRemoteAddress(address))) throw new Error('图片地址指向本地、私有或保留网络。');
  return { address: addresses[0]!, url };
}

async function requestBuffer(raw: string, redirects = 0): Promise<{ data: Buffer; finalUrl: URL; mimeType: string }> {
  if (redirects > MAX_REDIRECTS) throw new Error('图片地址重定向过多。');
  const { address, url } = await validatedTarget(raw);
  const client = url.protocol === 'https:' ? https : http;
  const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
    const request = client.get({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      servername: url.protocol === 'https:' ? url.hostname : undefined,
      headers: { accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif', 'accept-encoding': 'identity', 'user-agent': 'SueNotes-Image-Importer/1.0' },
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
      timeout: 15_000,
    }, resolve);
    request.on('timeout', () => request.destroy(new Error('下载图片超时。')));
    request.on('error', reject);
  });

  if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) {
    response.resume();
    const location = response.headers.location;
    if (!location) throw new Error('图片重定向缺少目标。');
    return requestBuffer(new URL(location, url).toString(), redirects + 1);
  }
  if ((response.statusCode ?? 0) < 200 || (response.statusCode ?? 0) >= 300) {
    response.resume();
    throw new Error(`图片服务器返回 HTTP ${response.statusCode ?? 0}。`);
  }
  const declaredLength = Number(response.headers['content-length'] ?? 0);
  if (declaredLength > MAX_IMAGE_SIZE) {
    response.destroy();
    throw new Error('图片超过 10 MB。');
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of response) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_IMAGE_SIZE) {
      response.destroy();
      throw new Error('图片超过 10 MB。');
    }
    chunks.push(buffer);
  }
  const data = Buffer.concat(chunks);
  const mimeType = detectImageMimeType(data);
  if (!mimeType) throw new Error('远程内容不是支持的图片（JPG、PNG、WebP、GIF 或 AVIF）。');
  return { data, finalUrl: url, mimeType };
}

export async function downloadRemoteImage(source: string) {
  if (source.startsWith('data:')) return parseDataImage(source);
  const downloaded = await requestBuffer(source);
  const basename = path.basename(decodeURIComponent(downloaded.finalUrl.pathname)).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120);
  const expectedExtension = extensionByType[downloaded.mimeType];
  const filename = basename && path.extname(basename).toLowerCase() === expectedExtension
    ? basename
    : `${basename.replace(/\.[^.]+$/, '') || 'imported-image'}${expectedExtension}`;
  return { data: downloaded.data, filename, mimeType: downloaded.mimeType };
}
