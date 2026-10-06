// Runs in <head> before the page paints: decides whether the intro eye plays.
// The intro eye plays on every load, never under reduced motion, and never blocks for more than 9s.
try { if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('intro'); } catch (e) {}
setTimeout(function () { var r = document.documentElement; if (r.classList.contains('intro')) { r.classList.remove('intro'); var o = document.getElementById('intro'); if (o) o.remove(); window.dispatchEvent(new Event('intro:done')); } }, 9000);
