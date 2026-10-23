// Header message: on the dashboard, the "Dashboard" h1 is visually hidden (still read by screen readers) and a random
// line in one of ten voices sits in its place. Click it (or Enter/Space) for another; it never repeats the last one.
// Voice: chrome.storage.sync `voice` ('mixed' or a voice id), set from the theme picker or the toolbar popup.
// Live data: upcoming.js dispatches `nm:upcoming` {todo, done, next: {name, timesort} | null} after each load; the last
// one is cached in chrome.storage.local `motdSummary`, so the first message of a page load can already use it.
// Markup: p.nm-motd[data-voice][data-kind=plain|time|data][data-id] > button.nm-motd-btn > span.nm-motd-text + span.nm-motd-ico,
// plus span.nm-motd-live (visually hidden, filled only on user shuffles). Test hook: html[data-nm-motd-force=data|time|plain].
(() => {
  NM.VOICES = [
    {id: 'mixed', name: 'Mixed'}, {id: 'tough-love', name: 'Tough love'}, {id: 'hype', name: 'Hype'},
    {id: 'wholesome', name: 'Wholesome'}, {id: 'sarcastic', name: 'Sarcastic'}, {id: 'stoic', name: 'Stoic'},
    {id: 'chaotic', name: 'Chaotic'}, {id: 'dramatic', name: 'Dramatic'}, {id: 'dad-jokes', name: 'Dad jokes'}, {id: 'mom', name: 'Mom'},
    {id: 'quotes', name: 'Funny quotes'},
  ];

  // The library. "@tag " at the start limits a line to a moment (see TAGS); {placeholders} fill from live data
  // (see KEYS). {todo:thing} pluralizes ("1 thing", "3 things"); {hours:hour} reads as minutes, hours or days.
  const LIB = {
    'tough-love': [
      'Your deadline doesn\'t care about your vibes.',
      'Motivation is optional. Submission is not.',
      'Drop and give me twenty. Pages. Of the reading.',
      'Close the group chat. Open the PDF.',
      'You\'re not "researching". You\'re on Wikipedia. Move.',
      'Office hours exist. They\'re free. Go, soldier.',
      'That tab you\'re avoiding? Open it. Now.',
      'Nobody is coming to write this for you. Not even future you.',
      '"Just five more minutes" was two hours ago.',
      'Stop color-coding the planner. Do the planner.',
      'Pain is weakness leaving the syllabus.',
      'You survived the Moodle login. You can survive this quiz.',
      'Hydrate. Then chapter 7. In that order.',
      'Your future self is watching. Don\'t embarrass them.',
      '@many {todo:thing} due. They won\'t submit themselves.',
      '{next} in {hours:hour}. Why are you still reading this?',
      '{done:thing} done? That was the warm-up. {todo} to go.',
      '@clear Nothing due? Suspicious. Check the syllabus again, recruit.',
      '@late It\'s {time}. The quiz will not be easier in an hour.',
      '@morning Rise and grind. The PDF won\'t highlight itself.',
      '@sun It\'s Sunday. In Israel, that\'s a Monday. Fall in.',
      '{weekday} is not an excuse. {weekday} is a day. Work.',
      '@fri The weekend is coming. Clear a path through that reading.',
      'Moodle is down. Your downloaded notes are not. Move.',
      'SSO rejected you again. Take a breath, soldier. Regroup.',
    ],
    hype: [
      'AND THE STUDENT OPENS THE DASHBOARD! WHAT A MOVE!',
      'Logged into Moodle on the FIRST TRY! Somebody frame that!',
      'From downtown... it\'s the SUBMIT button! IT\'S GOOD!',
      'The crowd goes wild as you finally open the syllabus!',
      'Unbelievable footwork past the procrastination defense!',
      'THIS. IS. YOUR. SEMESTER.',
      'They\'re refilling the coffee! The stadium is ELECTRIC!',
      'Your GPA called. It wants a highlight reel.',
      'The ref checks the tape... YES! That citation is APA!',
      'Two minutes left and THEY\'RE WRITING THE CONCLUSION!',
      'A clean read of the rubric! Textbook! Literally!',
      'They asked a question in lecture! The bench is STUNNED!',
      '{done:thing} DONE! The crowd is on its FEET!',
      '{todo} to go and the clock is ticking! Can they do it?! (Yes.)',
      '{next} in {hours:hour}! This is what you TRAINED for!',
      '@clear NOTHING DUE! A CLEAN SHEET! Historic performance!',
      '@evening {weekday} night at the library, and YOU are the main event!',
      '@morning An early start! Nobody knew you HAD this gear!',
      '@late Overtime at {time}! Legendary stamina! (Then sleep. Please.)',
      '@thu Thursday! Last practice before the weekend! Make it count!',
      'Moodle is DOWN! The student rallies with OFFLINE NOTES!',
      'Library Wi-Fi connects! THE COMEBACK OF THE SEMESTER!',
    ],
    wholesome: [
      'You showed up. That\'s honestly the hardest part.',
      'Drink some water. You\'re doing better than you think.',
      'Proud of you for opening this. Seriously.',
      'One small task still counts. Pick the tiniest one.',
      'You\'re allowed to ask for help. Office hours are for you.',
      'Your grade isn\'t your worth. (You\'ve got this one anyway.)',
      'Rest is productive. Your brain is filing things away.',
      'Reminder to eat something that isn\'t coffee.',
      'Whatever happens on this quiz, you\'re still great company.',
      'Little steps still get you all the way across campus.',
      'You\'ve passed hard things before. This is just one more.',
      'Sending you a warm drink and a quiet library seat.',
      '{done} done already. Look at you go.',
      'Only {todo} left. One at a time, you\'ll get there.',
      '{next} is next. Start with five minutes, that\'s all.',
      '@clear Nothing due right now. Go do something that makes you happy.',
      '@late It\'s {time}. Whatever\'s left can wait for a rested you.',
      '@morning Good morning! Hope your coffee is exactly right today.',
      'Happy {weekday}. I hope today is kind to you.',
      '@evening Evening already. Whatever you did today, it counts.',
      '@sat It\'s Saturday. Even your highlighter deserves a little rest.',
      'Moodle is down again. Even websites need a little lie-down.',
      'Library Wi-Fi lost the plot. You still deserve a quiet chapter.',
    ],
    sarcastic: [
      'Oh good, Moodle. Everyone\'s favorite website.',
      'Another group project. Can\'t wait to do all of it.',
      'Sure, start the essay at 11pm. What could go wrong.',
      'The quiz has "just a few questions". Forty. It\'s forty.',
      'Wow, a PDF scanned sideways. Thrilling.',
      'Moodle saved your draft. Allegedly.',
      '"Should take about 2 hours," said someone who has the answers.',
      'Yes, the slides will be uploaded "soon".',
      'Nothing says learning like a 3-hour recording at 2x.',
      'Ah, "optional reading". A beautiful fiction.',
      'Love how "see attached" never has an attachment.',
      'Great news: the deadline was extended. To yesterday.',
      'Session expired. Like your motivation, but faster.',
      '{todo:thing} due. Great time to reorganize your desktop.',
      '{next} in {hours:hour}. Perfect moment to check your phone. Again.',
      '{done:thing} done. Don\'t let it go to your head.',
      '@clear Nothing due. Enjoy it. It won\'t last.',
      'Happy {weekday}. Or, as Moodle calls it, a day.',
      '@late Ah, {time}. The official hour of "quick" essay edits.',
      '@morning Up early? Look at you, being a university brochure.',
      '@sun Sunday. The week starts, and so does the fun. Yay.',
      'Scheduled maintenance in exam week. Love a surprise elective.',
      'The student portal is down. At least it is consistent.',
    ],
    stoic: [
      'You cannot control the deadline. Only whether you open the file.',
      'The obstacle is the assignment. The assignment is the way.',
      'Waste no more time arguing what a good student is. Be one.',
      'The quiz does not hate you. The quiz is indifferent. Be likewise.',
      'Moodle will crash. It is its nature. Do not be surprised.',
      'Today I shall meet group members who do nothing. I forgive them.',
      'Very little is needed for a good life. Coffee. Lecture notes.',
      'Memento mori. Memento deadline.',
      'What stands in the way of the reading becomes the reading.',
      'If it is not right, do not submit it. If it is not due, do not panic.',
      'The quality of your life depends on the quality of your citations.',
      'Accept the grade. Then email about it, calmly.',
      'Confine yourself to the present. Specifically, chapter four.',
      '{todo:thing} remain. Each is merely a thing. Begin with one.',
      '{done:thing} completed. Do not boast. Simply continue.',
      '{next}, in {hours:hour}. It approaches, as all things do. Begin.',
      '@clear Nothing is due. Do not go seeking new suffering in the syllabus.',
      '@late At {time}, ask: is this the work, or is this the scrolling?',
      '@morning At dawn, when you rise unwillingly, think: I rise to do a problem set.',
      'It is {weekday}. It was always going to be {weekday}. Proceed.',
      'Service Unavailable. Practice the ancient art of making tea.',
      'The portal is down again. Your pencil remains operational.',
    ],
    chaotic: [
      'hehe deadline go brrrr',
      'I ate the syllabus. It tasted like week 3.',
      'submit it. submit it NOW. or don\'t. i\'m a header, not a cop',
      'what if we studied... but in the bathtub',
      'the quiz is a social construct (the quiz is still graded)',
      'Moodle runs on one tired server and a hamster on overtime',
      'I replaced your coffee with more coffee. You\'re welcome.',
      'citation needed? citation FED. citation YEETED.',
      'lecture recording at 3x speed = podcast for squirrels',
      'I opened 47 tabs and read zero of them. Join me.',
      'RAAAH. ok. what\'s chapter 5 about',
      'ctrl+S ctrl+S ctrl+S ctrl+S (just in case)',
      'the printer in the library knows what you did',
      '{todo:thing} due?? FEED THEM TO THE SUBMIT BUTTON',
      '{next} in {hours:hour}. I will be screaming the whole time. supportively.',
      '{done} done!!! *knocks cup off desk in celebration*',
      '@clear nothing due?? suspicious. checking under the bed.',
      '@late it\'s {time}. the goblin hour. we feast on lecture slides',
      'it\'s {weekday}!!!! i don\'t know what that means but YEAH',
      '@morning good morning. nine espressos in. I can hear colors',
      'SSO ate my login. do i log into the login to log in',
      'library Wi-Fi has left the chat. sending a search squirrel',
    ],
    dramatic: [
      'To submit, or not to submit. (Submit.)',
      'Alas! The PDF hath not loaded!',
      'Friends, classmates, countrymen: lend me your lecture notes.',
      'What light through yonder Moodle breaks? \'Tis the deadline.',
      'Previously on Your Semester: a forum post went unanswered.',
      'And in a shocking twist... the quiz was open book all along.',
      'Thy group partner hath left thee on read.',
      'Parting is such sweet sorrow. Unlike this session timeout.',
      'She opened the syllabus. She gasped. Nothing was ever the same.',
      'Double, double, toil and trouble; Moodle crash and essay rubble.',
      'Is this a deadline I see before me?',
      'The slides were uploaded. The crowd weeps openly.',
      'A rubric! A rubric! My kingdom for a rubric!',
      '@many {todo} tasks remain, and the night grows ever darker.',
      '{next} looms but {hours:hour} hence! Fate itself trembles!',
      'Huzzah! {done:task} vanquished!',
      '@clear Naught is due. \'Tis a miracle. Someone call the dean.',
      '@late \'Tis {time}, the witching hour, when essays are born.',
      'On this fateful {weekday}, a hero opens Moodle.',
      '@evening Evening falls. Our hero still has not started the reading.',
      'Moodle falls again! Act II: the PDF we downloaded in Act I.',
      'Service Unavailable! Even the portal needs an intermission!',
    ],
    'dad-jokes': [
      'I\'d tell you a chemistry joke, but I know I wouldn\'t get a reaction.',
      'Statistics students are mean. On average.',
      'I\'m reading a book on anti-gravity. Can\'t put it down.',
      'Past, present and future walked into a bar. It was tense.',
      'Parallel lines have so much in common. Shame they\'ll never meet.',
      'My thesis on procrastination? I\'ll tell you about it later.',
      'Never trust atoms. They make up everything. Like my bibliography.',
      'Moodle and I have a lot in common. We both need a refresh.',
      'Why was the math book sad? Too many problems. Relatable.',
      'I asked for an extension. The lecturer handed me a ruler.',
      'Studying geometry? Don\'t worry, there\'s always an angle.',
      'My Moodle password and I: a relationship built on resets.',
      'I told my TA a joke about recursion. I told my TA a joke about recursion.',
      '{todo:assignment} due? What a due-lemma.',
      '{done:thing} done! I\'d high-five you, but I\'m a header. No hands.',
      '{next} in {hours:hour}. Time flies like an arrow. Deadlines, like a bullet.',
      '@clear Nothing due? You could say you\'re all caught up in the moment.',
      'Happy {weekday}! Or, as statisticians say, a random variable.',
      '@morning Too early for a coffee joke. It\'d be grounds for dismissal.',
      '@late Up at {time}? Your circadian rhythm wants a regrade.',
      'The portal is down. Must be taking a crash course.',
      'Library Wi-Fi is down. We have a connection problem. Literally.',
    ],
    mom: [
      'You check Moodle every day, but your mother? Never.',
      'Did you eat? You can\'t study on an empty stomach.',
      'Take a sweater, the library is freezing.',
      'The Cohen kid already submitted. I\'m just saying.',
      'I didn\'t raise you to submit at 23:59.',
      'Office hours? Go! Ask! What\'s the worst, he answers?',
      'Your grandmother walked to university in the snow. Uphill. In Jerusalem.',
      'A doctor, a lawyer, I\'m not picky. Just finish the problem set.',
      'Take a jacket. And a snack. And your student card.',
      'Who is this "group project"? Are they nice? Do they do their part?',
      'You\'ll sleep when you graduate. Kidding! Sleep now. Then study.',
      'I made schnitzel. Come home after the quiz.',
      'Sit up straight, you\'ll ruin your back on that laptop.',
      '{todo:thing} due and you\'re on Moodle doing what, exactly?',
      '{done:thing} done! I\'m telling the entire family group chat.',
      '{next} in {hours:hour}. I\'m not worried. I\'m just saying.',
      '@clear Nothing due? So call your mother. Two minutes.',
      '@late It\'s {time}! Go to sleep! The quiz will still be there!',
      '@fri It\'s Friday. Pack a snack for the weekend. And a backup snack.',
      'It\'s {weekday} and you haven\'t called. Fine. Study. I\'m fine.',
      '@morning Breakfast first. Then Moodle. I know you skipped it.',
      'Moodle is down again? Good. Come eat while it thinks.',
      'SSO forgot you? Your mother remembers. Call her.',
    ],
    quotes: [
      '“I love deadlines. I love the whooshing noise they make as they go by.” Douglas Adams',
      '“I can resist everything except temptation.” Oscar Wilde',
      '“I intend to live forever. So far, so good.” Steven Wright',
      '“Whatever it is, I\'m against it.” Groucho Marx',
      '“It ain\'t over till it\'s over.” Yogi Berra',
      '“You can\'t have everything. Where would you put it?” Steven Wright',
      '“Every book is a children\'s book if the kid can read!” Mitch Hedberg',
      '“Never put off till tomorrow. Put off till next term.” Professor Later',
      '“I came, I saw, I requested an extension.” Julius Caesar, probably',
      '“To read or to skim.” William Shakespeare, probably',
      '“I think, therefore I need a snack.” René Descartes, probably',
      '“The unexamined syllabus is easier on the nerves.” Socrates, probably',
      '“One small click for me, one giant PDF.” Captain Coursework',
      '“All roads lead to the wrong lecture hall.” The Campus Oracle',
      '“Let them eat instant noodles.” Marie Antoinette, probably',
      '“My greatest discovery was the undo button.” Professor Oops',
      '“Knowledge is power. Naps are the charger.” Doctor Duvet',
      '“An object at rest has an essay due.” Isaac Newton, probably',
      '“The answer is on a slide I skipped.” The Ghost of Lectures Past',
      '“Moodle is down. I have found my people.” Professor Procrastination',
      '“Exam week? Time for scheduled maintenance.” The Downtime Fairy',
    ],
  };

  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // c = {h, day, now, d: summary | null, mins: minutes until d.next | null}
  const TAGS = {
    late: c => c.h < 6, morning: c => c.h >= 6 && c.h < 12, afternoon: c => c.h >= 12 && c.h < 18, evening: c => c.h >= 18,
    sun: c => c.day === 0, thu: c => c.day === 4, fri: c => c.day === 5, sat: c => c.day === 6,
    clear: c => !!c.d && c.d.todo === 0, many: c => !!c.d && c.d.todo >= 2,
  };
  const DATA_TAGS = new Set(['clear', 'many']);
  const ahead = c => !!c.d?.next && c.mins > 0 && c.mins < 14 * 1440;
  const KEYS = {
    todo: c => c.d?.todo >= 1, done: c => c.d?.done >= 1, next: ahead, hours: ahead,
    weekday: () => true, time: () => true,
  };
  const DATA_KEYS = new Set(['todo', 'done', 'next', 'hours']);

  const ENTRIES = Object.entries(LIB).flatMap(([voice, list]) => list.map((raw, i) => {
    const m = raw.match(/^@(\w+) /);
    const tag = m ? m[1] : null, t = m ? raw.slice(m[0].length) : raw;
    const keys = [...t.matchAll(/\{(\w+)(?::\w+)?\}/g)].map(x => x[1]);
    const kind = DATA_TAGS.has(tag) || keys.some(k => DATA_KEYS.has(k)) ? 'data' : tag ? 'time' : 'plain';
    return {id: `${voice}:${i}`, voice, t, tag, keys, kind};
  }));
  NM.MOTD = ENTRIES;

  const fits = (e, c) => (!e.tag || TAGS[e.tag](c)) && e.keys.every(k => KEYS[k](c));
  const plural = (n, w) => `${n} ${n === 1 ? w : w + 's'}`;
  const clock = d => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}${d.getHours() < 12 ? 'am' : 'pm'}`;
  const duration = mins => mins < 60 ? plural(Math.max(1, Math.round(mins)), 'minute')
    : mins < 48 * 60 ? plural(Math.round(mins / 60), 'hour') : plural(Math.round(mins / 1440), 'day');
  // Moodle event names come HTML-escaped and end in "is due" / "closes" / "opens"; keep just the short name.
  function shortName(raw) {
    let s = new DOMParser().parseFromString(String(raw || ''), 'text/html').body.textContent.trim();
    s = s.replace(/\s+(is due|closes|opens|should be completed|is due today)$/i, '');
    if (s.length <= 30) return s;
    const head = s.split(':')[0].trim();
    if (head.length >= 3 && head.length <= 30) return head;
    return s.slice(0, 28).replace(/\s+\S*$/, '') + '…';
  }
  function fill(e, c) {
    return e.t.replace(/\{(\w+)(?::(\w+))?\}/g, (_, k, unit) => {
      if (k === 'hours') return unit ? duration(c.mins) : String(Math.round(c.mins / 60));
      const v = {todo: c.d?.todo, done: c.d?.done, next: shortName(c.d?.next?.name), weekday: WEEKDAYS[c.day], time: clock(c.now)}[k];
      return unit ? plural(v, unit) : String(v);
    });
  }
  const valid = d => d && typeof d.todo === 'number' && typeof d.done === 'number' ? d : null;
  function context(summary) {
    const now = new Date(), d = valid(summary);
    return {now, h: now.getHours(), day: now.getDay(), d, mins: d?.next ? (d.next.timesort * 1000 - now) / 60000 : null};
  }

  const rand = a => a[Math.random() * a.length | 0];
  // One voice first (so Mixed spreads evenly), then a kind: live-data lines often when there's data, moment lines
  // sometimes, plain otherwise. Never the previous line; the recent ones too while anything else is left.
  function pick(c, voice, prevId, recent) {
    const force = document.documentElement.dataset.nmMotdForce;
    const all = ENTRIES.filter(e => e.id !== prevId && fits(e, c));
    const v = voice !== 'mixed' && all.some(e => e.voice === voice) ? voice : rand([...new Set(all.map(e => e.voice))]);
    let pool = all.filter(e => e.voice === v);
    const of = k => pool.filter(e => e.kind === k);
    const kind = force && of(force).length ? force
      : of('data').length && Math.random() < .35 ? 'data'
      : of('time').length && Math.random() < .3 ? 'time' : 'plain';
    if (of(kind).length) pool = of(kind);
    const fresh = pool.filter(e => !recent.includes(e.id));
    if (fresh.length) pool = fresh;
    // Phones: prefer lines that stay within about two lines.
    if (innerWidth < 576) { const short = pool.filter(e => fill(e, c).length <= 60); if (short.length) pool = short; }
    return rand(pool);
  }

  NM.feature('motd', async () => {
    if (!NM.isDashboard) return;
    const h1 = document.querySelector('#page-header .page-header-headings h1');
    if (!h1 || document.querySelector('.nm-motd')) return;
    const {el} = NM;

    let [voice, recent, cached] = await Promise.all([
      NM.get('voice', 'mixed'), NM.getLocal('motdRecent', []), NM.getLocal('motdSummary', null),
    ]).catch(() => ['mixed', [], null]);
    voice ||= 'mixed';
    if (!Array.isArray(recent)) recent = [];
    let summary = valid(NM.upcomingSummary) || (cached && Date.now() - cached.at < 12 * 3600e3 ? valid(cached) : null);
    let current = null, token = 0, shuffled = false;

    const text = el('span', {id: 'nm-motd-text', class: 'nm-motd-text', dir: 'auto'});
    const ico = el('span', {class: 'nm-motd-ico', 'aria-hidden': 'true'});
    ico.innerHTML = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.97a4 4 0 0 0 3.3-1.7l5.46-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.97a4 4 0 0 1 3.3 1.7l.53.83"/><path d="M22 18h-6.04a4 4 0 0 1-3.3-1.8l-.36-.45"/></svg>';
    const btn = el('button', {type: 'button', class: 'nm-motd-btn', 'aria-label': 'Shuffle message', title: 'Shuffle message',
      'aria-describedby': 'nm-motd-text'}, text, ico);
    const live = el('span', {class: 'nm-motd-live', role: 'status'});
    const p = el('p', {class: 'nm-motd'}, btn, live);

    function show(e, animate) {
      current = e;
      recent = [e.id, ...recent.filter(id => id !== e.id)].slice(0, 24);
      NM.setLocal('motdRecent', recent).catch(() => {});
      Object.assign(p.dataset, {voice: e.voice, kind: e.kind, id: e.id});
      const msg = fill(e, context(summary));
      const my = ++token;
      const swap = () => { text.textContent = msg; if (shuffled) live.textContent = msg; fit(); };
      btn.getAnimations().forEach(a => a.cancel());
      if (!animate || !NM.motion()) return swap();
      const out = btn.animate([{opacity: 1, translate: '0 0'}, {opacity: 0, translate: '0 -.18em'}], {duration: 110, easing: 'ease-in', fill: 'forwards'});
      out.finished.then(() => {
        if (my !== token) return;
        swap(); out.cancel();
        btn.animate([{opacity: 0, translate: '0 .22em'}, {opacity: 1, translate: '0 0'}], {duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)'});
      }, () => {});
    }
    const next = animate => show(pick(context(summary), voice, current?.id, recent), animate);
    // Balanced lines leave the box at its full max width; shrink it to the widest line so the header slot gets the rest.
    function fit() {
      p.style.inlineSize = '';
      if (!p.isConnected) return;
      const range = document.createRange();
      range.selectNodeContents(btn);
      // Group the fragments into lines by vertical overlap (the smaller icon's box starts lower than the text's).
      const lines = [];
      for (const r of range.getClientRects()) {
        if (!r.width) continue;
        const mid = r.top + r.height / 2, l = lines.find(l => mid >= l.top && mid <= l.bottom);
        if (l) { l.left = Math.min(l.left, r.left); l.right = Math.max(l.right, r.right); }
        else lines.push({top: r.top, bottom: r.bottom, left: r.left, right: r.right});
      }
      const w = Math.max(0, ...lines.map(l => l.right - l.left));
      if (w) p.style.inlineSize = `${Math.ceil(w) + 2}px`;
    }

    h1.classList.add('nm-motd-h1');
    h1.after(p);
    next(false);
    let raf = 0;
    const refit = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; fit(); }); };
    window.addEventListener('resize', refit);
    document.fonts?.ready.then(refit);
    document.fonts?.addEventListener?.('loadingdone', refit);
    new MutationObserver(refit).observe(document.documentElement, {attributes: true, attributeFilter: ['data-nm-theme']});

    btn.addEventListener('click', () => { shuffled = true; next(true); });
    NM.watch('voice', v => { voice = v || 'mixed'; next(true); });
    // Fresh numbers: a showing live-data line updates in place (or quietly swaps if it no longer applies).
    document.addEventListener('nm:upcoming', ev => {
      let d = ev.detail;
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = null; } }
      d = valid(d) || valid(NM.upcomingSummary);
      if (!d) return;
      summary = d;
      NM.setLocal('motdSummary', {...d, at: Date.now()}).catch(() => {});
      if (current?.kind !== 'data') return;
      const c = context(summary);
      if (fits(current, c)) { text.textContent = fill(current, c); fit(); }
      else next(false);
    });
  });
})();
