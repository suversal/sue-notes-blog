import { handleServerFunctions, RootLayout as PayloadRootLayout } from '@payloadcms/next/layouts';
import type { Metadata } from 'next';
import type { ServerFunctionClient } from 'payload';
import config from '../payload.config';
import { ThemeSync } from './components/theme-sync';
import { importMap } from './importMap';
import './globals.css';

export const metadata: Metadata = {
  title: { default: '苏码玩家', template: '%s' },
  description: '关于工具、创造，以及认真生活的小事。',
};

const serverFunction: ServerFunctionClient = async (args) => {
  'use server';
  return handleServerFunctions({ ...args, config, importMap });
};

const htmlProps: React.HtmlHTMLAttributes<HTMLHtmlElement> & {
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return PayloadRootLayout({
    children: (
      <>
        <ThemeSync />
        <a className="skipLink" href="#main-content">跳到主要内容</a>
        {children}
      </>
    ),
    config,
    htmlProps,
    importMap,
    serverFunction,
  });
}
