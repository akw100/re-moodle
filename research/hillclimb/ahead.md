# Hill-climb log: ahead (reference: the Ahead app, iOS on Mobbin)

Judge: `codex exec` with the frozen rubric, given 4 shots (`tests/tmp/hc/ahead/r<N>-{dash,course,login,phone}.png`) plus `tests/tmp/ahead-{1,2,3}.png`.
Scripts: `tests/tmp/ahead-hc-shoot.mjs <tag>`, `tests/tmp/ahead-hc-judge.sh <tag>`. CSS backups: `tests/tmp/hc/ahead/r<N>.css` (the state after round N; r0 is the baseline).

| round | F | C | U | total | kept |
|---|---|---|---|---|---|
| r0 baseline | 5 | 6 | 5 | 16 | |
| r1 | 5 | 7 | 6 | 18 | yes |
| r2 | 6 | 6 | 6 | 18 | yes (tie) |
| r3 | 6 | 7 | 7 | **20** | **yes, final** |
| r4 | 6 | 6 | 6 | 18 | reverted to r3 |

Note: between r1 and r2 the coordinator changed shared files (the arcade is now a compact tile, and the top row is 4/2, or 5/1 from 1400px), so r2 onwards were shot against the new layout.

## r0 (baseline, judge's top differences)
1. The arcade outranks academic content, and Upcoming sits at the bottom of the viewport.
2. Heading hierarchy is too weak (section titles are small and light).
3. Lavender wash and floating white cards everywhere. Ahead's browsing screens are near-white.
4. Course tiles: the polygon banners, white frames and category pills are not Ahead's vocabulary.
5. Phone: about 60px of dead space before the to-dos, and the icon button gets squeezed.
6. Nested rounding (to-do rows inside the panel), tiny icon badges, and an elevated footer.

## r1 (changes)
- Critique: nav and Edit-mode greys go from #7d7489 to #625a6b (5.75:1), and #8a8194 to #655d6e. Deleted the invented "One small step at a time" tagline. The Upcoming title now comes first and the course follows it. Recently accessed is one white sheet with hairline-divided rows, not cards inside a card. Course images are retinted into Ahead pastels with arcs.
- Canvas is near-white (#fffcfe). Body text is 16px and section titles are 22px.
- Upcoming moves to the top of the right column (grid-row swap) and Announcements goes under it.
- Course cards lose their white frame. To-do rows are flat. The footer is flat. Icon buttons are 44px. Login uses Ahead's lavender wash.

## r1 → r2 (judge's top differences)
Arcade still dominant / course tiles blank pastel / weak weight hierarchy / too many floating cards / phone spacing / icons too delicate.

## r2 (changes)
- Course tiles use Ahead's category gradients (coral, magenta, teal, sky, violet) with concentric arcs. Section titles are 24px/700 and h1 is 700.
- Filters, counts and event rows are flatter (hairline bubbles). Event and meta text is 14px. The arcade gets a lighter magenta, a 28px score and no shadow.

## r2 → r3 (judge's top differences)
Titles belong inside the coloured tile / phone puts arcade before deadlines / hierarchy / same lavender outline+elevation everywhere / faint secondary text / ornamental icons and multicolour shortcut chips.

## r3 (changes, plus the coordinator's detector list)
- Course cards become Ahead "Explore categories" tiles: a single gradient surface, a white title inside it, and arcs at the bottom. The top 55% of each gradient keeps white text at 4.5:1 or above. Osiris pads this area with an `#page-my-index` `!important` rule, so the selector repeats the id.
- On phones (575px and narrower) the order is to-dos, Upcoming, courses, arcade. It uses `display: contents` on `#nm-top-row` and `#block-region-content` plus flex `order`. Desktop is unchanged.
- Upcoming rows are pale lavender message bubbles with no border or shadow, and the title is 18px. Activity icons share one treatment (Ahead purple on lavender). Shortcut chips use one neutral lavender. Placeholders are #625a6d.
- Detector: the arcade Play button and the btn-primary / New event button are flat (no thin-border-plus-wide-blur). "Opens", the calendar weekday headers, the arcade label and the shortcut letter/hints are all at least 12px.
- The magenta arcade card is kept. It mirrors Ahead's "Technique of the day" card (magenta gradient, concentric arcs at the end edge, reference image 2), so it is not a generic palette.

## r3 → r4 (judge's top differences)
Tiles too dark (wants brighter coral/pink) / weight hierarchy / too many pills (counts, filters) / phone event gutter / pastel panels+shadows generic / icons.

## r4 (changes) → reverted
Brighter tiles with centred titles, 26px/600 headings, plain-text counts, 12px bordered filters, flat #f8f5fd sheets with no shadows, no circle wells for activity icons, a stronger login wash, and no phone spacer. The score fell to 6/6/6, so the theme is restored to r3.
