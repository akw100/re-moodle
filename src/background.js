// Service worker. Fetches a page's title / og:image / og:description for shortcut chips
// (content scripts can't fetch cross-origin; host permissions let the service worker do it).
//   chrome.runtime.sendMessage({type: 'nm-preview', url}) ->
//     {url, finalUrl, title, ogTitle, siteName, description, image, contentType, favicon} | {error, favicon}
//   favicon: true/false = Google's favicon service has/doesn't have an icon for the host (undefined = unknown)
// No DOMParser in service workers, so this reads at most MAX_BYTES of the response and scans <title>/<meta> tags.
const TIMEOUT_MS = 8000;
const MAX_BYTES = 300 * 1024;

const ENTITIES = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', middot: '·', raquo: '»', laquo: '«', hellip: '…', copy: '©', reg: '®', trade: '™', bull: '•', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“'};
const safeChar = (code, fallback) => { try { return String.fromCodePoint(code); } catch { return fallback; } };
const decode = s => {
  if (!s) return undefined;
  const out = s
    .replace(/&#x([0-9a-f]+);?/gi, (m, h) => safeChar(parseInt(h, 16), m))
    .replace(/&#(\d+);?/g, (m, d) => safeChar(+d, m))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ').trim();
  return out || undefined;
};

// All attributes of one tag, lowercased names, in any order: <meta content="x" property="og:title">.
const attrs = tag => {
  const out = {};
  for (const m of tag.matchAll(/([^\s"'<>\/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4];
  return out;
};

function parseHtml(html, baseUrl) {
  const head = html.split(/<body[\s>]/i)[0] || html; // metadata lives in <head>; ignore <meta> tags inside the body
  const meta = {};
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(tag);
    const key = (a.property || a.name || a.itemprop || '').toLowerCase();
    if (key && a.content != null && !(key in meta)) meta[key] = a.content;
  }
  const pick = (...keys) => keys.map(k => meta[k]).find(Boolean);
  const abs = u => { if (!u) return undefined; try { const x = new URL(decode(u), baseUrl); return /^https?:$/.test(x.protocol) ? x.href : undefined; } catch { return undefined; } };
  const ogTitle = decode(pick('og:title', 'twitter:title'));
  return {
    title: decode(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]) || ogTitle,
    ogTitle,
    siteName: decode(pick('og:site_name', 'application-name', 'apple-mobile-web-app-title')),
    description: decode(pick('og:description', 'description', 'twitter:description'))?.slice(0, 400),
    image: abs(pick('og:image', 'og:image:secure_url', 'og:image:url', 'twitter:image', 'twitter:image:src')),
  };
}

// Reads the body up to MAX_BYTES, then cancels the stream so huge pages don't download fully.
async function readCapped(res) {
  if (!res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const {done, value} = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  reader.cancel().catch(() => {});
  const buf = new Uint8Array(Math.min(size, MAX_BYTES));
  let off = 0;
  for (const c of chunks) {
    const part = c.subarray(0, buf.length - off);
    buf.set(part, off);
    off += part.length;
    if (off >= buf.length) break;
  }
  return buf;
}

// Charset from the header, else from <meta charset> in the first bytes (some Hebrew sites still use windows-1255).
function toText(bytes, contentType) {
  let charset = contentType.match(/charset=["']?([\w-]+)/i)?.[1];
  if (!charset) charset = new TextDecoder('latin1').decode(bytes.subarray(0, 4096)).match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  try { return new TextDecoder(charset || 'utf-8').decode(bytes); }
  catch { return new TextDecoder('utf-8').decode(bytes); }
}

async function preview(rawUrl) {
  let url;
  try { url = new URL(String(rawUrl)); } catch { throw new Error('invalid URL'); }
  if (!/^https?:$/.test(url.protocol)) throw new Error('http(s) only');

  const res = await fetch(url, {
    credentials: 'omit', redirect: 'follow', cache: 'no-cache',
    headers: {Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5'},
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const finalUrl = res.url || url.href;
  if (!res.ok) { res.body?.cancel().catch(() => {}); throw new Error(`HTTP ${res.status}`); }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const base = {url: url.href, finalUrl, contentType: contentType.split(';')[0] || undefined};
  if (contentType && !/html|xml/.test(contentType)) {
    // A PDF, an image, a download: there's no <title>, so name it after the file (and show it, if it's an image).
    res.body?.cancel().catch(() => {});
    let file = '';
    try { file = decodeURIComponent(new URL(finalUrl).pathname.split('/').filter(Boolean).pop() || ''); } catch {}
    return {...base, title: file || undefined, image: contentType.startsWith('image/') ? finalUrl : undefined};
  }
  return {...base, ...parseHtml(toText(await readCapped(res), contentType), finalUrl)};
}

// Google's favicon service answers 404 (with a generic globe image) when a site has no icon. Pages can't see that
// status (no CORS), so report it here and let the chip show a letter avatar instead of the globe.
const faviconOk = host => fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`,
  {credentials: 'omit', signal: AbortSignal.timeout(TIMEOUT_MS)})
  .then(r => { r.body?.cancel().catch(() => {}); return r.ok; }, () => undefined);

const PREVIEW_ORIGINS = ['https://*/*', 'http://*/*'];
async function previewPermission(rawUrl) {
  if (!rawUrl) return chrome.permissions.contains({origins: PREVIEW_ORIGINS});
  const url = new URL(String(rawUrl));
  if (!/^https?:$/.test(url.protocol)) throw new Error('http(s) only');
  return await chrome.permissions.contains({origins: [`${url.origin}/*`]}) ||
    await chrome.permissions.contains({origins: PREVIEW_ORIGINS});
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!['nm-preview', 'nm-preview-permission'].includes(msg?.type) || sender.id !== chrome.runtime.id) return;
  (async () => {
    const allowed = await previewPermission(msg.url);
    if (msg.type === 'nm-preview-permission') return {allowed};
    if (!allowed) return {error: 'no-permission'};
    const host = new URL(msg.url).hostname;
    const [data, favicon] = await Promise.all([
      preview(msg.url).catch(e => ({error: e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'timed out' : String(e?.message || e)})),
      // A site-specific grant need not include Google's favicon service.
      chrome.permissions.contains({origins: ['https://www.google.com/*']}).then(ok => ok ? faviconOk(host) : undefined),
    ]);
    return {...data, favicon};
  })().then(reply, e => reply({error: String(e?.message || e)}));
  return true; // async reply
});

const permissionsChanged = async () => {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map(tab => chrome.tabs.sendMessage(tab.id, {type: 'nm-preview-permissions-changed'}).catch(() => {})));
};
chrome.permissions.onAdded.addListener(permissionsChanged);
chrome.permissions.onRemoved.addListener(permissionsChanged);
