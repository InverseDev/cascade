(() => {
  const section = document.querySelector('.features-section');
  const deck = section?.querySelector('.feature-grid');
  const cards = deck ? [...deck.querySelectorAll('.feature-card')] : [];
  if (!section || !deck || cards.length !== 3) return;

  const media = window.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
  if (!media.matches) return;
  section.classList.add('feature-stack-active');

  let frame = 0;
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const ease = t => t * t * (3 - 2 * t);
  const mix = (a, b, t) => a + (b - a) * t;

  function update() {
    frame = 0;
    const sectionRect = section.getBoundingClientRect();
    const deckTop = deck.offsetTop;
    const stickyTop = window.innerHeight * 0.19;
    const travel = Math.max(1, section.offsetHeight - deckTop - deck.offsetHeight);
    const start = sectionRect.top + window.scrollY + deckTop - stickyTop;
    const progress = clamp((window.scrollY - start) / travel);

    const deckWidth = deck.clientWidth;
    const cardWidth = cards[0].getBoundingClientRect().width;
    const middle = Math.max(0, (deckWidth - cardWidth) / 2);
    const right = Math.max(middle, deckWidth - cardWidth);

    // Card two arrives first; card three follows. Both then tuck behind card one.
    const secondOut = ease(clamp(progress / 0.38));
    const thirdOut = ease(clamp((progress - 0.34) / 0.34));
    const tuck = ease(clamp((progress - 0.72) / 0.28));

    const secondX = mix(0, middle, secondOut) * (1 - tuck);
    const thirdX = mix(0, right, thirdOut) * (1 - tuck);

    cards[0].style.transform = 'translate3d(0,0,0)';
    cards[0].style.zIndex = '3';
    cards[1].style.transform = `translate3d(${secondX}px,0,0)`;
    cards[2].style.transform = `translate3d(${thirdX}px,0,0)`;
    cards[1].style.zIndex = progress < 0.72 ? '4' : '2';
    cards[2].style.zIndex = progress >= 0.34 && progress < 0.72 ? '5' : '1';
  }

  function requestUpdate() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  update();
})();
