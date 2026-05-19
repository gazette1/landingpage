// menu.js — mobile menu toggle.
// Injects a "MENU" text button (no icon, per brand) that opens a full-screen nav overlay
// on viewports under 768px. Runs on every page that loads this script.

(function () {
  const wordmark = document.querySelector('.wordmark.site-wordmark');
  const nav = document.querySelector('.site-nav');
  if (!wordmark || !nav) return;

  // Build the toggle button
  const toggle = document.createElement('button');
  toggle.className = 'menu-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Toggle navigation menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'site-nav');
  toggle.textContent = 'MENU';
  document.body.appendChild(toggle);

  // Make the nav addressable by aria-controls
  if (!nav.id) nav.id = 'site-nav';

  const closeMenu = () => {
    document.body.classList.remove('menu-open');
    toggle.textContent = 'MENU';
    toggle.setAttribute('aria-expanded', 'false');
  };

  const openMenu = () => {
    document.body.classList.add('menu-open');
    toggle.textContent = 'CLOSE';
    toggle.setAttribute('aria-expanded', 'true');
  };

  toggle.addEventListener('click', () => {
    if (document.body.classList.contains('menu-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close menu when a nav link is clicked (so single-page anchors and cross-page links both work cleanly)
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
      closeMenu();
    }
  });

  // Close menu if the viewport grows past the mobile breakpoint
  const mq = window.matchMedia('(min-width: 769px)');
  const handleMq = (event) => {
    if (event.matches) closeMenu();
  };
  if (mq.addEventListener) mq.addEventListener('change', handleMq);
  else if (mq.addListener) mq.addListener(handleMq);
})();
