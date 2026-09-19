import { describe, expect, it } from 'vitest';
import { generateArticleSlug } from '../../src/lib/article-service';

describe('article slug generation', () => {
  it('generates a compact lowercase alphanumeric slug', () => {
    const slug = generateArticleSlug();

    expect(slug).toHaveLength(10);
    expect(slug).toMatch(/^[a-z0-9]{10}$/);
  });
});
