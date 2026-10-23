(() => {
  const root = document.documentElement;
  const key = 'romana_theme';
  let theme = 'dark';
  try {
    const saved = localStorage.getItem(key);
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch {}
  function apply(next, persist = false) {
    root.dataset.theme = next;
    root.style.colorScheme = next;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = next === 'dark' ? '#0a0a0a' : '#ffffff';
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.setAttribute('aria-label', `Comută la tema ${next === 'dark' ? 'deschisă' : 'întunecată'}`);
      button.title = `${button.getAttribute('aria-label')} (D)`;
    });
    if (persist) {
      try {
        localStorage.setItem(key, next);
      } catch {}
    }
  }
  const toggle = () => apply(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
  apply(theme);
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => button.addEventListener('click', toggle));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 'd' || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    toggle();
  });
})();
