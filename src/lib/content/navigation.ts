import type { Locale, Snapshot } from './types.ts';

export type NavigationSection = 'home' | 'about' | 'projects' | 'blog' | 'contact';
export type NavigationTranslations = Readonly<Record<string, string>>;
export interface HeaderNavigation {
  readonly locale: Locale;
  readonly name: string;
  readonly role: string;
  readonly translations: NavigationTranslations;
}

const safeSlug = (slug: string) => slug.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
const otherLanguage = (locale: Locale): Locale => locale === 'vi' ? 'en' : 'vi';

/** Input must come from the validated adapter. Serialize only public identity and paired paths. */
export function createHeaderNavigation(snapshot: Snapshot, locale: Locale): HeaderNavigation {
  const profile = snapshot.profiles.find(record => record.locale === locale && record.status === 'published');
  if (!profile) throw new Error('Published navigation profile is required');
  const translations: Record<string, string> = {};
  const other = otherLanguage(locale);
  for (const [collection, section] of [['posts', 'blog'], ['projects', 'projects']] as const) {
    const records = snapshot[collection];
    for (const source of records) {
      if (source.locale !== locale || source.status !== 'published' || !safeSlug(source.slug)) continue;
      const reference = source.translations.find(record => record.locale === other);
      const target = reference && records.find(record => record.id === reference.recordId && record.locale === other);
      if (!target || target.status !== 'published' || !safeSlug(target.slug)
        || target.translationGroup !== source.translationGroup
        || !target.translations.some(record => record.locale === locale && record.recordId === source.id)) continue;
      translations[`/${locale}/${section}/${source.slug}/`] = `/${other}/${section}/${target.slug}/`;
    }
  }
  return { locale, name: profile.name, role: profile.role, translations };
}

/** Exact local route grammar: never splice an untrusted pathname into a link. */
export function resolveHeaderNavigation(
  pathname: string | null,
  locale: Locale,
  translations: NavigationTranslations,
  fallback: 'home' | 'about' = 'home',
) {
  const other = otherLanguage(locale);
  let section: NavigationSection = fallback;
  let slug: string | undefined;
  const match = pathname?.match(/^\/(vi|en)(?:\/(about|blog|projects|contact)(?:\/([a-z0-9]+(?:-[a-z0-9]+)*))?)?\/?$/);
  if (match && match[1] === locale && (!match[3] || ((match[2] === 'blog' || match[2] === 'projects') && safeSlug(match[3])))) {
    section = (match[2] as NavigationSection | undefined) ?? 'home';
    slug = match[3];
  }
  const otherIndex = section === 'home' ? `/${other}/` : `/${other}/${section}/`;
  const source = `/${locale}/${section}/${slug}/`;
  const candidate = slug && Object.hasOwn(translations, source) ? translations[source] : undefined;
  // Defense in depth for serialized data: only an exact opposite-language collection slug is usable.
  const targetPattern = new RegExp(`^/${other}/${section}/([a-z0-9]+(?:-[a-z0-9]+)*)/$`);
  const targetSlug = candidate?.match(targetPattern)?.[1];
  const targetOtherPath = targetSlug && safeSlug(targetSlug) ? candidate! : otherIndex;
  return {
    section, otherLocale: other, targetOtherPath,
    workPath: section === 'home' ? `/${locale}/#work` : `/${locale}/projects/`,
    journalPath: section === 'home' ? `/${locale}/#journal` : `/${locale}/blog/`,
    contactPath: section === 'home' ? `/${locale}/#contact` : `/${locale}/contact/`,
  };
}
