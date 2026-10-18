(function () {
  if (window.__shThemeReady) return;   // dobara load hone par rok do
  window.__shThemeReady = true;

  var root = document.documentElement;

  function setTheme(t) {
    root.dataset.theme = t;
    try {
      localStorage.setItem('theme', t);
      localStorage.setItem('sh_theme', JSON.stringify(t));
    } catch (e) {}
  }

  function addFloatingButton() {
    if (document.getElementById('theme-toggle')) return;
    var b = document.createElement('button');
    b.id = 'theme-toggle';
    b.className = 'ib t theme-floating';
    b.setAttribute('aria-label', 'Toggle dark mode');
    b.textContent = '◐';
    document.body.appendChild(b);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addFloatingButton);
  } else {
    addFloatingButton();
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#theme-toggle')) return;
    setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
  });
})();