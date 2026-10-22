// Confetti on every submit.
//   NM.confetti({x, y, power: 'big'|'small', reason, toast}) -> Promise (resolves when the burst is over)
//   NM.toast(text, {duration}) -> the toast element
// Both are defined at top level because other features (todo, upcoming) call them. Submit detection is a feature.
(() => {
  const html = document.documentElement;
  const TAU = Math.PI * 2, DEG = Math.PI / 180, FRAME = 1000 / 60;
  const MAX_PARTICLES = 450; // hard cap so stacked bursts stay at 60fps
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.random() * a.length | 0];
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ---------- colors ----------
  // Used only while a theme hasn't defined its own --nm-confetti (i.e. base.css's default is still showing).
  const BASE_DEFAULT = '#0f6cbf,#f0ad4e,#357a32,#ca3120,#8e44ad';
  const FALLBACK = {
    'quiet-focus': ['#dc4c3e', '#246fe0', '#058527', '#eb8909', '#b8255f'],
    'night-operator': ['#7772d8', '#9d98ff', '#c6c3ff', '#5e6ad2', '#ffffff'],
    'daily-quest': ['#58cc02', '#1cb0f6', '#ffc800', '#ff4b4b', '#ce82ff', '#ff9600'],
    'campus-pop': ['#ff90e8', '#ffc900', '#23a094', '#90a8ed', '#f1333f', '#ffffff'],
  };
  const probe = document.createElement('canvas').getContext('2d');
  const rgb = c => {
    probe.fillStyle = '#000'; probe.fillStyle = c; // the browser parses any CSS color; invalid stays black
    const s = probe.fillStyle;
    return s[0] === '#' ? [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)) : s.match(/[\d.]+/g).slice(0, 3).map(Number);
  };
  const shade = (c, f) => `rgb(${rgb(c).map(v => Math.round(v * f)).join(',')})`;
  const hsl = c => {
    const [r, g, b] = rgb(c).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [0, 0, l];
    const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, d / (1 - Math.abs(2 * l - 1)), l];
  };
  const luma = c => { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

  function palette(theme) {
    const raw = getComputedStyle(html).getPropertyValue('--nm-confetti').trim();
    const list = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (FALLBACK[theme] && (!list.length || raw.replace(/\s+/g, '').toLowerCase() === BASE_DEFAULT)) return FALLBACK[theme];
    return list.length ? list : BASE_DEFAULT.split(',');
  }

  function pageIsLight() {
    for (const el of [document.body, html]) {
      const bg = el && getComputedStyle(el).backgroundColor;
      if (bg && !/rgba\(.*,\s*0\)$|transparent/.test(bg)) return luma(bg) > 0.5;
    }
    return true;
  }

  // ---------- theme personalities ----------
  // kinds = weighted particle mix. count/size/speed/gravity/ttl are multipliers on the defaults.
  const STYLES = {
    off: {count: 1, size: 1, speed: 1, gravity: 1, ttl: 1, kinds: {paper: 6, circle: 2, square: 2}},
    'quiet-focus': {count: .45, size: .62, speed: .8, gravity: .65, ttl: .85, alpha: .92, kinds: {paper: 7, circle: 3}, gentle: true},
    'daily-quest': {count: 1, size: 1.15, speed: 1, gravity: 1, ttl: 1, kinds: {paper: 4, circle: 3, emoji: 2.2}, round: true,
      emoji: ['🎉', '⭐', '🔥', '💚']},
    'campus-pop': {count: .9, size: 1.5, speed: 1.05, gravity: 1.1, ttl: 1, kinds: {square: 5, star: 4, paper: 1}, outline: '#000',
      stickers: true},
    'night-operator': {count: .85, size: 1, speed: 1.1, gravity: .7, ttl: .95, kinds: {streamer: 7, spark: 3}, glow: true},
  };
  const weighted = kinds => {
    let r = Math.random() * Object.values(kinds).reduce((a, b) => a + b, 0);
    for (const [k, w] of Object.entries(kinds)) if ((r -= w) <= 0) return k;
    return 'paper';
  };

  // Emoji are pre-rendered once to sprites (fillText of color emoji every frame is slow).
  const sprites = new Map();
  const sprite = ch => {
    if (!sprites.has(ch)) {
      const c = document.createElement('canvas'); c.width = c.height = 80;
      const x = c.getContext('2d');
      x.font = '60px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 40, 44);
      sprites.set(ch, c);
    }
    return sprites.get(ch);
  };
  const STAR = new Path2D();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? .46 : 1, a = -Math.PI / 2 + i * Math.PI / 5;
    i ? STAR.lineTo(Math.cos(a) * r, Math.sin(a) * r) : STAR.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  STAR.closePath();

  // ---------- engine: one canvas, one rAF loop, shared by every burst ----------
  let cv = null, ctx = null, W = 0, H = 0, dpr = 1, light = true, raf = 0, last = 0, clock = 0;
  let parts = [], queue = [], waiters = [];
  const scale = () => Math.min(1.3, Math.max(.65, H / 900));

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }
  function ensureCanvas() {
    if (cv) return;
    cv = document.createElement('canvas');
    cv.className = 'nm-confetti';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647;' +
      'display:block;margin:0;padding:0;border:0;background:transparent';
    (document.body || html).append(cv);
    ctx = cv.getContext('2d');
    light = pageIsLight();
    resize();
    addEventListener('resize', resize);
  }
  function finish() {
    removeEventListener('resize', resize);
    cv?.remove(); cv = ctx = null; raf = 0; clock = 0; parts = []; queue = [];
    waiters.splice(0).forEach(r => r());
  }
  const add = p => { if (parts.length >= MAX_PARTICLES) parts.shift(); parts.push(p); };
  const later = (ms, fn) => queue.push({at: clock + ms, fn});

  function frame(now) {
    if (!cv) return;
    const dt = Math.min((now - last) / FRAME, 3); last = now; clock += dt * FRAME;
    for (let i = 0; i < queue.length; i++) if (queue[i].at <= clock) queue.splice(i--, 1)[0].fn();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    let n = 0; const top = [];
    for (const p of parts) {
      if (!step(p, dt)) continue;
      parts[n++] = p;
      p.kind === 'sticker' ? top.push(p) : draw(p);
    }
    parts.length = n;
    top.forEach(draw); // stickers always sit above the paper
    if ((parts.length || queue.length) && clock < 16000) raf = requestAnimationFrame(frame); else finish();
  }

  function step(p, dt) {
    p.age += dt * FRAME;
    if (p.kind === 'sticker') {
      if (p.age > p.hold) { p.vy += .6 * scale() * dt; p.y += p.vy * dt; p.x += p.vx * dt; p.rot += p.vr * dt; }
      return p.age < p.hold + 1400 && p.y < H + 250;
    }
    const d = Math.pow(p.drag, dt);
    p.vx *= d;
    p.vy = p.vy * d + p.g * dt;
    if (p.vy > p.term) p.vy += (p.term - p.vy) * Math.min(1, .12 * dt); // paper flutters down at its own terminal speed
    p.wob += p.wobS * dt; p.rot += p.vr * dt; p.flip += p.flipS * dt;
    p.x += (p.vx + Math.sin(p.wob) * p.wobA) * dt;
    p.y += p.vy * dt;
    if (p.trail) { p.trail.push(p.x, p.y); if (p.trail.length > p.trailLen * 2) p.trail.splice(0, 2); }
    return p.age < p.ttl && p.y < H + 80 && p.x > -250 && p.x < W + 250;
  }

  const easeOutBack = t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);

  function draw(p) {
    if (p.kind === 'sticker') {
      const pop = p.age < 340 ? easeOutBack(p.age / 340) : 1;
      const k = dpr * pop, c = Math.cos(p.rot) * k, s = Math.sin(p.rot) * k;
      ctx.setTransform(c, s, -s, c, dpr * p.x, dpr * p.y);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.max(0, Math.min(1, (p.hold + 1400 - p.age) / 400));
      ctx.drawImage(p.img, -p.w / 2, -p.h / 2, p.w, p.h);
      return;
    }
    const a = Math.max(0, Math.min(1, (p.ttl - p.age) / 700)) * p.alpha;
    if (a <= 0) return;
    ctx.globalAlpha = a;
    ctx.globalCompositeOperation = p.glow && !light ? 'lighter' : 'source-over';
    if (p.kind === 'streamer') {
      const t = p.trail; if (t.length < 6) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.beginPath(); ctx.moveTo(t[0], t[1]);
      for (let i = 2; i < t.length; i += 2) ctx.lineTo(t[i], t[i + 1]);
      ctx.strokeStyle = p.color; ctx.lineCap = ctx.lineJoin = 'round';
      ctx.globalAlpha = a * .2; ctx.lineWidth = p.width * 5; ctx.stroke(); // soft halo = the glow
      ctx.globalAlpha = a; ctx.lineWidth = p.width; ctx.stroke();
      return;
    }
    const sy = p.kind === 'emoji' ? 1 : Math.cos(p.flip); // 3D tumble: squash along the flip axis
    const k = dpr * p.size, c = Math.cos(p.rot), s = Math.sin(p.rot);
    ctx.setTransform(k * c, k * s, -k * s * sy, k * c * sy, dpr * p.x, dpr * p.y);
    ctx.fillStyle = sy < 0 ? p.dark : p.color; // the back of the paper is a shade darker
    switch (p.kind) {
      case 'paper':
        if (p.round) { ctx.beginPath(); ctx.roundRect(-1, -p.ar, 2, 2 * p.ar, p.ar); ctx.fill(); }
        else ctx.fillRect(-1, -p.ar, 2, 2 * p.ar);
        break;
      case 'square':
        ctx.fillRect(-1, -1, 2, 2);
        if (p.outline) { ctx.lineWidth = 2.2 / p.size; ctx.strokeStyle = p.outline; ctx.strokeRect(-1, -1, 2, 2); }
        break;
      case 'spark':
        ctx.globalAlpha = a * (.4 + .6 * Math.abs(Math.sin(p.age * .012 + p.wob))); // twinkle
        // falls through
      case 'circle':
        ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
        break;
      case 'star':
        ctx.fill(STAR);
        if (p.outline) { ctx.lineWidth = 2.2 / p.size; ctx.lineJoin = 'round'; ctx.strokeStyle = p.outline; ctx.stroke(STAR); }
        break;
      case 'emoji':
        ctx.drawImage(p.img, -1, -1, 2, 2);
        break;
    }
  }

  // ---------- particles ----------
  function look() {
    const theme = NM.theme();
    const st = STYLES[theme] || STYLES.off;
    let colors = palette(theme);
    if (st.glow) {
      // Night Operator is violet + white only: keep the theme's violets/blues and near-whites, drop its status colors.
      const vw = colors.filter(c => { const [h, sat, l] = hsl(c); return (h >= 215 && h <= 290 && sat > .2) || (sat < .2 && l > .85); });
      colors = vw.length >= 2 ? vw : FALLBACK['night-operator'];
      if (!colors.some(c => luma(c) > .9)) colors = [...colors, '#ffffff', '#ffffff'];
      if (light) colors = colors.map(c => luma(c) > .85 ? '#4b45a8' : c); // white would vanish on a light page
    }
    return {st, cols: colors.map(c => ({c, d: shade(c, .8)}))};
  }

  function particle({st, cols}, x, y, angle, speed) {
    const s = scale(), kind = weighted(st.kinds), col = pick(cols);
    const p = {
      kind, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color: col.c, dark: col.d,
      rot: rand(0, TAU), vr: rand(-.18, .18), flip: rand(0, TAU), flipS: rand(.07, .2),
      wob: rand(0, TAU), wobS: rand(.04, .11), wobA: rand(.3, 1.3) * s,
      g: .3 * s * st.gravity, term: rand(2, 3.6) * s * Math.sqrt(st.gravity), drag: rand(.935, .965), age: 0,
      ttl: rand(4200, 6000) * st.ttl, alpha: st.alpha || 1,
      outline: st.outline, round: st.round, glow: false, size: 1, ar: .5,
    };
    const z = st.size * s;
    switch (kind) {
      case 'paper': p.size = rand(4, 7.5) * z; p.ar = rand(.32, .62); break;
      case 'circle': p.size = rand(2.4, 4.4) * z; break;
      case 'square': p.size = rand(4.5, 7.5) * z; break;
      case 'star': p.size = rand(7, 11.5) * z; p.vr *= .6; p.flipS *= .5; break;
      case 'emoji': p.img = sprite(pick(st.emoji)); p.size = rand(11, 17) * s; p.vr = rand(-.07, .07); p.flipS = 0; p.term *= 1.25; break;
      case 'streamer':
        p.glow = true; p.trail = []; p.trailLen = rand(9, 20) | 0; p.width = rand(1, 2);
        p.wobA = rand(1.4, 3.6) * s; p.wobS = rand(.07, .15); p.drag = rand(.95, .972); p.ttl = rand(2600, 4200) * st.ttl;
        break;
      case 'spark': p.glow = true; p.size = rand(1.1, 2.4) * s; break;
    }
    return p;
  }

  // Spread an emitter over a few frames so it reads as a stream, not a single blob.
  function emit(n, chunks, delay, make) {
    const per = Math.ceil(n / chunks);
    for (let c = 0; c < chunks && n > 0; c++) {
      const k = Math.min(per, n); n -= k;
      later(delay + c * 16, () => { for (let i = 0; i < k; i++) add(make()); });
    }
  }

  // Big: a cannon from each bottom corner, a center pop (at x,y if given), then a smaller second salvo.
  function big({x, y}) {
    const L = look(), {st} = L, s = scale(), total = Math.round(250 * st.count);
    const cx = x ?? W / 2, cy = y ?? H * .42;
    const cannon = left => () => {
      const a = -rand(46, 76) * DEG;
      return particle(L, left ? -6 : W + 6, H + 6, left ? a : Math.PI - a, rand(20, 42) * s * st.speed);
    };
    const pop = Math.round(total * .2), wave1 = Math.round(total * (st.gentle ? .4 : .32));
    const wave2 = Math.max(0, Math.round((total - 2 * wave1 - pop) / 2));
    emit(wave1, 6, 0, cannon(true));
    emit(wave1, 6, 0, cannon(false));
    emit(pop, 2, 140, () => {
      const p = particle(L, cx, cy, rand(0, TAU), rand(3, 12.5) * s * st.speed);
      p.vy -= 4.5 * s; // pops upward a little, like a party popper
      return p;
    });
    if (wave2) { emit(wave2, 4, 420, cannon(true)); emit(wave2, 4, 420, cannon(false)); }
    if (st.stickers) stickers(s);
  }

  // Small: ~40 pieces fountaining up from (x, y).
  function small({x, y}) {
    const L = look(), s = scale(), n = Math.max(14, Math.round(40 * L.st.count));
    const ox = x ?? W / 2, oy = y ?? H * .5;
    emit(n, 2, 0, () => particle(L, ox, oy, -Math.PI / 2 + rand(-60, 60) * DEG, rand(4.5, 12.5) * s * L.st.speed));
  }

  // Campus Pop: big rotated "SUBMITTED!" sticker stamps with a hard offset shadow (Gumroad style). Pre-rendered once.
  function stickerImage(text, bg, px) {
    const ff = getComputedStyle(html).getPropertyValue('--nm-heading-font').trim().replace(/^inherit$/, '');
    const x0 = document.createElement('canvas').getContext('2d');
    x0.font = `900 ${px}px "Arial Black",Impact,sans-serif`;
    if (ff) x0.font = `900 ${px}px ${ff},"Arial Black",Impact,sans-serif`; // ignored by canvas if the string is invalid
    const tw = x0.measureText(text).width;
    const padX = px * .55, padY = px * .38, sh = Math.max(5, px * .16), bw = Math.max(3, px * .09);
    const w = tw + padX * 2, h = px + padY * 2, r = h * .3;
    const c = document.createElement('canvas');
    c.width = Math.ceil((w + sh + bw * 2) * dpr); c.height = Math.ceil((h + sh + bw * 2) * dpr);
    const x = c.getContext('2d');
    x.scale(dpr, dpr); x.translate(bw, bw);
    x.fillStyle = '#000'; x.beginPath(); x.roundRect(sh, sh, w, h, r); x.fill(); // hard offset shadow
    x.fillStyle = bg; x.beginPath(); x.roundRect(0, 0, w, h, r); x.fill();
    x.lineWidth = bw; x.strokeStyle = '#000'; x.stroke();
    x.font = x0.font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#000';
    x.fillText(text, w / 2, h / 2 + px * .05);
    return {img: c, w: c.width / dpr, h: c.height / dpr};
  }
  function stickers(s) {
    const spots = [
      {fx: .27, fy: .34, deg: -13, bg: '#ff90e8', px: 44},
      {fx: .73, fy: .26, deg: 9, bg: '#ffc900', px: 38},
      {fx: .52, fy: .6, deg: -5, bg: '#ffffff', px: 52},
    ];
    spots.forEach((o, i) => later(180 + i * 170, () => {
      const im = stickerImage('SUBMITTED!', o.bg, Math.round(o.px * Math.min(1, W / 1100) * s));
      parts.push({kind: 'sticker', ...im, x: W * o.fx + rand(-30, 30), y: H * o.fy + rand(-20, 20),
        rot: (o.deg + rand(-3, 3)) * DEG, vr: rand(-.02, .02), vx: rand(-1.5, 1.5), vy: -rand(2, 5) * s,
        age: 0, hold: 1500 - i * 120});
    }));
  }

  // ---------- public API ----------
  NM.confetti = (opts = {}) => {
    const {power = 'big', x, y} = opts;
    if (!NM.motion()) { NM.toast(opts.toast || (power === 'small' ? 'Done ✓' : 'Submitted ✓')); return Promise.resolve(); }
    ensureCanvas();
    (power === 'small' ? small : big)({x, y, reason: opts.reason});
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    return new Promise(r => waiters.push(r));
  };

  let toastEl = null, toastTimer = 0;
  NM.toast = (text, {duration = 4000} = {}) => {
    toastEl?.remove(); clearTimeout(toastTimer);
    const motion = NM.motion();
    const el = toastEl = document.createElement('div');
    el.className = 'nm-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.textContent = text;
    el.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483647;pointer-events:none;' +
      'max-width:calc(100vw - 32px);box-sizing:border-box;padding:.7rem 1.15rem;font:600 15px/1.35 system-ui,sans-serif;' +
      'font-family:var(--nm-font,system-ui),system-ui,sans-serif;color:var(--nm-text,#1d2125);background:var(--nm-surface,#fff);' +
      'border:var(--nm-border-width,1px) solid var(--nm-border,#dee2e6);border-radius:var(--nm-radius,.5rem);' +
      'box-shadow:0 10px 30px rgba(0,0,0,.18);text-align:center';
    if (motion) {
      el.style.opacity = '0'; el.style.transform = 'translate(-50%,10px)';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition = 'opacity .22s ease, transform .22s ease';
        el.style.opacity = '1'; el.style.transform = 'translate(-50%,0)';
      }));
    }
    document.body.append(el);
    toastTimer = setTimeout(() => {
      if (!motion) return el.remove();
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 250);
    }, duration);
    return el;
  };

  // ---------- submit detection ----------
  // Rule: a click/submit only arms a sessionStorage flag; confetti fires on the NEXT page, and only if that page
  // proves the submit went through (status cell, review page). Fresh form pages clear stale flags.
  const center = el => {
    const r = el?.getBoundingClientRect();
    return r && r.width && r.bottom > 0 && r.top < innerHeight ? {x: r.left + r.width / 2, y: r.top + r.height / 2} : {};
  };
  const isCancel = b => !!b?.matches?.('#id_cancel, [name=cancel], [data-cancel], [data-skip-validation]');

  // Moodle forms: flag when the form really submits. The window bubble listener runs after Moodle's onsubmit
  // validation, so a failed client-side validation shows up as defaultPrevented. Cancel clears the flag.
  function armForm(flag, match = 'form.mform') {
    NM.takeFlag(flag);
    let tried = 0;
    document.addEventListener('submit', e => { if (e.target.matches?.(match) && !isCancel(e.submitter)) tried = Date.now(); }, true);
    addEventListener('submit', e => {
      if (e.target.matches?.(match) && !isCancel(e.submitter) && !e.defaultPrevented) NM.setFlag(flag);
    });
    // Moodle sometimes cancels the event and calls form.submit() itself after an async check: catch that on unload.
    addEventListener('pagehide', () => { if (tried && Date.now() - tried < 10000) NM.setFlag(flag); });
    document.addEventListener('click', e => { if (isCancel(e.target.closest?.('button, input'))) { tried = 0; NM.takeFlag(flag); } }, true);
  }

  // Quiz summary: "Submit all and finish" opens a confirmation modal whose own button submits the form via JS
  // (no submit event), so listen to clicks in the capture phase.
  function armQuiz() {
    NM.takeFlag('quiz-finish');
    const FINISH = /submit all and finish|submit all your answers|הגש(ה|ת)? הכל|סיים ניסיון|סיום ניסיון/i;
    document.addEventListener('click', e => {
      const b = e.target.closest?.('button, input[type=submit], input[type=button], a.btn, [role=button]');
      if (!b) return;
      const form = b.form || b.closest('form');
      const text = (b.value || b.textContent || '').trim();
      const inModal = b.closest('.modal, [role=dialog]');
      if (FINISH.test(text) || b.matches('.btn-finish, [name=finishattempt]') || form?.matches('.btn-finish') ||
          form?.querySelector('[name=finishattempt]') || (inModal && b.matches('[data-action=save]'))) NM.setFlag('quiz-finish');
      else if (inModal && b.matches('[data-action=cancel], [data-action=hide], .btn-close, [data-bs-dismiss], [data-dismiss]')) NM.takeFlag('quiz-finish');
    }, true);
    document.addEventListener('submit', e => { if (e.target.querySelector?.('[name=finishattempt]')) NM.setFlag('quiz-finish'); }, true);
  }

  // Wait until early.js has copied the motion setting onto <html>, and let the new page paint first.
  async function settle() {
    for (let i = 0; i < 40 && html.dataset.nmMotion == null; i++) await sleep(25);
    await sleep(250);
  }

  async function celebrateAssign() {
    const ok = document.querySelector('.submissionstatussubmitted');
    const scope = document.querySelector('.submissionstatustable') || document.querySelector('[role=main]') || document.body;
    const draftEl = document.querySelector('.submissionstatusdraft') ||
      [...scope.querySelectorAll('td')].find(td => /draft \(not submitted\)/i.test(td.textContent));
    if (!ok && !draftEl) return;
    await settle();
    if (ok) return NM.confetti({power: 'big', reason: 'assign-submit', ...center(ok)});
    if (NM.motion()) NM.confetti({power: 'small', reason: 'assign-draft', ...center(draftEl)});
    NM.toast('Draft saved, remember to submit!');
  }

  async function celebrateQuiz() {
    const summary = document.querySelector('table.quizreviewsummary');
    if (summary && /in progress|בתהליך/i.test(summary.textContent) && !/finished|הסתיים|הושלם/i.test(summary.textContent)) return;
    await settle();
    const grade = summary && [...summary.querySelectorAll('tr')].find(tr => /^\s*(grade|ציון)/i.test(tr.textContent))?.querySelector('td');
    NM.confetti({power: 'big', reason: 'quiz-finish', ...center(grade || summary)});
  }

  async function celebrateForum() {
    await settle();
    const target = (location.hash && document.getElementById(location.hash.slice(1))) ||
      document.querySelector('#user-notifications .alert-success, .alert-success');
    NM.confetti({power: 'small', reason: 'forum-post', toast: 'Posted ✓', ...center(target)});
  }

  NM.feature('confetti', () => {
    const q = new URLSearchParams(location.search), action = q.get('action') || '';
    const page = NM.page;
    if (page === 'mod/assign/view.php') {
      if (action === 'editsubmission' || action === 'submit') armForm('assign-submit');
      else if ((!action || action === 'view') && NM.takeFlag('assign-submit')) return celebrateAssign();
    } else if (page === 'mod/quiz/summary.php') {
      armQuiz();
    } else if (page === 'mod/quiz/review.php') {
      if (NM.takeFlag('quiz-finish')) return celebrateQuiz();
    } else if (page === 'mod/forum/post.php') {
      if (!q.has('delete') && !q.has('prune')) armForm('forum-post');
    } else if (page.startsWith('mod/forum/')) {
      if (NM.takeFlag('forum-post')) return celebrateForum();
    }
  });
})();
