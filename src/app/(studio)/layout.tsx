import { handleServerFunctions, RootLayout as PayloadRootLayout } from '@payloadcms/next/layouts';
import type { ServerFunctionClient } from 'payload';
import config from '../../payload.config';
import { importMap } from '../importMap';
import { RootChrome, rootHtmlProps, rootMetadata } from '../root-shared';
import '../globals.css';

export const metadata = { ...rootMetadata, robots: { index: false, follow: false } };

const serverFunction: ServerFunctionClient = async (args) => {
  'use server';
  return handleServerFunctions({ ...args, config, importMap });
};

// 写作后台内嵌 Payload 的 Lexical 编辑器，需要它的根布局提供 server functions 和 importMap。
export default function StudioRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return PayloadRootLayout({
    children: <RootChrome>{children}</RootChrome>,
    config,
    htmlProps: rootHtmlProps,
    importMap,
    serverFunction,
  });
}
