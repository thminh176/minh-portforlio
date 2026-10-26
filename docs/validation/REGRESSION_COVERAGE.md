# Regression coverage before final release execution

M09a maintains test and CI coverage after the site switched to a committed published snapshot. This document describes the gates; it does not claim a final candidate, remote CI run, browser pass or deployment. M09b runs the full sequential suite after final UI review is accepted.

## Publication data boundary

The actual site build, smoke export and browser navigation read the complete validated `content/published/dtm.v1.json`. Exact published paths, localized slugs, translations, featured cards and recent posts come from that revision. The initial approved zero-post, two-project facts live in the immutable test-only `scripts/fixtures/content/dtm-seed.json`; mutation suites build in isolated temporary checkouts and verify that the repository snapshot bytes remain untouched. The seed is an assertion fixture, never a website fallback or second publication authority. The loader still proves missing/malformed/media inputs fail, an invalid draft fails before Next executes, and valid changed profile, setting, post and project data can be selected without a stale cache.

## Workflow gates

| Workflow | Added gates | Preserved gates |
| --- | --- | --- |
| Quick CI (`.github/workflows/ci.yml`) | `test:content`, `test:content:loader`, `test:content:navigation` before build | Frozen pnpm install, read-only token, secret/self checks, contact API tests, lint, typecheck, build, export smoke |
| Manual pre-release (`.github/workflows/manual-pre-release.yml`) | Same three quick content gates; isolated `test:content:consumers`, `test:content:routes`, `test:content:integrity` before build; `test:browser:navigation` with browser work | Existing Pages runtime/failure paths, enabled contact browser, general browser, Lighthouse and all quick security/build checks |

Both workflows run only on their existing triggers with read-only repository permissions. They use `pnpm` commands on Ubuntu and do not publish, deploy, change environment values or call a CMS. Workflow edits alone are not remote execution evidence.

## Export and browser assertions

`smoke:export` compares the sitemap to the exact validated published route inventory and requires physical HTML for every entry. It checks every localized exported page's canonical and complete real-only hreflang set, including `x-default`; root redirect, disabled contact, social links, theme bootstrap, robots/index policy, `_routes.json`, tracking bans and other established checks remain. Featured project and recent journal assertions follow the current snapshot, including the honest zero-post message.

`test:browser:navigation` forms its real route matrix from all currently published posts and projects plus both locales of fixed pages. Its isolated article fixture uses the approved seed for stable paired and VI-only slug cases. Each route and viewport keeps the Header axe requirement of zero violations and zero incomplete checks, navigation/locale/menu/focus checks, request blocking and bounded cleanup. It now also runs full-page axe: any violation fails; incomplete results do **not** disappear and are persisted with rule IDs, impact, node targets, HTML, failure summaries and `any`/`all`/`none` check detail for manual review. Incomplete findings are not claimed resolved and belong in Antigravity/coordinator review.

## Local M09a evidence and limits

M09a ran scoped loader, pure navigation, current-export smoke, lint and isolated consumer mutation checks. The consumer fixture includes a name with `&` and angle brackets, confirming escaped rendered HTML carries valid changed content. The final browser, Pages, Lighthouse and remote CI matrix remains M09b work after M08 integration. Historical source-literal loader checks for Hero/Journal/project copy were replaced with typed seed projection and rendered mutation coverage in `test:content:consumers`; no production content is hardcoded back into components. An approved content edit must still pass complete snapshot validation and all live-export checks. Raw local exits and any failed attempts are recorded outside the repository under `C:/Projects/dtm-portforlio/docs/evidence/M09a/`.
