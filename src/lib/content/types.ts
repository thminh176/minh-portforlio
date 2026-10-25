/** Provider-independent v1 public data. All arrays/objects returned by validation are frozen. */
export type Locale = 'vi' | 'en';
export type Collection = 'posts' | 'projects';
export type LinkTarget =
  | { readonly kind: 'external'; readonly url: string }
  | { readonly kind: 'internal'; readonly path: string }
  | ({ readonly kind: 'record' } & RecordReference);
export interface RecordReference { readonly collection: Collection; readonly recordId: string }
export type Inline =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'link'; readonly label: string; readonly target: LinkTarget };
export interface MeaningfulImage {
  readonly mediaId: string; readonly decorative: false; readonly alt: string; readonly caption?: string;
}
export type ImageUse = MeaningfulImage | { readonly mediaId: string; readonly decorative: true; readonly alt: '' };
export type CodeLanguage = 'text' | 'javascript' | 'typescript' | 'json' | 'html' | 'css' | 'bash' | 'powershell' | 'python' | 'sql' | 'yaml';
export type Block =
  | { readonly type: 'paragraph'; readonly children: readonly Inline[] }
  | { readonly type: 'heading'; readonly level: 2 | 3 | 4; readonly text: string }
  | { readonly type: 'list'; readonly ordered: boolean; readonly items: readonly (readonly Inline[])[] }
  | { readonly type: 'quote'; readonly children: readonly Inline[]; readonly attribution?: string }
  | { readonly type: 'code'; readonly language: CodeLanguage; readonly code: string }
  | { readonly type: 'image'; readonly image: ImageUse };
export interface Metadata { readonly title: string; readonly description: string; readonly image?: MeaningfulImage }
export interface Publication {
  readonly id: string; readonly locale: Locale; readonly status: 'published';
  readonly publishedAt: string; readonly updatedAt: string;
}
export interface Profile extends Publication {
  readonly name: string; readonly role: string; readonly tagline: string; readonly bioSummary: string;
  readonly aboutStory: readonly string[];
  readonly hero: { readonly kicker: string; readonly headlineLines: readonly string[]; readonly supporting: string };
}
export interface SiteSettings extends Publication {
  readonly siteTitle: string; readonly siteDescription: string; readonly journalTitle: string;
  readonly journalEmptyText: string; readonly featuredProjectIds: readonly string[]; readonly recentPostLimit: number;
}
export interface ContentRecord extends Publication {
  readonly translationGroup: string;
  readonly translations: readonly { readonly locale: Locale; readonly recordId: string }[];
  readonly slug: string; readonly title: string; readonly metadata: Metadata;
  readonly body: readonly Block[]; readonly related: readonly RecordReference[];
}
export interface Post extends ContentRecord {
  readonly excerpt: string; readonly tags: readonly string[]; readonly cover?: MeaningfulImage;
}
export interface Project extends ContentRecord {
  readonly summary: string; readonly order: number; readonly technologies: readonly string[];
  readonly sourceUrl: string; readonly liveUrl?: string; readonly cover?: MeaningfulImage;
}
export interface Media {
  readonly id: string; readonly path: string;
  readonly mimeType: 'image/avif' | 'image/webp' | 'image/png' | 'image/jpeg';
  readonly width: number; readonly height: number;
}
/** Semantic validation precedes this return type; disk consumers must also await validateSnapshotMedia. */
export interface Snapshot {
  readonly schemaVersion: 1; readonly siteId: 'dtm'; readonly revision: string; readonly exportedAt: string;
  readonly locales: readonly ['vi', 'en']; readonly profiles: readonly Profile[];
  readonly settings: readonly SiteSettings[]; readonly posts: readonly Post[];
  readonly projects: readonly Project[]; readonly media: readonly Media[];
}
export interface ValidationIssue { readonly pointer: string; readonly rule: string }
export interface ValidationOptions {
  /** Trusted application-owned fixed pages actually implemented; dynamic paths derive from records. */
  readonly fixedRoutes?: readonly string[];
}
export interface MediaValidationOptions {
  /** Trusted absolute repository public directory, never a value from content. */
  readonly publicRoot: string;
}
