// Runs every registered feature; one broken feature never takes the others (or Moodle) down.
(() => {
  const slot = NM.isDashboard && NM.headerSlot();
  if (slot) themePicker(slot);

  for (const f of NM.features) {
    try { Promise.resolve(f.init()).catch(e => console.warn('[Re-Moodle]', f.name, e)); }
    catch (e) { console.warn('[Re-Moodle]', f.name, e); }
  }
  try { alignFooter(); } catch (e) { console.warn('[Re-Moodle] footer', e); }

  // Under a theme, base.css drops osiris's 60% footer column and sets the footer's inline margins to
  // --nm-foot-start/-end, so its edges line up with the content column. That column's edges come from #page-header,
  // which every theme positions; they're measured against the footer's parent, which the margins don't move.
  function alignFooter() {
    const foot = document.getElementById('page-footer');
    const ref = () => document.getElementById('page-header') || document.getElementById('region-main');
    if (!foot || !ref()) return;
    let raf = 0;
    const run = () => {
      raf = 0;
      if (!document.documentElement.dataset.nmTheme) return; // stock Moodle keeps its own footer
      const parent = foot.parentElement;
      const r = ref()?.getBoundingClientRect(), p = parent.getBoundingClientRect(), ps = getComputedStyle(parent);
      if (!r?.width || !p.width) return;
      // the parent's content box
      const left = p.left + parseFloat(ps.borderLeftWidth) + parseFloat(ps.paddingLeft);
      const right = p.right - parseFloat(ps.borderRightWidth) - parseFloat(ps.paddingRight);
      const rtl = getComputedStyle(foot).direction === 'rtl';
      const px = v => `${Math.max(0, Math.round(v))}px`;
      foot.style.setProperty('--nm-foot-start', px(rtl ? right - r.right : r.left - left));
      foot.style.setProperty('--nm-foot-end', px(rtl ? r.left - left : right - r.right));
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(run); };
    run();
    new ResizeObserver(schedule).observe(ref());
    new MutationObserver(schedule).observe(document.documentElement, {attributes: true, attributeFilter: ['data-nm-theme']});
    window.addEventListener('resize', schedule);
    document.fonts?.ready.then(schedule);
  }

  // In-page theme picker: a popover of preview tiles, grouped Calm / Dark / Bold, each showing its theme's signature
  // (swatch colors, heading font, radius, border, shadow; see NM.themeTiles in core.js).
  // It lives in the top layer (popover="manual", position:fixed, clamped to the viewport), so a theme's
  // overflow:hidden or transform on the header can't clip it. Picking a theme keeps it open, so you can
  // compare themes live; Esc, an outside click or tabbing out closes it.
  function themePicker(slot) {
    const {el} = NM;
    const {nodes, tiles} = NM.themeTiles('nm-theme-g');
    const grid = el('div', {class: 'nm-theme-grid', role: 'radiogroup', 'aria-labelledby': 'nm-theme-pop-title'}, nodes);
    const pop = el('div', {id: 'nm-theme-pop', class: 'nm-theme-menu nm-theme-pop', role: 'dialog', 'aria-labelledby': 'nm-theme-pop-title',
      popover: 'manual', hidden: true},
    el('div', {class: 'nm-theme-pop-head'},
      el('h2', {id: 'nm-theme-pop-title', class: 'nm-theme-pop-title'}, 'Theme')),
    grid, voiceControl());
    const btn = el('button', {type: 'button', class: 'nm-icon-btn nm-theme-btn', title: 'Choose theme', 'aria-label': 'Choose theme',
      'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': 'nm-theme-pop'}, NM.icon('palette'));
    slot.append(el('div', {class: 'nm-theme-wrap'}, btn));
    document.body.append(pop);

    const isOpen = () => !pop.hidden;
    const rtl = () => getComputedStyle(grid).direction === 'rtl';
    const current = () => tiles.find(t => t.dataset.theme === NM.theme()) || tiles[0];

    // aria-checked marks the active theme; a roving tabindex keeps exactly one tile tabbable.
    function mark(id = NM.theme()) {
      for (const t of tiles) t.setAttribute('aria-checked', String(t.dataset.theme === id));
    }
    function focusTile(t) {
      for (const x of tiles) x.tabIndex = x === t ? 0 : -1;
      t.focus({preventScroll: true});
      t.scrollIntoView({block: 'nearest'});
    }

    function setShown(on) {
      pop.hidden = !on;
      if (typeof pop.showPopover === 'function') { try { on ? pop.showPopover() : pop.hidePopover(); } catch {} }
    }
    // Under the button with its inline-end edge on the button's; flip above when there's no room; clamp to the viewport.
    function place() {
      const r = btn.getBoundingClientRect();
      const w = pop.offsetWidth, h = pop.offsetHeight;
      const vw = document.documentElement.clientWidth, vh = window.innerHeight;
      let left = rtl() ? r.left : r.right - w;
      left = Math.max(8, Math.min(left, vw - w - 8));
      let top = r.bottom + 8;
      if (top + h > vh - 8 && r.top - 8 - h >= 8) top = r.top - 8 - h;
      top = Math.max(8, Math.min(top, vh - h - 8));
      Object.assign(pop.style, {left: `${Math.round(left)}px`, top: `${Math.round(top)}px`, right: 'auto', bottom: 'auto'});
    }
    function open() {
      mark();
      setShown(true);
      btn.setAttribute('aria-expanded', 'true');
      place();
      focusTile(current());
    }
    function close(returnFocus) {
      if (!isOpen()) return;
      setShown(false);
      btn.setAttribute('aria-expanded', 'false');
      if (returnFocus) btn.focus();
    }

    btn.addEventListener('click', () => (isOpen() ? close(false) : open()));
    grid.addEventListener('click', e => {
      const t = e.target.closest('.nm-theme-tile');
      if (!t) return;
      mark(t.dataset.theme); // immediate feedback; storage then re-themes every open tab
      NM.set('theme', t.dataset.theme);
      focusTile(t);
    });

    // Arrows move through the grid (visual direction, RTL aware; Up/Down by geometry), Home/End jump,
    // Enter/Space select (native button click).
    pop.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return close(true); }
      const i = tiles.indexOf(document.activeElement);
      if (i < 0) return;
      const j = NM.tileStep(tiles, i, e.key, rtl());
      if (j === null) return;
      e.preventDefault();
      focusTile(tiles[j]);
    });

    // An outside click closes it without pulling focus back; so does tabbing out.
    document.addEventListener('pointerdown', e => {
      if (isOpen() && !pop.contains(e.target) && !btn.contains(e.target)) close(false);
    }, true);
    pop.addEventListener('focusout', e => {
      if (e.relatedTarget && !pop.contains(e.relatedTarget) && e.relatedTarget !== btn) close(false);
    });
    // Follow the button when the page scrolls or resizes.
    const follow = () => { if (isOpen()) place(); };
    window.addEventListener('resize', follow);
    window.addEventListener('scroll', follow, {capture: true, passive: true});

    NM.watch('theme', id => { mark(id); if (isOpen()) requestAnimationFrame(place); });
    mark();
  }

  // "Header voice" under the tiles: which voice the dashboard's header message speaks in (features/motd.js).
  function voiceControl() {
    if (!NM.VOICES) return null;
    const {el} = NM;
    const sel = el('select', {id: 'nm-voice-select', class: 'nm-voice-select'}, NM.VOICES.map(v => el('option', {value: v.id}, v.name)));
    NM.get('voice', 'mixed').then(v => { sel.value = v || 'mixed'; });
    sel.addEventListener('change', () => NM.set('voice', sel.value));
    NM.watch('voice', v => { sel.value = v || 'mixed'; });
    return el('div', {class: 'nm-voice'},
      el('label', {class: 'nm-voice-label', for: 'nm-voice-select'}, 'Header voice'),
      el('span', {class: 'nm-voice-field'}, sel));
  }
})();
