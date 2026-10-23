# Chrome Web Store submission: Re-Moodle 1.0.1

Upload `dist/re-moodle-1.0.1.zip`, built with `npm run package`. Store images are in `docs/store/`.

## Listing
- **Name:** Re-Moodle
- **Summary** (132 characters max): Remodel your Moodle: themes, a done list, to-dos, shortcuts, confetti and a tiny game.
- **Category:** Education (alternatively Productivity)
- **Language:** English
- **Description:**

  > Re-Moodle makes HUJI's Moodle nicer and more helpful.
  >
  > • 10 themes, each inspired by a well-known app's design, plus Moodle's own look. Switch anytime from the palette button or the toolbar popup. The HUJI login page and the scrollbars follow your theme too.
  > • Upcoming events, split: work you've already submitted moves into a "Done / submitted, still editable" section, so you can see what's left at a glance.
  > • My to-dos: a personal to-do list right on your dashboard, synced across your Chrome profiles.
  > • Shortcuts: pin your favorite links next to the header. Paste a URL and the name fills in; hover for a preview.
  > • Header messages: a random funny line in the voice you pick (tough love, wholesome, sarcastic, stoic, mom, and more).
  > • Custom backgrounds for every course card and dashboard block, plus color-coded departments.
  > • Confetti every time you submit something, and Deadline Dash, a tiny arcade game with a saved high score.
  >
  > Re-Moodle doesn't collect, sell or send your data anywhere. Everything you set stays in your own Chrome storage.

## Single purpose
Restyle and add study-organization features to the HUJI Moodle website (`moodle.huji.ac.il`) and its login page.

## Permission justifications
- **`storage`:** saves your theme, to-dos, shortcuts, done/not-done overrides, backgrounds and high score in `chrome.storage` (sync and local). Nothing leaves the browser.
- **Content scripts on `https://moodle.huji.ac.il/*`:** apply the themes and add the dashboard features. To mark submitted work as done, they read your upcoming events through Moodle's own AJAX endpoints, same-origin, with your existing session.
- **Content script on `https://idp.cc.huji.ac.il/simplesaml/*`, the HUJI login page:** CSS only, plus a tiny script that sets the theme attribute. It never reads, changes or submits the login form, and never touches credentials.
- **No host permissions are required.** The content scripts only match the two HUJI sites.
- **Optional host permissions `https://*/*`, `http://*/*`:** requested only if the user turns on "Link previews" in the toolbar popup, with Chrome's own prompt. When granted, the service worker fetches only a page the user adds as a shortcut, to read its title and preview image. Off by default; without it, shortcuts use the favicon and the site's name from its address.

## Data usage disclosures (privacy form)
- **Data collected:** none sent to the developer or any third party.
- **Handled locally only:** website content (Moodle course and event names, to show them restyled) and user-entered content (to-dos, shortcuts). Both stay in the user's browser and Chrome sync.
- Certify: no sale of data, no use unrelated to the single purpose, no use for creditworthiness or lending.

## Privacy policy
Public URL: **https://akw100.github.io/re-moodle/**. It's GitHub Pages from the `gh-pages` branch, which contains only that page, so the rest of the private repo stays private. The source text is `docs/PRIVACY.md`; if you edit it, regenerate the page on `gh-pages`.

## Images
- **Icon:** `icons/icon128.png`
- **Screenshots, 1280×800:** `docs/store/screenshot-*.png` (Campus Pop, Night Operator, Ahead, Quiet Focus, Cloudstudio)
- **Small promo tile, 440×280:** `docs/store/promo-small-440x280.png`

## Before you submit
- Test the build on the real site once: Load unpacked from `~/Projects/re-moodle`, check the dashboard, a course, an assignment submit (confetti) and the login page.
- **Developer account:** a Chrome Web Store developer account costs a one-time US$5 registration fee. You have to do the payment and the submission yourself.
