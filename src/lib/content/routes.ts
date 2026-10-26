import type { Locale, Post, Project, Snapshot } from './types.ts';

/** App-owned exported fixed paths. Never accept this inventory from content. */
export const FIXED_ROUTES = [
  '/', '/vi/', '/en/',
  '/vi/about/', '/en/about/',
  '/vi/blog/', '/en/blog/',
  '/vi/projects/', '/en/projects/',
  '/vi/contact/', '/en/contact/',
] as const;

export type FixedPage = 'home' | 'about' | 'blog' | 'projects' | 'contact';
export function fixedPath(locale: Locale, page: FixedPage): string {
  return page === 'home' ? `/${locale}/` : `/${locale}/${page}/`;
}
export function detailPath(record: Post | Project, collection: 'posts' | 'projects'): string {
  return `/${record.locale}/${collection === 'posts' ? 'blog' : 'projects'}/${record.slug}/`;
}
export function publishedPaths(snapshot: Snapshot): readonly string[] {
  return [
    ...FIXED_ROUTES,
    ...snapshot.posts.map(record => detailPath(record, 'posts')),
    ...snapshot.projects.map(record => detailPath(record, 'projects')),
  ];
}
