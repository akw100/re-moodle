// Category identities are independent of card order, course IDs, language and theme.
NM.feature('categories', async function init() {
  if (!NM.isDashboard) return;
  const CARD = '[data-region="course-content"], .course-card, .dashboard-card';
  const normalize = text => text.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase();
  const validMap = value => Object.fromEntries(Object.entries(value || {})
    .filter(([, slot]) => Number.isInteger(slot) && slot >= 1 && slot <= 8));
  let slots = validMap(await NM.get('catSlots', {}));
  let raf = 0;

  function apply() {
    raf = 0;
    const cards = [...document.querySelectorAll('[data-region="courses-view"]')]
      .flatMap(view => [...view.querySelectorAll(CARD)]);
    if (!cards.length) return;
    const entries = cards.map(card => {
      const tag = card.querySelector('.categoryname');
      return {card, tag, name: normalize(tag?.textContent || '')};
    });
    // Default code-point sort is deterministic across browser locales.
    const names = [...new Set(entries.map(e => e.name).filter(Boolean))].sort();
    const counts = Array(9).fill(0);
    Object.values(slots).forEach(slot => counts[slot]++);
    let changed = false;
    for (const name of names) {
      if (Object.hasOwn(slots, name)) continue;
      let slot = 1;
      for (let i = 2; i <= 8; i++) if (counts[i] < counts[slot]) slot = i;
      // Computed keys avoid invoking inherited object setters.
      slots = {...slots, [name]: slot};
      counts[slot]++;
      changed = true;
    }
    for (const {card, tag, name} of entries) {
      for (const el of [card, tag].filter(Boolean)) {
        if (!name) {
          el.removeAttribute('data-nm-cat-slot');
          el.style.removeProperty('--nm-cat-color');
        } else {
          const slot = String(slots[name]);
          if (el.dataset.nmCatSlot !== slot) el.dataset.nmCatSlot = slot;
          const color = `var(--nm-cat-${slot})`;
          if (el.style.getPropertyValue('--nm-cat-color') !== color) el.style.setProperty('--nm-cat-color', color);
        }
      }
    }
    if (changed) NM.set('catSlots', slots).catch(error => console.warn('[Re-Moodle] categories storage:', error));
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };
  const observed = new WeakSet();
  function observeViews() {
    document.querySelectorAll('[data-region="courses-view"]').forEach(view => {
      if (observed.has(view)) return;
      observed.add(view);
      // Attribute writes from us and backgrounds.js never trigger this observer.
      new MutationObserver(schedule).observe(view, {childList: true, characterData: true, subtree: true});
      schedule();
    });
  }
  // Moodle may insert or replace the view itself, not only its cards.
  new MutationObserver(records => {
    if (records.some(r => [...r.addedNodes].some(n => n.nodeType === 1 &&
      (n.matches('[data-region="courses-view"]') || n.querySelector('[data-region="courses-view"]'))))) observeViews();
  }).observe(document.body, {childList: true, subtree: true});
  NM.watch('catSlots', value => { slots = validMap(value); schedule(); });
  observeViews();
});
