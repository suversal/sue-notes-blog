import { describe, expect, it, vi } from 'vitest';
import { uploadImageToImgBed } from '../../src/lib/imgbed';

const env = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:55433/sue_notes_blog',
  PAYLOAD_SECRET: 'a'.repeat(32),
  IMGBED_API_URL: 'https://img.suversal.com/',
  IMGBED_PUBLIC_BASE_URL: 'https://img.suversal.com/',
  IMGBED_API_TOKEN: 'server-only-test-token',
  IMGBED_UPLOAD_FOLDER: 'knowhub',
  IMGBED_CHANNEL_NAME: 'Tel_Channel',
};

const file = {
  data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  mimetype: 'image/svg+xml',
  name: 'probe.svg',
  size: 41,
};

describe('ImgBed client', () => {
  it('uses server-side bearer auth and accepts the configured public origin', async () => {
    const request = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const endpoint = input instanceof URL ? input : new URL(String(input));
      expect(endpoint.searchParams.get('channelName')).toBe('Tel_Channel');
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer server-only-test-token');
      expect(init?.body).toBeInstanceOf(FormData);
      return Response.json([{ src: 'https://img.suversal.com/file/knowhub/probe.svg' }]);
    });

    const result = await uploadImageToImgBed(file, { env, fetch: request as typeof fetch });

    expect(result.publicUrl).toBe('https://img.suversal.com/file/knowhub/probe.svg');
    expect(result.storageKey).toBe('file/knowhub/probe.svg');
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects a URL returned from an unexpected host', async () => {
    const request = vi.fn(async () => Response.json([{ src: 'https://example.com/stolen.svg' }]));

    await expect(uploadImageToImgBed(file, { env, fetch: request as typeof fetch }))
      .rejects.toThrow('不受信任');
  });

  it('retries once when the first upload request fails', async () => {
    const request = vi.fn()
      .mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'))
      .mockResolvedValueOnce(Response.json([{ src: 'https://img.suversal.com/file/knowhub/retried.svg' }]));

    const result = await uploadImageToImgBed(file, {
      env,
      fetch: request as typeof fetch,
      retryDelayMs: 0,
      timeoutMs: 1_000,
    });

    expect(request).toHaveBeenCalledTimes(2);
    expect(result.publicUrl).toBe('https://img.suversal.com/file/knowhub/retried.svg');
  });
});
