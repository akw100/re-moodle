# Hill-climb log: giga ("Giga Dusk"), reference giga.ai's website

Judge: `codex exec` with the frozen rubric (`tests/tmp/hc/giga/rubric.txt`), 4 theme shots + `tests/tmp/giga-1.png`, `tests/tmp/giga-2.png`.
Sources: `tools/giga/giga.template.css` + `tools/giga/giga-landscape.py`, built by `tools/giga/giga-build.py`.
Shots, judge output and each round's built CSS: `tests/tmp/hc/giga/r<N>-*.png`, `r<N>-judge.txt`, `r<N>.css`.
Note: the judge script must put the prompt BEFORE the `-i` flags (`-i` is variadic and swallows a trailing prompt).

| round | F | C | U | total | kept |
|---|---|---|---|---|---|
| r0 baseline | 5 | 6 | 6 | 17 | |
| r1 | 6 | 7 | 6 | 19 | yes |
| r2 | 6 | 6 | 6 | 18 | no |
| r3 | 6 | 6.5 | 6 | 18.5 | no |
| r4 | 6 | 7 | 7 | **20** | **final** |
| r5 | 6 | 7 | 6 | 19 | no |
| r6 | 6 | 7 | 6 | 19 | no |

## r0 (baseline): judge's top differences
1. Landscape reads as an illustration (angular ridges, cone firs), not Giga's photo valley.
2. The serif is right, but the type scale is too timid.
3. Too many nested containers (overview wrapper > cards, the capsule around the course tabs).
4. Arcade ranks above deadlines on the phone.
5. Nav and shortcuts are too pill-heavy; the Dashboard tab has a filled pill.
6. Metadata is too small and dim; mono caps are used on data students need to scan.

## r1: changes (kept, 17 → 19)
- Starting critique: the login keeps the real HUJI photo, graded into the dusk (cooled, multiply wash, fade to night), and the valley is now the fixed page background. Course names use the body face, not mono caps. Recently-accessed rows are flat dividers, not nested cards. The Timeline empty state is a drawn hairline disc with a mist check, not a greyed raster. Focus-visible rules went from 1 to 20, per surface: white on the sky, inset in menus and pills, rings on inputs, and login.
- Rewrote `giga-landscape.py`: a V-shaped valley of hazy ridges, a blue-to-rose dusk sky, feTurbulence canopy texture, and feathery pine boughs from the edges instead of cone firs. Sky is #3d5670.
- Nav links unboxed (the active one is white and weight 500 with no fill). Header shortcuts unboxed. No capsule around the course tabs. Course cards are a rounded photo with the name below, with no card chrome. Metadata in the sans face. On phones the arcade moves below the blocks. Title is 58px.

## r1 judge → r2 (reverted, 18)
Asked for: a photo landscape, 64px titles, a transparent nav, desaturated thumbnails, 12px panels, no tinted icon discs, Upcoming above Announcements. r2 did all of these, plus the coordinator's detector fixes. Craft dropped (pines crossed the nav and the shortcuts; the done strip was a boxed layer).

## r3 (reverted, 18.5)
Pines moved off the header, done strip flattened, bold deadline dates, 34px score, 16px block gutters, tighter phone shortcuts, 48px pill login CTA. Still below r1.

## r4 = r1 + required fixes (final, 20)
Stop rule hit (r2 and r3 both failed to beat r1), so r4 is r1 plus only:
- coordinator detector fixes: no visible text under 12px; mono caps only on one- or two-word labels (the counts are now sans "2 to do · 1 done"); "Opens" and "submitted" at 12px; the calendar month names are hidden visually under 768px (they stay as the links' accessible text); the done-list check is translucent, not white
- bug fixes: transparent navbar `.divider` (osiris paints it grey); course tabs at 34px, not 60px; course title wraps with `text-wrap: pretty`, not balance; phone event titles wrap; the done strip is a divider, not a box; the login CTA is a 48px white pill (beats login.css radius).

## r5 (reverted, 19)
Softer, 62%-opacity, blurred boughs; quieter grain; monochrome header favicons; bigger deadline type.

## r6 (reverted, 19)
Transparent nav with the pines kept below it; Upcoming above Announcements on desktop.

## What every round still asked for that CSS can't give
A real photographic landscape asset. Each judge's #1 point was that a procedural SVG reads as an illustration. Closing that needs a licensed dusk-valley photo (e.g. a ~150 KB AVIF/WebP shipped in the extension and exposed via web_accessible_resources). That's a coordinator and asset decision.
