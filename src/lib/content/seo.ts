import type { Metadata, MetadataRoute } from 'next';
import { ContentValidationError } from './validate.ts';
import { detailPath, fixedPath, type FixedPage } from './routes.ts';
import type { Locale, Post, Profile, Project, SiteSettings, Snapshot } from './types.ts';

export interface SeoConfig { readonly baseUrl: string; readonly isProduction: boolean }
const locales: readonly Locale[] = ['vi', 'en'];
const absolute = (baseUrl: string, path: string) => `${baseUrl}${path}`;
const robots = (production: boolean) => ({ index: production, follow: production });
function pair<T extends { locale: Locale }>(records: readonly T[], locale: Locale): T {
  const found = records.find(record => record.locale === locale);
  if (!found) throw new ContentValidationError('', 'seo.requiredLocale');
  return found;
}
function metadataImage(snapshot: Snapshot, use: NonNullable<Post['metadata']['image']>, baseUrl: string) {
  const media = snapshot.media.find(asset => asset.id === use.mediaId);
  if (!media) throw new ContentValidationError('', 'seo.mediaReference');
  return { url: absolute(baseUrl, media.path), alt: use.alt, width: media.width, height: media.height };
}
function languagesForFixed(page: FixedPage, baseUrl: string) {
  const paths = Object.fromEntries(locales.map(locale => [locale, absolute(baseUrl, fixedPath(locale, page))]));
  return { ...paths, 'x-default': page === 'home' ? `${baseUrl}/` : paths.en };
}
function languagesForDetail(snapshot: Snapshot, record: Post | Project, collection: 'posts' | 'projects', baseUrl: string) {
  const records = snapshot[collection];
  const counterparts = record.translations.map(reference => {
    const target = records.find(item => item.id === reference.recordId && item.locale === reference.locale);
    if (!target) throw new ContentValidationError('', 'seo.translationReference');
    return target;
  });
  const paths = Object.fromEntries([record, ...counterparts].map(item => [item.locale, absolute(baseUrl, detailPath(item, collection))]));
  return { ...paths, 'x-default': paths.en ?? paths.vi };
}
function baseMetadata(title: string, description: string, canonical: string, languages: Record<string, string>, locale: Locale, siteName: string, config: SeoConfig, ogType: 'website' | 'profile' = 'website'): Metadata {
  return {
    metadataBase: new URL(config.baseUrl), title, description,
    alternates: { canonical, languages },
    openGraph: { title, description, url: canonical, siteName, locale: locale === 'vi' ? 'vi_VN' : 'en_US', type: ogType },
    twitter: { card: 'summary', title, description },
    robots: robots(config.isProduction),
  };
}
export function fixedMetadata(snapshot: Snapshot, locale: Locale, page: FixedPage, config: SeoConfig): Metadata {
  const profile = pair(snapshot.profiles, locale);
  const settings = pair(snapshot.settings, locale);
  const title = page === 'home' ? `${profile.name} — ${profile.role}` :
    page === 'about' ? `${profile.name} — ${locale === 'vi' ? 'Giới thiệu' : 'About'}` :
    page === 'contact' ? `${profile.name} — ${locale === 'vi' ? 'Liên hệ' : 'Contact'}` :
    page === 'blog' ? settings.journalTitle :
    `${locale === 'vi' ? 'Dự án' : 'Projects'} | ${settings.siteTitle}`;
  const description = page === 'about' ? profile.bioSummary :
    page === 'contact' ? (locale === 'vi' ? `Liên hệ với ${profile.name} để trao đổi về các dự án website, ý tưởng cộng tác hoặc câu hỏi kỹ thuật.` : `Get in touch with ${profile.name} for website projects, collaboration ideas, or technical questions.`) :
    settings.siteDescription;
  const canonical = absolute(config.baseUrl, fixedPath(locale, page));
  const result = baseMetadata(title, description, canonical, languagesForFixed(page, config.baseUrl), locale, settings.siteTitle, config, page === 'about' ? 'profile' : 'website');
  if (page === 'home') result.icons = { icon: '/favicon.svg' };
  return result;
}
export function detailMetadata(snapshot: Snapshot, record: Post | Project, collection: 'posts' | 'projects', config: SeoConfig): Metadata {
  const settings = pair(snapshot.settings, record.locale);
  const canonical = absolute(config.baseUrl, detailPath(record, collection));
  const result = baseMetadata(record.metadata.title, record.metadata.description, canonical,
    languagesForDetail(snapshot, record, collection, config.baseUrl), record.locale, settings.siteTitle, config);
  const image = record.metadata.image && metadataImage(snapshot, record.metadata.image, config.baseUrl);
  result.openGraph = collection === 'posts' ? {
    title: record.metadata.title, description: record.metadata.description, url: canonical,
    siteName: settings.siteTitle, locale: record.locale === 'vi' ? 'vi_VN' : 'en_US', type: 'article',
    publishedTime: record.publishedAt, modifiedTime: record.updatedAt,
    ...(image ? { images: [image] } : {}),
  } : {
    title: record.metadata.title, description: record.metadata.description, url: canonical,
    siteName: settings.siteTitle, locale: record.locale === 'vi' ? 'vi_VN' : 'en_US', type: 'website',
    ...(image ? { images: [image] } : {}),
  };
  result.twitter = { card: image ? 'summary_large_image' : 'summary', title: record.metadata.title,
    description: record.metadata.description, ...(image ? { images: [image] } : {}) };
  return result;
}
function fixedModified(snapshot: Snapshot, locale: Locale, page: FixedPage): string {
  const profile: Profile = pair(snapshot.profiles, locale);
  const settings: SiteSettings = pair(snapshot.settings, locale);
  const newest = (...dates: string[]) => dates.sort().at(-1)!;
  if (page === 'about' || page === 'contact') return profile.updatedAt;
  if (page === 'blog') return newest(settings.updatedAt, ...snapshot.posts.filter(item => item.locale === locale).map(item => item.updatedAt));
  if (page === 'projects') return newest(settings.updatedAt, ...snapshot.projects.filter(item => item.locale === locale).map(item => item.updatedAt));
  const featured = snapshot.projects.filter(item => settings.featuredProjectIds.includes(item.id)).map(item => item.updatedAt);
  const recent = snapshot.posts.filter(item => item.locale === locale).slice(0, settings.recentPostLimit).map(item => item.updatedAt);
  return newest(profile.updatedAt, settings.updatedAt, ...featured, ...recent);
}
export function sitemapEntries(snapshot: Snapshot, baseUrl: string): MetadataRoute.Sitemap {
  const fixedPages: readonly FixedPage[] = ['home', 'about', 'blog', 'projects', 'contact'];
  const root: MetadataRoute.Sitemap[number] = {
    url: `${baseUrl}/`, lastModified: snapshot.exportedAt,
    alternates: { languages: languagesForFixed('home', baseUrl) },
  };
  const fixed = fixedPages.flatMap(page => locales.map(locale => ({
    url: absolute(baseUrl, fixedPath(locale, page)), lastModified: fixedModified(snapshot, locale, page),
    alternates: { languages: languagesForFixed(page, baseUrl) },
  })));
  const detail = ([['posts', snapshot.posts], ['projects', snapshot.projects]] as const).flatMap(([collection, records]) =>
    records.map(record => ({
      url: absolute(baseUrl, detailPath(record, collection)), lastModified: record.updatedAt,
      alternates: { languages: languagesForDetail(snapshot, record, collection, baseUrl) },
    })));
  return [root, ...fixed, ...detail];
}
