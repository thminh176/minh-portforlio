# DTM final content architecture

Owner decision reconciled on 2026-10-26. This document and [the final task graph](DTM_FINAL_STAGE_TASK_GRAPH.md) supersede the Sanity implementation assumptions in the older owner handoffs. Architecture, development and existing public UI are approved; main merge and production deployment still require owner approval.

## Repository and observed baseline

The repository is `https://github.com/thminh176/minh-portforlio`. M01 starts at `053ec16b39e0a50a8d16e757069f77c32fc2670c` in branch `thminh176/dtm-m01-reconcile`, checkout `C:/Users/thmin/orca/workspaces/dtm-portforlio/dtm-v2-u04`. The spelling of the repository is intentional.

Read sources: actual README, package.json, next.config.ts, localized routes and layouts, sitemap/robots, i18n, both CI workflows, and these owner documents under `C:/Projects/dtm-portforlio/docs/`: `DTM_ORCA_TASK_GRAPH_MICRO_V2.md`, `DTM_Figma_V2_Anti_Slop_Handoff.md`, `evidence/M01/reconciliation.md`, `evidence/COORDINATOR_STATUS.md`. The resumed reconciliation appendix and current dispatch supersede historical pause/runtime/permission blockers.

Existing code has static-export Next.js App Router, `trailingSlash: true`, unoptimized images, `/`, `/vi/`, `/en/`, and localized About. Home includes real project blocks, an honest unpublished journal state and contact section. Blog/article/project-detail/contact routes and a content snapshot adapter do not yet exist. `src/config/profile.ts`, `site.ts`, other config and `src/i18n/{vi,en,types,index}.ts` remain the current sources until an explicitly scoped task integrates content. README's earlier prohibition on expansion describes the completed phase; owner-approved final-stage work is now planned here.

## Build and publishing boundary

The website consumes one complete, versioned, published JSON snapshot and its static media from the checked-out repository at build time. It exports static HTML into `out/`; visitor navigation never needs the future CMS. A clean checkout with its committed snapshot/media must build with L540 offline and without CMS credentials.

The future shared CMS on L540 is a separate project. Its future publisher may produce reviewed repository commits containing a complete snapshot and matching media. The website does not implement that CMS, Sanity Studio, admin screens (Figma 15:2/15:36), a content API, tunnel, database, runtime content fetch, build-time L540 fetch or CMS authentication. There is no Sanity SDK/GROQ/client dependency. Existing `functions/api/contact.ts` is retained as the separate, established contact endpoint.

Publishing design: validate the entire candidate, update JSON and all referenced media atomically in Git, review the diff, then use the existing Git-triggered site build/deployment approach. Do not add a Deploy Hook that rebuilds the same content change a second time. Account setup and actual deployments are outside M01. No shared-CMS exporter, repository synchronization or end-to-end publishing pipeline has been implemented or tested by this documentation task; no shared DVT contract compatibility is asserted.

## Contract to specify in M02

Planned new files are `docs/content/PUBLISHED_SNAPSHOT_V1.md` and `content/schema/published-snapshot.v1.schema.json`; they are not existing implemented interfaces. Reserve `content/published/dtm.v1.json` for the complete website snapshot and `public/media/content/` for its committed media. M02 must finalize concrete field names/types and example fixtures before M03 code consumes them.

- Envelope: supported schema version, site identifier `dtm`, stable snapshot revision and publication timestamp, locale allowlist exactly `vi` and `en`, public profile/site settings, posts, projects and media inventory. Never include credentials, private editorial fields or visitor inquiries.
- Records: stable IDs, explicit publication state/timestamp, locale, per-locale unique slug, title/excerpt, metadata, translation-group linkage, safe structured content blocks and approved project evidence/source links. Validate required fields, date formats, unknown versions, duplicate IDs/slugs, references and deterministic ordering with an explicit stable tie-breaker.
- Publication: only published records are allowed in the distributable snapshot. Future publisher projection excludes drafts; website validation rejects a draft-bearing distributable instead of silently accepting it. A valid explicit zero-post snapshot renders an honest empty state. Missing, malformed or unsupported snapshots fail the build; no silent demo/mock fallback or stale partial merge.
- Content: render an allowlist of typed blocks, escaped text and safe links. No executable markup, unsanitized HTML, arbitrary embed scripts or unsafe URL protocols. Genuine owner-approved facts and translations only; illustrative fixtures are test-only and never become public articles or portfolio claims.
- Media: normalized public `/media/content/...` references mapped to actual `public/media/content/...` files, dimensions/type and localized alt text (or explicit decorative treatment); reject traversal, remote content URLs, missing assets and case mismatches. References and files ship together. No image fetch from L540 or CMS CDN is required.
- Locale: translation groups connect only existing published counterparts. Missing EN means no EN detail route or hreflang link for that record; offer an honest localized unavailable/listing destination. Do not copy VI into a fabricated EN publication. Preserve `/vi/*` and `/en/*`; no `/vn` migration.
- Removal: each snapshot replaces the complete previous content set. Removed/unpublished entries disappear from generated params, cards, related links, sitemap and locale alternates on a clean build. Unresolved internal links fail validation; intentional removals must update referrers in the same commit. Unknown/removed slugs produce the static host's 404, not fallback content. No redirect is assumed without a separate reviewed requirement.

## Typed consumer and static routes

M03 introduces provider-independent `src/lib/content/` validation and typed selectors. All content consumers use the same validated snapshot, route inventory and media checks. Route generation and metadata cannot apply different publication/locale rules. Validate before exposing data to templates and before static params are returned; M09 must prove production build invocation reaches validation, not merely a standalone test command.

Planned routes: `/[locale]/blog/`, `/[locale]/blog/[slug]/`, `/[locale]/projects/[slug]/`, and `/[locale]/contact/`. Route modules own static params/data wiring; Antigravity templates own presentation and receive typed props. Keep Figma V2 public layouts, responsive reading/code/media behavior and honest empty states. Existing home content must not acquire links to routes that are absent from the export.

M06b derives canonical URLs, hreflang and sitemap entries from real generated pages; no phantom translation or draft URL. Preserve preview noindex behavior in `src/config/site.ts` and `src/app/robots.ts`; production metadata settings do not activate contact delivery. Static route requests continue bypassing Functions through unchanged `public/_routes.json`.

M06a makes the snapshot the actual public profile/settings and homepage content source, after U16 and remaining presentation are accepted. Server-side pages/layouts select validated localized identity/bio/settings and published project/journal records, then pass serializable typed props to Header, Hero, Footer and templates. The client Header never imports the filesystem-backed adapter. About and JsonLd consume the same validated public profile; JSON-LD serialization must escape unsafe script terminators. Preserve approved copy/visuals, verified facts and existing domain/base URL/production configuration; snapshot settings cannot override deployment or contact security configuration. Remove parallel hardcoded profile/publication authorities only after their approved values are represented in the snapshot. Fixtures must show profile/settings changes propagate and draft/removed home entries disappear. M06b follows with serialized shared locks for SEO/locale/media.

## Required evidence, not current pass claims

| Fixture/scenario | Observable acceptance and stage |
| --- | --- |
| Minimal valid published VI/EN records plus zero-post snapshot | M03 selectors deterministic; M04/M05 generate the exact expected HTML paths; zero posts show no fabricated cards. |
| Published and draft editorial input | M02 defines publisher projection; M03 test-only projection fixture excludes draft IDs, while a draft in distributable JSON fails validation; M04/M06 prove no draft route/card/sitemap URL. This is not a live CMS exporter test. |
| Invalid version, malformed field, duplicate slug, unsafe block/link, broken reference | M03 rejects each with actionable path diagnostics; M09 proves invalid checked-out input causes nonzero build, without network fallback. |
| Removed record between complete revisions | M04/M05/M06 compare clean exports: removed page, related/card links, alternate and sitemap entry absent; host serves 404. No stale `out/` artifacts may mask removal. |
| Missing file, traversal, case mismatch, missing meaningful alt, valid decorative media | M03/M06 fail invalid references; valid committed assets load with responsive dimensions and accessible treatment. |
| VI-only record, paired record with different localized slugs, invalid cross-locale reference | M03/M06 verify translation linkage, exported routes, locale switch destinations and real-only alternates; M08 checks both locales visually and by keyboard. |
| L540 unavailable, no CMS secrets | M09 clean checkout build succeeds with committed valid content/media; no CMS network requests. This proves website independence, not future publisher delivery. |

## Preserved operational boundaries

Protect `functions/api/contact.ts`, `src/components/ContactForm.tsx`, `src/config/contact.ts`, `public/_routes.json`, contact/security tests and provider settings. Presentation may wrap the existing form; disabled/unconfigured messaging stays truthful, no duplicate submission or delivery claim. No paid services, new visitor storage or analytics integration is authorized.

Keep package manager/toolchain, static normalization, secret scanner, existing scripts and read-only CI permissions. Current package scripts include `ci` (check + build + smoke), Pages runtime/failure paths, enabled-contact browser tests, general browser/axe tests and Lighthouse. M09 reruns appropriate existing suites on the final candidate; historical October 23 passes and production-only audit success do not prove new work, remote CI or deployment. The known development dependency audit finding remains documented externally and must not be silently marked resolved.
