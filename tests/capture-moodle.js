// Paste into the DevTools console on your HUJI Moodle dashboard (signed in, /2026-27/my/).
// Builds sanitized copies of five real pages from Moodle's raw HTML (no scripts, your name / user id / sesskey
// scrubbed, none of the extension's own markup) and downloads them as ONE file: moodle-fixtures.json.
// Then: node tests/split-fixtures.mjs ~/Downloads/moodle-fixtures.json
(async () => {
  const W = M.cfg.wwwroot;
  const PAGES = {
    'dashboard': W + '/my/',
    'course-view': W + '/course/view.php?id=1230',
    'calendar-month': W + '/calendar/view.php?view=month',
    'assign-view': W + '/mod/assign/view.php?id=86371',
    'quiz-view': W + '/mod/quiz/view.php?id=74369',
  };
  const fullName = document.querySelector('.usermenu .userinitials')?.getAttribute('title') || '';
  const userId = String(M.cfg.userId || '');
  const cleanNm = root => root.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(a => { if (/^data-nm-/.test(a.name)) el.removeAttribute(a.name); });
    [...el.classList].filter(c => /^nm-/.test(c)).forEach(c => el.classList.remove(c));
  });
  const out = {};
  for (const [name, url] of Object.entries(PAGES)) {
    const raw = await (await fetch(url, {credentials: 'include'})).text();
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    if (name === 'dashboard') { // these three blocks are rendered by JS, so take them from the live page
      for (const s of ['[data-region=courses-view]', '.block_recentlyaccesseditems .card-text', '.block_timeline .card-text']) {
        const l = document.querySelector(s), t = doc.querySelector(s);
        if (l && t) t.innerHTML = l.innerHTML;
      }
    }
    doc.querySelectorAll('script,noscript').forEach(e => e.remove());
    doc.querySelectorAll('*').forEach(el => [...el.attributes].forEach(a => { if (/^on/i.test(a.name)) el.removeAttribute(a.name); }));
    cleanNm(doc);
    doc.querySelectorAll('.userinitials').forEach(e => { e.textContent = 'SN'; });
    doc.querySelectorAll('.popover-region-content-container').forEach(e => { e.innerHTML = ''; });
    doc.querySelectorAll('.popover-region .count-container').forEach(e => { e.textContent = ''; });
    doc.querySelectorAll('input[name=sesskey]').forEach(e => e.setAttribute('value', 'FAKE'));
    const s = doc.createElement('script');
    s.textContent = "window.M={cfg:{wwwroot:location.origin+'/2026-27',sesskey:'FAKE',theme:'osiris'}};";
    doc.head.insertBefore(s, doc.head.firstChild);
    let html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    html = html.split(M.cfg.sesskey).join('FAKE').replace(/sesskey=[^&"'\s<>]+/g, 'sesskey=FAKE');
    html = html.replace(/user\/profile\.php\?id=\d+/g, 'user/profile.php?id=1');
    if (userId) html = html.split(`"${userId}"`).join('"1"').replace(new RegExp(`([?&](amp;)?(userid|user|id)=)${userId}\\b`, 'g'), '$11');
    if (fullName) html = html.split(fullName).join('Student Name');
    html = html.replace(/https?:\\?\/\\?\/moodle\.huji\.ac\.il\\?\/2026-27/g, m => (m.includes('\\') ? '\\/2026-27' : '/2026-27'));
    out[name] = html;
    console.log(name, html.length, 'chars');
  }
  const a = Object.assign(document.createElement('a'), {href: URL.createObjectURL(new Blob([JSON.stringify(out)], {type: 'application/json'})), download: 'moodle-fixtures.json'});
  a.click();
})();
