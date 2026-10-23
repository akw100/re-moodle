// Mirrors every HUJI asset the live fixtures reference (theme CSS, images, fonts) into fixtures/vendor/,
// so tests/harness.mjs can render fixtures/live/*.html with HUJI's real styling, offline and deterministically.
// Needs network once: `npm run vendor`. The mirror is gitignored (it's HUJI's files).
import {readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {ROOT, vendorKey} from './harness.mjs';

const HOSTS = {'/2026-27/': 'https://moodle.huji.ac.il', '/simplesaml/': 'https://idp.cc.huji.ac.il'};
const OUT = join(ROOT, 'fixtures/vendor');
const indexPath = join(OUT, 'index.json');
const index = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : {};


const absolute = (ref, base) => {
  if (!ref || /^(data:|#|javascript:|about:)/.test(ref)) return null;
  if (ref.startsWith('/')) { const pre = Object.keys(HOSTS).find(p => ref.startsWith(p)); return pre ? HOSTS[pre] + ref : null; }
  try { const u = new URL(ref, base); return /moodle\.huji\.ac\.il|idp\.cc\.huji\.ac\.il/.test(u.host) ? u.href : null; } catch { return null; }
};

const queue = new Set();
for (const f of readdirSync(join(ROOT, 'fixtures/live')).filter(f => f.endsWith('.html'))) {
  const html = readFileSync(join(ROOT, 'fixtures/live', f), 'utf8');
  const base = f.startsWith('login') ? 'https://idp.cc.huji.ac.il/' : 'https://moodle.huji.ac.il/2026-27/my/';
  for (const m of html.matchAll(/<(?:link[^>]+rel=["']?stylesheet[^>]*href|img[^>]+src)=["']([^"']+)["']/gi)) { const u = absolute(m[1].replace(/&amp;/g, '&'), base); if (u) queue.add(u); }
  for (const m of html.matchAll(/url\(["']?([^"')]+)["']?\)/g)) { const u = absolute(m[1], base); if (u) queue.add(u); }
}

const done = new Set();
while (queue.size) {
  const url = queue.values().next().value; queue.delete(url);
  if (done.has(url)) continue; done.add(url);
  const key = vendorKey(url);
  if (index[key] && existsSync(join(OUT, key))) continue;
  try {
    const res = await fetch(url, {redirect: 'follow'});
    if (!res.ok || /login|simplesaml\/saml2/.test(res.url) && !url.includes('simplesaml')) { console.warn('skip', res.status, url.slice(0, 100)); continue; }
    const type = res.headers.get('content-type') || 'application/octet-stream';
    const buf = Buffer.from(await res.arrayBuffer());
    mkdirSync(dirname(join(OUT, key)), {recursive: true});
    writeFileSync(join(OUT, key), buf);
    index[key] = type;
    if (type.includes('css')) for (const m of buf.toString('utf8').matchAll(/url\(["']?([^"')]+)["']?\)/g)) { const u = absolute(m[1], res.url); if (u && !done.has(u)) queue.add(u); }
    console.log('ok', (buf.length / 1024).toFixed(0) + 'KB', url.slice(0, 100));
  } catch (e) { console.warn('fail', url.slice(0, 100), e.message); }
}
writeFileSync(indexPath, JSON.stringify(index, null, 1));
console.log(Object.keys(index).length, 'assets mirrored');
