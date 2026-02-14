// Language switcher for OnlyFlow website
(function() {
  'use strict';

  const STORAGE_KEY = 'onlyflow_language';
  const DEFAULT_LANG = 'pt';
  let currentLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;

  // Translations object - will be loaded from translations.json
  let translations = {};

  // Load translations
  async function loadTranslations() {
    try {
      const response = await fetch('/assets/translations/translations.json');
      translations = await response.json();
      applyLanguage(currentLang);
    } catch (error) {
      console.error('Error loading translations:', error);
    }
  }

  // Get translation by key path (e.g., 'nav.about')
  function t(key, lang = currentLang) {
    const keys = key.split('.');
    let value = translations[lang];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  }

  // Apply language to page
  function applyLanguage(lang) {
    if (!translations[lang]) return;

    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = t(key, lang);
      if (text) {
        if (el.tagName === 'INPUT' && el.type === 'submit') {
          el.value = text;
        } else if (el.hasAttribute('placeholder')) {
          el.placeholder = text;
        } else if (text.indexOf('<') !== -1) {
          el.innerHTML = text;
        } else {
          el.textContent = text;
        }
      }
    });

    // Update title
    const pageType = document.body.getAttribute('data-page') || 'home';
    const titleKey = `site.${pageType}Title`;
    const title = t(titleKey, lang);
    if (title && title !== titleKey) {
      document.title = title;
    }

    // Update language switcher button
    const switcher = document.getElementById('lang-switcher');
    if (switcher) {
      const nextLang = lang === 'pt' ? 'en' : 'pt';
      switcher.setAttribute('data-lang', nextLang);
      const switchText = switcher.querySelector('.lang-switch-text');
      if (switchText) {
        switchText.textContent = t(`lang.switchTo`, lang);
      }
    }
  }

  // Toggle language
  function toggleLanguage() {
    const newLang = currentLang === 'pt' ? 'en' : 'pt';
    applyLanguage(newLang);
  }

  // Create language switcher button
  function createLanguageSwitcher() {
    const switcher = document.createElement('button');
    switcher.id = 'lang-switcher';
    switcher.className = 'lang-switcher';
    switcher.setAttribute('aria-label', 'Switch language');
    switcher.setAttribute('data-lang', currentLang === 'pt' ? 'en' : 'pt');
    
    switcher.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
      <span class="lang-switch-text">${currentLang === 'pt' ? 'EN' : 'PT'}</span>
    `;
    
    switcher.addEventListener('click', toggleLanguage);
    var container = document.getElementById('lang-switcher-container');
    if (container) {
      container.appendChild(switcher);
    } else {
      document.body.appendChild(switcher);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createLanguageSwitcher();
      loadTranslations();
    });
  } else {
    createLanguageSwitcher();
    loadTranslations();
  }

  // Export for external use
  window.OnlyFlowLanguage = {
    setLanguage: applyLanguage,
    getLanguage: () => currentLang,
    t: t
  };
})();
