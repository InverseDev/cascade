/*!
 * cascade-header-fix.js  (v3)
 *
 * Kya karta hai
 *   1) Logo header mein NAHI hai (page top par): Home / Features / How It Works / Dashboard
 *      header ke left se start hote hain aur thode BADE (bigScale) dikhte hain.
 *   2) Jaise hi logo scroll hokar header mein dock hota hai: links apne aap chhote hokar
 *      EXACT original size par aa jaate hain aur right shift hote hain, taaki logo ke upar na chadhein.
 *   3) Wapas upar scroll karo to links phir left aur bade ho jaate hain.
 *
 * Kaise lagana hai (</body> se just pehle, apni baaki scripts ke BAAD):
 *     <script src="cascade-header-fix.js"></script>
 *
 * Optional settings (is script se PEHLE daalo):
 *     <script>
 *       window.CASCADE_HEADER_FIX = {
 *         bigScale: 1.3,          // top par kitne bade (1 = original, 1.4 = aur bade)
 *         gap: 24,                // docked logo aur Home ke beech gap (px)
 *         logoSelector: '#myLogo' // sirf tab, agar logo auto-detect na ho
 *       };
 *     </script>
 *
 * Debug: URL ke end mein ?chdebug laga do (e.g. http://127.0.0.1:5500/index.html?chdebug)
 *        to neeche left mein ek chhota box dikhega jo bataega logo detect hua ya nahi.
 */
(function () {
  'use strict';
  if (window.__cascadeHeaderFix) return;
  window.__cascadeHeaderFix = true;
  var CFG = {
    labels: ['home', 'features', 'how it works', 'dashboard'], // links ka text (lowercase)
    logoSelector: null, // apna selector yahan do agar auto-detect fail ho
    // Tumhare page par [data-logo-dock] wala img sabse pehle use hota hai (auto-detect uske baad)
    autoLogoSelector:
      '[data-logo-dock], [class*="logo" i], [id*="logo" i], ' +
      'img[alt*="cascade" i], img[src*="logo" i], img[src*="cascade" i], svg[aria-label*="cascade" i]',
    minLogoWidth: 80,
    bigScale: 1.3,       // top par links ka size (1 = original)
    gap: 24,             // docked logo aur Home ke beech gap (px)
    minGapToButtons: 14, // Dashboard aur History button ke beech kam se kam gap (px)
    maxShift: 140,       // Home dock par maximum itna right jayega (px)
    fallbackShift: 32,   // logo measure na ho paye to itna shift (px)
    dockAt: 260,         // logo mila hi nahi to is scrollY ke baad "docked" maano
    undockAtTop: true,   // page ke bilkul top par (scrollY 0) hamesha "logo hero mein" maano
    startLeft: null,     // top par Home ka left edge (px). null = auto
    topAlign: 'left',    // 'left' ya 'center'
    minViewport: 992,    // isse chhoti screen par kuch nahi karna (mobile menu)
    duration: 600,       // ms
    stagger: 40,         // ms, links ke beech cascade delay
    easing: 'cubic-bezier(.22,1,.36,1)',
    debug: false
  };
  var user = window.CASCADE_HEADER_FIX || {};
  for (var k in user) if (Object.prototype.hasOwnProperty.call(user, k)) CFG[k] = user[k];
  if (/[?&]chdebug(=|&|$)/.test(location.search)) CFG.debug = true;
  var links = [];
  var cands = [];
  var G = null;              // links ki natural (bina transform) geometry
  var ready = false;
  var docked = false;
  var logoRight = null;
  var origTransitions = [];
  var settleTimer = null;
  var wcTimer = null;
  var polling = false;
  var pollUntil = 0;
  var lastScale = 1;
  var dbgBox = null;
  var usedFallbackScan = false;
  /* ================= helpers ================= */
  function txt(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function isVisible(el) {
    var r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    var cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }
  function effectiveOpacity(el) {
    var o = 1;
    for (var i = 0; el && i < 5 && el !== document.documentElement; i++) {
      o *= parseFloat(getComputedStyle(el).opacity);
      el = el.parentElement;
    }
    return o;
  }
  function inLinks(el) {
    for (var i = 0; i < links.length; i++) if (links[i] === el || links[i].contains(el)) return true;
    return false;
  }
  function describe(el) {
    if (!el) return 'none';
    var s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).join('.');
    return s;
  }
  /* ================= find links ================= */
  function findLinks() {
    var found = {};
    var all = document.querySelectorAll('a, button');
    for (var i = 0; i < all.length; i++) {
      var idx = CFG.labels.indexOf(txt(all[i]));
      if (idx < 0 || found[idx] || !isVisible(all[i])) continue;
      found[idx] = all[i];
    }
    var out = [];
    for (var j = 0; j < CFG.labels.length; j++) if (found[j]) out.push(found[j]);
    return out;
  }
  /* ================= natural geometry (bina translate/scale) ================= */
  function autoStartLeft(nat0) {
    var n = links[0].parentElement;
    while (n && n !== document.documentElement) {
      var cs = getComputedStyle(n);
      var r = n.getBoundingClientRect();
      var cl = r.left + (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.borderLeftWidth) || 0);
      if (cl < nat0 - 20) return Math.max(cl, 16);
      n = n.parentElement;
    }
    return 24;
  }
  function measure() {
    var saved = links.map(function (a) { return [a.style.transition, a.style.translate, a.style.scale]; });
    links.forEach(function (a) {
      a.style.transition = 'none';
      a.style.translate = 'none';
      a.style.scale = 'none';
    });
    var rects = links.map(function (a) { return a.getBoundingClientRect(); });
    var last = rects[rects.length - 1];
    var cy = (last.top + last.bottom) / 2;
    var actionLeft = null;
    var els = document.querySelectorAll('a, button');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (inLinks(el) || !isVisible(el)) continue;
      var r = el.getBoundingClientRect();
      if (Math.abs((r.top + r.bottom) / 2 - cy) > 40) continue;
      if (r.left >= last.right - 1 && (actionLeft === null || r.left < actionLeft)) actionLeft = r.left;
    }
    var nat = rects.map(function (r) { return r.left; });
    G = {
      nat: nat,
      right: last.right,
      actionLeft: actionLeft,
      startLeft: CFG.startLeft != null ? CFG.startLeft : autoStartLeft(nat[0])
    };
    links.forEach(function (a, i) {
      a.style.transition = saved[i][0];
      a.style.translate = saved[i][1];
      a.style.scale = saved[i][2];
    });
  }
  /* ================= logo detection ================= */
  function okCandidate(el) {
    if (inLinks(el)) return false;
    for (var i = 0; i < links.length; i++) if (el.contains(links[i])) return false;
    return true;
  }
  // Wrapper hata do (e.g. <a class="brand"> jo hamesha header mein khaali slot ki tarah rehta hai),
  // sirf andar wala asli image/logo rakho.
  function innermost(list) {
    return list.filter(function (a) {
      return !list.some(function (b) { return b !== a && a.contains(b); });
    });
  }
  function collectCandidates() {
    var list = [];
    var hook = CFG.logoSelector ? [] : [].slice.call(document.querySelectorAll('[data-logo-dock]'));
    if (hook.length) {
      // data-logo-dock wala img + usi image ki koi bhi copy/clone (agar animation clone banati ho)
      var srcs = hook.map(function (e) { return e.getAttribute('src'); }).filter(Boolean);
      list = hook.slice();
      if (srcs.length) {
        [].slice.call(document.querySelectorAll('img')).forEach(function (im) {
          if (list.indexOf(im) < 0 && srcs.indexOf(im.getAttribute('src')) > -1) list.push(im);
        });
      }
    } else {
      var sel = CFG.logoSelector || CFG.autoLogoSelector;
      try { list = [].slice.call(document.querySelectorAll(sel)); } catch (e) { list = []; }
    }
    list = innermost(list.filter(okCandidate));
    // kuch nahi mila: bade wide images/svg me se logo guess karo
    if (!list.length && !CFG.logoSelector) {
      list = [].slice.call(document.querySelectorAll('img, svg, canvas, picture')).filter(function (el) {
        if (!okCandidate(el)) return false;
        var r = el.getBoundingClientRect();
        return r.width >= 120 && r.width / Math.max(r.height, 1) >= 1.6 && r.top < 900;
      });
      usedFallbackScan = list.length > 0;
    }
    return list;
  }
  function readLogo() {
    var r0 = links[0].getBoundingClientRect();
    var cy = r0.top + r0.height / 2;
    var best = null;
    for (var i = 0; i < cands.length; i++) {
      var el = cands[i];
      if (!el.isConnected) continue;
      var r = el.getBoundingClientRect();
      if (r.width < CFG.minLogoWidth || r.height < 10 || r.width > window.innerWidth * 0.8) continue;
      if (r.left > G.nat[0] - 10) continue;                 // logo hamesha links ke left side
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (effectiveOpacity(el) < 0.15) continue;
      var dy = Math.abs(r.top + r.height / 2 - cy);
      if (!best || dy < best.dy) best = { el: el, rect: r, dy: dy };
    }
    return { best: best };
  }
  function detect() {
    var L = readLogo();
    if (!cands.length) {                                   // logo mila hi nahi: scroll se andaza
      var y = window.pageYOffset || document.documentElement.scrollTop;
      return { docked: docked ? y > CFG.dockAt - 40 : y > CFG.dockAt, right: null, info: L, fallback: true };
    }
    // Page ke bilkul top par logo hero mein hota hai, to docked nahi (page load par links ka flash bhi rukta hai)
    if (CFG.undockAtTop && (window.pageYOffset || document.documentElement.scrollTop) <= 1) {
      return { docked: false, right: null, info: L, fallback: false };
    }
    // logo ka center links ki row ke saath aa jaye = docked (bahar jaane ke liye thoda zyada: hysteresis).
    // Threshold logo ki height ke hisaab se, taaki lambe (padding wale) links se gadbad na ho.
    var lh = L.best ? L.best.rect.height : 0;
    var enter = Math.max(10, lh * 0.2);
    var leave = enter + 36;
    var d = !!L.best && L.best.dy <= (docked ? leave : enter);
    return { docked: d, right: d ? L.best.rect.right : null, info: L, fallback: false };
  }
  /* ================= target positions ================= */
  function topTargets() {
    var n = links.length;
    var span = G.right - G.nat[0];
    var zoneRight = G.actionLeft != null ? G.actionLeft - 24 : window.innerWidth - 24;
    var fit = (zoneRight - G.startLeft) / span;
    var sc = clamp(Math.min(CFG.bigScale, fit), 1, 10);
    var left0 = G.startLeft;
    if (CFG.topAlign === 'center') left0 += Math.max(0, (zoneRight - G.startLeft - span * sc) / 2);
    var x = [];
    for (var i = 0; i < n; i++) x.push(left0 + (G.nat[i] - G.nat[0]) * sc - G.nat[i]);
    return { x: x, s: sc };
  }
  function dockedTargets() {
    var n = links.length;
    var need = logoRight != null ? logoRight + CFG.gap - G.nat[0] : CFG.fallbackShift;
    need = clamp(need, 0, CFG.maxShift);
    var room = G.actionLeft != null ? G.actionLeft - CFG.minGapToButtons - G.right : Infinity;
    var lastShift = Math.max(0, Math.min(need, room));
    var x = [];
    for (var i = 0; i < n; i++) x.push(n > 1 ? need + (lastShift - need) * (i / (n - 1)) : need);
    return { x: x, s: 1 };
  }
  /* ================= apply ================= */
  function clearWillChange() {
    for (var i = 0; i < links.length; i++) links[i].style.willChange = '';
  }
  function setTransitions(on) {
    for (var i = 0; i < links.length; i++) {
      if (!on) { links[i].style.transition = 'none'; continue; }
      var d = (i * CFG.stagger) + 'ms';
      var mine = 'translate ' + CFG.duration + 'ms ' + CFG.easing + ' ' + d +
                 ', scale ' + CFG.duration + 'ms ' + CFG.easing + ' ' + d;
      // user ki apni transition PEHLE, meri BAAD mein (same property ho to aakhri jeetta hai)
      links[i].style.transition = (origTransitions[i] ? origTransitions[i] + ', ' : '') + mine;
      links[i].style.willChange = 'translate, scale';
    }
    clearTimeout(wcTimer);
    if (on) wcTimer = setTimeout(clearWillChange, CFG.duration + CFG.stagger * links.length + 200);
  }
  function apply(animate) {
    if (!ready || !G) return;
    if (window.innerWidth < CFG.minViewport) {
      for (var j = 0; j < links.length; j++) { links[j].style.translate = ''; links[j].style.scale = ''; }
      return;
    }
    setTransitions(!!animate);
    var t = docked ? dockedTargets() : topTargets();
    lastScale = t.s;
    for (var i = 0; i < links.length; i++) {
      links[i].style.translate = t.x[i] + 'px 0';
      links[i].style.scale = String(t.s);
    }
    document.documentElement.classList.toggle('ch-docked', !!docked);
  }
  /* ================= update loop ================= */
  function debugDraw(s) {
    if (!CFG.debug) return;
    if (!dbgBox) {
      dbgBox = document.createElement('pre');
      dbgBox.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:2147483647;margin:0;padding:8px 10px;' +
        'font:11px/1.45 monospace;background:rgba(0,0,0,.82);color:#9f9;border-radius:6px;' +
        'pointer-events:none;max-width:70vw;white-space:pre-wrap';
      document.body.appendChild(dbgBox);
    }
    var b = s.info.best;
    dbgBox.textContent =
      'cascade-header-fix v3\n' +
      'docked : ' + docked + (s.fallback ? '  (scroll fallback)' : '') + '\n' +
      'scale  : ' + lastScale.toFixed(2) + '\n' +
      'logo   : ' + (b ? describe(b.el) + '\n         right=' + Math.round(b.rect.right) + ' dy=' + Math.round(b.dy) : 'not in header row') + '\n' +
      'cands  : ' + cands.length + (usedFallbackScan ? ' (auto-guess)' : '') +
      (cands.length ? '\n         ' + cands.slice(0, 3).map(describe).join(' | ') : '');
  }
  function update() {
    if (!ready) return;
    var s = detect();
    var changed = s.docked !== docked;
    var moved = false;
    if (s.docked && s.right != null) {
      moved = logoRight == null || Math.abs(logoRight - s.right) > 1.5;
      logoRight = s.right;
    }
    if (changed) {
      docked = s.docked;
      clearTimeout(settleTimer);
      apply(true);
      if (CFG.debug) console.log('[cascade-header-fix] docked =', docked, s.info.best ? describe(s.info.best.el) : '(no logo)');
    } else if (docked && moved) {
      // logo abhi chhota/shift ho raha hai: ruk jaye tab links ko final jagah par le jao
      clearTimeout(settleTimer);
      settleTimer = setTimeout(function () { apply(true); }, 160);
    }
    debugDraw(s);
  }
  function tick() {
    update();
    if (performance.now() < pollUntil) requestAnimationFrame(tick);
    else polling = false;
  }
  function poke() {
    pollUntil = performance.now() + 1500;
    if (!polling) {
      if (ready) cands = collectCandidates();   // logo ki clone/nayi copy bani ho to pakad lo
      polling = true;
      requestAnimationFrame(tick);
    }
  }
  /* ================= init ================= */
  function init() {
    if (ready) return true;
    links = findLinks();
    if (links.length < 2) return false;
    origTransitions = links.map(function (a) {
      var cs = getComputedStyle(a);
      var none = (cs.transitionDuration || '0s').split(',').every(function (d) { return parseFloat(d) === 0; });
      return none ? '' : cs.transition;
    });
    links.forEach(function (a) {
      if (getComputedStyle(a).display === 'inline') a.style.display = 'inline-block';
      a.style.transformOrigin = '0 50%';   // scale left edge se ho, taaki links ki jagah na hile
    });
    measure();
    cands = collectCandidates();
    ready = true;
    var s = detect();
    docked = s.docked;
    if (s.right != null) logoRight = s.right;
    apply(false);                          // pehli baar bina animation ke, taaki jump na dikhe
    if (CFG.debug) {
      console.log('[cascade-header-fix] links:', links.length, '| logo candidates:', cands.map(describe), usedFallbackScan ? '(auto-guess)' : '');
      debugDraw(s);
    }
    return true;
  }
  function remeasure() {
    if (!ready) { if (init()) poke(); return; }
    measure();
    if (!cands.length) cands = collectCandidates();
    apply(false);
    poke();
  }
  function boot() {
    init();
    window.addEventListener('scroll', poke, { passive: true });
    window.addEventListener('resize', remeasure);
    window.addEventListener('load', remeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    poke();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
