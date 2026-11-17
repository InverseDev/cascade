/* Cascade Motion Pack — motion.js   (no libraries)
   Put it BEFORE your own script:   <script src="motion.js" defer></script>
   Optional HTML hooks
   data-hero                           on your hero <section>  → one entrance sequence on page load
   data-cascade-tank data-level="72"   animated water tank (size: style="--tank-w:260px")
   data-reveal  |  ="left"  |  ="right"   fade in when scrolled into view (use on 2–3 things only!)
   data-rotate="0.3"                   rotates slowly while scrolling (orbit rings)
   data-parallax="0.12"                drifts at its own speed while scrolling (decor only)
   Call from your Supabase code
   window.CascadeMotion?.setLevel(86.6)                          tank rises/falls + number counts
   window.CascadeMotion?.toast('Motor ON command sent')          small confirmation
   window.CascadeMotion?.countTo(el, 12.5, {suffix:' cm', decimals:1})   animate any number      */
(() => {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(.22,1,.36,1)';
  const HERO = '[class*="eyebrow"],[class*="badge"],h1,p,[class*="btn"],[class*="button"],[data-cascade-tank]';
  const $ = (s, r = document) => [...r.querySelectorAll(s)];
  /* ── number count-up ─────────────────────────────── */
  function countTo(el, to, o = {}) {
    if (!el) return;
    const d = o.decimals ?? (String(to).split('.')[1] || '').length;
    const from = el._v ?? 0, dur = RM ? 0 : (o.duration ?? 1300), t0 = performance.now();
    const text = v => (o.prefix || '') + v.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d }) + (o.suffix || '');
    cancelAnimationFrame(el._raf);
    const step = now => {
      const k = dur ? Math.min(1, (now - t0) / dur) : 1;
      el._v = from + (to - from) * (1 - (1 - k) ** 3);
      el.textContent = text(el._v);
      if (k < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }
  /* ── scroll progress bar, navbar shadow, scroll-linked layers ── */
  const bar = Object.assign(document.createElement('div'), { id: 'cm-progress' });
  document.body.prepend(bar);
  const nav = document.querySelector('[data-cm-nav],header,nav');
  nav?.classList.add('cm-nav');
  const layers = RM ? [] : $('[data-parallax],[data-rotate]');
  layers.forEach(el => el.classList.add('cm-layer'));
  let busy = false;
  const update = () => {
    busy = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    nav?.classList.toggle('cm-scrolled', scrollY > 16);
    layers.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();   // parent, so our own offset never feeds back
      if (r.bottom < -300 || r.top > innerHeight + 300) return;
      const c = r.top + r.height / 2 - innerHeight / 2;
      if (el.dataset.parallax) el.style.setProperty('--py', (-c * el.dataset.parallax).toFixed(1) + 'px');
      if (el.dataset.rotate) el.style.setProperty('--rot', (c * el.dataset.rotate * .1).toFixed(2) + 'deg');
    });
  };
  const onScroll = () => busy || (busy = true, requestAnimationFrame(update));
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();
  /* ── navbar "you are here" (only links that point to #sections) ── */
  const links = nav ? $('a[href^="#"]', nav).filter(a => a.getAttribute('href').length > 1) : [];
  const map = new Map();
  links.forEach(a => {
    a.classList.add('cm-spy');
    const s = document.getElementById(a.getAttribute('href').slice(1));
    if (s) map.set(s, a);
  });
  if (map.size) {
    const sio = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(l => l.classList.remove('cm-active'));
      map.get(e.target).classList.add('cm-active');
    }), { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, s) => sio.observe(s));
  }
  /* ── water tank ──────────────────────────────────── */
  const tanks = [];
  const apply = t => {
    if (!t._seen) return;
    t.style.setProperty('--level', t._to);
    countTo(t.querySelector('.cm-tank-val'), t._to, { decimals: 1, suffix: '%' });
  };
  function setLevel(p, only) {
    p = Math.max(0, Math.min(100, +p || 0));
    (only ? [only] : tanks).forEach(t => { t._to = p; apply(t); });
  }
  const tio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    tio.unobserve(e.target);
    setTimeout(() => { e.target._seen = true; apply(e.target); }, 450);   // water rises after the text lands
  }), { threshold: .3 });
  $('[data-cascade-tank]').forEach(t => {
    t.classList.add('cm-tank');
    t.innerHTML = '<div class="cm-water"><div class="cm-bubbles"></div></div><b class="cm-tank-val">0%</b>';
    const box = t.querySelector('.cm-bubbles');
    for (let i = 0; i < 6; i++) {
      const b = document.createElement('i');
      b.className = 'cm-bubble';
      b.style.cssText = `--x:${8 + Math.random() * 80}%;--s:${5 + Math.random() * 7}px;--d:${5 + Math.random() * 5}s;--dl:${-Math.random() * 8}s`;
      box.appendChild(b);
    }
    t._to = +t.dataset.level || 0; t._seen = false;
    tanks.push(t); tio.observe(t);
  });
  /* ── the ONE page-load sequence (hero) ───────────── */
  // const hero = document.querySelector('[data-hero]') || document.getElementById('home') ||
  //              document.querySelector('.hero') || document.querySelector('section');
  // if (hero && !RM) {
  //   const parts = [];
  //   $(HERO, hero).forEach(el => { if (!parts.some(p => p.contains(el))) parts.push(el); });   // outer element only
  //   parts.forEach((el, i) => el.animate(
  //     [{ opacity: 0, translate: '0 30px' }, { opacity: 1, translate: '0 0' }],
  //     { duration: 900, delay: 120 + i * 110, easing: EASE, fill: 'backwards' }));
  // }
  /* ── opt-in reveal: data-reveal (keep it to 2–3 elements) ── */
  if (!RM) {
    const rio = new IntersectionObserver(es => es.forEach(e => {
      const el = e.target;
      if (!e.isIntersecting) {                       // already scrolled past (e.g. page opened at #footer)
        if (e.boundingClientRect.top < 0) { rio.unobserve(el); el.style.opacity = ''; }
        return;
      }
      rio.unobserve(el);
      const side = el.dataset.reveal;
      const from = side === 'left' ? '-48px 0' : side === 'right' ? '48px 0' : '0 36px';
      const a = el.animate([{ opacity: 0, translate: from }, { opacity: 1, translate: '0 0' }],
        { duration: 1000, easing: EASE, fill: 'both' });
      a.finished.then(() => { el.style.opacity = ''; a.cancel(); }).catch(() => {});
    }), { rootMargin: '0px 0px -8% 0px' });
    $('[data-reveal]').forEach(el => { el.style.opacity = 0; rio.observe(el); });
  }
  /* ── confirmation toast ──────────────────────────── */
  function toast(msg) {
    const t = Object.assign(document.createElement('div'), { className: 'cm-toast', textContent: msg });
    t.setAttribute('role', 'status');
    document.body.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('cm-show')));
    setTimeout(() => { t.classList.remove('cm-show'); setTimeout(() => t.remove(), 500); }, 2400);
  }
  window.CascadeMotion = { setLevel, countTo, toast };
})();
