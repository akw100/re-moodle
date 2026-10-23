# daily-quest hill-climb (reference: Duolingo)

Judge: `codex exec` with the frozen rubric, run blind (`tests/tmp/daily-quest-judge.sh rN`). Shots come from `tests/tmp/daily-quest-hc.mjs rN` and are saved as `tests/tmp/hc/daily-quest/rN-*.png`, with that round's CSS in `rN.css`.

Note: `src/base.css` changed in the middle of the run (it is not my file). The arcade tile in the top row went from 2 of 6 columns to 1 of 6 at ≥1400px, so r2 is not shot under exactly the same layout as r0/r1.

| round | F | C | U | total | kept? |
|---|---|---|---|---|---|
| r0 baseline | 6 | 7 | 6 | 19 | best |
| r1 | 6 | 6 | 5 | 17 | no, partly reverted |
| r2 | 6 | 7 | 6 | 19 | yes (ties best, keeps the required critique and detector fixes) |

Stop rule: two rounds in a row with no gain (r1, r2). Finished on r2.

## r0: judge's top differences
1. The dashboard puts the arcade ahead of deadlines. Upcoming events should sit beside the to-dos.
2. Type is too small and too uppercase. Use sentence case for filters and metadata, and keep uppercase for nav and actions.
3. The saturated green PLAY button outweighs the study actions.
4. Course cards are narrow, nested in the block, and truncated.
5. Faint metadata and the amber score are low-contrast.
6. Icons are small and generic, and the 0 4px ledge is on every surface.

## r1: changes
- Critique: the brand is now #378200 (4.8:1), not #58CC02 (2.09:1). Course names and categories wrap, and the full name comes from Moodle's visually-hidden span because the visible one is cut server-side. Filter and sort dropdowns are sentence case. Weights: body 500, item titles 700, block titles 800, meta 500–600. Generated course images became flat Duolingo colour tiles with a flash-card motif. Teacher photos are left alone.
- The course overview lost its block shell and became full-width "collection" rows with the tile at the end.
- The arcade CTA became the white "START +20 XP" style. Score colour #AD6500. Upcoming metadata is sentence case at 14px. Login tabs and labels are sentence case. Activity badges are 40px.
- The judge said color now sat in decoration (the course tile slabs) rather than actions, deadlines were still buried, and the icons were inconsistent. 17. Lower.

## r2: changes (from r1: reverted the rows layout, the shell removal, the white CTA and the 700-weight generic headings)
- Kept every critique fix. Course cards are back to the 3-column grid with shorter (4.75rem) palette tiles.
- Upcoming events moved to the top of the right rail, beside the courses. osiris places blocks on a 6-column grid by `.itemN`, so `grid-row ... !important` swaps it with announcements when they are the stock pair. Announcements sit below and no longer stretch. On phone, `order` puts courses, then upcoming, then announcements.
- Detector fixes: no visible text under 12px (every .68–.74rem became .75rem, and "Opens" is 12px). `.course-card` transitions only `transform`. The dropdown text is no longer uppercase.
- The judge still wants the arcade below the courses and on phone; that is structural, see below. 19.

## Left for the coordinator (not CSS)
- The arcade tile lives in `#nm-top-row`, outside osiris's block grid. CSS can't put it after the courses or upcoming events (desktop or phone). Moving it means changing where JS inserts it.
- On phone, the header slot (shortcut chips plus the game and theme icon buttons) takes about 300px before the first card. A nowrap, scrollable chip row would need an agreed shared pattern.
