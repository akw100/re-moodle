// Upcoming events done-split. Moves events the student already completed into a collapsible
// "Done / submitted" section, with checkboxes for manual overrides. Status comes ONLY from
// NM.classify(U, A, O) on live Moodle data (see BRIEF.md "dynamic and deterministic").
NM.feature('upcoming', () => {
  if (!NM.isDashboard) return;

  const BLOCK = 'section.block_calendar_upcoming';
  const ROW = '.event[data-region=event-item]';
  const OPEN_KEY = 'nm-up-done-open';
  const LIMIT = 50;

  let data = null;       // {U, A, byId, auto} from the last successful load
  let overrides = {};    // O
  let failed = false;    // last load threw -> Moodle's block stays untouched + note
  let gen = 0;           // ignores stale responses when loads overlap
  let applying = false;
  let order = 0;         // first-seen order of Moodle's rows, so a row moving back lands where Moodle put it
  const tried = new Set(); // unknown event ids we already refetched for (no refetch loops)

  const block = () => document.querySelector(BLOCK);
  const rowId = row => row.querySelector('a[data-event-id]')?.dataset.eventId;

  // ---------- data ----------
  async function fetchAll() {
    const U = (await NM.call('core_calendar_get_calendar_upcoming_view', {courseid: 1, categoryid: 0})).events || [];
    const A = new Set();
    if (U.length) {
      const ts = U.map(e => e.timesort ?? e.timestart);
      const args = {timesortfrom: Math.min(...ts), timesortto: Math.max(...ts) + 1, limitnum: LIMIT};
      for (let page = 0, after; page < 100; page++) {
        const r = await NM.call('core_calendar_get_action_events_by_timesort', after ? {...args, aftereventid: after} : args);
        const evs = r.events || [];
        evs.forEach(e => A.add(e.id));
        const last = evs[evs.length - 1]?.id;
        if (evs.length < LIMIT || last == null || last === after) break;
        after = last;
      }
    }
    return {U, A};
  }

  async function load() {
    const my = ++gen;
    let U, A, O;
    try {
      ({U, A} = await fetchAll());
      O = (await NM.get('overrides', {})) || {};
    } catch (e) {
      if (my !== gen) return;
      console.warn('[Nicer Moodle] upcoming:', e.message);
      failed = e.session ? 'session' : true; data = null;
      render();
      return;
    }
    if (my !== gen) return;
    failed = false;
    overrides = O;
    data = {U, A, byId: new Map(U.map(e => [String(e.id), e])), auto: NM.classify(U, A)};
    render();
    await confettiDiff(data.auto);
  }

  // Deterministic diff: ids auto-done now but not at the previous load, minus overrides. First run only stores.
  async function confettiDiff(auto) {
    const done = Object.keys(auto).filter(id => auto[id] === 'done').map(Number).sort((a, b) => a - b);
    const prev = await NM.getLocal('doneIds', null);
    if (Array.isArray(prev)) {
      const seen = new Set(prev.map(String));
      if (done.some(id => !seen.has(String(id)) && !(id in overrides))) NM.confetti({power: 'big', reason: 'done'});
    }
    await NM.setLocal('doneIds', done);
  }

  // ---------- DOM ----------
  function render() {
    const sec = block();
    if (!sec) return;
    applying = true;
    try { data ? decorate(sec) : undecorate(sec, failed); }
    finally { mo.takeRecords(); applying = false; }
  }

  // Only touch the DOM when the node isn't already where it belongs (keeps re-applies mutation-free).
  const place = (parent, node, ref = null) => {
    if (node.parentNode !== parent || node.nextSibling !== ref) parent.insertBefore(node, ref);
  };
  const setText = (n, t) => { if (n.textContent !== t) n.textContent = t; };
  const body = row => row.querySelector(':scope > .overflow-auto') || row.lastElementChild;
  // Moodle's own list container (.calendarwrapper), never our <details>.
  const listOf = (sec, rows) => sec.querySelector('[data-template="core_calendar/upcoming_mini"], .calendarwrapper') ||
    rows[0]?.closest('.nm-up-done')?.parentElement || rows[0]?.parentElement;

  function decorate(sec) {
    const st = NM.classify(data.U, data.A, overrides);
    const rows = [...sec.querySelectorAll(ROW)];
    const list = listOf(sec, rows);
    if (!list) return;
    sec.querySelector('.nm-up-note')?.remove();
    sec.classList.add('nm-up');

    const before = NM.motion() ? new Map(rows.filter(r => r.dataset.nmUpState).map(r => [r, r.getBoundingClientRect()])) : null;
    const todo = [], done = [];
    const unknown = [];
    for (const row of rows) {
      row.dataset.nmUpIdx ||= String(order++);
      const id = rowId(row);
      const s = id && st[id];
      if (!s) { if (id && !tried.has(id)) unknown.push(id); clearRow(row); todo.push(row); continue; }
      decorateRow(row, id, s);
      (s === 'done' ? done : todo).push(row);
    }
    const byIdx = (a, b) => a.dataset.nmUpIdx - b.dataset.nmUpIdx;
    todo.sort(byIdx); done.sort(byIdx);
    const nTodo = todo.filter(r => r.dataset.nmUpState === 'todo').length;

    let det = list.querySelector(':scope > details.nm-up-done');
    if (!det) {
      det = NM.el('details', {class: 'nm-up-done'},
        NM.el('summary', {class: 'nm-up-done-summary'},
          NM.el('span', {class: 'nm-up-done-label'}), NM.el('span', {class: 'nm-up-done-hint'}, '· still editable')));
      try { det.open = sessionStorage.getItem(OPEN_KEY) === '1'; } catch {}
      det.addEventListener('toggle', () => { try { sessionStorage.setItem(OPEN_KEY, det.open ? '1' : '0'); } catch {} });
    }
    let empty = list.querySelector(':scope > .nm-up-empty');
    if (!nTodo && done.length) empty ||= NM.el('p', {class: 'nm-up-empty'}, 'All caught up. Nothing left to do.');
    else { empty?.remove(); empty = null; }

    // Order at the end of Moodle's list: to-do/info rows (Moodle's order), "all caught up", then <details>.
    let ref = null;
    for (const n of [...todo, empty, det].filter(Boolean).reverse()) { place(list, n, ref); ref = n; }
    ref = null;
    for (const r of [...done].reverse()) { place(det, r, ref); ref = r; }
    setText(det.querySelector('.nm-up-done-label'), `Done / submitted (${done.length})`);
    det.hidden = !done.length;

    const head = sec.querySelector('.card-title')?.parentElement;
    if (head && head !== sec) {
      let c = head.querySelector(':scope > .nm-up-count');
      if (!c) { c = NM.el('span', {class: 'nm-up-count'}); head.append(c); }
      setText(c, `${nTodo} to do · ${done.length} done`);
    }

    if (before) flip(before, det);
    // Moodle rendered events we don't know yet (e.g. a new range): refetch once for them.
    if (unknown.length) { unknown.forEach(id => tried.add(id)); queueLoad(); }
  }

  function decorateRow(row, id, s) {
    const ev = data.byId.get(id);
    const manual = id in overrides && data.auto[id] !== s;
    const key = s + (manual ? '-manual' : '');
    if (row.dataset.nmUpKey === key) return;
    const prev = row.dataset.nmUpState;
    clearRow(row);
    if (prev && prev !== s) row.dataset.nmUpMoved = '1';
    row.dataset.nmUpState = s;
    row.dataset.nmUpKey = key;
    row.classList.add('nm-up-row', 'nm-up-row-' + s);
    if (manual) row.classList.add('nm-up-row-manual');
    const title = row.querySelector('a[data-event-id]')?.textContent.trim() || ev.name;

    if (s === 'info') {
      row.prepend(NM.el('span', {class: 'nm-up-lead nm-up-spacer', 'aria-hidden': 'true'}));
      body(row)?.append(NM.el('div', {class: 'nm-up-meta'}, NM.el('span', {class: 'nm-up-opens'}, 'Opens')));
      return;
    }

    const cb = NM.el('input', {type: 'checkbox', class: 'nm-up-cb', id: 'nm-up-cb-' + id});
    cb.checked = s === 'done';
    cb.addEventListener('change', () => toggle(row, id, cb.checked));
    row.prepend(NM.el('label', {class: 'nm-up-lead nm-up-check', for: cb.id, title: s === 'done' ? 'Move back to To do' : 'Mark as done'},
      cb, NM.el('span', {class: 'nm-up-box', 'aria-hidden': 'true'}),
      NM.el('span', {class: 'nm-up-sr'}, `Done: ${title}`)));

    if (s === 'done') {
      const href = row.querySelector('a[data-event-id]')?.href || ev.url;
      const label = ev.modulename === 'assign' ? 'Edit submission' : ev.modulename === 'quiz' ? 'Review' : 'Open activity';
      body(row)?.append(NM.el('div', {class: 'nm-up-meta'},
        NM.el('span', {class: 'nm-up-tag ' + (manual ? 'nm-up-tag-manual' : 'nm-up-tag-auto')}, manual ? 'marked done' : '✓ submitted'),
        href && NM.el('a', {class: 'nm-up-edit', href, 'aria-label': `${label}: ${title}`}, label, NM.el('span', {class: 'nm-up-arrow', 'aria-hidden': 'true'}, '→'))));
    }
  }

  function clearRow(row) {
    row.querySelectorAll(':scope > .nm-up-lead, .nm-up-meta').forEach(n => n.remove());
    row.classList.remove('nm-up-row', 'nm-up-row-todo', 'nm-up-row-done', 'nm-up-row-info', 'nm-up-row-manual');
    delete row.dataset.nmUpState; delete row.dataset.nmUpKey;
  }

  // Failure (or no data yet): Moodle's block exactly as rendered, plus one note when the load failed.
  function undecorate(sec, withNote) {
    const rows = [...sec.querySelectorAll(ROW)];
    const list = listOf(sec, rows);
    rows.forEach(clearRow);
    const det = sec.querySelector('details.nm-up-done');
    if (list && det) rows.sort((a, b) => a.dataset.nmUpIdx - b.dataset.nmUpIdx).forEach(r => list.insertBefore(r, det));
    rows.forEach(r => delete r.dataset.nmUpIdx);
    sec.querySelectorAll('.nm-up-done, .nm-up-count, .nm-up-empty').forEach(n => n.remove());
    sec.classList.remove('nm-up');
    const note = sec.querySelector('.nm-up-note');
    if (!withNote) note?.remove();
    else if (!note) {
      const n = NM.el('p', {class: 'nm-up-note', role: 'status'}, failed === 'session'
        ? 'Your Moodle session expired. Refresh the page to see what you’ve already submitted.'
        : 'Couldn’t check what you’ve submitted, so nothing is marked done. Refresh to try again.');
      if (list) list.after(n); else (sec.querySelector('.card-body') || sec).append(n);
    }
  }

  // FLIP: rows slide from where they were to where they are now. A row that vanished into the
  // collapsed <details> makes its summary nudge instead.
  function flip(before, det) {
    let nudge = false;
    for (const [row, a] of before) {
      const moved = row.dataset.nmUpMoved; delete row.dataset.nmUpMoved;
      if (!row.isConnected) continue;
      const b = row.getBoundingClientRect();
      if (!b.height) { if (moved) nudge = true; continue; }
      const dy = a.top - b.top;
      if (Math.abs(dy) > 1) row.animate([{transform: `translateY(${dy}px)`}, {transform: 'none'}], {duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)'});
      if (moved) row.animate([{opacity: .4}, {opacity: 1}], {duration: 340, easing: 'ease-out'});
    }
    const sum = det.querySelector('summary');
    if (nudge && sum) sum.animate([{transform: 'scale(1)'}, {transform: 'scale(1.035)'}, {transform: 'scale(1)'}], {duration: 380, easing: 'ease-out'});
  }

  // ---------- interactions ----------
  async function toggle(row, id, checked) {
    if (!data) return;
    const want = checked ? 'done' : 'todo';
    const next = {...overrides};
    if (data.auto[id] === want) delete next[id]; else next[id] = want; // same as auto -> drop override, back to auto
    const det = block()?.querySelector('details.nm-up-done');
    if (NM.motion() && want === 'done' && !(det && det.open && !det.hidden)) {
      // Heading into a closed <details>: fade the row out first so it doesn't just blink away.
      const a = row.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'translateY(8px)'}], {duration: 220, easing: 'ease-in', fill: 'forwards'});
      await a.finished.catch(() => {});
      overrides = next; render(); a.cancel();
    } else { overrides = next; render(); }
    // The row was rebuilt: keep keyboard focus on its new checkbox, or on the summary if it went into a closed <details>.
    const cb = document.getElementById('nm-up-cb-' + id);
    (cb?.offsetParent ? cb : block()?.querySelector('details.nm-up-done > summary'))?.focus({preventScroll: true});
    await NM.set('overrides', next);
  }

  // Other tabs / the popup change overrides -> re-render here too.
  NM.watch('overrides', v => { overrides = v || {}; render(); });

  // ---------- dynamic ----------
  let queued = false;
  function queueLoad() {
    if (queued) return;
    queued = true;
    setTimeout(() => { queued = false; load(); }, 0);
  }

  // Moodle re-renders the block with AJAX: re-apply. Our own mutations are dropped via takeRecords() in render().
  const mo = new MutationObserver(recs => {
    if (applying) return;
    const hit = recs.some(r => r.target.closest?.(BLOCK) ||
      [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches(BLOCK) || n.querySelector(BLOCK))));
    if (hit) render();
  });
  mo.observe(document.querySelector('#block-region-content, [data-blockregion=content]') || document.body, {childList: true, subtree: true});

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });

  return load();
});
