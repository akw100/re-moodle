# butter: hill-climb log (reference: Butter, butter.us)

Judge: Codex, blind, frozen rubric. Butter isn't on Mobbin (the Mobbin `butter-1/2.png` are Pitch), so the judge was told not to search there. References were crops of real butter.us renders from the Wayback Machine: `tests/tmp/hc/butter/ref-hero.png`, `ref-product-poll.png`, `ref-product-cards.png`.
Shots: `tests/tmp/hc/butter/r<N>-{dash,dash-full,course,login,phone,phone-full}.png`. Backups: `r<N>.css` (the state before round N). Shooter: `tests/tmp/butter-hc.mjs`, judge: `tests/tmp/butter-judge.sh`.

| round | F | C | U | total |
|---|---|---|---|---|
| r0 baseline | 7 | 7 | 6 | 20 |
| r1 | 7 | 7 | 6 | 20 |
| r2 (final) | 7 | 7 | 6 | 20 |

The run stopped on the stop rule: two rounds in a row with no gain.

## r0 judge, top differences
1. The arcade (periwinkle, yellow CTA) outweighs the coursework.
2. Too many nested rounded surfaces: course cards inside a card, grey activity rows inside a section card.
3. The type hierarchy is weak at small sizes.
4. Empty announcements and large course thumbnails waste space.
5. Controls mix treatments: a dashed Add button, a heavy outlined Play button, circular icons.
6. Secondary text and focus need more consistency.

## r1 changes (critique A plus the judge's r0 list)
- Arcade is now a white tile with an ink filled CTA, so the to-dos lead.
- Course cards are flat: no border or background, 16px image radius, 96px tall. Thumbnails are recoloured into Butter's section colours (cycling yellow, periwinkle, mint, peach, coral).
- Recently accessed and course `li.activity` rows are flat rows with hairline separators, not cards nested in a card.
- Phone calendar: every day number sits in the same 32px box with `vertical-align: top`. The event dot is drawn inside that box (a radial-gradient), so days with and without dots share one baseline.
- Major panels have a 32px radius.
- Login: a 440px yellow hero band over Butter grey, with the white card overlapping the edge, instead of a full-yellow page.
- The Add chip has a solid ink hairline.

## r1 judge, top differences
1. It reads as a "yellow Moodle skin": Butter's signature periwinkle sections with white panels on them are missing.
2. The arcade still has a prime position.
3. Spacing before content is too large: course header and gaps.
4. Type hierarchy.
5. Elevation is uniform: drop the panel shadows.
6. Controls are too pill-shaped; wants 12px rounded squares.

## r2 changes
- The dashboard's working area sits on a #94a4ff section band (40px radius, 24px padding) with white panels on it, like butter.us's bento. Also tried on the course page; dropped there because a single section looked like a thick frame.
- Panels are flat (`--nm-shadow: none`), and the login card uses a hairline instead of a float shadow.
- Tighter header: h1 maxes out at 36px, 24px padding.
- Course tiles are solid colour fields with no pattern.
- Shortcut chips are 36px tall; icon buttons are 40px rounded squares (12px).
- Coordinator rule: no visible text under 12px. Raised `.nm-up-opens` (was 10.9px), `.nm-game-label`, `.nm-sc-suggest-label` and `.nm-sc-letter`. A sweep of all six pages at both widths (`tests/tmp/butter-small.mjs`) now finds nothing under 12px.

## r2 judge, top differences
1. The rounded periwinkle enclosure reads as card-around-cards. Wants the band full-bleed (radius 0).
2. Wants Upcoming next to the to-dos and the arcade last: needs grid placement or reordering.
3. Wants larger panel headings (24px; the brief caps block titles at 20px).
4. The course colour covers are big decoration. Wants them 12px.
5. Panel gaps are inconsistent. Wants 16px everywhere.
6. Mixed small-control treatments on the course page: the yellow disclosure circle versus pastel icon tiles.
