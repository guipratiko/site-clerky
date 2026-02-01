// Theme toggle (dark / light) for OnlyFlow website
(function () {
  'use strict';

  const STORAGE_KEY = 'onlyflow_theme';
  const DEFAULT_THEME = 'dark';

  function applyTheme(theme) {
    const t = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
  }

  function getInitialTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    const prefersDark = window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : DEFAULT_THEME;
  }

  function updateToggleLabel(button, theme) {
    if (!button) return;
    const labelEl = button.querySelector('.theme-toggle-label');
    if (!labelEl) return;
    // Mantemos os textos em português, já que o site original é PT-BR
    labelEl.textContent = theme === 'light' ? 'Tema escuro' : 'Tema claro';
  }

  function init() {
    const current = getInitialTheme();
    applyTheme(current);

    const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
    toggleButtons.forEach((btn) => {
      updateToggleLabel(btn, current);
      btn.addEventListener('click', () => {
        const next = (document.documentElement.getAttribute('data-theme') === 'light')
          ? 'dark'
          : 'light';
        applyTheme(next);
        localStorage.setItem(STORAGE_KEY, next);
        updateToggleLabel(btn, next);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.OnlyFlowTheme = {
    getTheme: () => document.documentElement.getAttribute('data-theme') || DEFAULT_THEME,
    setTheme: (t) => {
      applyTheme(t);
      localStorage.setItem(STORAGE_KEY, t);
    },
  };
})();

