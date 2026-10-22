# Moodle theme brief

All linked screens were visually inspected. Hex values are **visual approximations**, not pixel-sampled brand specifications. Fonts are implementation substitutes; motion and semantic color assignments are proposed adaptations. Each theme follows exactly one reference app.

## 1. `quiet-focus` — Quiet Focus
**Reference: Todoist** · [Today](https://mobbin.com/screens/15d32901-2cde-4eaf-9dce-142c4507eac4) · [Inbox](https://mobbin.com/screens/3fbd781f-bb91-44dc-b814-eb4dbd93117a)

```css
--bg:#FFFFFF; --surface:#FFFFFF; --surface-2:#FAF9F7;
--text:#202020; --text-muted:#777777; --border:#EEEEEE;
--accent:#C83C2D; --accent-contrast:#FFFFFF;
--success:#4B9563; --warning:#B87928; --danger:#C83C2D;
--radius:6px; --shadow:none;
--font:Arial,"Noto Sans Hebrew",sans-serif;
--font-size:14px; --border-width:1px;
```

- **Cards:** mostly borderless; generous whitespace separates blocks.
- **Buttons:** restrained red primary action; secondary actions are text with small icons.
- **Headings:** sentence case, 700 weight, normal tracking; dashboard title 24px.
- **Rows:** thin bottom rules; title above smaller course/deadline metadata.
- **Checkboxes:** 18px circular outlines; checked state gains a tick.
- **Chips:** compact, softly tinted rectangles; favicon precedes plain text.
- **Navigation:** warm off-white background; pale peach active row with red icon/text.
- **Motion/signature:** 120ms fades; subtle completion feedback and a small submission-confetti burst; arcade sits in a quiet collapsible block.

**Feel:** a spacious daily agenda that makes the next assignment immediately obvious.

## 2. `night-operator` — Night Operator
**Reference: Linear** · [Grouped issues](https://mobbin.com/screens/e142df2a-3527-499c-8f81-1b715947ac0c) · [Project overview](https://mobbin.com/screens/267d16a1-982b-4479-85b5-22294fdab01a) · [Board](https://mobbin.com/screens/720724d3-f686-457f-8c00-fa7efa409b12)

```css
--bg:#080808; --surface:#101010; --surface-2:#191919;
--text:#EEEEEE; --text-muted:#909090; --border:#262626;
--accent:#7772D8; --accent-contrast:#FFFFFF;
--success:#4DAA83; --warning:#D8BD54; --danger:#E47743;
--radius:6px; --shadow:none;
--font:Inter,"Noto Sans Hebrew",sans-serif;
--font-size:13px; --border-width:1px;
```

- **Cards:** dark, closely spaced panels with barely visible outlines.
- **Buttons:** compact charcoal controls; reserve violet for selected/primary states.
- **Headings:** sentence case, 600 weight, −0.02em tracking; 22px dashboard title.
- **Rows:** dense aligned columns; muted course identifiers and right-aligned deadlines.
- **Checkboxes:** fine circular outlines; violet checked circles echo completed issue statuses.
- **Chips:** tiny icon-label capsules with restrained fills.
- **Navigation:** almost-black rail; active item receives a charcoal rounded rectangle.
- **Motion/signature:** 100ms state transitions; small status dots, disclosure headers and tabular arcade scores; brief violet confetti.

**Feel:** a precise command center for managing coursework after dark.

## 3. `daily-quest` — Daily Quest
**Reference: Duolingo** · [Review dashboard](https://mobbin.com/screens/990e202e-248a-4e84-b44c-ce7d71107b04) · [Collections and quests](https://mobbin.com/screens/781f3022-614e-4eab-96ae-d9f305925ff5)

```css
--bg:#FFFFFF; --surface:#FFFFFF; --surface-2:#DDF4FF;
--text:#3C3C3C; --text-muted:#777777; --border:#E5E5E5;
--accent:#58CC02; --accent-contrast:#173500;
--success:#58CC02; --warning:#FFC800; --danger:#FF4B4B;
--radius:16px; --shadow:0 3px 0 #E5E5E5;
--font:Nunito,"Noto Sans Hebrew",sans-serif;
--font-size:16px; --border-width:2px;
```

- **Cards:** rounded white containers with thick outlines and solid bottom edges.
- **Buttons:** chunky, uppercase, 800 weight; pressed state translates downward 3px.
- **Headings:** friendly sentence case, 800 weight; uppercase navigation uses 0.06em tracking.
- **Rows:** generous spacing; colorful subject icons and clear secondary descriptions.
- **Checkboxes:** large rounded squares with emphatic green ticks.
- **Chips:** pill-shaped outlined buttons; selected chips use pale blue.
- **Navigation:** colorful pictograms; blue outlined active item.
- **Motion/signature:** short spring on completion, yellow progress bars, celebratory confetti; arcade high score appears as a trophy badge.

**Feel:** a friendly learning quest where finishing work earns visible celebration.

## 4. `campus-pop` — Campus Pop
**Reference: Gumroad** · [Pink/yellow landing screen](https://mobbin.com/screens/f6db0041-c4e6-493e-890a-8c21015d1c4a) · [Dashboard checklist](https://mobbin.com/screens/11e8ca62-05d0-4225-a0a8-c27b381ac134) · [Illustrated dashboard](https://mobbin.com/screens/de1a416b-d0e5-4731-9173-c506b3a783a4)

```css
--bg:#F4F4EF; --surface:#FFFFFF; --surface-2:#F8D047;
--text:#000000; --text-muted:#595959; --border:#000000;
--accent:#ED9DE3; --accent-contrast:#000000;
--success:#509E91; --warning:#F8D047; --danger:#E76F51;
--radius:2px; --shadow:4px 4px 0 #000000;
--font:"DM Sans","Noto Sans Hebrew",sans-serif;
--font-size:16px; --border-width:1px;
```

- **Cards:** large pink/yellow color fields, black rules, occasional hard offset shadows.
- **Buttons:** rectangular black CTAs with white text; pink secondary buttons.
- **Headings:** oversized sentence case, 500 weight, −0.04em tracking; dashboard title 56px.
- **Rows:** ruled ledger structure; underlined assignment links.
- **Checkboxes:** black circular outlines; teal checked circles.
- **Chips:** outlined ticket shapes with favicon/title; alternate pink and yellow fills.
- **Navigation:** solid black with white labels and pink selection.
- **Motion/signature:** tactile 2px presses; sticker-like course illustrations, oversized arcade score, pink/yellow confetti.

**Feel:** a loud student zine with disciplined task tables inside a maximal Gumroad-inspired frame.

## Widget patterns

### A. Todo list
[Todoist Today](https://mobbin.com/screens/75c4093b-73e7-4344-b2e7-54e90d94e58c)

- Leading completion circle, title/description stack, small metadata and inline “Add task”; preserve this hierarchy across themes.

### B. Favicon shortcut row
[Linear resources](https://mobbin.com/screens/267d16a1-982b-4479-85b5-22294fdab01a) · [Adobe application shortcuts](https://mobbin.com/screens/1a02e9e5-8c8f-4c45-b879-fa45065326be)

- Adapt Linear’s icon-plus-resource labels and Adobe’s recognizable app icons into horizontal favicon/title chips beside “Dashboard.” These are analogous patterns, not exact bookmark-chip examples.

### C. Collapsible “Completed (n)”
[Linear “Done 17” group](https://mobbin.com/screens/e142df2a-3527-499c-8f81-1b715947ac0c) · [Asana Done section](https://mobbin.com/screens/c1eba8c1-ef08-47f3-a66f-204a9c885c98)

- Use a disclosure chevron, label and count; collapse completed rows without hiding the header.
- For Upcoming events, label it **“Done/submitted (n) — still editable.”** Auto-check from Moodle submission state; keep an explicit **Edit submission** link. Confetti fires only after confirmed submission. Respect reduced motion in every theme.