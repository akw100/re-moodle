# Nicer Moodle: build brief

A Chrome extension (Manifest V3) that makes HUJI's Moodle look better and more helpful for students. Target: `https://moodle.huji.ac.il/*` (year sites like `/2026-27/`, `/2025-26/`). Ideally it also works on any Moodle 4.x site that uses a Boost-based theme. You can't reach the real Moodle (it needs a HUJI login), so work against `fixtures/` and the facts below, which were verified on the live site on 2026-10-23.

## Features (all requested by the user)

1. **Themes**: 4 really different themes, switchable from the popup and from an in-page settings button. Each theme follows **exactly one** design reference and stays faithful to that design system. At least one theme goes all-out crazy. Tokens and component rules are in `research/design-research.md`, from Mobbin research done through Codex. The reference screenshots are in `research/refs/` (see `INDEX.md`); open them and match them closely. The themes are Quiet Focus (Todoist), Night Operator (Linear dark), Daily Quest (Duolingo) and Campus Pop (Gumroad). **Campus Pop is the go-crazy one:** push it all the way, with oversized type, pink and yellow color blocks, hard offset shadows, sticker-like rotated badges, a marquee and wobbly hover. Keep it usable. Keep a "Moodle default" (off) option too.
2. **Upcoming events split**: in the `Upcoming events` block (`section.block_calendar_upcoming`), move events the student already completed (assignment submitted, quiz finished) into a new collapsible **"Done ✓ (still editable)"** section under the to-do list. Each row has a checkbox that ticks itself once the work is submitted. Done rows stay clickable, so the student can still open the activity and change their submission. Manual checking is allowed too: the student can tick something off or untick it, and that choice is saved and overrides the automatic status.
3. **Arcade game**: a simple, satisfying mini-game with over-the-top animations (screen shake, particles, combo popups). It opens from a button or a dashboard card in an overlay. The high score is always saved (`chrome.storage.local`). Keep the mechanics dead simple, e.g. tap the falling assignments before they hit the deadline line, or a one-button flappy/dodger. It should be fun, not deep.
4. **Todo section**: a new dashboard block for personal todos (add, check off, delete, reorder optional), stored in `chrome.storage.sync`. Checking an item off plays a small celebration.
5. **Shortcuts bar**: on the same row as the `Dashboard` `<h1>`, a row of link chips the student adds themselves. Each chip shows the site's favicon (`https://www.google.com/s2/favicons?domain=<host>&sz=64`, or the extension `favicon` permission with `chrome-extension://<id>/_favicon/?pageUrl=…&size=32`). The name auto-fills when a URL is pasted: fetch the page `<title>` from the service worker using host permissions, falling back to a prettified hostname. Hovering a chip shows a preview card with the favicon, title, URL, and `og:image`/`og:description` when available. Chips can be added, edited, removed, and reordered. Store them in `chrome.storage.sync`.
6. **Confetti on every submit**: whenever the student submits an assignment or finishes a quiz, fire a big confetti burst (canvas, no library needed; a vendored copy of `canvas-confetti` is also fine). Combine it with the theme's personality (e.g. emoji confetti in the playful theme).

## Hard requirement: dynamic and deterministic (the user asked for this explicitly)

**Dynamic** means nothing is hard-coded to one student, course, year or site:
- Derive `wwwroot` and `sesskey` from the live page (`M.cfg`). Never hard-code course IDs, event IDs or the `/2026-27/` path. The fixture's IDs exist only for tests.
- Recompute the To do and Done lists from live Moodle data on every dashboard load, whenever Moodle re-renders the block (`MutationObserver`), and when the tab regains focus (`visibilitychange`). Never trust a cached list for display; a cache may only be used for the confetti diff.
- Widgets (todos, shortcuts, theme, done overrides) stay live across open tabs via `chrome.storage.onChanged`.

**Deterministic** means one exact rule, the same inputs always give the same output, and no guessing:
- Inputs:
  - `U` = `core_calendar_get_calendar_upcoming_view {courseid:1, categoryid:0}`.events
  - `A` = the set of ids from `core_calendar_get_action_events_by_timesort`, with `timesortfrom` = min(U.timesort) and `timesortto` = max(U.timesort)+1. Paginate with `aftereventid` until fewer than `limitnum` come back, so the set is complete for every event in U.
  - `O` = the student's manual overrides `{eventId: 'done'|'todo'}` from storage
- Rule, as a pure function `classify(U, A, O)`, applied in order:
  1. `O[e.id]` exists → that value (the student's choice always wins).
  2. `e.eventtype === 'open'` or `!e.isactionevent` → `'info'` (stays in To do, shown without a checkbox). Note: on HUJI, `open` quiz events have `isactionevent: true`, so the `eventtype` check is required.
  3. `e.id ∈ A` → `'todo'`.
  4. Otherwise → `'done'`. Moodle removes completed action events from A; this was verified live (finished Quiz 3 not in A, unsubmitted Lab 3 and unattempted Quiz 4 in A).
- If either API call fails, leave Moodle's block exactly as Moodle rendered it and show a small "couldn't load status" note. Never fall back to guessing from text.
- `classify` lives in its own module with no DOM access and has a test table covering every branch, including the HUJI `open` + `isactionevent` case. Confetti for a newly done item fires on the deterministic diff: ids that were `'done'` now but not at the previous load, minus overrides.

## Verified facts about HUJI Moodle

- Moodle 4.x, theme **`osiris`** (a Boost child, Bootstrap 5). `body` has `path-my pagelayout-mydashboard` on the dashboard and `dir-ltr lang-en`. Users can switch to Hebrew, which gives `dir-rtl lang-he`, so **support RTL** with logical CSS properties.
- The global `M.cfg.wwwroot` and `M.cfg.sesskey` exist in the page's main world, not in the content-script isolated world. Read them through a tiny main-world script (`"world": "MAIN"` content script) or by parsing `sesskey` from the page's logout link or `<script>` text.
- The dashboard heading is `#page-header .page-header-headings h1` with the text "Dashboard". Next to it is the empty `[data-region=header-actions-container]`, which is a good mount point for the shortcuts row.
- Dashboard blocks live in `aside#block-region-content[data-blockregion=content]` as `section.block.card[data-block=…]`. The real order is myoverview, news_items, calendar_upcoming, calendar_month, recentlyaccesseditems, timeline. Inject new blocks (todo, game card) as sibling `section.block.card.mb-3` elements, so they inherit layout and themes style them the same way.
- The Upcoming events block renders `div.event[data-region=event-item]` rows, each with `a[data-action=view-event][data-event-id=<id>]` (href = the activity URL `/mod/<mod>/view.php?id=<cmid>`), `h6` (course name), and `.date`. Moodle re-renders this block with AJAX (when you change the month, etc.), so use a `MutationObserver`.
- AJAX web service (POST, same origin, cookies): `M.cfg.wwwroot + '/lib/ajax/service.php?sesskey=' + sesskey + '&info=' + method`, body `[{index:0, methodname, args}]`. These work on HUJI:
  - `core_calendar_get_calendar_upcoming_view` `{courseid:1, categoryid:0}` returns the events with `id, name, modulename, eventtype (open|close|due), isactionevent, action{name, actionable, url}, url, timestart, course{shortname}`.
  - `core_calendar_get_action_events_by_timesort` `{timesortfrom, timesortto, limitnum}` returns only events that **still need action**.
  - **Completion signal (verified):** a `due` or `close` event that appears in the upcoming view but **not** in the action-events list means the student is done. On the live site, Quiz 3 (finished, 8/8) was missing from the action list, while the unsubmitted Lab 3 and the unattempted Quiz 4 were present. `open` events are never action events, so leave them in "To do" as informational, or group them with their close event.
  - `core_course_get_course_module` and `mod_*` web services are **disabled** at HUJI ("Web service is not available"), so don't rely on them.
  - Activity-page markers. Use these only to detect the submit moment for confetti on the activity page itself, **not** for classifying the dashboard. Quiz finished = `table.quizreviewsummary` with status "Finished". Assignment submitted = `.submissionstatussubmitted` cell (standard Moodle). "No submissions have been made yet" means not submitted.
- Submit flows, for confetti:
  - Assignment: `mod/assign/view.php?action=editsubmission` form, submit button `#id_submitbutton` ("Save changes"). Some assignments then need `action=submit` with a "Submit assignment" confirmation. Detect success on the following `mod/assign/view.php?id=…` page (status submitted, plus a flag set in `sessionStorage` on click), not on the click itself.
  - Quiz: `mod/quiz/summary.php` "Submit all and finish", then a confirmation modal, then `mod/quiz/review.php`. Fire on reaching `review.php` right after that flow (use a `sessionStorage` flag).
  - Also fire when the done-list grows between dashboard visits: keep the last known done-IDs in storage.
- Scripts can't trigger downloads on Moodle (not needed here, but don't build anything that depends on them).

## Engineering constraints

- Plain MV3: `manifest.json`, content script(s), CSS, popup, and a service worker for title/og fetching. **No build step and no framework** unless it clearly earns its keep. Vanilla JS and CSS are fine.
- Themes are CSS files scoped under `html[data-nm-theme="<id>"]` that override Bootstrap/Boost variables (`--bs-body-bg` etc.) and style both Moodle chrome and the injected widgets with the same tokens. Inject the theme early (`run_at: document_start` for the attribute and CSS) to avoid a flash of the default look.
- All injected UI is namespaced (`nm-` classes) and must not break Moodle functionality. Respect `prefers-reduced-motion` for animations and confetti, with a toggle in settings.
- Add a dev harness: `fixtures/dashboard.html` (the provided skeleton), plus fixtures for an assignment-submitted page and a quiz review page. Also add a small mock of `service.php` responses, so every feature can be demoed and tested offline (e.g. a `?nm-mock` mode or a test page that loads the content scripts directly).
- Verify in a real browser: load the unpacked extension with Playwright/Chromium (`--load-extension`) against the fixtures served on localhost. Take screenshots of every theme. Leave one runnable check (e.g. `npm test` or `node tests/run.mjs`) that covers the done/to-do classification and the storage round-trips.
- README: how to load it unpacked in Chrome, include screenshots of each theme, and list what was tested only against fixtures versus real Moodle.

## How to work

The user asked for subagents. Build the core first: manifest, storage helpers, the main-world `M.cfg` bridge, the mount points and `classify` with its tests. Then fan out to parallel subagents: one per feature (done split, todo, shortcuts, confetti, game) and one per theme. Integrate their work, then run a final review pass that compares every theme screenshot against its reference in `research/refs/`.

## Done when

All 6 features work on the fixtures in a real Chromium with the extension loaded. The 4 themes look polished and distinct, matching their references. Screenshots are committed under `docs/screenshots/`. The repo is pushed with a PR or a clean `main`.
