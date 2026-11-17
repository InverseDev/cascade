/* Cascade mobile menu helper (no libraries) — only acts at <= 1024px.
   Closes the menu after you tap a link, tap outside the header, or press Esc.
   Add after your other scripts:  <script src="mobile-view.js"></script>                */
(() => {
  'use strict';
  const nav = document.getElementById('mainNav');
  const btn = document.getElementById('menuToggle');
  const header = document.querySelector('.site-header');
  if (!nav || !btn || !header) return;

  const mq = matchMedia('(max-width:1024px)');
  const sync = () => btn.setAttribute('aria-expanded', String(nav.classList.contains('open')));
  const close = () => { nav.classList.remove('open'); sync(); };

  btn.addEventListener('click', () => setTimeout(sync));               // runs after app.js has toggled .open
  header.addEventListener('click', e => {
    if (mq.matches && e.target.closest('.main-nav a, .header-cta, .header-cta1')) close();
  });
  document.addEventListener('click', e => {
    if (mq.matches && nav.classList.contains('open') && !e.target.closest('.site-header')) close();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  mq.addEventListener?.('change', close);
  sync();
})();
