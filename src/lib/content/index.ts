/** Server/build-only disk adapter. Pass its public records as props; never import in client components. */
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { ContentValidationError, validateSnapshot, validateSnapshotMedia } from './validate.ts';
import type { Collection, Locale, Post, Profile, Project, SiteSettings, Snapshot, ValidationOptions } from './types.ts';

export interface ContentAdapterOptions extends ValidationOptions {
  /** Trusted engineering/test configuration only. Never read this from snapshot, env or public request input. */
  readonly repositoryRoot?: string;
}
// Package scripts and Next build run from the checkout root. Module URLs can move into
// .next/server/chunks when bundled, so they must not determine the repository location.
const defaultRepositoryRoot = path.resolve(process.cwd());
const snapshotSegments = ['content', 'published', 'dtm.v1.json'] as const;
function locale(value: Locale): void {
  if (value !== 'vi' && value !== 'en') throw new ContentValidationError('', 'selector.locale');
}
function collection(value: Collection): void {
  if (value !== 'posts' && value !== 'projects') throw new ContentValidationError('', 'selector.collection');
}
function slug(value: string): boolean { return typeof value === 'string' && value.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value); }
function profileOf(snapshot: Snapshot, language: Locale): Profile {
  const profile = snapshot.profiles.find(record => record.locale === language);
  if (!profile) throw new ContentValidationError('/profiles', 'selector.requiredLocale');
  return profile;
}
function settingsOf(snapshot: Snapshot, language: Locale): SiteSettings {
  const settings = snapshot.settings.find(record => record.locale === language);
  if (!settings) throw new ContentValidationError('/settings', 'selector.requiredLocale');
  return settings;
}

export function createContentAdapter(options: ContentAdapterOptions = {}) {
  const repositoryRoot = options.repositoryRoot ?? defaultRepositoryRoot;
  if (!path.isAbsolute(repositoryRoot)) throw new ContentValidationError('', 'loader.repositoryRoot');
  // Copy trusted options once; caller mutations cannot change route policy mid-read.
  const fixedRoutes = options.fixedRoutes ? Object.freeze([...options.fixedRoutes]) : undefined;

  async function loadSnapshot(): Promise<Snapshot> {
    let raw: string;
    let publicRoot: string;
    try {
      const root = await realpath(repositoryRoot);
      if (!(await lstat(root)).isDirectory()) throw new ContentValidationError('', 'loader.repositoryRoot');
      let file = root;
      for (let i = 0; i < snapshotSegments.length; i++) {
        const segment = snapshotSegments[i];
        if (!(await readdir(file)).includes(segment)) throw new ContentValidationError('', 'loader.snapshotFile');
        file = path.join(file, segment);
        const stat = await lstat(file);
        if (stat.isSymbolicLink() || (i < snapshotSegments.length - 1 ? !stat.isDirectory() : !stat.isFile())) {
          throw new ContentValidationError('', 'loader.snapshotFile');
        }
      }
      if (await realpath(file) !== file) throw new ContentValidationError('', 'loader.snapshotFile');
      // Fatal decoding rejects invalid UTF-8; preserve a BOM so the normative validator rejects it.
      raw = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(await readFile(file));
      publicRoot = path.join(root, 'public');
    } catch (error) {
      if (error instanceof ContentValidationError) throw error;
      throw new ContentValidationError('', 'loader.read');
    }
    const snapshot = validateSnapshot(raw, { fixedRoutes });
    await validateSnapshotMedia(snapshot, { publicRoot });
    return snapshot;
  }
  // Intentionally no promise/data cache: each operation observes a complete fresh candidate,
  // and a failed read cannot poison later attempts. One operation uses one validated revision.
  async function getProfile(language: Locale): Promise<Profile> {
    locale(language); return profileOf(await loadSnapshot(), language);
  }
  async function getSiteSettings(language: Locale): Promise<SiteSettings> {
    locale(language); return settingsOf(await loadSnapshot(), language);
  }
  async function getPosts(language: Locale): Promise<readonly Post[]> {
    locale(language); return Object.freeze((await loadSnapshot()).posts.filter(record => record.locale === language));
  }
  async function getProjects(language: Locale): Promise<readonly Project[]> {
    locale(language); return Object.freeze((await loadSnapshot()).projects.filter(record => record.locale === language));
  }
  async function getPost(language: Locale, routeSlug: string): Promise<Post | null> {
    locale(language);
    const snapshot = await loadSnapshot();
    return slug(routeSlug) ? snapshot.posts.find(record => record.locale === language && record.slug === routeSlug) ?? null : null;
  }
  async function getProject(language: Locale, routeSlug: string): Promise<Project | null> {
    locale(language);
    const snapshot = await loadSnapshot();
    return slug(routeSlug) ? snapshot.projects.find(record => record.locale === language && record.slug === routeSlug) ?? null : null;
  }
  async function getTranslationTarget(kind: 'posts', language: Locale, routeSlug: string, targetLanguage: Locale): Promise<Post | null>;
  async function getTranslationTarget(kind: 'projects', language: Locale, routeSlug: string, targetLanguage: Locale): Promise<Project | null>;
  async function getTranslationTarget(kind: Collection, language: Locale, routeSlug: string, targetLanguage: Locale): Promise<Post | Project | null>;
  async function getTranslationTarget(kind: Collection, language: Locale, routeSlug: string, targetLanguage: Locale): Promise<Post | Project | null> {
    collection(kind); locale(language); locale(targetLanguage);
    const snapshot = await loadSnapshot();
    if (!slug(routeSlug) || language === targetLanguage) return null;
    const records = snapshot[kind];
    const source = records.find(record => record.locale === language && record.slug === routeSlug);
    const target = source?.translations.find(reference => reference.locale === targetLanguage);
    return target ? records.find(record => record.id === target.recordId && record.locale === targetLanguage) ?? null : null;
  }
  async function getFeaturedProjects(language: Locale): Promise<readonly Project[]> {
    locale(language);
    const snapshot = await loadSnapshot();
    return Object.freeze(settingsOf(snapshot, language).featuredProjectIds.map(id => {
      const project = snapshot.projects.find(record => record.id === id && record.locale === language);
      if (!project) throw new ContentValidationError('/settings', 'selector.featuredReference');
      return project;
    }));
  }
  async function getRecentPosts(language: Locale): Promise<readonly Post[]> {
    locale(language);
    const snapshot = await loadSnapshot();
    return Object.freeze(snapshot.posts.filter(record => record.locale === language).slice(0, settingsOf(snapshot, language).recentPostLimit));
  }
  return Object.freeze({ loadSnapshot, getProfile, getSiteSettings, getPosts, getPost, getProjects, getProject, getTranslationTarget, getFeaturedProjects, getRecentPosts });
}

export const {
  loadSnapshot, getProfile, getSiteSettings, getPosts, getPost, getProjects, getProject,
  getTranslationTarget, getFeaturedProjects, getRecentPosts,
} = createContentAdapter();
