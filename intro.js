// hetops.dev intro: a big eye wakes, opens, then shrinks into the 3D eye in the hero.
// Plays on every load; the inline head script decides (and removes it after 9s no matter what).
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('intro')) return;
  window.__introPlayed = true;
  const overlay = document.getElementById('intro'), wrap = document.getElementById('introEye');
  const eye = document.getElementById('ieEye'), irisC = document.getElementById('ieIris');
  const [up, low, lashes] = overlay.querySelectorAll('#ieLids path');
  const lid = { u: -0.08, l: 0.08 };
  let W = 0, H = 0, done = false;

  const bez = (p0, p1, p2, p3, t) => { const m = 1 - t; return m * m * m * p0 + 3 * m * m * t * p1 + 3 * m * t * t * p2 + t * t * t * p3; };
  const dbez = (p0, p1, p2, p3, t) => { const m = 1 - t; return 3 * m * m * (p1 - p0) + 6 * m * t * (p2 - p1) + 3 * t * t * (p3 - p2); };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function render() {
    const k = (2 * H / 3) * 0.92, mid = H / 2, uy = mid - k * lid.u, ly = mid + k * lid.l;
    const u = `M0 ${mid} C ${W * 0.25} ${uy} ${W * 0.75} ${uy} ${W} ${mid}`, l = `M0 ${mid} C ${W * 0.25} ${ly} ${W * 0.75} ${ly} ${W} ${mid}`;
    eye.style.clipPath = `path('${u} C ${W * 0.75} ${ly} ${W * 0.25} ${ly} 0 ${mid} Z')`;
    up.setAttribute('d', u); low.setAttribute('d', l);
    const dir = clamp((lid.u - 0.12) / 0.4, -1, 1), L = H * 0.085;
    let d = '';
    for (let i = 0; i <= 40; i++) {
      const t = 0.18 + (i / 40) * 0.68;
      const x = bez(0, W * 0.25, W * 0.75, W, t), y = bez(mid, uy, uy, mid, t);
      const dx = dbez(0, W * 0.25, W * 0.75, W, t), dy = dbez(mid, uy, uy, mid, t), n = Math.hypot(dx, dy) || 1;
      const tx = dx / n, ty = dy / n, nx = ty, ny = -tx;
      const len = L * (0.35 + 0.65 * Math.sin(Math.PI * (t - 0.18) / 0.68)) * (0.5 + 0.5 * Math.abs(dir)) * (0.8 + ((i * 37) % 10) / 25);
      const curl = (t - 0.52) * 2.4;
      d += `M${x.toFixed(1)} ${y.toFixed(1)} q${((nx * dir * 0.7 + tx * curl * 0.15) * len).toFixed(1)} ${((ny * dir * 0.7 + ty * curl * 0.15) * len).toFixed(1)} ${((nx * dir * 0.8 + tx * curl * 0.75) * len).toFixed(1)} ${((ny * dir * 0.8 + ty * curl * 0.75) * len).toFixed(1)}`;
    }
    lashes.setAttribute('d', d);
  }

  // Same seeded iris as the 3D eye's palette, drawn flat.
  function drawIris() {
    const dpr = Math.min(2, devicePixelRatio || 1), size = Math.round(irisC.clientWidth * dpr);
    if (!size) return;
    irisC.width = irisC.height = size;
    const g = irisC.getContext('2d'), R = size / 2, pr = R * 0.32;
    let seed = 29; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    g.translate(R, R);
    const base = g.createRadialGradient(0, 0, pr, 0, 0, R);
    base.addColorStop(0, '#6b4513'); base.addColorStop(0.3, '#b07a24'); base.addColorStop(0.58, '#4f8a68'); base.addColorStop(0.85, '#2a5a46'); base.addColorStop(1, '#0c1612');
    g.fillStyle = base; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 1700; i++) {
      const a = rnd() * Math.PI * 2, r0 = pr * (1 + rnd() * 0.12), r1 = R * (0.5 + rnd() * 0.46), bend = (rnd() - 0.5) * 0.12;
      const gold = rnd() < 0.62 - clamp((r1 / R - 0.5) / 0.46, 0, 1) * 0.45;
      g.strokeStyle = gold ? `rgba(240,190,96,${(0.15 + rnd() * 0.38).toFixed(2)})` : `rgba(110,210,165,${(0.12 + rnd() * 0.34).toFixed(2)})`;
      g.lineWidth = (0.5 + rnd() * 1.2) * dpr; const rm = (r0 + r1) / 2;
      g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      g.quadraticCurveTo(Math.cos(a + bend) * rm, Math.sin(a + bend) * rm, Math.cos(a + bend * 0.4) * r1, Math.sin(a + bend * 0.4) * r1); g.stroke();
    }
    g.strokeStyle = 'rgba(250,200,110,0.55)'; g.lineWidth = 1.6 * dpr; g.beginPath();
    for (let i = 0; i <= 180; i++) { const a = (i / 180) * Math.PI * 2, r = R * (0.52 + Math.sin(a * 11) * 0.018); i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.stroke();
    const limb = g.createRadialGradient(0, 0, R * 0.8, 0, 0, R);
    limb.addColorStop(0, 'rgba(4,7,6,0)'); limb.addColorStop(0.75, 'rgba(4,7,6,0.6)'); limb.addColorStop(1, 'rgba(4,7,6,0.96)');
    g.fillStyle = limb; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#050505'; g.beginPath(); g.arc(0, 0, pr, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(239,233,221,0.85)'; g.beginPath(); g.ellipse(-pr * 0.38, -pr * 0.45, pr * 0.24, pr * 0.16, -0.5, 0, Math.PI * 2); g.fill();
  }

  const measure = () => { W = eye.offsetWidth; H = eye.offsetHeight; render(); drawIris(); };
  measure();

  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)), easeIn = (t) => t * t, easeOut = (t) => 1 - (1 - t) * (1 - t);
  const to = (u, l, dur, ease) => new Promise((res) => {
    const fu = lid.u, fl = lid.l, t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / (dur * 1000)), e = ease(t);
      lid.u = fu + (u - fu) * e; lid.l = fl + (l - fl) * e; render();
      t < 1 && !done ? requestAnimationFrame(step) : res();
    };
    requestAnimationFrame(step);
  });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Where the hero's 3D eye sits: the same framing maths as eye3d.js.
  function target() {
    const body = document.getElementById('eyeBody');
    const r = body.getBoundingClientRect(), aspect = r.width / r.height;
    const fit = Math.max((r.width < 560 ? 3 : 2.5) / aspect, 1.6);
    const eyeR = (r.height / 2) / fit;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, irisR: eyeR * 0.56 };
  }

  function finish() {
    if (done) return; done = true;
    root.classList.remove('intro'); root.classList.add('intro-landed');
    overlay.remove();
    window.dispatchEvent(new Event('intro:done'));
  }

  async function shrink() {
    const t = target(), ir = irisC.getBoundingClientRect();
    const sx = t.x - (ir.left + ir.width / 2), sy = t.y - (ir.top + ir.height / 2), s = t.irisR / (ir.width / 2);
    overlay.classList.add('landing');
    const a = wrap.animate([{ transform: 'none' }, { transform: `translate(${sx}px, ${sy}px) scale(${s})` }], { duration: 900, easing: 'cubic-bezier(0.7, 0, 0.2, 1)', fill: 'forwards' });
    await a.finished;
    // Hold the flat eye in place until the 3D eye is drawn underneath, then hand over.
    if (!window.__eye3dReady) await Promise.race([new Promise((r) => window.addEventListener('eye3d:ready', r, { once: true })), wait(1500)]);
    overlay.classList.add('gone');
    await wait(450);
    finish();
  }

  const skip = () => { if (done) return; overlay.classList.add('gone'); setTimeout(finish, 300); };
  overlay.querySelector('.intro-skip').addEventListener('click', skip);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') skip(); }, { once: true });

  (async () => {
    await wait(350);
    await to(0.24, 0.18, 0.28, easeOut);
    await to(0.04, 0.06, 0.16, easeIn);
    await wait(100);
    await to(1, 1, 0.95, easeOutExpo);
    await wait(250);
    if (!done) await shrink();
  })();
})();
