(() => {
  const root = document.documentElement;
  const key = 'romana_theme';
  let theme = 'dark';
  try {
    const s = localStorage.getItem(key);
    if (s === 'light' || s === 'dark') theme = s;
  } catch {}
  function apply(next, persist) {
    root.dataset.theme = next;
    root.style.colorScheme = next;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = next === 'dark' ? '#0a0a0a' : '#ffffff';
    document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
      b.setAttribute('aria-label', next === 'dark' ? 'Temă deschisă' : 'Temă întunecată');
    });
    if (persist) {
      try { localStorage.setItem(key, next); } catch {}
    }
  }
  const toggle = () => apply(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
  apply(theme);
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    document.querySelectorAll('[data-theme-toggle]').forEach((b) => b.addEventListener('click', toggle));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'd' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]')) return;
    toggle();
  });
})();
