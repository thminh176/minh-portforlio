# DTM Cloudflare Pages release checklist

**State: prepared for owner review; no deployment authorized.** Local functional and security regression checks have passing evidence. Mobile Lighthouse performance remains below the existing 95 target; review that limitation before deciding to release. This checklist is not production signoff.

Run: `run_d279c98e769d`. Branch: `thminh176/dtm-release-candidate`. Worktree: `C:/Users/thmin/orca/workspaces/dtm-portforlio/dtm-v2-u04`. Responsible agent for this checklist: Codex coordinator, explicitly approved by the owner after worker readiness failures.

## Candidate and review history

Tested application revision: `399c8e495f82d2597fdf42d76729e1d98cd25219`. Regression completion: `573dc4a8dc0f12788bbaa0710eb00b8350bc8580`, which adds only the two-line strict hreflang test correction and [the final regression report](../validation/FINAL_REGRESSION.md). This checklist is a later documentation-only commit; application, content, dependencies and deployment configuration remain identical to the tested application revision. No full rebuild is required solely for this document.

| Deliverable | Accepted commit / integration | Review evidence |
| --- | --- | --- |
| Snapshot consumers | `29dd6f27fb5be4ff649825f4b73f4ea867557e5a` | Isolated changed-content export and Home/About visual checks |
| Metadata, sitemap and media | `268c0dc878c787345890052a20dc03d46e92ac14` | Preview/production and invalid-snapshot integrity checks |
| Regression and CI maintenance | `c0e875e0e9d1f8df0f813adeb65aeb9c3b3805da` | Typed seed fixtures, dynamic live-content checks, existing CI gates preserved |
| Final UI and review corrections | `0c5e897` / `b808c28`, `4b7b2a6` / `07507c1` | [UI review](../validation/FINAL_UI_REVIEW.md); real responsive scans and manual incomplete review |
| Owner development/content guide | `78d0dc9` / `dded9d7` | [README](../../README.md), inspected paths/scripts and secret scan |
| Brand accessible-name correction | `64804df` / `399c8e4` | Antigravity fix; four final VI/EN mobile/desktop optional-rule and full-page axe checks |
| Route-test correction and final evidence | `573dc4a8dc0f12788bbaa0710eb00b8350bc8580` | Eight isolated route phases, lint and secret scan; final report |

Large raw logs/screenshots remain at `C:/Projects/dtm-portforlio/docs/evidence/`, not in Git. The final regression report maps claims to specific files and distinguishes older full-suite evidence from checks after the final label-only correction. Orca's historical failed/circuit-broken dispatches remain recorded; the owner approved coordinator completion of the original M09b task, rather than a replacement Run or fabricated worker success.

## Local verification completed

- [x] Final application `pnpm ci` exited 0: lint, typecheck, secrets, scanner fixtures, 117 contact assertions, build and smoke.
- [x] Content validation (125 cases), loader (16), pure navigation (9), consumer export (4), SEO/media integrity (8), local Pages (22), synthetic Pages failure paths (4), and mocked contact browser (13 phases/29 assertions) have passing raw evidence.
- [x] Route checks passed all eight phases after requiring exact `x-default` URLs: five valid builds exited 0; three invalid draft/reference builds exited 1 before Next as expected. The suite exited 0 and preserved real snapshot bytes. No URL assertion was suppressed.
- [x] General browser suite passed 14 phases/32 axe runs; navigation passed 34 rows with full-page axe and no unexpected requests/runtime errors. Recorded decorative-arrow incompletes were manually reviewed, not counted as automatic passes.
- [x] Final label correction passed the optional label rule and default full-page axe in all four VI/EN 390/1440px cases; desktop/mobile captures were reviewed.
- [x] Full and production dependency audits returned zero advisories at the recorded test time. The scoped Miniflare-to-Undici 7.30.1 override remains; review whether it can be removed when Miniflare updates its pinned dependency. Audit results are time-specific.
- [x] Clean archived source installed offline with the frozen lockfile and built under a controlled selected-Node-API request guard. Source uses checked-out JSON/media, with no L540 API dependency. This is not a host firewall test.
- [x] Contact handler/Form/configuration, API-only `_routes.json`, secret scanner and contact API test remain unchanged against main `d2c40590af463a38a561ffeb2e8eb6b4036017f2`.
- [ ] Mobile Lighthouse performance meets 95: **not achieved**. Scores are VI home 81, EN home 92, VI About 93, EN About 86; desktop performance is 100 for all four routes. Other scored categories are 100, but scores alone do not establish every accessibility guarantee. Record an owner decision or a separately scoped optimization before release signoff; do not misread process exit 0 as achieving 95.
- [ ] Remote GitHub CI and cross-platform/browser verification beyond the recorded local environment have not run.

## Published routes and editing

The current snapshot revision is `dtm-initial-20261026`: four localized project records representing two repositories, zero posts, zero media. Exactly 15 public URLs export:

- Root `/`.
- Both `/vi/` and `/en/`, plus each locale's `about/`, `contact/`, `blog/` and `projects/` index.
- `/vi/projects/mcp-project-assistant/` and `/en/projects/mcp-project-assistant/`.
- `/vi/projects/portfolio-ca-nhan/` and `/en/projects/personal-portfolio/`.

No article detail URL exists until an actual published post is added. Isolated test articles were never committed as public content. Local preview is available at `http://127.0.0.1:3000/vi/` and `/en/` while its terminal is running. For application development use `pnpm dev` (`pnpm.cmd dev` on PowerShell when necessary).

Follow [the owner guide](../../README.md#editing-and-publishing-content) and [the snapshot contract](../content/PUBLISHED_SNAPSHOT_V1.md). Edit `content/published/dtm.v1.json` with `siteId: dtm`, version 1 and semantic `vi/en` locales; add referenced raster files under `public/media/content/`. Profile copy comes from the snapshot. Preserve the established domain/contact/security configuration modules and `/vi` route convention. Validate the complete snapshot/media set, build, inspect the diff and exported pages before publishing. Draft-bearing or broken-reference input fails before Next rather than silently falling back.

The future shared L540 CMS/publisher is a separate project. Its intended flow is drafts, owner publication, complete validated JSON/media export, Git commit/push, then one configured Cloudflare Pages Git build. The build reads its checkout and needs no L540 connection, live CMS API, public admin screen, Sanity service or permanent tunnel. That future publisher and its end-to-end pipeline have **not** been implemented or tested here. Never also invoke a Deploy Hook for the same Git-triggered content change.

## Owner-gated Cloudflare preparation

These are proposed settings to verify against the actual account, not a claim that the dashboard is configured:

- [ ] Review and approve integration into the production branch; no merge or push is authorized by this checklist.
- [ ] Verify repository `thminh176/minh-portforlio`, project root `/`, build command `pnpm build`, output directory `out`, Node 24 and pnpm `12.11.2` against the configured build environment and committed lockfile.
- [ ] Preserve root `functions/api/contact.ts` and exported `_routes.json` with `include: ["/api/*"]`; only API requests should invoke Pages Functions. Preserve existing security headers and CI checks.
- [ ] Verify preview environment remains noindex. Use `NEXT_PUBLIC_SITE_ENV=production` only in the authorized production context; this does not activate contact delivery.
- [ ] Keep contact disabled until required client and server provider configuration is verified. Public client settings are `NEXT_PUBLIC_CONTACT_ENABLED` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; follow README for server-only Turnstile/Resend secrets and sender/recipient values. Never commit credentials or expose them in logs.
- [ ] Verify Turnstile expected hostname and `contact` action, Resend verified sender/domain, and a real owner-approved delivery before claiming messages reach the inbox. Passing provider mocks is not real delivery evidence.
- [ ] With authorized account access, inspect account permissions/MFA, domain/DNS for `damthienminh.id.vn`, environment scopes and applicable abuse controls. These have not been inspected here; do not claim the site cannot be hacked.
- [ ] Obtain separate approval before preview/staging deployment, inspect that deployment, and obtain explicit production approval before production deployment. No Cloudflare deployment or account mutation occurred in this work.

## Rollback

Record the last reviewed deployed Git revision before any authorized release. Roll back the complete coherent revision, including snapshot JSON and every referenced static media file, then rebuild using the same single Git-triggered path. Do not partially revert JSON or remove referenced media while leaving published links behind. Validation must remain enabled during rollback. Do not restore/reveal historical secrets; preserve current approved environment configuration and the contact fail-closed behavior.
