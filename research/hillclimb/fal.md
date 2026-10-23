# fal hill-climb log (reference: fal.ai web app)

Judge: `codex exec` with the frozen rubric, refs `tests/tmp/fal-1.png`, `tests/tmp/fal-2.png`. Mobbin was NOT available to the judge or to me (the Mobbin MCP returns "requires a paid plan"), so the judge scored against the two refs only.

## Baseline (r0): F6 C6 U5 = 17
Judge top differences:
1. Arcade too prominent; on phone to-dos + arcade fill the viewport, courses/deadlines buried.
2. Type too small/compressed; weak heading/body hierarchy.
3. Nav is Moodle's single crowded strip; fal has a utility row + a separate tab row.
4. Course cards: big polygon banners nested inside a bordered block; fal uses neutral cards + small pastel tiles, no wrapper panel.
5. Course page: title, tabs, content and footer start at different x; narrow column.
6. Faint secondary text, small phone controls, dotted textures.

## Round 1: F6 C7 U6 = 19 (kept)
Changed: fal's real type stack researched from fal.ai's CSS (sans = Public Sans, mono = Chivo Mono, headings = Focal); added "Fal Mono" (Chivo Mono) as the data face for course short names, event course codes and counts. Two-tier header on desktop (tools row 56px + ruled tab row 44px, drawers offset). Brand became fal's workspace switcher (outlined box + up/down chevron); search toggle became a 240px "Search" field. Deleted the filler subtitle; h1 28px. Course overview de-carded (section title on canvas, 20px); course cards rebuilt as fal model cards: course art recoloured into a 52px pastel tile (luminosity blend over violet/blue/pink, white wash + dot texture), short name in mono, name 16/600, category as plain muted line, two per row. Progress bars as dashed violet usage lines. Phone: arcade collapses to a compact metric row. Course page: one shared 1120px column, tabs and content aligned to the title.
Judge top differences after r1:
1. Type still small/light: nav/body 14/500, section 20/600, metadata 13; mono only for identifiers, not counts.
2. Arcade stretches tall; empty announcements above upcoming; on phone, arcade before academic content.
3. Course tiles too big/blank, titles squeezed: 40px tiles, 12px gap.
4. Tiles imitate texture: drop dots, add real glyphs in tile hue.
5. Header controls mismatched: 36px heights, boxed icon-only controls, 44px phone hits.
6. Faint to-do circles (need a visible border), double login focus ring, phone event titles ellipsized.

## Round 2: F7 C7 U6 = 20 (kept)
Coordinator note applied: no visible text under 12px (badges, calendar weekday heads, "Opens" tag, deadline pill, count badge all raised to 12px+).
Changed: nav labels 15px, block titles 18px, metadata 13px; mono kept only for identifiers (course codes), removed from counts. Course tiles 44px with a drawn book glyph in the tile hue over the washed course art. Activity tiles flat pastel (dot texture removed). Controls unified at 34px (shortcut chips, boxed pencil, icon buttons); phone tool buttons 40px. To-do/Upcoming check rings visible (#929297). Single violet focus ring (login too). Upcoming events placed above the empty Announcements block on desktop; on phone the arcade moves below all academic blocks, event titles wrap. The shared game card changed under me (coordinator removed its teaser art), so the narrow arcade tile now draws fal's usage-chart panel: grey well, dashed violet baseline, one request spike. Unread count back to a dot.
Judge top differences after r2:
1. Too much vertical space before content; phone panels touch.
2. Course cards: icon-to-text offset and menu column squeeze titles to 3 lines; title clamped.
3. Hierarchy: heavier page title, metadata (mono codes) too tiny.
4. Tiles 36px with 20px glyphs and tinted borders.
5. Course page content starts at 168px vs dashboard 56px; footer detached.
6. Login tabs wrap, pill language select; phone shortcuts take two uneven rows.

## Round 3: F7 C7 U6 = 20 (no gain; kept, not lower)
Changed: tighter vertical rhythm (header and top row margins 24px), phone blocks separated (12px). Course cards: menu moved to the corner so the name gets the width, 36px tiles. Page title 700. Codes 13px. Course page on the dashboard grid (wide column, 24px from the drawer toggles). Login tabs on one line at 13px, rectangular language select. (Tried a single-row scrolling shortcut bar on phone: it hid Add/Edit behind the theme button, reverted.)
Judge top differences after r3:
1. Mono metadata in events reads as "an unrelated voice"; type feels condensed.
2. Course overview heading inset 16px from the panel grid; headings not aligned.
3. Phone: Upcoming starts ~550px down; put deadlines before to-dos.
4. Course text starts ~80px from the card edge; 40px tiles.
5. Secondary text treatments inconsistent.
6. Arcade chart reads as decoration with no data.

## Round 4: F7 C7 U6 = 20 (no gain; stop rule: two rounds in a row with no gain)
Changed: found the real cause of the inset: osiris pads `.block_myoverview .card-body` with an `#page-my-index` ID rule, which also padded the course card text; matched its ID, so the section heading and the cards sit on the 56px grid and card text starts right after the tile. Event course codes back to the sans (mono kept only for the card's model-ID line). Body 15px. Course tiles 40px with 20px glyphs. Phone order: Upcoming, to-dos, courses, the other blocks, arcade last (`display: contents` on the top row and the block region, then `order`).
Judge top differences after r4 (not acted on): top strip still ~290px tall; row labels 16/500; muted text a touch darker; 32px tiles with heavier glyphs; equal card heights; 40px header controls.

## Final
Finished on r4 (ties r2/r3 at 20; r4 carries the alignment and phone-order fixes). Trajectory F 6→6→7→7→7, C 6→7→7→7→7, U 5→6→6→6→6.
