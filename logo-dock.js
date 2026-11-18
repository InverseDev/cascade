/* Cascade logo dock (no libraries)
   A big "cover" logo in the hero shrinks and flies into the fixed header while you scroll,
   and flies back out when you scroll up. Fully scroll-linked, so it never feels laggy.

   No HTML edits needed. The script finds the header logo by itself (first <img> in the header) and
   creates the big hero logo above the headline. Only add this line after your other scripts:
     <script src="logo-dock.js"></script>
   (Optional: put data-logo-dock on the right header <img>, or write your own <img data-logo-cover> in the hero.)

   Desktop only (>= 861px). On phones and with "reduce motion" the cover is hidden and the header logo stays put. */
(() => {
  'use strict';
  const dock = document.querySelector('[data-logo-dock], .site-header img, header img');
  if (!dock) return;
  let cover = document.querySelector('[data-logo-cover]');
  if (!cover) {                                       // no manual edit needed: build the big hero logo ourselves
    const host = document.querySelector('.hero-copy');
    if (!host) return;
    cover = document.createElement('img');
    cover.src = dock.currentSrc || dock.src;          // same logo file as the header
    cover.alt = '';
    cover.width = 800;
    cover.style.cssText = 'display:block;width:min(72vw,620px);max-width:100%;height:auto;margin:0 auto 24px;filter:drop-shadow(0 14px 28px rgba(48,93,117,.12))';
    cover.setAttribute('data-logo-cover', '');
    host.prepend(cover);
  }
  const DIST = 156;                                   // finish the flight in 30% of the previous scroll distance
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = matchMedia('(min-width: 861px)');
  const header = dock.closest('.site-header');
  let headerContent = null;
  if (header && wide.matches) {
    headerContent = document.createElement('div');
    headerContent.className = 'cm-header-content';
    const siblings = Array.from(header.children).filter(el => el !== dock.closest('.brand'));
    siblings.forEach(el => headerContent.appendChild(el));
    header.appendChild(headerContent);
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - (1 - t) ** 3;
  const css = document.createElement('style');
  css.textContent =
    '.cm-fly{position:fixed;left:0;top:0;z-index:2147483647;max-width:none;height:auto;box-sizing:border-box;' +
    'transform-origin:0 0;pointer-events:none;will-change:transform;filter:drop-shadow(0 8px 18px rgba(35,70,90,.14));' +
    'animation:cm-fly-in .9s .15s cubic-bezier(.22,1,.36,1) both}' +
    '.site-header .cm-header-content{display:flex;align-items:center;justify-content:flex-end;gap:clamp(14px,2vw,30px);min-width:0;will-change:transform}' +
    '.site-header .cm-header-content .main-nav{flex:0 1 auto;min-width:0}' +
    '@keyframes cm-fly-in{from{opacity:0}}' +
    '@media (max-width:860px){[data-logo-cover]{display:none!important}.site-header .cm-header-content{display:contents}}';
  document.head.appendChild(css);
  const fly = document.createElement('img');          // the logo you actually see while flying
  fly.src = cover.currentSrc || cover.src;
  fly.alt = '';
  fly.setAttribute('aria-hidden', 'true');
  fly.draggable = false;
  fly.className = 'cm-fly';
  document.documentElement.appendChild(fly); // root-level overlay: escapes body/section stacking contexts
  if (RM) cover.style.display = 'none';
  else cover.style.visibility = 'hidden';             // keeps its space in the hero, the clone represents it
  let busy = false;
  function frame() {
    busy = false;
    if (RM || !wide.matches) {                        // phones / reduced motion: header logo only
      fly.style.display = 'none';
      dock.style.visibility = '';
      return;
    }
    fly.style.display = '';
    const p = Math.min(1, scrollY / DIST), e = ease(p);
    const c = cover.getBoundingClientRect(), d = dock.getBoundingClientRect();
    if (headerContent) {
      // Measure the natural position without the previous frame's transform,
      // avoiding cumulative layout feedback while the header slides.
      headerContent.style.transform = 'none';
      const h = headerContent.getBoundingClientRect();
      const centeredLeft = (innerWidth - h.width) / 2;
      const fullShift = centeredLeft - h.left;
      const shift = fullShift * (1 - e) * 0.6; // move the header controls only 60% of the former distance
      headerContent.style.transform = `translate3d(${shift.toFixed(1)}px,0,0)`;
    }
    if (!c.width || !d.width) return;                 // images not loaded yet
    if (p >= 1) {                                     // exact endpoint: real header logo takes over
      fly.style.visibility = 'hidden';
      dock.style.visibility = '';
      return;
    }
    fly.style.visibility = '';
    dock.style.visibility = 'hidden';                 // hidden, but keeps its space in the header
    const w = c.width + 'px';
    if (fly.style.width !== w) fly.style.width = w;
    const s = lerp(1, d.width / c.width, e);
    fly.style.transform =
      `translate3d(${lerp(c.left, d.left, e).toFixed(1)}px,${lerp(c.top, d.top, e).toFixed(1)}px,0) scale(${s.toFixed(4)})`;
  }
  const onScroll = () => busy || (busy = true, requestAnimationFrame(frame));
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  addEventListener('load', onScroll);
  [dock, cover].forEach(img => img.addEventListener('load', onScroll));
  document.fonts?.ready.then(onScroll);
  // follow the hero while its own entrance animation is still moving (first ~1.8s)
  const t0 = performance.now();
  (function loop() { frame(); if (performance.now() - t0 < 1800) requestAnimationFrame(loop); })();
})();
