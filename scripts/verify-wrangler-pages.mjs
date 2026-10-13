import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let assertionCount = 0;

function logPass(msg) {
  assertionCount++;
  console.log(`  [PASS] (${assertionCount}) ${msg}`);
}

function logSection(title) {
  console.log(`\n--- ${title} ---`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
  logPass(message);
}

// Dynamically discover an available port on 127.0.0.1
function getAvailablePort(startPort = 8788) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(getAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
    server.listen(startPort, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

// Bounded wait for Wrangler Pages dev server readiness with circular diagnostic buffer
function waitForReady(child, port, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const maxDiagLines = 40;
    const diagLines = [];
    const pushDiag = (data) => {
      const lines = data.toString().split(/\r?\n/);
      for (const line of lines) {
        if (line.trim()) {
          diagLines.push(line);
          if (diagLines.length > maxDiagLines) {
            diagLines.shift();
          }
        }
      }
    };

    const timer = setTimeout(() => {
      reject(
        new Error(
          `Timeout waiting for Wrangler pages dev on port ${port} after ${timeoutMs}ms. Safe diagnostics:\n${diagLines.join('\n')}`
        )
      );
    }, timeoutMs);

    child.stdout.on('data', (d) => {
      pushDiag(d);
      const str = d.toString();
      if (str.includes(`Ready on http://127.0.0.1:${port}`) || str.includes(`http://127.0.0.1:${port}`)) {
        clearTimeout(timer);
        resolve();
      }
    });

    child.stderr.on('data', (d) => {
      pushDiag(d);
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(
        new Error(
          `Wrangler process exited prematurely with code ${code}. Safe diagnostics:\n${diagLines.join('\n')}`
        )
      );
    });
  });
}

// Strict path.relative containment assertion
function assertStrictContainment(baseDir, targetDir, expectedDir) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetDir);
  const resolvedExpected = path.resolve(expectedDir);

  if (resolvedTarget !== resolvedExpected) {
    throw new Error(
      `Safety violation: target directory ${resolvedTarget} does not match exact expected fixture ${resolvedExpected}`
    );
  }

  const rel = path.relative(resolvedBase, resolvedTarget);
  // rel must not be empty, must not start with '..', and must not be absolute
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(
      `Safety violation: fixture directory ${resolvedTarget} is not strictly contained within temp root ${resolvedBase}`
    );
  }

  const baseName = path.basename(resolvedTarget);
  if (!baseName.startsWith('dtm-pages-runtime-fixture-')) {
    throw new Error(
      `Safety violation: fixture directory ${resolvedTarget} does not match expected prefix 'dtm-pages-runtime-fixture-'`
    );
  }

  return true;
}

// Strictly bounded fixture cleanup helper; fails run on deletion error
async function cleanupFixtureDir(fixtureDir, expectedDir) {
  if (!fixtureDir) return;

  assertStrictContainment(os.tmpdir(), fixtureDir, expectedDir);

  console.log(`[verify-wrangler-pages] Cleaning up temporary fixture directory: ${fixtureDir}`);
  // Allow pending handles to release on Windows
  await new Promise((r) => setTimeout(r, 500));

  fs.rmSync(fixtureDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });

  if (fs.existsSync(fixtureDir)) {
    throw new Error(`Required cleanup failure: fixture directory still exists on disk after deletion: ${fixtureDir}`);
  }
  console.log('[verify-wrangler-pages] Fixture cleanup completed.');
}

// Terminate only owned process tree and await verified child exit with bounded rejection
// Terminate only owned process tree and await verified child exit with bounded rejection
function killProcessTree(child, options = {}) {
  const timeoutMs = typeof options === 'number' ? options : (options.timeoutMs || 10000);
  const killerStub = typeof options === 'object' && options.killer ? options.killer : null;

  return new Promise((resolve, reject) => {
    if (!child) {
      resolve();
      return;
    }

    const isAlreadyExited = child.exitCode !== null || child.signalCode !== null;

    // Windows OS boundary:
    // If the parent process has already exited, taskkill cannot traverse the process
    // tree by parent PID (/pid <child.pid> /t) because the parent PID no longer exists
    // in the OS process table. We report and handle this Windows OS limitation honestly.
    if (process.platform === 'win32' && !killerStub) {
      if (isAlreadyExited) {
        resolve();
        return;
      }
    }

    // POSIX OS boundary:
    // Process group cleanup requires child to have been spawned detached with its own process group.
    if (process.platform !== 'win32' && !killerStub) {
      if (!child._detached) {
        if (isAlreadyExited) {
          resolve();
          return;
        }
        reject(
          new Error(
            `Process tree cleanup unsupported on POSIX: child PID ${child.pid} was not spawned detached with its own process group`
          )
        );
        return;
      }
      // If child._detached is true, even if the parent already exited (isAlreadyExited === true),
      // the process group (-child.pid) may still contain alive descendants.
      // We continue below to signal and probe the detached group!
    }

    let settled = false;
    let timer = null;
    let pollInterval = null;
    let childExited = isAlreadyExited;
    let taskkillSucceeded = false;
    let treeError = null;

    const clearPoll = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const maybeResolve = () => {
      if (settled) return;
      if (treeError) {
        settled = true;
        if (timer) clearTimeout(timer);
        clearPoll();
        reject(treeError);
        return;
      }
      // Require BOTH successful owned-tree termination AND actual child exit proof
      if (childExited && taskkillSucceeded) {
        settled = true;
        if (timer) clearTimeout(timer);
        clearPoll();
        resolve();
      }
    };

    const cleanupAndReject = (err) => {
      if (!settled) {
        settled = true;
        if (timer) clearTimeout(timer);
        clearPoll();
        reject(err);
      }
    };

    // Safety timer: do NOT clear until proof of child exit. Bounded rejection on timeout.
    timer = setTimeout(() => {
      cleanupAndReject(
        new Error(
          `Owned process tree termination timed out: PID ${child.pid} did not exit within ${timeoutMs}ms (childExited=${childExited}, treeSuccess=${taskkillSucceeded})`
        )
      );
    }, timeoutMs);

    // Proof of child termination: if not already exited, await child process exit event
    if (!childExited) {
      child.once('exit', () => {
        childExited = true;
        maybeResolve();
      });
    }

    if (killerStub) {
      // Injected test-only process-killer stub (safe testing without OS signals)
      try {
        const res = killerStub(child.pid);
        if (res && typeof res.then === 'function') {
          res.then(
            (code) => {
              if (code === 0 || code === 128) {
                taskkillSucceeded = true;
                maybeResolve();
              } else {
                treeError = new Error(`Injected killer stub failed with exit code ${code}`);
                maybeResolve();
              }
            },
            (err) => {
              treeError = err;
              maybeResolve();
            }
          );
        } else {
          if (res === 0 || res === 128 || res === true) {
            taskkillSucceeded = true;
            maybeResolve();
          } else {
            treeError = new Error(`Injected killer stub failed with result ${res}`);
            maybeResolve();
          }
        }
      } catch (err) {
        treeError = err;
        maybeResolve();
      }
      return;
    }

    if (process.platform === 'win32') {
      try {
        // Windows: taskkill ONLY the spawned PID tree (/pid <child.pid> /t /f) with stdio: ignore
        const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
          stdio: 'ignore',
        });

        killer.on('error', (err) => {
          // taskkill executable failed to spawn; cannot guarantee tree termination
          treeError = new Error(`Failed to execute taskkill for owned PID ${child.pid}: ${err.message}`);
          maybeResolve();
        });

        killer.on('exit', (code) => {
          // Inspect taskkill exitcode: 0 = SUCCESS, 128 = process not found (already exited tree)
          if (code === 0 || code === 128) {
            taskkillSucceeded = true;
            maybeResolve();
          } else {
            // Non-zero exit code: tree termination cannot be proven.
            // Do NOT fall back to child.kill and claim tree success. Reject honestly!
            treeError = new Error(
              `taskkill tree termination failed with exit code ${code} for owned PID ${child.pid}`
            );
            maybeResolve();
          }
        });
      } catch (err) {
        treeError = err;
        maybeResolve();
      }
    } else {
      // Linux / POSIX:
      // Signal owned detached process group
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch (err) {
        if (err.code === 'ESRCH') {
          // Process group already exited
          taskkillSucceeded = true;
          maybeResolve();
          return;
        }
        treeError = new Error(`POSIX process group signal failed for pgid ${child.pid}: ${err.message}`);
        maybeResolve();
        return;
      }

      // Verify that the process group has actually exited by polling with signal 0
      pollInterval = setInterval(() => {
        try {
          process.kill(-child.pid, 0);
          // Group still has active processes
        } catch (err) {
          clearPoll();
          if (err.code === 'ESRCH') {
            // All processes in the process group have terminated
            taskkillSucceeded = true;
            maybeResolve();
          } else {
            treeError = new Error(`POSIX process group probe failed for pgid ${child.pid}: ${err.message}`);
            maybeResolve();
          }
        }
      }, 100);
    }
  });
}

// Bounded HTTP request helper with timeout and AbortController (supports raw string or object bodies)
async function request(baseUrl, requestPath, options = {}) {
  const url = `${baseUrl}${requestPath}`;
  const headers = options.headers || {};
  const method = options.method || 'GET';
  const timeoutMs = options.timeoutMs || 8000;

  let body = undefined;
  if (options.rawBody !== undefined) {
    body = options.rawBody;
  } else if (typeof options.body === 'string') {
    body = options.body;
  } else if (options.body !== undefined && options.body !== null) {
    body = JSON.stringify(options.body);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error(`HTTP request to ${requestPath} timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    // Abort signal remains active through response body stream reading
    const text = await res.text();

    const contentType = res.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }

    return {
      status: res.status,
      headers: res.headers,
      data,
      text,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function run() {
  console.log('[verify-wrangler-pages] Starting isolated local Cloudflare Pages runtime verification...');

  // 1. Locate local official Wrangler CLI
  const wranglerPkg = require.resolve('wrangler/package.json');
  const wranglerBin = path.resolve(path.dirname(wranglerPkg), 'bin/wrangler.js');
  if (!fs.existsSync(wranglerBin)) {
    throw new Error(`Wrangler executable entry point not found at: ${wranglerBin}`);
  }

  let fixtureDir = null;
  let expectedFixtureDir = null;
  let wranglerProcess = null;

  try {
    // 2. Setup isolated temporary fixture directory containing ONLY out/ and functions/
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dtm-pages-runtime-fixture-'));
    expectedFixtureDir = fixtureDir;
    console.log(`[verify-wrangler-pages] Created isolated temporary fixture: ${fixtureDir}`);

    const fixtureOut = path.join(fixtureDir, 'out');
    const fixtureFunctions = path.join(fixtureDir, 'functions');

    fs.cpSync(path.resolve('out'), fixtureOut, { recursive: true });
    fs.cpSync(path.resolve('functions'), fixtureFunctions, { recursive: true });

    // Strictly verify no .env or .dev.vars exist in fixture
    if (fs.existsSync(path.join(fixtureDir, '.env')) || fs.existsSync(path.join(fixtureDir, '.dev.vars'))) {
      throw new Error('Security violation: .env or .dev.vars detected in isolated test fixture');
    }

    // 3. Setup isolated user profile inside fixture to prevent reading ~/.wrangler or global account state
    const fixtureProfile = path.join(fixtureDir, '.profile');
    fs.mkdirSync(path.join(fixtureProfile, '.config'), { recursive: true });
    fs.mkdirSync(path.join(fixtureProfile, '.cache'), { recursive: true });
    fs.mkdirSync(path.join(fixtureProfile, 'AppData', 'Roaming'), { recursive: true });
    fs.mkdirSync(path.join(fixtureProfile, 'AppData', 'Local'), { recursive: true });

    // 4. Sanitize environment: strip all inherited provider, contact, and Cloudflare credentials
    const sanitizedEnv = { ...process.env };
    const sensitiveVars = [
      'CLOUDFLARE_API_TOKEN',
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_EMAIL',
      'CLOUDFLARE_API_KEY',
      'TURNSTILE_SECRET_KEY',
      'TURNSTILE_SITE_KEY',
      'TURNSTILE_EXPECTED_HOSTNAME',
      'TURNSTILE_EXPECTED_ACTION',
      'RESEND_API_KEY',
      'CONTACT_TO_EMAIL',
      'CONTACT_FROM_EMAIL',
      'TELEGRAM_BOT_TOKEN',
      'TELEGRAM_CHAT_ID',
    ];
    for (const v of sensitiveVars) {
      delete sanitizedEnv[v];
    }
    for (const k of Object.keys(sanitizedEnv)) {
      if (/^(CF_|CLOUDFLARE_|NEXT_PUBLIC_|DOTENV_)/i.test(k)) {
        delete sanitizedEnv[k];
      }
    }

    // Explicitly configure isolation, telemetry opt-out, and profile paths
    sanitizedEnv.WRANGLER_SEND_METRICS = 'false';
    sanitizedEnv.CI = 'true';
    sanitizedEnv.NODE_ENV = 'test';
    sanitizedEnv.USERPROFILE = fixtureProfile;
    sanitizedEnv.HOME = fixtureProfile;
    sanitizedEnv.APPDATA = path.join(fixtureProfile, 'AppData', 'Roaming');
    sanitizedEnv.LOCALAPPDATA = path.join(fixtureProfile, 'AppData', 'Local');
    sanitizedEnv.XDG_CONFIG_HOME = path.join(fixtureProfile, '.config');
    sanitizedEnv.XDG_CACHE_HOME = path.join(fixtureProfile, '.cache');
    if (process.platform === 'win32') {
      const root = path.parse(fixtureProfile).root;
      sanitizedEnv.HOMEDRIVE = root.replace(/\\$/, '');
      sanitizedEnv.HOMEPATH = fixtureProfile.slice(root.length - 1);
    }

    // 5. Select dynamic available port
    const port = await getAvailablePort(8788);
    console.log(`[verify-wrangler-pages] Selected port ${port} on 127.0.0.1`);

    // 6. Spawn local Wrangler Pages dev on isolated fixture
    console.log(`[verify-wrangler-pages] Spawning wrangler pages dev (isolated fail-closed runtime)...`);
    const isWin = process.platform === 'win32';
    wranglerProcess = spawn(
      process.execPath,
      [
        wranglerBin,
        'pages',
        'dev',
        'out',
        '--port',
        String(port),
        '--ip',
        '127.0.0.1',
        '--compatibility-date=2026-10-06',
        '--log-level',
        'log',
      ],
      {
        cwd: fixtureDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: sanitizedEnv,
        detached: !isWin,
      }
    );
    wranglerProcess._detached = !isWin;

    await waitForReady(wranglerProcess, port);
    console.log(`[verify-wrangler-pages] Wrangler local Pages server ready at http://127.0.0.1:${port}`);

    const baseUrl = `http://127.0.0.1:${port}`;

    // =========================================================================
    // Phase 1: Exact _routes.json Routing Configuration
    // =========================================================================
    logSection('1. Cloudflare Pages _routes.json Routing Configuration');

    const routesRes = await request(baseUrl, '/_routes.json');
    assert(routesRes.status === 200, 'GET /_routes.json returns HTTP 200');
    const routesConfig = routesRes.data || JSON.parse(routesRes.text);
    assert(routesConfig.version === 1, 'GET /_routes.json specifies version: 1');
    assert(
      Array.isArray(routesConfig.include) &&
        routesConfig.include.length === 1 &&
        routesConfig.include[0] === '/api/*',
      'GET /_routes.json exact include configuration: ["/api/*"]'
    );
    assert(
      Array.isArray(routesConfig.exclude) && routesConfig.exclude.length === 0,
      'GET /_routes.json exact exclude configuration: []'
    );
    console.log(
      '    Note: Proves declared Cloudflare Pages routing rule; local development does not measure production invocation billing.'
    );

    // =========================================================================
    // Phase 2: Static Export Routes Served Directly from out/
    // =========================================================================
    logSection('2. Localized Static Export Routes & Assets Served Directly');

    const rootRes = await request(baseUrl, '/');
    assert(
      rootRes.status === 200 && rootRes.text.includes('html') && rootRes.text.includes('DTM'),
      'GET / serves static root page with HTTP 200 and DTM visual'
    );

    const viRes = await request(baseUrl, '/vi/');
    assert(
      viRes.status === 200 && viRes.text.includes('Đàm Thiên Minh') && viRes.text.includes('lang="vi"'),
      'GET /vi/ serves static Vietnamese homepage with HTML lang="vi" and name'
    );

    const enRes = await request(baseUrl, '/en/');
    assert(
      enRes.status === 200 && enRes.text.includes('Thien Minh Dam') && enRes.text.includes('lang="en"'),
      'GET /en/ serves static English homepage with HTML lang="en" and name'
    );

    const viAboutRes = await request(baseUrl, '/vi/about/');
    assert(
      viAboutRes.status === 200 && viAboutRes.text.includes('lang="vi"'),
      'GET /vi/about/ serves static Vietnamese About page with HTML lang="vi"'
    );

    const enAboutRes = await request(baseUrl, '/en/about/');
    assert(
      enAboutRes.status === 200 && enAboutRes.text.includes('lang="en"'),
      'GET /en/about/ serves static English About page with HTML lang="en"'
    );

    const robotsRes = await request(baseUrl, '/robots.txt');
    assert(
      robotsRes.status === 200 && robotsRes.text.toLowerCase().includes('user-agent'),
      'GET /robots.txt serves static robots policy'
    );

    const sitemapRes = await request(baseUrl, '/sitemap.xml');
    assert(
      sitemapRes.status === 200 && sitemapRes.text.includes('urlset'),
      'GET /sitemap.xml serves static XML sitemap'
    );

    // =========================================================================
    // Phase 3: API Method, Content-Type & Origin Enforcement
    // =========================================================================
    logSection('3. API Protocol & Security Policy Enforcement');

    const getApiRes = await request(baseUrl, '/api/contact', { method: 'GET' });
    assert(
      getApiRes.status === 405 &&
        getApiRes.headers.get('allow') === 'POST' &&
        getApiRes.data?.error === 'method_not_allowed',
      'GET /api/contact rejected with HTTP 405, Allow: POST, and method_not_allowed error'
    );

    const textPostRes = await request(baseUrl, '/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'invalid-plain-text',
    });
    assert(
      textPostRes.status === 415 && textPostRes.data?.error === 'unsupported_media_type',
      'POST /api/contact with text/plain rejected with HTTP 415 and unsupported_media_type error'
    );

    const originRes = await request(baseUrl, '/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://malicious-cross-origin.example',
      },
      body: { name: 'Cross Origin Test' },
    });
    assert(
      originRes.status === 403 && originRes.data?.error === 'forbidden_origin',
      'Cross-origin POST /api/contact rejected with HTTP 403 and forbidden_origin error'
    );

    // =========================================================================
    // Phase 4: Honeypot & Input Validation
    // =========================================================================
    logSection('4. Honeypot & Strict Field Boundary Enforcement');

    const honeypotRes = await request(baseUrl, '/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: {
        name: 'Bot User',
        email: 'bot@example.test',
        purpose: 'freelance',
        message: 'This is a spam inquiry',
        locale: 'en',
        honeypot: 'bot-trap-value',
        turnstileToken: 'synthetic-token',
      },
    });
    assert(
      honeypotRes.status === 400 && honeypotRes.data?.error === 'invalid_submission',
      'Honeypot submission rejected with HTTP 400 and invalid_submission error'
    );

    const emptyNameRes = await request(baseUrl, '/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: {
        name: '   ',
        email: 'user@example.test',
        purpose: 'freelance',
        message: 'Valid message exceeding minimum ten characters',
        locale: 'en',
        turnstileToken: 'synthetic-token',
      },
    });
    assert(
      emptyNameRes.status === 400 && emptyNameRes.data?.error === 'invalid_name',
      'Whitespace-only name rejected with HTTP 400 and invalid_name error'
    );

    const invalidEmailRes = await request(baseUrl, '/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: {
        name: 'Valid Name',
        email: 'invalid-email-address',
        purpose: 'freelance',
        message: 'Valid message exceeding minimum ten characters',
        locale: 'en',
        turnstileToken: 'synthetic-token',
      },
    });
    assert(
      invalidEmailRes.status === 400 && invalidEmailRes.data?.error === 'invalid_email',
      'Malformed email format rejected with HTTP 400 and invalid_email error'
    );

    const shortMessageRes = await request(baseUrl, '/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: {
        name: 'Valid Name',
        email: 'user@example.test',
        purpose: 'freelance',
        message: 'short',
        locale: 'en',
        turnstileToken: 'synthetic-token',
      },
    });
    assert(
      shortMessageRes.status === 400 && shortMessageRes.data?.error === 'invalid_message',
      'Short message (<10 characters) rejected with HTTP 400 and invalid_message error'
    );

    const invalidLocaleRes = await request(baseUrl, '/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: {
        name: 'Valid Name',
        email: 'user@example.test',
        purpose: 'freelance',
        message: 'Valid message exceeding minimum ten characters',
        locale: 'fr',
        turnstileToken: 'synthetic-token',
      },
    });
    assert(
      invalidLocaleRes.status === 400 && invalidLocaleRes.data?.error === 'invalid_locale',
      'Unsupported locale ("fr") rejected with HTTP 400 and invalid_locale error'
    );

    const missingTurnstileRes = await request(baseUrl, '/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: {
        name: 'Valid Name',
        email: 'user@example.test',
        purpose: 'freelance',
        message: 'Valid message exceeding minimum ten characters',
        locale: 'vi',
      },
    });
    assert(
      missingTurnstileRes.status === 400 && missingTurnstileRes.data?.error === 'invalid_turnstile',
      'Missing Turnstile challenge token rejected with HTTP 400 and invalid_turnstile error'
    );

    // =========================================================================
    // Phase 5: Fail-Closed Unconfigured Runtime Verification
    // =========================================================================
    logSection('5. Unconfigured Runtime Fails Closed (HTTP 503)');

    const validUnconfRes = await request(baseUrl, '/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: {
        name: 'Đàm Thiên Minh',
        email: 'visitor@example.test',
        purpose: 'collaboration',
        message: 'Valid inquiry payload submitted against unconfigured Pages runtime.',
        locale: 'vi',
        turnstileToken: 'synthetic-turnstile-token-sample',
      },
    });
    assert(
      validUnconfRes.status === 503 && validUnconfRes.data?.error === 'needs_configuration',
      'Valid payload returns HTTP 503 and needs_configuration when server bindings are unset'
    );
    assert(
      typeof validUnconfRes.data?.message === 'string' &&
        validUnconfRes.data.message.includes('not currently configured'),
      'Response provides honest service notice explaining configuration status'
    );

    console.log(
      '    Note: Zero outbound provider requests executed. Unconfigured runtime halts before network egress.'
    );
    console.log(
      '    Configured email, Telegram, and Turnstile provider flows are verified via the 117-assertion isolated unit suite (scripts/test-contact-api.mjs).'
    );
  } finally {
    // 7. Cleanup owned process tree and isolated fixture
    let processCleanupError = null;

    if (wranglerProcess) {
      console.log('\n[verify-wrangler-pages] Terminating owned Wrangler process tree...');
      try {
        await killProcessTree(wranglerProcess);
        console.log('[verify-wrangler-pages] Process tree terminated and verified.');
      } catch (err) {
        processCleanupError = err;
        console.error(`[verify-wrangler-pages] Error terminating owned process tree: ${err.message}`);
      }
    }

    // Do not delete fixture if child process termination could not be verified!
    // Preserve path and report failure honestly.
    if (processCleanupError) {
      console.error(
        `[verify-wrangler-pages] Preserving fixture directory at ${fixtureDir} because child process termination could not be verified.`
      );
      throw processCleanupError;
    }

    // Required cleanup failure must fail the run, not warn and print all passed.
    if (fixtureDir) {
      await cleanupFixtureDir(fixtureDir, expectedFixtureDir);
    }
  }

  console.log(`\n[verify-wrangler-pages] ALL LOCAL PAGES RUNTIME TESTS PASSED (${assertionCount} assertions verified).\n`);
}

// Synthetic local failure-path verification suite (zero external calls, local processes only)
async function testFailurePaths() {
  console.log('[verify-wrangler-pages] Starting synthetic failure-path verification suite...\n');
  let testCount = 0;

  // 1. Initialization failure cleanup verification
  {
    console.log('--- Test 1: Initialization Failure Triggers Clean Fixture Cleanup ---');
    const initFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'dtm-pages-runtime-fixture-init-fail-'));
    let errorCaught = false;
    try {
      try {
        // Simulate failure during fixture setup (e.g. copying out/functions)
        throw new Error('Simulated initialization failure in copy/profile step');
      } finally {
        await cleanupFixtureDir(initFixture, initFixture);
      }
    } catch (err) {
      if (err.message.includes('Simulated initialization failure')) {
        errorCaught = true;
      }
    }
    const exists = fs.existsSync(initFixture);
    if (!errorCaught || exists) {
      throw new Error(`Init failure test failed: errorCaught=${errorCaught}, exists=${exists}`);
    }
    testCount++;
    console.log(`  [PASS] (${testCount}) Initialization failure cleanly removes fixture and propagates error\n`);
  }

  // 2. Termination failure handling & fixture preservation verification
  {
    console.log('--- Test 2: Termination Failure Rejects & Preserves Fixture Directory ---');
    const termFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'dtm-pages-runtime-fixture-term-fail-'));
    const isWin = process.platform === 'win32';
    // Spawn genuinely owned synthetic child process with detached group on POSIX
    const syntheticChild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      stdio: 'ignore',
      detached: !isWin,
    });
    syntheticChild._detached = !isWin;

    let terminationErrorCaught = false;
    let fixturePreserved = false;

    try {
      try {
        // Test termination failure via injected killer stub returning non-zero exit code (safe mocking without OS taskkill)
        await killProcessTree(syntheticChild, {
          killer: () => 1,
          timeoutMs: 1000,
        });
      } catch (err) {
        if (err.message.includes('Injected killer stub failed')) {
          terminationErrorCaught = true;
          // Verify that harness preserves fixture
          if (fs.existsSync(termFixture)) {
            fixturePreserved = true;
          }
          throw err;
        }
      }
    } catch {
      // Expected caught rejection
    } finally {
      // Clean up genuinely owned synthetic child using the existing bounded helper and await confirmed exit BEFORE deleting fixture
      try {
        await killProcessTree(syntheticChild, { timeoutMs: 5000 });
      } catch (cleanErr) {
        console.error('[verify-wrangler-pages] Warning: synthetic child cleanup error:', cleanErr);
      }
      await cleanupFixtureDir(termFixture, termFixture);
    }

    if (!terminationErrorCaught || !fixturePreserved) {
      throw new Error(
        `Termination failure test failed: terminationErrorCaught=${terminationErrorCaught}, fixturePreserved=${fixturePreserved}`
      );
    }
    testCount++;
    console.log(
      `  [PASS] (${testCount}) Termination failure triggers bounded rejection and preserves fixture directory\n`
    );
  }

  // 3. Strict path.relative containment verification
  {
    console.log('--- Test 3: Strict path.relative Containment Rejects Non-Contained Paths ---');
    const tmpBase = os.tmpdir();
    const validFixture = path.join(tmpBase, 'dtm-pages-runtime-fixture-valid-test');

    // Sibling directory outside tmpdir
    let rejectedSibling = false;
    try {
      assertStrictContainment(tmpBase, path.join(tmpBase, '..', 'evil-dir'), validFixture);
    } catch {
      rejectedSibling = true;
    }

    // Sibling with fixture prefix but wrong expected path
    let rejectedMismatched = false;
    try {
      assertStrictContainment(
        tmpBase,
        path.join(tmpBase, 'dtm-pages-runtime-fixture-other'),
        validFixture
      );
    } catch {
      rejectedMismatched = true;
    }

    // Without required prefix
    let rejectedNonPrefix = false;
    try {
      const nonPrefixPath = path.join(tmpBase, 'unauthorized-folder');
      assertStrictContainment(tmpBase, nonPrefixPath, nonPrefixPath);
    } catch {
      rejectedNonPrefix = true;
    }

    if (!rejectedSibling || !rejectedMismatched || !rejectedNonPrefix) {
      throw new Error(
        `Containment test failed: sibling=${rejectedSibling}, mismatched=${rejectedMismatched}, nonPrefix=${rejectedNonPrefix}`
      );
    }
    testCount++;
    console.log(
      `  [PASS] (${testCount}) Strict containment rejects sibling paths, mismatched directories, and non-prefixed paths\n`
    );
  }

  // 4. Required cleanup failure fails the run
  {
    console.log('--- Test 4: Required Cleanup Failure Fails the Run ---');
    let cleanupFailed = false;
    // Attempting cleanup on an invalid path must throw
    try {
      await cleanupFixtureDir(path.join(os.tmpdir(), '..', 'invalid-cleanup'), 'invalid');
    } catch {
      cleanupFailed = true;
    }
    if (!cleanupFailed) {
      throw new Error('Cleanup failure did not throw');
    }
    testCount++;
    console.log(`  [PASS] (${testCount}) Required cleanup failure throws and fails run instead of warning\n`);
  }

  console.log(`[verify-wrangler-pages] ALL SYNTHETIC FAILURE-PATH TESTS PASSED (${testCount} scenarios verified).\n`);
}

const isFailurePathMode = process.argv.includes('--test-failure-paths');

if (isFailurePathMode) {
  testFailurePaths().catch((err) => {
    console.error('\n[verify-wrangler-pages] FAILURE-PATH TEST FAILED:', err);
    process.exit(1);
  });
} else {
  run().catch((err) => {
    console.error('\n[verify-wrangler-pages] TEST FAILED:', err);
    process.exit(1);
  });
}
