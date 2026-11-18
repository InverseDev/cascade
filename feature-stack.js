(() => {
  const section = document.querySelector('.features-section');
  const deck = section?.querySelector('.feature-grid');
  const cards = deck ? [...deck.querySelectorAll('.feature-card')] : [];
  if (!section || !deck || cards.length !== 3) return;

  const media = window.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
  if (!media.matches) return;
  section.classList.add('feature-stack-active');

  let frame = 0;
  let animatedOut = null;
  let targetOut = 0;
  let lastScrollY = window.scrollY;
  let scrollDirection = 1;
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const ease = t => t * t * (3 - 2 * t);
  const mix = (a, b, t) => a + (b - a) * t;

  function update() {
    frame = 0;

    // Use the deck's natural document position: no sticky positioning, so
    // the cards track the viewport continuously from entering to leaving it.
    const deckTop = deck.getBoundingClientRect().top + window.scrollY;
    const viewportHeight = window.innerHeight;
    const cardHeight = cards[0].getBoundingClientRect().height;
    const scrollDistance = window.scrollY - (deckTop - viewportHeight + 1);
    const startDelay = 150;
    const speed = 0.8;
    const toCenter = Math.max(1, (viewportHeight - cardHeight) / 2);

    // Begin 150px later, then move at 80% of the previous scroll speed.
    const openingDistance = Math.max(1, (toCenter - startDelay) / speed);
    targetOut = ease(clamp((scrollDistance - startDelay) / openingDistance));
    if (animatedOut === null) animatedOut = targetOut;

    // Ease more gently while scrolling down; keep the quicker, familiar
    // response while scrolling back up.
    const response = scrollDirection > 0 ? 0.12 : 0.28;
    animatedOut += (targetOut - animatedOut) * response;
    const out = animatedOut;

    // Slow the return to 80% as well, while still finishing as the deck
    // completely leaves the viewport.
    const closingDistance = cardHeight / speed;
    const closingStart = viewportHeight + cardHeight - closingDistance;
    const tuck = ease(clamp((scrollDistance - closingStart) / closingDistance));

    const deckWidth = deck.clientWidth;
    const cardWidth = cards[0].getBoundingClientRect().width;
    const middle = Math.max(0, (deckWidth - cardWidth) / 2);
    const right = Math.max(middle, deckWidth - cardWidth);

    const secondX = mix(0, middle, out) * (1 - tuck);
    const thirdX = mix(0, right, out) * (1 - tuck);

    cards[0].style.transform = 'translate3d(0,0,0)';
    cards[0].style.zIndex = '3';
    cards[1].style.transform = `translate3d(${secondX}px,0,0)`;
    cards[2].style.transform = `translate3d(${thirdX}px,0,0)`;
    cards[1].style.zIndex = '4';
    cards[2].style.zIndex = '5';

    // Continue easing after a scroll event until the cards catch up.
    if (Math.abs(targetOut - animatedOut) > 0.001 && !frame) {
      frame = requestAnimationFrame(update);
    }
  }

  function requestUpdate() {
    const nextScrollY = window.scrollY;
    if (nextScrollY !== lastScrollY) {
      scrollDirection = nextScrollY > lastScrollY ? 1 : -1;
      lastScrollY = nextScrollY;
    }
    if (!frame) frame = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  update();
})();