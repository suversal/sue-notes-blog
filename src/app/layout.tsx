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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return PayloadRootLayout({
    children: <><a className="skipLink" href="#main-content">跳到主要内容</a>{children}</>,
    config,
    htmlProps: { lang: 'zh-CN' },
    importMap,
    serverFunction,
  });
}
