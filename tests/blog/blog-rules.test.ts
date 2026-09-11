import { describe, expect, it } from 'vitest';
import { normalizeTopicName, validateTopicName } from '../../src/lib/blog-admin-service';
import { readingMinutes } from '../../src/lib/blog-shared';

describe('博客主题规则', () => {
  it('统一全角字符和多余空格', () => {
    expect(normalizeTopicName('  工程　实践  ')).toBe('工程 实践');
  });

  it('拒绝空名称、超长名称和系统保留名称', () => {
    expect(() => validateTopicName('')).toThrow('1–20');
    expect(() => validateTopicName('这是一个超过二十个字符的主题名称不应该被保存下来')).toThrow('1–20');
    expect(() => validateTopicName('未分类')).toThrow('系统保留');
  });
});

describe('阅读时间', () => {
  it('至少显示一分钟，并按正文长度递增', () => {
    expect(readingMinutes('短文')).toBe(1);
    expect(readingMinutes('字'.repeat(1001))).toBe(3);
  });
});
