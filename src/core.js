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
  };
  NM.icon = name => {
    const s = document.createElement('span');
    s.className = 'nm-svg nm-svg-' + name;
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
    return s;
  };

  NM.confetti = () => {}; // replaced by features/confetti.js
  NM.THEMES = [
    {id: 'off', name: 'Moodle default', swatch: ['#ffffff', '#0f6cbf']},
    {id: 'quiet-focus', name: 'Quiet Focus', swatch: ['#ffffff', '#c83c2d']},
    {id: 'night-operator', name: 'Night Operator', swatch: ['#080808', '#7772d8']},
    {id: 'daily-quest', name: 'Daily Quest', swatch: ['#ffffff', '#58cc02']},
    {id: 'campus-pop', name: 'Campus Pop', swatch: ['#ed9de3', '#f8d047']},
    {id: 'ahead', name: 'Ahead', swatch: ['#f6f1e9', '#e2704a']},
    {id: 'fal', name: 'Fal', swatch: ['#0b0b0f', '#a78bfa']},
    {id: 'giga', name: 'Giga', swatch: ['#0e1a12', '#c6f432']},
    {id: 'cloudstudio', name: 'Cloudstudio', swatch: ['#eef3f8', '#2f6bff']},
    {id: 'butter', name: 'Butter', swatch: ['#fff7e0', '#ffcf33']},
    {id: 'clay', name: 'Clay', swatch: ['#ffffff', '#5b4bff']},
  ];
})();
