// Runs in <head> before the page paints: decides whether the intro eye plays.
// The intro eye plays once per browser session: never on a deep link (#section), never under reduced motion,
// and never blocks for more than 9s. Returning in the same session goes straight to the page.
try {
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && !location.hash && !sessionStorage.getItem('hetops-intro')) {
    sessionStorage.setItem('hetops-intro', '1');
    document.documentElement.classList.add('intro');
  }
} catch (e) {}
setTimeout(function () { var r = document.documentElement; if (r.classList.contains('intro')) { r.classList.remove('intro'); var o = document.getElementById('intro'); if (o) o.remove(); window.dispatchEvent(new Event('intro:done')); } }, 9000);
