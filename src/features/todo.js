// Personal to-do block on the dashboard. Todoist-style: inline add row, round checkboxes, due dates,
// a collapsible "Completed (n)" section, drag/keyboard reordering. chrome.storage.sync is the single
// source of truth: every action writes storage, and only the NM.watch callback re-renders.
NM.feature('todo', async () => {
  if (!NM.isDashboard) return;
  const content = NM.block({id: 'todo', title: 'My to-dos'});
  if (!content) return;

  // ponytail: chrome.storage.sync caps one item at 8 KB (QUOTA_BYTES_PER_ITEM) and ~120 writes/min. Each to-do is
  // ~100 bytes + its text, so the list fits roughly 60-80 items. Text is capped at 200 chars; a failed write
  // shows an inline message and storage keeps the last good list (nothing is lost).
  const MAX_TEXT = 200;
  const el = NM.el;
  const icon = (paths, cls = '') => {
    const s = el('span', {class: 'nm-todo-icon ' + cls, 'aria-hidden': 'true'});
    s.innerHTML = `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
    return s;
  };
  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    done: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // ---- UI state only (the data lives in storage) ----
  let latest = [];          // last list rendered
  let editingId = null;     // while editing inline, re-renders wait so typing isn't lost
  let expanded = false;     // Completed section, collapsed by default
  let pendingFocus = null;  // {id, part} to focus after the next render
  let justAdded = null;     // id to animate in
  let dragId = null;
  let lastDoneCount = null;

  // ---- static skeleton ----
  const head = content.previousElementSibling;
  const headCount = el('span', {class: 'nm-todo-head-count', hidden: true}, icon(ICONS.done), el('span'));
  head?.append(headCount);

  const input = el('input', {id: 'nm-todo-new', class: 'nm-todo-add-input', type: 'text', placeholder: 'Add a to-do',
    maxlength: MAX_TEXT, autocomplete: 'off', enterkeyhint: 'enter'});
  const dateInput = el('input', {id: 'nm-todo-new-due', class: 'nm-todo-add-date', type: 'date', hidden: true});
  const dateBtn = el('button', {type: 'button', class: 'nm-todo-date-btn', 'aria-label': 'Set a due date', title: 'Due date',
    'aria-expanded': 'false', 'aria-controls': 'nm-todo-new-due'}, icon(ICONS.cal));
  const form = el('form', {class: 'nm-todo-add', autocomplete: 'off'},
    el('label', {class: 'nm-todo-add-plus', for: 'nm-todo-new'}, icon(ICONS.plus), el('span', {class: 'nm-todo-sr'}, 'Add a to-do')),
    input,
    el('label', {class: 'nm-todo-sr', for: 'nm-todo-new-due'}, 'Due date'),
    dateInput, dateBtn,
    el('button', {type: 'submit', class: 'nm-todo-add-submit'}, 'Add'));
  const msg = el('div', {class: 'nm-todo-msg', role: 'status', 'aria-live': 'polite', hidden: true});
  const openList = el('ul', {class: 'nm-todo-list nm-todo-open', 'aria-label': 'To-dos'});
  const empty = el('div', {class: 'nm-todo-empty', hidden: true});
  const doneCount = el('span', {class: 'nm-todo-done-count'}, '0');
  const toggle = el('button', {type: 'button', class: 'nm-todo-done-toggle', 'aria-expanded': 'false', 'aria-controls': 'nm-todo-done-list'},
    icon(ICONS.chevron, 'nm-todo-chevron'), el('span', {}, 'Completed'), doneCount);
  const clearBtn = el('button', {type: 'button', class: 'nm-todo-clear', hidden: true}, 'Clear completed');
  const doneList = el('ul', {id: 'nm-todo-done-list', class: 'nm-todo-list nm-todo-done-list', 'aria-label': 'Completed to-dos', hidden: true});
  const doneSection = el('div', {class: 'nm-todo-done'}, el('div', {class: 'nm-todo-done-head'}, toggle, clearBtn), doneList);
  const root = el('div', {class: 'nm-todo'}, form, msg, openList, empty, doneSection);
  content.append(root);

  // ---- storage ----
  // Read-modify-write against storage (not `latest`), so a change made in another tab is never clobbered.
  async function update(fn) {
    const cur = await NM.get('todos', []);
    const next = fn(cur.map(t => ({...t})));
    try {
      await NM.set('todos', next);
      if (msg.classList.contains('is-error')) hideMsg();
      return true;
    } catch (e) {
      const full = /quota/i.test(e?.message || '');
      showMsg(full ? 'Your list is full (Chrome sync storage limit). Clear completed or delete a few to make room.'
        : `Couldn’t save: ${e?.message || e}`, {error: true});
      pendingFocus = null;
      render(cur);
      return false;
    }
  }

  let msgTimer;
  function showMsg(text, {error = false, undo} = {}) {
    clearTimeout(msgTimer);
    msg.classList.toggle('is-error', error);
    msg.setAttribute('role', error ? 'alert' : 'status');
    msg.replaceChildren(el('span', {class: 'nm-todo-msg-text'}, text),
      undo && el('button', {type: 'button', class: 'nm-todo-msg-action', onclick: () => { hideMsg(); undo(); }}, 'Undo'),
      el('button', {type: 'button', class: 'nm-todo-msg-close', 'aria-label': 'Dismiss', onclick: hideMsg}, '×'));
    msg.hidden = false;
    msgTimer = setTimeout(hideMsg, error ? 10000 : 6000);
  }
  function hideMsg() { clearTimeout(msgTimer); msg.hidden = true; msg.replaceChildren(); }

  // ---- dates ("YYYY-MM-DD", local) ----
  function dueInfo(due) {
    const [y, m, d] = due.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((date - today) / 864e5);
    const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday'
      : date.toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric', month: 'short', year: y === today.getFullYear() ? undefined : 'numeric'});
    return {label, diff, full: date.toLocaleDateString('en-GB', {dateStyle: 'full'})};
  }

  // ---- rendering ----
  function row(t) {
    const check = el('input', {type: 'checkbox', class: 'nm-todo-check', 'aria-label': `${t.done ? 'Mark not done' : 'Complete'}: ${t.text}`});
    check.checked = !!t.done;
    let due = null;
    if (t.due) {
      const d = dueInfo(t.due);
      const cls = t.done ? '' : d.diff < 0 ? ' is-overdue' : d.diff === 0 ? ' is-today' : d.diff === 1 ? ' is-tomorrow' : '';
      due = el('span', {class: 'nm-todo-due' + cls, title: (d.diff < 0 && !t.done ? 'Overdue: ' : 'Due ') + d.full},
        icon(ICONS.cal), el('span', {}, d.label));
    }
    return el('li', {class: 'nm-todo-item' + (t.done ? ' is-done' : '') + (t.id === justAdded && NM.motion() ? ' is-new' : ''),
      dataset: {id: t.id}, tabindex: '0', draggable: t.done ? null : 'true',
      'aria-label': t.text + (due ? `, due ${due.textContent}` : '') + (t.done ? ', completed' : '')},
      t.done ? null : el('span', {class: 'nm-todo-grip', 'aria-hidden': 'true'}),
      check,
      el('div', {class: 'nm-todo-body'}, el('span', {class: 'nm-todo-text'}, t.text), due && el('div', {class: 'nm-todo-meta'}, due)),
      el('button', {type: 'button', class: 'nm-todo-del', 'aria-label': `Delete: ${t.text}`, title: 'Delete'}, icon(ICONS.trash)));
  }

  function captureFocus() {
    const a = document.activeElement;
    const li = root.contains(a) && a.closest('.nm-todo-item');
    if (!li) return null;
    return {id: li.dataset.id, part: a.classList.contains('nm-todo-check') ? 'check' : a.classList.contains('nm-todo-del') ? 'del' : 'row'};
  }
  function restoreFocus(f) {
    if (!f) return;
    if (f.id === 'add') return input.focus();
    const li = root.querySelector(`.nm-todo-item[data-id="${CSS.escape(f.id)}"]`);
    if (!li || li.closest('[hidden]')) return;
    (f.part === 'check' ? li.querySelector('.nm-todo-check') : f.part === 'del' ? li.querySelector('.nm-todo-del') : li).focus();
  }

  function render(todos) {
    latest = Array.isArray(todos) ? todos.filter(t => t && t.id && typeof t.text === 'string') : [];
    if (editingId) return; // the edit renders when it ends
    const focus = pendingFocus || captureFocus();
    pendingFocus = null;

    const open = latest.filter(t => !t.done);
    const done = latest.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    openList.replaceChildren(...open.map(row));
    doneList.replaceChildren(...done.map(row));
    justAdded = null;

    empty.hidden = open.length > 0;
    if (!open.length) {
      const allDone = done.length > 0;
      empty.replaceChildren(
        el('div', {class: 'nm-todo-empty-art', 'aria-hidden': 'true'}, allDone ? '🎉' : '🌱'),
        el('p', {class: 'nm-todo-empty-title'}, allDone ? 'All done. Nice work!' : 'A fresh start'),
        el('p', {class: 'nm-todo-empty-sub'}, allDone ? 'Enjoy the free time, or add what’s next.'
          : 'Anything on your mind? Type it above and press Enter.'));
    }

    headCount.hidden = !open.length;
    headCount.lastChild.textContent = `${open.length} to-do${open.length === 1 ? '' : 's'}`;
    doneCount.textContent = done.length;
    if (lastDoneCount !== null && done.length > lastDoneCount && NM.motion()) {
      doneCount.classList.remove('is-bump'); void doneCount.offsetWidth; doneCount.classList.add('is-bump');
    }
    lastDoneCount = done.length;
    doneSection.classList.toggle('is-empty', !done.length);
    clearBtn.hidden = !done.length;
    toggle.setAttribute('aria-expanded', String(expanded));
    doneList.hidden = !expanded;
    restoreFocus(focus);
  }

  // ---- actions ----
  async function add() {
    const text = input.value.trim().slice(0, MAX_TEXT);
    if (!text) return input.focus();
    const item = {id: uid(), text, due: dateInput.value || null, done: false, created: Date.now(), doneAt: null};
    justAdded = item.id;
    pendingFocus = {id: 'add'};
    if (await update(list => [item, ...list])) {
      input.value = '';
      resetDate();
      form.classList.remove('has-text');
    }
    input.focus();
  }

  function showDate(show) {
    dateInput.hidden = !show;
    dateBtn.setAttribute('aria-expanded', String(show));
    dateBtn.setAttribute('aria-label', show ? 'Remove due date' : 'Set a due date');
    dateBtn.title = show ? 'Remove due date' : 'Due date';
    if (!show) { dateInput.value = ''; form.classList.remove('has-date'); }
  }
  const resetDate = () => showDate(false);

  const neighbour = li => {
    const n = li.nextElementSibling || li.previousElementSibling;
    return n ? n.dataset.id : 'add';
  };

  async function setDone(li, done) {
    const id = li.dataset.id;
    const check = li.querySelector('.nm-todo-check');
    if (done) {
      const r = check.getBoundingClientRect();
      NM.confetti({x: r.left + r.width / 2, y: r.top + r.height / 2, power: 'small'});
      if (NM.motion()) {
        li.classList.add('is-completing');
        await wait(480);
      }
    }
    const n = neighbour(li);
    pendingFocus = n === 'add' ? {id: 'add'} : {id: n, part: 'check'};
    update(list => list.map(t => t.id === id ? {...t, done, doneAt: done ? Date.now() : null} : t));
  }

  async function remove(li) {
    const id = li.dataset.id;
    const n = neighbour(li);
    pendingFocus = n === 'add' ? {id: 'add'} : {id: n, part: 'row'};
    let removed, at;
    const ok = await update(list => {
      at = list.findIndex(t => t.id === id);
      if (at >= 0) [removed] = list.splice(at, 1);
      return list;
    });
    if (ok && removed) showMsg(`Deleted “${removed.text}”`, {undo: () => update(list => {
      if (!list.some(t => t.id === removed.id)) list.splice(Math.min(at, list.length), 0, removed);
      return list;
    })});
  }

  async function clearCompleted() {
    let removed = [];
    const ok = await update(list => { removed = list.filter(t => t.done); return list.filter(t => !t.done); });
    toggle.focus();
    if (ok && removed.length) showMsg(`Cleared ${removed.length} completed to-do${removed.length === 1 ? '' : 's'}`,
      {undo: () => update(list => [...list, ...removed.filter(r => !list.some(t => t.id === r.id))])});
  }

  // Move `id` before/after `targetId` in the stored array (open and done items share one array).
  function move(id, targetId, after) {
    if (!targetId || id === targetId) return;
    return update(list => {
      const i = list.findIndex(t => t.id === id);
      if (i < 0) return list;
      const [it] = list.splice(i, 1);
      const j = list.findIndex(t => t.id === targetId);
      if (j < 0) { list.splice(i, 0, it); return list; }
      list.splice(after ? j + 1 : j, 0, it);
      return list;
    });
  }

  // ---- inline edit ----
  function startEdit(li) {
    const t = latest.find(x => x.id === li.dataset.id);
    if (!t || editingId) return;
    editingId = t.id;
    li.draggable = false;
    li.classList.add('is-editing');
    const box = el('input', {type: 'text', class: 'nm-todo-edit', value: t.text, maxlength: MAX_TEXT, 'aria-label': 'Edit to-do'});
    li.querySelector('.nm-todo-text').replaceWith(box);
    box.focus();
    box.setSelectionRange(box.value.length, box.value.length);
    let finished = false;
    const finish = (save, refocus) => {
      if (finished) return;
      finished = true;
      editingId = null;
      const val = box.value.trim().slice(0, MAX_TEXT);
      pendingFocus = refocus ? {id: t.id, part: 'row'} : null;
      if (save && val && val !== t.text) update(list => list.map(x => x.id === t.id ? {...x, text: val} : x));
      else render(latest);
    };
    box.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); finish(true, true); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false, true); }
    });
    box.addEventListener('blur', () => finish(true, false));
  }

  // ---- events ----
  form.addEventListener('submit', e => { e.preventDefault(); add(); });
  input.addEventListener('input', () => form.classList.toggle('has-text', !!input.value.trim()));
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape' && (input.value || dateInput.value)) { e.preventDefault(); input.value = ''; resetDate(); form.classList.remove('has-text'); }
  });
  dateBtn.addEventListener('click', () => {
    const show = dateInput.hidden;
    showDate(show);
    if (show) { dateInput.focus(); try { dateInput.showPicker(); } catch {} }
    else input.focus();
  });
  dateInput.addEventListener('change', () => {
    form.classList.toggle('has-date', !!dateInput.value);
    if (dateInput.value) input.focus(); // picked a date: back to typing, Enter adds
  });
  dateInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); resetDate(); input.focus(); }
  });

  toggle.addEventListener('click', () => { expanded = !expanded; render(latest); });
  clearBtn.addEventListener('click', clearCompleted);

  for (const list of [openList, doneList]) {
    list.addEventListener('change', e => {
      if (e.target.classList.contains('nm-todo-check')) setDone(e.target.closest('.nm-todo-item'), e.target.checked);
    });
    list.addEventListener('click', e => {
      const del = e.target.closest('.nm-todo-del');
      if (del) remove(del.closest('.nm-todo-item'));
    });
    list.addEventListener('dblclick', e => {
      const li = e.target.closest('.nm-todo-item');
      if (li && !e.target.closest('button, input')) startEdit(li);
    });
    list.addEventListener('keydown', e => {
      const li = e.target.closest('.nm-todo-item');
      if (!li || e.target.classList.contains('nm-todo-edit')) return;
      const onRow = e.target === li;
      const up = e.key === 'ArrowUp', down = e.key === 'ArrowDown';
      if (e.altKey && (up || down) && !li.classList.contains('is-done')) {
        e.preventDefault();
        const sib = up ? li.previousElementSibling : li.nextElementSibling;
        if (sib) {
          pendingFocus = {id: li.dataset.id, part: e.target.classList.contains('nm-todo-check') ? 'check' : 'row'};
          move(li.dataset.id, sib.dataset.id, down);
        }
      } else if (onRow && (up || down)) {
        e.preventDefault();
        (up ? li.previousElementSibling : li.nextElementSibling)?.focus();
      } else if (onRow && e.key === 'Enter') {
        e.preventDefault(); startEdit(li);
      } else if (onRow && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault(); remove(li);
      }
    });
  }

  // Native HTML5 drag and drop (open list only; completed items are ordered by completion time).
  const clearDrop = () => openList.querySelectorAll('.is-drop-before, .is-drop-after').forEach(n => n.classList.remove('is-drop-before', 'is-drop-after'));
  openList.addEventListener('dragstart', e => {
    const li = e.target.closest?.('.nm-todo-item');
    if (!li || editingId) return e.preventDefault();
    dragId = li.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', li.querySelector('.nm-todo-text')?.textContent || '');
    requestAnimationFrame(() => li.classList.add('is-dragging'));
  });
  openList.addEventListener('dragover', e => {
    if (!dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const li = e.target.closest('.nm-todo-item');
    if (!li || li.dataset.id === dragId) return clearDrop();
    const r = li.getBoundingClientRect();
    const after = e.clientY > r.top + r.height / 2;
    if (li.classList.contains(after ? 'is-drop-after' : 'is-drop-before')) return;
    clearDrop();
    li.classList.add(after ? 'is-drop-after' : 'is-drop-before');
  });
  openList.addEventListener('drop', e => {
    if (!dragId) return;
    e.preventDefault();
    const target = openList.querySelector('.is-drop-before, .is-drop-after');
    const after = target?.classList.contains('is-drop-after');
    clearDrop();
    if (target) { pendingFocus = {id: dragId, part: 'row'}; move(dragId, target.dataset.id, after); }
  });
  openList.addEventListener('dragend', () => {
    clearDrop();
    openList.querySelector('.is-dragging')?.classList.remove('is-dragging');
    dragId = null;
  });

  NM.watch('todos', render);
  render(await NM.get('todos', []));
});
