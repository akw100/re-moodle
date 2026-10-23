# Theme pass (wave 2), brief for Codex workers

Project: `/Users/ayeletwasserman/Projects/re-moodle`, Re-Moodle, a Chrome extension (MV3) that reskins HUJI's Moodle with 10 themes (`themes/*.css`, each scoped to `html[data-nm-theme="<id>"]` and built on the `--nm-*` tokens in `src/base.css`). Read `README.md`, `research/THEME-BRIEF.md` (the rules) and `/Users/ayeletwasserman/.claude/skills/impeccable/reference/craft-floor.md` (the quality floor).

## Hard rules
- Edit ONLY your assigned theme file(s). For `giga`, edit `tools/giga/giga.template.css` and run `python3 tools/giga/giga-build.py` to regenerate `themes/giga.css`. Never edit `src/`, `tests/` (except scratch in `tests/tmp/codex-<theme>/`), `manifest.json` or another theme. No git commits.
- **Never access the real HUJI sites** (`moodle.huji.ac.il`, `idp.cc.huji.ac.il`): no curl, no browser, no fetch. The user's account could get blocked. Use only `tests/harness.mjs`, which serves sanitized copies of the user's real pages offline: `launch({live: true, storage: {theme: '<id>', todos, shortcuts}, local: {highscore: 2450, gamesPlayed: 7}, viewport})`, then `open('/my/')`, `open('/course/view.php?id=1230')`, `open('/mod/resource/view.php?id=1')` (PDF page), `open(LOGIN_URL)`. See `tests/screenshots.mjs` for seeding.
- Keep every animation off under `html[data-nm-motion="off"]` and `prefers-reduced-motion`. No text under 12px. Body text contrast at least 4.5:1. RTL-safe: use logical properties.

## What changed in shared code (adapt your theme to it)
1. **The "Dashboard" heading is replaced by a random message.**
   - The h1 is visually hidden (clip-path), and `p.nm-motd > button.nm-motd-btn` shows a one- or two-line message, up to about 75 characters (`src/features/motd.*`).
   - Base styling is `clamp(1.25rem, 1rem + 1.2vw, 2rem)` in `--nm-heading-font`.
   - Restyle `.nm-motd` in your theme's voice and drop now-pointless giant-h1 rules.
   - Move any h1 decoration onto `.nm-motd` or `.page-header-headings` (Campus Pop's sticker; Cloudstudio's hand-drawn underline). It must look great with short AND long messages, at 1440 and 390.
   - Force a long one for testing with `html[data-nm-motd-force=data]`, or by clicking the button a few times.
2. **The gamepad header button is gone.** Delete dead `.nm-game-btn` and teaser-art (`.nm-game-teaser*`, `.nm-game-drop*`) rules.
3. **Arcade card:** `#nm-block-game` now fills the top row's height, with Play pinned to the bottom (`src/features/game.css`, `src/base.css`). Don't break that: no fixed heights and no `align-self: start`.
4. **Links:** `src/base.css` removes underlines from navigational and list links and shows a drawn link-anchor glyph on hover and focus. Prose links keep underlines. Remove your theme's own underline rules for list and nav links: course names, activity names, event names, recently accessed, timeline, block footers. Keep them for prose.
5. **Hover outlines:** base removes osiris's teal hover borders and outlines on icon buttons. Make sure your theme adds NO borders or outlines on hover. Keep a clear `:focus-visible` ring.
6. **Backgrounds feature** (`src/features/backgrounds.*`): each course card and dashboard block has a hover-only brush button (`.nm-bg-btn`) that opens `.nm-bg-pop`.
   - A customized card's image (`.nm-bg-img`) gets an inline background.
   - Cards carry `--nm-course-color` and `--nm-course-bg`; blocks carry `--nm-block-bg` and the classes `.nm-bg-surface` / `.nm-bg-frameless`.
   - If your theme hides course images and shows a glyph or tile instead, color it from `var(--nm-course-color, <your default>)`.
   - Style the button and popover to fit your theme. `--nm-bg-elev` is the popover shadow; `--nm-bg-btn-bg` and `--nm-bg-btn-fg` are the button colors.
7. **PDF page:** `body.path-mod-resource` embeds are full width now. Check your theme doesn't narrow them.

## The user's feedback for this pass
- **"Some areas need backgrounds."** On Cloudstudio: "this needs borders or something around sections." Every dashboard block, top-row card and course section must read as a clear container: a surface background and/or a hairline border with padding, faithful to your reference. No content floating on the page background.
- **"Night Operator is way too stuffed."** For `night-operator` only: declutter hard.
  - More whitespace and calmer density.
  - Drop the per-block group-header strips, status glyphs on every title, capsules on every course name and extra icons.
  - Use quieter section headers and fewer borders.
  - Keep the Linear dark feel: think Linear's calm list views, not a dashboard of widgets.

## Process (bounded)
1. Build.
2. Shoot 1440×1000 and 390×844 of `/my/`, `/course/view.php?id=1230`, the PDF page and the login page.
3. Look at the shots with your image viewer.
4. Fix everything.
5. Run ONE confirm round. Also run `node tests/backgrounds.e2e.mjs` and `node tests/motd.e2e.mjs`; both must still pass.

## Report (short)
- what you changed per theme
- the must-fix items above, each with fixed / not applicable
- 2 screenshot paths per theme

## Theme-specific notes from the user
- **campus-pop:** "move the you got this badge to a better spot." Today it drops under the header message, at the bottom-left. Pin it as a tilted sticker on the pink hero's top-end corner, overlapping the hero's top edge or the marquee band, at about 72px. It must never overlap the message, the shortcut chips or the theme button, at 1440 and at 390 (on phones, scale it down or hide it if there's no room). Keep it fully visible, not clipped.
- **campus-pop:** "add background to the course area." The Course overview cards float on the canvas. Give the whole Course overview block (filters plus card grid) a white panel with the theme's 1px black rule, matching how Upcoming events and Latest announcements sit in panels.

## Hooks from the shared-fixes agent (use these, remove the listed overrides)
- **Links:** base removes underlines on list and nav links with high specificity. Delete your own underline or `:hover` underline rules for those links. Glyph variables: `--nm-link-anchor-icon` (`--nm-link-anchor-chain` is a chain variant), `--nm-link-anchor-size`, `--nm-link-anchor-gap`, `--nm-link-anchor-color`. Focus ring: `--nm-focus-ring`.
- **Arcade card:** `.nm-block-game > .card-body > .nm-block-content > .nm-game-teaser > .nm-game-stats` (`.nm-game-stat-label`, `.nm-game-stat-value`, `.nm-game-stat-sub`), then `button.nm-game-play`. Variables: `--nm-game-screen-bg` (the score panel tint), `--nm-game-score-size`, `--nm-game-score-size-compact`. REMOVE these overrides:
  - fixed score font sizes (campus-pop, cloudstudio, ahead, clay, butter);
  - fal's `.nm-game-stats::after` decoration;
  - quiet-focus and night-operator `align-items: start` / `.nm-game-teaser { flex: none }`;
  - any `.nm-game-btn` and teaser-art rules.
- **quiet-focus (≥768px) and night-operator (≥1200px)** currently move the arcade out of the top row in their own layouts. The user wants the to-dos and the arcade at the TOP, so keep them in the top row (side by side) in those themes too.
- **PDF:** `--nm-pdf-offset` (fal: set it from its custom navbar height).
