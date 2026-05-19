// motion.js — mouse-driven variable-font distortion, terminal visibility, Lenis-driven
// momentum scroll with scroll-velocity skew. Built against design.md §5 Motion.

(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* §5.1 Mouse-driven variable-font distortion on hero poster */

  const poster = document.querySelector('.hero-poster .line-1');
  if (poster && !reduced) {
    const restWeight = 200;
    const maxWeight = 800;
    const restTracking = -0.04;
    const maxTrackingShift = -0.02;

    let targetX = 0.5;
    let targetY = 0.5;
    let lerpX = 0.5;
    let lerpY = 0.5;
    let inViewport = false;

    window.addEventListener('mousemove', (e) => {
      targetX = e.clientX / window.innerWidth;
      targetY = e.clientY / window.innerHeight;
      inViewport = true;
    });

    window.addEventListener('mouseleave', () => { inViewport = false; });

    const tick = () => {
      const rx = inViewport ? targetX : 0.5;
      const ry = inViewport ? targetY : 0.5;
      lerpX += (rx - lerpX) * 0.08;
      lerpY += (ry - lerpY) * 0.08;

      const wght = restWeight + (maxWeight - restWeight) * lerpX;
      const tracking = restTracking + maxTrackingShift * lerpY;

      poster.style.fontVariationSettings = `'wght' ${wght.toFixed(0)}`;
      poster.style.letterSpacing = `${tracking.toFixed(4)}em`;

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* §6.2 Terminal block visibility on scroll */

  const terminal = document.querySelector('.terminal');
  const checkTerminal = () => {
    if (!terminal) return;
    const past = window.scrollY > window.innerHeight * 0.5;
    terminal.classList.toggle('hidden', past);
  };
  window.addEventListener('scroll', checkTerminal, { passive: true });
  checkTerminal();

  /* §5.2 Lenis-driven momentum scroll with §6.4 velocity skew */

  function initLenis() {
    if (typeof window.Lenis !== 'function') {
      // Lenis CDN failed to load. Fall back to native scroll. Skew effect disabled.
      return;
    }

    const lenis = new window.Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.8,
      touchMultiplier: 1.5,
    });

    const broadside = document.querySelector('.broadside');
    let prevScroll = 0;
    let velocity = 0;

    function raf(time) {
      lenis.raf(time);

      const cur = lenis.scroll;
      velocity = cur - prevScroll;
      prevScroll = cur;

      if (broadside && !reduced) {
        const magnitude = Math.min(Math.abs(velocity) / 30, 1);
        const direction = velocity > 0 ? 1 : -1;
        const skew = magnitude * direction * 1.5;
        broadside.style.transform = `skewY(${skew.toFixed(2)}deg)`;
      }

      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  if (document.readyState === 'complete') {
    initLenis();
  } else {
    window.addEventListener('load', initLenis);
  }

  /* §5.3 Project hover background reveals (CSS handles transitions; this preloads images) */

  document.querySelectorAll('.project-row[data-bg]').forEach((row) => {
    const url = row.dataset.bg;
    if (!url) return;
    const reveal = row.querySelector('.bg-reveal');
    if (reveal) {
      reveal.style.backgroundImage = `url("${url}")`;
    }
  });

  /* §5 Project row click navigation. Each row's data-href points to the corresponding blog post. */

  document.querySelectorAll('.project-row[data-href]').forEach((row) => {
    row.addEventListener('click', () => {
      const href = row.dataset.href;
      if (href) window.location.href = href;
    });
  });
})();
