'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { signOut } from '../../login/actions';
import { Icon } from '../../blog/components/ui-icon';
import styles from '../admin-v1.module.css';

export function AdminShell({ children, siteName, authorName, articleCount }: { children: ReactNode; siteName: string; authorName: string; articleCount: number }) {
  const pathname = usePathname(); const active = (path: string) => pathname === path || (path === '/articles' && /^\/articles\/(new|[^/]+)$/.test(pathname));
  return <div className={styles.adminRoot}><aside className={styles.sidebar}><Link href="/articles" className={styles.brand}><img src="/icon.svg" alt="" /><span>{siteName}<small>SUE NOTES / WRITING STUDIO</small></span></Link><nav aria-label="后台导航"><p>写作空间</p><Link className={active('/articles') ? styles.active : ''} href="/articles"><Icon name="file" />文章 <span>{articleCount}</span></Link><Link className={active('/articles/topics') ? styles.active : ''} href="/articles/topics"><Icon name="tag" />主题</Link><p>站点</p><Link href="/blog"><Icon name="external" />查看博客</Link><Link className={active('/articles/settings') ? styles.active : ''} href="/articles/settings"><Icon name="settings" />站点设置</Link></nav><div className={styles.owner}><p>一个人的编辑部。<br />写作，按自己的节奏来。</p><div><span>{authorName.slice(0, 1).toUpperCase()}</span><p>{authorName}<small>站点所有者</small></p></div><form action={signOut}><button type="submit">退出登录</button></form></div></aside><div className={styles.adminMain}>{children}</div></div>;
}
