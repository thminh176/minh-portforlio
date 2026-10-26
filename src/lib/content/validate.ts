/** Build-time Node module. Never import this filesystem/decoder boundary into client components. */
import Ajv from 'ajv';
import sharp from 'sharp';
import { constants } from 'node:fs';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { isIP } from 'node:net';
import schema from '../../../content/schema/published-snapshot.v1.schema.json' with { type: 'json' };
import { FIXED_ROUTES } from './routes.ts';
import type {
  Collection, ContentRecord, ImageUse, LinkTarget, MediaValidationOptions,
  Snapshot, ValidationIssue, ValidationOptions,
} from './types.ts';

const ajv = new Ajv({
  allErrors: false, format: 'full', jsonPointers: true, ownProperties: true,
  coerceTypes: false, useDefaults: false, removeAdditional: false, logger: false,
});
const checkSchema = ajv.compile(schema);
const knownFields = new Set<string>();
function collectFields(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'properties' && child && typeof child === 'object') {
      Object.keys(child).forEach(field => knownFields.add(field));
    }
    collectFields(child);
  }
}
collectFields(schema);
function safePointer(pointer: string): string {
  return pointer.split('/').map((part, index) => index === 0 ? '' :
    (knownFields.has(part) || /^(0|[1-9][0-9]{0,6})$/.test(part) ? part : '*')).join('/');
}
export class ContentValidationError extends Error {
  readonly issues: readonly ValidationIssue[];
  constructor(pointer: string, rule: string) {
    const issue = Object.freeze({ pointer: safePointer(pointer), rule });
    super(`Snapshot validation failed: ${issue.pointer || '/'} (${rule})`);
    this.name = 'ContentValidationError';
    this.issues = Object.freeze([issue]);
  }
}
function fail(pointer: string, rule: string): never { throw new ContentValidationError(pointer, rule); }
function member(pointer: string, key: string | number): string {
  return `${pointer}/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`;
}

/** Small JSON reader preserves duplicate-key information that JSON.parse would discard. */
function readJson(raw: string): unknown {
  if (raw.charCodeAt(0) === 0xfeff) fail('', 'json.bom');
  let cursor = 0;
  const whitespace = () => { while (/[\x20\t\n\r]/.test(raw[cursor] ?? '') && cursor < raw.length) cursor++; };
  function text(pointer: string): string {
    const start = cursor++;
    while (cursor < raw.length) {
      const char = raw[cursor++];
      if (char === '\\') { cursor++; continue; }
      if (char === '"') {
        try { return JSON.parse(raw.slice(start, cursor)); } catch { fail(pointer, 'json.syntax'); }
      }
    }
    return fail(pointer, 'json.syntax');
  }
  function value(pointer: string, depth: number): unknown {
    if (depth > 64) fail(pointer, 'json.depth');
    whitespace();
    const char = raw[cursor];
    if (char === '"') return text(pointer);
    if (char === '{') {
      cursor++;
      const output: Record<string, unknown> = Object.create(null);
      const keys = new Set<string>();
      whitespace();
      if (raw[cursor] === '}') { cursor++; return output; }
      for (;;) {
        whitespace();
        if (raw[cursor] !== '"') fail(pointer, 'json.syntax');
        const key = text(pointer);
        if (keys.has(key)) fail(member(pointer, key), 'json.duplicateKey');
        keys.add(key);
        whitespace();
        if (raw[cursor++] !== ':') fail(pointer, 'json.syntax');
        output[key] = value(member(pointer, key), depth + 1);
        whitespace();
        if (raw[cursor] === '}') { cursor++; return output; }
        if (raw[cursor++] !== ',') fail(pointer, 'json.syntax');
      }
    }
    if (char === '[') {
      cursor++;
      const output: unknown[] = [];
      whitespace();
      if (raw[cursor] === ']') { cursor++; return output; }
      for (;;) {
        output.push(value(member(pointer, output.length), depth + 1));
        whitespace();
        if (raw[cursor] === ']') { cursor++; return output; }
        if (raw[cursor++] !== ',') fail(pointer, 'json.syntax');
      }
    }
    for (const [token, result] of [['true', true], ['false', false], ['null', null]] as const) {
      if (raw.startsWith(token, cursor)) { cursor += token.length; return result; }
    }
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(raw.slice(cursor));
    if (!match) return fail(pointer, 'json.syntax');
    cursor += match[0].length;
    const result = Number(match[0]);
    if (!Number.isFinite(result)) fail(pointer, 'json.number');
    return result;
  }
  const result = value('', 0);
  whitespace();
  if (cursor !== raw.length) fail('', 'json.syntax');
  return result;
}

/** Copy only actual JSON data; reject accessors, cycles, sparse arrays and exotic objects. */
function copyJson(input: unknown, pointer = '', ancestors = new Set<object>(), depth = 0): unknown {
  if (depth > 64) fail(pointer, 'json.depth');
  if (input === null || typeof input === 'string' || typeof input === 'boolean') return input;
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input !== 'object' || !input) fail(pointer, 'json.value');
  if (ancestors.has(input)) fail(pointer, 'json.cycle');
  const prototype = Object.getPrototypeOf(input);
  if (!Array.isArray(input) && prototype !== Object.prototype && prototype !== null) fail(pointer, 'json.object');
  if (Object.getOwnPropertySymbols(input).length) fail(pointer, 'json.property');
  ancestors.add(input);
  const output: Record<string, unknown> | unknown[] = Array.isArray(input) ? [] : Object.create(null);
  if (Array.isArray(input)) {
    const names = Object.getOwnPropertyNames(input);
    if (names.length !== input.length + 1) fail(pointer, 'json.array');
    for (let i = 0; i < input.length; i++) {
      const descriptor = Object.getOwnPropertyDescriptor(input, String(i));
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) fail(member(pointer, i), 'json.property');
      (output as unknown[]).push(copyJson(descriptor.value, member(pointer, i), ancestors, depth + 1));
    }
  } else {
    for (const key of Object.getOwnPropertyNames(input)) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) fail(member(pointer, key), 'json.property');
      Object.defineProperty(output, key, { value: copyJson(descriptor.value, member(pointer, key), ancestors, depth + 1), enumerable: true });
    }
  }
  ancestors.delete(input);
  return output;
}
function hasSnapshotShape(value: unknown): value is Snapshot { return checkSchema(value) === true; }
function checkText(value: unknown, pointer = '', preserve = false, code = false): void {
  if (typeof value === 'string') {
    if (!value.isWellFormed() || value.normalize('NFC') !== value) fail(pointer, 'text.unicode');
    if (/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(value) || (!code && value.includes('\t'))) fail(pointer, 'text.control');
    if (!preserve && value !== '' && (!value.trim() || value.trim() !== value)) fail(pointer, 'text.trim');
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach((item, i) => checkText(item, member(pointer, i))); return; }
  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    checkText(child, member(pointer, key), (record.type === 'text' && key === 'text') || (record.type === 'code' && key === 'code'), record.type === 'code' && key === 'code');
  }
}
function timestamp(value: string, pointer: string): void {
  const date = new Date(value);
  if (!Number.isFinite(date.valueOf()) || date.toISOString().replace('.000Z', 'Z') !== value) fail(pointer, 'date.utc');
}
function cmp(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
function codePointCmp(left: string, right: string): number {
  const a = Array.from(left, char => char.codePointAt(0)!);
  const b = Array.from(right, char => char.codePointAt(0)!);
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}
function ordered<T>(items: readonly T[], compare: (a: T, b: T) => number, pointer: string): void {
  for (let i = 1; i < items.length; i++) if (compare(items[i - 1], items[i]) > 0) fail(member(pointer, i), 'order.deterministic');
}
function externalUrl(url: string, pointer: string): void {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const labels = host.split('.');
    const decoded = decodeURIComponent(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || (parsed.port && parsed.port !== '443') ||
      isIP(host) || host.startsWith('[') || labels.length < 2 ||
      labels.some(label => label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) ||
      /(?:^|\.)(?:localhost|local|localdomain|internal|lan|home|test|invalid)$/.test(host) ||
      /[\u0000-\u0020\u007f-\u009f\\]/u.test(decoded)) fail(pointer, 'link.external');
  } catch { fail(pointer, 'link.external'); }
}
const fixedPattern = /^(?:\/|\/(?:vi|en)\/(?:|about\/|contact\/|blog\/|projects\/))$/;
const dtmPathPattern = /^(?:\/|\/(?:vi|en)\/(?:|about\/|contact\/|blog\/|projects\/|(?:blog|projects)\/[a-z0-9]+(?:-[a-z0-9]+)*\/))$/;
const acceptedSnapshots = new WeakSet<object>();
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** Parse raw JSON or validate an unknown JSON value. Returns no partial data on failure. */
export function validateSnapshot(input: unknown, options: ValidationOptions = {}): Snapshot {
  let data: unknown;
  try { data = typeof input === 'string' ? readJson(input) : copyJson(input); }
  catch (error) { if (error instanceof ContentValidationError) throw error; fail('', 'json.value'); }
  if (!hasSnapshotShape(data)) {
    const error = checkSchema.errors?.[0];
    fail(error?.dataPath ?? '', `schema.${error?.keyword ?? 'invalid'}`);
  }
  // All typed access below follows the actual accepted public schema, never an unchecked content cast.
  checkText(data);
  timestamp(data.exportedAt, '/exportedAt');
  const allIds = new Set<string>();
  for (const collection of ['profiles', 'settings', 'posts', 'projects', 'media'] as const) {
    data[collection].forEach((record, i) => {
      const pointer = `/${collection}/${i}`;
      if (allIds.has(record.id)) fail(`${pointer}/id`, 'id.unique');
      allIds.add(record.id);
      if ('publishedAt' in record) {
        timestamp(record.publishedAt, `${pointer}/publishedAt`);
        timestamp(record.updatedAt, `${pointer}/updatedAt`);
        if (record.publishedAt > record.updatedAt || record.updatedAt > data.exportedAt) fail(pointer, 'date.publicationOrder');
      }
    });
  }
  for (const collection of ['profiles', 'settings'] as const) {
    if (data[collection][0].locale !== 'vi' || data[collection][1].locale !== 'en') fail(`/${collection}`, 'locale.singletons');
  }
  ordered(data.posts, (a, b) => cmp(b.publishedAt, a.publishedAt) || cmp(a.id, b.id), '/posts');
  ordered(data.projects, (a, b) => a.order - b.order || cmp(a.id, b.id), '/projects');
  ordered(data.media, (a, b) => cmp(a.id, b.id), '/media');
  const indexes = { posts: new Map(data.posts.map(item => [item.id, item])), projects: new Map(data.projects.map(item => [item.id, item])) };
  const routes = new Set<string>();
  const fixedRoutes = options.fixedRoutes ?? FIXED_ROUTES;
  for (const route of fixedRoutes) {
    if (!fixedPattern.test(route) || route.trim() !== route) fail('', 'options.fixedRoutes');
    routes.add(route);
  }
  for (const collection of ['posts', 'projects'] as const) {
    const slugs = new Set<string>();
    const groups = new Map<string, ContentRecord[]>();
    data[collection].forEach((record, i) => {
      const pointer = `/${collection}/${i}`;
      const slugKey = `${record.locale}/${record.slug}`;
      if (slugs.has(slugKey)) fail(`${pointer}/slug`, 'slug.unique');
      slugs.add(slugKey);
      const group = groups.get(record.translationGroup) ?? [];
      if (group.some(other => other.locale === record.locale)) fail(`${pointer}/translationGroup`, 'translation.uniqueLocale');
      group.push(record);
      groups.set(record.translationGroup, group);
      routes.add(`/${record.locale}/${collection === 'posts' ? 'blog' : 'projects'}/${record.slug}/`);
    });
    data[collection].forEach((record, i) => {
      const pointer = `/${collection}/${i}/translations`;
      const group = groups.get(record.translationGroup)!;
      if (record.translations.length !== group.length - 1) fail(pointer, 'translation.counterparts');
      for (const translation of record.translations) {
        const target = indexes[collection].get(translation.recordId);
        if (!target || target.locale !== translation.locale || target.locale === record.locale || target.translationGroup !== record.translationGroup ||
          !target.translations.some(back => back.recordId === record.id && back.locale === record.locale)) fail(pointer, 'translation.reciprocal');
      }
    });
  }
  const media = new Map(data.media.map(item => [item.id, item]));
  const mediaPaths = new Set<string>();
  data.media.forEach((item, i) => {
    if (mediaPaths.has(item.path)) fail(`/media/${i}/path`, 'media.uniquePath');
    mediaPaths.add(item.path);
    const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', avif: 'image/avif' }[path.extname(item.path).slice(1)];
    if (mime !== item.mimeType) fail(`/media/${i}/mimeType`, 'media.extension');
  });
  function image(use: ImageUse, pointer: string): void {
    const asset = media.get(use.mediaId);
    if (!asset) fail(`${pointer}/mediaId`, 'reference.media');
    if (!use.decorative) {
      const alt = use.alt.toLocaleLowerCase('vi');
      if (alt === use.mediaId || alt === asset.path || alt === path.basename(asset.path) ||
        ['image', 'photo', 'picture', 'placeholder', 'asset', 'ảnh', 'hình'].includes(alt)) fail(`${pointer}/alt`, 'media.alt');
    }
  }
  function reference(collection: Collection, id: string, locale: string, pointer: string): void {
    const target = indexes[collection].get(id);
    if (!target || target.locale !== locale) fail(pointer, 'reference.publishedLocale');
  }
  function link(target: LinkTarget, record: ContentRecord, pointer: string): void {
    if (target.kind === 'external') externalUrl(target.url, `${pointer}/url`);
    if (target.kind === 'record') reference(target.collection, target.recordId, record.locale, pointer);
    if (target.kind === 'internal') {
      if (!dtmPathPattern.test(target.path) || !routes.has(target.path) || (target.path !== '/' && !target.path.startsWith(`/${record.locale}/`))) fail(`${pointer}/path`, 'link.internalRoute');
    }
  }
  for (const collection of ['posts', 'projects'] as const) {
    data[collection].forEach((record, i) => {
      const pointer = `/${collection}/${i}`;
      if (record.cover) image(record.cover, `${pointer}/cover`);
      if (record.metadata.image) image(record.metadata.image, `${pointer}/metadata/image`);
      const seen = new Set<string>();
      ordered(record.related, (a, b) => cmp(a.collection, b.collection) || cmp(a.recordId, b.recordId), `${pointer}/related`);
      record.related.forEach((related, j) => {
        const key = `${related.collection}/${related.recordId}`;
        if (seen.has(key) || (related.collection === collection && related.recordId === record.id)) fail(`${pointer}/related/${j}`, 'reference.uniqueRelated');
        seen.add(key);
        reference(related.collection, related.recordId, record.locale, `${pointer}/related/${j}`);
      });
      let heading = 1;
      record.body.forEach((block, j) => {
        const blockPointer = `${pointer}/body/${j}`;
        if (block.type === 'heading') {
          if (block.level > heading + 1) fail(`${blockPointer}/level`, 'block.headingOrder');
          heading = block.level;
        }
        if (block.type === 'image') image(block.image, `${blockPointer}/image`);
        const lists = block.type === 'list' ? block.items : (block.type === 'paragraph' || block.type === 'quote' ? [block.children] : []);
        lists.forEach((inlines, k) => inlines.forEach((inline, n) => {
          if (inline.type === 'link') link(inline.target, record, block.type === 'list' ? `${blockPointer}/items/${k}/${n}/target` : `${blockPointer}/children/${n}/target`);
        }));
      });
    });
  }
  data.settings.forEach((settings, i) => settings.featuredProjectIds.forEach((id, j) => reference('projects', id, settings.locale, `/settings/${i}/featuredProjectIds/${j}`)));
  data.posts.forEach((post, i) => ordered(post.tags, codePointCmp, `/posts/${i}/tags`));
  data.projects.forEach((project, i) => {
    externalUrl(project.sourceUrl, `/projects/${i}/sourceUrl`);
    if (project.liveUrl) externalUrl(project.liveUrl, `/projects/${i}/liveUrl`);
  });
  acceptedSnapshots.add(data);
  return freeze(data);
}

export const MAX_MEDIA_BYTES = 16 * 1024 * 1024;
export const MAX_MEDIA_PIXELS = 16 * 1024 * 1024;
function contained(root: string, file: string): boolean {
  const relative = path.relative(root, file);
  return relative !== '' && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`);
}

/** Must be awaited by disk consumers before exposing a validated snapshot. No Git or network access. */
export async function validateSnapshotMedia(snapshot: Snapshot, options: MediaValidationOptions): Promise<void> {
  if (!acceptedSnapshots.has(snapshot)) fail('', 'media.unvalidatedSnapshot');
  if (!path.isAbsolute(options.publicRoot)) fail('', 'media.publicRoot');
  let root: string;
  try {
    const stat = await lstat(options.publicRoot);
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail('', 'media.publicRoot');
    root = await realpath(options.publicRoot);
  } catch { fail('', 'media.publicRoot'); }
  for (let i = 0; i < snapshot.media.length; i++) {
    const asset = snapshot.media[i];
    const pointer = `/media/${i}`;
    try {
      const segments = asset.path.slice(1).split('/');
      let current = root;
      for (let j = 0; j < segments.length; j++) {
        if (!(await readdir(current)).includes(segments[j])) fail(`${pointer}/path`, 'media.exactCase');
        current = path.join(current, segments[j]);
        const stat = await lstat(current);
        if (stat.isSymbolicLink()) fail(`${pointer}/path`, 'media.symlink');
        if (j < segments.length - 1 && !stat.isDirectory()) fail(`${pointer}/path`, 'media.directory');
      }
      const resolved = await realpath(current);
      if (!contained(root, resolved) || !contained(path.join(root, 'media', 'content'), resolved)) fail(`${pointer}/path`, 'media.containment');
      const before = await lstat(current);
      if (!before.isFile()) fail(`${pointer}/path`, 'media.regularFile');
      if (before.size < 1 || before.size > MAX_MEDIA_BYTES) fail(pointer, 'media.inputLimit');
      const handle = await open(current, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      let bytes: Buffer;
      try {
        const opened = await handle.stat();
        if (!opened.isFile() || opened.ino !== before.ino || opened.dev !== before.dev || opened.size !== before.size) fail(pointer, 'media.changed');
        bytes = Buffer.alloc(before.size + 1);
        let total = 0;
        while (total < bytes.length) {
          const result = await handle.read(bytes, total, bytes.length - total, null);
          if (!result.bytesRead) break;
          total += result.bytesRead;
        }
        const after = await handle.stat();
        if (total !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs || await realpath(current) !== resolved) fail(pointer, 'media.changed');
        bytes = bytes.subarray(0, total);
      } finally { await handle.close(); }
      const decoder = sharp(bytes, { limitInputPixels: MAX_MEDIA_PIXELS, failOn: 'warning', animated: true, sequentialRead: true });
      const metadata = await decoder.metadata();
      const mime = metadata.format === 'heif' && metadata.compression === 'av1' ? 'image/avif' :
        metadata.format === 'png' ? 'image/png' : metadata.format === 'jpeg' ? 'image/jpeg' :
          metadata.format === 'webp' ? 'image/webp' : undefined;
      if (mime !== asset.mimeType) fail(`${pointer}/mimeType`, 'media.signature');
      if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_MEDIA_PIXELS) fail(pointer, 'media.pixelLimit');
      if (metadata.width !== asset.width || (metadata.pageHeight ?? metadata.height) !== asset.height) fail(pointer, 'media.dimensions');
      // Metadata alone does not prove the pixel stream is intact. Decode every bounded frame.
      await decoder.raw().toBuffer();
    } catch (error) {
      if (error instanceof ContentValidationError) throw error;
      fail(pointer, 'media.fileOrCodec');
    }
  }
}
