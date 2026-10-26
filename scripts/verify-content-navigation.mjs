import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, link, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { AxeBuilder } from '@axe-core/playwright';
import { locateBrowserExecutable, createStrictStaticServer, closeBrowserContextsBounded, closeBrowserBounded } from './verification-helpers.mjs';

const repository = fileURLToPath(new URL('../', import.meta.url));
const evidenceDir = path.resolve(process.env.DTM_NAVIGATION_LOG_DIR || 'reports/navigation-evidence');
await mkdir(evidenceDir, { recursive: true });
const snapshotFile = path.join(repository, 'content/published/dtm.v1.json');
const original = await readFile(snapshotFile);
const initial = JSON.parse(original);
const manifest = JSON.parse(await readFile(path.join(repository, 'package.json'), 'utf8'));
const css = await readFile(path.join(repository, 'src/app/globals.css'), 'utf8');
const fonts = new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(match => match[1]));
const evidence = { commands: [], rows: [], unexpectedRequests: [], runtimeErrors: [] };
const browserInfo = locateBrowserExecutable();
assert.ok(browserInfo, 'A local Edge/Chrome executable is required');
let browser;
let temp;

async function verify(rootDir, routes, label) {
  const server = await createStrictStaticServer({ rootDir, port: 0 });
  const context = await browser.newContext();
  try {
    await context.route('**/*', async route => {
      const request = route.request();
      const url = request.url();
      if (new URL(url).origin === server.baseUrl && ['GET', 'HEAD'].includes(request.method())) return route.continue();
      const isFont = request.method() === 'GET' && request.resourceType() === 'font' && fonts.has(url);
      if (!isFont) evidence.unexpectedRequests.push({ url, method: request.method(), type: request.resourceType() });
      // Tests are local only, including fonts: no provider or contact requests leave the browser.
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => evidence.runtimeErrors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && /hydration|Minified React error/i.test(message.text())) evidence.runtimeErrors.push(message.text());
    });
    const menu = page.locator('header button[aria-controls="mobile-navigation"]');
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const { source, target, section } of routes) {
        await page.goto(server.baseUrl + source, { waitUntil: 'networkidle' });
        if (width === 390) {
          await menu.click();
          await assertExpanded(menu, true);
        }
        const nav = page.locator('header nav:visible');
        assert.equal(await nav.count(), 1);
        assert.equal(await nav.locator('[aria-current="page"]').count(), 1);
        const locale = source.split('/')[1];
        const sectionPath = section === 'home' ? `/${locale}/` : `/${locale}/${section}/`;
        assert.equal(await nav.locator('[aria-current="page"]').getAttribute('href'), sectionPath);
        for (const [anchor, collection] of [['work', 'projects'], ['journal', 'blog'], ['contact', 'contact']]) {
          assert.equal(await nav.locator(`a[href="/${locale}/${section === 'home' ? '#' + anchor : collection + '/'}"]`).count(), 1);
        }
        const switchLink = page.locator(`header a[href="${target}"]:visible`);
        assert.equal(await switchLink.count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
        const axe = await new AxeBuilder({ page }).include('header').analyze();
        assert.deepEqual(axe.violations, [], `Header axe: ${label} ${source} ${width}`);
        assert.deepEqual(axe.incomplete, [], `Header axe incomplete: ${label} ${source} ${width}`);
        const imageName = `${label}-${source.replaceAll('/', '_')}-${width}.png`;
        await page.screenshot({ path: path.join(evidenceDir, imageName), fullPage: false });
        if (width === 390) {
          await page.keyboard.press('Escape');
          await assertExpanded(menu, false);
          assert.equal(await menu.evaluate(element => element === document.activeElement), true);
          await menu.click();
        }
        await switchLink.click();
        await page.waitForURL(server.baseUrl + target);
        assert.equal(await page.evaluate(() => localStorage.getItem('dtm_locale')), target.split('/')[1]);
        evidence.rows.push({ label, source, target, section, width, axeViolations: axe.violations.length, axeIncomplete: axe.incomplete.length, screenshot: imageName });
      }
    }
    // Switching still navigates when persistence is blocked, and resizing closes the menu.
    const blocked = await browser.newContext();
    try {
      await blocked.route('**/*', route => new URL(route.request().url()).origin === server.baseUrl && ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
      await blocked.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); }; });
      const blockedPage = await blocked.newPage();
      blockedPage.on('pageerror', error => evidence.runtimeErrors.push(error.message));
      await blockedPage.setViewportSize({ width: 390, height: 844 });
      await blockedPage.goto(server.baseUrl + '/vi/about/', { waitUntil: 'networkidle' });
      const trigger = blockedPage.locator('header button[aria-controls="mobile-navigation"]');
      await trigger.click();
      await blockedPage.setViewportSize({ width: 1440, height: 900 });
      await assertExpanded(trigger, false);
      await blockedPage.locator('header a[href="/en/about/"]:visible').click();
      await blockedPage.waitForURL(server.baseUrl + '/en/about/');
    } finally { await blocked.close(); }
    assert.deepEqual(evidence.unexpectedRequests, []);
    assert.deepEqual(evidence.runtimeErrors, []);
  } finally {
    try { await context.close(); } finally { await server.closeBounded(); }
  }
}
async function assertExpanded(menu, expected) {
  await menu.page().waitForFunction(({ expected }) => document.querySelector('header button[aria-controls="mobile-navigation"]')?.getAttribute('aria-expanded') === String(expected), { expected });
}
async function stageDependencies(source, destination, sourceRoot = source, destinationRoot = destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isSymbolicLink()) {
      const relative = path.relative(sourceRoot, await realpath(from));
      assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
      await symlink(path.join(destinationRoot, relative), to, process.platform === 'win32' ? 'junction' : 'dir');
    } else if (entry.isDirectory()) await stageDependencies(from, to, sourceRoot, destinationRoot);
    else {
      try { await link(from, to); } catch (error) { if (error.code !== 'EXDEV') throw error; await cp(from, to); }
    }
  }
}
function post(id, locale, slug, group = id) {
  return { id, locale, slug, translationGroup: group, status: 'published', translations: [],
    publishedAt: initial.exportedAt, updatedAt: initial.exportedAt,
    title: `Navigation fixture ${id}`, excerpt: `Navigation fixture ${id}`,
    metadata: { title: `Navigation fixture ${id}`, description: `Navigation fixture ${id}` },
    body: [{ type: 'paragraph', children: [{ type: 'text', text: `Navigation fixture ${id}` }] }], tags: [], related: [] };
}
try {
  browser = await chromium.launch({ executablePath: browserInfo.executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const routes = [];
  for (const locale of ['vi', 'en']) {
    const other = locale === 'vi' ? 'en' : 'vi';
    for (const section of ['home', 'about', 'projects', 'blog', 'contact']) {
      const suffix = section === 'home' ? '' : `${section}/`;
      routes.push({ source: `/${locale}/${suffix}`, target: `/${other}/${suffix}`, section });
    }
  }
  for (const record of initial.projects) {
    const target = initial.projects.find(item => item.id === record.translations[0]?.recordId);
    routes.push({ source: `/${record.locale}/projects/${record.slug}/`, target: target ? `/${target.locale}/projects/${target.slug}/` : `/${record.locale === 'vi' ? 'en' : 'vi'}/projects/`, section: 'projects' });
  }
  await verify(path.join(repository, 'out'), routes, 'published');
  temp = await mkdtemp(path.join(os.tmpdir(), 'dtm-nav-export-'));
  const stage = path.join(temp, 'checkout');
  await mkdir(stage);
  for (const relative of ['src', 'content', 'public', 'scripts', 'package.json', 'pnpm-lock.yaml', 'next.config.ts', 'next-env.d.ts', 'tsconfig.json', 'postcss.config.mjs']) {
    await cp(path.join(repository, relative), path.join(stage, relative), { recursive: true });
  }
  await stageDependencies(await realpath(path.join(repository, 'node_modules')), path.join(stage, 'node_modules'));
  const candidate = structuredClone(initial);
  const vi = post('nav-pair-vi', 'vi', 'ghi-chep', 'nav-pair');
  const en = post('nav-pair-en', 'en', 'translated-note', 'nav-pair');
  vi.translations = [{ locale: 'en', recordId: en.id }];
  en.translations = [{ locale: 'vi', recordId: vi.id }];
  candidate.posts = [en, vi, post('nav-single-vi', 'vi', 'chi-tieng-viet')];
  await writeFile(path.join(stage, 'content/published/dtm.v1.json'), JSON.stringify(candidate));
  const output = [];
  console.log(`NAVIGATION_FIXTURE_BUILD ${JSON.stringify({ cwd: stage, command: manifest.scripts.build })}`);
  const child = spawn(manifest.scripts.build, { cwd: stage, shell: true, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', PATH: path.join(stage, 'node_modules/.bin') + path.delimiter + process.env.PATH } });
  for (const channel of ['stdout', 'stderr']) child[channel].on('data', chunk => { output.push(chunk); process[channel].write(chunk); });
  const exit = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
  evidence.commands.push({ command: manifest.scripts.build, cwd: stage, exit });
  await writeFile(path.join(evidenceDir, 'fixture-build.log'), Buffer.concat(output).toString('utf8') + `\nEXIT ${exit}\n`);
  assert.equal(exit, 0, 'isolated published article fixture must really export');
  await verify(path.join(stage, 'out'), [
    { source: '/vi/blog/ghi-chep/', target: '/en/blog/translated-note/', section: 'blog' },
    { source: '/en/blog/translated-note/', target: '/vi/blog/ghi-chep/', section: 'blog' },
    { source: '/vi/blog/chi-tieng-viet/', target: '/en/blog/', section: 'blog' },
  ], 'fixture');
  console.log(`Content navigation browser: ${evidence.rows.length} route/viewport rows, zero Header axe violations/incomplete, correct active section and persisted locale, Escape/focus and blocked storage passed.`);
} finally {
  try { await closeBrowserContextsBounded(browser); } finally {
    try { await closeBrowserBounded(browser); } finally {
      assert.deepEqual(await readFile(snapshotFile), original, 'published snapshot bytes remain unchanged');
      await writeFile(path.join(evidenceDir, 'navigation-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
      if (temp) {
        assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(temp).startsWith('dtm-nav-export-'));
        await rm(temp, { recursive: true, force: true });
      }
    }
  }
}
