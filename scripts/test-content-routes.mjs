/** Real exports in an exclusive staging root; never replace the checkout snapshot or out/. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, link, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../', import.meta.url));
const snapshotPath = 'content/published/dtm.v1.json';
const original = await readFile(path.join(repository, snapshotPath));
const initial = JSON.parse(original);
const manifest = JSON.parse(await readFile(path.join(repository, 'package.json'), 'utf8'));
const temp = await mkdtemp(path.join(os.tmpdir(), 'dtm-routes-'));
const stage = path.join(temp, 'checkout');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const evidence = { stagingRoot: stage, originalSnapshotSha256: digest(original), commands: [], exports: {} };
const logRoot = process.env.DTM_ROUTE_TEST_LOG_DIR ? path.resolve(process.env.DTM_ROUTE_TEST_LOG_DIR) : null;
if (logRoot) await mkdir(logRoot, { recursive: true });

async function inventory(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await inventory(path.join(directory, entry.name), relative + '/'));
    else files.push(relative);
  }
  return files.sort();
}
async function stageDependencies(source, destination, sourceRoot = source, destinationRoot = destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isSymbolicLink()) {
      const target = await realpath(from);
      const relative = path.relative(sourceRoot, target);
      assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'dependency link must stay in node_modules');
      await symlink(path.join(destinationRoot, relative), to, process.platform === 'win32' ? 'junction' : 'dir');
    } else if (entry.isDirectory()) await stageDependencies(from, to, sourceRoot, destinationRoot);
    else {
      // A separate directory tree keeps Turbopack resolution inside staging. Hard links are
      // read-only build inputs; only staging output/cache directories are written or removed.
      try { await link(from, to); } catch (error) {
        if (error.code !== 'EXDEV') throw error;
        await cp(from, to);
      }
    }
  }
}
async function cleanOutputs() {
  for (const name of ['out', '.next']) {
    const target = path.resolve(stage, name);
    assert.equal(path.dirname(target), path.resolve(stage));
    await rm(target, { recursive: true, force: true });
  }
}
async function build(label, snapshot, expectedExit = 0, expectedRule) {
  await cleanOutputs();
  await writeFile(path.join(stage, snapshotPath), Buffer.isBuffer(snapshot) ? snapshot : JSON.stringify(snapshot));
  const command = manifest.scripts.build;
  console.log(`ROUTE_BUILD ${JSON.stringify({ label, cwd: stage, command })}`);
  const output = [];
  const child = spawn(command, { cwd: stage, shell: true, env: {
    ...process.env, NEXT_TELEMETRY_DISABLED: '1',
    PATH: path.join(stage, 'node_modules', '.bin') + path.delimiter + process.env.PATH,
  } });
  for (const channel of ['stdout', 'stderr']) child[channel].on('data', chunk => {
    output.push(chunk); process[channel].write(chunk);
  });
  const exit = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
  const raw = Buffer.concat(output).toString('utf8');
  evidence.commands.push({ label, command, exit });
  if (logRoot) await writeFile(path.join(logRoot, `${label}.log`), raw + `\nEXIT ${exit}\n`);
  assert.equal(exit, expectedExit, `${label}: unexpected build exit`);
  if (expectedRule) {
    assert.ok(raw.includes(expectedRule), `${label}: expected validation diagnostic ${expectedRule}`);
    assert.ok(!raw.includes('Creating an optimized production build'), 'invalid content must fail before Next');
    await assert.rejects(readdir(path.join(stage, 'out')), { code: 'ENOENT' });
  } else {
    const files = await inventory(path.join(stage, 'out'));
    evidence.exports[label] = files;
    const actual = files.filter(file => /^(vi|en)\/blog\/.*index\.html$/.test(file));
    const posts = Buffer.isBuffer(snapshot) ? JSON.parse(snapshot).posts : snapshot.posts;
    const expected = ['vi/blog/index.html', 'en/blog/index.html', ...posts.map(post => `${post.locale}/blog/${post.slug}/index.html`)].sort();
    assert.deepEqual(actual, expected, 'only listings and real published single-slug articles export');
    assert.ok(!files.some(file => file.startsWith('vn/')));
    for (const locale of ['vi', 'en']) {
      const html = await readFile(path.join(stage, 'out', locale, 'blog', 'index.html'), 'utf8');
      const settings = initial.settings.find(record => record.locale === locale);
      assert.ok(html.includes(escape(settings.journalTitle)));
      const localPosts = posts.filter(post => post.locale === locale);
      assert.equal(html.includes('data-blog-empty'), localPosts.length === 0);
      assert.equal(html.includes('data-blog-list'), localPosts.length > 0);
      if (!localPosts.length) assert.ok(html.includes(escape(settings.journalEmptyText)));
      for (const post of localPosts) assert.ok(html.includes(`href="/${locale}/blog/${post.slug}/"`));
    }
    console.log(`ROUTE_EXPORT ${JSON.stringify({ label, blogHtml: actual })}`);
  }
}
function escape(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
}
function post(id, locale, slug, group) {
  return {
    id, locale, slug, translationGroup: group, status: 'published',
    publishedAt: initial.exportedAt, updatedAt: initial.exportedAt,
    translations: [], title: `Route fixture ${id}`, excerpt: `Excerpt ${id}`,
    metadata: { title: `Metadata ${id}`, description: `Description ${id}` },
    body: [
      { type: 'paragraph', children: [{ type: 'text', text: `Body ${id}` }, { type: 'link', label: 'Journal listing', target: { kind: 'internal', path: `/${locale}/blog/` } }] },
      { type: 'heading', level: 2, text: 'Fixture heading' },
      { type: 'list', ordered: false, items: [[{ type: 'text', text: 'Fixture item' }]] },
      { type: 'quote', children: [{ type: 'text', text: 'Fixture quotation' }], attribution: 'Fixture attribution' },
      { type: 'code', language: 'html', code: '<script>routeFixtureMustStayInert()</script>' },
    ], related: [], tags: [],
  };
}
try {
  assert.equal(initial.posts.length, 0, 'this harness expects the accepted real zero-post snapshot');
  await mkdir(stage);
  // Copy only committed build inputs plus this task's source files; exclude secrets, reports and caches.
  for (const relative of ['src', 'content', 'public', 'scripts', 'package.json', 'pnpm-lock.yaml', 'next.config.ts', 'next-env.d.ts', 'tsconfig.json', 'postcss.config.mjs']) {
    await cp(path.join(repository, relative), path.join(stage, relative), { recursive: true });
  }
  // A single external junction is rejected by Turbopack's filesystem boundary. Keep
  // dependency links inside an isolated tree without installing or changing packages.
  await stageDependencies(await realpath(path.join(repository, 'node_modules')), path.join(stage, 'node_modules'));
  await build('empty', original);
  const candidate = structuredClone(initial);
  const vi = post('route-pair-vi', 'vi', 'ghi-chep-thu-nghiem', 'route-pair');
  const en = post('route-pair-en', 'en', 'translated-route-note', 'route-pair');
  const only = post('route-single-vi', 'vi', 'chi-tieng-viet', 'route-single');
  vi.translations = [{ locale: 'en', recordId: en.id }];
  en.translations = [{ locale: 'vi', recordId: vi.id }];
  candidate.posts = [en, vi, only]; // Same publication time, ASCII ID order.
  await build('published', candidate);
  for (const record of candidate.posts) {
    const html = await readFile(path.join(stage, 'out', record.locale, 'blog', record.slug, 'index.html'), 'utf8');
    for (const text of [record.title, record.excerpt, `Body ${record.id}`, 'Fixture heading', 'Fixture item', 'Fixture quotation', 'Fixture attribution']) assert.ok(html.includes(escape(text)));
    assert.ok(html.includes('<article data-published-article'));
    assert.ok(html.includes('&lt;script&gt;routeFixtureMustStayInert()&lt;/script&gt;'));
    assert.ok(!html.includes('<script>routeFixtureMustStayInert()'));
    assert.ok(html.includes(`rel="canonical" href="https://damthienminh.id.vn/${record.locale}/blog/${record.slug}/"`));
    assert.ok(html.includes(`<title>${record.metadata.title}</title>`));
    assert.ok(html.includes('content="noindex, nofollow"') || process.env.NEXT_PUBLIC_SITE_ENV === 'production');
    const alternates = [...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].map(match => [match[1], match[2]]);
    const expected = [record, ...record.translations.map(ref => candidate.posts.find(item => item.id === ref.recordId))].map(item => [item.locale, `https://damthienminh.id.vn/${item.locale}/blog/${item.slug}/`]);
    assert.deepEqual(alternates.sort(), expected.sort(), 'only actual translated article URLs');
  }
  const removed = structuredClone(candidate);
  removed.posts = [structuredClone(vi)]; removed.posts[0].translations = [];
  await build('removed', removed);
  const remaining = await readFile(path.join(stage, 'out/vi/blog/index.html'), 'utf8');
  assert.ok(!remaining.includes(only.slug));
  const remainingArticle = await readFile(path.join(stage, 'out/vi/blog', vi.slug, 'index.html'), 'utf8');
  assert.ok(!remainingArticle.includes(`href="https://damthienminh.id.vn/en/blog/${en.slug}/"`));
  const draft = structuredClone(candidate); draft.posts[0].status = 'draft';
  await build('draft-rejected', draft, 1, 'schema.const');
  const invalid = structuredClone(candidate); invalid.posts[0].related = [{ collection: 'posts', recordId: 'missing-published-post' }];
  await build('reference-rejected', invalid, 1, 'reference.publishedLocale');
  await build('final-empty', original);
  console.log('Content routes: empty, bilingual/different slugs, VI-only, escaped blocks, metadata, removal and fail-closed build gates passed.');
} finally {
  assert.deepEqual(await readFile(path.join(repository, snapshotPath)), original, 'real snapshot bytes unchanged');
  if (logRoot) await writeFile(path.join(logRoot, 'route-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
  assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(temp).startsWith('dtm-routes-'));
  await rm(temp, { recursive: true, force: true });
  console.log(`ROUTE_CLEANUP ${JSON.stringify({ tempRemoved: temp, originalSnapshotSha256: digest(original) })}`);
}
