// document_start: set the theme attribute before first paint. localStorage is a sync cache of chrome.storage.
(() => {
  const html = document.documentElement;
  if (location.host.startsWith('idp.')) html.dataset.nmSite = 'login'; // HUJI's login page: CSS-only reskin, no scripts touch the form
  // Chrome ignores @import inside content-script CSS, so theme fonts load through a <link>.
  const G = 'https://fonts.googleapis.com/css2?display=swap&family=';
  const FONTS = {
    'quiet-focus': G + 'Inter:wght@400;500;600;700&family=Noto+Sans+Hebrew:wght@400;500;600;700',
    'night-operator': G + 'Inter:wght@400;500;600;700&family=Noto+Sans+Hebrew:wght@400;500;600;700',
    'daily-quest': G + 'Nunito:wght@500;600;700;800;900&family=Varela+Round',
  };
  const apply = t => {
    if (t && t !== 'off') html.dataset.nmTheme = t; else delete html.dataset.nmTheme;
    document.getElementById('nm-fonts')?.remove();
    if (FONTS[t]) html.append(Object.assign(document.createElement('link'), {id: 'nm-fonts', rel: 'stylesheet', href: FONTS[t]}));
    try { localStorage.setItem('nm-theme', t || 'off'); } catch {}
  };
  try { apply(localStorage.getItem('nm-theme')); } catch {}
  chrome.storage.sync.get({theme: 'off', motion: 'on'}).then(s => {
    apply(s.theme);
    html.dataset.nmMotion = s.motion;
  });
  chrome.storage.onChanged.addListener(ch => {
    if (ch.theme) apply(ch.theme.newValue);
    if (ch.motion) html.dataset.nmMotion = ch.motion.newValue;
  });
})();
