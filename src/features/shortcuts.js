// Feature 5: shortcut chips on the "Dashboard" heading row.
// DOM (prepended into NM.headerSlot(), so the game button and theme picker stay at the end):
//   div.nm-sc-bar[.nm-sc-editing]
//     ul.nm-sc-list                       horizontal scroller (fade masks: .nm-sc-more-start / .nm-sc-more-end); wraps on phones
//       li.nm-sc-chip[draggable]          one shortcut (the visible pill)
//         a.nm-sc-link > span.nm-sc-icon > img.nm-sc-favicon | span.nm-sc-letter, span.nm-sc-title
//         button.nm-sc-act.nm-sc-act-edit / .nm-sc-act-del    (edit mode only)
//     button.nm-sc-add                    dashed "+ Add"
//     button.nm-sc-edit-toggle            Edit / Done (keyboard and touch users)
//     div.nm-sc-pop[role=dialog]          add/edit form with live preview and HUJI quick-adds
//     div.nm-sc-card[role=tooltip]        hover/focus preview card
//     div.nm-sc-menu[role=menu]           right-click menu
//     div.nm-sc-toast                     "Deleted · Undo"
// Storage: sync 'shortcuts' = [{id, url, title}]; local 'previews' = {url: {title, description, image, siteName, t}}.
NM.feature('shortcuts', async () => {
  if (!NM.isDashboard) return;
  const slot = NM.headerSlot();
  if (!slot || slot.querySelector('.nm-sc-bar')) return;
  const el = NM.el;

  const WEEK = 7 * 864e5;
  const HOVER_MS = 350;
  const SUGGESTIONS = [
    {title: 'Shnaton', url: 'https://shnaton.huji.ac.il/'},
    {title: 'Personal info', url: 'https://orbitlive.huji.ac.il/'},
    {title: 'Panopto', url: 'https://huji.cloud.panopto.eu/'},
    {title: 'Gmail', url: 'https://mail.google.com/'},
    {title: 'Google Drive', url: 'https://drive.google.com/'},
    {title: 'ChatGPT', url: 'https://chatgpt.com/'},
  ];
  const ICONS = {
    plus: '<path d="M8 3.5v9M3.5 8h9"/>',
    pencil: '<path d="M10.8 2.7l2.5 2.5-7.6 7.6-3.2.7.7-3.2z"/>',
    x: '<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>',
    open: '<path d="M9 3h4v4M13 3L7.5 8.5M11.5 9.5V13h-8.5V4.5H6.5"/>',
    copy: '<rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1.5"/><path d="M3 10.5V4.5A1.5 1.5 0 0 1 4.5 3h6"/>',
    left: '<path d="M9.5 4L5.5 8l4 4"/>',
    right: '<path d="M6.5 4l4 4-4 4"/>',
    trash: '<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/>',
  };
  const icon = name => {
    const s = el('span', {class: 'nm-sc-svg', 'aria-hidden': 'true'});
    s.innerHTML = `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
    return s;
  };

  // ---------- URL + title helpers (pure) ----------
  const hostOf = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
  const faviconSrc = url => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(url).hostname)}&sz=64`;
  const BAD_SCHEME = 'Only http:// and https:// links can be shortcuts.';
  const NOT_URL = "That doesn't look like a web address.";
  function normalizeUrl(raw) {
    let s = String(raw ?? '').trim();
    if (!s) return {error: 'Paste or type a link first.'};
    if (s.startsWith('//')) s = 'https:' + s;
    else if (!/^[a-z][a-z\d+.-]*:\/\//i.test(s)) {
      if (/^(javascript|data|vbscript|file|mailto|tel|chrome|about|blob|ftp):/i.test(s)) return {error: BAD_SCHEME};
      s = 'https://' + s;
    }
    let u;
    try { u = new URL(s); } catch { return {error: NOT_URL}; }
    if (!/^https?:$/.test(u.protocol)) return {error: BAD_SCHEME};
    if (/\s/.test(s) || !(u.hostname.includes('.') || u.hostname === 'localhost')) return {error: NOT_URL};
    return {url: u.href};
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  // "drive.google.com" -> "Google Drive", "www.example.com" -> "Example", "orbitlive.huji.ac.il" -> "Huji Orbitlive".
  function prettyHost(url) {
    const host = hostOf(url);
    if (!host || /^[\d.]+$|:/.test(host)) return host || url;
    const labels = host.split('.');
    if (labels.length > 1) labels.pop();
    if (labels.length > 1 && /^(ac|co|com|org|net|gov|edu|or|ne|go)$/.test(labels.at(-1))) labels.pop();
    const main = labels.at(-1), sub = labels[0];
    return labels.length > 1 && !/^(www\d?|m|app|web|my|login|accounts?|portal)$/.test(sub) ? `${cap(main)} ${cap(sub)}` : cap(main);
  }
  // Strip " | Site", " - Site" suffix noise while what's left still means something.
  // On a site's home page the site part is usually the better name: "Home | Shnaton" -> "Shnaton".
  function cleanTitle(raw, url) {
    const t = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    const parts = t.split(/\s+(?:[|\-–—·•»]|::)\s+/).map(s => s.trim()).filter(Boolean);
    const clip = s => s.length > 80 ? s.slice(0, 79).trimEnd() + '…' : s;
    if (parts.length < 2) return clip(t);
    const meaningful = s => s.length >= 3 && /\p{L}/u.test(s) && !/^(home|home ?page|welcome|log ?in|sign ?in|index|main|start page)$/i.test(s);
    const host = hostOf(url).toLowerCase();
    let path = '/';
    try { path = new URL(url).pathname; } catch {}
    const head = parts[0], tail = parts.at(-1);
    const inHost = s => s.toLowerCase().split(/[^\p{L}\d]+/u).some(w => w.length >= 3 && host.includes(w));
    if (path === '/' && meaningful(tail) && inHost(tail)) return clip(tail);
    if (meaningful(head)) return clip(head);
    if (meaningful(tail)) return clip(tail);
    return clip(t);
  }
  const autoName = (url, data) => (data && !data.error && (cleanTitle(data.title, url) || cleanTitle(data.siteName, url))) || prettyHost(url);
  const sameUrl = (a, b) => a.replace(/\/$/, '') === b.replace(/\/$/, '');
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const sanitize = v => (Array.isArray(v) ? v : []).flatMap(x => {
    const url = x && normalizeUrl(x.url).url;
    return url ? [{id: String(x.id || newId()), url, title: String(x.title || '').trim().slice(0, 80) || prettyHost(url)}] : [];
  });
  const isRtl = () => getComputedStyle(bar).direction === 'rtl';

  // ---------- previews (cached in chrome.storage.local, refetched after 7 days) ----------
  let previews = {};
  try { previews = await NM.getLocal('previews', {}) || {}; } catch {}
  const inflight = new Map();
  // Successful previews stay fresh for 7 days; failures (site down, login wall, 403) are retried after a day.
  const fresh = url => { const c = previews[url]; return c && Date.now() - c.t < (c.error ? 864e5 : WEEK) ? c : null; };
  // Writes are queued so parallel fetches don't overwrite each other's entries; each merges into what other tabs cached.
  let writeQ = Promise.resolve();
  const persist = (url, entry) => (writeQ = writeQ.then(async () => {
    const all = {...(await NM.getLocal('previews', {})), [url]: entry};
    const keep = new Set(items.map(i => i.url));
    const extras = Object.keys(all).filter(k => !keep.has(k)).sort((a, b) => all[b].t - all[a].t);
    for (const k of extras.slice(40)) delete all[k];
    previews = {...all, ...previews, [url]: entry};
    await NM.setLocal('previews', all);
  }).catch(() => {}));
  function getPreview(url) {
    const c = fresh(url);
    if (c) return Promise.resolve(c);
    if (inflight.has(url)) return inflight.get(url);
    const p = (async () => {
      let data;
      try { data = await chrome.runtime.sendMessage({type: 'nm-preview', url}); }
      catch (err) { return {error: String(err?.message || err)}; } // extension reloaded etc.: don't cache
      if (!data) return {error: 'no response'};
      const {title, ogTitle, siteName, description, image, finalUrl, favicon, error} = data;
      const entry = error ? {error, favicon, t: Date.now()} : {title, ogTitle, siteName, description, image, finalUrl, favicon, t: Date.now()};
      previews[url] = entry;
      persist(url, entry);
      return entry;
    })().finally(() => inflight.delete(url));
    inflight.set(url, p);
    return p;
  }
  // The service worker tells us when Google has no icon for a host (it serves a generic globe with a 404).
  const noFavicon = url => {
    const host = hostOf(url);
    return Object.entries(previews).some(([u, p]) => p?.favicon === false && hostOf(u) === host);
  };

  const faviconEl = (url, label) => {
    const wrap = el('span', {class: 'nm-sc-icon', 'aria-hidden': 'true'});
    const letter = () => wrap.replaceChildren(el('span', {class: 'nm-sc-letter', dataset: {letter: ([...String(label || hostOf(url) || '?').trim()][0] || '?').toUpperCase()}}));
    let src;
    try { src = faviconSrc(url); } catch { letter(); return wrap; }
    if (noFavicon(url)) { letter(); return wrap; }
    const img = el('img', {class: 'nm-sc-favicon', src, alt: '', width: 16, height: 16, decoding: 'async', referrerpolicy: 'no-referrer', draggable: 'false'});
    img.addEventListener('error', letter, {once: true});
    wrap.append(img);
    return wrap;
  };

  // ---------- DOM skeleton ----------
  let items = sanitize(await NM.get('shortcuts', []));
  let editing = false;

  const list = el('ul', {class: 'nm-sc-list', 'aria-label': 'Shortcuts'});
  const addLabel = el('span', {class: 'nm-sc-add-label'}, 'Add');
  const addBtn = el('button', {type: 'button', class: 'nm-sc-add', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': 'nm-sc-pop',
    onclick: () => (pop.hidden ? openPop({mode: 'add', opener: addBtn}) : closePop(true))}, icon('plus'), addLabel);
  const editLabel = el('span', {class: 'nm-sc-edit-label'}, 'Edit');
  const editBtn = el('button', {type: 'button', class: 'nm-sc-edit-toggle', 'aria-pressed': 'false', title: 'Edit shortcuts',
    onclick: () => setEditing(!editing)}, icon('pencil'), editLabel);
  const live = el('span', {class: 'nm-sc-sr', 'aria-live': 'polite'});
  const announce = msg => { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 30); };

  // Add / edit popover
  const urlIn = el('input', {id: 'nm-sc-url', class: 'nm-sc-input', type: 'text', inputmode: 'url', autocomplete: 'off', spellcheck: 'false',
    placeholder: 'Paste a link, e.g. example.com', 'aria-describedby': 'nm-sc-error'});
  const nameIn = el('input', {id: 'nm-sc-name', class: 'nm-sc-input', type: 'text', autocomplete: 'off', maxlength: '80', placeholder: 'Fills in from the page'});
  const spinner = el('span', {class: 'nm-sc-spinner', role: 'status', 'aria-label': 'Fetching page title', hidden: true});
  const nameField = el('div', {class: 'nm-sc-field'}, nameIn, spinner);
  const errEl = el('p', {id: 'nm-sc-error', class: 'nm-sc-error', role: 'alert'});
  const pv = el('div', {class: 'nm-sc-preview', 'aria-live': 'polite'});
  const popTitle = el('h2', {id: 'nm-sc-pop-title', class: 'nm-sc-pop-title'}, 'Add shortcut');
  const saveBtn = el('button', {type: 'submit', class: 'nm-btn nm-btn-primary nm-sc-save'}, 'Add');
  const delBtn = el('button', {type: 'button', class: 'nm-btn nm-sc-pop-delete', onclick: () => { const id = popState.editId; closePop(false); remove(id); }}, icon('trash'), 'Delete');
  const suggestList = el('div', {class: 'nm-sc-suggest-list'});
  const suggest = el('div', {class: 'nm-sc-suggest'}, el('p', {class: 'nm-sc-suggest-label', id: 'nm-sc-suggest-label'}, 'Quick add'), suggestList);
  const form = el('form', {class: 'nm-sc-form', novalidate: true, onsubmit: e => { e.preventDefault(); submit(); }},
    popTitle,
    el('label', {class: 'nm-sc-label', for: 'nm-sc-url'}, 'Link'), urlIn,
    el('label', {class: 'nm-sc-label', for: 'nm-sc-name'}, 'Name'), nameField,
    errEl, pv,
    el('div', {class: 'nm-sc-actions'}, delBtn, el('button', {type: 'button', class: 'nm-btn nm-sc-cancel', onclick: () => closePop(true)}, 'Cancel'), saveBtn),
    suggest);
  const pop = el('div', {id: 'nm-sc-pop', class: 'nm-sc-pop', role: 'dialog', 'aria-labelledby': 'nm-sc-pop-title', popover: 'manual', hidden: true}, form);

  const card = el('div', {id: 'nm-sc-card', class: 'nm-sc-card', role: 'tooltip', popover: 'manual', hidden: true});
  const menu = el('div', {class: 'nm-sc-menu', role: 'menu', 'aria-label': 'Shortcut actions', popover: 'manual', hidden: true});
  const toast = el('div', {class: 'nm-sc-toast', role: 'status', popover: 'manual', hidden: true});

  const bar = el('div', {class: 'nm-sc-bar'}, list, addBtn, editBtn, pop, card, menu, toast, live);
  slot.prepend(bar);

  // ---------- render ----------
  const byId = id => items.find(i => i.id === id);
  function chipEl(it, oldIcons) {
    // Reuse the already-loaded favicon node so re-renders (edit mode, reorder, other tabs) don't flash empty icons.
    const old = oldIcons?.get(it.url);
    const keep = old && !(noFavicon(it.url) && old.querySelector('.nm-sc-favicon'));
    if (keep) oldIcons.delete(it.url);
    const li = el('li', {class: 'nm-sc-chip', draggable: 'true', dataset: {id: it.id}},
      el('a', {class: 'nm-sc-link', href: it.url, target: '_blank', rel: 'noopener', draggable: 'false',
        'aria-description': editing ? 'Press Enter to edit, arrow keys to move' : null},
        keep ? old : faviconEl(it.url, it.title), el('span', {class: 'nm-sc-title'}, it.title)));
    if (editing) li.append(
      el('button', {type: 'button', class: 'nm-sc-act nm-sc-act-edit', 'aria-label': `Edit ${it.title}`, title: 'Edit'}, icon('pencil')),
      el('button', {type: 'button', class: 'nm-sc-act nm-sc-act-del', 'aria-label': `Delete ${it.title}`, title: 'Delete'}, icon('x')));
    return li;
  }
  function render() {
    const active = document.activeElement;
    const focusId = bar.contains(active) && active.closest('.nm-sc-chip')?.dataset.id;
    const focusCls = focusId && ['nm-sc-act-edit', 'nm-sc-act-del', 'nm-sc-link'].find(c => active.classList.contains(c));
    if (!items.length && editing) editing = false;
    const oldIcons = new Map([...list.querySelectorAll('.nm-sc-link')].map(a => [a.getAttribute('href'), a.querySelector('.nm-sc-icon')]));
    list.replaceChildren(...items.map(it => chipEl(it, oldIcons)));
    bar.classList.toggle('nm-sc-editing', editing);
    bar.dataset.count = items.length;
    addLabel.textContent = items.length ? 'Add' : 'Add shortcut';
    editBtn.hidden = !items.length;
    editBtn.setAttribute('aria-pressed', String(editing));
    editBtn.title = editing ? 'Done editing' : 'Edit shortcuts';
    editLabel.textContent = editing ? 'Done' : 'Edit';
    if (focusId) list.querySelector(`[data-id="${CSS.escape(focusId)}"] .${focusCls}`)?.focus({preventScroll: false});
    hideCard();
    updateFade();
  }
  function updateFade() {
    const max = list.scrollWidth - list.clientWidth;
    const pos = Math.abs(list.scrollLeft); // negative in RTL
    list.classList.toggle('nm-sc-more-start', max > 1 && pos > 1);
    list.classList.toggle('nm-sc-more-end', max > 1 && pos < max - 1);
  }
  list.addEventListener('scroll', () => {
    updateFade();
    // Keep the card glued to its chip while the row scrolls; drop it once the chip leaves the visible part.
    const li = cardId && !card.hidden && list.querySelector(`[data-id="${CSS.escape(cardId)}"]`);
    if (!li) return;
    const r = li.getBoundingClientRect(), v = list.getBoundingClientRect();
    if (r.right < v.left + 8 || r.left > v.right - 8) hideCard(); else place(card, r);
  }, {passive: true});
  new ResizeObserver(updateFade).observe(list);
  // Vertical wheel scrolls the chips sideways while there's somewhere to go; at the ends the page scrolls as usual.
  list.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    const max = list.scrollWidth - list.clientWidth;
    if (max <= 0) return;
    const dir = isRtl() ? -1 : 1;
    const pos = Math.abs(list.scrollLeft);
    if ((e.deltaY > 0 && pos >= max - 1) || (e.deltaY < 0 && pos <= 0)) return;
    e.preventDefault();
    list.scrollLeft += dir * e.deltaY;
  }, {passive: false});

  // ---------- storage ----------
  async function save(next) {
    items = next;
    render();
    try { await NM.set('shortcuts', items); }
    catch (e) { announce(`Couldn't save shortcuts: ${e.message}`); }
    warm().catch(() => {});
  }
  NM.watch('shortcuts', v => {
    const next = sanitize(v);
    if (JSON.stringify(next) === JSON.stringify(items)) return;
    items = next;
    if (!dragId) render();
    warm().catch(() => {});
  });

  let undo = null, toastTimer;
  function remove(id) {
    const i = items.findIndex(x => x.id === id);
    if (i < 0) return;
    const it = items[i];
    const nextFocus = items[i + 1]?.id || items[i - 1]?.id;
    save(items.filter(x => x.id !== id));
    const target = nextFocus && list.querySelector(`[data-id="${CSS.escape(nextFocus)}"] ${editing ? '.nm-sc-act-del' : '.nm-sc-link'}`);
    (target || (editBtn.hidden ? addBtn : editBtn)).focus();
    undo = () => { const copy = items.slice(); copy.splice(Math.min(i, copy.length), 0, it); save(copy); };
    showToast(`Deleted “${it.title}”`);
    announce(`Deleted ${it.title}. Undo is available.`);
  }
  function showToast(msg) {
    clearTimeout(toastTimer);
    toast.replaceChildren(el('span', {class: 'nm-sc-toast-msg'}, msg),
      el('button', {type: 'button', class: 'nm-sc-toast-undo', onclick: () => { undo?.(); undo = null; setOpen(toast, false); announce('Restored'); }}, 'Undo'));
    setOpen(toast, true);
    toastTimer = setTimeout(() => { setOpen(toast, false); undo = null; }, 6000);
  }
  function move(id, delta) {
    const i = items.findIndex(x => x.id === id), j = i + delta;
    if (i < 0 || j < 0 || j >= items.length) return;
    const copy = items.slice();
    copy.splice(j, 0, copy.splice(i, 1)[0]);
    save(copy);
    announce(`Moved ${byId(id).title} to position ${j + 1} of ${items.length}`);
  }
  const visualDelta = key => (key === 'ArrowLeft' ? -1 : 1) * (isRtl() ? -1 : 1);
  function setEditing(on) {
    editing = on;
    render();
    announce(on ? 'Editing shortcuts. Delete, edit, or use arrow keys to reorder.' : 'Done editing');
  }

  // ---------- positioning ----------
  // Popover, card, menu and toast live in the browser's top layer (popover="manual"), so a theme's overflow:hidden
  // or transform on the header can't clip them. They're position:fixed at the anchor, clamped to the viewport.
  function setOpen(node, open) {
    node.hidden = !open;
    if (typeof node.showPopover === 'function') { try { open ? node.showPopover() : node.hidePopover(); } catch {} }
  }
  function place(node, rect, {at} = {}) {
    setOpen(node, true);
    const w = node.offsetWidth, h = node.offsetHeight;
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const rtl = isRtl();
    let left = at ? (rtl ? at.x - w : at.x) : (rtl ? rect.right - w : rect.left);
    left = Math.max(8, Math.min(left, vw - w - 8));
    let top = at ? at.y : rect.bottom + 6;
    if (top + h > vh - 8) { const above = (at ? at.y : rect.top - 6) - h; if (above >= 8) top = above; }
    node.style.left = `${Math.round(left)}px`;
    node.style.top = `${Math.round(top)}px`;
  }

  // ---------- chip interactions ----------
  list.addEventListener('click', e => {
    const li = e.target.closest('.nm-sc-chip');
    if (!li) return;
    const it = byId(li.dataset.id);
    if (e.target.closest('.nm-sc-act-del')) return remove(it.id);
    if (e.target.closest('.nm-sc-act-edit') || (editing && e.target.closest('.nm-sc-link'))) {
      e.preventDefault();
      openPop({mode: 'edit', item: it, opener: li.querySelector('.nm-sc-link')});
    }
  });
  list.addEventListener('keydown', e => {
    const li = e.target.closest('.nm-sc-chip');
    if (!li) return;
    if (editing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target.matches('.nm-sc-link')) {
      e.preventDefault();
      move(li.dataset.id, visualDelta(e.key));
    } else if (editing && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      remove(li.dataset.id);
    } else if (e.key === 'Escape') {
      hideCard();
      if (editing) setEditing(false);
    }
  });
  list.addEventListener('contextmenu', e => {
    const li = e.target.closest('.nm-sc-chip');
    if (!li) return;
    e.preventDefault();
    const r = li.getBoundingClientRect();
    // Keyboard-triggered (ContextMenu key / Shift+F10) events have no useful mouse position: anchor under the chip.
    const fromMouse = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    openMenu(byId(li.dataset.id), r, fromMouse ? {x: e.clientX, y: e.clientY} : null);
  });

  // ---------- hover / focus preview card ----------
  let hoverTimer, hideTimer, cardId = null;
  const blocked = () => !pop.hidden || !menu.hidden || dragId || editing;
  function scheduleCard(li) {
    clearTimeout(hideTimer);
    if (blocked()) return;
    if (cardId === li.dataset.id && !card.hidden) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => showCard(li), HOVER_MS);
  }
  function hideCard() {
    clearTimeout(hoverTimer);
    clearTimeout(hideTimer);
    setOpen(card, false);
    if (cardId) list.querySelector(`[data-id="${CSS.escape(cardId)}"] .nm-sc-link`)?.removeAttribute('aria-describedby');
    cardId = null;
  }
  function cardBody(it, data, loading) {
    const page = data && !data.error && data.title && cleanTitle(data.title, it.url) !== it.title ? data.title : null;
    let path = '';
    try { const u = new URL(it.url); path = (u.pathname + u.search).replace(/^\/$/, ''); } catch {}
    const img = data?.image && el('img', {class: 'nm-sc-card-img', src: data.image, alt: '', referrerpolicy: 'no-referrer', decoding: 'async'});
    img?.addEventListener('error', () => img.remove(), {once: true});
    return [
      img,
      el('div', {class: 'nm-sc-card-body'},
        el('div', {class: 'nm-sc-card-head'},
          faviconEl(it.url, it.title),
          el('div', {class: 'nm-sc-card-text'},
            el('strong', {class: 'nm-sc-card-title'}, it.title),
            el('span', {class: 'nm-sc-card-host', dir: 'ltr'}, hostOf(it.url), path && el('span', {class: 'nm-sc-card-path'}, path)))),
        page && el('p', {class: 'nm-sc-card-page'}, page),
        loading ? el('div', {class: 'nm-sc-skel-wrap'}, el('span', {class: 'nm-sc-skel'}), el('span', {class: 'nm-sc-skel nm-sc-skel-short'}))
          : data?.description && el('p', {class: 'nm-sc-card-desc'}, data.description),
        el('p', {class: 'nm-sc-card-hint'}, 'Right-click to edit or remove')),
    ];
  }
  async function showCard(li) {
    const it = byId(li.dataset.id);
    if (!it || blocked() || !li.isConnected) return;
    cardId = it.id;
    const cached = previews[it.url]; // may be stale: show it while refreshing
    const draw = (data, loading) => {
      if (cardId !== it.id || !li.isConnected) return;
      card.replaceChildren(...cardBody(it, data, loading).filter(Boolean));
      place(card, li.getBoundingClientRect());
    };
    li.querySelector('.nm-sc-link').setAttribute('aria-describedby', 'nm-sc-card');
    draw(cached, !fresh(it.url) && !cached);
    if (!fresh(it.url)) { draw(await getPreview(it.url), false); refreshIcons(); }
  }
  list.addEventListener('pointerover', e => {
    const li = e.target.closest('.nm-sc-chip');
    if (li && e.pointerType !== 'touch') scheduleCard(li);
  });
  list.addEventListener('pointerout', e => {
    const li = e.target.closest('.nm-sc-chip');
    if (!li || li.contains(e.relatedTarget)) return;
    clearTimeout(hoverTimer);
    if (!li.contains(document.activeElement)) hideTimer = setTimeout(hideCard, 100);
  });
  list.addEventListener('focusin', e => {
    const li = e.target.closest('.nm-sc-chip');
    if (li && e.target.matches('.nm-sc-link:focus-visible')) scheduleCard(li);
  });
  list.addEventListener('focusout', e => { if (!list.contains(e.relatedTarget)) hideCard(); });

  // ---------- context menu ----------
  let menuFor = null;
  function openMenu(it, rect, at) {
    hideCard();
    closePop(false);
    menuFor = it.id;
    const i = items.indexOf(it);
    const rtl = isRtl();
    const canLeft = rtl ? i < items.length - 1 : i > 0, canRight = rtl ? i > 0 : i < items.length - 1;
    const item = (ic, label, fn, extra = {}) => el('button', {type: 'button', role: 'menuitem', class: `nm-sc-menu-item ${extra.cls || ''}`, tabindex: '-1',
      disabled: extra.disabled, onclick: () => { closeMenu(extra.keepFocus ? false : true); fn(); }}, icon(ic), el('span', {}, label));
    menu.replaceChildren(
      item('open', 'Open in new tab', () => window.open(it.url, '_blank', 'noopener')),
      item('copy', 'Copy link', () => navigator.clipboard?.writeText(it.url).then(() => announce('Link copied'), () => {})),
      el('div', {class: 'nm-sc-menu-sep', role: 'separator'}),
      item('pencil', 'Edit', () => openPop({mode: 'edit', item: it, opener: chipLink(it.id)}), {keepFocus: true}),
      item('left', 'Move left', () => { move(it.id, rtl ? 1 : -1); chipLink(it.id)?.focus(); }, {disabled: !canLeft}),
      item('right', 'Move right', () => { move(it.id, rtl ? -1 : 1); chipLink(it.id)?.focus(); }, {disabled: !canRight}),
      el('div', {class: 'nm-sc-menu-sep', role: 'separator'}),
      item('trash', 'Delete', () => remove(it.id), {cls: 'nm-sc-danger', keepFocus: true}));
    place(menu, rect, {at});
    menu.querySelector('.nm-sc-menu-item:not(:disabled)')?.focus();
  }
  const chipLink = id => list.querySelector(`[data-id="${CSS.escape(id)}"] .nm-sc-link`);
  function closeMenu(restoreFocus) {
    if (menu.hidden) return;
    setOpen(menu, false);
    if (restoreFocus && menuFor) chipLink(menuFor)?.focus();
    menuFor = null;
  }
  menu.addEventListener('keydown', e => {
    const opts = [...menu.querySelectorAll('.nm-sc-menu-item:not(:disabled)')];
    const i = opts.indexOf(document.activeElement);
    const go = n => { e.preventDefault(); opts[(n + opts.length) % opts.length]?.focus(); };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(opts.length - 1);
    else if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); }
    else if (e.key === 'Tab') closeMenu(false);
  });

  // ---------- add / edit popover ----------
  const popState = {mode: 'add', editId: null, opener: null, nameTouched: false, seq: 0, lastUrl: null, pending: null, fetched: null};
  let debounce;
  function setBusy(on) {
    spinner.hidden = !on;
    nameField.classList.toggle('nm-sc-busy', on);
    nameIn.setAttribute('aria-busy', String(on));
  }
  function showErr(msg) {
    errEl.textContent = msg || '';
    urlIn.setAttribute('aria-invalid', String(!!msg));
  }
  function renderPv(url, data, loading) {
    // The box always keeps its size, so nothing below it jumps while you type or click Save.
    pv.classList.toggle('nm-sc-empty', !url);
    if (!url) {
      pv.classList.remove('nm-sc-loading');
      pv.replaceChildren(el('span', {class: 'nm-sc-preview-icon'}, icon('open')), el('span', {class: 'nm-sc-preview-hint'}, 'Paste a link and the name and preview fill in automatically.'));
      return;
    }
    const title = loading ? null : autoName(url, data);
    const img = data?.image && el('img', {class: 'nm-sc-preview-img', src: data.image, alt: '', referrerpolicy: 'no-referrer'});
    img?.addEventListener('error', () => img.remove(), {once: true});
    pv.classList.toggle('nm-sc-loading', !!loading);
    pv.replaceChildren(
      el('span', {class: 'nm-sc-preview-icon'}, faviconEl(url, title || hostOf(url))),
      el('div', {class: 'nm-sc-preview-text'},
        loading ? el('span', {class: 'nm-sc-skel'}) : el('strong', {class: 'nm-sc-preview-title'}, title),
        el('span', {class: 'nm-sc-preview-host', dir: 'ltr'}, hostOf(url)),
        !loading && data?.description && el('span', {class: 'nm-sc-preview-desc'}, data.description),
        !loading && data?.error && el('span', {class: 'nm-sc-preview-desc'}, "Couldn't read the page, so the name comes from its address.")),
      img || '');
  }
  async function runPreview() {
    clearTimeout(debounce);
    const {url} = normalizeUrl(urlIn.value);
    if (!url) { popState.lastUrl = null; popState.seq++; setBusy(false); renderPv(null); return; }
    if (url === popState.lastUrl) return;
    popState.lastUrl = url;
    const token = ++popState.seq;
    if (!popState.nameTouched) nameIn.placeholder = prettyHost(url);
    const cached = fresh(url);
    if (!cached) { setBusy(true); renderPv(url, null, true); }
    const p = getPreview(url);
    popState.pending = p;
    const data = await p;
    if (token !== popState.seq) return;
    popState.pending = null;
    popState.fetched = {url, data};
    setBusy(false);
    renderPv(url, data);
    if (!popState.nameTouched) nameIn.value = autoName(url, data);
  }
  urlIn.addEventListener('input', () => {
    showErr('');
    clearTimeout(debounce);
    debounce = setTimeout(runPreview, 450);
  });
  urlIn.addEventListener('paste', () => setTimeout(runPreview, 0));
  urlIn.addEventListener('blur', () => {
    const {url} = normalizeUrl(urlIn.value);
    if (url && urlIn.value.trim() !== url) urlIn.value = url;
    if (url) runPreview();
  });
  nameIn.addEventListener('input', () => { popState.nameTouched = nameIn.value.trim() !== ''; });

  function renderSuggestions() {
    const left = SUGGESTIONS.filter(s => !items.some(i => hostOf(i.url) === hostOf(s.url)));
    suggest.hidden = popState.mode !== 'add' || !left.length;
    suggestList.replaceChildren(...left.map(s => el('button', {type: 'button', class: 'nm-sc-suggestion', 'aria-label': `Add ${s.title}`,
      onclick: () => {
        save([...items, {id: newId(), url: s.url, title: s.title}]);
        announce(`Added ${s.title}`);
        renderSuggestions();
        (suggestList.querySelector('button') || urlIn).focus();
        place(pop, popState.anchor.getBoundingClientRect());
      }}, faviconEl(s.url, s.title), el('span', {}, s.title), el('span', {class: 'nm-sc-suggestion-plus'}, icon('plus')))));
  }

  function openPop({mode, item, opener, prefillUrl}) {
    hideCard();
    closeMenu(false);
    Object.assign(popState, {mode, editId: item?.id || null, opener: opener || addBtn, nameTouched: !!item, lastUrl: null, pending: null, fetched: null});
    popState.seq++;
    clearTimeout(debounce);
    showErr('');
    setBusy(false);
    popTitle.textContent = mode === 'edit' ? 'Edit shortcut' : 'Add shortcut';
    saveBtn.textContent = mode === 'edit' ? 'Save' : 'Add';
    delBtn.hidden = mode !== 'edit';
    urlIn.value = item?.url || prefillUrl || '';
    nameIn.value = item?.title || '';
    nameIn.placeholder = 'Fills in from the page';
    renderPv(null);
    if (item) renderPv(item.url, previews[item.url] || {title: item.title});
    renderSuggestions();
    addBtn.setAttribute('aria-expanded', String(mode === 'add'));
    popState.anchor = mode === 'edit' && opener ? opener.closest('.nm-sc-chip') : addBtn;
    place(pop, popState.anchor.getBoundingClientRect());
    urlIn.focus();
    if (item) urlIn.select();
    if (prefillUrl) runPreview();
  }
  function closePop(restoreFocus) {
    if (pop.hidden) return;
    setOpen(pop, false);
    popState.seq++;
    clearTimeout(debounce);
    addBtn.setAttribute('aria-expanded', 'false');
    if (restoreFocus) (popState.opener?.isConnected ? popState.opener : addBtn).focus();
  }
  pop.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePop(true); } });

  async function submit() {
    const {url, error} = normalizeUrl(urlIn.value);
    if (!url) { showErr(error); urlIn.focus(); return; }
    const editId = popState.mode === 'edit' ? popState.editId : null;
    if (items.some(x => x.id !== editId && sameUrl(x.url, url))) { showErr('That link is already in your shortcuts.'); urlIn.focus(); return; }
    let title = nameIn.value.trim();
    if (!title) {
      // Name left empty: use the page title if it arrives quickly, else the prettified host.
      if (popState.lastUrl !== url) runPreview();
      saveBtn.disabled = true;
      if (popState.pending) await Promise.race([popState.pending, new Promise(r => setTimeout(r, 1500))]);
      saveBtn.disabled = false;
      if (pop.hidden) return;
      title = popState.fetched?.url === url ? autoName(url, popState.fetched.data) : prettyHost(url);
    }
    title = title.slice(0, 80);
    if (editId) {
      save(items.map(x => x.id === editId ? {...x, url, title} : x));
      announce(`Saved ${title}`);
    } else {
      save([...items, {id: newId(), url, title}]);
      announce(`Added ${title}`);
      requestAnimationFrame(() => { list.scrollTo({left: isRtl() ? -list.scrollWidth : list.scrollWidth, behavior: NM.motion() ? 'smooth' : 'auto'}); });
    }
    closePop(false);
    (editId ? chipLink(editId) : addBtn)?.focus();
  }

  // Click outside closes popover and menu.
  document.addEventListener('pointerdown', e => {
    if (!pop.hidden && !pop.contains(e.target) && !addBtn.contains(e.target)) closePop(false);
    if (!menu.hidden && !menu.contains(e.target)) closeMenu(false);
  }, true);
  // Fixed-position surfaces follow their anchor when the page scrolls or resizes.
  const follow = e => {
    if (e.target === list) return; // the row's own scroll is handled above
    hideCard();
    closeMenu(false);
    if (!pop.hidden && popState.anchor?.isConnected) place(pop, popState.anchor.getBoundingClientRect());
  };
  window.addEventListener('resize', follow);
  window.addEventListener('scroll', follow, {capture: true, passive: true});

  // ---------- drag and drop (native) ----------
  let dragId = null;
  const clearMarks = () => list.querySelectorAll('.nm-sc-drop-before, .nm-sc-drop-after').forEach(c => c.classList.remove('nm-sc-drop-before', 'nm-sc-drop-after'));
  function dropSpot(x) {
    const rtl = isRtl();
    const chips = [...list.children].filter(c => c.dataset.id !== dragId);
    for (const c of chips) {
      const r = c.getBoundingClientRect(), mid = r.left + r.width / 2;
      if (rtl ? x > mid : x < mid) return {li: c, before: true};
    }
    return chips.length ? {li: chips.at(-1), before: false} : null;
  }
  list.addEventListener('dragstart', e => {
    const li = e.target.closest?.('.nm-sc-chip');
    if (!li) return;
    dragId = li.dataset.id;
    const it = byId(dragId);
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('text/x-nm-shortcut', dragId);
    e.dataTransfer.setData('text/uri-list', it.url);
    e.dataTransfer.setData('text/plain', it.url);
    hideCard();
    closeMenu(false);
    requestAnimationFrame(() => li.classList.add('nm-sc-dragging'));
  });
  list.addEventListener('dragover', e => {
    if (!dragId) {
      // A link dragged in from elsewhere: offer to add it.
      if (e.dataTransfer.types.includes('text/uri-list')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; bar.classList.add('nm-sc-drop-target'); }
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const spot = dropSpot(e.clientX);
    clearMarks();
    spot?.li.classList.add(spot.before ? 'nm-sc-drop-before' : 'nm-sc-drop-after');
  });
  list.addEventListener('dragleave', e => { if (!list.contains(e.relatedTarget)) { clearMarks(); bar.classList.remove('nm-sc-drop-target'); } });
  list.addEventListener('drop', e => {
    e.preventDefault();
    bar.classList.remove('nm-sc-drop-target');
    if (!dragId) {
      const raw = e.dataTransfer.getData('text/uri-list').split(/\r?\n/).find(l => l && !l.startsWith('#')) || e.dataTransfer.getData('text/plain');
      if (raw) openPop({mode: 'add', opener: addBtn, prefillUrl: raw.trim()});
      return;
    }
    const spot = dropSpot(e.clientX);
    clearMarks();
    if (!spot) return;
    const moving = byId(dragId);
    const rest = items.filter(x => x.id !== dragId);
    const at = rest.findIndex(x => x.id === spot.li.dataset.id) + (spot.before ? 0 : 1);
    rest.splice(at, 0, moving);
    const id = dragId;
    dragId = null;
    if (rest.map(x => x.id).join() !== items.map(x => x.id).join()) {
      save(rest);
      announce(`Moved ${moving.title} to position ${at + 1} of ${rest.length}`);
    } else render();
    chipLink(id)?.focus({preventScroll: true});
  });
  list.addEventListener('dragend', () => {
    dragId = null;
    clearMarks();
    list.querySelectorAll('.nm-sc-dragging').forEach(c => c.classList.remove('nm-sc-dragging'));
  });

  // Warm the preview cache for chips that have none (or a stale one), a few at a time once the page is idle,
  // so hover cards open instantly and missing favicons become letter avatars.
  const refreshIcons = () => list.querySelectorAll('.nm-sc-chip').forEach(li => {
    const it = byId(li.dataset.id);
    if (it && noFavicon(it.url) && li.querySelector('.nm-sc-favicon')) li.querySelector('.nm-sc-icon').replaceWith(faviconEl(it.url, it.title));
  });
  async function warm() {
    const todo = items.filter(i => !fresh(i.url));
    for (let i = 0; i < todo.length; i += 3) {
      await Promise.all(todo.slice(i, i + 3).map(it => getPreview(it.url)));
      refreshIcons();
    }
  }

  render();
  (window.requestIdleCallback || setTimeout)(() => warm().catch(() => {}), {timeout: 3000});
});
