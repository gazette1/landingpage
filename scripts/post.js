// post.js — minimal motion for blog post pages. Lenis-driven smooth scroll only.
// No mouse-driven font distortion on post pages (too distracting for reading).

(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initLenis() {
    if (typeof window.Lenis !== 'function') return;
    const lenis = new window.Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.5,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  if (document.readyState === 'complete') initLenis();
  else window.addEventListener('load', initLenis);
})();
