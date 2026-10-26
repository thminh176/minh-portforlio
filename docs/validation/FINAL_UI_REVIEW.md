# Final Responsive and Accessibility UI Review (M08 / M08-R)

- **Date:** 2026-10-26 (Asia/Saigon)
- **Reviewer:** Antigravity (UI Owner)
- **Worktree:** `C:/Users/thmin/orca/workspaces/dtm-portforlio/dtm-v2-u01`
- **Branch:** `thminh176/dtm-m08-final-ui`
- **Base Commit:** `0c5e8970982bae144c4460104af01ea1af668bd0`
- **Historical Evidence Directory:** `C:/Projects/dtm-portforlio/docs/evidence/M08`
- **Corrected Evidence Directory:** `C:/Projects/dtm-portforlio/docs/evidence/M08-R`
- **Prior Article Review Evidence:** `C:/Projects/dtm-portforlio/docs/evidence/M04b2-R/central-review` (Task `task_a36a186f37b7`)

---

## 1. Scope & Review Objectives

This document delivers the final responsive and accessibility review across all 14 localized production routes (`/en/`, `/vi/`, `/en/about/`, `/vi/about/`, `/en/contact/`, `/vi/contact/`, `/en/blog/`, `/vi/blog/`, `/en/projects/`, `/vi/projects/`, and 4 project detail routes) plus isolated test fixtures for populated articles and empty project listings at 320px, 390px, 768px, and 1440px viewports.

This M08-R revision corrects documentation discrepancies identified during coordinator review:
1. Replaces the inaccurate snapshot hash (`92b1...`) with the exact measured byte SHA256 (`cd344c191cac370f2715ff0b8f3d26aa183f24c5b521aaadfc7de92b68d565b6`).
2. Corrects touch target claims by enumerating all small targets from historical JSON and evaluating them under WCAG 2.2 SC 2.5.8 (Level AA, minimum 24x24px / spacing exception), explicitly withdrawing the claim of universal 44px controls.
3. Replaces theoretical color calculations with actual computed DOM styles and measured contrast ratios from live browser inspection, detailing the exact axe-core non-text character incomplete heuristic without claiming entire-site WCAG AAA.
4. Archives actual raw command exit logs for `pnpm check` and `pnpm test:browser` with recorded exit codes (0).
5. Captures and enumerates all incomplete nodes without sampling or omissions, and cites prior central article review evidence (`M04b2-R/central-review`) for article fixtures.

---

## 2. Scoped UI Defect Fixes Preserved (from Commit `0c5e897`)

1. **`src/components/Hero.tsx` (Presentation / Text Spacing):**
   - *Defect:* Adjacent block `<span>` elements for multiline headline lines were rendered without text node whitespace separation, causing screen readers and DOM text readers to concatenate words without spaces (`"I build for the web.Here's what I'mworking on."`), failing text naturalness and automated verification in Phase 2.
   - *Fix:* Inserted trailing inter-line spacing `{idx < profile.hero.headlineLines.length - 1 ? ' ' : ''}` inside each block span, ensuring natural spacing in screen readers and DOM text representations while preserving exact visual line wrapping.

2. **`src/components/projects/ProjectListing.tsx` (Accessibility / ARIA Role):**
   - *Defect:* Technologies container `<div aria-label="...">` lacked an explicit ARIA role. Under WAI-ARIA standards and axe-core rules, a generic `<div>` cannot have an accessible name without a role, which risks triggering `aria-prohibited-attr`.
   - *Fix:* Added `role="group"` to the container (`<div role="group" className="flex flex-wrap items-center gap-2 pt-1" aria-label={...}>`), matching the approved pattern in `ArticleView.tsx`.

---

## 3. Verification & Command Execution Matrix

| Suite / Check | Command | Exit Code | Result | Evidence / Details |
|---|---|---|---|---|
| Workspace Check | `pnpm.cmd check` | **0** | **PASS** | 222 files audited for secrets, 117 mock API assertions verified, 0 lint errors, 0 type errors. Raw log: [`check.log`](file:///C:/Projects/dtm-portforlio/docs/evidence/M08-R/check.log) |
| Browser Verification | `pnpm.cmd test:browser` | **0** | **PASS** | 14 phases, 32 Axe runs, 0 violations, 0px overflow, sticky header, drawer Escape, theme persistence. Raw log: [`test-browser.log`](file:///C:/Projects/dtm-portforlio/docs/evidence/M08-R/test-browser.log) |
| Navigation Matrix | `pnpm.cmd test:browser:navigation` | **0** | **PASS** | 34 route/viewport rows, 0 header axe issues, reciprocal route persistence, resize dismissal. |
| Historical 76-Row Audit | `m08-comprehensive-review.mjs` | **0** | **PASS** | 76 evaluations across 14 published routes + populated article + empty project fixtures (320, 390, 768, 1440px). 0px overflow, 1 H1 per page, 0 axe violations. Archived at `C:/Projects/dtm-portforlio/docs/evidence/M08`. |
| Targeted Real-Export Scan | `targeted-scan.mjs` | **0** | **PASS** | Evaluated all 14 published routes across 4 viewports (56 fresh evaluations); complete enumeration of all 48 incomplete occurrences across 6 distinct DOM nodes; live computed styles and contrast measured. Report: [`targeted-export-scan.json`](file:///C:/Projects/dtm-portforlio/docs/evidence/M08-R/targeted-export-scan.json) |
| Prior Article Fixture Evidence | `verify-final-review.mjs` (M04b2-R) | **0** | **PASS** | 20 responsive rows and 10 axe audits on populated article fixtures confirmed 0 violations, 0 `aria-prohibited-attr`, and measured arrow-only incompletes. Archived at `C:/Projects/dtm-portforlio/docs/evidence/M04b2-R/central-review`. |

---

## 4. Target Size & Interactive Controls Analysis (WCAG 2.2 SC 2.5.8)

In the initial M08 documentation, it was claimed that all interactive controls met a "universal 44px minimum touch target". As identified by the coordinator, this conflicted with `sampleSmallControls` in `m08-review-report.json`.

### 4.1 Enumeration of Small Controls from Historical JSON & Real-Export Scan

1. **Header & Footer Navigation Links ("Home", "About" in English routes):**
   - **Historical JSON Rows:** 28 rows (all 7 English routes `/en/`, `/en/about/`, `/en/contact/`, `/en/blog/`, `/en/projects/`, and 2 project detail routes at 320, 390, 768, and 1440px).
   - **Measured Dimensions:**
     - `"Home"`: `34.3px` (width) x `44.0px` (height)
     - `"About"`: `36.6px` (width) x `44.0px` (height)
   - **Reason:** The vertical height satisfies `min-h-[44px]` (44px), but because English words "Home" and "About" have short character lengths, their rendered text bounding width is 34.3px and 36.6px. (In contrast, Vietnamese labels "Trang chủ" and "Giới thiệu" exceed 44px in both dimensions).
   - **WCAG 2.2 SC 2.5.8 Compliance (Level AA):**
     - Success Criterion 2.5.8 requires a target size of at least **24 by 24 CSS pixels**.
     - Both dimensions (`34.3px x 44px` and `36.6px x 44px`) exceed 24x24px.
     - In addition, footer navigation items have a container gap of `gap-6` (**24px horizontal separation**), satisfying the spacing exception.

2. **Project Card Title Links:**
   - **Measured Dimensions:** Widths range from `189.2px` to `303.6px`; rendered heights are `31.0px` (mobile/tablet) to `39.0px` (desktop).
   - **WCAG 2.2 SC 2.5.8 Compliance:** Both dimensions comfortably exceed the 24x24 CSS pixel minimum. Furthermore, these represent heading title links where the inline text flow exception applies.

### 4.2 Clarification
The claim of "universal 44px on all interactive controls" is hereby withdrawn as inaccurate. All controls strictly comply with **WCAG 2.2 Level AA SC 2.5.8 (Target Size Minimum)** by exceeding 24x24 CSS pixels and providing at least 24px perimeter spacing.

---

## 5. Axe-Core Incompletes & Color Contrast Resolution

### 5.1 Incomplete Rules Summary
Axe-core reported **0 violations** across all evaluations. The only incomplete rule recorded was `color-contrast`, totaling 48 evaluation occurrences across all 14 published routes and 4 viewports.

### 5.2 Full Enumeration of All 6 Distinct Incomplete DOM Nodes

All 48 occurrences correspond to exactly **6 distinct DOM elements**, none of which were omitted or sampled away:
1. `li:nth-child(1) > article > .pt-2 > a > span[aria-hidden="true"]` (`→` arrow on Project 1 card, `/en/projects/` and `/vi/projects/`).
2. `li:nth-child(2) > article > .pt-2 > a > span[aria-hidden="true"]` (`→` arrow on Project 2 card, `/en/projects/` and `/vi/projects/`).
3. `.sm:flex-row > a > span[aria-hidden="true"]` (`←` top back-link arrow, `/en/projects/mcp-project-assistant/` and `/vi/projects/mcp-project-assistant/`).
4. `.pt-10 > a > span[aria-hidden="true"]` (`←` bottom back-link arrow, `/en/projects/mcp-project-assistant/` and `/vi/projects/mcp-project-assistant/`).
5. `.sm:flex-row > a > span[aria-hidden="true"]` (`←` top back-link arrow, `/en/projects/personal-portfolio/` and `/vi/projects/portfolio-ca-nhan/`).
6. `.pt-10 > a > span[aria-hidden="true"]` (`←` bottom back-link arrow, `/en/projects/personal-portfolio/` and `/vi/projects/portfolio-ca-nhan/`).

*(For populated article fixtures, prior central review `M04b2-R/central-review` verified that the only incomplete nodes are identical back-link arrows `<span aria-hidden="true">←</span>`.)*

### 5.3 Live Computed Styles & Measured Contrast Ratios

Direct DOM inspection in Microsoft Edge / Chromium via Playwright measured:
- **Element Content:** Unicode arrow glyphs (`→` / `←`)
- **Live Computed Foreground Color:** `rgb(128, 55, 36)` (`#803724`, `var(--color-brick-deep)`)
- **Live Computed Background Color:** `rgb(245, 244, 239)` (`#F5F4EF`, `var(--color-paper)`)
- **Measured Contrast Ratio:** **7.659:1**
- **WCAG Thresholds:** Exceeds WCAG AA minimum for normal text (4.5:1) and graphical objects / user interface components (3.0:1).
- **Axe Incomplete Reason:** Axe-core flags these elements with `failureSummary: "Fix any of the following: Element content contains only non-text characters"`. Because the spans contain only Unicode arrow glyphs, axe-core's automated contrast algorithm cannot determine if the glyph is semantic text and requires human verification.
- **Assistive Technology Impact:** All arrow glyphs carry explicit `aria-hidden="true"` and accompany fully descriptive text links (e.g. "View case study", "Back to projects"). They are purely decorative visual affordances.

### 5.4 Correction on Contrast Claims
Previous M08 documentation contained conflicting contrast numbers (e.g., claiming 13.9:1 vs 15.65:1, and 11.7:1 vs 14.211:1) and made blanket assertions of "exceeding WCAG AAA". These theoretical claims are replaced by the empirical measurement of the specific flagged elements (7.659:1). We do not claim that the entire application achieves WCAG AAA across all hypothetical components.

---

## 6. Targeted QA Verifications

1. **Contact Page & External Provider Isolation:**
   - Both `/en/contact/` and `/vi/contact/` render the contact form in an unconfigured state with the submit button disabled.
   - Public contact mechanisms are provided via native protocols:
     - Email: `mailto:thminh.176.vn@gmail.com`
     - Telephone: `tel:+84777747704`
   - Network monitoring during contact page navigation confirmed **0 external provider requests** (no calls to Cloudflare Turnstile `challenges.cloudflare.com`, Resend, or Telegram). Approved font requests to `fonts.gstatic.com` were logged separately.
   - Visual captures: [`contact-en-desktop.png`](file:///C:/Projects/dtm-portforlio/docs/evidence/M08-R/screenshots/contact-en-desktop.png), [`contact-vi-mobile.png`](file:///C:/Projects/dtm-portforlio/docs/evidence/M08-R/screenshots/contact-vi-mobile.png).

2. **Keyboard Skip Link & Focus Outline:**
   - On page load, initial `Tab` keypress focuses `.skip-link` (`a[href="#main-content"]`), measuring 208px x 52px with a visible `2px solid rgb(183, 81, 53)` outline.
   - Pressing `Enter` successfully shifts focus to `<main id="main-content">`.
   - Subsequent `Tab` navigation through interactive elements verifies visible focus rings across all navigation links and buttons (`outline-width: 2px`).
   - Visual captures: [`skip-link-en-focused.png`](file:///C:/Projects/dtm-portforlio/docs/evidence/M08-R/screenshots/skip-link-en-focused.png), [`focus-ring-nav.png`](file:///C:/Projects/dtm-portforlio/docs/evidence/M08-R/screenshots/focus-ring-nav.png).

3. **Mobile Drawer Navigation (390px):**
   - Clicking menu button opens `#mobile-navigation` with `aria-expanded="true"`.
   - Pressing `Escape` closes the drawer, sets `aria-expanded="false"`, and restores keyboard focus to `button[aria-controls="mobile-navigation"]`.
   - Re-opening drawer and resizing viewport to 1024px auto-closes the mobile drawer.
   - Visual capture: [`mobile-drawer-en-open.png`](file:///C:/Projects/dtm-portforlio/docs/evidence/M08-R/screenshots/mobile-drawer-en-open.png).

4. **Reduced Motion CSS Support:**
   - Under `prefers-reduced-motion: reduce`, `window.matchMedia` returns `true`.
   - Root document scroll behavior evaluates to `auto` and transition duration evaluates to `1e-06s`, suppressing vestibular motion discomfort.

---

## 7. Published Content Snapshot Integrity

- **Snapshot File:** `content/published/dtm.v1.json`
- **Measured SHA256:** `cd344c191cac370f2715ff0b8f3d26aa183f24c5b521aaadfc7de92b68d565b6`
- **Published Record Inventory:**
  - Projects: **4** (`project-mcp-en`, `project-mcp-vi`, `project-portfolio-en`, `project-portfolio-vi`)
  - Posts: **0**
  - Media: **0**
- *Note:* The previously cited SHA256 (`92b1a52b8fbce4e6f4a86b3cb7cfb62e49c719ef16eb30b355819df515e02ba4`) was an incorrect value in the prior report. The current byte hash is stable and verified.

---

## 8. Remaining Limitations

1. **Static Export Mode:** The site is audited in static export mode (`out/`). Contact API submissions fail closed safely without live Cloudflare Turnstile and Resend credentials, as verified in `scripts/test-contact-api.mjs`.
2. **Axe-Core Non-Text Incomplete Heuristic:** Axe-core cannot automatically evaluate contrast on Unicode arrow glyphs (`→`, `←`), requiring manual verification of effective background and computed colors.
3. **Target Size Thresholds:** Navigation targets satisfy WCAG 2.2 Level AA (24x24px) but do not meet the AAA recommendation of 44x44px in width due to concise English labels.
