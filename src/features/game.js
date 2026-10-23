// Arcade break: "Deadline Dash". Assignment cards fall; click them before they cross the DEADLINE line.
// Dashboard only. Opens from a block card and a gamepad header button into a full-screen canvas overlay.
// Storage (chrome.storage.local): highscore (written the moment it's beaten), gamesPlayed, gameMuted.
// Test hooks on .nm-game-overlay: data-nm-game-score/-state/-lives/-combo and data-nm-game-targets
// (JSON [{x, y, kind}] in client px). html[data-nm-game-speed] multiplies fall speed and spawn rate.
(() => {
  const KEY_BEST = 'highscore', KEY_PLAYED = 'gamesPlayed', KEY_MUTED = 'gameMuted';
  const NAMES = [
    'Essay (final_FINAL_v3)', 'Lab 4', 'Read ch. 7', 'Problem set 3', 'Quiz 2 (retake)', 'Group project (solo)',
    'Lab report.docx', 'Peer review ×3', 'Forum post ≥200 words', 'Exercise 5', 'Slides (no notes)', 'Lit review',
    'Bibliography (APA?)', 'Ex. 2 bonus', 'Proof of Thm 4.2', 'Case study', 'Thesis outline', 'Survey (mandatory)',
    'Lab 4b', 'Reflection journal', 'Abstract, 250 words', 'Read ch. 8 (and 7)', 'Homework 6', 'Pset 3 (late?)',
    'Code review', 'Exam prep notes', 'Reading response', 'Essay_draft(1).pdf',
  ];
  const COURSES = ['67101 · Algorithms', '55008 · Big Data', '52130 · Strategy', '80131 · Calculus', '67504 · OS', '57322 · Marketing'];
  const PRAISE = ['On time!', 'Submitted!', 'A+', 'Nailed it!', 'Turned in!', 'Clutch!', 'So early!', 'Wow!'];
  const COMBO_WORDS = ['', '', 'Nice!', 'On fire!', 'Unstoppable!', 'Dean\'s list!', 'Academic weapon!', 'Valedictorian!', 'GPA overflow!', 'TENURED!', 'LEGENDARY!'];
  const COMBO_WINDOW = 1.5; // seconds of game time between hits to keep a streak alive

  const fmt = n => Math.round(n).toLocaleString('en-US');
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.random() * a.length | 0];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutBack = t => { const c = 2.2; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
  const easeOutElastic = t => t <= 0 ? 0 : t >= 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1;

  let best = 0, played = 0, muted = false;
  const teaser = {};     // block card refs
  let G = null;          // the overlay controller (created on first open)

  NM.feature('game', () => {
    if (!NM.isDashboard) return;
    buildBlock();
    buildHeaderButton();
    Promise.all([NM.getLocal(KEY_BEST, 0), NM.getLocal(KEY_PLAYED, 0), NM.getLocal(KEY_MUTED, false)]).then(([b, p, m]) => {
      best = Math.max(best, +b || 0); played = Math.max(played, +p || 0); muted = !!m;
      refreshTeaser(); G?.syncHud();
    });
    // NM.watch can't tell storage areas apart; the high score lives in local, so listen directly.
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area !== 'local') return;
      if (ch[KEY_BEST]) { const v = +ch[KEY_BEST].newValue || 0; best = G?.playing() ? Math.max(best, v) : v; }
      if (ch[KEY_PLAYED]) played = +ch[KEY_PLAYED].newValue || 0;
      if (ch[KEY_MUTED]) muted = !!ch[KEY_MUTED].newValue;
      refreshTeaser();
      G?.syncHud();
    });
  });

  // ---------- Entry points ----------
  function buildBlock() {
    const content = NM.block({id: 'game', title: 'Arcade break'});
    if (!content) return;
    const play = e => open(e.currentTarget);
    const art = NM.el('button', {class: 'nm-game-teaser-art', type: 'button', tabindex: '-1', 'aria-hidden': 'true', onclick: play},
      ['Lab 4', 'Essay', 'Read ch. 7'].map((n, i) => NM.el('span', {class: 'nm-game-drop', style: `--i:${i}`}, NM.icon('fileText'), NM.el('span', {class: 'nm-game-drop-text'}, n))),
      NM.el('span', {class: 'nm-game-teaser-line'}, NM.el('span', {}, 'DEADLINE')));
    teaser.best = NM.el('span', {class: 'nm-game-stat-value', 'data-nm-game-best': ''}, '0');
    teaser.played = NM.el('b', {}, '0');
    teaser.playedLabel = NM.el('span', {}, ' games played');
    content.append(NM.el('div', {class: 'nm-game-teaser'},
      art,
      NM.el('div', {class: 'nm-game-stats'},
        NM.el('span', {class: 'nm-game-stat-label'}, NM.icon('trophy'), ' High score'),
        teaser.best,
        NM.el('span', {class: 'nm-game-stat-sub'}, teaser.played, teaser.playedLabel)),
      NM.el('button', {class: 'nm-btn nm-btn-primary nm-game-play', type: 'button', onclick: play},
        NM.el('span', {class: 'nm-game-play-icon', 'aria-hidden': 'true'}, NM.icon('play')), ' Play Deadline Dash')));
  }

  function buildHeaderButton() {
    const slot = NM.headerSlot();
    if (!slot || slot.querySelector('.nm-game-btn')) return;
    const btn = NM.el('button', {class: 'nm-icon-btn nm-game-btn', type: 'button', title: 'Arcade break: Deadline Dash', 'aria-label': 'Play Deadline Dash',
      onclick: e => open(e.currentTarget)}, NM.icon('gamepad'));
    const wrap = slot.querySelector('.nm-theme-wrap');
    wrap ? slot.insertBefore(btn, wrap) : slot.append(btn);
  }

  function refreshTeaser() {
    if (teaser.best) teaser.best.textContent = fmt(best);
    if (teaser.played) { teaser.played.textContent = fmt(played); teaser.playedLabel.textContent = played === 1 ? ' game played' : ' games played'; }
  }

  function open(opener) {
    G ||= createGame();
    G.open(opener);
  }

  // ---------- Theme (read from the --nm-* tokens so the game matches the current theme) ----------
  const probe = Object.assign(document.createElement('canvas'), {width: 1, height: 1}).getContext('2d', {willReadFrequently: true});
  function toRGB(c) {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = '#000'; probe.fillStyle = c; probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }
  const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const rootPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  function toPx(s, def = 0) {
    const n = parseFloat(s);
    if (!isFinite(n)) return def;
    return /rem$|em$/.test(String(s).trim()) ? n * rootPx() : n;
  }
  function parseShadow(s) {
    if (!s || s === 'none') return null;
    const first = s.split(/,(?![^(]*\))/)[0];
    if (/inset/.test(first)) return null;
    const color = first.match(/(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)|#[0-9a-fA-F]{3,8}/)?.[0];
    const rest = color ? first.replace(color, '') : first;
    const nums = (rest.match(/-?[\d.]+(?:px|rem|em)?/g) || []).map(v => toPx(v));
    const named = !color && rest.match(/[a-z]{3,}/i)?.[0];
    if (nums.length < 2) return null;
    return {x: nums[0], y: nums[1], blur: nums[2] || 0, color: color || named || 'rgba(0,0,0,.25)'};
  }
  function readTheme(el) {
    const cs = getComputedStyle(el);
    const v = (n, d) => cs.getPropertyValue(n).trim() || d;
    const bodyFont = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
    let font = v('--nm-font', ''); if (!font || font === 'inherit') font = bodyFont;
    let hfont = v('--nm-heading-font', ''); if (!hfont || hfont === 'inherit') hfont = font;
    const t = {
      bg: v('--nm-bg', '#fff'), surface: v('--nm-surface', '#fff'), surface2: v('--nm-surface-2', '#f5f6f8'),
      text: v('--nm-text', '#1d2125'), muted: v('--nm-text-muted', '#6a737b'), border: v('--nm-border', '#dee2e6'),
      accent: v('--nm-accent', '#0f6cbf'), accentText: v('--nm-accent-contrast', '#fff'), success: v('--nm-success', '#357a32'),
      warning: v('--nm-warning', '#f0ad4e'), danger: v('--nm-danger', '#ca3120'),
      radius: clamp(toPx(v('--nm-radius', '.5rem'), 8), 0, 22), borderW: clamp(toPx(v('--nm-border-width', '1px'), 1), 1, 4),
      shadow: parseShadow(v('--nm-shadow', 'none')), font, hfont,
      confetti: v('--nm-confetti', '#0f6cbf, #f0ad4e, #357a32, #ca3120, #8e44ad').split(/,(?![^(]*\))/).map(s => s.trim()).filter(Boolean),
    };
    t.rgb = {};
    for (const k of ['bg', 'surface', 'surface2', 'text', 'muted', 'border', 'accent', 'success', 'warning', 'danger']) t.rgb[k] = toRGB(t[k]);
    t.dark = lum(t.rgb.bg) < 0.45;
    if (!t.confetti.length) t.confetti = [t.accent, t.warning, t.success, t.danger];
    return t;
  }

  // ---------- Audio (tiny WebAudio blips) ----------
  let actx = null, master = null;
  function audio() {
    if (muted) return null;
    try {
      if (!actx) { actx = new AudioContext(); master = actx.createGain(); master.gain.value = 0.12; master.connect(actx.destination); }
      if (actx.state === 'suspended') actx.resume();
    } catch { return null; }
    return actx;
  }
  function blip(f, d = 0.08, type = 'square', vol = 0.5, f2 = 0, delay = 0) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.03);
  }
  const SFX = {
    hit: c => { const f = 520 * 1.06 ** Math.min(c, 14); blip(f, 0.07, 'square', 0.35, f * 1.5); blip(f * 2, 0.05, 'triangle', 0.2, 0, 0.03); },
    combo: m => [0, 1, 2].forEach(i => blip(660 * 1.26 ** (i + m * 0.3), 0.09, 'square', 0.3, 0, i * 0.06)),
    miss: () => { blip(200, 0.35, 'sawtooth', 0.4, 55); blip(150, 0.3, 'square', 0.2, 60, 0.05); },
    power: () => [660, 880, 1100, 1320, 1760].forEach((f, i) => blip(f, 0.1, 'triangle', 0.35, 0, i * 0.05)),
    record: () => [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => blip(f, i === 6 ? 0.4 : 0.12, 'square', 0.3, 0, i * 0.09)),
    over: () => [392, 330, 262, 196].forEach((f, i) => blip(f, 0.22, 'triangle', 0.4, i === 3 ? 98 : 0, i * 0.16)),
    whiff: () => blip(300, 0.04, 'sine', 0.12, 200),
    go: () => { blip(440, 0.1, 'square', 0.25); blip(880, 0.18, 'square', 0.3, 0, 0.12); },
  };

  // ---------- The game ----------
  function createGame() {
    const el = NM.el;
    const canvas = el('canvas', {class: 'nm-game-canvas', tabindex: '0', 'aria-label': 'Game area. Click or tap the falling assignments to submit them.'});
    const ctx = canvas.getContext('2d');
    const scoreEl = el('span', {class: 'nm-game-score'}, '0');
    const bestEl = el('span', {class: 'nm-game-best-value'}, '0');
    const hearts = [0, 1, 2].map(() => el('span', {class: 'nm-game-heart', 'aria-hidden': 'true'}, NM.icon('heart')));
    const livesEl = el('div', {class: 'nm-game-lives', role: 'img', 'aria-label': '3 lives'}, hearts);
    const comboVal = el('span', {class: 'nm-game-combo-value'}, 'x1');
    const comboStreak = el('span', {class: 'nm-game-combo-streak'}, '');
    const comboFill = el('span', {class: 'nm-game-combo-fill'});
    const comboEl = el('div', {class: 'nm-game-combo', hidden: true},
      el('div', {class: 'nm-game-combo-top'}, comboVal, comboStreak), el('span', {class: 'nm-game-combo-bar'}, comboFill));
    const buffTime = el('span', {}, '5.0');
    const buffEl = el('div', {class: 'nm-game-buff', hidden: true}, NM.icon('coffee'), ' ', buffTime, 's slow-mo');
    const muteBtn = el('button', {class: 'nm-icon-btn nm-game-mute', type: 'button', onclick: () => { muted = !muted; NM.setLocal(KEY_MUTED, muted); syncHud(); }});
    const pauseBtn = el('button', {class: 'nm-icon-btn nm-game-pause', type: 'button', title: 'Pause (Space / P)', 'aria-label': 'Pause', onclick: () => togglePause()}, NM.icon('pause'));
    const closeBtn = el('button', {class: 'nm-icon-btn nm-game-close', type: 'button', title: 'Close (Esc)', 'aria-label': 'Close game', onclick: () => close()}, NM.icon('x'));
    const cardWrap = el('div', {class: 'nm-game-card-wrap', hidden: true});
    const live = el('div', {class: 'nm-game-sr', 'aria-live': 'polite'});
    const bestBox = el('div', {class: 'nm-game-best'}, el('span', {class: 'nm-game-label'}, 'Best'), bestEl);
    const overlay = el('div', {class: 'nm-game-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Deadline Dash', tabindex: '-1', hidden: true},
      canvas,
      el('div', {class: 'nm-game-hud'},
        el('div', {class: 'nm-game-hud-start'},
          el('div', {class: 'nm-game-scorebox'}, el('span', {class: 'nm-game-label'}, 'Score'), scoreEl),
          comboEl, buffEl),
        el('div', {class: 'nm-game-hud-mid'}, el('span', {class: 'nm-game-logo'}, NM.icon('fileText'), ' Deadline Dash')),
        el('div', {class: 'nm-game-hud-end'}, livesEl, bestBox, muteBtn, pauseBtn, closeBtn)),
      cardWrap, live);
    document.body.append(overlay);

    let W = 0, H = 0, dpr = 1, T = null, motion = true;
    let raf = 0, last = 0, isOpen = false, opener = null, prevOverflow = '';
    let state = 'idle'; // playing | paused | dying | over | idle
    let cards = [], powers = [], parts = [], pops = [];
    let score = 0, lives = 3, combo = 0, mult = 1, comboT = 0, submitted = 0, bestCombo = 1, startBest = 0, celebrated = false;
    let time = 0, spawnT = 0, coffee = 0, slowmo = 0, hitstop = 0, dieT = 0, hits = 0;
    let shake = 0, flash = 0, flashColor = '#fff', vignette = 0, bgPulse = 0, lineAlarm = 0, lastTargets = 0, shownScore = -1;
    let goTimer = 0;

    const deadlineY = () => H - Math.max(56, Math.min(84, H * 0.08));
    const speedHook = () => clamp(+document.documentElement.dataset.nmGameSpeed || 1, 0.1, 20);
    const isRTL = () => document.documentElement.dir === 'rtl' || document.body.classList.contains('dir-rtl');

    function resize() {
      const w = overlay.clientWidth || innerWidth, h = overlay.clientHeight || innerHeight;
      const nd = Math.min(devicePixelRatio || 1, 2.5);
      const dprChanged = nd !== dpr;
      W = w; H = h; dpr = nd;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      for (const c of cards) { c.x = clamp(c.x, 8, Math.max(8, W - c.w - 8)); if (dprChanged) c.sprite = makeSprite(c); }
      draw(performance.now() / 1000);
    }
    new ResizeObserver(() => isOpen && resize()).observe(overlay);

    function rrect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, Math.max(0, Math.min(r, h / 2, w / 2))); }

    // Card sprites are rendered once per card (text + shadow), then drawImage'd every frame.
    const PAD = 18;
    function makeSprite(card) {
      const s = document.createElement('canvas');
      s.width = Math.ceil((card.w + PAD * 2) * dpr); s.height = Math.ceil((card.h + PAD * 2) * dpr);
      const x = s.getContext('2d');
      x.scale(dpr, dpr); x.translate(PAD, PAD);
      const r = T.radius;
      x.save();
      if (T.shadow) { x.shadowOffsetX = clamp(T.shadow.x, -8, 8); x.shadowOffsetY = clamp(T.shadow.y, -8, 10); x.shadowBlur = Math.min(T.shadow.blur, 16); x.shadowColor = T.shadow.color; }
      else { x.shadowOffsetY = 4; x.shadowBlur = 12; x.shadowColor = T.dark ? 'rgba(0,0,0,.55)' : 'rgba(20,30,50,.18)'; }
      rrect(x, 0, 0, card.w, card.h, r); x.fillStyle = T.surface; x.fill();
      x.restore();
      x.save(); rrect(x, 0, 0, card.w, card.h, r); x.clip();
      x.fillStyle = card.color; x.fillRect(0, 0, 6, card.h);
      x.fillStyle = T.surface2; x.fillRect(card.w - 30, 0, 30, card.h);
      x.restore();
      rrect(x, T.borderW / 2, T.borderW / 2, card.w - T.borderW, card.h - T.borderW, r);
      x.lineWidth = T.borderW; x.strokeStyle = T.border; x.stroke();
      x.textBaseline = 'middle';
      x.font = `20px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      x.fillText('📄', 14, card.h / 2 + 1);
      x.fillStyle = T.text; x.font = `700 15px ${T.font}`;
      x.fillText(card.name, 44, card.h / 2 - 7, card.w - 84);
      x.fillStyle = T.muted; x.font = `600 11px ${T.font}`;
      x.fillText(card.course, 44, card.h / 2 + 11, card.w - 84);
      x.fillStyle = card.color; x.font = `900 15px ${T.font}`; x.textAlign = 'center';
      x.fillText('↑', card.w - 15, card.h / 2 + 1);
      return s;
    }

    function newGame() {
      T = readTheme(overlay); rgbCache.clear();
      motion = NM.motion();
      overlay.classList.toggle('nm-game-calm', !motion);
      cards = []; powers = []; parts = []; pops = [];
      score = 0; lives = 3; combo = 0; mult = 1; comboT = 0; submitted = 0; bestCombo = 1; hits = 0;
      time = 0; spawnT = 0.9; coffee = 0; slowmo = 0; hitstop = 0; shake = 0; flash = 0; vignette = 0; bgPulse = 0; dieT = 0;
      startBest = best; celebrated = false; shownScore = -1;
      hearts.forEach(h => h.classList.remove('nm-game-heart-lost'));
      bestBox.classList.remove('nm-game-best-new');
      delete overlay.dataset.nmGameRecord;
      cardWrap.hidden = true; cardWrap.replaceChildren();
      setState('playing');
      played += 1; NM.setLocal(KEY_PLAYED, played); refreshTeaser();
      popup('READY?', W / 2, H * 0.42, {size: 64, life: 0.6, color: T.accent, big: true});
      clearTimeout(goTimer);
      goTimer = setTimeout(() => { if (state === 'playing' && isOpen) { popup('GO!', W / 2, H * 0.42, {size: 96, life: 0.7, color: T.success, big: true}); SFX.go(); } }, 520);
      syncHud();
      canvas.focus({preventScroll: true});
    }

    function setState(s) {
      state = s;
      overlay.dataset.nmGameState = s;
      if (pauseBtn.dataset.icon !== (pauseBtn.dataset.icon = s === 'paused' ? 'play' : 'pause')) pauseBtn.replaceChildren(NM.icon(pauseBtn.dataset.icon));
      pauseBtn.setAttribute('aria-label', s === 'paused' ? 'Resume' : 'Pause');
      pauseBtn.disabled = !(s === 'playing' || s === 'paused');
    }

    function syncHud() {
      if (score !== shownScore) {
        const bumped = shownScore >= 0 && score > shownScore;
        shownScore = score;
        scoreEl.textContent = fmt(score);
        overlay.dataset.nmGameScore = score;
        if (bumped && motion) scoreEl.animate([{transform: 'scale(1.4) rotate(-4deg)'}, {transform: 'scale(1)'}], {duration: 280, easing: 'cubic-bezier(.2,1.8,.4,1)'});
      }
      bestEl.textContent = fmt(Math.max(best, score));
      overlay.dataset.nmGameLives = lives;
      overlay.dataset.nmGameCombo = mult;
      livesEl.setAttribute('aria-label', `${lives} ${lives === 1 ? 'life' : 'lives'} left`);
      if (muteBtn.dataset.icon !== (muteBtn.dataset.icon = muted ? 'volumeX' : 'volume')) muteBtn.replaceChildren(NM.icon(muteBtn.dataset.icon));
      muteBtn.title = muted ? 'Unmute' : 'Mute';
      muteBtn.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
      muteBtn.setAttribute('aria-pressed', String(muted));
    }

    function spawn() {
      const base = H * Math.min(0.12 + 0.0055 * time, 0.44) * speedHook();
      if (time > 7 && !powers.length && Math.random() < 0.085) {
        const kind = Math.random() < 0.58 ? 'coffee' : 'star';
        powers.push({kind, x: rand(60, W - 60), y: -40, r: 30, vy: base * 1.15, phase: rand(0, 6), age: 0});
        return;
      }
      const name = pick(NAMES);
      ctx.font = `700 15px ${T.font}`;
      const w = Math.round(clamp(ctx.measureText(name).width + 92, 150, 300)), h = 56;
      let x = 0; // keep new cards from overlapping the last few spawns
      for (let i = 0; i < 8; i++) {
        x = rand(16, Math.max(16, W - w - 16));
        if (!cards.slice(-3).some(c => c.y < 90 && Math.abs(c.x - x) < (c.w + w) / 2 + 10)) break;
      }
      const card = {name, w, h, x, y: -h - 4, vy: base * rand(0.85, 1.18), age: 0, phase: rand(0, 6), wf: rand(1.5, 3),
        rot: rand(-0.06, 0.06), color: pick(T.confetti), course: pick(COURSES)};
      card.sprite = makeSprite(card);
      cards.push(card);
    }
    const spawnInterval = () => Math.max(0.34, 1.25 - 0.017 * time) / speedHook();

    // ---------- FX ----------
    const PMAX = 700;
    const addPart = p => { if (parts.length < PMAX) parts.push(p); };
    function burst(x, y, n, colors, {speed = 420, size = 7, spark = true, ring = true, gravity = 900} = {}) {
      if (!motion) n = Math.ceil(n * 0.3);
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2), v = rand(0.25, 1) * speed;
        addPart({type: Math.random() < 0.7 ? 'rect' : 'circ', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.35, g: gravity,
          life: rand(0.5, 1.1), max: 1.1, size: rand(size * 0.5, size * 1.4), color: pick(colors), rot: rand(0, 6), vr: rand(-14, 14), drag: 0.985});
      }
      if (spark && motion) for (let i = 0; i < n * 0.5; i++) {
        const a = rand(0, Math.PI * 2), v = rand(0.6, 1.4) * speed * 1.3;
        addPart({type: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 200, life: rand(0.18, 0.4), max: 0.4, size: 2.5, color: pick(colors), drag: 0.93});
      }
      if (ring) addPart({type: 'ring', x, y, life: 0.42, max: 0.42, size: motion ? 120 : 60, color: colors[0]});
    }
    function confettiRain(n) {
      if (!motion) n = Math.ceil(n * 0.25);
      for (let i = 0; i < n; i++) addPart({type: 'rect', x: rand(0, W), y: rand(-H * 0.3, -10), vx: rand(-80, 80), vy: rand(60, 260), g: 260,
        life: rand(1.8, 3), max: 3, size: rand(6, 12), color: pick(T.confetti), rot: rand(0, 6), vr: rand(-10, 10), drag: 0.995, flutter: rand(2, 6)});
    }
    function popup(text, x, y, {size = 30, life = 0.9, color = T.accent, big = false, rainbow = false, rise = 60} = {}) {
      pops.push({text, x: clamp(x, 90, W - 90), y: big ? y : Math.max(y, 165), size, life, age: 0, color, big, rainbow, rise, rot: big ? rand(-0.08, 0.08) : rand(-0.15, 0.15)});
      if (pops.length > 24) pops.shift();
    }
    const doShake = m => { if (motion) shake = Math.max(shake, m); };
    const doFlash = (a, c = '#fff') => { if (motion) { flash = Math.max(flash, a); flashColor = c; } };

    // ---------- Gameplay ----------
    function hitCard(c, px, py) {
      cards.splice(cards.indexOf(c), 1);
      combo = comboT > 0 ? combo + 1 : 1;
      comboT = COMBO_WINDOW;
      const prevMult = mult;
      mult = Math.min(1 + Math.floor(combo / 3), 10);
      bestCombo = Math.max(bestCombo, mult);
      const gain = 100 * mult;
      score += gain; submitted += 1; hits += 1;
      const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
      addPart({type: 'ghost', x: cx, y: cy, life: 0.38, max: 0.38, card: c});
      burst(px ?? cx, py ?? cy, 26 + mult * 5, [c.color, ...T.confetti], {speed: 380 + mult * 25});
      popup('+' + fmt(gain), cx, cy - 10, {size: 26 + Math.min(mult, 6) * 3, color: mult > 1 ? T.accent : T.success, rainbow: mult >= 5});
      if (hits % 6 === 0 && mult === prevMult) popup(pick(PRAISE), cx, cy - 46, {size: 20, color: T.text, life: 0.8});
      bgPulse = 1;
      SFX.hit(combo);
      if (mult > prevMult) {
        const size = Math.min(54 + mult * 8, 120);
        popup(`COMBO x${mult}!`, W / 2, H * 0.3, {size, life: 1.15, color: T.accent, big: true, rainbow: mult >= 4});
        if (COMBO_WORDS[mult]) popup(COMBO_WORDS[mult], W / 2, H * 0.3 + size * 0.78, {size: 26, life: 1.1, color: T.text, big: true});
        SFX.combo(mult);
        if (mult >= 3) doShake(5 + mult * 2.2);
        if (mult >= 4) doFlash(0.22 + mult * 0.03);
        if (motion) hitstop = 0.06;
        burst(W / 2, H * 0.3, 30 + mult * 6, T.confetti, {speed: 700, size: 9, gravity: 700});
      }
      checkBest();
      syncHud();
    }

    function hitPower(p) {
      powers.splice(powers.indexOf(p), 1);
      SFX.power();
      if (p.kind === 'coffee') {
        coffee = 5;
        burst(p.x, p.y, 40, ['#6f4e37', '#c69c6d', '#f3e5d0', T.accent], {speed: 420});
        popup('☕ COFFEE BREAK!', W / 2, H * 0.38, {size: 48, life: 1.3, color: '#8a5a3c', big: true});
        popup('time slows down', W / 2, H * 0.38 + 44, {size: 22, life: 1.2, color: T.text, big: true});
        doFlash(0.25, '#f3e5d0');
      } else {
        const n = cards.length;
        for (const c of cards.splice(0)) {
          const gain = 50 * mult; score += gain; submitted += 1;
          addPart({type: 'ghost', x: c.x + c.w / 2, y: c.y + c.h / 2, life: 0.45, max: 0.45, card: c});
          burst(c.x + c.w / 2, c.y + c.h / 2, 22, [c.color, T.warning, ...T.confetti], {speed: 480});
          popup('+' + fmt(gain), c.x + c.w / 2, c.y + c.h / 2, {size: 24, color: T.warning});
        }
        burst(p.x, p.y, 80, [T.warning, '#fff7ae', ...T.confetti], {speed: 900, size: 10});
        popup('⭐ EXTENSION GRANTED!', W / 2, H * 0.36, {size: Math.min(50, W / 14), life: 1.4, color: T.warning, big: true, rainbow: true});
        if (n) popup(`${n} assignment${n === 1 ? '' : 's'} cleared`, W / 2, H * 0.36 + 48, {size: 22, life: 1.2, color: T.text, big: true});
        doFlash(0.7); doShake(14); bgPulse = 1.5;
        checkBest();
      }
      syncHud();
    }

    function checkBest() {
      if (score <= best) return;
      best = score;
      NM.setLocal(KEY_BEST, best); // saved the moment it's beaten, so closing the tab mid-game loses nothing
      refreshTeaser();
      if (!celebrated && startBest > 0) {
        celebrated = true;
        if (motion) slowmo = 1.6;
        doFlash(0.85); doShake(12);
        confettiRain(160);
        try { NM.confetti({power: 'big'}); } catch {}
        popup('NEW HIGH SCORE!', W / 2, H * 0.5, {size: Math.min(84, W / 9), life: 1.8, color: T.warning, big: true, rainbow: true});
        SFX.record();
        bestBox.classList.add('nm-game-best-new');
      }
    }

    function miss(c) {
      cards.splice(cards.indexOf(c), 1);
      lives -= 1;
      const was = mult;
      combo = 0; mult = 1; comboT = 0;
      const cx = c.x + c.w / 2, dy = deadlineY();
      burst(cx, dy, 34, [T.danger, T.muted, T.border, '#555'], {speed: 340, size: 8});
      addPart({type: 'ghost', x: cx, y: dy - c.h / 2, life: 0.55, max: 0.55, card: c, late: true});
      popup('LATE!', cx, dy - 56, {size: 40, color: T.danger, life: 1});
      if (was >= 3) popup(`combo x${was} lost`, cx, dy - 96, {size: 18, color: T.muted, life: 1});
      doShake(16); vignette = 1; lineAlarm = 1;
      SFX.miss();
      hearts[lives]?.classList.add('nm-game-heart-lost');
      if (lives <= 0) die();
      syncHud();
    }

    function die() {
      setState('dying');
      dieT = 1.0;
      for (const c of cards) burst(c.x + c.w / 2, c.y + c.h / 2, 14, [T.muted, T.border, T.danger], {speed: 260, ring: false});
      cards = []; powers = [];
      doShake(26); doFlash(0.5, T.danger);
      if (motion) slowmo = 1.0;
      SFX.over();
      live.textContent = `Game over. Score ${fmt(score)}.`;
    }

    function showOver() {
      setState('over');
      const record = score > startBest && score > 0;
      overlay.dataset.nmGameRecord = String(record);
      const again = el('button', {class: 'nm-btn nm-btn-primary nm-game-again', type: 'button', onclick: () => newGame()}, NM.icon('rotateCcw'), ' Play again');
      const card = el('div', {class: 'nm-game-card nm-game-over' + (record ? ' nm-game-record' : '')},
        record && el('div', {class: 'nm-game-badge'}, NM.icon('trophy'), ' NEW HIGH SCORE!'),
        el('div', {class: 'nm-game-card-emoji', 'aria-hidden': 'true'}, NM.icon(record ? 'graduationCap' : 'alarmClock')),
        el('h2', {class: 'nm-game-card-title'}, record ? 'Top of the class!' : 'Deadline passed!'),
        el('div', {class: 'nm-game-final'}, fmt(score)),
        el('div', {class: 'nm-game-final-stats'},
          el('span', {}, el('b', {}, fmt(submitted)), ' submitted'),
          el('span', {}, el('b', {}, 'x' + bestCombo), ' best combo'),
          el('span', {}, el('b', {}, fmt(best)), ' high score')),
        el('div', {class: 'nm-game-card-actions'}, again,
          el('button', {class: 'nm-btn nm-game-quit', type: 'button', onclick: () => close()}, 'Back to Moodle')),
        el('p', {class: 'nm-game-hint'}, 'Enter = play again · Esc = close'));
      cardWrap.replaceChildren(card); cardWrap.hidden = false;
      if (record) { confettiRain(120); if (startBest === 0) try { NM.confetti({power: 'big'}); } catch {} }
      again.focus({preventScroll: true});
    }

    function togglePause(force) {
      const want = force ?? state === 'playing';
      if (want && state === 'playing') {
        setState('paused');
        const resume = el('button', {class: 'nm-btn nm-btn-primary nm-game-resume', type: 'button', onclick: () => togglePause(false)}, NM.icon('play'), ' Resume');
        cardWrap.replaceChildren(el('div', {class: 'nm-game-card nm-game-paused'},
          el('div', {class: 'nm-game-card-emoji', 'aria-hidden': 'true'}, NM.icon('pause')),
          el('h2', {class: 'nm-game-card-title'}, 'Paused'),
          el('p', {class: 'nm-game-card-text'}, 'The deadlines will wait. (Just this once.)'),
          el('div', {class: 'nm-game-card-actions'}, resume, el('button', {class: 'nm-btn nm-game-quit', type: 'button', onclick: () => close()}, 'Quit')),
          el('p', {class: 'nm-game-hint'}, 'Space / P = resume · Esc = close')));
        cardWrap.hidden = false;
        resume.focus({preventScroll: true});
      } else if (!want && state === 'paused') {
        cardWrap.hidden = true; cardWrap.replaceChildren();
        setState('playing');
        last = performance.now();
        canvas.focus({preventScroll: true});
      }
    }

    // ---------- Loop ----------
    function frame(now) {
      raf = requestAnimationFrame(frame);
      let dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (state === 'paused') return; // the paused frame stays on screen; nothing to redraw
      const real = dt;
      if (hitstop > 0) { hitstop -= dt; dt = 0; }
      let ts = 1;
      if (slowmo > 0) { slowmo = Math.max(0, slowmo - real); ts = 1 - 0.8 * clamp(slowmo / 1.2); }
      if (coffee > 0) { coffee = Math.max(0, coffee - real); ts *= 0.45; }
      const g = dt * ts;
      if (state === 'playing') update(g);
      if (state === 'dying') { dieT -= real; if (dieT <= 0) showOver(); }
      fx(g, real);
      draw(now / 1000);
      if (now - lastTargets > 50) { lastTargets = now; publishTargets(); }
    }

    function update(g) {
      time += g;
      spawnT -= g;
      if (spawnT <= 0) { spawn(); spawnT = spawnInterval(); if (time > 25 && Math.random() < 0.18) spawn(); }
      const dl = deadlineY();
      for (let i = cards.length - 1; i >= 0; i--) {
        const c = cards[i];
        c.y += c.vy * g; c.age += g;
        if (c.y + c.h / 2 > dl) { miss(c); if (state !== 'playing') return; }
      }
      for (let i = powers.length - 1; i >= 0; i--) {
        const p = powers[i];
        p.y += p.vy * g; p.age += g; p.x += Math.sin(p.age * 3 + p.phase) * 40 * g;
        if (p.y - p.r > H) powers.splice(i, 1);
      }
      if (comboT > 0) { comboT -= g; if (comboT <= 0) { combo = 0; mult = 1; syncHud(); } }
    }

    function fx(g, real) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= g;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        if (p.vx !== undefined) {
          const d = p.drag ** (g * 60);
          p.vy += (p.g || 0) * g; p.vx *= d; p.vy *= d;
          p.x += p.vx * g + (p.flutter ? Math.sin(p.life * p.flutter) * 30 * g : 0); p.y += p.vy * g;
          if (p.rot !== undefined) p.rot += p.vr * g;
        }
      }
      for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.age += real; /* popups stay readable through slow-mo */ if (p.age >= p.life) pops.splice(i, 1); }
      shake *= Math.pow(0.0008, real); if (shake < 0.3) shake = 0;
      flash = Math.max(0, flash - real * 3.2);
      vignette = Math.max(0, vignette - real * 1.4);
      bgPulse = Math.max(0, bgPulse - real * 2.2);
      lineAlarm = Math.max(0, lineAlarm - real * 1.5);
      const showCombo = combo >= 2 && state === 'playing';
      if (comboEl.hidden === showCombo) comboEl.hidden = !showCombo;
      if (showCombo) {
        comboVal.textContent = 'x' + mult;
        comboStreak.textContent = `${combo} streak`;
        comboFill.style.transform = `scaleX(${clamp(comboT / COMBO_WINDOW).toFixed(3)})`;
        comboEl.dataset.hot = String(mult >= 4);
      }
      if (buffEl.hidden === coffee > 0) buffEl.hidden = !(coffee > 0);
      if (coffee > 0) buffTime.textContent = coffee.toFixed(1);
    }

    function publishTargets() {
      if (state !== 'playing') { if (overlay.dataset.nmGameTargets !== '[]') overlay.dataset.nmGameTargets = '[]'; return; }
      const dl = deadlineY();
      overlay.dataset.nmGameTargets = JSON.stringify([
        ...cards.filter(c => c.y > 70 && c.y + c.h < dl).map(c => ({kind: 'card', x: Math.round(c.x + c.w / 2), y: Math.round(c.y + c.h / 2)})),
        ...powers.filter(p => p.y > 70 && p.y < dl).map(p => ({kind: p.kind, x: Math.round(p.x), y: Math.round(p.y)})),
      ]);
    }

    // ---------- Drawing ----------
    function draw(t) {
      if (!T) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();
      if (shake) {
        ctx.translate(W / 2 + rand(-shake, shake), H / 2 + rand(-shake, shake));
        ctx.rotate(rand(-1, 1) * shake * 0.0018);
        ctx.translate(-W / 2, -H / 2);
      }
      drawBg(t);
      drawDeadline(t);
      drawCards(t);
      drawPowers(t);
      drawParts();
      drawPops(t);
      ctx.restore();
      if (coffee > 0) {
        ctx.fillStyle = `rgba(111,78,55,${0.07 + 0.03 * Math.sin(t * 4)})`; ctx.fillRect(0, 0, W, H);
        const gr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
        gr.addColorStop(0, 'rgba(111,78,55,0)'); gr.addColorStop(1, `rgba(111,78,55,${0.28 * clamp(coffee)})`);
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      }
      if (vignette > 0) {
        const gr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.72);
        gr.addColorStop(0, rgba(T.rgb.danger, 0)); gr.addColorStop(1, rgba(T.rgb.danger, 0.5 * vignette));
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      }
      if (flash > 0) { ctx.globalAlpha = Math.min(flash, 0.9); ctx.fillStyle = flashColor; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    }

    function drawBg(t) {
      ctx.fillStyle = T.bg; ctx.fillRect(-60, -60, W + 120, H + 120);
      // Combo-driven pulse: a breathing radial glow plus a spinning sunburst from x4 up.
      const beat = motion ? 0.5 + 0.5 * Math.sin(t * (5 + mult * 0.9)) : 0.6;
      const level = (mult > 1 ? Math.min(mult, 8) * 0.035 * (0.55 + 0.45 * beat) : 0) + bgPulse * 0.07;
      if (mult >= 4 && state === 'playing') {
        ctx.save(); ctx.translate(W / 2, H * 0.45); ctx.rotate(motion ? t * 0.25 * (mult / 4) : 0);
        const R = Math.hypot(W, H), n = 16;
        for (let i = 0; i < n; i++) {
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, (i / n) * Math.PI * 2, ((i + 0.5) / n) * Math.PI * 2); ctx.closePath();
          ctx.fillStyle = rgba(i % 2 ? T.rgb.accent : T.rgb.warning, Math.min(0.03 + mult * 0.008, 0.11) * (0.6 + 0.4 * beat));
          ctx.fill();
        }
        ctx.restore();
      }
      if (level > 0.002) {
        const gr = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.7);
        gr.addColorStop(0, rgba(T.rgb.accent, Math.min(level * 1.6, 0.4))); gr.addColorStop(1, rgba(T.rgb.accent, 0));
        ctx.fillStyle = gr; ctx.fillRect(-60, -60, W + 120, H + 120);
      }
      // Notebook paper that scrolls a little faster as the semester speeds up.
      const gap = 34, off = motion ? (time * (24 + time * 0.6)) % gap : 0;
      ctx.strokeStyle = rgba(T.rgb.border, T.dark ? 0.35 : lum(T.rgb.border) < 0.4 ? 0.13 : 0.55); ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = off - gap; y < H; y += gap) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(W, Math.round(y) + 0.5); }
      ctx.stroke();
      ctx.strokeStyle = rgba(T.rgb.danger, 0.22); ctx.beginPath();
      const mx = isRTL() ? W - 72 : 72;
      ctx.moveTo(mx + 0.5, 0); ctx.lineTo(mx + 0.5, H); ctx.stroke();
    }

    function drawDeadline(t) {
      const y = deadlineY();
      let danger = lineAlarm;
      for (const c of cards) danger = Math.max(danger, clamp((c.y + c.h - (y - 170)) / 170));
      const pulse = motion ? 0.5 + 0.5 * Math.sin(t * (4 + danger * 10)) : 0.5;
      const gr = ctx.createLinearGradient(0, y - 90, 0, H);
      gr.addColorStop(0, rgba(T.rgb.danger, 0)); gr.addColorStop(0.55, rgba(T.rgb.danger, 0.08 + danger * 0.16 * pulse)); gr.addColorStop(1, rgba(T.rgb.danger, 0.18 + danger * 0.2));
      ctx.fillStyle = gr; ctx.fillRect(-60, y - 90, W + 120, H - y + 150);
      ctx.save();
      ctx.strokeStyle = T.danger; ctx.lineWidth = 3 + danger * 2;
      ctx.setLineDash([16, 10]); ctx.lineDashOffset = motion ? -t * 60 : 0;
      ctx.beginPath(); ctx.moveTo(-60, y); ctx.lineTo(W + 60, y); ctx.stroke();
      ctx.restore();
      const label = '⏰ DEADLINE';
      ctx.font = `900 14px ${T.hfont}`;
      const tw = ctx.measureText(label).width + 26, s = 1 + danger * 0.14 * pulse;
      const lx = isRTL() ? W - tw - 20 : 20;
      ctx.save(); ctx.translate(lx + tw / 2, y); ctx.scale(s, s); ctx.rotate(-0.03);
      rrect(ctx, -tw / 2, -15, tw, 30, 15); ctx.fillStyle = T.danger; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 1);
      ctx.restore();
      ctx.font = `700 12px ${T.font}`; ctx.fillStyle = rgba(T.rgb.danger, 0.8); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('anything below this line is late', W / 2, y + (H - y) / 2 + 4);
    }

    function drawCards(t) {
      const dl = deadlineY();
      for (const c of cards) {
        const u = clamp((c.y + c.h - (dl - 150)) / 150);
        const pop = c.age < 0.3 ? lerp(0.4, 1, easeOutBack(c.age / 0.3)) : 1;
        ctx.save();
        ctx.translate(c.x + c.w / 2 + (motion && u > 0 ? rand(-1, 1) * u * 2.5 : 0), c.y + c.h / 2);
        ctx.rotate(c.rot + (motion ? Math.sin(t * c.wf + c.phase) * 0.05 : 0));
        if (pop !== 1) ctx.scale(pop, pop);
        ctx.drawImage(c.sprite, -c.w / 2 - PAD, -c.h / 2 - PAD, c.w + PAD * 2, c.h + PAD * 2);
        if (u > 0) {
          rrect(ctx, -c.w / 2, -c.h / 2, c.w, c.h, T.radius);
          ctx.lineWidth = 2 + u * 2; ctx.strokeStyle = rgba(T.rgb.danger, 0.3 + 0.7 * u); ctx.stroke();
          if (u > 0.45) {
            ctx.font = `900 10px ${T.hfont}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const bw = 64; rrect(ctx, c.w / 2 - bw + 6, -c.h / 2 - 9, bw, 18, 9); ctx.fillStyle = T.danger; ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillText('DUE NOW!', c.w / 2 - bw / 2 + 6, -c.h / 2 + 0.5);
          }
        }
        ctx.restore();
      }
    }

    const rgbCache = new Map();
    const rgbOf = c => { if (!rgbCache.has(c)) rgbCache.set(c, toRGB(c)); return rgbCache.get(c); };
    function drawPowers(t) {
      for (const p of powers) {
        const col = p.kind === 'coffee' ? [111, 78, 55] : rgbOf(T.warning);
        const glow = 0.5 + 0.5 * Math.sin(t * 6 + p.phase);
        ctx.save(); ctx.translate(p.x, p.y);
        for (let i = 3; i > 0; i--) { ctx.beginPath(); ctx.arc(0, 0, p.r + i * 7 * (0.6 + glow * 0.5), 0, Math.PI * 2); ctx.fillStyle = rgba(col, 0.07 * i); ctx.fill(); }
        if (p.kind === 'star' && motion) {
          ctx.save(); ctx.rotate(t * 2);
          for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillStyle = rgba(col, 0.4); ctx.fillRect(p.r * 0.9, -2, 18 + glow * 12, 4); }
          ctx.restore();
        }
        ctx.save(); ctx.rotate(motion ? Math.sin(t * 3 + p.phase) * 0.25 : 0);
        ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fillStyle = T.surface; ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = rgba(col, 1); ctx.stroke();
        ctx.font = `30px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.kind === 'coffee' ? '☕' : '⭐', 0, 2);
        ctx.restore();
        ctx.font = `900 11px ${T.hfont}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3; ctx.strokeStyle = T.bg; ctx.strokeText(p.kind === 'coffee' ? 'SLOW-MO' : 'CLEAR ALL', 0, p.r + 15);
        ctx.fillStyle = rgba(col, 1); ctx.fillText(p.kind === 'coffee' ? 'SLOW-MO' : 'CLEAR ALL', 0, p.r + 15);
        ctx.restore();
      }
    }

    function drawParts() {
      for (const p of parts) {
        if (p.type === 'ghost') {
          const k = 1 - p.life / p.max, c = p.card, s = p.late ? 1 - k * 0.3 : 1 + easeOutBack(k) * 0.35;
          ctx.save(); ctx.globalAlpha = clamp(1 - k * 1.1); ctx.translate(p.x, p.y + (p.late ? k * 20 : 0)); ctx.rotate(c.rot + (p.late ? k * 0.4 : -k * 0.2)); ctx.scale(s, s);
          ctx.drawImage(c.sprite, -c.w / 2 - PAD, -c.h / 2 - PAD, c.w + PAD * 2, c.h + PAD * 2);
          ctx.rotate(-0.18); // rubber stamp
          const st = k < 0.15 ? lerp(1.8, 1, k / 0.15) : 1; ctx.scale(st, st);
          ctx.font = `900 18px ${T.hfont}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const txt = p.late ? 'LATE ✗' : 'SUBMITTED ✓', col = p.late ? T.danger : T.success, tw = ctx.measureText(txt).width + 18;
          ctx.fillStyle = rgba(T.rgb.surface, 0.9); rrect(ctx, -tw / 2, -15, tw, 30, 6); ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke();
          ctx.fillStyle = col; ctx.fillText(txt, 0, 1);
          ctx.restore();
          continue;
        }
        ctx.globalAlpha = clamp(p.life / (p.max * 0.5));
        if (p.type === 'rect') {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2 * (0.5 + 0.5 * Math.abs(Math.sin(p.rot * 2)))); ctx.restore();
        } else if (p.type === 'circ') {
          ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2.4, 0, Math.PI * 2); ctx.fill();
        } else if (p.type === 'spark') {
          ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke();
        } else if (p.type === 'ring') {
          const k = 1 - p.life / p.max;
          ctx.globalAlpha = (1 - k) * 0.9; ctx.strokeStyle = p.color; ctx.lineWidth = 6 * (1 - k) + 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, 10 + easeOutBack(Math.min(k * 1.2, 1)) * p.size, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    function drawPops(t) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      for (const p of pops) {
        const k = p.age / p.life;
        let s = 1, a = 1, y = p.y;
        if (motion) {
          // Big text slams in from huge and wobbles to rest; small "+100"s pop up with overshoot.
          s = p.big ? (p.age < 0.08 ? lerp(2.6, 1.25, p.age / 0.08) : easeOutElastic(clamp(p.age / 0.5))) : easeOutBack(clamp(p.age / 0.22));
          if (k > 0.75) s *= 1 + (k - 0.75) * 1.6;
        }
        if (k > 0.7) a = 1 - (k - 0.7) / 0.3;
        y -= p.big ? k * 18 : easeOutBack(clamp(k * 1.4)) * p.rise;
        if (s <= 0.01 || a <= 0) continue;
        const color = p.rainbow ? T.confetti[Math.floor(t * 14 + p.x) % T.confetti.length] : p.color;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, y); if (motion) ctx.rotate(p.rot); ctx.scale(s, s);
        ctx.font = `900 ${p.size}px ${T.hfont}`;
        ctx.lineWidth = Math.max(4, p.size * 0.18); ctx.strokeStyle = T.dark ? 'rgba(0,0,0,.85)' : '#fff';
        if (p.big) { ctx.fillStyle = rgba(T.rgb.text, T.dark ? 0.6 : 0.9); ctx.strokeText(p.text, p.size * 0.07, p.size * 0.08); ctx.fillText(p.text, p.size * 0.07, p.size * 0.08); }
        ctx.strokeText(p.text, 0, 0);
        ctx.fillStyle = color; ctx.fillText(p.text, 0, 0);
        ctx.restore();
      }
    }

    // ---------- Input ----------
    function targetAt(x, y) {
      for (const p of powers) if (Math.hypot(p.x - x, p.y - y) < p.r + 14) return {p};
      for (let i = cards.length - 1; i >= 0; i--) {
        const c = cards[i], pad = 10;
        if (x >= c.x - pad && x <= c.x + c.w + pad && y >= c.y - pad && y <= c.y + c.h + pad) return {c};
      }
      return null;
    }
    canvas.addEventListener('pointerdown', e => {
      if (state !== 'playing') return;
      e.preventDefault();
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const hit = targetAt(x, y);
      if (hit?.p) hitPower(hit.p);
      else if (hit?.c) hitCard(hit.c, x, y);
      else {
        for (let i = 0; i < 6; i++) addPart({type: 'circ', x, y, vx: rand(-90, 90), vy: rand(-90, 40), g: 300, life: 0.3, max: 0.3, size: 5, color: T.muted, drag: 0.95});
        SFX.whiff();
      }
    });
    canvas.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      canvas.style.cursor = state === 'playing' && targetAt(e.clientX - r.left, e.clientY - r.top) ? 'pointer' : 'crosshair';
    });

    let swallowSpaceUp = false;
    function onKey(e) {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === 'Tab') { // focus trap
        e.preventDefault(); e.stopPropagation();
        const f = [...overlay.querySelectorAll('button, [tabindex="0"]')].filter(n => !n.disabled && n.getClientRects().length);
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        const n = i === -1 ? (e.shiftKey ? f.length - 1 : 0) : (i + (e.shiftKey ? -1 : 1) + f.length) % f.length;
        f[n].focus({preventScroll: true});
        return;
      }
      const isSpace = e.key === ' ' || e.code === 'Space';
      if ((isSpace || e.key === 'p' || e.key === 'P') && (state === 'playing' || state === 'paused')) {
        e.preventDefault(); e.stopPropagation();
        if (!e.repeat) togglePause();
        swallowSpaceUp = isSpace;
        return;
      }
      if (e.key === 'Enter' && state === 'over' && !document.activeElement?.matches('button')) { e.preventDefault(); newGame(); }
    }
    function onKeyUp(e) { if (isOpen && swallowSpaceUp && (e.key === ' ' || e.code === 'Space')) { e.preventDefault(); e.stopPropagation(); swallowSpaceUp = false; } }
    function onFocusIn(e) { if (isOpen && !overlay.contains(e.target)) (cardWrap.querySelector('button') || canvas).focus({preventScroll: true}); }
    function onVisibility() { if (document.hidden && state === 'playing') togglePause(true); }
    const onResize = () => isOpen && resize();

    function openOverlay(from) {
      if (isOpen) return;
      isOpen = true; opener = from || document.activeElement;
      overlay.hidden = false;
      prevOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('keyup', onKeyUp, true);
      document.addEventListener('focusin', onFocusIn);
      document.addEventListener('visibilitychange', onVisibility);
      addEventListener('resize', onResize);
      T = readTheme(overlay);
      resize();
      newGame();
      last = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      cancelAnimationFrame(raf);
      clearTimeout(goTimer);
      setState('idle');
      overlay.hidden = true;
      overlay.dataset.nmGameTargets = '[]';
      cardWrap.hidden = true; cardWrap.replaceChildren();
      document.documentElement.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('keyup', onKeyUp, true);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('visibilitychange', onVisibility);
      removeEventListener('resize', onResize);
      if (actx?.state === 'running') actx.suspend();
      if (opener?.isConnected) opener.focus({preventScroll: true});
    }

    // Re-read the tokens if the theme changes while the game is open.
    NM.watch('theme', () => setTimeout(() => {
      if (!isOpen) return;
      T = readTheme(overlay); rgbCache.clear();
      for (const c of cards) { c.color = pick(T.confetti); c.sprite = makeSprite(c); }
    }, 60));

    return {open: openOverlay, close, syncHud, playing: () => state === 'playing' || state === 'dying'};
  }
})();
