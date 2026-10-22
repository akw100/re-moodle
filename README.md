# Nicer Moodle

A Chrome extension that makes HUJI's Moodle (`moodle.huji.ac.il`, every year site) nicer and more helpful:

- **4 themes + Moodle default.** Each theme follows one design reference: **Quiet Focus** (Todoist), **Night Operator** (Linear dark), **Daily Quest** (Duolingo) and **Campus Pop** (Gumroad neo-brutalist, the crazy one). Switch from the 🎨 button next to "Dashboard" or from the toolbar popup.
- **Upcoming events, split.** Things you already submitted or finished move into a collapsible **Done / submitted, still editable** section, auto-ticked, with an "Edit submission" / "Review" link. You can also tick or untick by hand.
- **My to-dos.** A personal to-do block with due dates, a Completed section, drag to reorder, and sync across your Chrome profiles.
- **Shortcuts.** Link chips on the same line as "Dashboard". Paste a URL and the name fills itself in; hover a chip for a preview card.
- **Confetti.** Fires every time you submit an assignment, finish a quiz or post in a forum, in each theme's own style.
- **Deadline Dash.** A tiny arcade game (🎮). Click the falling assignments before the deadline line. Your high score is always saved.

| Quiet Focus | Night Operator |
|---|---|
| ![](docs/screenshots/quiet-focus-desktop.png) | ![](docs/screenshots/night-operator-desktop.png) |
| **Daily Quest** | **Campus Pop** |
| ![](docs/screenshots/daily-quest-desktop.png) | ![](docs/screenshots/campus-pop-desktop.png) |

## Install (unpacked)

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and pick this folder (the one with `manifest.json`).
3. Open your Moodle dashboard and click 🎨 to pick a theme.

After pulling changes, click the reload ↻ icon on the extension card.

## How "done" is decided (dynamic and deterministic)

On every dashboard load, every time Moodle re-renders the block, and every time you come back to the tab, the extension asks Moodle two things: the upcoming events, and the events that **still need action**. Then one pure function, `classify` in `src/classify.js`, decides each event:

1. Your manual tick or untick wins.
2. "Opens" events, and anything that isn't an action, are info, so they get no checkbox.
3. An event still in Moodle's needs-action list is **to do**.
4. Otherwise it's **done**, because Moodle drops finished items from that list.

Nothing is hard-coded to a student, course or year. If Moodle's API fails, the block is left exactly as Moodle drew it.

## Development

No build step: vanilla JS and CSS, Manifest V3.

```bash
npm install          # Playwright, for the tests only
npm test             # classify unit table
npm run e2e          # every feature, in real Chromium with the extension loaded
npm run shots        # regenerate docs/screenshots/
```

`tests/harness.mjs` loads the unpacked extension in Chromium and serves `fixtures/` at the real Moodle URLs, so the real manifest applies. `fixtures/dashboard.html` is a sanitized copy of the live dashboard's structure. `fixtures/service-mock.json` holds the live API response shapes.

Layout: `src/core.js` (shared `NM` helpers), `src/features/*` (one file per feature), `themes/*.css` (each scoped to `html[data-nm-theme=…]` and built on the `--nm-*` tokens in `src/base.css`), `research/` (the brief's Mobbin references).

## What was verified where

- **Against the real HUJI Moodle (2026-10-23):** the dashboard DOM, the `osiris` theme classes, and the two calendar web services and their response shapes. The done signal was checked on a real account: a finished quiz is absent from the needs-action list, while unsubmitted work is present. Also confirmed that `core_course_get_course_module` and `mod_*` services are disabled there.
- **Only against fixtures, in real Chromium:** everything the extension renders, all five themes at 1280px and 390px, the submit flows that trigger confetti (assignment save and submit, quiz finish, forum post), the game, and storage sync between tabs.

  The fixtures load plain Bootstrap 5 instead of HUJI's theme CSS, so check the real site for small spacing differences, the real nav's "More" menu on phones, and the exact assignment and quiz submit pages.

Known limits:
- The shortcuts preview needs the `<all_urls>` host permission to read other sites' titles.
- To-dos live in `chrome.storage.sync`, which allows about 8 KB per key (roughly 80 to-dos).
