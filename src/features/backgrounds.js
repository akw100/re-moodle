// Feature: custom backgrounds for course cards and for every dashboard block.
//
// Course cards (Course overview, card view): a 28px brush button at the image's top-end corner, shown on hover or
// focus-within, opens a popover: Theme default / Original image / Colors / Gradients / Patterns / Image URL.
// Blocks (Moodle's section.block.card[data-block] and our #nm-top-row .nm-block): the same button in the block header
// opens a smaller popover: Theme default / Tints / Soft gradients / Patterns, all built from the theme's own surface
// so text stays readable in every theme.
//
// DOM we add:
//   .nm-bg-host                                   on each course card and each block we manage
//   .nm-bg-set / [data-nm-bg-kind]                on a card or block that has an override
//   button.nm-bg-btn.nm-bg-btn-course             absolutely positioned inside the card
//   button.nm-bg-btn.nm-bg-btn-block              in the block header (.card-body > .d-flex / .nm-block-head)
//   .nm-bg-img                                    the card's image element (.card-img-top / .dashboard-card-img) once overridden
//   div.nm-bg-pop[popover=manual][role=dialog]    one per kind (#nm-bg-pop-course, #nm-bg-pop-block), in the top layer
// Custom properties for themes (set inline on the card / block):
//   --nm-course-bg     the full background (a CSS `background` value) of the card's override
//   --nm-course-color  its base color (color, pattern color, or a gradient's main hue); unset for images
//   --nm-block-bg      the block's background value
// Storage (sync): courseBg = {[courseId]: {kind: 'color'|'gradient'|'pattern'|'image'|'original', value, color?}}
//                 blockBg  = {[blockKey]: {kind: 'tint'|'gradient'|'pattern', value}}   blockKey = data-block or the nm block id
NM.feature('backgrounds', async () => {
  if (!NM.isDashboard) return;
  const el = NM.el;

  // ---------- palettes ----------
  const COLORS = [
    {id: 'coral', name: 'Coral', css: '#ef5b5b'},
    {id: 'tangerine', name: 'Tangerine', css: '#f7893b'},
    {id: 'marigold', name: 'Marigold', css: '#f2c14e'},
    {id: 'lime', name: 'Lime', css: '#9bc53d'},
    {id: 'emerald', name: 'Emerald', css: '#2bb673'},
    {id: 'teal', name: 'Teal', css: '#139a9a'},
    {id: 'sky', name: 'Sky', css: '#3fa7f5'},
    {id: 'cobalt', name: 'Cobalt', css: '#3b5bdb'},
    {id: 'violet', name: 'Violet', css: '#7c5cff'},
    {id: 'orchid', name: 'Orchid', css: '#c45ad6'},
    {id: 'rose', name: 'Rose', css: '#f06595'},
    {id: 'graphite', name: 'Graphite', css: '#3a3f47'},
    {id: 'accent', name: 'Theme accent', css: 'var(--nm-accent)'},
    {id: 'surface', name: 'Theme surface', css: 'var(--nm-surface-2)'},
  ];
  const GRADIENTS = [
    {id: 'sunrise', name: 'Sunrise', base: '#f9b26e', css: 'linear-gradient(135deg, #f6d365, #fda085)'},
    {id: 'peach', name: 'Peach', base: '#fcc6ad', css: 'linear-gradient(135deg, #ffecd2, #fcb69f)'},
    {id: 'ember', name: 'Ember', base: '#ec6a2c', css: 'linear-gradient(135deg, #e52d27, #f5a623)'},
    {id: 'berry', name: 'Berry', base: '#d2527f', css: 'linear-gradient(135deg, #b24592, #f15f79)'},
    {id: 'dusk', name: 'Dusk', base: '#9a4d7c', css: 'linear-gradient(135deg, #3a1c71, #d76d77 60%, #ffaf7b)'},
    {id: 'lagoon', name: 'Lagoon', base: '#2e94a0', css: 'linear-gradient(135deg, #43cea2, #185a9d)'},
    {id: 'sky', name: 'Sky', base: '#a9cdfc', css: 'linear-gradient(135deg, #a1c4fd, #c2e9fb)'},
    {id: 'mint', name: 'Mint', base: '#b2efa0', css: 'linear-gradient(135deg, #d4fc79, #96e6a1)'},
    {id: 'midnight', name: 'Midnight', base: '#203a43', css: 'linear-gradient(160deg, #0f2027, #203a43 55%, #2c5364)'},
    {id: 'aurora', name: 'Aurora', base: '#7f8fdc',
      css: 'radial-gradient(at 15% 20%, #7f7fd5, transparent 55%), radial-gradient(at 85% 25%, #86a8e7, transparent 50%), radial-gradient(at 50% 100%, #91eae4, transparent 60%), #6a82d8'},
    {id: 'accent', name: 'Theme accent fade', base: 'var(--nm-accent)',
      css: 'linear-gradient(135deg, var(--nm-accent), color-mix(in oklab, var(--nm-accent), var(--nm-surface) 60%))'},
  ];
  // Pattern ink: a tone of the base color that always reads on it (darker on light colors, lighter on dark ones),
  // plus a lighter highlight. Relative color syntax, with a color-mix fallback for older engines.
  const REL = CSS.supports('color', 'oklch(from red calc(l + .1) c h)');
  const ink = c => REL ? `oklch(from ${c} calc(l + .2 - .4 * clamp(0, (l - .6) * 100, 1)) c h)` : `color-mix(in oklab, ${c}, black 28%)`;
  const soft = c => `color-mix(in oklab, ${ink(c)} 55%, transparent)`;
  const hi = c => `color-mix(in oklab, ${c}, white 42%)`;
  const PATTERNS = [
    {id: 'dots', name: 'Dots', css: c => `radial-gradient(${ink(c)} 1.6px, transparent 2.1px) 0 0 / 14px 14px`},
    {id: 'grid', name: 'Grid', css: c => `linear-gradient(${soft(c)} 1px, transparent 1px) -1px -1px / 16px 16px, linear-gradient(90deg, ${soft(c)} 1px, transparent 1px) -1px -1px / 16px 16px`},
    {id: 'stripes', name: 'Diagonal stripes', css: c => `repeating-linear-gradient(45deg, ${soft(c)} 0 5px, transparent 5px 13px)`},
    {id: 'waves', name: 'Waves', css: c => `radial-gradient(circle at 6px 20px, transparent 5.1px, ${ink(c)} 5.5px 6.9px, transparent 7.3px) 0 0 / 24px 20px, radial-gradient(circle at 18px 0, transparent 5.1px, ${ink(c)} 5.5px 6.9px, transparent 7.3px) 0 0 / 24px 20px`},
    {id: 'checker', name: 'Checker', css: c => `conic-gradient(${soft(c)} 25%, transparent 0 50%, ${soft(c)} 0 75%, transparent 0) 0 0 / 20px 20px`},
    {id: 'zigzag', name: 'Zigzag', css: c => { const i = soft(c); return `linear-gradient(135deg, ${i} 25%, transparent 25%) -10px 0 / 20px 20px, linear-gradient(225deg, ${i} 25%, transparent 25%) -10px 0 / 20px 20px, linear-gradient(315deg, ${i} 25%, transparent 25%) 0 0 / 20px 20px, linear-gradient(45deg, ${i} 25%, transparent 25%) 0 0 / 20px 20px`; }},
    {id: 'topo', name: 'Topographic rings', css: c => { const i = ink(c); return `radial-gradient(circle at 84% 18%, ${i} 0 1.3px, ${c} 1.3px 7px, ${i} 7px 8.3px, ${c} 8.3px 14px, ${i} 14px 15.3px, ${c} 15.3px 21px, ${i} 21px 22.3px, transparent 22.3px), repeating-radial-gradient(ellipse 140% 100% at 18% 108%, transparent 0 8px, ${soft(c)} 8px 9.3px)`; }},
    {id: 'confetti', name: 'Confetti specks', css: c => `radial-gradient(circle at 20% 30%, ${hi(c)} 0 1.7px, transparent 2.1px) 0 0 / 37px 41px, radial-gradient(circle at 70% 65%, ${ink(c)} 0 1.5px, transparent 1.9px) 0 0 / 29px 31px, radial-gradient(circle at 45% 85%, ${hi(c)} 0 1.3px, transparent 1.7px) 0 0 / 23px 19px, radial-gradient(circle at 85% 20%, ${ink(c)} 0 1.9px, transparent 2.3px) 0 0 / 43px 47px`},
    {id: 'hatch', name: 'Cross-hatch', css: c => `repeating-linear-gradient(45deg, ${soft(c)} 0 1.2px, transparent 1.2px 8px), repeating-linear-gradient(-45deg, ${soft(c)} 0 1.2px, transparent 1.2px 8px)`},
    {id: 'dither', name: 'Dither', css: c => `radial-gradient(${soft(c)} .8px, transparent 1.1px) 0 0 / 3px 3px, radial-gradient(${ink(c)} .7px, transparent 1px) 1px 1px / 5px 5px, radial-gradient(${hi(c)} .7px, transparent 1px) 2px 0 / 7px 7px`},
  ];

  // Block options are theme-relative: a little hue mixed into the theme's own surface, so text keeps its contrast.
  const tint = (h, p = 86) => `color-mix(in oklab, var(--nm-surface) ${p}%, ${h})`;
  const bInk = 'color-mix(in oklab, var(--nm-accent) 20%, transparent)';
  const bSoft = 'color-mix(in oklab, var(--nm-accent) 11%, transparent)';
  const BLOCK = {
    tint: [
      {id: 'rose', name: 'Rose tint', css: tint('#e5484d')},
      {id: 'amber', name: 'Amber tint', css: tint('#f5a524')},
      {id: 'mint', name: 'Mint tint', css: tint('#2bb673')},
      {id: 'sky', name: 'Sky tint', css: tint('#3fa7f5')},
      {id: 'violet', name: 'Violet tint', css: tint('#7c5cff')},
      {id: 'accent', name: 'Accent tint', css: tint('var(--nm-accent)')},
    ],
    gradient: [
      {id: 'peach', name: 'Peach glow', css: `linear-gradient(160deg, ${tint('#f76b15', 94)}, ${tint('#e5484d', 94)})`},
      {id: 'lagoon', name: 'Lagoon glow', css: `linear-gradient(160deg, ${tint('#14a3a3', 94)}, ${tint('#3fa7f5', 94)})`},
      {id: 'lilac', name: 'Lilac glow', css: `linear-gradient(160deg, ${tint('#7c5cff', 94)}, ${tint('#f06595', 94)})`},
      {id: 'accent', name: 'Accent glow', css: `linear-gradient(160deg, ${tint('var(--nm-accent)', 94)}, var(--nm-surface) 75%)`},
    ],
    pattern: [
      {id: 'dots', name: 'Dots', css: `radial-gradient(${bInk} 1.3px, transparent 1.8px) 0 0 / 16px 16px, var(--nm-surface)`},
      {id: 'grid', name: 'Grid', css: `linear-gradient(${bSoft} 1px, transparent 1px) -1px -1px / 20px 20px, linear-gradient(90deg, ${bSoft} 1px, transparent 1px) -1px -1px / 20px 20px, var(--nm-surface)`},
      {id: 'stripes', name: 'Diagonal stripes', css: `repeating-linear-gradient(45deg, ${bSoft} 0 6px, transparent 6px 16px), var(--nm-surface)`},
      {id: 'topo', name: 'Topographic rings', css: `repeating-radial-gradient(ellipse 140% 100% at 12% 112%, transparent 0 14px, ${bSoft} 14px 15.4px), var(--nm-surface)`},
    ],
  };

  // ---------- state ----------
  let courseBg = await NM.get('courseBg', {}) || {};
  let blockBg = await NM.get('blockBg', {}) || {};
  const origStyle = new WeakMap(); // card image -> Moodle's own style attribute (holds the original image)
  const blockTarget = new WeakMap(); // block -> the element we painted

  const safeUrl = raw => {
    try {
      const u = new URL(String(raw || '').trim());
      return u.protocol === 'https:' && u.hostname ? u.href : null;
    } catch { return null; }
  };
  const cssUrl = u => `url("${u.replace(/["\\\n\r]/g, ch => encodeURIComponent(ch))}")`;
  const validColor = v => typeof v === 'string' && (/^var\(--nm-[\w-]+\)$/.test(v) || CSS.supports('color', v));
  const byId = (list, id) => list.find(x => x.id === id);

  // The background a course entry draws, or null when it's invalid / "theme default".
  function courseCss(entry, img) {
    if (!entry) return null;
    if (entry.kind === 'color' && validColor(entry.value)) return {bg: entry.value, color: entry.value};
    if (entry.kind === 'gradient') { const g = byId(GRADIENTS, entry.value); return g && {bg: g.css, color: g.base}; }
    if (entry.kind === 'pattern') {
      const p = byId(PATTERNS, entry.value);
      const c = validColor(entry.color) ? entry.color : 'var(--nm-accent)';
      return p && {bg: `${p.css(c)}, ${c}`, color: c};
    }
    if (entry.kind === 'image') { const u = safeUrl(entry.value); return u && {bg: `${cssUrl(u)} center / cover no-repeat, var(--nm-surface-2)`}; }
    if (entry.kind === 'original') {
      const orig = img && origImage(img);
      return {bg: orig && orig !== 'none' ? `${orig} center / cover no-repeat, var(--nm-surface-2)` : 'var(--nm-surface-2)'};
    }
    return null;
  }
  function blockCss(entry) {
    const list = entry && BLOCK[entry.kind];
    return list && byId(list, entry.value)?.css || null;
  }
  // Moodle's own background-image for a card image (from its untouched style attribute).
  function origImage(img) {
    if (!origStyle.has(img)) origStyle.set(img, img.getAttribute('style') || '');
    const probe = document.createElement('div');
    probe.setAttribute('style', origStyle.get(img));
    return probe.style.backgroundImage || '';
  }

  // ---------- course cards ----------
  const CARD = ':is(.course-card, .dashboard-card)[data-course-id]';
  const IMG = '.card-img-top, .dashboard-card-img';
  const view = () => document.querySelector('[data-region="courses-view"]');
  const courseName = card => (card.querySelector('.coursename .multiline')?.getAttribute('title')
    || card.querySelector(`${IMG} .visually-hidden`)?.textContent
    || card.querySelector('.coursename')?.textContent.replace(/Course name/, '') || '').replace(/\s+/g, ' ').trim();

  function applyCard(card) {
    const id = card.dataset.courseId;
    card.classList.add('nm-bg-host', 'nm-bg-host-course');
    if (!card.querySelector(':scope > .nm-bg-btn')) {
      const name = courseName(card);
      card.append(el('button', {type: 'button', class: 'nm-bg-btn nm-bg-btn-course', title: 'Customize background',
        'aria-label': name ? `Customize background: ${name}` : 'Customize background',
        'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': 'nm-bg-pop-course', dataset: {courseId: id}}, NM.icon('brush')));
    }
    const img = card.querySelector(IMG);
    const entry = courseBg[id];
    const sig = entry ? JSON.stringify(entry) : '';
    if (img && !origStyle.has(img)) origStyle.set(img, img.getAttribute('style') || '');
    if ((card.dataset.nmBgSig || '') === sig && (!sig || !img || img.dataset.nmBgSig === sig)) return; // already drawn
    const out = courseCss(entry, img);
    if (img) {
      img.setAttribute('style', origStyle.get(img)); // back to Moodle's own, then layer ours on top
      img.classList.toggle('nm-bg-img', !!out);
      if (out) {
        img.style.setProperty('background', out.bg, 'important');
        img.style.setProperty('filter', 'none', 'important');
        img.dataset.nmBgSig = sig;
      } else delete img.dataset.nmBgSig;
    }
    card.classList.toggle('nm-bg-set', !!out);
    if (out) {
      card.dataset.nmBgKind = entry.kind;
      card.dataset.nmBgSig = sig;
      card.style.setProperty('--nm-course-bg', out.bg);
      if (out.color) card.style.setProperty('--nm-course-color', out.color); else card.style.removeProperty('--nm-course-color');
    } else {
      delete card.dataset.nmBgKind;
      delete card.dataset.nmBgSig;
      card.style.removeProperty('--nm-course-bg');
      card.style.removeProperty('--nm-course-color');
    }
  }

  // Moodle re-renders the cards on filter, sort and paging; re-apply then. Our own writes happen with the observer
  // disconnected, so they never feed back into it.
  let viewObs = null, viewRaf = 0, observed = null;
  function applyCards() {
    const v = view();
    if (viewObs) viewObs.disconnect();
    if (v) {
      v.querySelectorAll(CARD).forEach(applyCard);
      viewObs ||= new MutationObserver(() => { if (!viewRaf) viewRaf = requestAnimationFrame(() => { viewRaf = 0; applyCards(); }); });
      viewObs.takeRecords();
      viewObs.observe(v, {childList: true, subtree: true});
      observed = v;
      schedulePositions();
    }
    if (coursePop.isOpen() && !coursePop.anchor?.isConnected) {
      // The card we were editing was re-rendered: follow it to its new button.
      const nb = observed?.querySelector(`.nm-bg-btn-course[data-course-id="${CSS.escape(coursePop.anchorKey)}"]`);
      if (nb) coursePop.reanchor(nb); else coursePop.close(false);
    }
  }

  // Put the button at the image's top-end corner when the image is a real banner; otherwise the card's corner.
  // Never on top of the course's own controls (some themes put the ⋮ menu on the image): step toward inline-start.
  function positionCourseBtn(card) {
    const btn = card.querySelector(':scope > .nm-bg-btn');
    const op = btn?.offsetParent;
    if (!op) return;
    const ir = card.querySelector(IMG)?.getBoundingClientRect();
    const r = ir && ir.width >= 96 && ir.height >= 36 ? ir : card.getBoundingClientRect(); // banner image, or the card itself
    const o = op.getBoundingClientRect();
    const rtl = getComputedStyle(card).direction === 'rtl';
    const S = btn.offsetWidth || 28, top = r.top + 8;
    let edge = rtl ? r.left + 8 : r.right - 8; // the button's inline-end edge, in viewport x
    for (const m of card.querySelectorAll('.coursemenubtn, [data-region="favourite-icon"] .text-primary:not(.hidden)')) {
      const q = m.getBoundingClientRect();
      if (!q.width) continue;
      const x0 = rtl ? edge : edge - S, x1 = x0 + S;
      if (q.left < x1 && q.right > x0 && q.top < top + S && q.bottom > top) edge = rtl ? q.right + 6 : q.left - 6;
    }
    const end = rtl ? edge - o.left - op.clientLeft : o.left + op.clientLeft + op.clientWidth - edge;
    btn.style.setProperty('top', `${Math.round(top - o.top - op.clientTop)}px`);
    btn.style.setProperty('inset-inline-end', `${Math.round(Math.max(2, end))}px`);
  }
  let lastCard = null;
  const hostEnter = e => {
    const card = e.target.closest?.('.nm-bg-host-course') || null;
    if (card && (card !== lastCard || e.type === 'focusin')) positionCourseBtn(card);
    lastCard = card;
  };
  const positionAll = () => document.querySelectorAll('.nm-bg-host-course').forEach(positionCourseBtn);
  let posRaf = 0;
  const schedulePositions = () => { if (!posRaf) posRaf = requestAnimationFrame(() => { posRaf = 0; positionAll(); }); };
  window.addEventListener('resize', schedulePositions);
  document.fonts?.ready.then(schedulePositions);
  document.addEventListener('pointerover', hostEnter, {passive: true});
  document.addEventListener('focusin', hostEnter);

  // ---------- blocks ----------
  const blockKey = b => b.dataset.block || b.id;
  const blocks = () => [...document.querySelectorAll('#block-region-content section.block.card[data-block], [data-blockregion="content"] section.block.card[data-block], #nm-top-row > .nm-block')];
  function blockHead(b) {
    return b.querySelector(':scope > .card-body > .nm-block-head, :scope > .card-body > .d-flex:has(> .card-title), :scope > .card-body > .d-flex:first-child');
  }
  function applyBlock(b) {
    const key = blockKey(b);
    if (!key) return;
    b.classList.add('nm-bg-host', 'nm-bg-host-block');
    const head = blockHead(b);
    if (head && !head.querySelector(':scope > .nm-bg-btn')) {
      const title = (b.querySelector('.card-title')?.textContent || b.getAttribute('aria-label') || '').trim();
      head.append(el('button', {type: 'button', class: 'nm-bg-btn nm-bg-btn-block', title: 'Customize background',
        'aria-label': title ? `Customize background: ${title}` : 'Customize background',
        'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': 'nm-bg-pop-block', dataset: {blockKey: key}}, NM.icon('brush')));
    }
    const entry = blockBg[key];
    const css = blockCss(entry);
    const sig = css ? JSON.stringify(entry) : '';
    if ((b.dataset.nmBgSig || '') === sig) return;
    clearBlock(b);
    if (!css) return;
    // Paint the outermost visible panel, including its padding and rounded edges.
    // Nested structural fills must not cover it; frameless themes get a padded section.
    const body = b.querySelector(':scope > .card-body');
    const chain = [b, body, body?.querySelector(':scope > .card-text, :scope > .nm-block-content')].filter(Boolean);
    const target = chain.find(painted) || b;
    chain.slice(chain.indexOf(target) + 1).forEach(x => x.classList.add('nm-bg-clear'));
    blockTarget.set(b, target);
    b.classList.add('nm-bg-set');
    b.classList.toggle('nm-bg-frameless', !chain.some(painted));
    if (target !== b) target.classList.add('nm-bg-surface');
    target.style.setProperty('background', css, 'important');
    target.style.setProperty('--nm-block-bg', css);
    b.style.setProperty('--nm-block-bg', css);
    b.dataset.nmBgKind = entry.kind;
    b.dataset.nmBgSig = sig;
  }
  function painted(e) {
    const c = getComputedStyle(e);
    const fill = c.backgroundImage !== 'none' || !/^(transparent|rgba\(.*,\s*0\))$/.test(c.backgroundColor);
    const line = ['Top', 'Right', 'Bottom', 'Left'].some(s => c[`border${s}Style`] !== 'none' && parseFloat(c[`border${s}Width`]) > 0);
    return fill || line;
  }
  function clearBlock(b) {
    const t = blockTarget.get(b);
    for (const x of [b, t]) {
      if (!x) continue;
      x.style.removeProperty('background');
      x.style.removeProperty('--nm-block-bg');
      x.classList.remove('nm-bg-surface');
    }
    b.querySelectorAll('.nm-bg-clear').forEach(x => x.classList.remove('nm-bg-clear'));
    blockTarget.delete(b);
    b.classList.remove('nm-bg-set', 'nm-bg-frameless');
    delete b.dataset.nmBgKind;
    delete b.dataset.nmBgSig;
  }
  const applyBlocks = () => blocks().forEach(applyBlock);
  // Our own blocks (to-dos, arcade) can arrive after us, and NM.block() re-creates them: watch for new sections only.
  const region = document.querySelector('#block-region-content, [data-blockregion="content"]');
  if (region?.parentElement) {
    let raf = 0;
    new MutationObserver(recs => {
      const relevant = recs.some(r => [...r.addedNodes].some(n => n.nodeType === 1 && (n.matches('section.block, #nm-top-row') || n.querySelector?.(':scope > section.block'))));
      if (relevant && !raf) raf = requestAnimationFrame(() => { raf = 0; applyBlocks(); });
    }).observe(region.parentElement, {childList: true, subtree: true});
  }

  // ---------- popovers ----------
  // One controller per popover: top layer (popover="manual"), position:fixed under its button, clamped to the viewport,
  // roving tabindex over its option tiles with geometric arrow keys (NM.tileStep), Esc / outside click / tab-out close.
  function popover(id, extraClass) {
    const pop = el('div', {id, class: `nm-bg-pop ${extraClass}`, role: 'dialog', 'aria-labelledby': `${id}-title`, popover: 'manual', hidden: true});
    document.body.append(pop);
    const api = {pop, anchor: null, anchorKey: null, tiles: [],
      isOpen: () => !pop.hidden,
      open(btn, key, nodes, tiles) {
        if (api.isOpen()) api.close(false);
        api.anchor = btn; api.anchorKey = key; api.tiles = tiles;
        pop.replaceChildren(...nodes);
        pop.hidden = false;
        try { pop.showPopover(); } catch {}
        mark(btn, true);
        api.place();
        const cur = tiles.find(t => t.getAttribute('aria-pressed') === 'true') || tiles[0];
        if (cur) api.focusTile(cur);
      },
      close(returnFocus) {
        if (!api.isOpen()) return;
        pop.hidden = true;
        try { pop.hidePopover(); } catch {}
        const btn = api.anchor;
        if (btn) mark(btn, false);
        api.anchor = null;
        if (returnFocus && btn?.isConnected) btn.focus({preventScroll: true});
      },
      reanchor(btn) { api.anchor = btn; mark(btn, true); api.place(); },
      focusTile(t) {
        for (const x of api.tiles) x.tabIndex = x === t ? 0 : -1;
        t.focus({preventScroll: true});
        t.scrollIntoView({block: 'nearest', behavior: NM.motion() ? 'smooth' : 'auto'});
      },
      // Under the button, its inline-end edge on the button's; flip above when there's no room; clamp to the viewport.
      place() {
        const btn = api.anchor;
        if (!btn?.isConnected) return;
        const r = btn.getBoundingClientRect();
        const w = pop.offsetWidth, h = pop.offsetHeight;
        const vw = document.documentElement.clientWidth, vh = window.innerHeight;
        const rtl = getComputedStyle(btn).direction === 'rtl';
        let left = rtl ? r.left : r.right - w;
        left = Math.max(8, Math.min(left, vw - w - 8));
        let top = r.bottom + 6;
        if (top + h > vh - 8 && r.top - 6 - h >= 8) top = r.top - 6 - h;
        top = Math.max(8, Math.min(top, vh - h - 8));
        Object.assign(pop.style, {left: `${Math.round(left)}px`, top: `${Math.round(top)}px`});
      },
    };
    function mark(btn, on) {
      btn.setAttribute('aria-expanded', String(on));
      btn.closest('.nm-bg-host')?.classList.toggle('nm-bg-open', on);
    }
    pop.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return api.close(true); }
      const i = api.tiles.indexOf(document.activeElement);
      if (i < 0) return;
      const j = NM.tileStep(api.tiles, i, e.key, getComputedStyle(pop).direction === 'rtl');
      if (j === null) return;
      e.preventDefault();
      api.focusTile(api.tiles[j]);
    });
    pop.addEventListener('click', e => { if (e.target.closest('.nm-bg-close')) api.close(true); });
    document.addEventListener('pointerdown', e => {
      if (api.isOpen() && !pop.contains(e.target) && !api.anchor?.contains(e.target)) api.close(false);
    }, true);
    pop.addEventListener('focusout', e => {
      if (e.relatedTarget && !pop.contains(e.relatedTarget) && e.relatedTarget !== api.anchor) api.close(false);
    });
    const follow = () => { if (api.isOpen()) api.place(); };
    window.addEventListener('resize', follow);
    window.addEventListener('scroll', follow, {capture: true, passive: true});
    return api;
  }

  const coursePop = popover('nm-bg-pop-course', 'nm-bg-pop-course');
  const blockPop = popover('nm-bg-pop-block', 'nm-bg-pop-block');

  // An option tile: a real button with a preview chip.
  const opt = ({name, css, kind, value, wide, icon, label}) => el('button', {
    type: 'button', class: `nm-bg-opt${wide ? ' nm-bg-opt-wide' : ''}`, title: name, 'aria-label': name, 'aria-pressed': 'false', tabindex: '-1',
    dataset: {kind, value: value ?? ''},
  },
  el('span', {class: 'nm-bg-chip', style: css ? `background: ${css}` : null, 'aria-hidden': 'true'}, icon ? NM.icon(icon) : null),
  label ? el('span', {class: 'nm-bg-opt-label'}, label) : null,
  el('span', {class: 'nm-bg-tick', 'aria-hidden': 'true'}, NM.icon('check')));
  const group = (label, cls, ...tiles) => el('div', {class: 'nm-bg-group', role: 'group', 'aria-label': label},
    el('div', {class: 'nm-bg-label', 'aria-hidden': 'true'}, label),
    el('div', {class: `nm-bg-grid ${cls}`}, tiles));
  const head = (id, title, sub) => el('div', {class: 'nm-bg-head'},
    el('div', {class: 'nm-bg-head-text'},
      el('h2', {id: `${id}-title`, class: 'nm-bg-title'}, title),
      sub ? el('p', {class: 'nm-bg-sub'}, sub) : null),
    el('button', {type: 'button', class: 'nm-bg-close', 'aria-label': 'Close', title: 'Close'}, NM.icon('x')));

  // ---------- course popover ----------
  async function saveCourse(id, entry) {
    if (entry) courseBg = {...courseBg, [id]: entry};
    else { courseBg = {...courseBg}; delete courseBg[id]; }
    document.querySelectorAll(`${CARD}[data-course-id="${CSS.escape(id)}"]`).forEach(applyCard);
    await NM.set('courseBg', courseBg);
  }
  function openCourse(btn) {
    const id = btn.dataset.courseId;
    const card = btn.closest(CARD);
    const img = card?.querySelector(IMG);
    const cur = courseBg[id];
    let penColor = cur?.kind === 'color' || cur?.kind === 'pattern' ? (cur.color || cur.value) : 'var(--nm-accent)';
    if (!validColor(penColor)) penColor = 'var(--nm-accent)';
    const orig = img ? origImage(img) : '';

    const tDefault = opt({name: 'Theme default', kind: 'default', wide: true, icon: 'rotateCcw', label: 'Theme default'});
    const tOrig = opt({name: 'Original image', kind: 'original', wide: true, label: 'Original image',
      css: orig && orig !== 'none' ? `${orig} center / cover no-repeat, var(--nm-surface-2)` : 'var(--nm-surface-2)', icon: orig && orig !== 'none' ? null : 'image'});
    const tColors = COLORS.map(c => opt({name: c.name, css: c.css, kind: 'color', value: c.css}));
    const tGrads = GRADIENTS.map(g => opt({name: g.name, css: g.css, kind: 'gradient', value: g.id}));
    const tPats = PATTERNS.map(p => opt({name: p.name, css: `${p.css(penColor)}, ${penColor}`, kind: 'pattern', value: p.id}));
    const tiles = [tDefault, tOrig, ...tColors, ...tGrads, ...tPats];
    const penName = () => (COLORS.find(c => c.css === penColor)?.name || 'your color').toLowerCase();
    const penNote = el('span', {class: 'nm-bg-note'});
    const setPen = c => {
      penColor = c;
      penNote.textContent = `in ${penName()}`;
      tPats.forEach((t, i) => { t.querySelector('.nm-bg-chip').style.background = `${PATTERNS[i].css(c)}, ${c}`; });
    };

    // Image URL
    const urlIn = el('input', {id: 'nm-bg-url', class: 'nm-bg-input', type: 'url', inputmode: 'url', autocomplete: 'off', spellcheck: 'false',
      placeholder: 'https://…', 'aria-describedby': 'nm-bg-url-msg', value: cur?.kind === 'image' ? cur.value : null});
    const applyUrl = el('button', {type: 'submit', class: 'nm-bg-apply', disabled: true}, 'Apply');
    const urlPrev = el('div', {class: 'nm-bg-url-prev', 'aria-hidden': 'true'});
    const urlMsg = el('p', {id: 'nm-bg-url-msg', class: 'nm-bg-msg', role: 'status'}, 'Paste a link to an image (https only).');
    let urlOk = null, urlTimer = 0, urlSeq = 0;
    const checkUrl = () => {
      const raw = urlIn.value.trim();
      const u = safeUrl(raw);
      const seq = ++urlSeq;
      urlOk = null; applyUrl.disabled = true;
      urlPrev.style.removeProperty('background-image');
      urlPrev.classList.remove('is-ok');
      urlIn.removeAttribute('aria-invalid');
      if (!raw) { urlMsg.textContent = 'Paste a link to an image (https only).'; urlMsg.className = 'nm-bg-msg'; return; }
      if (!u) {
        urlIn.setAttribute('aria-invalid', 'true');
        urlMsg.textContent = /^http:/i.test(raw) ? 'Only https:// links work here.' : 'That doesn\'t look like an https:// link.';
        urlMsg.className = 'nm-bg-msg is-error';
        return;
      }
      urlMsg.textContent = 'Loading preview…'; urlMsg.className = 'nm-bg-msg';
      const im = new Image();
      im.referrerPolicy = 'no-referrer';
      im.onload = () => {
        if (seq !== urlSeq) return;
        urlOk = u; applyUrl.disabled = false;
        urlPrev.style.backgroundImage = cssUrl(u);
        urlPrev.classList.add('is-ok');
        urlMsg.textContent = `Looks good (${im.naturalWidth}×${im.naturalHeight}).`;
      };
      im.onerror = () => {
        if (seq !== urlSeq) return;
        urlIn.setAttribute('aria-invalid', 'true');
        urlMsg.textContent = 'Couldn\'t load an image from that link.';
        urlMsg.className = 'nm-bg-msg is-error';
      };
      im.src = u;
    };
    urlIn.addEventListener('input', () => { clearTimeout(urlTimer); urlTimer = setTimeout(checkUrl, 250); });
    const urlForm = el('form', {class: 'nm-bg-url-form', novalidate: true, onsubmit: e => {
      e.preventDefault();
      if (urlOk && urlOk === safeUrl(urlIn.value)) choose({kind: 'image', value: urlOk});
    }},
    el('label', {class: 'nm-bg-label', for: 'nm-bg-url'}, 'Image URL…'),
    el('div', {class: 'nm-bg-url-row'}, urlIn, applyUrl),
    urlPrev, urlMsg);

    const patGroup = group('Patterns', 'nm-bg-grid-pat', ...tPats);
    patGroup.querySelector('.nm-bg-label').append(' ', penNote);
    setPen(penColor);

    const body = el('div', {class: 'nm-bg-body'},
      group('Start from', 'nm-bg-grid-wide', tDefault, tOrig),
      group('Colors', 'nm-bg-grid-sw', ...tColors),
      group('Gradients', 'nm-bg-grid-sw', ...tGrads),
      patGroup,
      urlForm);

    function markPressed() {
      const e = courseBg[id];
      for (const t of tiles) {
        const k = t.dataset.kind, v = t.dataset.value;
        const on = !e ? k === 'default' : k === e.kind && (k === 'original' || v === e.value);
        t.setAttribute('aria-pressed', String(on));
      }
    }
    function choose(entry) {
      saveCourse(id, entry);
      markPressed();
    }
    body.addEventListener('click', e => {
      const t = e.target.closest('.nm-bg-opt');
      if (!t) return;
      const k = t.dataset.kind, v = t.dataset.value;
      coursePop.focusTile(t);
      if (k === 'default') return choose(null);
      if (k === 'original') return choose({kind: 'original'});
      if (k === 'color') { setPen(v); return choose({kind: 'color', value: v}); }
      if (k === 'gradient') return choose({kind: 'gradient', value: v});
      if (k === 'pattern') return choose({kind: 'pattern', value: v, color: penColor});
    });

    markPressed();
    coursePop.open(btn, id, [head('nm-bg-pop-course', 'Card background', courseName(card)), body], tiles);
    coursePop.refresh = markPressed;
    if (cur?.kind === 'image') checkUrl();
  }

  // ---------- block popover ----------
  async function saveBlock(key, entry) {
    if (entry) blockBg = {...blockBg, [key]: entry};
    else { blockBg = {...blockBg}; delete blockBg[key]; }
    applyBlocks();
    await NM.set('blockBg', blockBg);
  }
  function openBlock(btn) {
    const key = btn.dataset.blockKey;
    const b = btn.closest('.nm-bg-host-block');
    const title = (b?.querySelector('.card-title')?.textContent || '').trim();
    const tDefault = opt({name: 'Theme default', kind: 'default', wide: true, icon: 'rotateCcw', label: 'Theme default'});
    const mk = kind => BLOCK[kind].map(o => opt({name: o.name, css: o.css, kind, value: o.id}));
    const tTint = mk('tint'), tGrad = mk('gradient'), tPat = mk('pattern');
    const tiles = [tDefault, ...tTint, ...tGrad, ...tPat];
    const body = el('div', {class: 'nm-bg-body'},
      group('Start from', 'nm-bg-grid-wide nm-bg-grid-one', tDefault),
      group('Tints', 'nm-bg-grid-blk', ...tTint),
      group('Soft gradients', 'nm-bg-grid-blk', ...tGrad),
      group('Patterns', 'nm-bg-grid-blk', ...tPat));
    function markPressed() {
      const e = blockBg[key];
      for (const t of tiles) t.setAttribute('aria-pressed', String(!e ? t.dataset.kind === 'default' : t.dataset.kind === e.kind && t.dataset.value === e.value));
    }
    body.addEventListener('click', e => {
      const t = e.target.closest('.nm-bg-opt');
      if (!t) return;
      blockPop.focusTile(t);
      saveBlock(key, t.dataset.kind === 'default' ? null : {kind: t.dataset.kind, value: t.dataset.value});
      markPressed();
    });
    markPressed();
    blockPop.open(btn, key, [head('nm-bg-pop-block', 'Block background', title), body], tiles);
    blockPop.refresh = markPressed;
  }

  // One delegated click handler for every brush button (cards are re-rendered, blocks re-created).
  document.addEventListener('click', e => {
    const btn = e.target.closest?.('.nm-bg-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const pop = btn.classList.contains('nm-bg-btn-course') ? coursePop : blockPop;
    if (pop.isOpen() && pop.anchor === btn) return pop.close(false);
    if (btn.classList.contains('nm-bg-btn-course')) { positionCourseBtn(btn.closest('.nm-bg-host-course')); openCourse(btn); } else openBlock(btn);
  }, true);

  // ---------- live updates from other tabs ----------
  NM.watch('courseBg', v => {
    courseBg = v || {};
    applyCards();
    if (coursePop.isOpen()) coursePop.refresh?.();
  });
  NM.watch('blockBg', v => {
    blockBg = v || {};
    applyBlocks();
    if (blockPop.isOpen()) blockPop.refresh?.();
  });
  // Themes change the image's size (banner vs. glyph); keep an open popover attached to its button.
  new MutationObserver(() => {
    schedulePositions();
    blocks().forEach(b => { clearBlock(b); applyBlock(b); }); // a new theme may paint a different element
    if (coursePop.isOpen()) requestAnimationFrame(() => coursePop.place());
  })
    .observe(document.documentElement, {attributes: true, attributeFilter: ['data-nm-theme']});

  applyCards();
  applyBlocks();
  // The Course overview can render after us (Moodle fetches the cards); pick up a late courses-view once.
  if (!view()) {
    const late = new MutationObserver(() => { if (view()) { late.disconnect(); applyCards(); } });
    late.observe(document.body, {childList: true, subtree: true});
    setTimeout(() => late.disconnect(), 30000);
  }
});
