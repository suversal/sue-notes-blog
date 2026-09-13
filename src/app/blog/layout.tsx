import { getPublicPosts, getSiteProfile } from '../../lib/blog-data';
import { PublicShell } from './components/public-shell';
import 'artalk/Artalk.css';

export default async function BlogLayout({ children }: { children: React.ReactNode }) {
  const [site, posts] = await Promise.all([getSiteProfile(), getPublicPosts()]);
  return <PublicShell site={site} searchPosts={posts}>{children}</PublicShell>;
}
