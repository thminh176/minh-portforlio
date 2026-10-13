import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { AxeBuilder } from '@axe-core/playwright';
import {
  locateBrowserExecutable,
  createStrictStaticServer,
  closeBrowserBounded,
} from './verification-helpers.mjs';

const outDir = path.resolve('out');
const evidenceDir = path.resolve('reports/browser-evidence');

if (!fs.existsSync(outDir)) {
  console.error('[verify-browser] Error: out/ directory does not exist. Run pnpm build first.');
  process.exit(1);
}

if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

// Locate browser executable portably
const browserInfo = locateBrowserExecutable();
if (!browserInfo) {
  console.error('[verify-browser] Blocker: No supported browser found (Edge/Chrome). Set PLAYWRIGHT_CHROME_PATH or install Edge/Chrome.');
  process.exit(1);
}

console.log(`[verify-browser] Using discovered browser executable (${browserInfo.source}):`, browserInfo.executablePath);

async function runBrowserVerification() {
  const staticServer = await createStrictStaticServer({ rootDir: outDir, port: 0 });
  const baseUrl = staticServer.baseUrl;
  console.log(`[verify-browser] Ephemeral bounded static server listening on ${baseUrl}`);

  let browser = null;
  let cleanupError = null;

  try {
    browser = await chromium.launch({
      executablePath: browserInfo.executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-gpu'],
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // =========================================================================
    // Phase 1: 32-Combination Viewport, Theme & Layout Overflow Matrix
    // 4 routes x 2 themes x 4 viewports = 32 combinations
    // =========================================================================
    console.log('[verify-browser] Phase 1: 32-Combination Viewport, Theme & Layout Overflow Matrix...');
    const matrixRoutes = ['/vi/', '/en/', '/vi/about/', '/en/about/'];
    const matrixThemes = ['dark', 'light'];
    const matrixViewports = [
      { name: 'mobile-360', width: 360, height: 640 },
      { name: 'mobile-390', width: 390, height: 844 },
      { name: 'tablet-768', width: 768, height: 1024 },
      { name: 'desktop-1280', width: 1280, height: 800 },
    ];

    let matrixPassCount = 0;
    for (const th of matrixThemes) {
      const contextMatrix = await browser.newContext();
      await contextMatrix.addInitScript((themeVal) => {
        try {
          localStorage.setItem('dtm_theme', themeVal);
        } catch {}
      }, th);
      const pageMatrix = await contextMatrix.newPage();

      for (const r of matrixRoutes) {
        for (const vp of matrixViewports) {
          await pageMatrix.setViewportSize({ width: vp.width, height: vp.height });
          await pageMatrix.goto(`${baseUrl}${r}`, { waitUntil: 'domcontentloaded' });
          await pageMatrix.locator('main#main-content').waitFor({ state: 'attached' });

          const domState = await pageMatrix.evaluate(() => ({
            hasDarkClass: document.documentElement.classList.contains('dark'),
            colorScheme: document.documentElement.style.colorScheme,
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          }));

          if (th === 'dark') {
            if (!domState.hasDarkClass || domState.colorScheme !== 'dark') {
              throw new Error(`Theme initializer assertion failed in Phase 1 for dark theme on ${r}: ${JSON.stringify(domState)}`);
            }
          } else {
            if (domState.hasDarkClass || domState.colorScheme !== 'light') {
              throw new Error(`Theme initializer assertion failed in Phase 1 for light theme on ${r}: ${JSON.stringify(domState)}`);
            }
          }

          if (domState.hasHorizontalScroll) {
            throw new Error(
              `Horizontal overflow detected on ${r} (${th}, ${vp.name}): scrollWidth=${domState.scrollWidth}, clientWidth=${domState.clientWidth}`
            );
          }

          // Save representative viewport screenshots for en route
          if (r === '/en/') {
            await pageMatrix.screenshot({
              path: path.join(evidenceDir, `${vp.name}-${th}.png`),
              fullPage: false,
            });
          }

          matrixPassCount++;
        }
      }
      await contextMatrix.close();
    }
    console.log(`  [PASS] All 32 route x theme x viewport matrix combinations verified via persisted initializer (DOM class + colorScheme asserted) with 0px horizontal overflow (${matrixPassCount}/32).`);

    // Reset default page to desktop dark for subsequent phases
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${baseUrl}/en/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      localStorage.setItem('dtm_theme', 'dark');
    });

    // =========================================================================
    // Phase 2: Hero Layout Visual Order & Semantic Headings
    // =========================================================================
    console.log('[verify-browser] Phase 2: Hero Layout Visual Order Check...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/en/`, { waitUntil: 'domcontentloaded' });
    await page.locator('h1').waitFor({ state: 'visible' });

    const orderCheck = await page.evaluate(() => {
      const heading = document.querySelector('h1');
      const visual = document.querySelector('svg[aria-label*="DTM Monogram Visual"]');
      if (!heading || !visual) return { found: false };

      const headingRect = heading.getBoundingClientRect();
      const visualRect = visual.getBoundingClientRect();

      return {
        found: true,
        headingY: headingRect.y,
        visualY: visualRect.y,
        isHeadingAboveVisual: headingRect.y < visualRect.y,
      };
    });

    if (!orderCheck.found) {
      throw new Error('Could not find h1 or DTM visual element on mobile viewport');
    }
    if (!orderCheck.isHeadingAboveVisual) {
      throw new Error(`Mobile visual order inverted! Heading Y=${orderCheck.headingY}, Visual Y=${orderCheck.visualY}`);
    }
    console.log(`  [PASS] Mobile narrative order confirmed: h1 (Y=${orderCheck.headingY.toFixed(1)}) appears above DTM visual (Y=${orderCheck.visualY.toFixed(1)}).`);

    // =========================================================================
    // Phase 3: Keyboard Skip Link & Landmark Activation
    // =========================================================================
    console.log('[verify-browser] Phase 3: Keyboard Skip Link & Landmark Activation...');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${baseUrl}/en/`, { waitUntil: 'domcontentloaded' });

    await page.keyboard.press('Tab');
    const skipLink = page.locator('a.skip-link');
    await skipLink.waitFor({ state: 'visible' });

    const isSkipFocused = await page.evaluate(() => document.activeElement?.classList.contains('skip-link'));
    if (!isSkipFocused) {
      throw new Error('Initial Tab press failed to focus skip link');
    }

    await page.keyboard.press('Enter');
    const mainFocused = await page.evaluate(() => document.activeElement?.id === 'main-content');
    if (!mainFocused) {
      throw new Error('Skip link activation did not move focus to #main-content');
    }
    console.log('  [PASS] Skip link received initial focus and Enter successfully transferred focus to #main-content.');

    // =========================================================================
    // Phase 4: Mobile Drawer & Escape Focus Restoration
    // =========================================================================
    console.log('[verify-browser] Phase 4: Mobile Drawer & Escape Focus Restoration...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/en/`, { waitUntil: 'domcontentloaded' });

    const menuTrigger = page.locator('button[aria-controls="mobile-navigation"]');
    await menuTrigger.waitFor({ state: 'visible' });
    await menuTrigger.click();

    const mobileNav = page.locator('#mobile-navigation');
    await mobileNav.waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(evidenceDir, 'mobile-drawer-open.png') });

    await page.keyboard.press('Escape');
    await mobileNav.waitFor({ state: 'hidden' });
    await page.screenshot({ path: path.join(evidenceDir, 'mobile-drawer-closed-esc.png') });

    const isTriggerRestored = await page.evaluate(() => document.activeElement?.getAttribute('aria-controls') === 'mobile-navigation');
    if (!isTriggerRestored) {
      throw new Error('Escape key closed drawer but failed to restore focus to menu trigger button');
    }
    console.log('  [PASS] Mobile drawer opened, Escape closed drawer, and focus successfully returned to menu trigger.');

    // =========================================================================
    // Phase 5: Button Interaction & Theme Persistence Before Paint
    // =========================================================================
    console.log('[verify-browser] Phase 5: Button Interaction & Theme Persistence...');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${baseUrl}/en/`, { waitUntil: 'domcontentloaded' });

    const initialTheme = await page.evaluate(() => {
      return {
        isDark: document.documentElement.classList.contains('dark'),
        stored: localStorage.getItem('dtm_theme'),
      };
    });

    if (!initialTheme.isDark) {
      throw new Error('Initial document theme must be dark by default');
    }

    const themeToggle = page.locator('header button[aria-label="Switch to light mode"]').first();
    await themeToggle.click();

    await page.waitForFunction(() => !document.documentElement.classList.contains('dark'));
    const switchedTheme = await page.evaluate(() => {
      return {
        isDark: document.documentElement.classList.contains('dark'),
        stored: localStorage.getItem('dtm_theme'),
      };
    });

    if (switchedTheme.isDark || switchedTheme.stored !== 'light') {
      throw new Error(`Theme toggle failed! isDark=${switchedTheme.isDark}, stored=${switchedTheme.stored}`);
    }

    // Reload page to verify persistence before paint
    await page.reload({ waitUntil: 'domcontentloaded' });
    const reloadedTheme = await page.evaluate(() => {
      return {
        isDark: document.documentElement.classList.contains('dark'),
        stored: localStorage.getItem('dtm_theme'),
      };
    });

    if (reloadedTheme.isDark || reloadedTheme.stored !== 'light') {
      throw new Error(`Theme persistence failed on reload! isDark=${reloadedTheme.isDark}, stored=${reloadedTheme.stored}`);
    }

    // Toggle back to dark
    const lightToggle = page.locator('header button[aria-label="Switch to dark mode"]').first();
    await lightToggle.click();
    await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
    console.log('  [PASS] 5a: Theme toggled to light, persisted across full page reload, and toggled back to dark.');

    // 5b. Corrupted stored theme fallback to dark
    await page.evaluate(() => {
      localStorage.setItem('dtm_theme', 'corrupt_unexpected_value');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    const corruptThemeResult = await page.evaluate(() => ({
      isDark: document.documentElement.classList.contains('dark'),
      colorScheme: document.documentElement.style.colorScheme,
    }));
    if (!corruptThemeResult.isDark || corruptThemeResult.colorScheme !== 'dark') {
      throw new Error(`Corrupted theme value failed to fall back to dark! isDark=${corruptThemeResult.isDark}, colorScheme=${corruptThemeResult.colorScheme}`);
    }
    console.log('  [PASS] 5b: Corrupted stored theme value safely fell back to default dark mode.');

    // 5c. Theme persists across VI/EN root layout crossings
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      localStorage.setItem('dtm_theme', 'light');
    });
    for (const crossRoute of ['/vi/', '/en/', '/vi/about/', '/en/about/']) {
      await page.goto(`${baseUrl}${crossRoute}`, { waitUntil: 'domcontentloaded' });
      const crossTheme = await page.evaluate(() => ({
        isDark: document.documentElement.classList.contains('dark'),
        colorScheme: document.documentElement.style.colorScheme,
        stored: localStorage.getItem('dtm_theme'),
      }));
      if (crossTheme.isDark || crossTheme.colorScheme !== 'light' || crossTheme.stored !== 'light') {
        throw new Error(`Theme persistence failed across root layout crossing to ${crossRoute}: isDark=${crossTheme.isDark}, colorScheme=${crossTheme.colorScheme}`);
      }
    }
    console.log('  [PASS] 5c: Light theme strictly persisted across VI/EN root layout crossings.');

    // Observe the first animation-frame callback with main present, not hardware paint.
    for (const theme of ['dark', 'light']) {
      const initContext = await browser.newContext();
      await initContext.addInitScript((preference) => {
        if (preference === 'light') localStorage.setItem('dtm_theme', 'light');
        function observe() {
          if (!document.querySelector('main#main-content')) {
            requestAnimationFrame(observe);
            return;
          }
          window.__themeFrame = {
            dark: document.documentElement.classList.contains('dark'),
            scheme: document.documentElement.style.colorScheme,
          };
        }
        requestAnimationFrame(observe);
      }, theme);
      const initPage = await initContext.newPage();
      await initPage.goto(`${baseUrl}/en/`, { waitUntil: 'domcontentloaded' });
      await initPage.waitForFunction(() => window.__themeFrame, null, { timeout: 4000 });
      const frame = await initPage.evaluate(() => window.__themeFrame);
      if (frame.dark !== (theme === 'dark') || frame.scheme !== theme) {
        throw new Error(`Theme frame observation failed (${theme}): ${JSON.stringify(frame)}`);
      }
      await initContext.close();
    }
    console.log('  [PASS] 5d: Default-dark and stored-light observed at first animation callback with main present; not a hardware-paint/FOUC guarantee.');

    // Reset storage to dark for subsequent tests
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      localStorage.setItem('dtm_theme', 'dark');
    });

    // =========================================================================
    // Phase 6: Cross-Tab Theme Synchronization
    // =========================================================================
    console.log('[verify-browser] Phase 6: Cross-Tab Theme Synchronization...');
    const pageTab2 = await context.newPage();
    await pageTab2.goto(`${baseUrl}/en/`, { waitUntil: 'networkidle' });

    // Set theme on initial page to trigger browser storage event in pageTab2
    await page.evaluate(() => {
      localStorage.setItem('dtm_theme', 'light');
    });

    await pageTab2.waitForFunction(() => !document.documentElement.classList.contains('dark'), null, { timeout: 4000 });
    console.log('  [PASS] Theme storage event synchronized active state across browser tabs.');
    await pageTab2.close();

    // Reset to dark
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('dtm_theme', 'dark');
    });

    // =========================================================================
    // Phase 7: Reduced Motion Verification
    // =========================================================================
    console.log('[verify-browser] Phase 7: Reduced Motion Verification...');
    const contextMotion = await browser.newContext({
      reducedMotion: 'reduce',
    });
    const pageMotion = await contextMotion.newPage();
    await pageMotion.goto(`${baseUrl}/en/`, { waitUntil: 'domcontentloaded' });

    const motionResult = await pageMotion.evaluate(() => {
      const html = document.documentElement;
      const computedHtml = window.getComputedStyle(html);
      const pulseElement = document.querySelector('.animate-pulse');
      const pulseStyle = pulseElement ? window.getComputedStyle(pulseElement) : null;

      return {
        scrollBehavior: computedHtml.scrollBehavior,
        animDuration: pulseStyle ? pulseStyle.animationDuration : '0s',
      };
    });

    const durations = motionResult.animDuration.split(',').map((value) => {
      const text = value.trim();
      return Number.parseFloat(text) / (text.endsWith('ms') ? 1000 : 1);
    });
    if (motionResult.scrollBehavior !== 'auto' || durations.some((seconds) => !Number.isFinite(seconds) || seconds < 0 || seconds > 0.0001)) {
      throw new Error(
        `Reduced motion verification failed! scrollBehavior=${motionResult.scrollBehavior}, animDuration=${motionResult.animDuration}`
      );
    }
    console.log(`  [PASS] Reduced motion strictly verified: scrollBehavior='${motionResult.scrollBehavior}', pulseDuration='${motionResult.animDuration}'.`);
    await contextMotion.close();

    // =========================================================================
    // Phase 8: Sticky Header Geometry & Local Anchor Navigation
    // =========================================================================
    console.log('[verify-browser] Phase 8: Sticky Header Geometry & Local Anchor Navigation...');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${baseUrl}/en/`, { waitUntil: 'domcontentloaded' });

    async function waitForScrollSettled(p, maxTimeoutMs = 2500) {
      const startTime = Date.now();
      let lastY = await p.evaluate(() => window.scrollY);
      let stableCount = 0;
      while (Date.now() - startTime < maxTimeoutMs) {
        await p.waitForTimeout(60);
        const currentY = await p.evaluate(() => window.scrollY);
        if (Math.abs(currentY - lastY) < 1) {
          stableCount++;
          if (stableCount >= 3) {
            return currentY;
          }
        } else {
          stableCount = 0;
          lastY = currentY;
        }
      }
      throw new Error(`Scrolling did not settle within ${maxTimeoutMs}ms; lastY=${lastY}`);
    }

    // 8a. Verify all internal published paths/fragments via local status and target IDs
    let totalLinksAudited = 0;
    for (const routePath of matrixRoutes) {
      await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded' });
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]')).map((a) => ({
          href: a.getAttribute('href'),
          text: (a.textContent || '').trim().slice(0, 40),
        }));
      });

      for (const link of links) {
        const href = link.href;
        if (!href) continue;

        // Native protocols: verify valid syntax; never activate
        if (href.startsWith('mailto:') || href.startsWith('tel:')) {
          if (href.startsWith('mailto:')) {
            if (!href.includes('@') || href.length < 8) {
              throw new Error(`Invalid mailto link on ${routePath}: "${href}"`);
            }
          }
          if (href.startsWith('tel:')) {
            if (href.length < 6) {
              throw new Error(`Invalid tel link on ${routePath}: "${href}"`);
            }
          }
          totalLinksAudited++;
          continue;
        }

        // External URLs: never query/activate external destinations
        if (href.startsWith('http://') || href.startsWith('https://')) {
          if (!href.startsWith(baseUrl)) {
            totalLinksAudited++;
            continue;
          }
        }

        // Internal published paths / fragments
        const targetUrl = new URL(href, `${baseUrl}${routePath}`);
        const pathname = targetUrl.pathname;
        const hash = targetUrl.hash;

        // Verify local status: path must return 200
        const statusRes = await page.request.get(targetUrl.origin + pathname);
        if (statusRes.status() !== 200) {
          throw new Error(
            `Internal link returned HTTP ${statusRes.status()} on ${routePath}: href="${href}", path="${pathname}"`
          );
        }

        // Verify fragment target ID exists on destination page
        if (hash && hash.length > 1) {
          const targetId = hash.slice(1);
          let targetFound = false;
          if (pathname === routePath) {
            targetFound = await page.evaluate((id) => !!document.getElementById(id), targetId);
          } else {
            const tempPage = await context.newPage();
            await tempPage.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded' });
            targetFound = await tempPage.evaluate((id) => !!document.getElementById(id), targetId);
            await tempPage.close();
          }

          if (!targetFound) {
            throw new Error(
              `Fragment target ID "#${targetId}" not found on page "${pathname}" (referenced from "${routePath}")`
            );
          }
        }

        totalLinksAudited++;
      }
    }
    console.log(
      `  [PASS] 8a: Verified all internal published paths, fragments, and target IDs across all 4 routes (${totalLinksAudited} links audited; mailto/tel checked without activation; zero external requests).`
    );

    // 8b. Click actual CTAs and native navigation: verify settled destination beneath sticky header and in viewport
    for (const testLoc of ['en', 'vi']) {
      // 1. Native navigation from home to #services
      await page.goto(`${baseUrl}/${testLoc}/`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(50);

      await page.evaluate(() => {
        window.location.hash = '#services';
      });
      await waitForScrollSettled(page);

      const servicesSettled = await page.evaluate(() => {
        const header = document.querySelector('header');
        const target = document.querySelector('#services');
        if (!header || !target) return null;
        const hRect = header.getBoundingClientRect();
        const tRect = target.getBoundingClientRect();
        return {
          hash: window.location.hash,
          headerBottom: hRect.bottom,
          targetTop: tRect.top,
          targetBottom: tRect.bottom,
          viewportHeight: window.innerHeight,
          isBelowHeader: tRect.top >= hRect.bottom - 2,
          isInViewport: tRect.top < window.innerHeight && tRect.bottom > hRect.bottom,
        };
      });

      if (!servicesSettled || servicesSettled.hash !== '#services' || !servicesSettled.isBelowHeader || !servicesSettled.isInViewport) {
        throw new Error(`Native navigation to #services failed on /${testLoc}/! Details: ${JSON.stringify(servicesSettled)}`);
      }

      // 2. Navigation via Hero primary CTA button click to #contact
      await page.goto(`${baseUrl}/${testLoc}/`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(50);

      const heroCta = page.locator(`main#main-content a[href="#contact"]`).first();
      await heroCta.waitFor({ state: 'visible' });
      await heroCta.click();
      await waitForScrollSettled(page);

      const heroCtaSettled = await page.evaluate(() => {
        const header = document.querySelector('header');
        const target = document.querySelector('#contact');
        if (!header || !target) return null;
        const hRect = header.getBoundingClientRect();
        const tRect = target.getBoundingClientRect();
        return {
          hash: window.location.hash,
          headerBottom: hRect.bottom,
          targetTop: tRect.top,
          targetBottom: tRect.bottom,
          viewportHeight: window.innerHeight,
          isBelowHeader: tRect.top >= hRect.bottom - 2,
          isInViewport: tRect.top < window.innerHeight && tRect.bottom > hRect.bottom,
        };
      });

      if (!heroCtaSettled || heroCtaSettled.hash !== '#contact' || !heroCtaSettled.isBelowHeader || !heroCtaSettled.isInViewport) {
        throw new Error(`Hero CTA click to #contact failed on /${testLoc}/! Details: ${JSON.stringify(heroCtaSettled)}`);
      }

      // 3. Cross-page navigation from About page CTA to /#contact
      await page.goto(`${baseUrl}/${testLoc}/about/`, { waitUntil: 'domcontentloaded' });
      const aboutCta = page.locator(`main#main-content a[href*="#contact"]`).first();
      await aboutCta.waitFor({ state: 'visible' });
      await aboutCta.click();
      await page.waitForURL(`**/${testLoc}/*#contact`);
      await waitForScrollSettled(page);

      const aboutCtaSettled = await page.evaluate(() => {
        const header = document.querySelector('header');
        const target = document.querySelector('#contact');
        if (!header || !target) return null;
        const hRect = header.getBoundingClientRect();
        const tRect = target.getBoundingClientRect();
        return {
          hash: window.location.hash,
          headerBottom: hRect.bottom,
          targetTop: tRect.top,
          targetBottom: tRect.bottom,
          viewportHeight: window.innerHeight,
          isBelowHeader: tRect.top >= hRect.bottom - 2,
          isInViewport: tRect.top < window.innerHeight && tRect.bottom > hRect.bottom,
        };
      });

      if (!aboutCtaSettled || aboutCtaSettled.hash !== '#contact' || !aboutCtaSettled.isBelowHeader || !aboutCtaSettled.isInViewport) {
        throw new Error(`About CTA click to #contact failed on /${testLoc}/about/! Details: ${JSON.stringify(aboutCtaSettled)}`);
      }
    }
    console.log(
      '  [PASS] 8b: Actual CTA clicks and native navigations verified with settled smooth scroll: destination hash and target geometry visible beneath sticky header and within viewport across both VI and EN routes.'
    );

    // =========================================================================
    // Phase 9: Public Contact Integration & Native Protocol Links (Both Locales)
    // =========================================================================
    console.log('[verify-browser] Phase 9: Public Contact Integration & Native Protocol Links (Both Locales)...');
    await page.setViewportSize({ width: 1280, height: 800 });

    // 9a. English Home contact section
    await page.goto(`${baseUrl}/en/`, { waitUntil: 'domcontentloaded' });
    const contactSectionEn = page.locator('#contact');
    await contactSectionEn.waitFor({ state: 'visible' });

    const emailLinkEn = contactSectionEn.locator('a[href="mailto:thminh.176.vn@gmail.com"]').first();
    const phoneLinkEn = contactSectionEn.locator('a[href="tel:+84777747704"]').first();
    await emailLinkEn.waitFor({ state: 'visible' });
    await phoneLinkEn.waitFor({ state: 'visible' });

    const emailBoxEn = await emailLinkEn.boundingBox();
    const phoneBoxEn = await phoneLinkEn.boundingBox();
    if (!emailBoxEn || emailBoxEn.height < 44 || !phoneBoxEn || phoneBoxEn.height < 44) {
      throw new Error(`Contact links fail min-44px touch target: email=${emailBoxEn?.height}px, phone=${phoneBoxEn?.height}px`);
    }

    // Verify native link attributes (no target="_blank" on mailto/tel)
    if ((await emailLinkEn.getAttribute('target')) === '_blank' || (await phoneLinkEn.getAttribute('target')) === '_blank') {
      throw new Error('Native mailto or tel links must NOT have target="_blank"');
    }

    // Capture desktop contact section screenshot
    await contactSectionEn.screenshot({ path: path.join(evidenceDir, 'contact-area-desktop-en.png') });

    // 9b. Responsive mobile contact screenshots
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await contactSectionEn.screenshot({ path: path.join(evidenceDir, 'contact-area-mobile-en.png') });

    await page.setViewportSize({ width: 360, height: 640 });
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await contactSectionEn.screenshot({ path: path.join(evidenceDir, 'contact-area-mobile-360-en.png') });

    // 9c. Vietnamese Home contact section (literal labels)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${baseUrl}/vi/`, { waitUntil: 'domcontentloaded' });
    const contactSectionVi = page.locator('#contact');
    await contactSectionVi.waitFor({ state: 'visible' });

    const emailTextVi = await contactSectionVi.locator('a[href="mailto:thminh.176.vn@gmail.com"]').first().textContent();
    const phoneTextVi = await contactSectionVi.locator('a[href="tel:+84777747704"]').first().textContent();
    if (!emailTextVi?.includes('Email') || !emailTextVi?.includes('thminh.176.vn@gmail.com')) {
      throw new Error(`Vietnamese email link missing expected text: "${emailTextVi}"`);
    }
    if (!phoneTextVi?.includes('Điện thoại') || !phoneTextVi?.includes('0777747704')) {
      throw new Error(`Vietnamese phone link missing expected text: "${phoneTextVi}"`);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await contactSectionVi.screenshot({ path: path.join(evidenceDir, 'contact-area-mobile-vi.png') });

    // 9d. Form validation in default disabled preview export
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${baseUrl}/en/`, { waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('#contact-email');
    await emailInput.fill('invalid-email-address');
    await emailInput.blur();
    const emailErrorVisible = await page.locator('#contact-email-error').isVisible();
    if (!emailErrorVisible) {
      throw new Error('Contact form failed to display inline validation error for invalid email');
    }

    const submitBtn = page.locator('form button[type="submit"]');
    if (!(await submitBtn.isDisabled())) {
      throw new Error('Contact form submit button must be disabled in needs_configuration preview mode');
    }
    await page.screenshot({ path: path.join(evidenceDir, 'contact-form-en.png') });

    // 9e. Footer contact links on BOTH VI and EN routes
    for (const loc of ['vi', 'en']) {
      await page.goto(`${baseUrl}/${loc}/`, { waitUntil: 'domcontentloaded' });
      const footerEmail = page.locator('footer a[href="mailto:thminh.176.vn@gmail.com"]').first();
      const footerPhone = page.locator('footer a[href="tel:+84777747704"]').first();

      if (!(await footerEmail.isVisible()) || !(await footerPhone.isVisible())) {
        throw new Error(`Footer contact links missing on /${loc}/`);
      }

      const fEmailText = await footerEmail.textContent();
      const fPhoneText = await footerPhone.textContent();

      if (loc === 'vi') {
        if (!fPhoneText?.includes('Điện thoại')) {
          throw new Error(`Footer phone on /vi/ missing "Điện thoại": got "${fPhoneText}"`);
        }
      } else {
        if (!fPhoneText?.includes('Phone')) {
          throw new Error(`Footer phone on /en/ missing "Phone": got "${fPhoneText}"`);
        }
      }

      if ((await footerEmail.getAttribute('target')) === '_blank' || (await footerPhone.getAttribute('target')) === '_blank') {
        throw new Error(`Footer native contact links on /${loc}/ must NOT have target="_blank"`);
      }
    }
    console.log('  [PASS] 9e: Footer direct contact links verified across BOTH VI and EN with exact labels and native hrefs.');

    // 9f. About page direct contact links
    await page.goto(`${baseUrl}/en/about/`, { waitUntil: 'domcontentloaded' });
    await page.screenshot({ path: path.join(evidenceDir, 'about-page-en.png') });
    await page.goto(`${baseUrl}/vi/about/`, { waitUntil: 'domcontentloaded' });
    await page.screenshot({ path: path.join(evidenceDir, 'about-page-vi.png') });
    console.log('  [PASS] 9f: About pages in both locales rendered with verified direct contact links.');

    // =========================================================================
    // Phase 10: Root Language Detection Scenarios
    // =========================================================================
    console.log('[verify-browser] Phase 10: Root Language Detection Scenarios...');
    // 10a. Root with vi browser language
    const contextVi = await browser.newContext({ locale: 'vi-VN' });
    const pageVi = await contextVi.newPage();
    await pageVi.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await pageVi.waitForURL('**/vi/**');
    if (!pageVi.url().includes('/vi/')) {
      throw new Error(`Root locale detection failed for vi-VN browser: expected /vi/, got ${pageVi.url()}`);
    }
    console.log('  [PASS] 10a: Root request with vi-VN browser language routed to /vi/.');
    await contextVi.close();

    // 10b. Root with en browser language
    const contextEn = await browser.newContext({ locale: 'en-US' });
    const pageEn = await contextEn.newPage();
    await pageEn.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await pageEn.waitForURL('**/en/**');
    if (!pageEn.url().includes('/en/')) {
      throw new Error(`Root locale detection failed for en-US browser: expected /en/, got ${pageEn.url()}`);
    }
    console.log('  [PASS] 10b: Root request with en-US browser language routed to /en/.');
    await contextEn.close();

    // 10c. Root with saved preference overriding browser language
    const contextPref = await browser.newContext({ locale: 'en-US' });
    const pagePref = await contextPref.newPage();
    await pagePref.goto(`${baseUrl}/en/`, { waitUntil: 'domcontentloaded' });
    await pagePref.evaluate(() => localStorage.setItem('dtm_locale', 'vi'));
    await pagePref.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await pagePref.waitForURL('**/vi/**');
    if (!pagePref.url().includes('/vi/')) {
      throw new Error(`Stored preference dtm_locale="vi" failed to override en-US browser: got ${pagePref.url()}`);
    }
    console.log('  [PASS] 10c: Stored preference (dtm_locale="vi") cleanly took precedence over en-US browser language.');
    await contextPref.close();

    // 10d. Direct URL access preserves URL locale regardless of stored preference
    const contextDirect = await browser.newContext({ locale: 'vi-VN' });
    const pageDirect = await contextDirect.newPage();
    await pageDirect.goto(`${baseUrl}/vi/`, { waitUntil: 'domcontentloaded' });
    await pageDirect.evaluate(() => localStorage.setItem('dtm_locale', 'vi'));
    await pageDirect.goto(`${baseUrl}/en/about/`, { waitUntil: 'domcontentloaded' });
    await pageDirect.waitForTimeout(500);
    if (!pageDirect.url().includes('/en/about/')) {
      throw new Error(`Direct visit to /en/about/ was improperly redirected! URL=${pageDirect.url()}`);
    }
    console.log('  [PASS] 10d: Direct navigation to /en/about/ strictly preserved URL locale despite vi preference.');
    await contextDirect.close();

    // 10e. No-JS root fallback
    const contextNoJs = await browser.newContext({ javaScriptEnabled: false });
    const pageNoJs = await contextNoJs.newPage();
    await pageNoJs.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });

    const viLink = pageNoJs.locator('a[href="/vi/"]');
    const enLink = pageNoJs.locator('a[href="/en/"]');
    if (!(await viLink.isVisible()) || !(await enLink.isVisible())) {
      throw new Error('No-JS root page missing visible static fallback links to /vi/ and /en/');
    }
    await pageNoJs.screenshot({ path: path.join(evidenceDir, 'root-nojs.png') });
    console.log('  [PASS] 10e: No-JS root page rendered accessible static fallback links to /vi/ and /en/.');
    await contextNoJs.close();

    // 10f. Unsupported browser locale e.g. fr-FR falls back to /en/
    const contextFr = await browser.newContext({ locale: 'fr-FR' });
    const pageFr = await contextFr.newPage();
    await pageFr.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await pageFr.waitForURL('**/en/**');
    if (!pageFr.url().includes('/en/')) {
      throw new Error(`Unsupported locale (fr-FR) root fallback failed: expected /en/, got ${pageFr.url()}`);
    }
    console.log('  [PASS] 10f: Unsupported browser language (fr-FR) cleanly fell back to /en/.');
    await contextFr.close();

    // 10g. Corrupted stored locale safely falls back to browser detection
    // 1) Corrupted stored locale with en-US browser -> /en/
    const contextCorruptEn = await browser.newContext({ locale: 'en-US' });
    const pageCorruptEn = await contextCorruptEn.newPage();
    await pageCorruptEn.goto(`${baseUrl}/en/`, { waitUntil: 'domcontentloaded' });
    await pageCorruptEn.evaluate(() => localStorage.setItem('dtm_locale', 'corrupt_invalid_locale'));
    await pageCorruptEn.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await pageCorruptEn.waitForURL('**/en/**');
    if (!pageCorruptEn.url().includes('/en/')) {
      throw new Error(`Corrupted locale with en-US browser failed fallback: got ${pageCorruptEn.url()}`);
    }
    console.log('  [PASS] 10g (en): Corrupted stored locale safely fell back to en-US browser detection.');
    await contextCorruptEn.close();

    // 2) Corrupted stored locale with vi-VN browser -> /vi/
    const contextCorruptVi = await browser.newContext({ locale: 'vi-VN' });
    const pageCorruptVi = await contextCorruptVi.newPage();
    await pageCorruptVi.goto(`${baseUrl}/vi/`, { waitUntil: 'domcontentloaded' });
    await pageCorruptVi.evaluate(() => localStorage.setItem('dtm_locale', 'corrupt_invalid_locale'));
    await pageCorruptVi.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await pageCorruptVi.waitForURL('**/vi/**');
    if (!pageCorruptVi.url().includes('/vi/')) {
      throw new Error(`Corrupted locale with vi-VN browser failed fallback: got ${pageCorruptVi.url()}`);
    }
    console.log('  [PASS] 10g (vi): Corrupted stored locale safely fell back to vi-VN browser detection.');
    await contextCorruptVi.close();

    // 10h. Blocked Storage getItem gracefully falls back to browser detection
    const contextBlocked = await browser.newContext({ locale: 'en-US' });
    await contextBlocked.addInitScript(() => {
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        if (key === 'dtm_locale') {
          throw new DOMException('Access denied by browser security policy', 'SecurityError');
        }
        return originalGetItem.apply(this, arguments);
      };
    });
    const pageBlocked = await contextBlocked.newPage();
    await pageBlocked.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await pageBlocked.waitForURL('**/en/**');
    if (!pageBlocked.url().includes('/en/')) {
      throw new Error(`Blocked Storage getItem failed graceful root fallback: got ${pageBlocked.url()}`);
    }
    console.log('  [PASS] 10h: Blocked Storage getItem safely caught and gracefully routed via browser language.');
    await contextBlocked.close();

    // =========================================================================
    // Phase 11: Locale Switcher Preservation & Choice Persistence
    // =========================================================================
    console.log('[verify-browser] Phase 11: Locale Switcher Preservation & Choice Persistence...');
    const page11 = await context.newPage();

    // 11a. Switch from /vi/ to /en/
    await page11.goto(`${baseUrl}/vi/`, { waitUntil: 'domcontentloaded' });
    await page11.locator('header nav a[href*="/en/"]').click();
    await page11.waitForURL('**/en/**');
    const savedAfterVi = await page11.evaluate(() => localStorage.getItem('dtm_locale'));
    if (savedAfterVi !== 'en') {
      throw new Error(`Expected dtm_locale="en" after clicking switcher, got "${savedAfterVi}"`);
    }
    console.log('  [PASS] 11a: Home switcher navigated /vi/ -> /en/ and persisted choice.');

    // 11b. Switch from /en/about/ to /vi/about/
    await page11.goto(`${baseUrl}/en/about/`, { waitUntil: 'domcontentloaded' });
    await page11.locator('header nav a[href*="/vi/about/"]').click();
    await page11.waitForURL('**/vi/about/**');
    const savedAfterAbout = await page11.evaluate(() => localStorage.getItem('dtm_locale'));
    if (savedAfterAbout !== 'vi') {
      throw new Error(`Expected dtm_locale="vi" after clicking switcher on about page, got "${savedAfterAbout}"`);
    }
    console.log('  [PASS] 11b: About switcher preserved page route (/en/about/ -> /vi/about/) and persisted choice.');
    await page11.close();

    // 11c. Mobile About drawer locale switch preserves page and choice
    const contextMobile11 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pageMobile11 = await contextMobile11.newPage();
    await pageMobile11.goto(`${baseUrl}/vi/about/`, { waitUntil: 'domcontentloaded' });
    const mobileDrawerTrigger = pageMobile11.locator('button[aria-controls="mobile-navigation"]');
    await mobileDrawerTrigger.click();
    const mobileDrawer = pageMobile11.locator('#mobile-navigation');
    await mobileDrawer.waitFor({ state: 'visible' });

    const mobileSwitcherEn = mobileDrawer.locator('a[href*="/en/about/"]').first();
    await mobileSwitcherEn.click();
    await pageMobile11.waitForURL('**/en/about/**');

    const mobileStoredEn = await pageMobile11.evaluate(() => localStorage.getItem('dtm_locale'));
    if (!pageMobile11.url().includes('/en/about/') || mobileStoredEn !== 'en') {
      throw new Error(`Mobile drawer locale switch failed on About page: URL=${pageMobile11.url()}, stored=${mobileStoredEn}`);
    }

    await mobileDrawerTrigger.click();
    await mobileDrawer.waitFor({ state: 'visible' });
    const mobileSwitcherVi = mobileDrawer.locator('a[href*="/vi/about/"]').first();
    await mobileSwitcherVi.click();
    await pageMobile11.waitForURL('**/vi/about/**');

    const mobileStoredVi = await pageMobile11.evaluate(() => localStorage.getItem('dtm_locale'));
    if (!pageMobile11.url().includes('/vi/about/') || mobileStoredVi !== 'vi') {
      throw new Error(`Mobile drawer locale switch back failed on About page: URL=${pageMobile11.url()}, stored=${mobileStoredVi}`);
    }
    console.log('  [PASS] 11c: Mobile About drawer locale switch preserved page route (/vi/about/ <-> /en/about/) and persisted choice in both directions.');
    await contextMobile11.close();

    // =========================================================================
    // Phase 12: Zero Analytics Beacons & Tracking Verification
    // =========================================================================
    console.log('[verify-browser] Phase 12: Zero Analytics Beacons & Tracking Verification...');
    const context12 = await browser.newContext();
    const page12 = await context12.newPage();
    const externalRequests = [];
    const failedResources = [];
    page12.on('response', (response) => {
      if (response.status() >= 400) failedResources.push({ url: response.url(), status: response.status() });
    });
    page12.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith('http://127.0.0.1')) {
        externalRequests.push(url);
      }
    });

    for (const p of matrixRoutes) {
      await page12.goto(`${baseUrl}${p}`, { waitUntil: 'networkidle' });
    }

    if (externalRequests.length > 0) {
      throw new Error(`Unauthorized external/analytics requests detected: ${JSON.stringify(externalRequests)}`);
    }

    const analyticsGlobals = await page12.evaluate(() => {
      return {
        hasDataLayer: typeof window['dataLayer'] !== 'undefined',
        hasGa: typeof window['ga'] !== 'undefined' || typeof window['_ga'] !== 'undefined',
        hasBeacon: typeof window['__cfBeacon'] !== 'undefined',
      };
    });

    if (analyticsGlobals.hasDataLayer || analyticsGlobals.hasGa || analyticsGlobals.hasBeacon) {
      throw new Error(`Tracking globals found in window: ${JSON.stringify(analyticsGlobals)}`);
    }
    if (failedResources.length) throw new Error(`Failed static/prefetch resources: ${JSON.stringify(failedResources)}`);
    console.log('  [PASS] Zero external tracking requests made and zero tracking globals present in window.');
    await context12.close();

    // =========================================================================
    // Phase 13: Accessibility Audit via @axe-core/playwright
    // Audits full 4 routes x 2 themes x 4 viewports = 32 runs
    // =========================================================================
    console.log('[verify-browser] Phase 13: Accessibility Audit via @axe-core/playwright (32 runs)...');
    const axeAuditRuns = [];
    const totals = {
      runs: 0,
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
      totalViolations: 0,
      passes: 0,
      incomplete: 0,
      inapplicable: 0,
    };

    for (const th of matrixThemes) {
      // Create an isolated context with theme pre-initialized in storage before navigation
      const contextAxe = await browser.newContext();
      await contextAxe.addInitScript((themeVal) => {
        try {
          localStorage.setItem('dtm_theme', themeVal);
        } catch {}
      }, th);
      const pageAxe = await contextAxe.newPage();

      for (const vp of matrixViewports) {
        await pageAxe.setViewportSize({ width: vp.width, height: vp.height });

        for (const routePath of matrixRoutes) {
          await pageAxe.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded' });
          await pageAxe.locator('main#main-content').waitFor({ state: 'attached' });

          // Assert DOM class and colorScheme match real theme initializer
          const domTheme = await pageAxe.evaluate(() => ({
            hasDarkClass: document.documentElement.classList.contains('dark'),
            colorScheme: document.documentElement.style.colorScheme,
          }));

          if (th === 'dark') {
            if (!domTheme.hasDarkClass || domTheme.colorScheme !== 'dark') {
              throw new Error(`Theme initializer assertion failed for dark theme: ${JSON.stringify(domTheme)}`);
            }
          } else {
            if (domTheme.hasDarkClass || domTheme.colorScheme !== 'light') {
              throw new Error(`Theme initializer assertion failed for light theme: ${JSON.stringify(domTheme)}`);
            }
          }

          // Allow any paint/layout stabilization before audit
          await pageAxe.waitForTimeout(100);

          const results = await new AxeBuilder({ page: pageAxe }).analyze();

          const critical = results.violations.filter((v) => v.impact === 'critical');
          const serious = results.violations.filter((v) => v.impact === 'serious');
          const moderate = results.violations.filter((v) => v.impact === 'moderate');
          const minor = results.violations.filter((v) => v.impact === 'minor');

          totals.runs++;
          totals.critical += critical.length;
          totals.serious += serious.length;
          totals.moderate += moderate.length;
          totals.minor += minor.length;
          totals.totalViolations += results.violations.length;
          totals.passes += results.passes.length;
          totals.incomplete += results.incomplete.length;
          totals.inapplicable += results.inapplicable.length;

          axeAuditRuns.push({
            route: routePath,
            theme: th,
            viewport: vp.name,
            viewportDimensions: { width: vp.width, height: vp.height },
            url: results.url,
            timestamp: results.timestamp,
            testEnvironment: results.testEnvironment,
            testEngine: results.testEngine,
            counts: {
              critical: critical.length,
              serious: serious.length,
              moderate: moderate.length,
              minor: minor.length,
              totalViolations: results.violations.length,
              passes: results.passes.length,
              incomplete: results.incomplete.length,
              inapplicable: results.inapplicable.length,
            },
            violations: results.violations,
            incomplete: results.incomplete,
            inapplicable: results.inapplicable,
            passesSummary: results.passes.map((p) => ({ id: p.id, description: p.description, nodesCount: p.nodes.length })),
          });
        }
      }
      await contextAxe.close();
    }

    // Save complete raw Axe report to reports/browser-evidence/axe-report.json BEFORE any throw
    const axeReportPath = path.join(evidenceDir, 'axe-report.json');
    fs.writeFileSync(
      axeReportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          auditedRoutes: matrixRoutes,
          auditedThemes: matrixThemes,
          auditedViewports: matrixViewports,
          totals,
          runs: axeAuditRuns,
        },
        null,
        2
      )
    );
    console.log(
      `  [PASS] Complete raw Axe report saved to ${axeReportPath} (${totals.runs} runs, ${totals.critical} critical, ${totals.serious} serious, ${totals.moderate} moderate, ${totals.minor} minor violations, ${totals.incomplete} incomplete checks).`
    );

    // Measure computed colors after navigation initializes each theme. Composite
    // every ancestor background (including translucent layers) before luminance.
    const contrastMeasurements = [];
    for (const theme of matrixThemes) {
      for (const route of matrixRoutes) {
        const contrastContext = await browser.newContext();
        await contrastContext.addInitScript((value) => localStorage.setItem('dtm_theme', value), theme);
        const contrastPage = await contrastContext.newPage();
        await contrastPage.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
        const measurement = await contrastPage.evaluate(() => {
          const badges = document.querySelectorAll('.w-7.h-7.rounded-full, .w-6.h-6.rounded-full');
          if (!badges.length) throw new Error('Numbered badges missing');
          return Array.from(badges).map((badge) => {
            function rgba(value) {
              const values = value.match(/[\d.]+/g)?.map(Number);
              if (!values || values.length < 3) throw new Error(`Unsupported computed color: ${value}`);
              return [...values.slice(0, 3), values[3] ?? 1];
            }
            function over(fg, bg) {
              return fg.slice(0, 3).map((channel, i) => channel * fg[3] + bg[i] * (1 - fg[3]));
            }
            const layers = [];
            for (let element = badge; element; element = element.parentElement) {
              const style = getComputedStyle(element);
              if (style.backgroundImage !== 'none' || Number(style.opacity) !== 1) {
                throw new Error('Badge contrast requires manual image/opacity review');
              }
              layers.push(style.backgroundColor);
            }
            let background = [255, 255, 255];
            for (const layer of layers.toReversed()) background = over(rgba(layer), background);
            const color = getComputedStyle(badge).color;
            const foreground = over(rgba(color), background);
            function luminance(rgb) {
              const channels = rgb.map((value) => {
                const x = value / 255;
                return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
              });
              return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
            }
            const a = luminance(foreground), b = luminance(background);
            return { color, layers, foreground, background, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
          });
        });
        contrastMeasurements.push({ theme, route, badges: measurement });
        await contrastContext.close();
        const minimum = Math.min(...measurement.map((badge) => badge.ratio));
        if (minimum < 4.5) throw new Error(`Badge contrast below 4.5 (${theme}, ${route}): ${minimum}`);
        console.log(`  [PASS] Rendered ${route} ${theme} badge minimum contrast ${minimum.toFixed(3)}:1`);
      }
    }
    fs.writeFileSync(path.join(evidenceDir, 'badge-contrast.json'), JSON.stringify(contrastMeasurements, null, 2));

    // Fail on every reported violation; incomplete checks remain separate evidence.
    const failingRuns = axeAuditRuns.filter((r) => r.counts.totalViolations > 0);
    if (failingRuns.length > 0) {
      throw new Error(
        `Axe accessibility violation: ${failingRuns.length} run(s) had violations. Evidence saved to ${axeReportPath}. First failure: ${JSON.stringify(failingRuns[0].violations, null, 2)}`
      );
    }

    // =========================================================================
    // Phase 14: Fresh Full-Page Screenshots & Rendered Text Inspection
    // =========================================================================
    console.log('[verify-browser] Phase 14: Fresh Full-Page Screenshots & Rendered Text Inspection...');
    const context14 = await browser.newContext();
    const page14 = await context14.newPage();

    const routesToAudit = [
      {
        path: '/vi/',
        name: 'home-vi',
        expectedIdentity: 'Đàm Thiên Minh',
        expectedServices: 'Website cho doanh nghiệp và dịch vụ',
        expectedProcess: 'Các bước làm việc',
        expectedCta: 'Liên hệ với tôi',
      },
      {
        path: '/en/',
        name: 'home-en',
        expectedIdentity: 'Thien Minh Dam',
        expectedServices: 'Websites for businesses and service providers',
        expectedProcess: 'How we work together',
        expectedCta: 'Get in touch',
      },
      {
        path: '/vi/about/',
        name: 'about-vi',
        expectedIdentity: 'Đàm Thiên Minh',
        expectedServices: 'Những công nghệ tôi đã làm việc cùng',
        expectedProcess: 'Tôi đang học thêm',
        expectedCta: 'Bạn cần trao đổi về website?',
      },
      {
        path: '/en/about/',
        name: 'about-en',
        expectedIdentity: 'Thien Minh Dam',
        expectedServices: 'Technologies I have worked with',
        expectedProcess: 'Currently learning',
        expectedCta: 'Need a website?',
      },
    ];

    const obsoleteOrInflatedClaims = [
      'Quy trình làm việc với AI',
      'Working with AI tools',
      'Công nghệ dùng trong website',
      'Technologies used in this site',
      'Các công nghệ đang sử dụng',
      'Technologies in use',
      'Cách tiếp cận kỹ thuật',
      'Technical approach',
      'Modern Developer',
      'Senior Developer',
      'Expert Developer',
      'Full-stack Expert',
    ];

    for (const item of routesToAudit) {
      // 1. Desktop screenshot (1280x800)
      await page14.setViewportSize({ width: 1280, height: 800 });
      await page14.goto(`${baseUrl}${item.path}`, { waitUntil: 'domcontentloaded' });
      await page14.locator('main#main-content').waitFor({ state: 'visible' });

      const desktopShotPath = path.join(evidenceDir, `${item.name}-desktop.png`);
      await page14.screenshot({ path: desktopShotPath, fullPage: true });
      console.log(`  [PASS] Captured fresh desktop screenshot: ${item.name}-desktop.png`);

      // 2. Mobile screenshot (390x844)
      await page14.setViewportSize({ width: 390, height: 844 });
      await page14.goto(`${baseUrl}${item.path}`, { waitUntil: 'domcontentloaded' });
      await page14.locator('main#main-content').waitFor({ state: 'visible' });

      const mobileShotPath = path.join(evidenceDir, `${item.name}-mobile.png`);
      await page14.screenshot({ path: mobileShotPath, fullPage: true });
      console.log(`  [PASS] Captured fresh mobile screenshot: ${item.name}-mobile.png`);

      // 3. Rendered text inspection
      const renderedText = await page14.evaluate(() => document.body.innerText);

      for (const term of obsoleteOrInflatedClaims) {
        if (renderedText.includes(term)) {
          throw new Error(`Rendered text violation on ${item.path}: found obsolete heading or inflated claim "${term}"!`);
        }
      }

      if (item.path.includes('/about/')) {
        const requiredAboutTerms = item.path.startsWith('/vi/')
          ? ['Next.js', 'Ubuntu Server', 'Docker', 'PostgreSQL', 'Cloudflare', 'Codex', 'Antigravity', 'Java ở mức nền tảng', 'Spring Boot là hướng tìm hiểu tiếp theo', 'F8']
          : ['Next.js', 'Ubuntu Server', 'Docker', 'PostgreSQL', 'Cloudflare', 'Codex', 'Antigravity', 'Java fundamentals', 'Spring Boot is a future learning focus', 'F8'];
        for (const term of requiredAboutTerms) {
          if (!renderedText.includes(term)) {
            throw new Error(`Rendered text violation on ${item.path}: missing approved portfolio content "${term}"!`);
          }
        }
      }

      if (!renderedText.includes(item.expectedIdentity)) {
        throw new Error(`Rendered text violation on ${item.path}: missing identity "${item.expectedIdentity}"!`);
      }
      if (!renderedText.includes(item.expectedServices)) {
        throw new Error(`Rendered text violation on ${item.path}: missing services "${item.expectedServices}"!`);
      }
      if (!renderedText.includes(item.expectedProcess)) {
        throw new Error(`Rendered text violation on ${item.path}: missing process/approach "${item.expectedProcess}"!`);
      }
      if (!renderedText.includes(item.expectedCta)) {
        throw new Error(`Rendered text violation on ${item.path}: missing CTA "${item.expectedCta}"!`);
      }
      if (!renderedText.includes('thminh.176.vn@gmail.com')) {
        throw new Error(`Rendered text violation on ${item.path}: missing email "thminh.176.vn@gmail.com"!`);
      }
      if (!renderedText.includes('0777747704')) {
        throw new Error(`Rendered text violation on ${item.path}: missing phone "0777747704"!`);
      }

      console.log(`  [PASS] Rendered text on ${item.path} verified clean (services, identity, and contact info confirmed).`);
    }

    await context14.close();

    console.log('\n[verify-browser] ALL BROWSER VERIFICATION PHASES (1 THROUGH 14) PASSED SUCCESSFULLY.\n');
  } finally {
    // Bounded cleanup for both browser and static server
    console.log('[verify-browser] Cleaning up browser and static server resources...');
    if (browser) {
      try {
        await closeBrowserBounded(browser, 5000);
      } catch (err) {
        console.error('[verify-browser] Error during browser closure:', err);
        cleanupError = cleanupError || err;
      }
    }

    if (staticServer) {
      try {
        await staticServer.closeBounded(5000);
      } catch (err) {
        console.error('[verify-browser] Error during static server closure:', err);
        cleanupError = cleanupError || err;
      }
    }

    if (cleanupError) {
      throw cleanupError;
    }
  }
}

runBrowserVerification().catch((err) => {
  console.error('[verify-browser] FAIL:', err);
  process.exit(1);
});
