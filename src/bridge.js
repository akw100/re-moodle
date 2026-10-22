// Runs in the page's MAIN world: copies Moodle's globals where the isolated content scripts can read them.
if (window.M && M.cfg) {
  const d = document.documentElement.dataset;
  d.nmWwwroot = M.cfg.wwwroot;
  d.nmSesskey = M.cfg.sesskey;
}
