import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('out');

console.log('[smoke:export] Validating static export at:', outDir);

if (!fs.existsSync(outDir)) {
  console.error('[smoke:export] FAIL: out directory does not exist.');
  process.exit(1);
}

const requiredFiles = [
  'index.html',
  'vi/index.html',
  'en/index.html',
  'vi/about/index.html',
  'en/about/index.html',
  'robots.txt',
  'sitemap.xml',
  '_routes.json',
];

const missingFiles = [];
for (const relPath of requiredFiles) {
  const fullPath = path.join(outDir, relPath);
  if (!fs.existsSync(fullPath)) {
    missingFiles.push(relPath);
  } else {
    const stats = fs.statSync(fullPath);
    if (stats.size === 0) {
      console.error(`[smoke:export] FAIL: ${relPath} is empty (0 bytes).`);
      process.exit(1);
    }
  }
}

if (missingFiles.length > 0) {
  console.error('[smoke:export] FAIL: Missing static files:', missingFiles);
  process.exit(1);
}

// 1. Root page checks
const rootHtml = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
if (!rootHtml.includes('DTM')) {
  console.error('[smoke:export] FAIL: root index.html does not contain DTM monogram.');
  process.exit(1);
}
if (!rootHtml.includes('/vi/') || !rootHtml.includes('/en/')) {
  console.error('[smoke:export] FAIL: root index.html missing fallback links to /vi/ and /en/.');
  process.exit(1);
}
if (!rootHtml.includes('<noscript>')) {
  console.error('[smoke:export] FAIL: root index.html missing noscript fallback.');
  process.exit(1);
}

// 2. Vietnamese home page checks
const viHtml = fs.readFileSync(path.join(outDir, 'vi/index.html'), 'utf8');
if (!viHtml.includes('<html lang="vi"')) {
  console.error('[smoke:export] FAIL: vi/index.html missing native static <html lang="vi"> attribute.');
  process.exit(1);
}
if (!viHtml.includes('Đàm Thiên Minh')) {
  console.error('[smoke:export] FAIL: vi/index.html missing Vietnamese name.');
  process.exit(1);
}
if (!viHtml.includes('/vi/about/')) {
  console.error('[smoke:export] FAIL: vi/index.html missing /vi/about/ link.');
  process.exit(1);
}
if (!viHtml.includes('skip-link') || !viHtml.includes('#main-content')) {
  console.error('[smoke:export] FAIL: vi/index.html missing accessible skip link or main landmark.');
  process.exit(1);
}
if (!viHtml.includes('dtm_theme')) {
  console.error('[smoke:export] FAIL: vi/index.html missing synchronous pre-paint theme script.');
  process.exit(1);
}
if (!viHtml.includes('DTM Monogram Visual')) {
  console.error('[smoke:export] FAIL: vi/index.html missing DTM SVG monogram visual.');
  process.exit(1);
}
if (!viHtml.includes('data-status="needs_configuration"')) {
  console.error('[smoke:export] FAIL: vi/index.html missing data-status="needs_configuration".');
  process.exit(1);
}
if (!viHtml.includes('Biểu mẫu hiện chưa nhận tin nhắn.')) {
  console.error('[smoke:export] FAIL: vi/index.html missing simplified honest contact notice.');
  process.exit(1);
}
if (!viHtml.includes('rel="canonical"') || !viHtml.includes('href="https://damthienminh.id.vn/vi/"')) {
  console.error('[smoke:export] FAIL: vi/index.html missing canonical URL https://damthienminh.id.vn/vi/.');
  process.exit(1);
}
// Vietnamese contact assertions (exact owner values and native links)
if (!viHtml.includes('href="mailto:thminh.176.vn@gmail.com"') || !viHtml.includes('thminh.176.vn@gmail.com')) {
  console.error('[smoke:export] FAIL: vi/index.html missing authorized mailto link or email text.');
  process.exit(1);
}
if (!viHtml.includes('href="tel:+84777747704"') || !viHtml.includes('0777747704')) {
  console.error('[smoke:export] FAIL: vi/index.html missing authorized tel link or phone text.');
  process.exit(1);
}
if (!viHtml.includes('Điện thoại')) {
  console.error('[smoke:export] FAIL: vi/index.html missing literal Vietnamese label "Điện thoại".');
  process.exit(1);
}

// 3. English home page checks
const enHtml = fs.readFileSync(path.join(outDir, 'en/index.html'), 'utf8');
if (!enHtml.includes('<html lang="en"')) {
  console.error('[smoke:export] FAIL: en/index.html missing native static <html lang="en"> attribute.');
  process.exit(1);
}
if (!enHtml.includes('Thien Minh Dam')) {
  console.error('[smoke:export] FAIL: en/index.html missing English name.');
  process.exit(1);
}
if (!enHtml.includes('/en/about/')) {
  console.error('[smoke:export] FAIL: en/index.html missing /en/about/ link.');
  process.exit(1);
}
if (!enHtml.includes('skip-link') || !enHtml.includes('#main-content')) {
  console.error('[smoke:export] FAIL: en/index.html missing accessible skip link or main landmark.');
  process.exit(1);
}
if (!enHtml.includes('dtm_theme')) {
  console.error('[smoke:export] FAIL: en/index.html missing synchronous pre-paint theme script.');
  process.exit(1);
}
if (!enHtml.includes('data-status="needs_configuration"')) {
  console.error('[smoke:export] FAIL: en/index.html missing data-status="needs_configuration".');
  process.exit(1);
}
if (!enHtml.includes('The form is not enabled yet. No message is sent.')) {
  console.error('[smoke:export] FAIL: en/index.html missing simplified honest contact notice.');
  process.exit(1);
}
if (!enHtml.includes('rel="canonical"') || !enHtml.includes('href="https://damthienminh.id.vn/en/"')) {
  console.error('[smoke:export] FAIL: en/index.html missing canonical URL https://damthienminh.id.vn/en/.');
  process.exit(1);
}
// English contact assertions (exact owner values and native links)
if (!enHtml.includes('href="mailto:thminh.176.vn@gmail.com"') || !enHtml.includes('thminh.176.vn@gmail.com')) {
  console.error('[smoke:export] FAIL: en/index.html missing authorized mailto link or email text.');
  process.exit(1);
}
if (!enHtml.includes('href="tel:+84777747704"') || !enHtml.includes('0777747704')) {
  console.error('[smoke:export] FAIL: en/index.html missing authorized tel link or phone text.');
  process.exit(1);
}
if (!enHtml.includes('Phone')) {
  console.error('[smoke:export] FAIL: en/index.html missing literal English label "Phone".');
  process.exit(1);
}

// 4. Vietnamese About page checks
const viAboutHtml = fs.readFileSync(path.join(outDir, 'vi/about/index.html'), 'utf8');
if (!viAboutHtml.includes('<html lang="vi"')) {
  console.error('[smoke:export] FAIL: vi/about/index.html missing native static <html lang="vi"> attribute.');
  process.exit(1);
}
if (!viAboutHtml.includes('Giới thiệu về Đàm Thiên Minh')) {
  console.error('[smoke:export] FAIL: vi/about/index.html missing Vietnamese about title.');
  process.exit(1);
}
if (!viAboutHtml.includes('rel="canonical"') || !viAboutHtml.includes('href="https://damthienminh.id.vn/vi/about/"')) {
  console.error('[smoke:export] FAIL: vi/about/index.html missing canonical URL https://damthienminh.id.vn/vi/about/.');
  process.exit(1);
}
if (!viAboutHtml.includes('href="mailto:thminh.176.vn@gmail.com"') || !viAboutHtml.includes('href="tel:+84777747704"')) {
  console.error('[smoke:export] FAIL: vi/about/index.html missing contact links in About page.');
  process.exit(1);
}

// 5. English About page checks
const enAboutHtml = fs.readFileSync(path.join(outDir, 'en/about/index.html'), 'utf8');
if (!enAboutHtml.includes('<html lang="en"')) {
  console.error('[smoke:export] FAIL: en/about/index.html missing native static <html lang="en"> attribute.');
  process.exit(1);
}
if (!enAboutHtml.includes('About Thien Minh Dam')) {
  console.error('[smoke:export] FAIL: en/about/index.html missing English about title.');
  process.exit(1);
}
if (!enAboutHtml.includes('rel="canonical"') || !enAboutHtml.includes('href="https://damthienminh.id.vn/en/about/"')) {
  console.error('[smoke:export] FAIL: en/about/index.html missing canonical URL https://damthienminh.id.vn/en/about/.');
  process.exit(1);
}
if (!enAboutHtml.includes('href="mailto:thminh.176.vn@gmail.com"') || !enAboutHtml.includes('href="tel:+84777747704"')) {
  console.error('[smoke:export] FAIL: en/about/index.html missing contact links in About page.');
  process.exit(1);
}


// 6. Reciprocal hreflang checks on all 4 published routes
const localizedPages = [
  { name: 'vi/index.html', html: viHtml, viHref: 'https://damthienminh.id.vn/vi/', enHref: 'https://damthienminh.id.vn/en/' },
  { name: 'en/index.html', html: enHtml, viHref: 'https://damthienminh.id.vn/vi/', enHref: 'https://damthienminh.id.vn/en/' },
  { name: 'vi/about/index.html', html: viAboutHtml, viHref: 'https://damthienminh.id.vn/vi/about/', enHref: 'https://damthienminh.id.vn/en/about/' },
  { name: 'en/about/index.html', html: enAboutHtml, viHref: 'https://damthienminh.id.vn/vi/about/', enHref: 'https://damthienminh.id.vn/en/about/' },
];

for (const { name, html, viHref, enHref } of localizedPages) {
  if (!html.includes(`hrefLang="vi" href="${viHref}"`) && !html.includes(`hreflang="vi" href="${viHref}"`)) {
    console.error(`[smoke:export] FAIL: ${name} missing reciprocal hreflang="vi" for ${viHref}.`);
    process.exit(1);
  }
  if (!html.includes(`hrefLang="en" href="${enHref}"`) && !html.includes(`hreflang="en" href="${enHref}"`)) {
    console.error(`[smoke:export] FAIL: ${name} missing reciprocal hreflang="en" for ${enHref}.`);
    process.exit(1);
  }
}

// 7. Preview noindex check (default when NEXT_PUBLIC_SITE_ENV !== 'production')
const isProduction = process.env.NEXT_PUBLIC_SITE_ENV === 'production';
for (const { name, html } of localizedPages) {
  if (!isProduction) {
    if (!html.includes('content="noindex, nofollow"')) {
      console.error(`[smoke:export] FAIL: ${name} missing preview default noindex, nofollow directive.`);
      process.exit(1);
    }
  } else {
    if (!html.includes('content="index, follow"')) {
      console.error(`[smoke:export] FAIL: ${name} missing production index, follow directive.`);
      process.exit(1);
    }
  }
}

// 8. Robots.txt checks
const robotsTxt = fs.readFileSync(path.join(outDir, 'robots.txt'), 'utf8');
if (!isProduction) {
  if (!robotsTxt.includes('Disallow: /')) {
    console.error('[smoke:export] FAIL: preview robots.txt must disallow all indexing.');
    process.exit(1);
  }
} else {
  if (!robotsTxt.includes('Allow: /') || !robotsTxt.includes('https://damthienminh.id.vn/sitemap.xml')) {
    console.error('[smoke:export] FAIL: production robots.txt missing Allow or sitemap reference.');
    process.exit(1);
  }
}

// 9. Sitemap.xml checks (strictly the 4 published routes)
const sitemapXml = fs.readFileSync(path.join(outDir, 'sitemap.xml'), 'utf8');
const expectedSitemapUrls = [
  'https://damthienminh.id.vn/vi/',
  'https://damthienminh.id.vn/en/',
  'https://damthienminh.id.vn/vi/about/',
  'https://damthienminh.id.vn/en/about/',
];

for (const url of expectedSitemapUrls) {
  if (!sitemapXml.includes(`<loc>${url}</loc>`)) {
    console.error(`[smoke:export] FAIL: sitemap.xml missing published URL ${url}.`);
    process.exit(1);
  }
}

// Count occurrences of <loc> in sitemap.xml
const locMatches = sitemapXml.match(/<loc>/g) || [];
if (locMatches.length !== 4) {
  console.error(`[smoke:export] FAIL: sitemap.xml has ${locMatches.length} URLs; strictly 4 expected.`);
  process.exit(1);
}

// 10. Truthful JSON-LD checks
for (const { name, html } of [localizedPages[0], localizedPages[1]]) {
  if (!html.includes('application/ld+json')) {
    console.error(`[smoke:export] FAIL: ${name} missing JSON-LD structured data.`);
    process.exit(1);
  }
  if (!html.includes('"@type":"WebSite"') || !html.includes('"@type":"Person"')) {
    console.error(`[smoke:export] FAIL: ${name} missing WebSite or Person Schema.org type.`);
    process.exit(1);
  }
  // Check for forbidden invented organizational/employment claims
  if (html.includes('"jobTitle"') || html.includes('"worksFor"') || html.includes('"alumniOf"')) {
    console.error(`[smoke:export] FAIL: ${name} contains unverified employment/organization claims in JSON-LD.`);
    process.exit(1);
  }
}

// 11. Zero tracking beacons or analytics scripts
const allHtmlFiles = [rootHtml, viHtml, enHtml, viAboutHtml, enAboutHtml];
const trackingIndicators = ['googletagmanager', 'google-analytics', 'static.cloudflareinsights.com', 'beacon.min.js'];
for (const html of allHtmlFiles) {
  for (const indicator of trackingIndicators) {
    if (html.toLowerCase().includes(indicator)) {
      console.error(`[smoke:export] FAIL: Public HTML contains unauthorized tracking indicator "${indicator}".`);
      process.exit(1);
    }
  }
  if (html.includes('href="https://example.') || html.includes('href="http://example.')) {
    console.error('[smoke:export] FAIL: Public HTML contains example.com placeholder links.');
    process.exit(1);
  }
  if (html.toLowerCase().includes('lorem ipsum')) {
    console.error('[smoke:export] FAIL: Public HTML contains lorem ipsum placeholder text.');
    process.exit(1);
  }
  // Ensure no unverified Zalo account or link is published
  if (html.includes('zalo.me') || html.includes('href="https://zalo') || html.includes('href="http://zalo')) {
    console.error('[smoke:export] FAIL: Public HTML contains unverified Zalo link.');
    process.exit(1);
  }
  // Ensure native mailto and tel links never have target="_blank"
  const nativeTargetBlankRegex = /<a\s+[^>]*href="(?:mailto|tel):[^"]*"[^>]*target="_blank"|<a\s+[^>]*target="_blank"[^>]*href="(?:mailto|tel):[^"]*"/i;
  if (nativeTargetBlankRegex.test(html)) {
    console.error('[smoke:export] FAIL: Public HTML contains native mailto: or tel: link with target="_blank".');
    process.exit(1);
  }
}


// 11b. Verify presence of website services and engagement process in exported HTML
if (!viHtml.includes('Dịch vụ làm website') || !viHtml.includes('Các bước làm việc')) {
  console.error('[smoke:export] FAIL: vi/index.html missing website services or engagement process sections.');
  process.exit(1);
}
if (!enHtml.includes('Website services') || !enHtml.includes('How we work together')) {
  console.error('[smoke:export] FAIL: en/index.html missing website services or engagement process sections.');
  process.exit(1);
}

// 11c. Reject obsolete headings and inflated positioning; confirmed experience
// and ongoing learning are intentionally described on the About pages.
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
for (const { name, html } of localizedPages) {
  for (const term of obsoleteOrInflatedClaims) {
    if (html.includes(term)) {
      console.error(`[smoke:export] FAIL: ${name} contains obsolete heading or inflated claim "${term}".`);
      process.exit(1);
    }
  }
}
for (const [name, html, requiredTerms] of [
  ['vi/about/index.html', viAboutHtml, ['Những công nghệ tôi đã làm việc cùng', 'Next.js', 'Ubuntu Server', 'Docker', 'PostgreSQL', 'Cloudflare', 'Codex', 'Antigravity', 'Java ở mức nền tảng', 'Spring Boot là hướng tìm hiểu tiếp theo', 'F8']],
  ['en/about/index.html', enAboutHtml, ['Technologies I have worked with', 'Next.js', 'Ubuntu Server', 'Docker', 'PostgreSQL', 'Cloudflare', 'Codex', 'Antigravity', 'Java fundamentals', 'Spring Boot is a future learning focus', 'F8']],
]) {
  for (const term of requiredTerms) {
    if (!html.includes(term)) {
      console.error(`[smoke:export] FAIL: ${name} missing approved portfolio content "${term}".`);
      process.exit(1);
    }
  }
}

// 12. Strict resolution check: all canonical, hreflang, and sitemap URLs must resolve to exported HTML on disk
function resolveUrlToHtmlFile(url) {
  if (!url.startsWith('https://damthienminh.id.vn')) {
    throw new Error(`Unexpected origin in URL: ${url}`);
  }
  const urlPath = url.replace('https://damthienminh.id.vn', '');
  let relPath = urlPath.replace(/^\/+/, '');
  if (relPath === '' || relPath.endsWith('/')) {
    relPath += 'index.html';
  } else if (!relPath.endsWith('.html')) {
    relPath += '/index.html';
  }
  const fullPath = path.join(outDir, relPath);
  return { fullPath, exists: fs.existsSync(fullPath) };
}

const urlsToValidate = new Set();

// Extract from sitemap.xml loc tags
const locMatchesAll = sitemapXml.match(/<loc>(.*?)<\/loc>/g) || [];
for (const m of locMatchesAll) {
  const url = m.replace(/<\/?loc>/g, '').trim();
  urlsToValidate.add(url);
}

// Extract from sitemap.xml xhtml:link alternates
const sitemapXhtmlMatches = sitemapXml.match(/href="(https:\/\/damthienminh\.id\.vn[^"]*)"/g) || [];
for (const m of sitemapXhtmlMatches) {
  const url = m.replace(/^href="/, '').replace(/"$/, '').trim();
  urlsToValidate.add(url);
}

// Extract canonical & alternate from all HTML files
for (const html of allHtmlFiles) {
  const canonicalMatches = html.match(/rel="canonical"\s+href="(https:\/\/damthienminh\.id\.vn[^"]*)"/g) || [];
  for (const m of canonicalMatches) {
    const url = m.match(/href="([^"]*)"/)?.[1];
    if (url) urlsToValidate.add(url);
  }
  const alternateMatches = html.match(/(?:hrefLang|hreflang)="[^"]*"\s+href="(https:\/\/damthienminh\.id\.vn[^"]*)"/g) || [];
  for (const m of alternateMatches) {
    const url = m.match(/href="([^"]*)"/)?.[1];
    if (url) urlsToValidate.add(url);
  }
}

// Explicitly ensure non-existent route /about/ is never present in any alternate/canonical/sitemap
for (const url of urlsToValidate) {
  if (url === 'https://damthienminh.id.vn/about/' || url === 'https://damthienminh.id.vn/about') {
    console.error('[smoke:export] FAIL: Non-exported route /about/ found in SEO alternates/sitemap.');
    process.exit(1);
  }
  const { fullPath, exists } = resolveUrlToHtmlFile(url);
  if (!exists) {
    console.error(`[smoke:export] FAIL: URL ${url} does not resolve to an exported HTML file (looked for: ${fullPath}).`);
    process.exit(1);
  }
}
console.log(`[smoke:export] PASS: Verified ${urlsToValidate.size} distinct canonical, hreflang, and sitemap URLs all resolve to physical exported HTML files.`);

// 13. Cloudflare Pages _routes.json check (API-only invocation)
const routesJsonPath = path.join(outDir, '_routes.json');
try {
  const routesData = JSON.parse(fs.readFileSync(routesJsonPath, 'utf8'));
  if (routesData.version !== 1) {
    console.error('[smoke:export] FAIL: _routes.json version must be 1.');
    process.exit(1);
  }
  if (!Array.isArray(routesData.include) || !routesData.include.includes('/api/*')) {
    console.error('[smoke:export] FAIL: _routes.json include must contain "/api/*".');
    process.exit(1);
  }
  console.log('[smoke:export] PASS: Cloudflare Pages _routes.json verified with API-only include: ["/api/*"].');
} catch (e) {
  console.error('[smoke:export] FAIL: Invalid _routes.json file:', e.message);
  process.exit(1);
}

console.log('[smoke:export] PASS: All 4 localized routes, root redirect, robots.txt, sitemap.xml, and _routes.json validated successfully with zero unverified placeholders or tracking scripts.');
