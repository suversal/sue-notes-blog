import type { Metadata } from 'next';
import { ThemeSync } from './components/theme-sync';

// 前台 (site) 和写作后台 (studio) 各有自己的根布局，这里是两边共用的部分。
export const rootMetadata: Metadata = {
  title: { default: '苏码玩家', template: '%s' },
  description: '关于工具、创造，以及认真生活的小事。',
};

export const rootHtmlProps: React.HtmlHTMLAttributes<HTMLHtmlElement> & {
  'data-blog-palette': string;
  'data-blog-theme': string;
  'data-blog-theme-preference': string;
  'data-scroll-behavior': string;
} = {
  'data-blog-palette': 'journal',
  'data-blog-theme': 'light',
  'data-blog-theme-preference': 'system',
  'data-scroll-behavior': 'smooth',
  lang: 'zh-CN',
  suppressHydrationWarning: true,
};

export function RootChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeSync />
      <a className="skipLink" href="#main-content">跳到主要内容</a>
      {children}
    </>
  );
}
