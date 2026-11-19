/* Prezidox theme toggle — shared across pages.
   The pre-paint inline snippet in each page's <head> sets data-theme before
   CSS loads (no flash). This file wires the toggle button(s) and persists the
   choice. Pages opt in by: (1) the inline snippet, (2) a .theme-toggle button,
   (3) dark-mode CSS, (4) loading this script. */
(function () {
  'use strict';
  var KEY = 'pzTheme';

  function current() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  var SUN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path stroke-linecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
  var MOON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>';

  function sync() {
    var dark = current() === 'dark';
    var btns = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      b.innerHTML = dark ? SUN : MOON;
      b.setAttribute('aria-pressed', dark ? 'true' : 'false');
      b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      b.setAttribute('title', dark ? 'Light mode' : 'Dark mode');
    }
  }

  function toggle() {
    var next = current() === 'dark' ? 'light' : 'dark';
    if (next === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem(KEY, next); } catch (e) {}
    sync();
  }

  window.pzToggleTheme = toggle;

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('.theme-toggle') : null;
    if (t) { e.preventDefault(); toggle(); }
  });

  // Follow the OS if the user has not made an explicit choice this session.
  try {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function (ev) {
      var stored = null;
      try { stored = localStorage.getItem(KEY); } catch (e) {}
      if (stored) return; // explicit choice wins
      if (ev.matches) document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
      sync();
    });
  } catch (e) {}

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync);
  else sync();
})();
