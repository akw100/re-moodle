# Hill-climb log: cloudstudio (reference: Cloudstudio's website)

Judge: `codex exec` with the frozen rubric, ours = dash / course / login / phone, refs = tests/tmp/cloudstudio-1.png, -2.png. Shots and judge transcripts in `tests/tmp/hc/cloudstudio/`.

## Baseline (r0): F6 C6 U5 = 17
Judge's top differences:
1. Rounded panels everywhere (card dashboard) instead of open blue/off-white sections split by black bands.
2. Headlines bold but not the reference's dramatic display scale (wants ~64px, 900, -0.055em).
3. Black arcade slab is the strongest mass on the page; outranks deadlines (and comes before them on phone).
4. Colour fragmented by purple/yellow course artwork.
5. Signature flourishes too mechanical: underline overshoots the course title, stars between every tab, too much mono.
6. Shortcut chips use the black primary-CTA silhouette.

## Round 1: F6 C6 U6 = 18 (kept)
Changed: critique list (login `.footer-copy` now #9fbcc5 on ink; user menu is a plain black avatar disc + ink chevron, no pill; floating footer "?" hidden since the footer prints inline; brand asterisk removed; block month-nav arrow links get a blue foreground, labels stay clip-hidden; login method pills one line each; quiz duplicate title/dates hidden, wider 1120px column on course/activity pages); headline 900 / -0.055em / up to 64px on Dashboard, underline capped at 5.5em; course covers become a sky-blue luminosity duotone at 72px; shortcut chips outlined instead of black; arcade becomes an ice panel with a black Play CTA.
Judge's top differences:
1. Still rounded panels; wants transparent sections, radius 0, hairline dividers.
2. Wants an even bigger display heading (~88px) and 16px body.
3. Gutters ~8px; wants 24px grid gaps; mobile game button squeezed.
4. Arcade still outranks deadlines; wants Upcoming right after to-dos on phone, arcade last, outlined Play.
5. Colour too uniformly pale.
6. Motifs repeated: underline on every screen, stars on every tab, patterned banners.

## Round 2: F7 C7 U7 = 21 (kept)
Changed: blocks are open sections (no panel fill, radius 0, zero inset; the heavy 20px title + black rule carry each block), hairlines rgba(8,13,13,.14), 2.5–2.75rem grid gaps; course sections open too; 16px body; Dashboard headline up to 80px / .95; underline capped at 300px; active course tab loses its second underline; phone order to-dos → Upcoming → Timeline → courses → … → arcade last (flex + display:contents, margins not gap); 40px non-shrinking icon buttons. Coordinator findings folded in: no text under 12px (every .6x–.74rem label raised to .75rem, plus .nm-up-opens/.nm-game-label/sc hints/DEADLINE), blue-on-black limited to CTA pills, the ticker band and the grade banner (icon buttons, drawer togglers, section collapse buttons become ink outlines; small black discs/counters carry white). Respected the coordinator's new compact arcade tile (teaser playfield removed upstream; dead rules dropped; base 5+1 / 4+2 grid kept).
Judge's top differences:
1. Too much uninterrupted blue; wants sky hero, near-white content section, black bands.
2. Login panel still a conventional outlined card.
3. Mono metadata too small/tracked; wants 13px.
4. Dashboard spacing delays deadlines; arcade has empty area.
5. Controls uniformly thin; wants Play as a black 44px pill, solid Add border.
6. Underline repeated on every page; keep only the dashboard's.

## Round 3: F7 C7 U6 = 20 (reverted to r2)
Changed (on top of r2): sky hero / near-white (#eff9fc) content split (page header painted full-bleed sky, body ice, course header running into the black band); login form card removed (open composition); underline kept only on the Dashboard headline (220px); tighter dashboard gaps; Play back to a 44px black pill; firmer #526a72 pill outlines, solid Add; all 12px labels raised to 13px.
Judge's top differences:
1. Section headings too close in size to body; wants 28px section heads.
2. Deadlines start too far down; wants Upcoming above Announcements via CSS order, less hero padding.
3. Course cards keep Moodle's polygon banners and rounded outlines.
4. Too many outlined pills (shortcuts, filters, login tabs).
5. Blue activity-icon tiles don't belong to the reference.
6. Mono metadata now too big/tracked for its importance (contradicts r2's ask).
Total fell 21 → 20 (usability), so restored r2.css.

## Round 4: F6 C7 U7 = 20 (reverted to r2)
Changed (on top of r2, a different fix set from r3): Upcoming swapped above Announcements on desktop (osiris pins explicit grid rows; swapped via grid-row with :has guards, not in edit mode); underline only on the Dashboard headline; login form card removed; Play back to a 44px black CTA pill; solid Add outline; activity icons as ink glyphs in hairline circles instead of cyan tiles.
Judge's top differences:
1. Blue too uniform; wants sky hero / near-white content / black band (what r3 tried, which scored lower).
2. Section and card type too compact vs. the display headline.
3. Polygon course banners are the strongest leftover Moodle signature; wants them removed.
4. Phone: Upcoming starts ~620px down; wants a tighter phone hero.
5. Secondary text faint/small on cyan.
6. Stars between course tabs and the black "Done / submitted" strip over-apply signature treatments.

## Result
Stop rule hit: two rounds in a row (r3, r4) without beating r2. Finished on r2 (F7 C7 U7 = 21).
Trajectory: F 6 → 6 → 7 → 7 → 6, C 6 → 6 → 7 → 7 → 7, U 5 → 6 → 7 → 6 → 7 (baseline → r1 → r2 → r3 → r4).
