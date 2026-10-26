# damthienminh.id.vn

Bilingual personal portfolio with projects, learning notes, and contact details for **Đàm Thiên Minh** (VI) / **Thien Minh Dam** (EN).

Built with Next.js App Router, React 19, TypeScript, and Tailwind CSS v4. Designed for static HTML export to **Cloudflare Pages Free**.

---

## Architecture & Technology Stack

- **Framework**: Next.js 16 (App Router) configured for pure static HTML export (`output: 'export'`, `trailingSlash: true`).
- **UI & Styling**: React 19, Tailwind CSS v4, and the approved Work Journal graphite, paper, and brick design tokens.
- **Language & Type Safety**: TypeScript (strict mode, bundler resolution).
- **Package Manager**: pnpm `12.11.2` pinned via `packageManager` field in `package.json`.
- **Hosting Target**: Cloudflare Pages Static Hosting (`out/` directory).
- **Runtime APIs**: The Next.js site exports static HTML without SSR or a live content API. The contact form uses the separate Cloudflare Pages Function in `functions/` via `_routes.json`.

---

## Prerequisites & Toolchain

- **Node.js**: `v24.21.0` LTS required. Cloudflare Wrangler enforces Node `>=22.0.0`; older Node versions are unsupported. (Note: Node 24 does not bundle Corepack by default; install `pnpm` directly or enable Corepack via npm if desired).
- **pnpm**: `12.11.2` pinned via `packageManager` in `package.json`.
- **Windows Script Execution**: On Windows systems where PowerShell blocks the pnpm script wrapper, use `pnpm.cmd` directly. Because `.cmd` files are native Windows Command batch wrappers, they execute cleanly without altering machine or user `ExecutionPolicy` or modifying global system settings.

```powershell
# Verify pnpm via native Windows CMD wrapper
pnpm.cmd --version
```

---

## Getting Started

### 1. Install Dependencies

```powershell
pnpm.cmd install --frozen-lockfile
```

Use `pnpm install --frozen-lockfile` in shells where `pnpm` runs directly. This uses the committed lockfile and matches CI.

Native build scripts (such as `unrs-resolver` used by ESLint import resolution) are explicitly configured in `pnpm-workspace.yaml`.

### 2. Local Development

```powershell
pnpm.cmd dev
```

Visit [http://localhost:3000](http://localhost:3000). `/` selects a language and has fallback links. Each locale, `/vi/` and `/en/`, has Home, About (`about/`), Contact (`contact/`), Blog (`blog/`), and Projects (`projects/`) pages. Published posts and projects also have `blog/{slug}/` and `projects/{slug}/` detail pages in their own locale. The checked-in snapshot currently has no posts, so the Blog listings show an honest empty state and no article detail page is exported. There is no `/vn/` route.

---

## Editing and Publishing Content

The authoritative public content is the complete, versioned `content/published/dtm.v1.json` file, with referenced raster images committed under `public/media/content/`. The typed content adapter in `src/lib/content/` validates this checked-out input before Next.js generates routes and HTML. It does not fetch content from a CMS or live API during the build or a visitor request. `src/config/profile.ts` is not the source for published profile copy; keep domain, contact, and other application configuration in their established code/configuration locations.

The snapshot has `schemaVersion: 1`, `siteId: "dtm"`, a revision and export timestamp, and `vi`/`en` profiles, settings, posts, projects, and media arrays. It contains public, **published** records only. See [the v1 contract](docs/content/PUBLISHED_SNAPSHOT_V1.md) and [schema](content/schema/published-snapshot.v1.schema.json) for exact fields, allowed blocks, ordering, and URL rules. Edit the whole JSON file as one replacement, including both locales and all referenced records; hand editing is possible. Preserve genuine, approved copy and evidence, and write a translation only when that translation has actually been approved. Do not invent an article, project, claim, or English counterpart to fill an empty state.

Before committing a content change:

1. Update the full snapshot and any matching media files together. Repair references to renamed or removed records, featured project IDs, links, and reciprocal translation links. A single-locale record is valid with no fabricated counterpart; its detail route exists only in that locale.
2. Keep media paths under `/media/content/` and add the corresponding files under `public/media/content/`. Give meaningful, localized alt text for informative images and accurate dimensions/type. The validator checks references, path case, file type, raster decoding, and dimensions.
3. Run `pnpm.cmd run validate:content`, then `pnpm.cmd build` and `pnpm.cmd run smoke:export` on Windows PowerShell (or `pnpm` in another shell). Review generated pages, links, and the diff before publication. The build itself invokes content validation before Next.js; missing, malformed, draft-bearing, unsupported-version, dangling-reference, or invalid-media input fails rather than producing a partial site.

The website has no owner admin screen. Owners can edit this JSON and ordinary application code through the normal development and review workflow. A future **separate** publisher on L540 is planned to turn approved drafts into one complete published JSON snapshot plus static media, commit and push those files through Git, and let the configured Cloudflare Pages Git integration build static HTML. That publisher and its end-to-end delivery have **not** been implemented or tested here. The site build does not need L540 availability, Sanity, a CMS domain, or a permanent tunnel. Use the Git-triggered build for a content change; do not also trigger a Deploy Hook for the same change. Production merge and deployment remain explicit owner decisions.

---

## Verification & Quality Scripts

| Command | Description |
|---|---|
| `pnpm lint` | Runs ESLint with Next.js flat configuration across application code and scripts. |
| `pnpm typecheck` | Validates TypeScript types across the project (`tsc --noEmit`). |
| `pnpm run check:secrets` | Scans git-tracked files and pending working tree for secret leaks, keys, or forbidden files (safe NUL delimiter, fail-closed). |
| `pnpm run test:secrets` | Runs integration self-checks on the secret scanner using isolated temp Git fixtures. |
| `pnpm run test:contact` | Runs standalone isolated Contact API test suite (117 assertions, stream limit aborts, RFC 2606 test domains, zero-PII log audit). |
| `pnpm run test:pages` | Starts actual `wrangler pages dev out` runtime to verify static route bypassing, 503 fail-closed behavior with absent server configuration. Provider verification scenarios use the separate mocked API harness. |
| `pnpm run test:contact:browser` | Tests the enabled client contact form in Microsoft Edge via Playwright (focus order, single submission success, captcha reset, duplicate prevention, 503/403/502/network errors, token expiration, unmount cleanup, restoring normal preview export). |
| `pnpm run test:browser` | Runs comprehensive 14-phase browser verification and 32-combination Axe accessibility audit against the default static export. |
| `pnpm run check` | Runs lint, typecheck, secret audit, scanner self-checks, and contact API tests in sequence. |
| `pnpm run validate:content` | Validates the checked-out published JSON and its committed media. |
| `pnpm run test:content` | Exercises snapshot schema and semantic rejection cases with isolated fixtures. |
| `pnpm run test:content:loader` / `test:content:navigation` | Checks the content loader/build gate and navigation projections. |
| `pnpm run test:content:consumers` / `test:content:routes` / `test:content:integrity` | Checks content consumers, exported route changes, SEO and media integrity in isolated fixtures. |
| `pnpm run test:browser:navigation` | Browser checks for published and fixture article navigation. |
| `pnpm build` | Compiles and generates static export inside `out/`. |
| `pnpm run smoke:export` | Validates required static HTML, content routes, DOM markers, and `_routes.json`. |
| `pnpm run test:lighthouse` | Builds local production metadata with contact disabled, measures four routes on mobile/desktop using the existing browser, saves raw reports, and restores preview in finally. |
| `pnpm run ci` | Runs local `check` + `build` + `smoke:export`; the GitHub workflows add content-specific gates below. |

> **Heuristic Secret Scanner Coverage**: `scripts/check-secrets.mjs` executes `git ls-files --cached --others --exclude-standard -z` to safely enumerate tracked and untracked repository files across all nested folders without word-splitting issues on spaces or Unicode characters. It inspects nested basenames for forbidden `.env*`, `.dev.vars*`, private keys, and scans workflow YAML, SVG, and text files up to an explicit **2MB limit per file**. Exact exclusions are narrowly restricted to:
> 1. Pinned local vendor skill: `.agents/skills/ui-ux-pro-max/`
> 2. Isolated local test fixtures: `reports/local/`
> 3. Lockfiles: `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`
>
> This audit is a defensive heuristic check against known token formats and sensitive files; it does not constitute a mathematical zero-secret guarantee.

---

## Local Pages Runtime & Functions (`wrangler pages dev`)

Cloudflare Pages Functions are hosted in the root `functions/` directory and compiled independently of the Next.js static build.

### Running Local Pages Runtime

```bash
# 1. Build the static site into out/
pnpm build

# 2. Run local Cloudflare Pages runtime with static assets and root Functions
pnpm run pages:dev
```

This starts `wrangler pages dev out` on `http://127.0.0.1:8788`.
- **Static Route Bypassing**: `public/_routes.json` is exported into `out/_routes.json` with `{"version": 1, "include": ["/api/*"], "exclude": []}`. Cloudflare Pages serves the exported Home, About, Contact, Blog, Projects, published detail routes, and metadata files directly from static storage without invoking Functions.
- **Function Routing**: Only requests starting with `/api/*` invoke the Pages Function at `functions/api/contact.ts`.

---

## Contact Form Setup & Configuration

The contact feature is designed with a strict **fail-closed security architecture**. By default, form submissions are inactive in preview builds to prevent fake claims of message delivery.

### 1. Client Build Configuration (Public)

Configured at build time via environment variables:

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_CONTACT_ENABLED` | Set to `'true'` to activate the client form submission button and Cloudflare Turnstile widget. | Unset / disabled |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public Cloudflare Turnstile site key (e.g. `0x4AAAAAA...`). | `null` |

When either variable is absent, the form renders with status badge `Trạng thái: Chưa cấu hình` (`Status: Needs Configuration`), the submit button is strictly disabled, no third-party captcha scripts are loaded and no form submission is sent.

### 2. Server Secrets Configuration (Cloudflare Pages Dashboard)

Configured in the **Cloudflare Pages Dashboard** under **Settings > Environment variables > Production / Preview**:

> [!CAUTION]
> **Never commit server secrets to Git.** All secrets must remain in Cloudflare Pages dashboard environment variables. Do NOT create or commit `.dev.vars` or `.env` files containing real keys.

All **six** server bindings are strictly required. If any binding is missing or empty, the function immediately fails closed with HTTP 503 `needs_configuration` without making any outbound requests:

| Secret Binding | Requirement | Description |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | Mandatory | Cloudflare Turnstile private secret key used for server-side siteverify. |
| `TURNSTILE_EXPECTED_HOSTNAME` | Mandatory | Expected domain (e.g. `damthienminh.id.vn`). Mismatches return HTTP 403 `turnstile_hostname_mismatch`. |
| `TURNSTILE_EXPECTED_ACTION` | Mandatory | Expected Turnstile widget action string (must be `contact`). Mismatches return HTTP 403 `turnstile_action_mismatch`. |
| `RESEND_API_KEY` | Mandatory | Resend API key (`re_...`) for sending inquiries via HTTPS. |
| `CONTACT_TO_EMAIL` | Mandatory | Destination inbox address receiving inquiries. |
| `CONTACT_FROM_EMAIL` | Mandatory | Verified sender email domain configured in Resend (e.g. `inquiry@damthienminh.id.vn`). |

#### Optional Secondary Notification Bindings:

| Binding | Requirement | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram bot token from `@BotFather`. |
| `TELEGRAM_CHAT_ID` | Optional | Telegram chat or channel ID. |

*Note*: Secondary Telegram notifications contain only a constant, generic alert (`"Portfolio: có liên hệ mới"`) with **zero visitor PII**. If Telegram dispatch fails or times out, valid email delivery is preserved and never re-sent.

### 3. Provider Setup Instructions

1. **Cloudflare Turnstile**:
   - Go to Cloudflare Dashboard > Turnstile.
   - Create a new widget with domain `damthienminh.id.vn`.
   - Mode: Managed or Non-interactive.
   - Note down the **Site Key** (for `NEXT_PUBLIC_TURNSTILE_SITE_KEY`) and **Secret Key** (for `TURNSTILE_SECRET_KEY`).
2. **Resend Email Service**:
   - Sign up at [resend.com](https://resend.com).
   - Add and verify the sending domain `damthienminh.id.vn` with required DNS records (SPF, DKIM, MX).
   - Generate an API key and add it to `RESEND_API_KEY`.
3. **Telegram Bot (Optional)**:
   - Message official `@BotFather` on Telegram to create a bot and receive the bot token.
   - Send a direct test message to your new bot, then query the official Telegram Bot API `https://api.telegram.org/bot<token>/getUpdates` to inspect your chat ID. Do NOT share your bot token or use untrusted third-party chat ID bots.

### 4. Rate Limiting Realities on Cloudflare Pages Free

On Cloudflare Pages Free tier, Pages Functions do not provide built-in distributed per-IP rate-limiting storage out-of-the-box without Cloudflare Zone WAF rules or custom KV/Durable Object state.
- **Protection & Mitigation Measures Implemented**:
  - Server-side Cloudflare Turnstile validation provides bot mitigation and challenge verification (not an absolute mathematical guarantee against distributed attacks).
  - Same-origin verification (`Origin` header matching host/scheme) rejects unauthorized cross-origin submissions.
  - Streaming body size cap strictly enforced at **16 KiB** during stream consumption, aborting oversized payloads immediately.
  - Strict input sanitization rejecting carriage returns (`\r`), line feeds (`\n`), and control characters in name/email fields.
  - Hidden honeypot field rejecting generic spambots.
- **Platform Rate Limiting**: Before production, the owner should review available rate-limiting controls and plan limits in the Cloudflare dashboard. This project configures no distributed rate limiter and authorizes no paid service or account change.

---

## Privacy Architecture

- **Disabled Operation (Default)**: When `NEXT_PUBLIC_CONTACT_ENABLED` is unconfigured or false, the form is completely inert with status badge `Trạng thái: Chưa cấu hình` (`Status: Needs Configuration`), submit is disabled, no Turnstile script loads and no form submission is sent. Normal page asset requests still occur.
- **Enabled Provider Delivery**: When enabled in production with valid provider keys, submissions are transmitted over TLS to the Resend API for email delivery to the configured recipient inbox. Inquiry data is processed by the configured email provider and retained in the destination inbox according to their policies; the application has no inbox database.
- **Zero Database Storage**: No visitor inquiries, personal records, or messages are stored in any database or cloud persistence layer.
- **Zero PII Logging**: Server logs never log visitor names, emails, messages, or Turnstile tokens.
- **Secondary Notification Safety**: Optional Telegram alerts contain only a constant, generic notice (`"Portfolio: có liên hệ mới"`) with zero visitor PII.
- **Analytics Inactive**: Cloudflare Web Analytics and tracking beacons are unconfigured and completely inactive. No tracking cookies, globals, or external tracking scripts are loaded on any route.

---

## Static Export & Cloudflare Pages Deployment

### Static Output Directory

Running `pnpm build` generates `out/` with the root selector, `vi/` and `en/` Home, About, Contact, Blog and Projects HTML, plus detail HTML for each published localized post and project. It also includes `_routes.json`, `robots.txt`, `sitemap.xml`, and `_next/` assets. With the current zero-post snapshot, no article detail HTML is generated. The exported route set follows the validated complete snapshot.

### Cloudflare Pages Configuration

- **Framework preset**: `Next.js (Static HTML Export)`
- **Build command**: `pnpm build`
- **Build output directory**: `out`
- **Root directory**: `/`

---

## Continuous Integration & Pre-Release Workflows

### Quick CI (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main` or `master`, enforcing:
1. Dependency installation (`--frozen-lockfile`)
2. Secret & forbidden file audit (`pnpm run check:secrets`)
3. ESLint validation (`pnpm lint`)
4. TypeScript validation (`pnpm typecheck`)
5. Contact API security validation (`pnpm run test:contact`)
6. Production static build (`pnpm build`)
7. Export smoke validation (`pnpm run smoke:export`)

It also runs the content snapshot, loader/build-gate, and navigation projection tests (`test:content`, `test:content:loader`, `test:content:navigation`). These are configured gates, not a claim that remote CI has run for this branch.

### Manual Pre-Release Validation (`.github/workflows/manual-pre-release.yml`)

A dedicated manual workflow (`workflow_dispatch`) for full pre-release verification, adding:
- Secret scanner self-checks (`pnpm run test:secrets`)
- Cloudflare Pages runtime dev tests (`pnpm run test:pages`)
- Cloudflare Pages synthetic failure paths (`pnpm run test:pages:failure-paths`)
- Playwright client contact browser verification (`pnpm run test:contact:browser`)
- Full 32-combination browser verification and `@axe-core/playwright` accessibility audit (`pnpm run test:browser`)
- Content consumer, route-removal, and SEO/media integrity fixtures (`pnpm run test:content:consumers`, `test:content:routes`, `test:content:integrity`)
- Published and fixture article browser navigation (`pnpm run test:browser:navigation`)

Both workflows use strictly read-only repository permissions and contain no deployment credentials or production secrets.

---

## Security & Privacy Guidelines

- **No Secrets in Repository**: `.env`, `.env.*` (except `.env.example`), `.dev.vars*`, and private cryptographic keys (`*.pem`, `*.key`) are strictly gitignored.
- **Fail-Closed Contact Form**: The contact form is marked disabled with a localized explanation until Cloudflare Pages Functions and Turnstile site credentials are configured.
- **Privacy First**: No personal educational history, unverified employers, fabricated metrics, or unverified claims are included.


## Local quality evidence and release boundary

`pnpm run ci` is the combined equivalent of lint/types/tests/build required by the project; browser/Pages/Lighthouse suites are separate and sequential. `pnpm run test:pages:failure-paths` exercises four controlled cleanup scenarios. Set `PLAYWRIGHT_CHROME_PATH` to an existing Edge/Chrome executable when discovery cannot find it; no browser is downloaded. Full CI requires an existing browser on its runner and fails explicitly if absent. Remote workflow and Linux/Safari behavior have not been executed locally.

`test:lighthouse` uses pinned Lighthouse13.5.0 (GoogleChrome, Apache-2.0) and local HTTP with gzip text responses, not deployed Cloudflare measurements. It temporarily sets `NEXT_PUBLIC_SITE_ENV=production` for indexable metadata, explicitly disables contact and clears the public widget key, then restores a preview/noindex export. Reports contain actual category scores, LCP and CLS; lab tests cannot establish field INP. See reports/m4b.md and reports/lighthouse-evidence/summary.json. The earlier uncompressed-server baseline is retained separately.

Windows builds run `scripts/normalize-static-export.mjs` after Next export: the known [Next segment-cache path bug](https://github.com/vercel/next.js/issues/92339) writes nested text assets. The script preserves originals and copies those assets to the flat names requested by Next; it leaves HTML untouched and refuses conflicting destinations. Linux output is unchanged. Browser verification checks failing resource responses as well as page navigation.

Before any owner-approved Cloudflare setup, use the official [static Next.js Pages guide](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/) and [Pages Functions routing guide](https://developers.cloudflare.com/pages/functions/routing/). Production metadata needs `NEXT_PUBLIC_SITE_ENV=production`; this alone does not activate messaging. Account connection, deployment, domain/DNS and provider settings remain owner actions. Cloudflare Web Analytics is currently absent from code: enabling it requires a separately approved integration, never form/PII events. Follow the official [Web Analytics guide](https://developers.cloudflare.com/web-analytics/get-started/) and [Search Console verification guide](https://support.google.com/webmasters/answer/9008080) when approved.

For current content changes, follow the published snapshot workflow above. The route inventory and metadata derive from validated published records; absent translations remain absent. Final release regression evidence is being collected separately, so this guide does not assert a final pass, production deployment, or executed remote CI.
