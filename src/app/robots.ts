import type { MetadataRoute } from 'next';
import { getSiteOrigin } from '../lib/env';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/articles', '/admin', '/login', '/setup', '/api/', '/artalk/'],
    },
    sitemap: `${getSiteOrigin()}/sitemap.xml`,
  };
}
