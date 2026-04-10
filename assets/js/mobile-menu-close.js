// Fecha o painel #mobile-menu ao tocar em link ou botão (uso em telas pequenas).
(function () {
  'use strict';

  function closeMobileMenu() {
    const el = document.getElementById('mobile-menu');
    if (el) el.classList.add('hidden');
  }

  function init() {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;

    menu.addEventListener('click', function (e) {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const interactive = target.closest('a, button');
      if (!interactive || !menu.contains(interactive)) return;
      closeMobileMenu();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
