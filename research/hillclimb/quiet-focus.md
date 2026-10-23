# quiet-focus hill-climb (reference: Todoist)

Judge: `codex exec` blind, frozen rubric, images = dash 1440×1000 viewport, course 1440×1000, login 1440×1000, phone 390×844 viewport, plus 3 Todoist refs.
Shots: `tests/tmp/hc/quiet-focus/r<N>-*.png` (script `tests/tmp/quiet-focus-hc.mjs`, judge `tests/tmp/quiet-focus-judge.sh`). Backups `r<N>.css` are taken before round N.

## Baseline (r0): F5 C6 U5 = 16
Judge's top differences:
1. Desktop shell reads as Moodle: horizontal top nav; Todoist has a warm ~260px left sidebar and one dominant work area.
2. Arcade more prominent than deadlines (big red Play button); order should be to-dos, upcoming, courses, then arcade; quiet the button.
3. Course artwork is an unrelated visual language; render courses as flat single-column rows.
4. Type reads narrower than Todoist; 14/20 body, 28/34 title, 14/600 section heads.
5. Colour/iconography too busy (saturated rings, purple dates, purple hashes, multicolour resource icons).
6. Too many filled containers: shortcut chips, course-tab tray, outlined login panel.
Plus the starting critique: unthemed course images, Edit 3.95:1, ✓ submitted 4.28:1, no Todoist structure, footer in a narrow centred column. Plus Assessment B: heading rhythm (8px above vs 21px below), no text under 12px.

## Round 1: F6 C7 U5 = 18 (kept)
Changed: Moodle's top bar becomes a 264px warm Todoist sidebar at ≥1200px (user row with avatar + name + chevron, search/bell/chat icons, place list with drawn icons and peach active row, right-opening flyouts, edit mode and the HUJI mark at the foot); page, drawers and drawer toggles shift over. Course cards become Todoist project rows (coloured # from Todoist's project palette in place of the artwork, name, Hebrew short name · category). Dashboard reflowed to a 4/2 grid: to-dos | arcade, upcoming | announcements, courses | timeline, recent | calendar. Arcade button neutral and smaller. Footer shares the content's left edge, one quiet wrapped line. Contrast: Edit toggle/⋮/tertiary grey #808080 → #666/#6f6f6f, "✓ submitted" #04661e on #eaf5ec (6.4:1). No text under 12px (avatar initials, calendar weekday heads, Opens/tags/game labels/shortcut letter). Section headers get .75rem above, .25rem below the rule.
Judge's top differences:
1. Courses start at y≈960; arcade precedes deadlines on phone. Primary ~760px + 240px secondary; arcade after academic content on mobile.
2. Type still reads compressed; 14/20 body, 26/32 headings.
3. Colour too saturated: neutral 1px #808080 circles, green today, grey metadata, fewer red utility links.
4. Rows carry too much chrome: done-note 12px grey, compact status tags (2px 6px, r3).
5. Too pill-heavy: transparent shortcut chips, flat course tabs (peach active), flatter login tabs.
6. Course page: title starts left of tabs and rows; one shared column.

## Round 2: F7 C7 U6 = 20 (kept)
Changed: system UI font first (SF / Segoe UI, like Todoist; Inter and Noto Sans Hebrew stay as @font-face fallbacks), Inter feature flags dropped. Neutral 1px #808080 circles everywhere except a to-do due today/overdue (red); upcoming dates and non-today to-do dates grey, grey project hashes, "Review →" grey until hover, compact status tags, 12px grey done-note. Shortcut chips flat until hover. Course tabs flat, peach active. Course page title/tabs/sections share one left edge. Courses moved into the aside beside Upcoming (Todoist project list; category hidden there). Phone: to-dos, upcoming, courses, timeline first, arcade last. Login: no outlined panel, flat method tabs with peach active, 44px fields.
Judge's top differences:
1. Still no dominant task column: arcade takes the top of the aside, upcoming starts mid-page; tighten section gaps.
2. Course rows loose (12px 0 padding, 20px/1fr/24px grid, 8px gaps); a title ends in "in …" (server-side truncation, not CSS).
3. Hierarchy: 28/34 page title, clearer heading → task → meta.
4. Red treatments inconsistent; deeper brick accent text on peach.
5. Icon optical sizes: 20px nav icons, 10px icon gaps.
6. Spacing: ~80px between course tabs and "General"; phone toolbar cramped with separators.

## Round 3: F7 C7 U6 = 20 (tie with r2; kept, final)
Changed: the dashboard becomes one grid (display: contents on the top row and block region): to-dos then Upcoming straight down the main column, Course overview beside both in the aside, arcade moved below the courses, then recent | calendar, timeline | announcements. Full course names shown (Moodle's visible copy is cut server-side; the screen-reader copy is revealed and the cut copy hidden). Course rows 12px padding, 20/1fr/24 grid, no "·" separator. Page title 28/34. Accent text a deeper brick #b03a2e (6.0:1 on white, 5.4:1 on peach). 20px sidebar icons. Phone toolbar: 44px targets, no separators.
Judge's top differences (not acted on; budget reached):
1. Dashboard still evenly weighted: smaller grey shortcuts, 24px section gaps, tighter mobile gap above Upcoming.
2. Type still reads compressed; 16/600 section heads, 14/21 names.
3. Course filters bulky: 28px controls, 12px text.
4. "Opens" strip too card-like: 6px 10px padding, 13px title.
5. Red circle reads as priority; #999 neutral borders.
6. Icons/controls not one system: drawer toggles without border/background, 44px login tabs.

## Trajectory
F 5 → 6 → 7 → 7; C 6 → 7 → 7 → 7; U 5 → 5 → 6 → 6 (total 16 → 18 → 20 → 20). Final = r3.
