# Live HUJI fixtures: notes

Captured 2026-10-23 from moodle.huji.ac.il/2026-27 (theme `osiris`, Moodle 4.x, body bg `rgb(217,217,217)`).

STATUS: the HTML files are NOT saved yet. The sanitized copies were built in the browser, but the Chrome tool blocks large text output (it blocks base64 and anything that looks like query strings, and cuts off at about 1.5KB). Sending the files to a localhost receiver was also refused. To save them, run `tests/tmp/capture-snippet.js` in DevTools on each page (it downloads `<name>.html`).

## Sources (built size before sanitizing check, chars)
| file | source | size |
|---|---|---|
| dashboard.html | /2026-27/my/ | ~329k |
| course-view.html | /2026-27/course/view.php?id=1230 (55826 Advertising and Communication Management in the Digital era) | ~146k |
| calendar-month.html | /2026-27/calendar/view.php?view=month | ~194k |
| assign-view.html | /2026-27/mod/assign/view.php?id=86371 (67723 "Lab 3 report") | ~128k |
| quiz-view.html | /2026-27/mod/quiz/view.php?id=74369 (67723 "Quiz 3: Git, permissions & neur...") | ~128k |

All five passed the checks: no real name, no user id 63101, no live sesskey, no `nm-` markup. The only absolute moodle.huji.ac.il URLs left point at other years (2024-25, 2025-26) and the mobile-app link.

## Theme CSS (the same on every page)
- `/2026-27/theme/yui_combo.php?rollup/3.18.1/yui-moodlesimple-min.css`
- `/2026-27/theme/styles.php/osiris/1792489249_1781107585/all`

Icon images come from `/2026-27/theme/image.php/osiris/core/1792489249/...`.

## Course page activity row (format-topics)
The 55826 course has only the "General" section, with 3 activities: forum "Announcements", lti "רשימת קריאה", resource "סילבוס הקורס".
```
li.activity.forum.modtype_forum.hasinfo[data-for=cmitem]
  div.activity-item.focus-control[data-region=activity-card][data-activityname]
    div.bulkselect.d-none            (checkbox + label.visually-hidden)
    div.activity-grid
      div.activity-icon.activityiconcontainer.smaller.<purpose>.courseicon.align-self-start.me-2
        img.activityicon             (<purpose> = collaboration | content | ...)
      div.activity-name-area.activity-instance.d-flex.flex-column.me-2
        div.activitytitle.modtype_<mod>.position-relative.align-self-start
          div.activityname
            a.aalink.stretched-link
              span.instancename  "<name>" + span.accesshide "Forum"/"File"
            span.ms-1
              span.activitybadge.badge.rounded-pill   (empty here)
```

## Badges / pills next to activity names
Only `span.activitybadge.badge.rounded-pill`, inside `span.ms-1` after the link. On this course it is empty for both the forum and the resource. No completion pills or "Due" dates on these 3 rows.

## Dashboard Calendar block month navigation
`.block_calendar_month .controls > div.calendar-controls`:
```
a.arrow_link.previous[title="Previous month: September"][data-year][data-month][data-drop-zone=nav-link]
  span.arrow[aria-hidden] "◀︎"   &nbsp;   span.arrow_text "September"
span.hide " | "
h4.current "October 2026"
span.hide " | "
a.arrow_link.next[title="Next month: November"] ...
  span.arrow_text "November"   &nbsp;   span.arrow[aria-hidden] "▶︎"
```
The arrows are text glyphs (U+25C0/U+25B6 + VS15), not icon fonts or images.

## White backgrounds in #page-header (HUJI CSS only, extension not loaded)
- Dashboard: `header#page-header.header-maxwidth.d-print-none` itself is `rgb(255,255,255)` (about 1288x54). Its parent `#topofscroll.main-inner` is transparent there.
- Course, calendar, assign, quiz: nothing inside `#page-header` has a background. The white comes from the ancestor `div#topofscroll.main-inner` (`rgb(255,255,255)`).
- Header outline: `header > div.w-100 > [div.d-flex.flex-wrap (breadcrumb row), div.d-flex.align-items-center > (div.me-auto > div.page-context-header > div.page-header-headings.col; course pages also add ul.teachers), div.header-actions-container], div.header-extras-container`.
