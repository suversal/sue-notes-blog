import { RootChrome, rootHtmlProps, rootMetadata } from '../root-shared';
import '../globals.css';

export const metadata = rootMetadata;

// 前台不套 Payload 的根布局：它会把页面内容推迟到浏览器端才渲染，
// 搜索引擎和链接预览拿到的就是空页面。编辑器只在 (studio) 里需要。
export default function SiteRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html {...rootHtmlProps}>
      <body>
        <RootChrome>{children}</RootChrome>
      </body>
    </html>
  );
}
