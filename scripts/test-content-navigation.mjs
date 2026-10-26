import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadSnapshot, createContentAdapter } from '../src/lib/content/index.ts';
import { validateSnapshot, ContentValidationError } from '../src/lib/content/validate.ts';
import { createHeaderNavigation, resolveHeaderNavigation } from '../src/lib/content/navigation.ts';

let count = 0;
async function test(name, run) { await run(); console.log(`ok ${++count} - ${name}`); }
const initial = validateSnapshot(await readFile(new URL('./fixtures/content/dtm-seed.json', import.meta.url), 'utf8'));
const live = await loadSnapshot();
const select = (data, locale, pathname, fallback) => resolveHeaderNavigation(pathname, locale, createHeaderNavigation(data, locale).translations, fallback);
const validated = data => validateSnapshot(JSON.stringify(data));
await test('live publication maps only its own published detail translations', () => {
  for (const collection of ['posts', 'projects']) for (const record of live[collection]) {
    const prefix = collection === 'posts' ? 'blog' : 'projects';
    const other = record.locale === 'vi' ? 'en' : 'vi';
    const target = record.translations[0] && live[collection].find(item => item.id === record.translations[0].recordId);
    assert.equal(select(live, record.locale, `/${record.locale}/${prefix}/${record.slug}/`).targetOtherPath,
      target ? `/${target.locale}/${prefix}/${target.slug}/` : `/${other}/${prefix}/`);
  }
});
function post(id, locale, slug, translationGroup = id) {
  return { id, locale, slug, translationGroup, status: 'published', translations: [],
    publishedAt: initial.exportedAt, updatedAt: initial.exportedAt,
    title: id, excerpt: id, metadata: { title: id, description: id },
    body: [{ type: 'paragraph', children: [{ type: 'text', text: id }] }], related: [], tags: [] };
}
await test('validated published project pair uses different actual slugs in both directions', () => {
  assert.equal(select(initial, 'vi', '/vi/projects/portfolio-ca-nhan/').targetOtherPath, '/en/projects/personal-portfolio/');
  assert.equal(select(initial, 'en', '/en/projects/personal-portfolio/').targetOtherPath, '/vi/projects/portfolio-ca-nhan/');
  assert.equal(select(initial, 'vi', '/vi/projects/portfolio-ca-nhan').section, 'projects');
});
await test('Home, About, Contact and collection indexes preserve the section and Home anchors', () => {
  for (const locale of ['vi', 'en']) {
    const other = locale === 'vi' ? 'en' : 'vi';
    for (const section of ['home', 'about', 'contact', 'projects', 'blog']) {
      const route = section === 'home' ? '' : `${section}/`;
      const result = select(initial, locale, `/${locale}/${route}`);
      assert.equal(result.section, section);
      assert.equal(result.targetOtherPath, `/${other}/${route}`);
      assert.equal(result.workPath, section === 'home' ? `/${locale}/#work` : `/${locale}/projects/`);
      assert.equal(result.journalPath, section === 'home' ? `/${locale}/#journal` : `/${locale}/blog/`);
      assert.equal(result.contactPath, section === 'home' ? `/${locale}/#contact` : `/${locale}/contact/`);
    }
  }
});
const candidate = structuredClone(initial);
const vi = post('nav-pair-vi', 'vi', 'ghi-chep', 'nav-pair');
const en = post('nav-pair-en', 'en', 'translated-note', 'nav-pair');
vi.translations = [{ locale: 'en', recordId: en.id }];
en.translations = [{ locale: 'vi', recordId: vi.id }];
candidate.posts = [en, vi, post('nav-single-vi', 'vi', 'chi-tieng-viet')];
await test('published paired article and VI-only article resolve without fabricated counterpart', () => {
  const data = validated(candidate);
  assert.equal(select(data, 'vi', '/vi/blog/ghi-chep/').targetOtherPath, '/en/blog/translated-note/');
  assert.equal(select(data, 'en', '/en/blog/translated-note/').targetOtherPath, '/vi/blog/ghi-chep/');
  assert.equal(select(data, 'vi', '/vi/blog/chi-tieng-viet/').targetOtherPath, '/en/blog/');
  assert.equal(select(data, 'vi', '/vi/blog/unknown/').targetOtherPath, '/en/blog/');
});
await test('removed translations in a repaired snapshot fall back to the same collection index', () => {
  const removed = structuredClone(candidate);
  removed.posts = [structuredClone(vi)]; removed.posts[0].translations = [];
  removed.projects = removed.projects.filter(record => record.locale === 'vi');
  removed.projects.forEach(record => { record.translations = []; });
  removed.settings.find(record => record.locale === 'en').featuredProjectIds = [];
  const data = validated(removed);
  assert.equal(select(data, 'vi', '/vi/blog/ghi-chep/').targetOtherPath, '/en/blog/');
  assert.equal(select(data, 'vi', '/vi/projects/portfolio-ca-nhan/').targetOtherPath, '/en/projects/');
  assert.deepEqual(createHeaderNavigation(data, 'vi').translations, {});
});
await test('malformed, unsupported, cross-locale and multi-segment paths use the explicit fallback', () => {
  for (const pathname of [null, '', '/', '//evil.test', 'https://evil.test/vi/', '/vn/', '/en/blog/', '/vi/nope/', '/vi/blog/a/b/', '/vi/about/a/', '/vi/contact/a/', '/vi/blog/../', '/vi/blog/%61/', '/vi/blog/a?b', '/vi/blog/a#b', '/vi/blog/' + 'x'.repeat(101)]) {
    const result = select(initial, 'vi', pathname);
    assert.equal(result.section, 'home', String(pathname)); assert.equal(result.targetOtherPath, '/en/');
  }
  assert.equal(select(initial, 'vi', null, 'about').targetOtherPath, '/en/about/');
  for (const target of ['https://evil.test/', '//evil.test/', '/en/blog/a/', '/vi/projects/a/', '/en/projects/a/b/']) {
    assert.equal(resolveHeaderNavigation('/vi/projects/portfolio-ca-nhan/', 'vi', { '/vi/projects/portfolio-ca-nhan/': target }).targetOtherPath, '/en/projects/');
  }
});
await test('serialization contains only the selected public identity and reciprocal paths', () => {
  const data = createHeaderNavigation(initial, 'vi');
  assert.deepEqual(Object.keys(data).sort(), ['locale', 'name', 'role', 'translations']);
  assert.equal(data.name, initial.profiles.find(record => record.locale === 'vi').name);
  assert.equal(data.role, initial.profiles.find(record => record.locale === 'vi').role);
  assert.deepEqual(JSON.parse(JSON.stringify(data)), data);
  assert.equal(Object.keys(data.translations).length, 2);
  assert.ok(Object.keys(data.translations).every(key => key.startsWith('/vi/projects/')));
  assert.ok(!JSON.stringify(data).match(/body|bioSummary|sourceUrl|publishedAt|recordId|metadata/));
  const broken = structuredClone(initial); broken.projects[0].translations = [];
  assert.equal(select(broken, 'vi', '/vi/projects/mcp-project-assistant/').targetOtherPath, '/en/projects/');
});
await test('client boundary has no adapter, validator, profileConfig, Node imports or runtime IO', async () => {
  const client = await readFile(new URL('../src/components/HeaderClient.tsx', import.meta.url), 'utf8');
  const helper = await readFile(new URL('../src/lib/content/navigation.ts', import.meta.url), 'utf8');
  assert.ok(client.startsWith("'use client';")); assert.ok(client.includes('usePathname()'));
  assert.ok(!client.match(/profileConfig|loadSnapshot|validateSnapshot|node:|from ['"]@\/lib\/content['"]/));
  assert.ok(!helper.match(/node:|fetch\(|process\.|readFile|localStorage/));
  const wrapper = await readFile(new URL('../src/components/Header.tsx', import.meta.url), 'utf8');
  assert.ok(wrapper.includes('await loadSnapshot()'));
  assert.ok(!wrapper.match(/headers\(|cookies\(|profileConfig|process\.env/));
});
const temp = await mkdtemp(path.join(os.tmpdir(), 'dtm-navigation-'));
try {
  await mkdir(path.join(temp, 'content', 'published'), { recursive: true });
  await mkdir(path.join(temp, 'public'));
  const adapter = createContentAdapter({ repositoryRoot: temp });
  const file = path.join(temp, 'content', 'published', 'dtm.v1.json');
  await test('draft/distributable, asymmetric and invalid snapshots fail closed; repaired reads recover', async () => {
    for (const collection of ['posts', 'projects']) {
      const draft = structuredClone(candidate); draft[collection][0].status = 'draft';
      await writeFile(file, JSON.stringify(draft));
      await assert.rejects(adapter.loadSnapshot(), ContentValidationError);
    }
    const asymmetric = structuredClone(candidate); asymmetric.posts[0].translations = [];
    await writeFile(file, JSON.stringify(asymmetric));
    await assert.rejects(adapter.loadSnapshot(), ContentValidationError);
    await writeFile(file, '{broken'); await assert.rejects(adapter.loadSnapshot(), ContentValidationError);
    await writeFile(file, JSON.stringify(candidate));
    assert.equal(select(await adapter.loadSnapshot(), 'vi', '/vi/blog/ghi-chep/').targetOtherPath, '/en/blog/translated-note/');
    await writeFile(file, JSON.stringify(initial));
    assert.deepEqual(createHeaderNavigation(await adapter.loadSnapshot(), 'vi'), createHeaderNavigation(initial, 'vi'));
  });
} finally {
  assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(temp).startsWith('dtm-navigation-'));
  await rm(temp, { recursive: true, force: true });
}
console.log(`Content navigation: ${count} cases passed; production content unchanged.`);
