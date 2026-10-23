// Runs every registered feature; one broken feature never takes the others (or Moodle) down.
(() => {
  // In-page theme picker, so switching doesn't need the toolbar popup.
  const slot = NM.isDashboard && NM.headerSlot();
  if (slot) {
    const menu = NM.el('div', {class: 'nm-theme-menu', role: 'menu', hidden: true},
      NM.THEMES.map(t => NM.el('button', {class: 'nm-theme-option', role: 'menuitemradio', dataset: {theme: t.id},
        onclick: () => { NM.set('theme', t.id); menu.hidden = true; }},
        NM.el('span', {class: 'nm-swatch', style: `background:linear-gradient(135deg,${t.swatch[0]} 50%,${t.swatch[1]} 50%)`}), t.name)));
    const btn = NM.el('button', {class: 'nm-icon-btn nm-theme-btn', title: 'Theme', 'aria-label': 'Choose theme', 'aria-haspopup': 'menu',
      onclick: e => { e.stopPropagation(); menu.hidden = !menu.hidden; }}, NM.icon('palette'));
    document.addEventListener('click', e => { if (!menu.contains(e.target)) menu.hidden = true; });
    const mark = () => menu.querySelectorAll('.nm-theme-option').forEach(o => o.setAttribute('aria-checked', o.dataset.theme === NM.theme()));
    NM.watch('theme', () => setTimeout(mark));
    mark();
    slot.append(NM.el('div', {class: 'nm-theme-wrap'}, btn, menu));
  }

  for (const f of NM.features) {
    try { Promise.resolve(f.init()).catch(e => console.warn('[Nicer Moodle]', f.name, e)); }
    catch (e) { console.warn('[Nicer Moodle]', f.name, e); }
  }
})();
