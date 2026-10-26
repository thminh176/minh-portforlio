/** Isolated SEO/media export fixture. Never modifies the committed snapshot or workspace out/. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, link, mkdir, mkdtemp, readFile, realpath, readdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createContentAdapter } from '../src/lib/content/index.ts';
import { ContentValidationError, validateSnapshot } from '../src/lib/content/validate.ts';
import { detailMetadata, fixedMetadata, sitemapEntries } from '../src/lib/content/seo.ts';
import { FIXED_ROUTES, publishedPaths } from '../src/lib/content/routes.ts';

const repo = fileURLToPath(new URL('../', import.meta.url));
const relativeSnapshot = 'content/published/dtm.v1.json';
const original = await readFile(path.join(repo, relativeSnapshot));
const initial = JSON.parse(await readFile(new URL('./fixtures/content/dtm-seed.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(await readFile(path.join(repo, 'package.json'), 'utf8'));
const clone = value => structuredClone(value);
const baseUrl = 'https://damthienminh.id.vn';
const temp = await mkdtemp(path.join(os.tmpdir(), 'dtm-integrity-'));
const stage = path.join(temp, 'checkout');
let checks = 0;
function check(label, fn) { fn(); console.log(`ok ${++checks} - ${label}`); }
function post(id, locale, slug, group, time, translations = []) {
  return { id, locale, slug, translationGroup: group, translations, status: 'published',
    publishedAt: time, updatedAt: time, title: `Title ${id}`, excerpt: `Excerpt ${id}`,
    metadata: { title: `Metadata ${id}`, description: `Description ${id}` },
    body: [{ type: 'paragraph', children: [{ type: 'text', text: `Body ${id}` }] }],
    related: [], tags: [] };
}
async function stageDependencies(source, destination, sourceRoot = source, destinationRoot = destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name), to = path.join(destination, entry.name);
    if (entry.isSymbolicLink()) {
      const target = await realpath(from), relative = path.relative(sourceRoot, target);
      assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
      await symlink(path.join(destinationRoot, relative), to, process.platform === 'win32' ? 'junction' : 'dir');
    } else if (entry.isDirectory()) await stageDependencies(from, to, sourceRoot, destinationRoot);
    else { try { await link(from, to); } catch (error) { if (error.code !== 'EXDEV') throw error; await cp(from, to); } }
  }
}
async function runBuild(label, data, environment = {}) {
  for (const folder of ['out', '.next']) await rm(path.join(stage, folder), { recursive: true, force: true });
  await writeFile(path.join(stage, relativeSnapshot), JSON.stringify(data));
  const command = manifest.scripts.build;
  console.log(`INTEGRITY_BUILD ${JSON.stringify({ label, command, cwd: stage })}`);
  const chunks = [];
  const child = spawn(command, { cwd: stage, shell: true, env: { ...process.env,
    NEXT_PUBLIC_SITE_ENV: 'preview', NEXT_PUBLIC_CONTACT_ENABLED: 'false', NEXT_PUBLIC_TURNSTILE_SITE_KEY: '', ...environment,
    NEXT_TELEMETRY_DISABLED: '1', PATH: path.join(stage, 'node_modules', '.bin') + path.delimiter + process.env.PATH } });
  for (const channel of ['stdout', 'stderr']) child[channel].on('data', chunk => { chunks.push(chunk); process[channel].write(chunk); });
  const exit = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
  console.log(`INTEGRITY_EXIT ${label} ${exit}`);
  return { exit, output: Buffer.concat(chunks).toString('utf8') };
}
function htmlFile(urlPath) { return path.join(stage, 'out', ...urlPath.split('/').filter(Boolean), 'index.html'); }
function meta(html, property, value) { return html.includes(`${property}="${value}"`); }
try {
  const candidate = clone(initial);
  candidate.projects = candidate.projects.filter(project => project.translationGroup === 'personal-portfolio');
  for (const settings of candidate.settings) settings.featuredProjectIds = settings.featuredProjectIds.filter(id => candidate.projects.some(project => project.id === id));
  const viOnly = post('seo-only-vi', 'vi', 'seo-only-note', 'seo-only', '2026-10-25T17:03:00Z');
  const viPair = post('seo-pair-vi', 'vi', 'seo-paired-vi', 'seo-pair', '2026-10-25T17:02:00Z', [{ locale: 'en', recordId: 'seo-pair-en' }]);
  const enPair = post('seo-pair-en', 'en', 'seo-paired-en', 'seo-pair', '2026-10-25T17:01:00Z', [{ locale: 'vi', recordId: 'seo-pair-vi' }]);
  viOnly.metadata.image = { mediaId: 'seo-image', decorative: false, alt: 'Ảnh kiểm thử nhỏ màu gạch của bài viết.' };
  candidate.posts = [viOnly, viPair, enPair];
  candidate.media = [{ id: 'seo-image', path: '/media/content/seo-image.png', mimeType: 'image/png', width: 2, height: 3 }];
  const validated = validateSnapshot(candidate);
  check('shared fixed inventory and exact paths include root, both indexes and published details', () => {
    assert.ok(FIXED_ROUTES.includes('/vi/contact/'));
    assert.ok(FIXED_ROUTES.includes('/en/projects/'));
    const paths = publishedPaths(validated);
    assert.equal(paths.length, 16);
    assert.ok(paths.includes('/vi/blog/seo-only-note/'));
    assert.ok(!paths.some(value => value.includes('mcp-project-assistant')));
    assert.deepEqual(sitemapEntries(validated, baseUrl).map(item => new URL(item.url).pathname), paths);
  });
  check('localized metadata, real alternates and local image dimensions/alt', () => {
    const page = fixedMetadata(validated, 'vi', 'home', { baseUrl, isProduction: false });
    assert.equal(page.title, `${candidate.profiles[0].name} — ${candidate.profiles[0].role}`);
    assert.equal(page.description, candidate.settings[0].siteDescription);
    assert.deepEqual(page.robots, { index: false, follow: false });
    assert.deepEqual(fixedMetadata(validated, 'vi', 'home', { baseUrl, isProduction: true }).robots, { index: true, follow: true });
    const only = detailMetadata(validated, validated.posts[0], 'posts', { baseUrl, isProduction: false });
    assert.deepEqual(only.alternates.languages, { vi: `${baseUrl}/vi/blog/seo-only-note/`, 'x-default': `${baseUrl}/vi/blog/seo-only-note/` });
    assert.deepEqual(only.openGraph.images[0], { url: `${baseUrl}/media/content/seo-image.png`, alt: viOnly.metadata.image.alt, width: 2, height: 3 });
    assert.equal(only.openGraph.publishedTime, viOnly.publishedAt);
    const pair = detailMetadata(validated, validated.posts[1], 'posts', { baseUrl, isProduction: false });
    assert.equal(pair.alternates.languages.en, `${baseUrl}/en/blog/seo-paired-en/`);
    assert.equal(pair.alternates.languages['x-default'], `${baseUrl}/en/blog/seo-paired-en/`);
    const project = detailMetadata(validated, validated.projects[0], 'projects', { baseUrl, isProduction: false });
    assert.equal(project.alternates.languages.en, `${baseUrl}/en/projects/personal-portfolio/`);
  });
  check('repaired translation removal and all-record removal produce no stale sitemap entries', () => {
    const partial = clone(candidate);
    partial.posts = partial.posts.filter(item => item.id !== 'seo-pair-en');
    partial.posts.find(item => item.id === 'seo-pair-vi').translations = [];
    const partialMap = sitemapEntries(validateSnapshot(partial), baseUrl).map(item => item.url);
    assert.ok(!partialMap.some(value => value.includes('seo-paired-en')));
    const empty = clone(initial);
    empty.posts = []; empty.projects = [];
    empty.settings.forEach(item => { item.featuredProjectIds = []; });
    assert.deepEqual(publishedPaths(validateSnapshot(empty)), FIXED_ROUTES);
  });
  check('invalid draft, missing media reference and traversal remain rejected', () => {
    for (const mutate of [
      data => { data.posts[0].status = 'draft'; },
      data => { data.posts[0].metadata.image.mediaId = 'missing'; },
      data => { data.media[0].path = '/media/content/../seo-image.png'; },
    ]) { const bad = clone(candidate); mutate(bad); assert.throws(() => validateSnapshot(bad), ContentValidationError); }
  });
  await mkdir(stage);
  for (const relative of ['src', 'content', 'public', 'scripts', 'package.json', 'pnpm-lock.yaml', 'next.config.ts', 'next-env.d.ts', 'tsconfig.json', 'postcss.config.mjs'])
    await cp(path.join(repo, relative), path.join(stage, relative), { recursive: true });
  await stageDependencies(await realpath(path.join(repo, 'node_modules')), path.join(stage, 'node_modules'));
  const stagedMedia = path.join(stage, 'public/media/content/seo-image.png');
  await writeFile(stagedMedia, await sharp({ create: { width: 2, height: 3, channels: 3, background: '#bd6747' } }).png().toBuffer());
  const adapter = createContentAdapter({ repositoryRoot: stage });
  await writeFile(path.join(stage, relativeSnapshot), JSON.stringify(candidate));
  assert.equal((await adapter.loadSnapshot()).posts.length, 3);
  await rename(stagedMedia, path.join(stage, 'public/media/content/SEO-image.png'));
  await assert.rejects(adapter.loadSnapshot(), error => error instanceof ContentValidationError && error.issues[0].rule.startsWith('media.'));
  await rename(path.join(stage, 'public/media/content/SEO-image.png'), stagedMedia);
  check('media loader rejects case-mismatched committed asset path', () => {});
  const preview = await runBuild('preview', candidate);
  assert.equal(preview.exit, 0);
  const expected = publishedPaths(validated).map(value => `${baseUrl}${value}`);
  const xml = await readFile(path.join(stage, 'out/sitemap.xml'), 'utf8');
  const actual = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(actual, expected);
  for (const url of actual) await readFile(htmlFile(new URL(url).pathname));
  const viOnlyHtml = await readFile(htmlFile('/vi/blog/seo-only-note/'), 'utf8');
  const viHome = await readFile(htmlFile('/vi/'), 'utf8');
  const enHome = await readFile(htmlFile('/en/'), 'utf8');
  check('preview export has exact sitemap, real hreflang, safe image metadata and noindex', () => {
    assert.ok(meta(viOnlyHtml, 'content', `${baseUrl}/media/content/seo-image.png`));
    assert.ok(viOnlyHtml.includes(viOnly.metadata.image.alt));
    assert.ok(viOnlyHtml.includes(`hrefLang="x-default" href="${baseUrl}/vi/blog/seo-only-note/"`));
    assert.ok(!viOnlyHtml.includes(`hrefLang="en" href="${baseUrl}/en/blog/seo-only-note/"`));
    assert.ok(viOnlyHtml.includes('content="noindex, nofollow"'));
    assert.ok(viHome.includes('href="/vi/blog/seo-only-note/"'));
    assert.ok(!viHome.includes('/vi/projects/mcp-project-assistant/'));
    for (const html of [viHome, enHome]) {
      for (const match of html.matchAll(/href="(\/(?:vi|en)\/[^"?#]*)"/g)) {
        const local = match[1];
        assert.ok(expected.includes(`${baseUrl}${local}`), `unpublished internal link ${local}`);
      }
    }
  });
  const production = await runBuild('production', candidate, { NEXT_PUBLIC_SITE_ENV: 'production' });
  assert.equal(production.exit, 0);
  const productionHtml = await readFile(htmlFile('/vi/blog/seo-only-note/'), 'utf8');
  check('explicit local production export indexes published detail', () => {
    assert.ok(productionHtml.includes('content="index, follow"'));
    assert.ok(!productionHtml.includes('content="noindex, nofollow"'));
  });
  const invalid = clone(candidate); invalid.posts[0].status = 'draft';
  const failure = await runBuild('invalid-draft', invalid);
  check('invalid committed candidate fails before Next without fallback', () => {
    assert.notEqual(failure.exit, 0);
    assert.ok(!failure.output.includes('Creating an optimized production build'));
  });
  console.log(`Content integrity: ${checks} checks passed.`);
} finally {
  assert.deepEqual(await readFile(path.join(repo, relativeSnapshot)), original);
  assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(temp).startsWith('dtm-integrity-'));
  await rm(temp, { recursive: true, force: true });
}
