/* ============================================================
   theme.js — light/dark toggle, shared by every page
   Load on all pages:  <script src="theme.js" defer></script>
   Pair with the inline <head> snippet that sets data-theme
   before first paint (see index.html).

   Dark is the site default. Because of that there is no
   system-preference listener here: following the OS would
   fight the default and flip visitors to light.
   ============================================================ */

(() => {
  'use strict';

  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');

  function current() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function set(theme) {
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      /* private browsing or storage disabled — the toggle still works
         for this page view, it just won't be remembered */
    }
  }

  if (btn) {
    btn.addEventListener('click', () => {
      set(current() === 'dark' ? 'light' : 'dark');
    });
  }
})();