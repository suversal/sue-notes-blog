import { handleServerFunctions, RootLayout as PayloadRootLayout } from '@payloadcms/next/layouts';
import type { Metadata } from 'next';
import type { ServerFunctionClient } from 'payload';
import config from '../payload.config';
import { importMap } from './importMap';
import './globals.css';

export const metadata: Metadata = {
  title: { default: '苏码手记', template: '%s' },
  description: '关于工具、创造，以及认真生活的小事。',
};

const serverFunction: ServerFunctionClient = async (args) => {
  'use server';
  return handleServerFunctions({ ...args, config, importMap });
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('sue-notes-theme');var p=localStorage.getItem('sue-notes-palette');var pref=['light','system','dark'].includes(t)?t:'system';var dark=pref==='dark'||(pref==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.blogTheme=dark?'dark':'light';document.documentElement.dataset.blogThemePreference=pref;document.documentElement.dataset.blogPalette=['journal','paper','mountain','indigo'].includes(p)?p:'journal'}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return PayloadRootLayout({
    children: (
      <>
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <a className="skipLink" href="#main-content">跳到主要内容</a>
        {children}
      </>
    ),
    config,
    htmlProps: { lang: 'zh-CN', suppressHydrationWarning: true },
    importMap,
    serverFunction,
  });
}
