# night-operator hill-climb (reference: Linear dark)

Judge: `codex exec` with the frozen rubric, refs `tests/tmp/linear-grouped-issues-done.png`, `linear-project-overview-resources.png`, `linear-issues-board.png`. Shots in `tests/tmp/hc/night-operator/`.

## Baseline (r0): F6 C6 U5 = 17
Judge's top differences:
1. Too many nested containers (outlined block cards + inset strips + boxed rows; course page in a big card).
2. Arcade outranks deadlines (purple full-width button, big score; on phone ~250px before courses).
3. Type feels cramped: wants 14px/20px rows, 24px page title.
4. Course banners take space from course names; titles truncate.
5. Metadata too recessive (dates small gray at the far end; completed rows faded).
6. Pills and icon tiles applied indiscriminately (activity icon tiles, outlined chips everywhere).
Coordinator critique (impeccable A, 6.5): flatten to hairline rows, Upcoming as Linear grouped issues with a "Done" group header, bring back the HUJI wordmark, 14px body, keep desaturated course images.

## r1: F6 C6 U7 = 19 (kept; best)
Changed: blocks are no longer boxes (transparent, no border; the group-header strip is the only mark); one full-width main panel, inner pages centred at 960px inside it (course page no longer a narrow card); Recently accessed = flat hairline rows; Upcoming rows = grid (title + date on line one, course capsule + state on line two, titles wrap to 2 lines); "Done / submitted" summary = Linear group header strip with a violet done-circle; HUJI wordmark back (40px, monochrome light) with a hairline divider before "2026-27"; body 14px, row titles 14/20, page title 24px; activity icons bare (no tiles); arcade Play button demoted to a charcoal secondary, score 22px; phone order = to-dos, Upcoming, courses, timeline, ..., arcade last (display: contents + order), arcade art hidden on phone.
Judge's top differences:
1. Upcoming starts ~560px down on desktop; Arcade takes the top-right slot.
2. Course cards spend space on banners and tall bodies.
3. Metadata (codes, categories, date badges) too small; wants 13px metadata.
4. Secondary text too recessive.
5. Mixed control shapes: dashed Add/edit capsules, boxed game/palette buttons.
6. Decorative colour (orange arcade, course art, login photo) competes with semantic colour.

## r2: F6 C7 U6 = 19 (tie with r1; kept, since it also carries the coordinator's detector fixes)
Changed: desktop (>=1200px) dashboard is one 12-col grid (our row + Moodle blocks via display: contents): to-dos | Upcoming on top, courses under to-dos, announcements and arcade under Upcoming, calendar/recent/timeline across the bottom; course cards: 44px banner, ⋮ on the banner, titles up to 3 lines, 13px metadata; secondary text #979ca5; shortcut Add/edit no dashed outline, header icon buttons bare 28px; arcade decoration neutral (gray dashed line, gray DEADLINE pill); login logo monochrome, photo grayscale. Detector (Assessment B): avatar initials 12px in a 28px disc; main panel shadow removed (hairline edge only); every visible text >= 12px (scan script `tests/tmp/night-operator-small.mjs`, all views OK). Phone order fixed again after base.css switched the region to flex !important.
Judge's top differences:
1. Spacing rhythm uneven (big gaps under to-dos and above bottom widgets); wants 24px gaps.
2. Course banners still decorative; titles truncate.
3. Dates far from titles; wants 13px/500 #d0d0d0 dates.
4. Supporting text reads as fine print.
5. Too many outlined pills.
6. Violet check used on an ordinary heading (My to-dos); surfaces slightly cool; tiny coloured activity icons.

## r3: F6 C7 U6 = 19 (tie; stop rule hit: two rounds in a row with no gain)
Changed: 24px rhythm (grid column gap, block gaps); Course overview no longer indented (out-specified osiris' `#page-my-index .block_myoverview .card-body` 1rem padding and its 100vh inner scroll); Upcoming dates 13px/500, 12px title-date gap; My to-dos header uses the neutral Todo ring (violet kept for done); course art quieter (grayscale .85), course names unclamped; phone rhythm tightened.
Judge's top differences (not acted on, run stopped):
1. Secondary modules (announcements, arcade) still compete with deadlines.
2. Course banners still read as Moodle decoration (coordinator asked to keep the desaturated art).
3. Typography hierarchy: wants a 24/30 title and uniform 14/20 body.
4. Surfaces slightly cool; wants no permanent row separators.
5. Status glyphs on headings that are not statuses (yellow half-ring on Course overview, blue on Recent, dashed on announcements/arcade).
6. Tabs/filters/shortcuts all outlined capsules; active top-nav item is a full-height 48px block.

## Final
Trajectory F/C/U: r0 6/6/5 (17) -> r1 6/6/7 (19) -> r2 6/7/6 (19) -> r3 6/7/6 (19). Finished on r3 (tied best, highest craft, includes the detector fixes).

## Continuation (coordinator: usage reset, at most 2 more judged rounds; shared base.css/game changed, re-shot as r3b first)

## r4: F6 C7 U6 = 19 (tie)
Changed: status glyphs only on work lists (To-dos, Upcoming, Timeline ring; Done violet), removed from Course overview, Calendar, Recent, Announcements, Arcade; no permanent row separators in Upcoming, course activities, Recent, to-dos (hover fill only, Linear list rhythm); active top-nav item is a 30px pill drawn behind a full-height link; filter/sort dropdowns and search fields 6px radius (capsules kept for chips/tabs); completed Upcoming rows gray without strikethrough.
Judge's top differences:
1. Mobile: events start ~490px down; wants Upcoming first.
2. Course banners decorative (again).
3. Typography/metadata rhythm; metadata >= 13px.
4. Too many borders: inactive tabs, shortcut links, login panel.
5. Green "Today" reads as success.
6. Weak small labels ("Opens", edit controls).

## r5: F6 C7 U6 = 19 (tie; continuation budget used)
Changed: phone order puts Upcoming first, then to-dos (deadlines in the first screen); inactive course tabs and shortcut links lose their outlines (selected tab stays filled), Add is a 6px ghost button; to-do "Today" chip neutral with an orange calendar mark instead of success green; Upcoming rows 12/16px padding, dates #d6d8dc 13px/500, "Opens" 13px; tried to unbox the login form (no visible effect: src/login.css's card wins).
Judge's top differences: secondary widget headers should be quieter than status groups; fixed row tracks for events; course banners (again); type tiers; neutral #101010/#181818 surfaces and violet instead of green for "submitted"; icon optical sizes.

## Final (after continuation)
Trajectory F/C/U: r0 6/6/5 (17) -> r1 6/6/7 (19) -> r2 6/7/6 (19) -> r3 6/7/6 (19) -> r4 6/7/6 (19) -> r5 6/7/6 (19). Plateau at 19 from r1; finished on r5 (tied best, highest craft, carries the detector fixes and the mobile deadline-first order). Sub-12px text scan: all views OK.
