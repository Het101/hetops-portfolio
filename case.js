// Case-study pages: a small eye in the header that follows the pointer and blinks, and the
// home page's coming-into-focus reveal for each section.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const eye = document.querySelector('.cs-eye');
  if (eye) {
    const up = eye.querySelector('.cs-lid'), low = eye.querySelector('.cs-lid.low'), clip = eye.querySelector('clipPath path');
    const iris = eye.querySelector('.cs-iris'), pupil = eye.querySelector('.cs-pupil');
    let o = 1;
    const draw = () => {
      const uy = 40 - 42 * o, ly = 40 + 42 * o * 0.85;
      const u = `M6 40 C 46 ${uy} 114 ${uy} 154 40`, l = `M6 40 C 46 ${ly} 114 ${ly} 154 40`;
      up.setAttribute('d', u); low.setAttribute('d', l); clip.setAttribute('d', `${u} C 114 ${ly} 46 ${ly} 6 40 Z`);
    };
    draw();
    if (!reduce) {
      addEventListener('pointermove', (e) => {
        const r = eye.getBoundingClientRect();
        const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (innerWidth * 0.4)));
        const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (innerHeight * 0.4)));
        const t = `translate(${(dx * 22).toFixed(1)}px, ${(dy * 9).toFixed(1)}px)`;
        iris.style.transform = t; pupil.style.transform = t;
      }, { passive: true });
      const blink = () => {
        const t0 = performance.now();
        const step = (now) => { const k = (now - t0) / 260; o = k < 0.4 ? 1 - k / 0.4 : Math.min(1, (k - 0.4) / 0.6); draw(); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
        setTimeout(blink, 4200 + Math.random() * 4800);
      };
      setTimeout(blink, 2500);
    }
  }
  if (reduce || !('IntersectionObserver' in window)) return;
  const els = [...document.querySelectorAll('.cs-sec, .cs-next')];
  els.forEach((el) => el.classList.add('pre-focus'));
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('focused'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  els.forEach((el) => io.observe(el));
})();
