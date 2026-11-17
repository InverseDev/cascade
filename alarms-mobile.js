/* =====================================================================
   alarms-mobile.js  —  Alarm page ke MOBILE VIEW ki JS (alag file)

   Kaam: sirf ek — navbar ka "fit check".
   Phone par logo + Home + Back to Dashboard + theme button ek row mein
   aate hain. Alag-alag phones/fonts mein buttons ki chaudai alag hoti hai,
   isliye agar logo itna dab jaye ki chhota dikhne lage (< MIN_LOGO_PX),
   to navbar pe "am-nav-wrap" class lag jaati hai (CSS mein: logo upar,
   buttons neeche). Jagah wapas mile to class apne aap hat jaati hai.

   - Koi element add/remove/move nahi hota, koi style/animation nahi badalti.
   - 640px se badi screen (tablet/desktop) pe kuch nahi karta.
   - HTML, alarms.js aur alarms.css ko chhua nahi gaya.
   - alarms-mobile.css ke saath use karo; alarms.js ke baad load karo:
        <script src="alarms.js"></script>
        <script src="alarms-mobile.js"></script>
   ===================================================================== */
(() => {
  'use strict';

  /* ---------- Yahan se tweak kar sakte ho ---------- */
  const MAX_WIDTH_PX = 640;    // is width tak phone view (CSS ke rules ke saath same)
  const MIN_LOGO_PX  = 120;    // logo isse chhota hone lage to navbar do row mein
  const WRAP_CLASS   = 'am-nav-wrap';
  /* ------------------------------------------------- */

  const mq = window.matchMedia(`(max-width: ${MAX_WIDTH_PX}px)`);
  let navbar = null;
  let logo = null;
  let queued = 0;

  function fit() {
    queued = 0;
    if (!navbar) return;

    // Hamesha pehle class hatao, ek-row mein naapo, zarurat ho tabhi wapas lagao
    // (sab ek hi frame mein hota hai, isliye screen pe koi jhatka nahi dikhta).
    navbar.classList.remove(WRAP_CLASS);
    if (!mq.matches || !logo) return;

    // Logo image abhi load nahi hui to naap galat aayegi; load hone par dobara chalega.
    if (!logo.complete || !logo.naturalWidth) return;

    if (logo.getBoundingClientRect().width < MIN_LOGO_PX) {
      navbar.classList.add(WRAP_CLASS);
    }
  }

  function schedule() {
    if (!queued) queued = requestAnimationFrame(fit);
  }

  function init() {
    navbar = document.querySelector('.alarm-navbar');
    if (!navbar) return;                       // ye alarm page nahi hai
    logo = navbar.querySelector('.alarm-brand-logo');

    if (logo) logo.addEventListener('load', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    window.addEventListener('load', schedule);
    if (mq.addEventListener) mq.addEventListener('change', schedule);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);

    fit();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
