// Smooth scroll with offset for fixed header
(function() {
  'use strict';

  // Offset for fixed header (adjust based on your header height)
  const HEADER_OFFSET = 80;

  function smoothScrollTo(target, offset = HEADER_OFFSET) {
    const element = document.querySelector(target);
    if (!element) return;

    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }

  // Handle all anchor links
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const href = link.getAttribute('href');
    
    // Skip if it's just "#" or "#top"
    if (href === '#' || href === '#top') {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      return;
    }

    // Check if target element exists
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      smoothScrollTo(href, HEADER_OFFSET);
      
      // Update URL without jumping
      if (history.pushState) {
        history.pushState(null, null, href);
      }
    }
  });

  // Handle initial hash on page load
  if (window.location.hash) {
    window.addEventListener('load', function() {
      setTimeout(function() {
        smoothScrollTo(window.location.hash, HEADER_OFFSET);
      }, 100);
    });
  }
})();
