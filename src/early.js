// document_start: set the theme attribute before first paint. localStorage is a sync cache of chrome.storage.
(() => {
  const html = document.documentElement;
  const apply = t => {
    if (t && t !== 'off') html.dataset.nmTheme = t; else delete html.dataset.nmTheme;
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
