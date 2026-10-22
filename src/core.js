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
    const [r] = await res.json();
    if (!r || r.error) throw new Error(`${methodname}: ${r?.exception?.message || 'failed'}`);
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

  // A dashboard block that looks like Moodle's own (themes style .block.card for free).
  // Returns the content element. `before` = data-block name of a Moodle block to insert before; default = top.
  NM.block = ({id, title, before, icon = ''}) => {
    const region = document.querySelector('#block-region-content, [data-blockregion=content]');
    if (!region) return null;
    document.getElementById('nm-block-' + id)?.remove();
    const content = NM.el('div', {class: 'card-text content mt-3 nm-block-content'});
    const section = NM.el('section', {id: 'nm-block-' + id, class: `block card mb-3 nm-block nm-block-${id}`, role: 'region', 'aria-label': title},
      NM.el('div', {class: 'card-body p-3'},
        NM.el('div', {class: 'd-flex align-items-center nm-block-head'}, NM.el('h3', {class: 'h5 card-title nm-block-title'}, icon ? icon + ' ' : '', title)),
        content));
    const ref = before && region.querySelector(`[data-block="${before}"]`);
    region.insertBefore(section, ref || region.firstChild);
    return content;
  };

  // The row next to the "Dashboard" heading. Features append chips/buttons here.
  NM.headerSlot = () => {
    let slot = document.querySelector('.nm-header-slot');
    if (slot) return slot;
    const headings = document.querySelector('#page-header .page-header-headings');
    if (!headings) return null;
    slot = NM.el('div', {class: 'nm-header-slot'});
    headings.after(slot);
    return slot;
  };

  NM.confetti = () => {}; // replaced by features/confetti.js
  NM.THEMES = [
    {id: 'off', name: 'Moodle default', swatch: ['#ffffff', '#0f6cbf']},
    {id: 'quiet-focus', name: 'Quiet Focus', swatch: ['#ffffff', '#c83c2d']},
    {id: 'night-operator', name: 'Night Operator', swatch: ['#080808', '#7772d8']},
    {id: 'daily-quest', name: 'Daily Quest', swatch: ['#ffffff', '#58cc02']},
    {id: 'campus-pop', name: 'Campus Pop', swatch: ['#ed9de3', '#f8d047']},
  ];
})();
