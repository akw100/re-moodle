# Theme brief (round 2), shared by every theme agent

Project: `/Users/ayeletwasserman/Projects/nicer-moodle`, a Chrome extension (MV3) that reskins HUJI's Moodle 4.x. HUJI uses the `osiris` theme, a Boost child on Bootstrap 5. Read `README.md`, `src/base.css` (the `--nm-*` tokens and shared rules), `src/core.js`, and `manifest.json` first.

The user tried round 1 on the real site and said: *"some of them feel not the nicest, we can do better."* The bar is **design-director quality**. Each theme follows exactly ONE reference app's design system so closely that someone who knows the app recognizes it instantly. It also has to work flawlessly on the real Moodle markup.

## Your file and rules
- You own exactly one file: `themes/<id>.css`. Throwaway scripts and screenshots go in `tests/tmp/` (prefix them with your id). Don't edit anything else. Don't git commit.
- Scope **every** rule under `html[data-nm-theme="<id>"]`. Nesting is fine.
- **Fonts:** Chrome ignores `@import` in extension CSS. Declare Google fonts with `@font-face` in your file, pointing at the `fonts.gstatic.com` woff2 URLs. Get them with `curl -s -A "Mozilla/5.0 Chrome/141" "https://fonts.googleapis.com/css2?family=<Family>:wght@400;500;600;700&display=swap"`. Use a private family name (e.g. `"Fal Sans"`). Always add a Hebrew fallback ("Noto Sans Hebrew", also via @font-face) because course names are in Hebrew.
- Set every `--nm-*` token from base.css: bg, surface, surface-2, text, text-muted, border, accent, accent-contrast, **accent-text** (the accent used as text, at least 4.5:1 on surface), success, **success-text**, warning, danger, radius, shadow, font, heading-font, border-width, and **--nm-confetti** (a comma list). Override the Bootstrap vars too (`--bs-body-bg`, `--bs-body-color`, `--bs-primary`, `--bs-primary-rgb`, `--bs-link-color`, `--bs-link-hover-color`, `--bs-border-color`, `--bs-secondary-color`, `--bs-tertiary-bg`, `--bs-emphasis-color`, …).
- Under `html[data-nm-motion="off"]` and `@media (prefers-reduced-motion: reduce)`, turn off every animation and transition you add.
- Layout must be RTL-safe: use logical properties (Hebrew UI exists).

## What to style
- **Moodle chrome:**
  - `nav.navbar.fixed-top` (it has `bg-white`) and its links and the active state
  - `#page-header` / `#topofscroll` (osiris paints them WHITE; you must override them)
  - the "Dashboard" `h1`
  - `.block.card` and its `.card-title` (osiris sizes these; keep them sane, 15–20px, not 40px)
  - the course overview: the filter `.btn`s are pink in osiris, so override them; also `.dashboard-card` image, category, name and the `⋮` menu
  - Upcoming events `.event` rows
  - the Calendar block, including the month nav: `a.arrow_link.previous > span.arrow + span.arrow_text`, `h4.current`, `a.arrow_link.next`. Its text overlapped and broke in round 1, so lay it out cleanly.
  - Timeline, Recently accessed, Announcements
  - course page `li.activity` rows (`.activity-item`, `.activityiconcontainer`, `.activityname`), section headers, course header (`ul.teachers`), and the course tabs (`.secondary-navigation .nav-tabs`)
  - assignment page `.submissionstatustable`, quiz page `.quizattemptsummary` / `.quizreviewsummary`, `.generaltable`, buttons, forms, dropdown menus, modals
  - the user menu and avatar
- **Our widgets** (classes in `src/features/*.css`):
  - the top row `#nm-top-row` with `.nm-block-todo` and `.nm-block-game`
  - the to-do list `.nm-todo-*`
  - the arcade card `.nm-game-*`
  - the Upcoming done-split `.nm-up-*`
  - the shortcut chips `.nm-sc-*` and the header slot `.nm-header-slot`
  - `.nm-btn`, `.nm-icon-btn`, `.nm-theme-menu`
  - the toasts `.nm-toast` / `.nm-sc-toast`
- **Browser surfaces:** `::selection`, the caret, focus rings, and **custom scrollbars** (the user asked for these explicitly). Use `scrollbar-color` / `scrollbar-width` plus `::-webkit-scrollbar*` on `html` and on scroll containers. Make them match the theme's material: thin pill thumb on dark, chunky bordered thumb in brutalist, and so on.
- **Login page** (`html[data-nm-site="login"]`, HUJI's IdP: a Bootstrap 4 page with `.navbar`, a `.col-lg-7` photo, `h1`, `.nav-pills`, `.form-control`, a yellow submit button, and a `footer`): `src/login.css` provides the shared layout. You add your theme's touches under `html[data-nm-theme="<id>"][data-nm-site="login"]`.

## Must-fix list (from the user's screenshots of round 1 on the real site)
1. A white `#page-header` box with an invisible white "Dashboard" heading (dark themes). No white boxes anywhere in dark themes.
2. Block titles blown up to about 40px.
3. Broken dropdown carets (odd glyphs after "2026-27 ⌄"). Use a clean CSS chevron or Moodle's own.
4. Duplicated calendar icons in Upcoming rows (two icon lines).
5. Calendar month nav: "September" / "November" text overlapping the arrow boxes.
6. Emoji drawn by CSS (🔥 next to the avatar, 🏠, 🎁, 📣, 🏆). **No emoji in CSS `content` at all.** Icons must be drawn (SVG via `mask`/`background` data URI) or omitted.
7. Decorative image strips at the tops of blocks. base.css removes them already; don't add your own image strips back.
8. Course card category text that is nearly invisible (dark on dark).

## Craft
Read `/Users/ayeletwasserman/.claude/skills/impeccable/reference/craft-floor.md` and follow it, within your reference's world. Hard offset shadows only belong in a world that is actually neo-brutalist, and so on. Other rules:
- Contrast is at least 4.5:1 for body text.
- Theme the browser surfaces.
- No gradient text, no decorative glass, no colored side-stripes.
- Pick one authored motion moment, not scattered effects.

## Verify (bounded: build fully, ONE batched screenshot round, fix everything, at most one confirm round)
Use `launch({live: true, storage: {theme: '<id>', todos, shortcuts}, viewport})` from `tests/harness.mjs`. Seed 2–3 to-dos and 3–4 shortcuts, as `tests/screenshots.mjs` does. Shoot these, at 1440×1000 and at 390×844:
- `/my/`
- `/course/view.php?id=1230`
- `/calendar/view.php?view=month`
- `/mod/assign/view.php?id=86371`
- `/mod/quiz/view.php?id=74369`
- `LOGIN_URL` (exported from the harness)

Look at every shot with the Read tool, next to your reference images. `fixtures/live/*.html` are sanitized copies of the user's real pages (Moodle's JS doesn't run in them, so menus stay closed). Check the must-fix list item by item.

## Final report (short)
- your id and display name, and the reference app
- two swatch colors for the theme picker (`[background, accent]`)
- what the signature details are
- the must-fix list, item by item: fixed or not applicable
- 2–3 screenshot paths
