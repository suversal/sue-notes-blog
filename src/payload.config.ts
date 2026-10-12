import { postgresAdapter } from '@payloadcms/db-postgres';
import { buildConfig } from 'payload';
import { zh } from 'payload/i18n/zh';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { Articles } from './collections/articles';
import { ArticleRevisions } from './collections/article-revisions';
import { ArticleViewDays } from './collections/article-view-days';
import { ExploreItems } from './collections/explore-items';
import { PublishApprovals } from './collections/publish-approvals';
import { SiteSettings } from './collections/site-settings';
import { Topics } from './collections/topics';
import { UsesCategories } from './collections/uses-categories';
import { UsesItems } from './collections/uses-items';
import { Users } from './collections/users';
import { Media } from './collections/media';
import { getServerEnv } from './lib/env';

const env = getServerEnv();
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  secret: env.PAYLOAD_SECRET,
  serverURL: env.PAYLOAD_SERVER_URL,
  i18n: {
    fallbackLanguage: 'zh',
    supportedLanguages: { zh },
  },
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: dirname,
      importMapFile: path.resolve(dirname, 'app/importMap.ts'),
    },
  },
  db: postgresAdapter({
    pool: { connectionString: env.DATABASE_URL },
    idType: 'uuid',
    migrationDir: path.resolve(dirname, '../migrations'),
    // Apply explicit migrations outside requests; interactive schema push can stall rendering.
    push: false,
  }),
  // 站点只用本地 API 和 REST，关闭 GraphQL 入口。
  graphQL: { disable: true },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  sharp,
  collections: [Users, Media, Topics, SiteSettings, ExploreItems, UsesCategories, UsesItems, Articles, ArticleRevisions, PublishApprovals, ArticleViewDays],
});
