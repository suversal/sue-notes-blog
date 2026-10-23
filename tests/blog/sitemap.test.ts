import { afterEach, describe, expect, it, vi } from 'vitest';

const { find } = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock('../../src/lib/payload', () => ({ getPayloadClient: async () => ({ find }) }));

import sitemap from '../../src/app/sitemap';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('公开站点地图', () => {
  it('只查询已发布且公开的地址，使用发布版本的 slug，并覆盖超过 100 篇的文章', async () => {
    vi.stubEnv('PAYLOAD_SERVER_URL', 'https://suversal.com');
    find.mockResolvedValue({ docs: Array.from({ length: 125 }, (_, index) => ({
      slug: `private-draft-${index}`, publishedSlug: `published-${index}`, publishedAt: '2026-10-22T12:00:00.000Z',
    })) });

    const entries = await sitemap();
    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      pagination: false,
      depth: 0,
      select: { publishedSlug: true, publishedAt: true },
      where: { and: [
        { status: { equals: 'published' } }, { visibility: { equals: 'public' } },
        { publishedRevision: { exists: true } }, { publishedSlug: { exists: true } },
      ] },
    }));
    expect(entries).toHaveLength(131);
    expect(entries.at(-1)).toEqual({ url: 'https://suversal.com/blog/published-124', lastModified: '2026-10-22T12:00:00.000Z' });
    expect(entries.some((entry) => /private-draft|\/articles|\/login/.test(entry.url))).toBe(false);
  });

  it('正确编码中文及特殊字符，不为缺少发布日期的条目伪造更新时间', async () => {
    vi.stubEnv('PAYLOAD_SERVER_URL', 'https://suversal.com/');
    find.mockResolvedValue({ docs: [{ publishedSlug: '中文 & 工具' }, { publishedSlug: null }] });
    const entries = await sitemap();
    expect(entries.at(-1)).toEqual({ url: 'https://suversal.com/blog/%E4%B8%AD%E6%96%87%20%26%20%E5%B7%A5%E5%85%B7' });
    expect(entries).toHaveLength(7);
  });
});
