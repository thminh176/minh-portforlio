import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { loadSnapshot } from '@/lib/content';
import { sitemapEntries } from '@/lib/content/seo';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapEntries(await loadSnapshot(), siteConfig.baseUrl);
}
