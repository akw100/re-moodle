// Shared helpers for every feature. Classic script (content scripts can't be ES modules); everything hangs off NM.
const NM = globalThis.NM = {features: []};
(() => {
  const html = document.documentElement;
  const body = document.body;

  NM.isDashboard = body.classList.contains('pagelayout-mydashboard');
  NM.page = location.pathname.replace(/^.*?\/(mod|my|course|calendar)\//, '$1/'); // e.g. "mod/assign/view.php"
  NM.feature = (name, init) => NM.features.push({name, init});

  // Moodle globals (copied by bridge.js). Fallbacks keep this working if the bridge ran late.
  NM.wwwroot = () => html.dataset.nmWwwroot || location.href.replace(/\/(my|mod|course|calendar|user)\/.*$/, '');
  NM.sesskey = () => html.dataset.nmSesskey ||
    (document.querySelector('a[href*="sesskey="]')?.href.match(/sesskey=(\w+)/) || [])[1];

  // Moodle AJAX web service. Throws on any Moodle error so callers can fall back to "leave Moodle as is".
  NM.call = async (methodname, args) => {
    const url = `${NM.wwwroot()}/lib/ajax/service.php?sesskey=${NM.sesskey()}&info=${methodname}`;
    const res = await fetch(url, {method: 'POST', credentials: 'include', body: JSON.stringify([{index: 0, methodname, args}])});
    const r = (await res.json().catch(() => null))?.[0];
    if (!r || r.error) {
      const err = new Error(`${methodname}: ${r?.exception?.message || 'failed'}`);
      // An expired login comes back as a login redirect (not JSON) or one of these error codes.
      err.session = !r || /login|sesskey|expired/i.test(`${r.exception?.errorcode} ${r.exception?.message}`);
      throw err;
    }
    return r.data;
  };

  // Storage: sync for small user data (todos, shortcuts, theme, overrides), local for bigger/per-device (high score, previews).
  NM.get = (key, def) => chrome.storage.sync.get({[key]: def}).then(r => r[key]);
  NM.set = (key, val) => chrome.storage.sync.set({[key]: val});
  NM.getLocal = (key, def) => chrome.storage.local.get({[key]: def}).then(r => r[key]);
  NM.setLocal = (key, val) => chrome.storage.local.set({[key]: val});
  // Fires for changes made in any tab or the popup.
  NM.watch = (key, cb) => chrome.storage.onChanged.addListener(ch => { if (ch[key]) cb(ch[key].newValue); });

  // Cross-page one-shot flags (e.g. "just clicked submit") that survive the redirect after a form post.
  NM.setFlag = name => sessionStorage.setItem('nm-flag-' + name, String(Date.now()));
  NM.takeFlag = (name, maxAgeMs = 10 * 60 * 1000) => {
    const t = +sessionStorage.getItem('nm-flag-' + name);
    sessionStorage.removeItem('nm-flag-' + name);
    return t > 0 && Date.now() - t < maxAgeMs;
  };

  NM.motion = () => html.dataset.nmMotion !== 'off' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  NM.theme = () => html.dataset.nmTheme || 'off';

  // Tiny element builder: NM.el('button', {class: 'nm-btn', onclick}, 'Hi')
  NM.el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(n.dataset, v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    n.append(...kids.flat().filter(k => k != null && k !== false));
    return n;
  };

  // A dashboard block that looks like Moodle's own (themes style .block.card for free). Returns the content element.
  // HUJI's dashboard region is a CSS grid with every Moodle block explicitly placed, so anything appended to it lands
  // in a new bottom row. Our blocks live in their own row just above that grid instead, in call order.
  NM.block = ({id, title}) => {
    const region = document.querySelector('#block-region-content, [data-blockregion=content]');
    if (!region) return null;
    let row = document.getElementById('nm-top-row');
    if (!row) { row = NM.el('div', {id: 'nm-top-row', class: 'nm-top-row'}); region.before(row); }
    document.getElementById('nm-block-' + id)?.remove();
    const content = NM.el('div', {class: 'card-text content mt-3 nm-block-content'});
    row.append(NM.el('section', {id: 'nm-block-' + id, class: `block card nm-block nm-block-${id}`, role: 'region', 'aria-label': title},
      NM.el('div', {class: 'card-body p-3'},
        NM.el('div', {class: 'd-flex align-items-center nm-block-head'}, NM.el('h3', {class: 'h5 card-title nm-block-title'}, title)),
        content)));
    return content;
  };

  // The row next to the "Dashboard" heading. Features append chips/buttons here.
  NM.headerSlot = () => {
    let slot = document.querySelector('.nm-header-slot');
    if (slot) return slot;
    // The heading sits in a narrow flex column; put the slot next to that column so it shares the heading's line.
    const col = document.querySelector('#page-header .page-header-headings')?.closest('.me-auto, .flex-column');
    if (!col) return null;
    slot = NM.el('div', {class: 'nm-header-slot'});
    col.after(slot);
    return slot;
  };

  // Drawn icons (Lucide paths, 24px grid, 2px stroke) so buttons don't depend on emoji fonts.
  const ICONS = {
    palette: '<circle cx="13.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="17.5" cy="10.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="8.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="6.5" cy="12.5" r="1.2" fill="currentColor" stroke="none"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.83-.44-1.12-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z"/>',
    gamepad: '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.98 3.59C2.6 9.42 2 14.46 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.41.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.54-.6-6.58-.69-7.26A4 4 0 0 0 17.32 5z"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    // Feature widgets (to-dos, Deadline Dash)
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    volume: '<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.41 7.59A1.4 1.4 0 0 1 5.42 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.42a1.4 1.4 0 0 1 .99.41l3.39 3.39a.7.7 0 0 0 1.2-.5z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.36 18.36a9 9 0 0 0 0-12.73"/>',
    volumeX: '<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.41 7.59A1.4 1.4 0 0 1 5.42 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.42a1.4 1.4 0 0 1 .99.41l3.39 3.39a.7.7 0 0 0 1.2-.5z"/><path d="M22 9l-6 6"/><path d="M16 9l6 6"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    play: '<path d="M6 4.2v15.6a1 1 0 0 0 1.5.86l13-7.8a1 1 0 0 0 0-1.72l-13-7.8A1 1 0 0 0 6 4.2z" fill="currentColor"/>',
    rotateCcw: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    coffee: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>',
    fileText: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    sprout: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
    party: '<path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/>',
    graduationCap: '<path d="M21.42 10.92a1 1 0 0 0-.02-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    alarmClock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/><path d="M6.38 18.7 4 21"/><path d="M17.64 18.67 20 21"/>',
  };
  NM.icon = name => {
    const s = document.createElement('span');
    s.className = 'nm-svg nm-svg-' + name;
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
    return s;
  };

  // HUJI renders a whitespace-only activity badge pill next to many activity names; mark them so themes can hide them.
  document.querySelectorAll('.activitybadge').forEach(b => { if (!b.textContent.trim()) b.classList.add('nm-empty'); });

  NM.confetti = () => {}; // replaced by features/confetti.js
  NM.THEMES = [
    {id: 'off', name: 'Moodle default', swatch: ['#ffffff', '#0f6cbf']},
    {id: 'quiet-focus', name: 'Quiet Focus', swatch: ['#fcfaf8', '#d1453b']},
    {id: 'night-operator', name: 'Night Operator', swatch: ['#08090a', '#7772d8']},
    {id: 'daily-quest', name: 'Daily Quest', swatch: ['#ffffff', '#58cc02']},
    {id: 'campus-pop', name: 'Campus Pop', swatch: ['#f4f4ef', '#ff90e8']},
    {id: 'ahead', name: 'Ahead', swatch: ['#f6effb', '#6146ea']},
    {id: 'fal', name: 'Fal', swatch: ['#ffffff', '#7630fb']},
    {id: 'giga', name: 'Giga Dusk', swatch: ['#25364a', '#ffffff']},
    {id: 'cloudstudio', name: 'Cloudstudio', swatch: ['#c7e9f2', '#080d0d']},
    {id: 'butter', name: 'Butter', swatch: ['#fffd63', '#0a0b1e']},
    {id: 'clay', name: 'Clay', swatch: ['#ffffff', '#0773df']},
  ];
})();
