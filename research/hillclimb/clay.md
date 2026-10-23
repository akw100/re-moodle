# Clay hill-climb log

Reference: Clay (clay.com) app, `tests/tmp/clay-1.png`, `tests/tmp/clay-2.png`, plus Mobbin screens pulled by the judge.
Judge: `codex exec` blind with the frozen rubric (`tests/tmp/clay-hc-judge.sh`), shots via `tests/tmp/clay-hc-shot.mjs`.

## Baseline (r0): F6 C6 U5 = 17
Judge top differences:
1. No left rail / narrow centered course page; widen course container to ~1200px.
2. Phone: arcade + to-dos push deadlines below the fold; 60px section gaps; empty announcements panel.
3. Course cards are patterned cards nested in a card; Clay uses flat hairline table rows.
4. Headings tight/heavy, metadata 12px too small.
5. Boxed icon wrappers everywhere; Clay rows use bare 16px glyphs; flatten containers.
6. Controls mix sizes; standardize 32px, 4px radius.
Critique (Assessment A): no table character, filled blue "+ Add", ~500px calendar block, Edit label 4.44:1, course images unthemed.

## Round 1: F6 C7 U5 = 18 (kept)
Changes: course overview card view rebuilt as a Clay file table (28px image swatch, Name/Category header row, hairline rows, ··· column); Upcoming as a table with Name/Due header (Course column from 760px container width), titles wrap instead of truncating; Recently accessed as header + hairline rows; boxed activity icons removed (bare glyphs) on dashboard rows and course page; "+ Add" demoted to a dashed ghost; Edit label #63666e (5.74:1) and a white/blue-outline pressed state; calendar block fixed (a full-page `.maincalendar td {7rem}` rule was leaking into the block: cells 112px -> 38px, block ~350px); blocks hug content on the desktop grid; osiris id-level `.card-body` padding overridden; course page widened to 1080px; sub-12px text raised to 12px ("Opens", weekday heads, avatar initials); menus/modals/toasts use Clay's tight shadow-md / shadow-xl instead of wide blurs.
Judge top differences:
1. Dashboard too boxed: remove section borders, open canvas with table dividers; grey cards only for shortcuts.
2. Top row/phone header take too much height; compact arcade score.
3. Type texture feels condensed; headings tight.
4. Course names truncate; give name ~64%, wrap to two lines.
5. Controls mixed: 32px height, solid Add border, tighter focus halo.
6. Faceted course images compete; use neutral glyphs, neutral icon grey.

## Round 2: F6 C7 U5 = 18 (tie with r1; kept, closer to the reference by eye)
Changes: open canvas on the dashboard (no panel borders/boxes around sections; tables carry the hairlines); course images replaced by Clay's grey 16px workbook glyph; course names wrap (2-line clamp) instead of truncating; Inter's cv11/ss01 single-storey alternates dropped (Clay's grotesk has a double-storey a); "Name" header row also at narrow widths; controls on a 32px rhythm (chips, split pills, search), tabs 34px; "+ Add" solid hairline ghost; focus halo 2px; arcade score 28px; course page sections as open tables (title, hairline, rows); phone header padding cut.
Judge (Mobbin unavailable this round; public search found nothing) top differences:
1. Top row too tall; phone deadlines start ~775px, below the fold.
2. Course table only half width; filters in two uneven rows (grid positions are inline styles = structural).
3. Metadata too small; row labels 15px, meta 13px.
4. Controls: one size system, 44px phone hit areas.
5. Colourful row icons; Clay table icons are quiet grey; shortcut icons bigger (24px).
6. Footer box and login panel shadow; secondary text #626873.

## Round 3: F6 C7 U5 = 18 (tie; kept; stop rule met: two rounds in a row without gain)
Re-shot after the shared base.css / game.* changes (compact arcade tile, 4/2 and 5/1 top row).
Changes: secondary ink #63666e (5.74:1 on white, 5.4:1 on the tile); shortcut tiles shallower (16px/20px padding, tighter to-do rows) with 24px colourful header icons; Moodle's coloured activity glyphs in table rows turned into Clay's quiet grey (Moodle tints them with `filter`, so it needs !important; raster `.nofilter` icons untouched); metadata 13px; footer box removed (top divider only); login panel shadow removed.
Judge top differences (now with Mobbin screens):
1. Deadlines start ~650px desktop / ~740px phone; would need the top row reordered below Upcoming (structure).
2. Course page still a centered Moodle column; no Clay sidebar (structure).
3. Filters wrap into two rows; due dates take width from titles.
4. Type reads narrower than Clay; tracking only on page titles.
5. One control scale (32px, 4px radius); 44px mobile targets.
6. Pale metadata, icon discipline.

## Result
Trajectory F/C/U: 6/6/5 (17) -> 6/7/5 (18) -> 6/7/5 (18) -> 6/7/5 (18). Final = round 3.
