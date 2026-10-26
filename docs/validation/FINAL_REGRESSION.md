# Final local regression evidence

Application source: `399c8e495f82d2597fdf42d76729e1d98cd25219`, branch `thminh176/dtm-release-candidate`, checkout `C:/Users/thmin/orca/workspaces/dtm-portforlio/dtm-v2-u04`. This change updates only a route-test expectation and this document; application, configuration, content and dependency inputs remain identical to that revision.

The owner explicitly approved coordinator completion of M09b on 2026-10-27 after Orca worker readiness failures. Run `run_d279c98e769d`, task `task_b160b4487252` and its failed/circuit-broken dispatch history remain intact. This is a coordinator completion record, not a fabricated successful worker dispatch or a reset of orchestration history.

## Evidence locations and provenance

Raw evidence is stored locally under `C:/Projects/dtm-portforlio/docs/evidence/`; the large logs and screenshots are not committed. M09b's `command-results.jsonl` records each command, actual child exit and timestamps. Historical failed attempts remain alongside successful results.

- `final-label-integration-ci.log`: final application CI after the last HeaderClient label correction.
- `M09b/command-results.jsonl` and named stdout/stderr logs: original sequential regression on `b808c289ae5b820273acabdea2aaf48cd00aaa8c` before the final label-only correction.
- `U-FINAL-label/coordinator-label-final.json` and four screenshots: actual built-output checks after the label correction, using both the optional label rule and default full-page axe.
- `M09b/proposed-routes-result.json`, `proposed-routes.stdout.log`, `proposed-routes.stderr.log`, and `proposed-route-phases/`: the exact two-line test patch, verified against the final application source in a disposable checkout before application to this branch.
- `M09b/isolated-results.jsonl` and `isolated-guard-control.json`: clean archived source install/build without live CMS calls.

Node `v24.21.0` and pnpm `12.11.2` were used. Browser checks used installed Microsoft Edge; the executable version observed at coordinator completion was `157.0.4341.16`, not a claim about every earlier run. Remote Ubuntu CI, Safari and deployed Cloudflare behavior were not executed by this validation.

## Results

| Command or verification | Actual result | Scope |
| --- | --- | --- |
| `pnpm ci` | Exit 0 | Final integrated application: lint, typecheck, secrets, scanner fixtures, 117 contact assertions, build and smoke |
| `test:content` | Exit 0; 125 cases | Schema, semantics, references, media and redacted diagnostics |
| `test:content:loader` | Exit 0; 16 cases | Reads, selectors, locale isolation, recovery, media and invalid-draft-before-Next gate |
| `test:content:navigation` | Exit 0; 9 cases | Published translation and navigation projections |
| `test:content:consumers` | Exit 0; 4 checks | Isolated mutated snapshot and actual exported Home/About/JSON-LD |
| `test:content:routes` | Initial exit 1; corrected run exit 0 | Eight isolated phases; see repair below |
| `test:content:integrity` | Exit 0; 8 checks | Preview/production metadata, media and invalid snapshot rejection |
| `test:pages` | Exit 0; 22 assertions | Actual local Wrangler Pages runtime |
| `test:pages:failure-paths` | Exit 0; 4 scenarios | Synthetic startup/cleanup failure behavior |
| `test:contact:browser` | Exit 0; 13 phases, 29 assertions | Enabled browser form with mocked providers; preview restored |
| `test:browser` | Exit 0; 14 phases, 32 axe scans | General browser suite before final label-only correction |
| `test:browser:navigation` | Exit 0; 34 rows | Real and isolated article routes, Header and full-page axe, keyboard and locale controls |
| Final brand label checks | Exit 0; VI/EN at 390/1440px | Optional `label-content-name-mismatch` and default full-page axe: zero violations in every row |
| `test:lighthouse` | Command exit 0; four target misses | Eight reports; performance limitation below |
| Full and production dependency audits | Exit 0; zero advisories at recorded time | Both before and after the original regression matrix |

The route test originally expected only locale-specific alternates and rejected the approved SEO `x-default` entry. The repair adds that entry to both strict expected arrays: use the actual English URL when present, otherwise Vietnamese. No alternate is filtered out, no assertion is loosened, and application metadata is unchanged. The corrected test passed empty, published, removed, all-projects-removed and final-empty builds (exit 0), plus draft, project-draft and missing-reference rejection builds (expected exit 1 before Next). The suite itself exited 0, removed its temporary checkout and preserved snapshot bytes. Lint on the exact proposed test also exited 0. The applied script is compared with the verified artifact rather than repeating already passed builds.

## Content and security boundaries

Smoke checks verify exactly 15 real public URLs: root and 14 localized pages. Both `/vi/` and `/en/` retain Home, About, Contact, Blog and Projects indexes, with four published localized project details. There are currently zero published posts and zero media records; isolated article fixtures are never published to the repository snapshot. The test-only seed is not an application fallback. Invalid or draft-bearing snapshots fail validation, and removed records cannot leave unresolved published links.

The handler `functions/api/contact.ts`, ContactForm, contact configuration, `public/_routes.json`, secret scanner and contact API test are unchanged against main `d2c40590af463a38a561ffeb2e8eb6b4036017f2`. Contact remains disabled when required configuration is absent. Mock successes do not establish delivery through actual Turnstile/Resend accounts. No actual email delivery or production provider credentials were tested.

The original full navigation audit recorded zero violations, 18 incomplete color-contrast rule occurrences containing 36 decorative arrow nodes, zero unexpected requests and zero runtime errors. Incomplete findings are retained. Accepted UI review measured those unchanged arrow colors at 7.659:1; this is a scoped manual contrast result, not whole-site WCAG AAA certification. The optional brand-label audit subsequently found an issue that default scans and category scores did not expose; Antigravity fixed it in `64804df3d68145d56fa54f0dfd409369599d9870`, integrated as `399c8e4`, and the four final checks passed.

## Offline content architecture evidence

An archived `b808c28` source checkout installed with `pnpm install --frozen-lockfile --offline`: 482 packages reused, zero downloaded, exit 0. A controlled HTTPS request was blocked before invoking the original request function; build with the selected-Node-API guard then exited 0. No host firewall or global configuration was changed. The later label-only application change did not alter content I/O or build architecture.

The guard is not an operating-system network isolation mechanism and does not cover every possible native networking path. Source inspection confirms that content reads use checked-out JSON/media rather than an L540 API. The future CMS publisher and its Git-to-Cloudflare publishing pipeline do not exist here and have not been tested.

## Performance and release limitations

The eight local Lighthouse reports scored desktop performance 100 for `/vi/`, `/en/`, `/vi/about/` and `/en/about/`. Mobile performance was respectively **81, 92, 93 and 86**. Accessibility, best practices and SEO categories scored 100, but the optional label finding above demonstrates why scores alone are insufficient. Four mobile results miss the script's existing 95 target despite process exit 0; they are not represented as passing that target. These simulated local measurements are not field INP or deployed-site performance.

No remote CI run, preview/staging/production deployment, account security review, DNS verification or real provider delivery is established by this evidence. See [the release checklist](../release/FINAL_RELEASE_CHECKLIST.md) for remaining owner decisions. Main merge and all deployments remain separately gated.
