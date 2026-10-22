// Pure, deterministic done/todo rule (see BRIEF.md "dynamic and deterministic"). No DOM access.
// U: upcoming-view events, A: Set of ids still needing action, O: {eventId: 'done'|'todo'} manual overrides.
// Returns {[id]: 'done'|'todo'|'info'}.
(function (root) {
  function classify(U, A, O = {}) {
    const out = {};
    for (const e of U) {
      if (O[e.id] === 'done' || O[e.id] === 'todo') out[e.id] = O[e.id];
      else if (e.eventtype === 'open' || !e.isactionevent) out[e.id] = 'info';
      else if (A.has(e.id)) out[e.id] = 'todo';
      else out[e.id] = 'done';
    }
    return out;
  }
  if (typeof module !== 'undefined') module.exports = {classify};
  else root.NM.classify = classify;
})(globalThis);
