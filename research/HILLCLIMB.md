# Theme hill-climb protocol (round 3)

The user wants every theme to **align to its original reference nicely**. Hill-climb toward that: build, get a blind score from an independent judge that sees the reference, fix, and repeat. Keep a change only if it scores better.

`research/THEME-BRIEF.md` still applies in full: own file only, the scoping, @font-face, the must-fix list, the craft floor, and **never touch the real HUJI site** (only `tests/harness.mjs` with `live: true`).

## Loop (max 4 rounds after baseline; stop early on the stop rule)

1. **Shoot** with the harness (`launch({live: true, storage: {theme, todos, shortcuts}, local: {highscore: 2450, gamesPlayed: 7}, viewport})`, seeded like `tests/screenshots.mjs`):
   - `/my/` at 1440×1000 (viewport only, not full page, so the judge sees the first impression) and full page
   - `/my/` at 390×844
   - `/course/view.php?id=1230` at 1440×1000
   - `LOGIN_URL` at 1440×1000

   Save them as `tests/tmp/hc/<theme>/r<N>-<view>.png`.
2. **Judge (blind, cross-model).** Codex scores with the reference images attached. It can also pull MORE screens of the reference app from Mobbin; the Mobbin tools are deferred MCP tools from the `mobbin` server (`mcp__mobbin__search_screens`), so it must search for them first. Run, with stdin closed:
   ```bash
   codex exec --skip-git-repo-check -s read-only -i <ours-dash.png> -i <ours-course.png> -i <ours-login.png> -i <ours-phone.png> -i <ref1.png> -i <ref2.png> [-i <ref3.png>] "<RUBRIC>" < /dev/null
   ```
   The rubric is FROZEN; paste it verbatim, filling in the app name:
   > You are judging a browser-extension theme that restyles a university Moodle dashboard to look like **<REFERENCE APP>**. The first 4 images are the theme (dashboard desktop, course page, login, dashboard phone); the remaining images are the real <REFERENCE APP> UI. You may also search Mobbin for more <REFERENCE APP> screens: the Mobbin tools are deferred MCP tools from the 'mobbin' server; search for them first, then use `search_screens`. Score each 0–10, strictly (7 = good, 9 = a <REFERENCE APP> designer would sign off):
   > - **FIDELITY**: does it use the same design system? Type family/weights/sizes, color palette and how color is used, corner radii, borders and shadows, density/spacing rhythm, iconography style, and the signature components and layout patterns.
   > - **CRAFT**: contrast at least 4.5:1, alignment, spacing hierarchy, no clipping/overlap, consistent states, no nested cards, no decoration that doesn't belong to the reference.
   > - **USABILITY**: can a student instantly see what's due, scan their courses, and act? Is nothing important visually buried?
   >
   > Then list the 6 most impactful concrete differences from <REFERENCE APP>, most impactful first. For each: which element in our screenshots, what the reference does instead (cite the Mobbin URL if you used one), and an exact visual change (values: px, hex, weight, radius). Output: `FIDELITY=<n> CRAFT=<n> USABILITY=<n>` on the first line, then the list. Don't propose structural JS changes; CSS only.
3. **Fix** the top differences in your theme file, plus anything from the critique list you were given. Make one coherent set of changes per round.
4. **Keep or revert:** before each round, back up `themes/<theme>.css` to `tests/tmp/hc/<theme>/r<N>.css`. If the new total (F+C+U) is lower than the best so far, restore the best backup and try a different fix for that issue.
5. **Log** every round in `research/hillclimb/<theme>.md`: the scores, the judge's top differences (one line each) and what you changed.

**Stop rule:** FIDELITY ≥ 9 and CRAFT ≥ 8.5 and USABILITY ≥ 8, OR two rounds in a row with no gain, OR 4 rounds done. Finish on the best-scoring version.

## Final report (short)
- the score trajectory (`baseline → r1 → … → final`) for F, C and U
- the 3 biggest changes
- anything you couldn't fix with CSS alone (structure that needs JS; describe it for the coordinator)
- picker swatch `[bg, accent]` if it changed
- 2 screenshot paths (dashboard desktop, plus the most improved view)
