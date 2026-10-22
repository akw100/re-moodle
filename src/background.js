// Fetches a page's title / og:image / og:description for shortcut chips (content scripts can't fetch cross-origin).
// ponytail: regex over the first 200KB of HTML, no DOMParser in service workers. Good enough for <title>/<meta>.
const meta = (html, name) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  return tag?.match(/content=["']([^"']*)["']/i)?.[1];
};
const decode = s => s && s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type !== 'nm-preview') return;
  (async () => {
    const url = new URL(msg.url);
    if (!/^https?:$/.test(url.protocol)) throw new Error('http(s) only');
    const res = await fetch(url, {credentials: 'omit', redirect: 'follow', signal: AbortSignal.timeout(8000)});
    const html = (await res.text()).slice(0, 200000);
    const image = meta(html, 'og:image');
    return {
      title: decode(meta(html, 'og:title') || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]),
      description: decode(meta(html, 'og:description') || meta(html, 'description')),
      image: image && new URL(decode(image), res.url).href,
      siteName: decode(meta(html, 'og:site_name')),
    };
  })().then(reply, e => reply({error: String(e.message || e)}));
  return true; // async reply
});
