import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPayloadClient } from '../../../../lib/payload';
import { getSiteProfile } from '../../../../lib/blog-data';
import { SettingsForm } from '../components/settings-form';
import styles from '../admin-v1.module.css';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const payload = await getPayloadClient(); const auth = await payload.auth({ headers: await headers(), canSetHeaders: false }); if (!auth.user) redirect('/login'); const site = await getSiteProfile(String(auth.user.id));
  return <main id="main-content" tabIndex={-1}><div className={styles.breadcrumb}><span>站点 / 基础设置</span><span>前台实时读取</span></div><header className={styles.pageHead}><div><h1>站点设置</h1><p>让这个地方，更像你。</p></div></header><SettingsForm site={site} /></main>;
}
