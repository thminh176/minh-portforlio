# Published snapshot v1: DTM consumer contract

Status: M02 contract only, based on accepted M01 `f8af14092dd23f3638e5aae0154d4723a715de84`. No production snapshot, routes, publisher or CMS is created by this task. Normative schema: [published-snapshot.v1.schema.json](../../content/schema/published-snapshot.v1.schema.json), JSON Schema Draft 7. Schema and this document together define validation; JSON Schema alone cannot establish references, filesystem safety or publication eligibility.

## Ownership, identity and version

The website reads exactly `content/published/dtm.v1.json` plus committed files under `public/media/content/` from the checked-out repository at build time. It must build with L540 unavailable and no CMS credentials. No CMS fetch, Studio, API, admin, tunnel, database or duplicate Deploy Hook belongs to this website. Existing Contact and deployment/security config remain untouched. A future separate publisher exports a complete candidate and media in one reviewed Git commit; Git triggers the site build. No future CMS/exporter/deployment integration is claimed tested here.

`schemaVersion` is integer `1`; DTM root `siteId` is exactly `dtm`. `revision` is a producer-assigned immutable identifier matching the ID grammar, never reused for different bytes. It is not required to equal a Git SHA (which would create a self-reference). `exportedAt` is the candidate's UTC export instant, not a build-time clock. Identical input and revision must yield identical normalized UTF-8 JSON/media bytes; a rebuild must not rewrite timestamps.

The normative reusable wire core is `#/definitions/sharedEnvelope`, which accepts `siteId` enum `dtm` or `dvt` and uses the same closed profile/settings/post/project, publication, translation, structured block, link, metadata and media definitions. It is a concrete versioned wire format shared for future publishers/consumers, not merely conceptual guidance. Validate this definition directly when checking a generic export; the schema root composes it with `siteId: const dtm`, so a DVT envelope is valid against the shared core but rejected by the DTM root. A future DVT consumer must explicitly adopt this format and map its legacy fields; unsupported services/albums require a separately versioned extension, not arbitrary extra keys.

Both sites use semantic locales `vi/en` in the common wire format. Route segments are a site-owned mapping, never the locale identity: DTM `vi -> /vi/`, `en -> /en/`; DVT legacy `vi -> /vn/`, `en -> /en/`. `internalPath` in the common schema validates only canonical relative ASCII segment shape. The DTM business validator then restricts paths to the exact DTM route grammar/inventory below, rejecting `/vn/` even though its generic core path shape is valid. A DVT route adapter must apply DVT's mapping independently. No `vn` locale is allowed in either core JSON locale field, and no DVT route mapping may leak into DTM rendering.

Read-only references inspected: both copies of DVT `docs/CONTENT_CONTRACT.md` under `C:/Projects/dvt-website` and `C:/Users/thmin/orca/workspaces/dvt-website/m01-snapshot-audit`. They describe an older Sanity facade, PortableText, `vn` URLs and webhook deployment, not a published JSON schema. Their published-only selectors and sorting intent inform this contract; their Studio/env/webhook assumptions are not reused. DVT snapshot compatibility has not been implemented or tested; no DVT file is changed.

Version policy: v1 rejects unknown fields and unknown versions. Any added/removed field, block/link kind, protocol, collection or changed semantics requires a new integer schema version and a separately reviewed consumer migration. Clarifications that change no accepted instance or behavior may revise docs without a wire version change. No automatic coercion, stripping, unknown-version downgrade or old-schema fallback. Future multi-version support must explicitly enumerate versions and migrate atomically.

## Exact fields and shapes

Every object is closed (`additionalProperties: false`); fields are required unless marked optional below. `null` is never accepted. All strings are UTF-8 NFC, trimmed and nonblank unless explicitly allowed. Inline `text` and code `code` payloads preserve whitespace (including inline spaces around links and code indentation); they remain nonempty. No strings contain NUL/control characters except LF/TAB in code and LF in ordinary text. Limits in the schema are normative. Text is inert text, never parsed as HTML/Markdown/MDX; render escaped. The runtime must not load renderer code or scripts chosen by content.

| Object | Fields and meaning |
| --- | --- |
| Envelope | `schemaVersion`, `siteId`, `revision`, `exportedAt`, `locales` exactly `["vi","en"]`, `profiles`, `settings`, `posts`, `projects`, `media`. Arrays are always present, including empty collections. |
| Publication base (profile/settings/post/project) | `id`, `locale`, `status` exactly `published`, `publishedAt`, `updatedAt`. Timestamp form is real calendar UTC `YYYY-MM-DDTHH:mm:ssZ`, no offsets/fractions/leap seconds; `publishedAt <= updatedAt <= exportedAt`. Fixture dates below are synthetic, not factual publication dates. |
| Profile | Base plus `name`, `role`, `tagline`, `bioSummary`, `aboutStory` nonempty plain-text paragraph array, `hero` with `kicker`, nonempty `headlineLines` and `supporting`. Exactly one profile per locale. Existing approved profile/Hero copy must migrate without adding employment/metrics/claims; no domain field. |
| Settings | Base plus `siteTitle`, `siteDescription`, `journalTitle`, `journalEmptyText`, `featuredProjectIds` ordered unique localized project IDs, `recentPostLimit` integer 0..20. Exactly one per locale. Content only: no domain/base URL, production/indexing flag, provider URLs/keys, contact enablement, email delivery settings, environment overrides, CSS or scripts. Fixed application labels/security configuration remain in their established sources. |
| Post | Base plus `translationGroup`, `translations`, `slug`, `title`, `excerpt`, `tags`, `metadata`, `body`, `related`; optional meaningful `cover`. One full record supplies both detail and derived summary; no separate conflicting summary list. Actual first DTM snapshot has `posts: []` until owner publishes genuine approved articles. |
| Project | Base plus `translationGroup`, `translations`, `slug`, `title`, `summary`, `order` integer 0..1000000, `technologies` nonempty unique labels, required HTTPS `sourceUrl`, `metadata`, `body`, `related`; optional HTTPS `liveUrl` and meaningful `cover`. Source link is evidence, not a claim of deployment or usage. |
| Metadata | `title`, `description`; optional meaningful `image`. Canonical, hreflang, robots, base domain and structured-data identity URLs are derived by application from real routes/config, never supplied as overrides. |
| Translation | `locale`, `recordId`; array has 0..1 entries because DTM has two locales. It targets a different locale in the same collection and `translationGroup`; reciprocal linkage required. A singleton group has `translations: []`. Profile/settings locales are paired by their singleton role, not translation arrays. |
| Related reference | `collection` (`posts` or `projects`) and `recordId`. Same locale, published target, no duplicate/self reference. It does not itself imply a translation relationship. |
| Media inventory | `id`, normalized `path`, `mimeType`, actual integer `width`/`height` 1..16384. Shared across locales; per-use alt is localized on the owning record. No filename or URL from CMS is trusted directly. |

ID grammar: 1..80 characters, lowercase ASCII letter first, then lowercase ASCII letters/digits with single internal hyphens; IDs immutable across title/slug edits and unique across **all** profiles/settings/posts/projects/media. Translation-group IDs are stable grouping keys, unique per collection and independent of record IDs. Slugs are 1..100 lowercase ASCII alphanumeric segments with single internal hyphens; no leading/trailing hyphen, dots, whitespace, slash, percent encoding, Unicode, query or hash. Slugs are unique by `(collection, locale, slug)`; the same slug across post/project collections is allowed because route prefixes differ.

Stored array order: `profiles` and `settings` vi then en; `posts` descending `publishedAt`, then ascending ASCII `id`; `projects` ascending `order`, then ascending ASCII `id`; `media` ascending ASCII `id`. Consumers filter by locale without changing these relative orders. `translations` has at most one target; `related` sorts collection then ID; `tags` sorts ascending Unicode code-point order after NFC; technologies/body/inline/list items preserve editorial order. `featuredProjectIds` deliberately preserve explicit editorial order; never duplicate a separate hardcoded home project list. Home recent posts are the first N localized posts from the validated sorted collection.

## Safe blocks and links

`body` is a nonempty array of this closed union. No arbitrary attributes, class/style, HTML, JSX, MDX, script, iframe, embed, event handler or provider-specific PortableText objects are allowed. Code content may contain markup as escaped inert code; never execute it. Render the article title as h1 and permit only body h2/h3/h4; reject heading-level jumps (first heading h2; subsequent level at most previous + 1).

| `type` | Exact payload |
| --- | --- |
| `paragraph` | `children`: nonempty inline array. |
| `heading` | `level`: 2, 3 or 4; `text`: plain string. |
| `list` | `ordered`: boolean; `items`: nonempty array of nonempty inline arrays; no recursive blocks. |
| `quote` | `children`: nonempty inline array; optional plain `attribution`. |
| `code` | `language`: text/javascript/typescript/json/html/css/bash/powershell/python/sql/yaml; `code`: inert string, LF/TAB allowed. No runtime language loader selected by arbitrary input. |
| `image` | `image`: image-use object below. |

Inline union: `{ "type": "text", "text": "..." }` or `{ "type": "link", "label": "...", "target": LINK }`. No nested inline links. External links rendered with safe application-owned rel/target behavior. Links cannot trigger content HTTP fetching during builds.

LINK is exactly one of:

- `{ "kind": "external", "url": "https://github.com/thminh176/minh-portforlio" }`. Only absolute HTTPS with lowercase ASCII hostname and optional explicit port 443. WHATWG URL validation additionally rejects userinfo, empty/invalid host labels, IP literals, localhost/.localhost/.local hosts, backslashes, controls, encoded controls and malformed percent escapes. No `http`, `javascript`, `data`, `file`, protocol-relative URLs or arbitrary ports. External availability is an editorial review concern, not a build-time network dependency. External URLs may have query/hash; local paths may not. Existing app-owned mailto/tel contact links remain outside this content contract.
- `{ "kind": "record", "collection": "posts", "recordId": "fixture-post-vi" }`. Resolve by stable ID to an existing published same-locale record and its generated canonical path. Cross-locale navigation uses translation linkage, not a disguised related/content link.
- `{ "kind": "internal", "path": "/vi/blog/fixture-note/" }`. Canonical relative path only: `/`, `/{vi|en}/`, localized `about/`, `contact/`, `blog/`, `blog/{slug}/` or `projects/{slug}/`, with trailing slash. No bare relative `../note`, `/vn/`, double slash, encoding, query/hash, backslash or absolute internal URL. Path must resolve in the actual published route inventory and match owning locale unless it is `/`. The shared schema validates segment shape only; this enumerated DTM grammar and locale mapping are mandatory M03 business checks. A syntactically valid detail path to a removed/missing record fails. A fixed page such as Contact cannot be exposed until its route actually exports; stage-specific consumers check their actual route inventory.

An image use is `{ "mediaId": "...", "decorative": false, "alt": "meaningful localized description", "caption": "optional localized caption" }` or `{ "mediaId": "...", "decorative": true, "alt": "" }`. Meaningful alt must be nonblank descriptive owner-reviewed text in the owning locale, not a filename/ID/generic placeholder. Schema can enforce shape/length but not human meaning/language. Decorative use forbids caption and is allowed only within body blocks. Cover/metadata images must be meaningful. A shared media asset may have different localized descriptions at each use. Templates render dimensions, escaped captions and appropriate empty alt for decoration.

Media paths start `/media/content/` and have lowercase ASCII alphanumeric/hyphen directory/filename segments and raster extension `.png`, `.jpg`, `.jpeg`, `.webp` or `.avif`. Resolve to `public` plus this exact path; do not decode or normalize unsafe input into an accepted path. No dot segments, `%`, encoded separators, repeated separators, backslashes, query/hash, remote origins, SVG, HTML or executable content. Match `.jpg/.jpeg -> image/jpeg`, `.png -> image/png`, `.webp -> image/webp`, `.avif -> image/avif`. Verify real raster signature/decoded dimensions match declared type/size, exact case-sensitive directory entries, regular committed file, realpath contained under `public/media/content/`, no symlink/junction escape. File existence and valid image decoding are M03/M06 checks, not JSON Schema claims. Use existing local tooling for raster inspection; an unavailable codec must fail with an actionable unsupported-media diagnostic, never trigger a dependency download or silently skip validation. No media file is added by M02.

## Publication, replacement and validation algorithm

Producer eligibility is explicit: only owner-approved records with editorial state published and publication time <= export time may enter export. Editorial drafts/archived entries, private notes, credentials, author emails, CMS IDs/tokens and unpublished translations must be excluded **before** serialization using an explicit allowlist projection; never serialize an entire CMS record. Export schema has no draft flag/private-field slot. `status: draft` or `archived`, an extra `privateNotes` field or an unknown block fails closed, even if every other record is valid. Website validator does not repair or filter invalid distributables and never falls back to demo/old content. Empty posts is successful validation, not an error fallback.

M03 validator must apply these steps before exposing any facade data, generating static params or metadata:

1. Read the exact committed UTF-8 file, reject missing/malformed JSON, duplicate JSON object keys (before ordinary parsing loses them), BOM, unsupported version/site and schema violations. Validate Draft 7 with date-time/URI formats enabled, without mutation/coercion/default insertion; do not resolve remote schemas or network references. Diagnostic includes JSON pointer and rule without leaking private input values.
2. Enforce NFC/trim/control/length semantics (preserving inline/code whitespace), valid calendar UTC timestamps and `publishedAt <= updatedAt <= exportedAt`. Enforce the required locale pair, singleton profiles/settings, all ID/slug uniqueness, date/order arrays and tie-breakers. Do not derive export publication status from build wall-clock time.
3. Build post/project indexes and translation groups: at most one record per locale/group/collection; paired groups have reciprocal translations to exactly the other record; singleton has none. Reject missing, same-locale, wrong-collection or wrong-group targets, and cycles other than the intended reciprocal pair. No fabricated EN copy/route/hreflang for a VI-only record; locale switch falls back honestly to the existing localized listing.
4. Resolve every related/record/internal link, settings featured ID, media ID and metadata/cover/body reference. Require same-locale targets for content/featured refs; no self/duplicate related refs. Build route inventory from valid published records and actual implemented fixed pages; reject dangling links. No route inventory is supplied by untrusted JSON. Decode safe external URLs for the additional URL rules above without allowing rewritten unsafe input.
5. Validate every media inventory file even if currently unused; unique paths, exact case, containment, committed regular file, raster signature and dimensions. Resolve every use, alt/decoration rules, and manually review meaningful/localized alt. Empty media is valid when there are no media refs.
6. Validate all before returning typed public values. Fail validation/build on any failure with no partial export. Server-only loader selects profile/settings and content; client Header receives serializable typed props and must not bundle a filesystem loader. Escape rendered text/code and safely serialize JSON-LD (`<` escaped) rather than trusting content as script.

Full replacement: candidate is the whole published set, not a patch or append stream. Removed/unpublished records vanish from params/routes/cards/home featured IDs/related links/alternates/sitemap; producer repairs all referrers and translations in the same atomic snapshot+media commit. Remove obsolete output by a clean export; stale `out/` must not prove a removal passed. Unknown/removed slug gets static host 404; no automatic redirect or fallback article. Rollback restores a known complete snapshot and matching media commit, never JSON alone. No runtime build contacts L540 or remote CMS/CDN.

## Valid zero-post envelope (test fixture)

This full example intentionally has no projects/media either, to isolate valid empty-state behavior. Real initial DTM input must preserve the two already approved projects/localized facts and featured selections when M03/M06a integrates them; empty fixture is not a replacement for accepted production copy. Profile text below is copied from current approved config/Hero; settings descriptions and publication times are illustrative. None of these examples is installed as `content/published/dtm.v1.json` by M02.

```json
{
  "schemaVersion": 1,
  "siteId": "dtm",
  "revision": "fixture-zero-001",
  "exportedAt": "2026-10-26T00:00:00Z",
  "locales": [
    "vi",
    "en"
  ],
  "profiles": [
    {
      "id": "profile-vi",
      "locale": "vi",
      "status": "published",
      "publishedAt": "2026-10-25T00:00:00Z",
      "updatedAt": "2026-10-25T00:00:00Z",
      "name": "Đàm Thiên Minh",
      "role": "Web Developer",
      "tagline": "Mình làm web và chia sẻ các dự án cá nhân cùng ghi chép học tập.",
      "bioSummary": "Mình làm các dự án web, có kinh nghiệm triển khai hạ tầng và đang học thêm về backend, DevOps.",
      "aboutStory": [
        "Mình là Minh. Mình làm các dự án web và chia sẻ ghi chép về quá trình học, xây dựng chúng tại đây.",
        "Mình đã làm việc với ứng dụng Next.js và triển khai trên Ubuntu Server, sử dụng Docker, PostgreSQL và Cloudflare."
      ],
      "hero": {
        "kicker": "Đàm Thiên Minh / Web Developer",
        "headlineLines": [
          "Mình làm web.",
          "Đây là những gì",
          "mình đang xây."
        ],
        "supporting": "Mình chia sẻ các dự án cá nhân và ghi chép về quá trình học, làm web ở đây."
      }
    },
    {
      "id": "profile-en",
      "locale": "en",
      "status": "published",
      "publishedAt": "2026-10-25T00:00:00Z",
      "updatedAt": "2026-10-25T00:00:00Z",
      "name": "Thien Minh Dam",
      "role": "Web Developer",
      "tagline": "I build for the web and share personal projects and learning notes.",
      "bioSummary": "I work on web projects, have deployment experience and am learning more about backend engineering and DevOps.",
      "aboutStory": [
        "I'm Minh. I work on web projects and share notes here about learning and building them.",
        "I have worked with Next.js applications and deployments on Ubuntu Server, using Docker, PostgreSQL and Cloudflare."
      ],
      "hero": {
        "kicker": "Thien Minh Dam / Web Developer",
        "headlineLines": [
          "I build for the web.",
          "Here's what I'm",
          "working on."
        ],
        "supporting": "A place for my personal projects and notes on learning and building for the web."
      }
    }
  ],
  "settings": [
    {
      "id": "settings-vi",
      "locale": "vi",
      "status": "published",
      "publishedAt": "2026-10-25T00:00:00Z",
      "updatedAt": "2026-10-25T00:00:00Z",
      "siteTitle": "Đàm Thiên Minh",
      "siteDescription": "Portfolio cá nhân của Đàm Thiên Minh.",
      "journalTitle": "Ghi chép về việc học và làm web",
      "journalEmptyText": "Mình chưa đăng bài nào. Khi có ghi chép đủ rõ, mình sẽ chia sẻ ở đây.",
      "featuredProjectIds": [],
      "recentPostLimit": 3
    },
    {
      "id": "settings-en",
      "locale": "en",
      "status": "published",
      "publishedAt": "2026-10-25T00:00:00Z",
      "updatedAt": "2026-10-25T00:00:00Z",
      "siteTitle": "Thien Minh Dam",
      "siteDescription": "Personal portfolio of Thien Minh Dam.",
      "journalTitle": "Notes on learning and building for the web",
      "journalEmptyText": "No posts yet. I'll share notes here when they're ready.",
      "featuredProjectIds": [],
      "recentPostLimit": 3
    }
  ],
  "posts": [],
  "projects": [],
  "media": []
}
```

## Published post fragment (test-only)

Validate against `#/definitions/post`, or insert as the sole post in the zero-post envelope for a full schema/business test. This is deliberately named a fixture; it is not a genuine article or permission to publish one. It has no EN translation and must yield only `/vi/blog/fixture-note/`; no `/en/blog/fixture-note/` or alternate is generated.

```json
{
  "id": "fixture-post-vi",
  "locale": "vi",
  "status": "published",
  "publishedAt": "2026-10-25T00:00:00Z",
  "updatedAt": "2026-10-25T00:00:00Z",
  "translationGroup": "fixture-note",
  "translations": [],
  "slug": "fixture-note",
  "title": "Test-only note",
  "metadata": {
    "title": "Test-only note",
    "description": "Synthetic fixture; never publish this example."
  },
  "body": [
    {
      "type": "paragraph",
      "children": [
        {
          "type": "text",
          "text": "Test-only published projection."
        },
        {
          "type": "link",
          "label": "About",
          "target": {
            "kind": "internal",
            "path": "/vi/about/"
          }
        }
      ]
    },
    {
      "type": "heading",
      "level": 2,
      "text": "Fixture heading"
    },
    {
      "type": "list",
      "ordered": false,
      "items": [
        [
          {
            "type": "text",
            "text": "A fixture item"
          }
        ]
      ]
    },
    {
      "type": "quote",
      "children": [
        {
          "type": "text",
          "text": "Fixture quote"
        }
      ]
    },
    {
      "type": "code",
      "language": "json",
      "code": "{\"fixture\":true}"
    }
  ],
  "related": [],
  "excerpt": "Synthetic example for validator tests only.",
  "tags": [
    "fixture"
  ]
}
```

## Approved project shape (illustrative fragment)

Validate against `#/definitions/project`, or insert into the zero envelope and select its ID in VI settings. Facts/source come from the existing accepted `FeaturedMcpProject.tsx`; timestamps and slug choice are illustrative, not publication evidence. The other approved project is the bilingual Next.js/TypeScript/Tailwind static portfolio, source `https://github.com/thminh176/minh-portforlio`, described in `FeaturedPortfolioProject.tsx`. M03 must preserve both genuine project descriptions/localized versions; do not invent live usage, metrics or new project claims. Profile config remains the baseline for biography; current C01 personal copy supersedes older A02 AI self-description.

```json
{
  "id": "project-mcp-vi",
  "locale": "vi",
  "status": "published",
  "publishedAt": "2026-10-25T00:00:00Z",
  "updatedAt": "2026-10-25T00:00:00Z",
  "translationGroup": "project-mcp",
  "translations": [],
  "slug": "mcp-project-assistant",
  "title": "MCP Project Assistant",
  "metadata": {
    "title": "MCP Project Assistant",
    "description": "MCP server chạy local để đọc mã, tìm kiếm và xem Git diff."
  },
  "body": [
    {
      "type": "paragraph",
      "children": [
        {
          "type": "text",
          "text": "MCP server chạy local giúp AI đọc mã, tìm kiếm và xem Git diff trong workspace đã chọn. Thay đổi được xem trước trước khi áp dụng."
        }
      ]
    }
  ],
  "related": [],
  "summary": "MCP server chạy local giúp AI đọc mã, tìm kiếm và xem Git diff trong workspace đã chọn. Thay đổi được xem trước trước khi áp dụng.",
  "order": 0,
  "technologies": [
    "TypeScript",
    "MCP SDK",
    "Windows / WSL"
  ],
  "sourceUrl": "https://github.com/thminh176/mcp-project-assistant"
}
```

## Media and image fragment (shape-only)

First validate against `#/definitions/media`; second against `#/definitions/block`. A full envelope using these requires an actual committed decoded 640x480 PNG, which M02 does not create. Therefore these are schema-valid fragments, not a filesystem-validation pass.

```json
{
  "id": "fixture-image",
  "path": "/media/content/fixture-image.png",
  "mimeType": "image/png",
  "width": 640,
  "height": 480
}
```

```json
{
  "type": "image",
  "image": {
    "mediaId": "fixture-image",
    "decorative": false,
    "alt": "Ảnh kiểm thử hình chữ nhật, không phải tài sản xuất bản."
  }
}
```

## Negative fixtures and meaningful acceptance

Each row is an explicit mutation of the zero envelope plus the post/project fragment as needed; keep the original as an immutable test input. Schema-valid business failures are intentionally distinct from structural rejection. M03 must encode these as executable fixtures and assert nonzero validation/build where indicated; M04-M06/M09 prove final exported pages/links/assets rather than merely testing an unused validator.

| Mutation/scenario | Expected result |
| --- | --- |
| Set `schemaVersion` to 2 or `siteId` to dvt; add root `baseUrl` or `privateNotes` on any object | DTM root schema rejects all; the shared core alone accepts siteId dvt, but still rejects unknown versions and fields. Never downgrade, strip fields or fallback. |
| Add post with `status: "draft"` or `"archived"` | Schema reject; no partial public projection by consumer. |
| Duplicate the same post, or clone with another ID but same VI slug | Schema allows duplicate entries; M03 uniqueness reject for global ID or collection/locale/slug. |
| Set media path `/media/content/../secret.png`, `/media/content/%2fsecret.png`, `/media/content/image.png?x=1`, `https://cms.example/image.png`, or `/media/content/image.svg` | Schema reject. Valid-looking missing PNG or case-mismatched disk entry fails filesystem check. |
| Link kind internal path `/vi/blog/missing/` | Shape valid; published route reference reject. `/vn/blog/note/` also passes generic shape but fails DTM locale/route mapping; `../note`, `/vi/blog/a%2fb/`, `//host/x` fail schema. |
| Related/featured/media/translation ID `missing-record` | Shape valid; unresolved target reject. Wrong-locale featured ID or wrong-group translation also reject. |
| External URL `javascript:alert(1)`, `http://example.com`, `https://user@example.com/` | Schema reject; `https://localhost/` passes basic shape but mandatory URL business check rejects. |
| Blank alt, decorative cover, raw `html` block, extra `onClick`, invalid date, heading jump h2 -> h4 | Alt/cover/block/property/date shape rejects where expressible; heading jump and trim-only alt require business validator. |
| Add VI/EN paired posts with different slugs and reciprocal IDs/group; remove EN counterpart without repairing VI translations | Pair valid; unrepaired removal fails. Repaired VI singleton generates no EN alternate or detail; switch to existing EN blog listing. |
| Remove a project still featured/related; remove a post linked by raw internal path | Reference failure; repair all referrers in same candidate, then clean export has no removed HTML/card/sitemap/alternate. |
| Change a profile/settings content field; reorder tied posts/projects; missing snapshot; L540 offline | Valid changed content propagates to public props; invalid order rejects; missing snapshot fails; valid checked-out JSON/media builds with L540 offline. No live CMS pipeline claim. |

Test-only editorial projection recipe: create editorial input containing the post fragment above as published plus copies with IDs `fixture-draft` and `fixture-archived`, editorial states draft/archived and optional private notes. Allowlist only published eligible records and public fields, producing exactly the original post fragment. Assert excluded IDs/private fields are absent, then independently inject a draft/private field into the distributable and assert rejection. This tests projection semantics in a fixture, not a future CMS implementation. Do not add draft-shaped definitions to the distributable schema to make this test pass.

Validation evidence belongs in `C:/Projects/dtm-portforlio/docs/evidence/M02/`: parse schema JSON, validate Draft 7 schema, compile with available local Ajv, validate the full zero envelope/post insertion/project insertion and fragment examples, and test structural mutations. Reference/ordering/real-media checks above are explicit M03 requirements, not passes inferred from Ajv. No new dependency installation or application build is necessary for this schema/docs task. Main merge, deployment, publisher automation and L540 CMS remain outside M02.
