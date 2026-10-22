You are doing design research with the Mobbin MCP tools (search_screens / search_sections, platform "web" mostly). Look at the actual screen images.

Context: a Chrome extension will reskin a university Moodle 4.x student dashboard (Boost-based theme) with switchable THEMES, plus injected widgets: a todo list, an "Upcoming events" block split into "To do" vs "Done/submitted (still editable)" with auto-checked checkboxes, a row of shortcut chips (favicon + site title) next to the "Dashboard" heading, confetti on submit, and a small arcade game with a saved high score.

Task: choose 4 VERY different themes. Each theme is based on exactly ONE reference app found on Mobbin, so it matches that one design system closely. At least one must be wild/maximal. Suggested spread (swap apps for whatever Mobbin has that fits better):
1. calm minimal light (e.g. Notion / Things / Todoist)
2. sleek dark (e.g. Linear / Raycast / Arc)
3. chunky playful (e.g. Duolingo)
4. GO CRAZY: neo-brutalist / maximal (e.g. Gumroad, Poolsuite, Teenage Engineering)

Output markdown only (it goes straight into a build brief for an engineer who cannot see Mobbin):
For each theme:
- id (kebab-case), display name, reference app, 2-4 Mobbin screen URLs (mobbin_url) you actually looked at
- tokens as CSS custom properties, with hex values read from the screenshots: --bg --surface --surface-2 --text --text-muted --border --accent --accent-contrast --success --warning --danger --radius --shadow, font stack (Google Fonts allowed), base font size, border width
- 6-10 component bullets: cards, buttons, headings (case/weight/tracking), list rows, checkboxes, chips, nav bar, motion, signature details
- one sentence on how the Moodle dashboard should feel
Then 1-3 Mobbin refs each, with a 1-2 bullet pattern note, for: (a) a todo list widget, (b) a favicon link-chip / bookmarks row, (c) a collapsible "Completed (n)" section in a task list.
Keep it under ~1000 words. Do not create or edit any files.
