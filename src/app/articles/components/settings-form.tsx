'use client';

import { useActionState } from 'react';
import type { SiteProfile } from '../../../lib/blog-data';
import { saveSiteSettingsFromWeb } from '../actions';
import styles from '../admin-v1.module.css';

export function SettingsForm({ site }: { site: SiteProfile }) {
  const [state, action, pending] = useActionState(saveSiteSettingsFromWeb, { ok: false, message: '' });
  return <form className={styles.settingsForm} action={action}><section><h2>名字与介绍</h2><div><label><span>站点名称</span><input name="siteName" required maxLength={16} defaultValue={site.siteName} /></label><label><span>作者名称</span><input name="authorName" required maxLength={24} defaultValue={site.authorName} /></label></div><label><span>一句话介绍</span><input name="tagline" required maxLength={60} defaultValue={site.tagline} /><small>显示在首页刊头下方，建议简短、具体。</small></label><label><span>作者简介</span><textarea name="authorBio" required maxLength={250} defaultValue={site.authorBio} /><small>显示在关于页面正文的第一段。</small></label></section>{state.message && <p className={state.ok ? styles.success : styles.error} role={state.ok ? 'status' : 'alert'}>{state.message}</p>}<button className={styles.primaryButton} disabled={pending} type="submit">{pending ? '正在保存…' : '保存设置'}</button></form>;
}
