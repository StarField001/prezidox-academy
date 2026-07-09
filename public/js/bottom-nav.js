/*
 * Prezidox Academy — shared mobile bottom navigation.
 * Include on any student page: <script src="/js/bottom-nav.js"></script>
 * Renders a fixed, mobile-only (<=960px, i.e. when the sidebar is hidden)
 * bottom nav with SVG icons, navy background, gold active state, and 44px+
 * touch targets. Marks the active tab from the current page.
 */
(function () {
  if (window.__pxBottomNav) return;
  window.__pxBottomNav = true;

  var ITEMS = [
    { page: 'dashboard.html',    label: 'Home',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"/>' },
    { page: 'study-modes.html',  label: 'Modes',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/>' },
    { page: 'study-hall.html',   label: 'Hall',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"/>' },
    { page: 'performance.html',  label: 'Progress',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"/>' },
    { page: 'profile.html',      label: 'Profile',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>' }
  ];

  // Which nav tab should be highlighted for the current page.
  var ACTIVE_FOR = {
    'dashboard.html': 'dashboard.html',
    'performance.html': 'performance.html',
    'leaderboard.html': 'study-hall.html',
    'notifications.html': 'profile.html',
    'profile.html': 'profile.html',
    'study-modes.html': 'study-modes.html',
    'study-hall.html': 'study-hall.html',
    // Practice/exam surfaces map to Modes
    'topic-drill.html': 'study-modes.html',
    'flash-cbt.html': 'study-modes.html',
    'year-vault.html': 'study-modes.html',
    'speed-burst.html': 'study-modes.html',
    'battle.html': 'study-modes.html',
    'cbt.html': 'study-modes.html',
    'custom-setup.html': 'study-modes.html',
    'results.html': 'performance.html'
  };

  var current = (location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();
  var activePage = ACTIVE_FOR[current] || '';

  var css =
    '.px-bottomnav{position:fixed;left:0;right:0;bottom:0;z-index:300;display:none;' +
    'background:#0B1F3A;border-top:1px solid rgba(255,255,255,.08);' +
    'box-shadow:0 -2px 16px rgba(11,31,58,.20);padding-bottom:env(safe-area-inset-bottom)}' +
    '@media(max-width:960px){.px-bottomnav{display:flex}' +
    'body{padding-bottom:calc(58px + env(safe-area-inset-bottom))!important}}' +
    // Immersive flows (an active exam) hide the nav to avoid covering exam controls.
    // Exam pages toggle body.exam-active when a question view is on screen.
    'body.exam-active .px-bottomnav{display:none!important}' +
    '@media(max-width:960px){body.exam-active{padding-bottom:0!important}}' +
    '.px-bn-item{flex:1 1 0;min-width:0;min-height:56px;display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;gap:3px;padding:8px 4px 7px;text-decoration:none;' +
    'color:rgba(255,255,255,.56);transition:color .15s;-webkit-tap-highlight-color:transparent;position:relative}' +
    '.px-bn-item:active{background:rgba(255,255,255,.05)}' +
    '.px-bn-item.active{color:#F5B800}' +
    '.px-bn-item.active::before{content:"";position:absolute;top:0;left:50%;transform:translateX(-50%);' +
    'width:26px;height:3px;border-radius:0 0 3px 3px;background:#E5A100}' +
    '.px-bn-ic{width:23px;height:23px;display:flex;align-items:center;justify-content:center}' +
    '.px-bn-ic svg{width:23px;height:23px;display:block}' +
    '.px-bn-lbl{font-size:10px;font-weight:600;letter-spacing:.01em;line-height:1}' +
    '.px-bn-item:focus-visible{outline:2.5px solid #E5A100;outline-offset:-3px;border-radius:6px}' +
    '@media(prefers-reduced-motion:reduce){.px-bn-item{transition:none}}';

  var style = document.createElement('style');
  style.id = 'px-bottomnav-style';
  style.textContent = css;
  document.head.appendChild(style);

  var nav = document.createElement('nav');
  nav.className = 'px-bottomnav';
  nav.setAttribute('aria-label', 'Primary');
  nav.innerHTML = ITEMS.map(function (it) {
    var isActive = it.page === activePage;
    return '<a class="px-bn-item' + (isActive ? ' active' : '') + '" href="' + it.page + '"' +
      (isActive ? ' aria-current="page"' : '') + '>' +
      '<span class="px-bn-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">' +
      it.icon + '</svg></span>' +
      '<span class="px-bn-lbl">' + it.label + '</span></a>';
  }).join('');

  function mount() { if (document.body && !document.querySelector('.px-bottomnav')) document.body.appendChild(nav); }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
