/*
 * Prezidox Academy — exam guard
 * Shared protection layer for study/exam pages. Configure BEFORE including:
 *
 *   <script>
 *     window.PX_EXAM_GUARD = {
 *       copyProtect: true,     // disable copy/cut/paste/select/right-click (Battle: false)
 *       watermark:   true,     // faint PrezidoxAcademy.com watermark overlay
 *       report:      true,     // Report Question button + modal
 *       mode:        'flash-cbt',
 *       getQuestionId: function(){ return null; }  // return the current question id
 *     };
 *   </script>
 *   <script src="/js/exam-guard.js"></script>
 *
 * Notes:
 * - True screenshot BLOCKING is only possible in a native app (e.g. Android
 *   FLAG_SECURE). On the web it is not possible, so we apply the strongest
 *   available deterrents: an always-on watermark, copy/selection/right-click
 *   locking, drag/save blocking, and print suppression.
 */
(function () {
  if (window.__pxExamGuard) return;
  window.__pxExamGuard = true;
  var CFG = window.PX_EXAM_GUARD || {};
  var copyProtect = CFG.copyProtect !== false;   // default on
  var watermark   = CFG.watermark   !== false;   // default on
  var report      = CFG.report      !== false;   // default on

  /* ── current question id resolver (best effort across engines) ── */
  function currentQuestionId() {
    try {
      if (typeof CFG.getQuestionId === 'function') { var v = CFG.getQuestionId(); if (v) return v; }
    } catch (e) {}
    return window.__pxCurrentQuestionId || null;
  }

  /* ── styles ── */
  var css = '';
  if (copyProtect) {
    css +=
      '.px-noselect, .px-noselect *{-webkit-user-select:none!important;-moz-user-select:none!important;' +
      'user-select:none!important;-webkit-touch-callout:none!important}' +
      '.px-noselect input, .px-noselect textarea{-webkit-user-select:text!important;user-select:text!important}' +
      '.px-noselect img{-webkit-user-drag:none;user-drag:none;pointer-events:none}';
  }
  if (watermark) {
    var wm = encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="340" height="200">' +
      '<text x="20" y="120" font-family="Inter, Arial, sans-serif" font-size="21" font-weight="700" ' +
      'fill="#0B1F3A" transform="rotate(-28 170 100)">PrezidoxAcademy.com</text></svg>'
    );
    css +=
      '.px-watermark{position:fixed;inset:0;z-index:2147483000;pointer-events:none;opacity:.06;' +
      'background-image:url("data:image/svg+xml,' + wm + '");background-repeat:repeat;background-position:center}' +
      '@media print{body{display:none!important}}';
  }
  css +=
    '.px-report-btn{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147483200;' +
    'display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border-radius:9999px;border:1px solid rgba(255,255,255,.18);' +
    'background:rgba(11,31,58,.92);color:#fff;font:600 12px/1 Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 16px rgba(11,31,58,.28)}' +
    '.px-report-btn:hover{background:#132c52}' +
    '.px-report-ov{position:fixed;inset:0;z-index:2147483300;display:none;align-items:center;justify-content:center;' +
    'background:rgba(11,31,58,.55);backdrop-filter:blur(2px);padding:18px}' +
    '.px-report-ov.show{display:flex}' +
    '.px-report-modal{background:#fff;border-radius:14px;max-width:400px;width:100%;padding:22px;box-shadow:0 20px 60px rgba(11,31,58,.3);' +
    'font-family:Inter,system-ui,sans-serif;color:#2E2C29}' +
    '.px-report-modal h3{font-family:"DM Serif Display",Georgia,serif;font-size:18px;color:#0B1F3A;margin:0 0 4px}' +
    '.px-report-modal p{font-size:12px;color:#5C5854;margin:0 0 14px}' +
    '.px-report-modal label{display:block;font-size:12px;font-weight:700;color:#2E2C29;margin:0 0 6px}' +
    '.px-report-modal select,.px-report-modal textarea{width:100%;padding:9px 12px;border:1.5px solid #E4E1DC;border-radius:8px;' +
    'font:14px Inter,system-ui,sans-serif;color:#2E2C29;outline:none;margin-bottom:14px;background:#fff}' +
    '.px-report-modal select:focus,.px-report-modal textarea:focus{border-color:#0B1F3A}' +
    '.px-report-modal textarea{resize:vertical;min-height:66px}' +
    '.px-report-actions{display:flex;gap:10px;justify-content:flex-end}' +
    '.px-report-actions button{padding:10px 18px;border-radius:8px;font:700 13px Inter,system-ui,sans-serif;cursor:pointer;border:none}' +
    '.px-rb-cancel{background:#F5F4F1;color:#5C5854}' +
    '.px-rb-send{background:#0B1F3A;color:#fff}.px-rb-send:disabled{opacity:.6;cursor:default}' +
    '.px-report-toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%) translateY(80px);z-index:2147483400;' +
    'background:#18A34A;color:#fff;padding:11px 18px;border-radius:10px;font:600 13px Inter,system-ui,sans-serif;' +
    'box-shadow:0 8px 30px rgba(0,0,0,.2);opacity:0;transition:transform .3s,opacity .3s;pointer-events:none;max-width:90vw;text-align:center}' +
    '.px-report-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}.px-report-toast.err{background:#DC2626}' +
    '@media(prefers-reduced-motion:reduce){.px-report-toast{transition:none}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ── copy / selection / right-click protection ── */
  if (copyProtect) {
    var block = function (e) {
      // Allow interaction inside real text inputs (search boxes, comment fields)
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || (t.closest && t.closest('.px-report-modal')))) return;
      e.preventDefault();
    };
    ['copy', 'cut', 'paste', 'contextmenu', 'selectstart', 'dragstart'].forEach(function (ev) {
      document.addEventListener(ev, block, { capture: true });
    });
    document.addEventListener('keydown', function (e) {
      var k = (e.key || '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'a', 's', 'p', 'u'].indexOf(k) !== -1) {
        var t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
        e.preventDefault();
      }
    }, { capture: true });
    // PrintScreen deterrent: clear the clipboard if a screenshot key is pressed
    document.addEventListener('keyup', function (e) {
      if (e.key === 'PrintScreen' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('Prezidox Academy — screenshots of exam content are discouraged.').catch(function () {});
      }
    });
    var applyNoSelect = function () { if (document.body) document.body.classList.add('px-noselect'); };
    if (document.body) applyNoSelect(); else document.addEventListener('DOMContentLoaded', applyNoSelect);
  }

  /* ── mount watermark + report UI once the body exists ── */
  function mount() {
    if (!document.body) return;

    if (watermark && !document.querySelector('.px-watermark')) {
      var layer = document.createElement('div');
      layer.className = 'px-watermark';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
    }

    if (report && !document.querySelector('.px-report-btn')) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-report-btn';
      btn.setAttribute('aria-label', 'Report a problem with this question');
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3v18M3 4.5h13l-2 4 2 4H3"/></svg>Report';

      var ov = document.createElement('div');
      ov.className = 'px-report-ov';
      ov.innerHTML =
        '<div class="px-report-modal" role="dialog" aria-modal="true" aria-label="Report question">' +
          '<h3>Report a problem</h3>' +
          '<p>Help us keep the question bank accurate. Your report goes to the admin team.</p>' +
          '<label for="px-rb-reason">What\'s wrong?</label>' +
          '<select id="px-rb-reason">' +
            '<option value="incorrect_answer">The answer is incorrect</option>' +
            '<option value="unclear_wording">The wording is unclear</option>' +
            '<option value="duplicate">This is a duplicate question</option>' +
            '<option value="typo">Typo or formatting issue</option>' +
            '<option value="other">Something else</option>' +
          '</select>' +
          '<label for="px-rb-comment">Comment <span style="font-weight:400;color:#9B9790">(optional)</span></label>' +
          '<textarea id="px-rb-comment" placeholder="Add any detail that helps us fix it…" maxlength="500"></textarea>' +
          '<div class="px-report-actions">' +
            '<button type="button" class="px-rb-cancel">Cancel</button>' +
            '<button type="button" class="px-rb-send">Send report</button>' +
          '</div>' +
        '</div>';

      document.body.appendChild(btn);
      document.body.appendChild(ov);

      var toast = document.createElement('div');
      toast.className = 'px-report-toast';
      document.body.appendChild(toast);
      var toastTimer;
      function showToast(msg, isErr) {
        toast.textContent = msg;
        toast.className = 'px-report-toast show' + (isErr ? ' err' : '');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.className = 'px-report-toast' + (isErr ? ' err' : ''); }, 3200);
      }

      function open() { ov.classList.add('show'); }
      function close() { ov.classList.remove('show'); }
      btn.addEventListener('click', open);
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      ov.querySelector('.px-rb-cancel').addEventListener('click', close);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

      var sendBtn = ov.querySelector('.px-rb-send');
      sendBtn.addEventListener('click', async function () {
        var reason = ov.querySelector('#px-rb-reason').value;
        var comment = ov.querySelector('#px-rb-comment').value.trim();
        sendBtn.disabled = true; sendBtn.textContent = 'Sending…';
        try {
          var res = await fetch('/api/reports', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionId: currentQuestionId(),
              reason: reason,
              comment: comment || null,
              mode: CFG.mode || null,
              page: location.pathname,
            }),
          });
          if (res.ok) {
            close();
            ov.querySelector('#px-rb-comment').value = '';
            showToast('Thanks — your report was sent to the admin team.');
          } else {
            var d = await res.json().catch(function () { return {}; });
            showToast(d.error || 'Could not send the report. Please try again.', true);
          }
        } catch (e) {
          showToast('Network error. Please try again.', true);
        }
        sendBtn.disabled = false; sendBtn.textContent = 'Send report';
      });
    }
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
