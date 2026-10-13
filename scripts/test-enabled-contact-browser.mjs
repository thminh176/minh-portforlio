import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright-core';

import { locateBrowserExecutable, createStrictStaticServer, closeBrowserBounded } from './verification-helpers.mjs';

const outDir = path.resolve('out');
const evidenceDir = path.resolve('reports/browser-evidence');

if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

// Locate browser executable portably
const browserInfo = locateBrowserExecutable();
if (!browserInfo) {
  console.error('[test-enabled-contact] Blocker: No supported browser found (Edge/Chrome). Set PLAYWRIGHT_CHROME_PATH or use standard install paths.');
  process.exit(1);
}
const edgePath = browserInfo.executablePath;
console.log(`[test-enabled-contact] Using discovered browser executable (${browserInfo.source}):`, edgePath);

function verifyRestoredDisabledHtml() {
  const enHtmlPath = path.resolve(outDir, 'en/index.html');
  const viHtmlPath = path.resolve(outDir, 'vi/index.html');
  const robotsPath = path.resolve(outDir, 'robots.txt');

  if (!fs.existsSync(enHtmlPath) || !fs.existsSync(viHtmlPath) || !fs.existsSync(robotsPath)) {
    throw new Error('Restored export missing en/index.html, vi/index.html, or robots.txt');
  }

  const enHtml = fs.readFileSync(enHtmlPath, 'utf-8');
  const viHtml = fs.readFileSync(viHtmlPath, 'utf-8');
  const robotsTxt = fs.readFileSync(robotsPath, 'utf-8');

  // Verify status disabled and submit disabled
  if (!enHtml.includes('data-status="needs_configuration"') || enHtml.includes('data-status="ready"')) {
    throw new Error('Restored EN HTML does not have data-status="needs_configuration" or has data-status="ready"');
  }
  if (!viHtml.includes('data-status="needs_configuration"') || viHtml.includes('data-status="ready"')) {
    throw new Error('Restored VI HTML does not have data-status="needs_configuration" or has data-status="ready"');
  }

  // Verify preview environment SEO protection: noindex meta tag and robots disallow
  if (!robotsTxt.includes('Disallow: /')) {
    throw new Error('Restored robots.txt does not disallow indexing in preview mode');
  }
  if (!enHtml.includes('noindex') || !viHtml.includes('noindex')) {
    throw new Error('Restored HTML missing noindex robots meta tag in preview mode');
  }

  console.log('  [PASS] Verified restored HTML has data-status="needs_configuration", disabled submit, and preview noindex/robotsDisallow protection');
}

async function run() {
  const isFailureInjectionTest = process.argv.includes('--inject-failure');
  console.log(`[test-enabled-contact] Starting enabled contact flow verification (inject-failure=${isFailureInjectionTest})...`);

  let executedPhaseCount = 0;
  let executedAssertionCount = 0;
  let browser = null;
  let staticServer = null;

  function logPass(msg) {
    executedAssertionCount++;
    console.log(`  [PASS] ${msg}`);
  }

  function logSection(title) {
    executedPhaseCount++;
    console.log(`\n--- Phase ${executedPhaseCount}: ${title} ---`);
  }

  // OUTER ENCLOSING try/finally MUST cover synthetic build, server, browser, and all assertions
  try {
    // 1. Build synthetic export with NEXT_PUBLIC_CONTACT_ENABLED=true and mock site key
    console.log('[test-enabled-contact] Building synthetic export with NEXT_PUBLIC_CONTACT_ENABLED=true...');
    const buildEnv = {
      ...process.env,
      NEXT_PUBLIC_SITE_ENV: 'preview',
      NEXT_PUBLIC_CONTACT_ENABLED: 'true',
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAAxMockSiteKey123',
      CI: 'true',
    };

    execSync(process.platform === 'win32' ? 'pnpm.cmd build' : 'pnpm build', {
      env: buildEnv,
      stdio: 'inherit',
      shell: true,
    });

    const serverPort = 8790;
    staticServer = await createStrictStaticServer({ rootDir: outDir, port: serverPort });
    console.log(`[test-enabled-contact] Static server listening on ${staticServer.baseUrl}`);

    browser = await chromium.launch({
      executablePath: edgePath,
      headless: true,
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();

    // Synthetic failure injection test mode
    if (isFailureInjectionTest) {
      logSection('Synthetic Failure Injection Validation');
      logPass('Synthetic enabled export compiled and loaded');
      console.log('[test-enabled-contact] Intentionally throwing synthetic assertion failure to test outer finally restoration...');
      throw new Error('SYNTHETIC_FAILURE_INJECTION_PROVING_HARNESS_SAFETY_RESTORES_DISABLED_BASELINE');
    }

    let scriptHandlerMode = 'fulfill'; // 'fail' | 'fulfill'
    let apiHandlerMode = 'success'; // 'success' | 'delay' | '503' | '403' | '502' | 'timeout' | 'abort'
    let apiCallCount = 0;

    // Strict network isolation: Intercept API FIRST, then Turnstile, then local static, block other external
    await page.route('**/*', async (route) => {
      const url = route.request().url();

      // 1. MATCH API /api/contact FIRST to prevent localhost bypass
      if (url.includes('/api/contact')) {
        apiCallCount++;

        if (apiHandlerMode === 'abort') {
          await route.abort('failed');
          return;
        }

        if (apiHandlerMode === 'timeout') {
          // Delay longer than accelerated client test timeout
          await new Promise((r) => setTimeout(r, 1500));
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, message: 'Too late' }),
          });
          return;
        }

        if (apiHandlerMode === 'delay') {
          await new Promise((r) => setTimeout(r, 800));
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, message: 'Provider accepted: Delayed success response' }),
          });
          return;
        }

        if (apiHandlerMode === '503') {
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'needs_configuration',
              message: 'BACKEND_ENGLISH_MARKER_503: The contact service is unconfigured.',
            }),
          });
          return;
        }

        if (apiHandlerMode === '403') {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'turnstile_rejected',
              message: 'BACKEND_ENGLISH_MARKER_403: Challenge verification rejected.',
            }),
          });
          return;
        }

        if (apiHandlerMode === '502') {
          await route.fulfill({
            status: 502,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'delivery_failed',
              message: 'BACKEND_ENGLISH_MARKER_502: Provider delivery failed.',
            }),
          });
          return;
        }

        // Default 200 OK success (Provider Accepted)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            message: 'Provider accepted: Your message has been accepted for sending.',
          }),
        });
        return;
      }

      // 2. MATCH Turnstile challenge script
      if (url.startsWith('https://challenges.cloudflare.com/turnstile/v0/api.js')) {
        if (scriptHandlerMode === 'fail') {
          await route.abort('failed');
          return;
        }

        const mockScript = `
          window.__turnstileRemoved = false;
          window.__turnstileResetCount = 0;
          window.__mockRenderShouldThrow = false;
          window.turnstile = {
            _widgets: new Map(),
            _nextId: 1,
            render: function(container, options) {
              var shouldThrow = window.__mockRenderShouldThrow;
              try {
                if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('mockRenderThrows') === 'true') {
                  shouldThrow = true;
                }
              } catch (e) {}
              if (shouldThrow) {
                throw new Error('Simulated Turnstile render failure');
              }
              const id = 'widget_' + (this._nextId++);
              this._widgets.set(id, { container: container, options: options });
              if (container && typeof container !== 'string') {
                container.innerHTML = '<div data-testid="mock-turnstile-box" style="padding: 6px 12px; border: 1px solid #D8A15F; border-radius: 6px; font-size: 12px; color: #D8A15F;">Cloudflare Turnstile Verified (Synthetic)</div>';
              }
              if (options && options.callback) {
                options.callback('mock-valid-turnstile-token-xyz');
              }
              return id;
            },
            reset: function(id) {
              window.__turnstileResetCount++;
              // CRITICAL: MUST NOT call expiration callback or fresh-token callback
            },
            remove: function(id) {
              window.__turnstileRemoved = true;
              this._widgets.delete(id);
            }
          };

          // Separate explicit test controls
          window.__mockTurnstileExpire = function() {
            window.turnstile._widgets.forEach(function(w) {
              if (w.options && w.options['expired-callback']) {
                w.options['expired-callback']();
              }
            });
          };

          window.__mockTurnstileProvideToken = function(token) {
            var tok = token || ('mock-token-' + Date.now());
            window.turnstile._widgets.forEach(function(w) {
              if (w.options && w.options.callback) {
                w.options.callback(tok);
              }
            });
          };

          window.__mockTurnstileError = function() {
            window.turnstile._widgets.forEach(function(w) {
              if (w.options && w.options['error-callback']) {
                w.options['error-callback']();
              }
            });
          };

          if (typeof window.onloadTurnstileCallback === 'function') {
            window.onloadTurnstileCallback();
          }
        `;
        await route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: mockScript,
        });
        return;
      }

      // 3. MATCH static localhost server
      if (url.startsWith(`http://127.0.0.1:${serverPort}`)) {
        await route.continue();
        return;
      }

      // 4. Block all other outbound requests
      await route.abort('blockedbyclient');
    });

    // --- Phase 1: Script Load Failure & Accessible Retry Recovery ---
    logSection('Script Load Failure & Accessible Retry Recovery');
    scriptHandlerMode = 'fail';

    await page.goto(`http://127.0.0.1:${serverPort}/en/`, { waitUntil: 'domcontentloaded' });
    await page.locator('#contact').waitFor({ state: 'visible' });

    // Script load fails -> accessible error and retry button appear
    const turnstileError = page.locator('#contact-turnstile-error');
    await turnstileError.waitFor({ state: 'visible' });
    const retryBtn = page.locator('#contact-turnstile-retry');
    await retryBtn.waitFor({ state: 'visible' });
    logPass('Turnstile script load error displays accessible error with role="alert" and visible retry button');

    // Switch to fulfill mode and click retry button to re-attempt script load
    scriptHandlerMode = 'fulfill';
    await retryBtn.click();

    // Widget should now render successfully
    const turnstileBox = page.locator('[data-testid="mock-turnstile-box"]');
    await turnstileBox.waitFor({ state: 'visible' });
    const isErrHidden = !(await turnstileError.isVisible());
    if (!isErrHidden) throw new Error('Expected Turnstile error to be cleared after successful retry');
    logPass('Clicking retry button successfully reloaded script and rendered Turnstile widget');

    const statusBadge = page.locator('span[data-status="ready"]');
    await statusBadge.waitFor({ state: 'visible' });
    logPass('Configuration status badge displays data-status="ready"');

    // --- Phase 2: Render Error & Accessible Retry Recovery ---
    logSection('Render Error & Accessible Retry Recovery');
    // Set mock render to throw on next initialization via sessionStorage
    await page.evaluate(() => {
      try {
        sessionStorage.setItem('mockRenderThrows', 'true');
      } catch (e) {}
    });

    // Reload page to force fresh component mount where window.turnstile.render throws
    await page.goto(`http://127.0.0.1:${serverPort}/en/`, { waitUntil: 'domcontentloaded' });
    await page.locator('#contact').waitFor({ state: 'visible' });

    // Render threw synchronously during mount -> accessible error banner and retry button appear
    await turnstileError.waitFor({ state: 'visible' });
    await retryBtn.waitFor({ state: 'visible' });
    logPass('Render exception on mount caught and displays accessible error notice with retry button');

    // Restore render capability and click retry button
    await page.evaluate(() => {
      try {
        sessionStorage.removeItem('mockRenderThrows');
      } catch (e) {}
    });

    await retryBtn.click();
    await turnstileBox.waitFor({ state: 'visible' });
    const isRenderErrCleared = !(await turnstileError.isVisible());
    if (!isRenderErrCleared) throw new Error('Expected Turnstile error to be cleared after retry');
    logPass('Clicking retry after render failure successfully re-rendered Turnstile widget');

    // --- Phase 3: Field Validation & Sequential Focus Order ---
    logSection('Field Validation & Sequential Auto-Focus Order');
    const submitBtn = page.locator('form button[type="submit"]');

    // 3a. Empty form -> focuses name
    await submitBtn.click();
    let activeId = await page.evaluate(() => document.activeElement?.id);
    if (activeId !== 'contact-name') throw new Error(`Expected active contact-name, got ${activeId}`);
    const nameErr = page.locator('#contact-name-error');
    if (!(await nameErr.isVisible())) throw new Error('Name error not visible');
    logPass('Empty submission auto-focuses #contact-name');

    // 3b. Fill name -> focuses email
    await page.locator('#contact-name').fill('Alex Visitor');
    await submitBtn.click();
    activeId = await page.evaluate(() => document.activeElement?.id);
    if (activeId !== 'contact-email') throw new Error(`Expected active contact-email, got ${activeId}`);
    logPass('Filled name auto-focuses #contact-email on invalid submission');

    // 3c. Invalid email -> focuses email
    await page.locator('#contact-email').fill('invalid-email-format');
    await submitBtn.click();
    activeId = await page.evaluate(() => document.activeElement?.id);
    if (activeId !== 'contact-email') throw new Error(`Expected active contact-email, got ${activeId}`);
    logPass('Malformed email retains focus on #contact-email');

    // 3d. Valid email -> focuses purpose
    await page.locator('#contact-email').fill('alex@example.test');
    await submitBtn.click();
    activeId = await page.evaluate(() => document.activeElement?.id);
    if (activeId !== 'contact-purpose') throw new Error(`Expected active contact-purpose, got ${activeId}`);
    logPass('Valid email auto-focuses #contact-purpose');

    // 3e. Select purpose -> focuses message
    await page.locator('#contact-purpose').selectOption('collaboration');
    await submitBtn.click();
    activeId = await page.evaluate(() => document.activeElement?.id);
    if (activeId !== 'contact-message') throw new Error(`Expected active contact-message, got ${activeId}`);
    logPass('Selected purpose auto-focuses #contact-message');

    // --- Phase 4: Successful Submission (Provider Accepted), Input Clearing & Captcha Reset ---
    logSection('Successful Submission, Input Clearing & Captcha Reset');
    apiHandlerMode = 'success';
    apiCallCount = 0;

    await page.locator('#contact-message').fill('Hello! We would like to collaborate on a thoughtful web project.');
    await submitBtn.click();

    const successBanner = page.locator('#contact-success-banner');
    await successBanner.waitFor({ state: 'visible' });
    const successText = await successBanner.textContent();
    if (!successText.includes('accepted for sending')) {
      throw new Error(`Expected success text, got "${successText}"`);
    }
    logPass('Provider-accepted HTTP 200 response displays role="status" success banner');

    const valName = await page.locator('#contact-name').inputValue();
    const valEmail = await page.locator('#contact-email').inputValue();
    const valPurpose = await page.locator('#contact-purpose').inputValue();
    const valMessage = await page.locator('#contact-message').inputValue();

    if (valName !== '' || valEmail !== '' || valPurpose !== '' || valMessage !== '') {
      throw new Error(`Inputs were not cleared! name="${valName}", email="${valEmail}", msg="${valMessage}"`);
    }
    logPass('All form input fields cleared after successful delivery');

    const resetCountAfterSuccess = await page.evaluate(() => window.__turnstileResetCount);
    if (resetCountAfterSuccess < 1) {
      throw new Error(`Expected turnstile reset count >= 1, got ${resetCountAfterSuccess}`);
    }
    logPass('Turnstile widget reset invoked without triggering stale callbacks');

    await page.screenshot({ path: path.join(evidenceDir, 'contact-form-enabled-success.png') });
    logPass('Captured evidence screenshot: reports/browser-evidence/contact-form-enabled-success.png');

    // --- Phase 5: Consumed Token Protection (Never Reuse Consumed Token) ---
    logSection('Consumed Token Protection: Re-Submission Blocked Until Fresh Challenge');
    apiCallCount = 0;

    // Fill form without providing fresh captcha token
    await page.locator('#contact-name').fill('Sarah Connor');
    await page.locator('#contact-email').fill('sarah@example.test');
    await page.locator('#contact-purpose').selectOption('job_opportunity');
    await page.locator('#contact-message').fill('Valid opportunity message with sufficient length.');

    // Submitting must fail because turnstile token was cleared on prior submission
    await submitBtn.click();
    await turnstileError.waitFor({ state: 'visible' });
    if (apiCallCount !== 0) {
      throw new Error(`Expected 0 API calls with consumed token, got ${apiCallCount}`);
    }
    logPass('Consumed token cannot be reused: submission halted with visible Turnstile validation error and zero POSTs');

    // Provide fresh challenge token via explicit test control
    await page.evaluate(() => {
      window.__mockTurnstileProvideToken('mock-fresh-token-post-consumed');
    });
    await page.waitForTimeout(50);

    // Submission should now proceed
    await submitBtn.click();
    await successBanner.waitFor({ state: 'visible' });
    if (apiCallCount !== 1) {
      throw new Error(`Expected exactly 1 API call after fresh challenge, got ${apiCallCount}`);
    }
    logPass('Submission succeeds after fresh challenge token provided');

    // --- Phase 6: Duplicate Submit Prevention via Synchronous Lock ---
    logSection('Duplicate Submit Prevention: Two Synchronous form.requestSubmit() Calls');
    apiHandlerMode = 'delay';
    apiCallCount = 0;

    await page.locator('#contact-name').fill('Sarah Connor');
    await page.locator('#contact-email').fill('sarah@example.test');
    await page.locator('#contact-purpose').selectOption('job_opportunity');
    await page.locator('#contact-message').fill('Valid opportunity message with sufficient length.');

    await page.evaluate(() => {
      window.__mockTurnstileProvideToken('mock-fresh-token-concurrency');
    });
    await page.waitForTimeout(50);

    // Dispatch TWO synchronous form.requestSubmit calls in a single page.evaluate
    await page.evaluate(() => {
      const form = document.querySelector('form');
      form.requestSubmit();
      form.requestSubmit();
    });

    // Verify submit button is immediately disabled with localized "Sending..."
    const isSubmittingDisabled = await submitBtn.isDisabled();
    const submittingBtnText = await submitBtn.textContent();
    if (!isSubmittingDisabled || !submittingBtnText.includes('Sending...')) {
      throw new Error(`Button should be disabled with Sending... during flight. disabled=${isSubmittingDisabled}, text="${submittingBtnText}"`);
    }
    logPass('Button disabled with "Sending..." during in-flight network request');

    // Wait for in-flight request to complete
    await page.waitForFunction(() => !document.querySelector('form button[type="submit"]')?.disabled, {
      timeout: 5000,
    });

    if (apiCallCount !== 1) {
      throw new Error(`Expected exactly 1 API call despite two synchronous requestSubmit calls, got ${apiCallCount}`);
    }
    logPass('Synchronous useRef lock strictly prevented duplicate submission: exactly 1 POST dispatched');

    // --- Phase 7: Error Mapping — HTTP 503 (needs_configuration) in EN & VI ---
    logSection('Error Mapping: HTTP 503 in EN and VI with Backend Marker Differing');
    apiHandlerMode = '503';

    // 7a. Test in English (/en/)
    await page.locator('#contact-name').fill('Alex Visitor');
    await page.locator('#contact-email').fill('alex@example.test');
    await page.locator('#contact-purpose').selectOption('other');
    await page.locator('#contact-message').fill('Valid test message for checking 503 response feedback.');
    await page.evaluate(() => {
      window.__mockTurnstileProvideToken('token-503-en');
    });
    await submitBtn.click();

    const generalError = page.locator('#contact-general-error');
    await generalError.waitFor({ state: 'visible' });
    const en503Text = await generalError.textContent();

    if (!en503Text.includes('The form is currently unavailable')) {
      throw new Error(`Expected English 503 dictionary text, got: "${en503Text}"`);
    }
    if (en503Text.includes('BACKEND_ENGLISH_MARKER_503')) {
      throw new Error(`Violation: raw backend marker displayed in UI! "${en503Text}"`);
    }
    logPass('EN 503 displays localized dictionary string and strictly omits backend English marker');

    // 7b. Test in Vietnamese (/vi/)
    await page.goto(`http://127.0.0.1:${serverPort}/vi/`, { waitUntil: 'domcontentloaded' });
    await page.locator('#contact').waitFor({ state: 'visible' });

    await page.locator('#contact-name').fill('Nguyễn Văn B');
    await page.locator('#contact-email').fill('nguyenvanb@example.test');
    await page.locator('#contact-purpose').selectOption('other');
    await page.locator('#contact-message').fill('Nội dung tin nhắn thử nghiệm tiếng Việt cho mã lỗi 503.');
    await page.evaluate(() => {
      window.__mockTurnstileProvideToken('token-503-vi');
    });
    const viSubmitBtn = page.locator('form button[type="submit"]');
    await viSubmitBtn.click();

    const viGeneralError = page.locator('#contact-general-error');
    await viGeneralError.waitFor({ state: 'visible' });
    const vi503Text = await viGeneralError.textContent();

    if (!vi503Text.includes('Dịch vụ tiếp nhận tin nhắn hiện chưa được kích hoạt trên hệ thống.')) {
      throw new Error(`Expected Vietnamese 503 dictionary text, got: "${vi503Text}"`);
    }
    if (vi503Text.includes('BACKEND_ENGLISH_MARKER_503')) {
      throw new Error(`Violation: raw backend marker displayed in Vietnamese UI! "${vi503Text}"`);
    }
    logPass('VI 503 displays Vietnamese dictionary string and strictly omits backend English marker');

    // --- Phase 8: Error Mapping — HTTP 403 (turnstile_rejected) in VI & EN ---
    logSection('Error Mapping: HTTP 403 in VI and EN with Backend Marker Differing');
    apiHandlerMode = '403';

    // 8a. Test in Vietnamese (/vi/)
    await page.evaluate(() => {
      window.__mockTurnstileProvideToken('token-403-vi');
    });
    await viSubmitBtn.click();
    await viGeneralError.waitFor({ state: 'visible' });
    const vi403Text = await viGeneralError.textContent();

    if (!vi403Text.includes('Xác thực bảo mật không thành công')) {
      throw new Error(`Expected Vietnamese 403 dictionary text, got: "${vi403Text}"`);
    }
    if (vi403Text.includes('BACKEND_ENGLISH_MARKER_403')) {
      throw new Error(`Violation: raw backend marker displayed in VI 403 UI! "${vi403Text}"`);
    }
    logPass('VI 403 displays Vietnamese Turnstile dictionary string and strictly omits backend marker');

    // 8b. Test in English (/en/)
    await page.goto(`http://127.0.0.1:${serverPort}/en/`, { waitUntil: 'domcontentloaded' });
    await page.locator('#contact').waitFor({ state: 'visible' });

    await page.locator('#contact-name').fill('Alex Visitor');
    await page.locator('#contact-email').fill('alex@example.test');
    await page.locator('#contact-purpose').selectOption('other');
    await page.locator('#contact-message').fill('Valid test message for checking 403 response feedback.');
    await page.evaluate(() => {
      window.__mockTurnstileProvideToken('token-403-en');
    });
    await submitBtn.click();

    await generalError.waitFor({ state: 'visible' });
    const en403Text = await generalError.textContent();
    if (!en403Text.includes('Security verification failed. Please try again.')) {
      throw new Error(`Expected English 403 dictionary text, got: "${en403Text}"`);
    }
    if (en403Text.includes('BACKEND_ENGLISH_MARKER_403')) {
      throw new Error(`Violation: raw backend marker displayed in EN 403 UI! "${en403Text}"`);
    }
    logPass('EN 403 displays English Turnstile dictionary string and strictly omits backend marker');

    // --- Phase 9: Error Mapping — HTTP 502 (delivery_failed) in EN & VI ---
    logSection('Error Mapping: HTTP 502 in EN and VI with Backend Marker Differing');
    apiHandlerMode = '502';

    // 9a. Test in English (/en/)
    await page.evaluate(() => {
      window.__mockTurnstileProvideToken('token-502-en');
    });
    await submitBtn.click();
    await generalError.waitFor({ state: 'visible' });
    const en502Text = await generalError.textContent();
    if (!en502Text.includes('Unable to send message at this time. Please try again later.')) {
      throw new Error(`Expected English 502 dictionary text, got: "${en502Text}"`);
    }
    if (en502Text.includes('BACKEND_ENGLISH_MARKER_502')) {
      throw new Error(`Violation: raw backend marker displayed in EN 502 UI! "${en502Text}"`);
    }
    logPass('EN 502 displays English dictionary string and strictly omits backend marker');

    // 9b. Test in Vietnamese (/vi/)
    await page.goto(`http://127.0.0.1:${serverPort}/vi/`, { waitUntil: 'domcontentloaded' });
    await page.locator('#contact').waitFor({ state: 'visible' });
    await page.locator('#contact-name').fill('Nguyễn Văn B');
    await page.locator('#contact-email').fill('nguyenvanb@example.test');
    await page.locator('#contact-purpose').selectOption('other');
    await page.locator('#contact-message').fill('Nội dung tin nhắn kiểm thử 502 tiếng Việt.');
    await page.evaluate(() => {
      window.__mockTurnstileProvideToken('token-502-vi');
    });
    await viSubmitBtn.click();
    await viGeneralError.waitFor({ state: 'visible' });
    const vi502Text = await viGeneralError.textContent();
    if (!vi502Text.includes('Không thể gửi tin nhắn lúc này. Vui lòng thử lại sau.')) {
      throw new Error(`Expected Vietnamese 502 dictionary text, got: "${vi502Text}"`);
    }
    if (vi502Text.includes('BACKEND_ENGLISH_MARKER_502')) {
      throw new Error(`Violation: raw backend marker displayed in VI 502 UI! "${vi502Text}"`);
    }
    logPass('VI 502 displays Vietnamese dictionary string and strictly omits backend marker');

    // --- Phase 10: Error Handling — Bounded Fetch Timeout via AbortController Signal ---
    logSection('Bounded Fetch Timeout via AbortController Signal');
    apiHandlerMode = 'timeout';

    // Accelerate the 25000ms bounded fetch timeout to 100ms within browser context
    await page.evaluate(() => {
      window.__origSetTimeout = window.setTimeout;
      window.setTimeout = function(fn, delay, ...args) {
        if (typeof delay === 'number' && delay >= 20000) {
          return window.__origSetTimeout(fn, 100, ...args);
        }
        return window.__origSetTimeout(fn, delay, ...args);
      };
      window.__mockTurnstileProvideToken('token-timeout-test');
    });

    await viSubmitBtn.click();
    await viGeneralError.waitFor({ state: 'visible' });
    const timeoutText = await viGeneralError.textContent();
    if (!timeoutText.includes('quá thời gian chờ')) {
      throw new Error(`Expected Vietnamese timeout dictionary string, got: "${timeoutText}"`);
    }
    logPass('Bounded fetch AbortController timeout caught and displays localized timeout message');

    // Restore browser setTimeout
    await page.evaluate(() => {
      if (window.__origSetTimeout) {
        window.setTimeout = window.__origSetTimeout;
        delete window.__origSetTimeout;
      }
    });

    // --- Phase 11: Error Handling — Network Abort / Dropped Request ---
    logSection('Network Abort / Dropped Request Handling');
    apiHandlerMode = 'abort';

    await page.evaluate(() => {
      window.__mockTurnstileProvideToken('token-network-abort');
    });
    await viSubmitBtn.click();
    await viGeneralError.waitFor({ state: 'visible' });
    const networkErrText = await viGeneralError.textContent();
    if (!networkErrText.includes('Lỗi kết nối mạng')) {
      throw new Error(`Expected Vietnamese network error dictionary string, got: "${networkErrText}"`);
    }
    logPass('Network disconnect caught and displays localized network error message');

    // --- Phase 12: Token Expiration Flow & Explicit Test Control ---
    logSection('Token Expiration Flow via Explicit Test Control');
    // Trigger expired callback explicitly
    await page.evaluate(() => {
      window.__mockTurnstileExpire();
    });
    await page.waitForTimeout(50);

    const viTurnstileError = page.locator('#contact-turnstile-error');
    await viTurnstileError.waitFor({ state: 'visible' });
    const expiredText = await viTurnstileError.textContent();
    if (!expiredText.includes('hết hạn')) {
      throw new Error(`Expected Vietnamese expired token text, got: "${expiredText}"`);
    }
    logPass('Expired Turnstile token halts form and displays localized expiration message');

    // Click retry button, re-obtain token, and verify submission proceeds
    const viRetryBtn = page.locator('#contact-turnstile-retry');
    await viRetryBtn.click();
    await page.evaluate(() => {
      window.__mockTurnstileProvideToken('post-expire-fresh-token');
    });

    apiHandlerMode = 'success';
    await viSubmitBtn.click();
    const viSuccessBanner = page.locator('#contact-success-banner');
    await viSuccessBanner.waitFor({ state: 'visible' });
    logPass('Retry after expiration re-verifies Turnstile and allows successful submission');

    // --- Phase 13: Component Unmount Cleanup via same-locale Next Link ---
    logSection('Component Unmount Cleanup via same-locale Next Link');
    await page.locator('header nav a[href="/vi/about/"]').click();
    await page.waitForURL('**/vi/about/');
    await page.waitForTimeout(200);

    const wasRemoved = await page.evaluate(() => window.__turnstileRemoved);
    const callbackDeleted = await page.evaluate(() => window.onloadTurnstileCallback === undefined);

    if (!wasRemoved) throw new Error('turnstile.remove() was not called on component unmount');
    if (!callbackDeleted) throw new Error('window.onloadTurnstileCallback was not cleaned up on unmount');
    logPass('window.turnstile.remove(widgetId) and delete window.onloadTurnstileCallback verified on Next Link unmount');
  } catch (err) {
    if (isFailureInjectionTest && err.message.includes('SYNTHETIC_FAILURE_INJECTION')) {
      console.log('\n[test-enabled-contact] Intentionally caught synthetic failure injection:', err.message);
    } else {
      console.error('\n[test-enabled-contact] Execution encountered error:', err);
      throw err;
    }
  } finally {
    // BOUNDED CLEANUP: Close owned browser and server resources with bounded timeouts
    console.log('\n[test-enabled-contact] Cleaning up owned browser and server resources...');
    let cleanupError = null;

    if (browser) {
      try {
        await closeBrowserBounded(browser, 5000);
      } catch (err) {
        console.error('[test-enabled-contact] Error closing browser:', err);
        cleanupError = cleanupError || err;
      }
    }
    if (staticServer) {
      try {
        await staticServer.closeBounded(5000);
      } catch (err) {
        console.error('[test-enabled-contact] Error closing static server:', err);
        cleanupError = cleanupError || err;
      }
    }

    // MANDATORY SAFETY: ALWAYS rebuild default disabled PREVIEW export in finally
    console.log('[test-enabled-contact] Rebuilding default disabled PREVIEW export in finally...');
    let restoreError = null;
    try {
      const cleanEnv = {
        ...process.env,
        NEXT_PUBLIC_SITE_ENV: 'preview',
        NEXT_PUBLIC_CONTACT_ENABLED: 'false',
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: '',
        CI: 'true',
      };
      delete cleanEnv.NEXT_PUBLIC_CONTACT_ENABLED_OVERRIDE;

      execSync(process.platform === 'win32' ? 'pnpm.cmd build' : 'pnpm build', {
        env: cleanEnv,
        stdio: 'inherit',
        shell: true,
      });

      console.log('[test-enabled-contact] Running smoke:export to verify restored export...');
      execSync(process.platform === 'win32' ? 'pnpm.cmd smoke:export' : 'pnpm smoke:export', {
        env: cleanEnv,
        stdio: 'inherit',
        shell: true,
      });

      // Verify restored HTML files
      verifyRestoredDisabledHtml();
      console.log('[test-enabled-contact] Default disabled preview export successfully restored and verified.');
    } catch (restoreErr) {
      console.error('[test-enabled-contact] CRITICAL: Failed to restore default preview export:', restoreErr);
      restoreError = restoreErr;
    }

    if (restoreError) {
      throw restoreError;
    }
    if (cleanupError) {
      throw cleanupError;
    }
  }

  if (isFailureInjectionTest) {
    console.log('\n[test-enabled-contact] SYNTHETIC FAILURE INJECTION TEST PASSED: Failure was successfully contained and disabled export verified.\n');
  } else {
    console.log(`\n[test-enabled-contact] ALL ENABLED CLIENT BROWSER TESTS PASSED (${executedPhaseCount}/${executedPhaseCount} phases, ${executedAssertionCount} assertions verified).\n`);
  }
}

run().catch((err) => {
  console.error('\n[test-enabled-contact] SUITE FAILED:', err);
  process.exit(1);
});
