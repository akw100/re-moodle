The Mobbin tools are deferred MCP tools from the 'mobbin' server (mcp__mobbin__search_screens, mcp__mobbin__search_sections): search for them first, then use them. Look at the actual images.

Context: a Chrome extension reskins a university Moodle 4.x student dashboard. The dashboard is a grid of cards/blocks: course cards with images, an upcoming-deadlines list, a calendar month grid, announcements, a personal to-do list, shortcut link chips next to the "Dashboard" heading, plus a small arcade game card. Each THEME follows exactly ONE reference app's design system closely.

The user asked for themes based on these six references. Find each on Mobbin (web platform first; iOS if web is missing; if an app genuinely isn't on Mobbin, say so and propose the closest app that IS there with the same vibe):
1. Ahead (the "Ahead" app)
2. fal (fal.ai)
3. Giga (giga / giga.ai)
4. Cloudstudio (or "Cloud Studio")
5. Butter (butter.us, the workshop/meeting tool)
6. Clay (clay.com)

For each theme output (markdown, concrete, for an engineer who cannot see Mobbin):
- id (kebab-case, e.g. `ahead`, `fal`), display name (short, evocative), reference app, 2-4 Mobbin screen URLs you looked at
- tokens read from the screenshots as CSS custom properties: --bg --surface --surface-2 --text --text-muted --border --accent --accent-contrast --accent-text (accent usable as text, AA on --surface) --success --warning --danger --radius --shadow --border-width, font stack (a free Google Fonts substitute; say what the original typeface looks like), heading font, base font size, and --nm-confetti (comma-separated colors)
- 8-12 component rules: page background treatment (gradients? grain? grid?), cards, card headers, buttons, inputs, list rows, checkboxes, chips, nav bar, course card images treatment, calendar day cells, motion/hover feel, signature details that make it unmistakable
- one sentence: how a student's Moodle dashboard should feel in it
Keep it under ~1600 words. Also save each screen's high-res image_url with curl into research/refs/<theme-id>-<n>.<ext> and append rows to research/refs/INDEX.md (file -> mobbin_url). Do not modify any other files.
