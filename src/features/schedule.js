(() => {
  const clock = new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'});
  const wallTime = date => {
    const p = Object.fromEntries(clock.formatToParts(date).map(p => [p.type, p.value]));
    return `${p.year}${p.month}${p.day}T${p.hour}${p.minute}${p.second}`;
  };
  const codeIn = text => text?.match(/(?:^|\D)(\d{5})(?!\d)/)?.[1];
  const unescape = text => text.replace(/\\([nN,;\\])/g, (_, c) => /n/i.test(c) ? '\n' : c);
  function time(value = '') {
    if (!/^\d{8}T\d{6}Z?$/.test(value)) return null;
    const s = value.replace(/Z$/, '');
    const date = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`);
    if (!Number.isFinite(+date) || date.toISOString().replace(/[-:]/g, '').slice(0, 15) !== s) return null;
    return value.endsWith('Z') ? wallTime(date) : s;
  }

  NM.parseSchedule = text => {
    const events = [];
    let event = null, depth = 0;
    for (const line of text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n')) {
      if (line === 'BEGIN:VEVENT') { event = {}; depth = 0; continue; }
      if (!event) continue;
      if (line === 'END:VEVENT') {
        const code = codeIn(event.DESCRIPTION) || codeIn(event.UID) || codeIn(event.SUMMARY);
        const start = time(event.DTSTART), end = time(event.DTEND);
        // ponytail: RRULE is not supported; weekly RRULE expansion is the upgrade path.
        if (!event.RRULE && code && start && end && start < end) events.push([code, start, end, event.LOCATION || '']);
        event = null;
        continue;
      }
      if (line.startsWith('BEGIN:')) { depth++; continue; }
      if (line.startsWith('END:')) { depth--; continue; }
      if (depth) continue;
      const colon = line.indexOf(':');
      if (colon < 0) continue;
      const name = line.slice(0, colon).split(';')[0].toUpperCase();
      event[name] = unescape(line.slice(colon + 1));
    }
    return events;
  };

  let shnatonState = {status: 'Shnaton is off. Turn it on in the toolbar popup.', picks: []};
  const listeners = new Set();
  NM.watchShnaton = fn => { listeners.add(fn); fn(shnatonState); };
  NM.setShnatonGroup = async (code, type, group) => {
    const picks = await NM.getLocal('shnatonGroups', {});
    picks[code] = {...picks[code], [type]: group};
    await NM.setLocal('shnatonGroups', picks);
  };

  NM.feature('schedule', async function init() {
    if (!NM.isDashboard) return;
    const VIEW = '[data-region="courses-view"]';
    const CARD = '[data-region="course-content"], .course-card, .dashboard-card';
    let [events, cache, picks] = await Promise.all([
      NM.getLocal('schedule', []), NM.getLocal('shnaton', null), NM.getLocal('shnatonGroups', {}),
    ]);
    let raf = 0, allowed = null, inFlight = false, forcePending = false, generation = 0, error = '';
    let lastAttempt = '';
    const year = () => {
      const pathYear = location.pathname.match(/\/(\d{4})-\d{2}\//)?.[1];
      const now = wallTime(new Date());
      return String(pathYear ? +pathYear + 1 : +now.slice(0, 4) + (+now.slice(4, 6) >= 8 ? 1 : 0));
    };
    function cards() {
      return [...document.querySelectorAll(VIEW)].flatMap(view => [...view.querySelectorAll(CARD)]).map(card => {
        const names = [...card.querySelectorAll('.coursename, .shortname, [data-region="course-name"], [data-region="course-shortname"]')];
        // HUJI's short name is an unclassed div in the muted row before .coursename.
        names.push(card.querySelector('.coursename')?.previousElementSibling);
        const matches = names.map(n => n?.textContent?.match(/(?:^|[^\p{L}\p{N}])(\d{5})(?:_(\d+))?(?![\p{L}\p{N}])/u)).filter(Boolean);
        const match = matches.find(m => m[2]) || matches[0];
        const name = card.querySelector('.coursename, [data-region="course-name"]');
        const title = (name?.querySelector('.multiline[title]')?.getAttribute('title') || name?.getAttribute('title') || name?.textContent || '').replace(/\s+/g, ' ').trim()
          .replace(/^\d{5}(?:_\d+)?\s*[-–]?\s*/, '');
        return {card, code: match?.[1], suffix: match?.[2], title};
      });
    }
    const codesIn = cards => [...new Set(cards.map(c => c.code).filter(Boolean))].sort();
    const matchesCache = codes => cache?.year === year() && cache.codes === codes.join();
    async function refresh(force = false) {
      if (inFlight) { forcePending ||= force; return; }
      const codes = codesIn(cards()), y = year(), key = `${y}/${codes.join()}`;
      // Class times are fixed for the year: fetch once per year + course list, and retry a failure on the next page load.
      if (!force && ((allowed !== null && (!allowed || !codes.length || matchesCache(codes))) ||
          (error && lastAttempt === key))) return;
      inFlight = true;
      lastAttempt = key;
      const version = generation;
      try {
        const permission = await chrome.runtime.sendMessage({type: 'nm-shnaton-permission'});
        if (version !== generation) return;
        allowed = !!permission?.allowed;
        error = '';
        if (!allowed || !codes.length) return;
        if (codes.length > 20) { error = 'Shnaton: too many courses (maximum 20).'; return; }
        if (!force && matchesCache(codes)) return;
        const result = await chrome.runtime.sendMessage({type: 'nm-shnaton', codes, year: y});
        if (version !== generation) return;
        if (result?.error || !result?.courses) {
          if (result?.error === 'no-permission') allowed = false;
          else error = 'Shnaton: could not load class times. Try turning it off and on in the toolbar popup.';
          return;
        }
        cache = {year: y, codes: codes.join(), fetchedAt: Date.now(), courses: result.courses};
        await NM.setLocal('shnaton', cache);
      } catch { error = 'Shnaton: could not load class times. Try turning it off and on in the toolbar popup.'; }
      finally {
        inFlight = false;
        schedule();
        if (forcePending) { forcePending = false; refresh(true); }
      }
    }
    function selection(course, groups) {
      // ponytail: trust the card-name suffix as the user's group number; explicit enrollment data is the upgrade path.
      const matched = course.suffix ? groups.filter(g => +g.group.split('-')[1] === +course.suffix) : [];
      if (matched.length) return {groups: matched, fields: []};
      const types = new Map();
      for (const group of groups) {
        if (!types.has(group.type)) types.set(group.type, []);
        types.get(group.type).push(group);
      }
      const chosen = [], fields = [];
      for (const [type, options] of types) {
        const pick = picks[course.code]?.[type];
        if (options.length === 1) chosen.push(options[0]);
        else {
          chosen.push(...options.filter(g => g.group === pick));
          fields.push({code: course.code, title: course.title, type, options, value: pick ?? '?'});
        }
      }
      return {groups: chosen, fields};
    }
    function apply() {
      raf = 0;
      const current = cards(), codes = codesIn(current), imported = new Set(events.map(e => e[0]));
      refresh();
      const courses = allowed && matchesCache(codes) ? cache.courses : {};
      const allEvents = [...events], fields = new Map();
      for (const course of current) {
        // An imported .ics wins for its courses, so they need no group pick either.
        if (imported.has(course.code)) continue;
        const selected = selection(course, courses[course.code] || []);
        for (const field of selected.fields) fields.set(`${field.code}/${field.type}`, field);
        for (const group of selected.groups) allEvents.push(...group.meetings.map(m => [course.code, ...m]));
      }
      const state = {status: allowed === false ? 'Shnaton is off. Turn it on in the toolbar popup.' :
        error || (allowed === null || inFlight ? 'Shnaton: loading…' : `Shnaton: ${Object.values(courses).filter(g => g.length).length} courses`),
        picks: [...fields.values()]};
      if (JSON.stringify(state) !== JSON.stringify(shnatonState)) {
        shnatonState = state;
        listeners.forEach(fn => fn(state));
      }
      const now = wallTime(new Date());
      const ongoing = new Map();
      for (const event of allEvents) {
        if (event[1] <= now && now < event[2]) ongoing.set(event[0], event);
      }
      current.forEach(({card, code}) => {
        const event = ongoing.get(code), tag = card.querySelector('.categoryname');
        let badge = card.querySelector('.nm-ongoing');
        if (!event || !tag) { badge?.remove(); return; }
        if (!badge) {
          badge = NM.el('span', {class: 'nm-ongoing'}, 'Ongoing');
          tag.after(badge);
        }
        const label = `Ongoing until ${event[2].slice(9, 11)}:${event[2].slice(11, 13)}${event[3] ? ' · ' + event[3] : ''}`;
        if (badge.title !== label) {
          badge.title = label;
          badge.setAttribute('aria-label', label);
        }
      });
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };
    const observed = new WeakSet();
    function observeViews() {
      document.querySelectorAll(VIEW).forEach(view => {
        if (observed.has(view)) return;
        observed.add(view);
        new MutationObserver(records => {
          // Ignore our badge insertions/removals; attributes aren't observed.
          if (records.some(r => r.type === 'characterData' ||
            [...r.addedNodes, ...r.removedNodes].some(n => !n.matches?.('.nm-ongoing')))) schedule();
        }).observe(view, {childList: true, characterData: true, subtree: true});
        schedule();
      });
    }
    new MutationObserver(records => {
      if (records.some(r => [...r.addedNodes].some(n => n.nodeType === 1 &&
        (n.matches(VIEW) || n.querySelector(VIEW))))) observeViews();
    }).observe(document.body, {childList: true, subtree: true});
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.schedule) events = changes.schedule.newValue || [];
      if (changes.shnaton) cache = changes.shnaton.newValue || null;
      if (changes.shnatonGroups) picks = changes.shnatonGroups.newValue || {};
      if (changes.schedule || changes.shnaton || changes.shnatonGroups) schedule();
    });
    chrome.runtime.onMessage.addListener(msg => {
      if (msg?.type !== 'nm-shnaton-permissions-changed') return;
      generation++;
      allowed = null;
      schedule();
      refresh(true);
    });
    setInterval(schedule, 60000);
    observeViews();
  });
})();
