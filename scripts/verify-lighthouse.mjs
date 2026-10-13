import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { locateBrowserExecutable, createStrictStaticServer } from './verification-helpers.mjs';

const run = promisify(execFile);
const require = createRequire(import.meta.url);
const nextCli = require.resolve('next/dist/bin/next');
const lighthouseCli = path.resolve('node_modules/lighthouse/cli/index.js');
const evidence = path.resolve('reports/lighthouse-evidence');
const browser = locateBrowserExecutable();
if (!browser) throw new Error('Existing Edge/Chrome required; no browser will be downloaded.');
fs.mkdirSync(evidence, { recursive: true });
const previewEnv = { ...process.env, NEXT_PUBLIC_SITE_ENV: 'preview', NEXT_PUBLIC_CONTACT_ENABLED: 'false', NEXT_PUBLIC_TURNSTILE_SITE_KEY: '' };
const productionEnv = { ...previewEnv, NEXT_PUBLIC_SITE_ENV: 'production' };
const rows = [];
let server;
let failure;
async function node(args, env, timeout = 180000) {
  const result = await run(process.execPath, args, { env, timeout, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
  return result;
}
try {
  console.log('[lighthouse] Building local production metadata; form/analytics remain inactive.');
  await node([nextCli, 'build'], productionEnv);
  await node(['scripts/normalize-static-export.mjs'], productionEnv);
  await node(['scripts/smoke-export.mjs'], productionEnv);
  server = await createStrictStaticServer({ rootDir: 'out', compression: true });
  for (const mode of ['mobile', 'desktop']) {
    for (const route of ['/vi/', '/en/', '/vi/about/', '/en/about/']) {
      const name = `${route.split('/').filter(Boolean).join('-')}-${mode}`;
      const reportPath = path.join(evidence, `${name}.json`);
      const args = [lighthouseCli, `${server.baseUrl}${route}`, '--output=json', `--output-path=${reportPath}`, '--quiet', '--chrome-flags=--headless --disable-gpu --no-sandbox', '--no-enable-error-reporting', '--only-categories=performance,accessibility,best-practices,seo'];
      if (mode === 'desktop') args.push('--preset=desktop');
      await node(args, { ...productionEnv, CHROME_PATH: browser.executablePath });
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      if (report.runtimeError) throw new Error(JSON.stringify(report.runtimeError));
      const scores = Object.fromEntries(Object.entries(report.categories).map(([key, value]) => [key, Math.round(value.score * 100)]));
      const row = { route, mode, report: path.relative(process.cwd(), reportPath), timestamp: report.fetchTime, lighthouseVersion: report.lighthouseVersion, scores, lcpMs: report.audits['largest-contentful-paint'].numericValue, cls: report.audits['cumulative-layout-shift'].numericValue, warnings: report.runWarnings };
      rows.push(row);
      console.log(`[lighthouse] ${route} ${mode}: ${JSON.stringify(scores)}, LCP=${Math.round(row.lcpMs)}ms, CLS=${row.cls}`);
    }
  }
} catch (error) {
  failure = error;
} finally {
  try { if (server) await server.closeBounded(); } catch (error) { failure ??= error; }
  try {
    console.log('[lighthouse] Restoring disabled/noindex preview export.');
    await node([nextCli, 'build'], previewEnv);
    await node(['scripts/normalize-static-export.mjs'], previewEnv);
    await node(['scripts/smoke-export.mjs'], previewEnv);
  } catch (error) { failure ??= error; }
  fs.writeFileSync(path.join(evidence, 'summary.json'), JSON.stringify({ timestamp: new Date().toISOString(), platform: process.platform, node: process.version, browser: browser.executablePath, rows, error: failure?.message ?? null, limits: 'Local gzip HTTP simulated lab results; not field INP or deployed performance. Safari/Linux/remote CI unrun.' }, null, 2));
}
if (failure) throw failure;
const misses = rows.filter((row) => Object.values(row.scores).some((score) => score < 95));
console.log(`[lighthouse] Eight actual reports saved; ${misses.length} cases below 95 target. Preview restored.`);
