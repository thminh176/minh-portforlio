/** Consumer fixture: one isolated export, never writes the committed snapshot. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, link, mkdir, mkdtemp, readFile, realpath, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContentAdapter } from '../src/lib/content/index.ts';
import { projectArtwork, selectHomeContent } from '../src/lib/content/presentation.ts';
import { validateSnapshot, ContentValidationError } from '../src/lib/content/validate.ts';

const repository = fileURLToPath(new URL('../', import.meta.url));
const snapshotPath = 'content/published/dtm.v1.json';
const original = await readFile(path.join(repository, snapshotPath));
const initial = JSON.parse(original);
const manifest = JSON.parse(await readFile(path.join(repository, 'package.json'), 'utf8'));
const clone = () => structuredClone(initial);
const temp = await mkdtemp(path.join(os.tmpdir(), 'dtm-consumers-'));
const stage = path.join(temp, 'checkout');
let count = 0;
function check(name, run) { run(); console.log(`ok ${++count} - ${name}`); }
function post(id, locale, date) {
  return {
    id, locale, status: 'published', publishedAt: date, updatedAt: date,
    translationGroup: id, translations: [], slug: id,
    title: `Published ${id}`, excerpt: `Excerpt ${id}`,
    metadata: { title: `Published ${id}`, description: `Excerpt ${id}` },
    body: [{ type: 'paragraph', children: [{ type: 'text', text: `Body ${id}` }] }],
    related: [], tags: [],
  };
}
async function stageDependencies(source, destination, sourceRoot = source, destinationRoot = destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isSymbolicLink()) {
      const target = await realpath(from);
      const relative = path.relative(sourceRoot, target);
      assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
      await symlink(path.join(destinationRoot, relative), to, process.platform === 'win32' ? 'junction' : 'dir');
    } else if (entry.isDirectory()) await stageDependencies(from, to, sourceRoot, destinationRoot);
    else {
      try { await link(from, to); } catch (error) {
        if (error.code !== 'EXDEV') throw error;
        await cp(from, to);
      }
    }
  }
}
function escaped(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
}
try {
  const candidate = clone();
  candidate.profiles[0].name = 'Published Fixture Person';
  candidate.profiles[0].role = 'Fixture role';
  candidate.profiles[0].bioSummary = 'Published fixture biography </script><script>breakout()</script>';
  candidate.profiles[0].aboutStory[0] = 'Published fixture story';
  candidate.profiles[0].hero.kicker = 'Published fixture kicker';
  candidate.profiles[0].hero.headlineLines[0] = 'Published fixture headline';
  candidate.profiles[0].hero.supporting = 'Published fixture supporting';
  candidate.settings[0].journalTitle = 'Published fixture journal';
  candidate.settings[0].journalEmptyText = 'Published fixture empty';
  candidate.settings[0].featuredProjectIds.reverse();
  candidate.settings[0].recentPostLimit = 1;
  const mcp = candidate.projects.find(record => record.id === 'project-mcp-vi');
  mcp.title = 'Published fixture project';
  mcp.summary = 'Published fixture project summary';
  mcp.technologies = ['Published fixture technology'];
  mcp.sourceUrl = 'https://example.com/fixture-source';
  mcp.slug = 'published-fixture-project';
  candidate.posts = [
    post('recent-fixture-vi', 'vi', '2026-10-25T18:25:04Z'),
    post('older-fixture-vi', 'vi', '2026-10-24T18:25:04Z'),
  ];
  const selected = selectHomeContent(validateSnapshot(candidate), 'vi');
  check('profile, settings, project order and published recent limit select one revision', () => {
    assert.equal(selected.profile.name, candidate.profiles[0].name);
    assert.equal(selected.settings.journalTitle, candidate.settings[0].journalTitle);
    assert.deepEqual(selected.featuredProjects.map(record => record.id), candidate.settings[0].featuredProjectIds);
    assert.deepEqual(selected.recentPosts.map(record => record.id), ['recent-fixture-vi']);
    assert.equal(projectArtwork(mcp), 'generic');
  });
  check('unfeatured and removed projects, zero-post journal stay absent', () => {
    const unfeatured = clone();
    unfeatured.settings[0].featuredProjectIds = ['project-portfolio-vi'];
    assert.deepEqual(selectHomeContent(validateSnapshot(unfeatured), 'vi').featuredProjects.map(record => record.id), ['project-portfolio-vi']);
    const removed = clone();
    removed.projects = removed.projects.filter(record => record.id !== 'project-mcp-vi');
    removed.projects.find(record => record.id === 'project-mcp-en').translations = [];
    removed.settings[0].featuredProjectIds = ['project-portfolio-vi'];
    assert.deepEqual(selectHomeContent(validateSnapshot(removed), 'vi').featuredProjects.map(record => record.id), ['project-portfolio-vi']);
    assert.deepEqual(selectHomeContent(validateSnapshot(removed), 'vi').recentPosts, []);
  });
  check('draft and dangling featured references reject the complete snapshot', () => {
    for (const mutate of [
      data => { data.projects[0].status = 'draft'; },
      data => { data.settings[0].featuredProjectIds = ['missing']; },
    ]) {
      const invalid = clone(); mutate(invalid);
      assert.throws(() => validateSnapshot(invalid), ContentValidationError);
    }
  });
  await mkdir(stage);
  for (const relative of ['src', 'content', 'public', 'scripts', 'package.json', 'pnpm-lock.yaml', 'next.config.ts', 'next-env.d.ts', 'tsconfig.json', 'postcss.config.mjs']) {
    await cp(path.join(repository, relative), path.join(stage, relative), { recursive: true });
  }
  await stageDependencies(await realpath(path.join(repository, 'node_modules')), path.join(stage, 'node_modules'));
  await writeFile(path.join(stage, snapshotPath), JSON.stringify(candidate));
  const adapter = createContentAdapter({ repositoryRoot: stage });
  assert.equal((await adapter.loadSnapshot()).revision, initial.revision);
  const command = manifest.scripts.build;
  console.log(`CONSUMER_BUILD ${JSON.stringify({ cwd: stage, command })}`);
  const child = spawn(command, { cwd: stage, shell: true, stdio: 'inherit', env: {
    ...process.env, NEXT_TELEMETRY_DISABLED: '1',
    PATH: path.join(stage, 'node_modules', '.bin') + path.delimiter + process.env.PATH,
  } });
  const exit = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
  assert.equal(exit, 0, 'isolated fixture export must build');
  const vi = await readFile(path.join(stage, 'out/vi/index.html'), 'utf8');
  const about = await readFile(path.join(stage, 'out/vi/about/index.html'), 'utf8');
  const en = await readFile(path.join(stage, 'out/en/index.html'), 'utf8');
  check('exported home/About/JSON-LD contain changed approved fields', () => {
    for (const value of [candidate.profiles[0].name, candidate.profiles[0].role, candidate.profiles[0].hero.kicker,
      candidate.profiles[0].hero.headlineLines[0], candidate.profiles[0].hero.supporting, candidate.settings[0].journalTitle,
      mcp.title, mcp.summary, mcp.technologies[0], candidate.posts[0].title, candidate.posts[0].excerpt]) {
      assert.ok(vi.includes(escaped(value)), value);
    }
    assert.ok(about.includes(candidate.profiles[0].aboutStory[0]));
    const jsonLd = [...vi.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((match) => JSON.parse(match[1]));
    assert.equal(jsonLd.length, 2);
    const person = jsonLd.find((record) => record['@type'] === 'Person');
    assert.equal(person?.description, candidate.profiles[0].bioSummary);
    assert.ok(!vi.includes('</script><script>breakout()'));
    assert.ok(en.includes(initial.profiles[1].name));
    assert.ok(!vi.includes(candidate.settings[0].journalEmptyText));
    assert.ok(!vi.includes(candidate.posts[1].title));
    const visibleWorkTitles = [...vi.matchAll(/<article\b[^>]*>[\s\S]*?<h3\b[^>]*>[\s\S]*?<a\b[^>]*>([^<]+)<\/a>/g)]
      .map((match) => match[1]);
    assert.deepEqual(visibleWorkTitles.slice(0, 2), [
      candidate.projects.find((record) => record.id === 'project-portfolio-vi').title,
      mcp.title,
    ]);
    assert.ok(vi.includes(`href="/vi/projects/${mcp.slug}/"`));
    assert.ok(vi.includes(`href="/vi/blog/${candidate.posts[0].slug}/"`));
    assert.ok(vi.includes(`href="${mcp.sourceUrl}"`));
    assert.ok(!vi.includes('Sơ đồ năng lực MCP:'));
  });
  console.log(`Content consumers: ${count} checks passed; isolated fixture build exit ${exit}.`);
} finally {
  assert.deepEqual(await readFile(path.join(repository, snapshotPath)), original, 'committed snapshot unchanged');
  assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(temp).startsWith('dtm-consumers-'));
  await rm(temp, { recursive: true, force: true });
}
