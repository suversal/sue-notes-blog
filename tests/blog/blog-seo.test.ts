import { afterEach, describe, expect, it, vi } from 'vitest';
import { articleDescription, articleJsonLd, articleMetadata, serializeJsonLd } from '../../src/lib/blog-seo';
import type { PublicPost, SiteProfile } from '../../src/lib/blog-data';
import type { ArticleContent } from '../../src/lib/article-content-data';

function content(blocks: { type: string; text: string }[]): ArticleContent {
  return {
    root: {
      type: 'root', direction: null, format: '', indent: 0, version: 1,
      children: blocks.map(({ type, text }) => ({ type, version: 1, children: [{ type: 'text', text, version: 1 }] })),
    },
  } as ArticleContent;
}

const site: SiteProfile = { siteName: '苏码玩家', authorName: 'Sue', tagline: '折腾记录', authorBio: '作者介绍' };
const post: PublicPost = {
  id: 'published-article', title: '软路由安装指南', slug: 'router-guide', excerpt: '',
  content: content([{ type: 'paragraph', text: '用家里的 NAS 安装软路由，逐步完成网络配置。' }]),
  readingMinutes: 5, topic: { id: 'network', name: '网络与代理' },
  coverStyle: 'none', pinPriority: 0, publicReferences: [],
  publishedAt: '2026-10-08T03:26:18.000Z', updatedAt: '2099-01-01T00:00:00.000Z',
};

afterEach(() => vi.unstubAllEnvs());

describe('公开文章搜索元数据', () => {
  it('优先保留手写摘要并清理空白，不替换成正文', () => {
    expect(articleDescription({ ...post, excerpt: '  手写摘要\n  说明适用范围。  ' })).toBe('手写摘要 说明适用范围。');
  });

  it('未写摘要时从正文段落提取，跳过标题、代码和表格', () => {
    expect(articleDescription({ ...post, content: content([
      { type: 'heading', text: '重复的文章标题' },
      { type: 'code', text: 'sudo systemctl restart service' },
      { type: 'table', text: '名称配置表格' },
      { type: 'paragraph', text: '先准备一台可以长期开机的设备。' },
      { type: 'paragraph', text: '然后安装系统。' },
    ]) })).toBe('先准备一台可以长期开机的设备。 然后安装系统。');
  });

  it('限制长摘要长度，保留完整 Unicode 字符', () => {
    const description = articleDescription({ ...post, excerpt: '😀'.repeat(170) });
    expect(Array.from(description)).toHaveLength(160);
    expect(description).toBe(`${'😀'.repeat(159)}…`);
  });

  it('只有配图或代码的文章回退到标题', () => {
    expect(articleDescription({ ...post, content: content([{ type: 'code', text: 'example()' }]) })).toBe(post.title);
  });

  it('搜索、分享卡片及结构化数据使用相同的公开 URL、摘要和封面，不暴露草稿修改时间', () => {
    vi.stubEnv('PAYLOAD_SERVER_URL', 'https://suversal.com');
    const article = { ...post, slug: '中文 & AI', coverImage: { id: 'cover', url: 'https://img.suversal.com/cover.png', alt: '软路由界面' } };
    const metadata = articleMetadata(article, site);
    const schema = articleJsonLd(article, site);
    const url = 'https://suversal.com/blog/%E4%B8%AD%E6%96%87%20%26%20AI';
    expect(metadata.alternates?.canonical).toBe(url);
    expect(metadata.openGraph).toMatchObject({ type: 'article', url, description: schema.description, images: [article.coverImage] });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', description: schema.description, images: [article.coverImage] });
    expect(schema).toMatchObject({ '@type': 'BlogPosting', url, datePublished: post.publishedAt, author: { name: 'Sue' }, image: [article.coverImage.url] });
    expect(serializeJsonLd(schema)).not.toContain(post.updatedAt);
  });

  it('没有封面时使用文字卡片，不生成不存在的图片地址', () => {
    const metadata = articleMetadata(post, site);
    expect(metadata.twitter).toMatchObject({ card: 'summary' });
    expect(metadata.twitter).not.toHaveProperty('images');
    expect(articleJsonLd(post, site)).not.toHaveProperty('image');
  });

  it('结构化数据中的文章文字不能提前结束 script 标签', () => {
    const schema = articleJsonLd({ ...post, title: '</script><script>alert(1)</script>' }, site);
    const serialized = serializeJsonLd(schema);
    expect(serialized).not.toContain('<');
    expect(JSON.parse(serialized).headline).toBe('</script><script>alert(1)</script>');
  });
});
