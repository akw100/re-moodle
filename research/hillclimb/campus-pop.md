# campus-pop hill-climb (reference: Gumroad, neo-brutalist)

Judge: `codex exec` (blind, read-only) with the frozen rubric, 4 theme shots + 3 Gumroad refs
(`tests/tmp/gumroad-pink-yellow-landing.png`, `gumroad-dashboard-checklist.png`, `gumroad-illustrated-dashboard.png`),
plus a coordinator note asking it to pull Gumroad dashboard screens from Mobbin. Shots: `tests/tmp/hc/campus-pop/r<N>-*.png`,
script `tests/tmp/campus-pop-hc.mjs`, judge `tests/tmp/campus-pop-judge.sh`, outputs `r<N>-judge.txt`.

## r0 (baseline): F6 C6 U5 = 17
Judge top differences:
1. Oversized headers bury content (96px h1, 4-line course title, phone to-dos at y≈480).
2. Color everywhere (yellow band on every block, multicolor cards): Gumroad's dashboard keeps color to selection/feedback.
3. Heavy 6px shadows and 2px frames on every container; Gumroad's working UI is flat 1px tables.
4. Too many decorations at once: ticker, rotated tickets, sticker, tilted counters, halftone, highlighted headings.
5. Shortcut chips clipped (Google Drive under "+ Add") and staircased on phone.
6. Mono-uppercase tiny metadata; phone hamburger invisible on black.

## r1: F6.5 C7 U6 = 19.5 (kept)
Changed: white hamburger bars; hero tightened (padding 4.25→3rem top, h1 96→56px, sticker 70→54px, slimmer marquee);
chips wrap instead of scrolling; Upcoming dates and course line in the body face; all 2px rules → 1px hairlines;
resting offset shadows removed (kept only as the hover lift and on floating menus/modals, 4px); every tilt removed except
the hero sticker; mono/uppercase labels → DM Sans sentence case (mono survives only in the marquee + sticker); neutral
white block heads; nav current item = pink text (Gumroad sidebar) instead of a pink fill; course cards white with a
colored category tag; halftone removed; course title smaller.
Judge top differences:
1. Typography too uniformly bold; Gumroad dashboard headings are regular weight (~40px titles, ~24px section heads).
2. Ticker, sticker, heading highlight, score shadow, footer shadow still compete.
3. Palette reads more fluorescent than the screenshot (proposed #F19CE6 / #F9D348). Not adopted: #FF90E8 / #FFC900 are
   Gumroad's real tokens; the screenshot is color-shifted.
4. Boxed block headings: Gumroad puts the section title on the canvas above one hairline table.
5. Empty announcements leave ~290px of blank; phone banner ~265px.
6. Course page regions don't share edges; tabs are six separate buttons.

## r2
Changed: blocks rebuilt Gumroad-dashboard style (transparent shell, 26px regular-weight title on the canvas, content in
one white 1px table; course grid straight on the canvas like Discover); blocks align to the top of their grid cell
(desktop only) so empty Announcements no longer stretches; recently-accessed items become rows of one ledger; page
titles weight 500, hero h1 500 without the highlighter; score text-shadow removed; course tabs are one connected
hairline strip; login tabs are Gumroad tab buttons (plain labels, current = pink bordered pill, 48px tall, 14px) and
the login h1 loses its highlight. Assessment B: bounce easing → expo ease-out; sticker text 8px → 12px (sticker 66px)
and unclipped (page-context-header overflow visible); marquee 11.5 → 12.5px; every label ≥ 12.8px.
Result: F7 C7 U6 = 20 (kept, best so far).
Judge top differences:
1. Ticker + sticker + hero shadow compete (asks to hide both). Not adopted: the user explicitly wants the marquee energy kept.
2. Courses/deadlines below empty space; course art ~112px; arcade score oversized.
3. Typography heavier than Gumroad's regular-weight headings; one family throughout.
4. Palette "too fluorescent" (but it now proposes #FF90E8 / #FFC900, which are already our tokens); badges too yellow.
5. Course page title / tabs / panel / footer on different edges; footer double frame.
6. Shortcut favicons boxed separately; utility buttons under 44px.

## r3: F7 C7 U6 = 20 (no gain)
Changed: one family throughout (DM Sans for headings too; Space Grotesk face dropped), page titles weight 400; hero flat
(no offset shadow); count badges white; course art 112 → 80px; arcade score 54 → 42px weight 500; icon buttons 44px;
favicon cell divider removed; dashboard grid rows `auto 1fr` so Course overview no longer pads Announcements; footer
single frame; course header, tabs and sections share one left edge (osiris -8px nav margin and 15px main padding zeroed);
heading tracking loosened.
Judge top differences: phone hero ~336px; deadlines start too low; heading tracking still tight; palette; ticker/sticker
(not adopted); course thumbnails decorative.

## r4: F7 C7 U6 = 20 (no gain → stop rule: two rounds in a row with no gain, and 4 rounds done)
Changed (re-shot after the shared base.css/game changes): Upcoming events moved to the top-right grid cell beside the
courses, Announcements below it (desktop, not in edit mode); phone hero compacted (34px chips, tighter gaps); heading
tracking -.01em; calendar "today" is now a pink cell (the drawn circle sat off-center under the number); leftover
highlighter on bold block text removed (the yellow "7").
Judge top differences: phone hero still ~268px; palette (asks for #FF90E8 / #FFC900, which is what we ship); ticker
(not adopted); heading tracking; to-do panel should be edge-to-edge rows without the dashed input; restrained
category chips and activity discs.

Final: r4 (tied best total 20; carries the extra objective fixes). Trajectory F 6 → 6.5 → 7 → 7 → 7, C 6 → 7 → 7 → 7 → 7,
U 5 → 6 → 6 → 6 → 6. No visible text under 12px (probe `tests/tmp/campus-pop-small.mjs`); marquee animation is `none`
under motion-off and prefers-reduced-motion; no horizontal overflow at 390.
