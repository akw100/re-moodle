// Runs every registered feature; one broken feature never takes the others (or Moodle) down.
(() => {
  const slot = NM.isDashboard && NM.headerSlot();
  if (slot) themePicker(slot);

  for (const f of NM.features) {
    try { Promise.resolve(f.init()).catch(e => console.warn('[Re-Moodle]', f.name, e)); }
    catch (e) { console.warn('[Re-Moodle]', f.name, e); }
  }

  // In-page theme picker: a popover of preview tiles, one per theme, painted from each theme's swatch.
  // It lives in the top layer (popover="manual", position:fixed, clamped to the viewport), so a theme's
  // overflow:hidden or transform on the header can't clip it. Picking a theme keeps it open, so you can
  // compare themes live; Esc, an outside click or tabbing out closes it.
  function themePicker(slot) {
    const {el} = NM;
    const tiles = NM.THEMES.map(t => el('button', {
      type: 'button', class: 'nm-theme-tile', role: 'radio', 'aria-checked': 'false', tabindex: '-1', title: t.name,
      dataset: {theme: t.id}, style: `--t-bg:${t.swatch[0]};--t-accent:${t.swatch[1]}`,
    },
    el('span', {class: 'nm-theme-prev', 'aria-hidden': 'true'},
      el('span', {class: 'nm-theme-prev-card'},
        el('span', {class: 'nm-theme-prev-bar'}), el('span', {class: 'nm-theme-prev-line'}), el('span', {class: 'nm-theme-prev-line'}))),
    el('span', {class: 'nm-theme-name'}, t.name)));
    const grid = el('div', {class: 'nm-theme-grid', role: 'radiogroup', 'aria-labelledby': 'nm-theme-pop-title'}, tiles);
    const pop = el('div', {id: 'nm-theme-pop', class: 'nm-theme-menu nm-theme-pop', role: 'dialog', 'aria-labelledby': 'nm-theme-pop-title',
      popover: 'manual', hidden: true},
    el('div', {class: 'nm-theme-pop-head'},
      el('span', {class: 'nm-theme-pop-eyebrow'}, 'Re-Moodle'),
      el('h2', {id: 'nm-theme-pop-title', class: 'nm-theme-pop-title'}, 'Theme')),
    grid);
    const btn = el('button', {type: 'button', class: 'nm-icon-btn nm-theme-btn', title: 'Theme', 'aria-label': 'Choose theme',
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

    // Arrows move through the grid (visual direction, RTL aware), Home/End jump, Enter/Space select (native button click).
    pop.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return close(true); }
      const i = tiles.indexOf(document.activeElement);
      if (i < 0) return;
      const cols = Math.max(1, tiles.filter(t => t.offsetTop === tiles[0].offsetTop).length);
      const side = rtl() ? -1 : 1;
      const step = {ArrowRight: side, ArrowLeft: -side, ArrowDown: cols, ArrowUp: -cols}[e.key];
      let j;
      if (step !== undefined) {
        j = i + step;
        if (Math.abs(step) === cols && (j < 0 || j >= tiles.length)) j = i; // up/down stop at the edges
        j = Math.max(0, Math.min(tiles.length - 1, j));
      } else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = tiles.length - 1;
      else return;
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
})();
