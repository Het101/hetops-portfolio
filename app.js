// hetops.dev: the eye, navigation, live data, analytics.
// No tokens in this file, ever: anything shipped to the browser is readable by every visitor.

// ── Analytics (Umami, self-hosted, cookieless) ──────────────────
const UMAMI_SRC = 'https://analytics.hetops.dev/script.js';
const UMAMI_WEBSITE_ID = '3b6004b2-abef-471c-a807-fdacd7981321';
if (UMAMI_SRC && UMAMI_WEBSITE_ID) {
  const s = document.createElement('script');
  s.defer = true; s.src = UMAMI_SRC; s.dataset.websiteId = UMAMI_WEBSITE_ID; s.dataset.domains = 'hetops.dev';
  document.head.appendChild(s);
}
const track = (name, data) => { try { window.umami && window.umami.track(name, data); } catch (e) {} };

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const mobile = () => matchMedia('(max-width: 760px)').matches;
const hasGsap = !!(window.gsap && window.ScrollTrigger) && !reduce;
if (hasGsap) gsap.registerPlugin(ScrollTrigger);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const scrollToId = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); };
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  if (!id || !document.getElementById(id)) return;
  e.preventDefault(); closeMenu(); scrollToId(id);
  history.replaceState(null, '', id === 'top' ? location.pathname : '#' + id);
});

// ── Nav ─────────────────────────────────────────────────────────
const nav = $('#nav');
const sentinel = Object.assign(document.createElement('div'), { ariaHidden: 'true' });
sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:12px;pointer-events:none';
document.body.prepend(sentinel);
new IntersectionObserver(([e]) => nav.classList.toggle('scrolled', !e.isIntersecting)).observe(sentinel);
const navLinks = $$('.nav-links a');
const spy = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) navLinks.forEach((a) => a.classList.toggle('active', a.dataset.nav === e.target.id));
}, { rootMargin: '-45% 0px -50% 0px' });
navLinks.forEach((a) => { const el = document.getElementById(a.dataset.nav); if (el) spy.observe(el); });

const menu = $('#menu'), menuBtn = $('#menuBtn');
function closeMenu() { if (menu.hidden) return; menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.querySelector('i').className = 'ph ph-list'; }
menuBtn.addEventListener('click', () => {
  const open = menu.hidden;
  menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.querySelector('i').className = open ? 'ph ph-x' : 'ph ph-list';
  if (open) track('menu-open');
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

// ── Copy email + toast ──────────────────────────────────────────
const toast = $('#toast');
const showToast = (msg) => { toast.textContent = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1800); };
async function copyEmail(addr) { try { await navigator.clipboard.writeText(addr); showToast('Email copied'); } catch (e) { showToast(addr); } }
$$('[data-copy]').forEach((b) => b.addEventListener('click', () => copyEmail(b.dataset.copy)));

// ── The eye ─────────────────────────────────────────────────────
// Lids are two cubic curves between the eye's corners. Openness 0 is a closed slit
// (bowed slightly down, like a sleeping eye); 1 is wide open. Everything inside the
// eye is clipped to the space between them.
const PRODUCTS = [
  { key: 'dns', name: 'DNS Intelligence', icon: '/assets/brand/dns-icon.svg', status: 'Live', text: '26 checks across DNS, TLS, headers and email authentication. Free, with Pro and Team plans.', url: 'https://dns.hetops.dev', link: 'dns.hetops.dev' },
  { key: 'threadvault', name: 'Threadvault', icon: '/assets/brand/threadvault-icon.webp', status: 'Open source on npm', text: 'Mirrors ACS and Twilio chat into your own Postgres, then migrates, replays and verifies it.', url: 'https://github.com/Het101/threadvault', link: 'GitHub' },
  { key: 'radar', name: 'Retirement Radar', icon: '/assets/brand/radar-icon.webp', status: 'Open source on npm', text: 'Finds AWS versions at or near end of support before extended support reaches the bill.', url: 'https://github.com/Het101/retirement-radar', link: 'GitHub' },
  { key: 'tallybank', name: 'Tallybank', icon: '/assets/brand/tallybank-icon.svg', status: 'Private', text: 'Bank statements to Tally vouchers for five family books. Ties every run to the bank totals.', url: '#work', link: 'How it decides' },
  { key: 'status', name: 'Status', icon: '/assets/brand/status-icon.webp', status: 'Live', text: 'Uptime monitoring for every HetOps service.', url: 'https://status.hetops.dev', link: 'status.hetops.dev' },
  { key: 'tools', name: 'Dev Toolkit', icon: '/assets/brand/tools-icon.webp', status: 'Live', text: '100+ developer utilities: encoders, formatters, generators and converters.', url: 'https://tools.hetops.dev', link: 'tools.hetops.dev' },
];

const eyeWrap = $('#eyeWrap'), eye = $('#eye'), world = $('#world'), iris = $('#iris'), lids = $('#lids'), veins = $('#veins');
const [lidUp, lidLow, lashes] = $$('path', lids);
const lid = { u: -0.08, l: 0.08 };
let W = 0, H = 0;

const bez = (p0, p1, p2, p3, t) => { const m = 1 - t; return m * m * m * p0 + 3 * m * m * t * p1 + 3 * m * t * t * p2 + t * t * t * p3; };
const dbez = (p0, p1, p2, p3, t) => { const m = 1 - t; return 3 * m * m * (p1 - p0) + 6 * m * t * (p2 - p1) + 3 * t * t * (p3 - p2); };

function renderLids() {
  const k = (2 * H / 3) * 0.92, mid = H / 2;
  const uy = mid - k * lid.u, ly = mid + k * lid.l;
  const up = `M0 ${mid} C ${W * 0.25} ${uy} ${W * 0.75} ${uy} ${W} ${mid}`;
  const low = `M0 ${mid} C ${W * 0.25} ${ly} ${W * 0.75} ${ly} ${W} ${mid}`;
  const clip = `path('${up} C ${W * 0.75} ${ly} ${W * 0.25} ${ly} 0 ${mid} Z')`;
  eye.style.clipPath = clip; world.style.clipPath = clip;
  lidUp.setAttribute('d', up); lidLow.setAttribute('d', low);
  // Lashes hang down while closed and lift as the lid opens; each one curls out
  // towards its own corner, longest at the middle of the lid.
  const dir = clamp((lid.u - 0.12) / 0.4, -1, 1), L = H * 0.075;
  let d = '';
  for (let i = 0; i <= 30; i++) {
    const t = 0.2 + (i / 30) * 0.66;
    const x = bez(0, W * 0.25, W * 0.75, W, t), y = bez(mid, uy, uy, mid, t);
    const dx = dbez(0, W * 0.25, W * 0.75, W, t), dy = dbez(mid, uy, uy, mid, t), n = Math.hypot(dx, dy) || 1;
    const tx = dx / n, ty = dy / n, nx = ty, ny = -tx; // normal points up when the lid is open
    const len = L * (0.35 + 0.65 * Math.sin(Math.PI * (t - 0.2) / 0.66)) * (0.5 + 0.5 * Math.abs(dir)) * (0.85 + ((i * 37) % 10) / 33);
    const curl = (t - 0.53) * 2.4;
    const c1x = (nx * dir * 0.7 + tx * curl * 0.15) * len, c1y = (ny * dir * 0.7 + ty * curl * 0.15) * len;
    const ex = (nx * dir * 0.8 + tx * curl * 0.75) * len, ey = (ny * dir * 0.8 + ty * curl * 0.75) * len;
    d += `M${x.toFixed(1)} ${y.toFixed(1)} q${c1x.toFixed(1)} ${c1y.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  }
  lashes.setAttribute('d', d);
}

// A seeded generator keeps the iris the same on every visit.
const seeded = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function drawIris() {
  const c = $('#irisCanvas'), dpr = Math.min(2, devicePixelRatio || 1), size = Math.round(iris.clientWidth * dpr);
  if (!size) return;
  c.width = c.height = size;
  const ctx = c.getContext('2d'), R = size / 2, pr = R * 0.34, rnd = seeded(29);
  ctx.translate(R, R);
  const base = ctx.createRadialGradient(0, 0, pr, 0, 0, R);
  base.addColorStop(0, '#6d4a1c'); base.addColorStop(0.28, '#8a6326'); base.addColorStop(0.5, '#33644f'); base.addColorStop(0.82, '#1b4536'); base.addColorStop(1, '#0c1612');
  ctx.fillStyle = base; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  // Stroma: thousands of fibres from the pupil outwards, gold near the centre, moss at the rim.
  for (let i = 0; i < 1500; i++) {
    const a = rnd() * Math.PI * 2, r0 = pr * (1 + rnd() * 0.12), r1 = R * (0.5 + rnd() * 0.46), bend = (rnd() - 0.5) * 0.12;
    const m = clamp((r1 / R - 0.5) / 0.46, 0, 1), gold = rnd() < 0.62 - m * 0.45;
    const col = gold ? [227, 169, 68] : [92, 196, 152];
    ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${(0.12 + rnd() * 0.36).toFixed(2)})`;
    ctx.lineWidth = (0.5 + rnd() * 1.2) * dpr;
    const rm = (r0 + r1) / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.quadraticCurveTo(Math.cos(a + bend) * rm, Math.sin(a + bend) * rm, Math.cos(a + bend * 0.4) * r1, Math.sin(a + bend * 0.4) * r1);
    ctx.stroke();
  }
  // Crypts: small dark hollows in the stroma.
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2, r = R * (0.5 + rnd() * 0.34), s = R * (0.02 + rnd() * 0.035);
    ctx.fillStyle = 'rgba(6,12,9,0.26)'; ctx.beginPath();
    ctx.ellipse(Math.cos(a) * r, Math.sin(a) * r, s * 1.8, s, a, 0, Math.PI * 2); ctx.fill();
  }
  // Collarette: the ragged gold ring that separates the inner and outer iris.
  ctx.strokeStyle = 'rgba(240,189,94,0.55)'; ctx.lineWidth = 1.6 * dpr; ctx.beginPath();
  for (let i = 0; i <= 180; i++) {
    const a = (i / 180) * Math.PI * 2, r = R * (0.52 + Math.sin(a * 11) * 0.018 + (rnd() - 0.5) * 0.02);
    i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.stroke();
  // Limbal ring: the dark edge that makes an iris read as an eye.
  const limb = ctx.createRadialGradient(0, 0, R * 0.8, 0, 0, R);
  limb.addColorStop(0, 'rgba(4,7,6,0)'); limb.addColorStop(0.75, 'rgba(4,7,6,0.6)'); limb.addColorStop(1, 'rgba(4,7,6,0.96)');
  ctx.fillStyle = limb; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  const inner = ctx.createRadialGradient(0, 0, pr * 0.95, 0, 0, pr * 1.35);
  inner.addColorStop(0, 'rgba(10,8,4,0.9)'); inner.addColorStop(1, 'rgba(10,8,4,0)');
  ctx.fillStyle = inner; ctx.beginPath(); ctx.arc(0, 0, pr * 1.35, 0, Math.PI * 2); ctx.fill();
}

// Veins: each result in the white of the eye is wired to the iris.
function drawVeins() {
  if (mobile()) return;
  const wr = world.getBoundingClientRect(), s = wr.width / W || 1;
  const cx = W / 2, cy = H / 2, ir = iris.clientWidth / 2;
  veins.setAttribute('viewBox', `0 0 ${W} ${H}`);
  veins.innerHTML = $$('.world-list li:not([hidden])').map((li, i) => {
    const r = li.getBoundingClientRect(), right = li.classList.contains('r');
    const x = ((right ? r.left + 3 : r.right - 3) - wr.left) / s, y = (r.top + r.height / 2 - wr.top) / s;
    const ang = Math.atan2(y - cy, x - cx), ex = cx + Math.cos(ang) * ir * 0.97, ey = cy + Math.sin(ang) * ir * 0.97;
    const mx = (x + ex) / 2, my = (y + ey) / 2 + (i % 2 ? 14 : -14);
    return `<path pathLength="1" d="M${x.toFixed(1)} ${y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}"/>`;
  }).join('');
}

// Orbit: the tools ride a ring inside the iris.
const orbit = $('#orbit'), caption = $('#eyeCaption');
const defaultCaption = caption.innerHTML;
orbit.innerHTML = PRODUCTS.map((p, i) => `<li style="--a:${i * 60}deg"><button class="node" type="button" data-i="${i}" aria-label="${p.name}: ${p.status}"><img src="${p.icon}" alt="" width="30" height="30"></button></li>`).join('');
const nodes = $$('.node', orbit);
function focusProduct(i, byUser) {
  nodes.forEach((n, j) => n.classList.toggle('on', j === i));
  if (i < 0) { caption.innerHTML = defaultCaption; return; }
  const p = PRODUCTS[i], ext = p.url.startsWith('http');
  caption.innerHTML = `<img src="${p.icon}" alt=""><b>${p.name}</b><span>${p.text}</span><a href="${p.url}"${ext ? ' target="_blank" rel="noopener"' : ''} data-umami-event="project-link" data-umami-event-project="eye-${p.key}">${p.link} <i class="ph ph-arrow-up-right" aria-hidden="true"></i></a>`;
  if (byUser) track('eye-pick', { tool: p.key });
}
nodes.forEach((n) => {
  n.addEventListener('click', () => focusProduct(+n.dataset.i, true));
  n.addEventListener('focus', () => focusProduct(+n.dataset.i, false));
  if (finePointer) n.addEventListener('pointerenter', () => focusProduct(+n.dataset.i, false));
});

function measure() { W = eye.offsetWidth; H = eye.offsetHeight; renderLids(); drawIris(); drawVeins(); }
measure();
let rz = 0;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { measure(); if (hasGsap) ScrollTrigger.refresh(); }, 150); });

const wake = () => { world.classList.add('awake'); eyeWrap.classList.add('awake'); };
if (!hasGsap) { lid.u = 1; lid.l = 1; renderLids(); wake(); }
else {
  // Wake up: a beat closed, a sleepy flutter, then open.
  gsap.set('.hero-text > *, .eye-caption', { opacity: 0, y: 16 });
  gsap.timeline({ delay: 0.6, onUpdate: renderLids })
    .to(lid, { u: 0.24, l: 0.18, duration: 0.32, ease: 'power2.out' })
    .to(lid, { u: 0.04, l: 0.06, duration: 0.2, ease: 'power2.in' })
    .to(lid, { u: 1, l: 1, duration: 1.15, ease: 'expo.out', onStart: wake }, '+=0.12')
    .to('.hero-text > *, .eye-caption', { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, ease: 'expo.out' }, '-=0.9');

  // Blink now and then, only while the eye is on screen.
  const blink = () => {
    if (!document.hidden && scrollY < innerHeight * 0.5) gsap.timeline({ onUpdate: renderLids })
      .to(lid, { u: 0.02, l: 0.03, duration: 0.09, ease: 'power2.in' })
      .to(lid, { u: 1, l: 1, duration: 0.22, ease: 'power2.out' });
    setTimeout(blink, 5200 + Math.random() * 4800);
  };
  setTimeout(blink, 6500);

  // Scrolling dives through the pupil into the rest of the site.
  // The eye sits above the middle of the screen, so it also slides down to put the pupil dead centre.
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=85%', scrub: 0.6, pin: true, anticipatePin: 1, invalidateOnRefresh: true,
    onEnter: () => { iris.style.setProperty('--gx', '0px'); iris.style.setProperty('--gy', '0px'); } } })
    .to('.hero-text, .eye-caption', { opacity: 0, y: -30, duration: 0.25 }, 0)
    .to('.world-list, #veins, #lids', { opacity: 0, duration: 0.2 }, 0.04)
    .to(eyeWrap, { y: () => innerHeight / 2 - (eyeWrap.offsetTop + eye.offsetTop + H / 2), duration: 0.5, ease: 'power1.inOut' }, 0.02)
    .to(eyeWrap, { scale: 18, ease: 'power2.in', duration: 1 }, 0.06);
}

// The eye follows the pointer while it is the whole view.
if (!reduce && finePointer) {
  const hero = $('.hero');
  hero.addEventListener('pointermove', (e) => {
    if (scrollY > 40) return;
    const r = eyeWrap.getBoundingClientRect();
    const dx = clamp((e.clientX - (r.left + r.width / 2)) / r.width, -0.5, 0.5), dy = clamp((e.clientY - (r.top + r.height / 2)) / r.height, -0.5, 0.5);
    iris.style.setProperty('--gx', `${(dx * W * 0.07).toFixed(1)}px`); iris.style.setProperty('--gy', `${(dy * H * 0.1).toFixed(1)}px`);
  });
  hero.addEventListener('pointerleave', () => { iris.style.setProperty('--gx', '0px'); iris.style.setProperty('--gy', '0px'); });
}

// ── Command palette ─────────────────────────────────────────────
const palette = $('#palette'), pInput = $('#paletteInput'), pList = $('#paletteList');
const go = (id) => () => scrollToId(id);
const open = (url) => () => window.open(url, '_blank', 'noopener');
const ACTIONS = [
  { group: 'Sections', icon: 'ph-eye', label: 'Experience: read the chart', run: go('experience') },
  { group: 'Sections', icon: 'ph-magnifying-glass-plus', label: 'Work: under the lens', run: go('work') },
  { group: 'Sections', icon: 'ph-globe-hemisphere-west', label: 'Check a domain', run: go('check') },
  { group: 'Sections', icon: 'ph-circle-notch', label: 'How I ship', run: go('how-i-ship') },
  { group: 'Sections', icon: 'ph-pen-nib', label: 'Writing', run: go('writing') },
  { group: 'Sections', icon: 'ph-envelope-simple', label: 'Contact', run: go('contact') },
  ...PRODUCTS.filter((p) => p.url.startsWith('http')).map((p) => ({ group: 'Projects', img: p.icon, label: p.name, hint: p.link, run: open(p.url) })),
  { group: 'Projects', img: '/assets/brand/dns-icon.svg', label: 'SPF lookup checker', hint: 'dns.hetops.dev/spf-checker', run: open('https://dns.hetops.dev/spf-checker') },
  { group: 'Projects', img: '/assets/brand/dns-icon.svg', label: 'DNS Intelligence plans', hint: 'dns.hetops.dev/#pricing', run: open('https://dns.hetops.dev/#pricing') },
  { group: 'Actions', icon: 'ph-copy', label: 'Copy email address', run: () => copyEmail('patel.x.het@gmail.com') },
  { group: 'Actions', icon: 'ph-file-pdf', label: 'Open résumé (PDF)', run: open('/Het_Patel_Resume.pdf') },
  { group: 'Actions', icon: 'ph-linkedin-logo', label: 'LinkedIn', run: open('https://www.linkedin.com/in/het11/') },
];
let pSel = 0, pItems = [];
const renderPalette = () => {
  const q = pInput.value.trim().toLowerCase();
  pItems = ACTIONS.filter((a) => !q || (a.label + ' ' + (a.hint || '') + ' ' + a.group).toLowerCase().includes(q));
  pSel = Math.min(pSel, Math.max(0, pItems.length - 1));
  if (!pItems.length) { pList.innerHTML = '<li class="palette-empty">Nothing matches that.</li>'; pInput.removeAttribute('aria-activedescendant'); return; }
  let html = '', last = '';
  pItems.forEach((a, i) => {
    if (a.group !== last) { html += `<li class="palette-group" role="presentation">${a.group}</li>`; last = a.group; }
    const icon = a.img ? `<img src="${a.img}" alt="">` : `<i class="ph ${a.icon}" aria-hidden="true"></i>`;
    html += `<li class="palette-item" role="option" id="pal-${i}" data-i="${i}" aria-selected="${i === pSel}">${icon}<span>${a.label}</span>${a.hint ? `<span class="hint">${a.hint}</span>` : ''}</li>`;
  });
  pList.innerHTML = html;
  pInput.setAttribute('aria-activedescendant', `pal-${pSel}`);
};
const runPalette = (i) => { const a = pItems[i]; if (!a) return; palette.close(); track('palette-run', { item: a.label }); a.run(); };
const openPalette = () => { if (palette.open) return; pInput.value = ''; pSel = 0; renderPalette(); palette.showModal(); pInput.focus(); };
$('#paletteBtn').addEventListener('click', openPalette);
pInput.addEventListener('input', () => { pSel = 0; renderPalette(); });
pInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { pSel = (pSel + 1) % pItems.length; renderPalette(); e.preventDefault(); }
  if (e.key === 'ArrowUp') { pSel = (pSel - 1 + pItems.length) % pItems.length; renderPalette(); e.preventDefault(); }
  if (e.key === 'Enter') runPalette(pSel);
});
pList.addEventListener('click', (e) => { const li = e.target.closest('.palette-item'); if (li) runPalette(+li.dataset.i); });
pList.addEventListener('mousemove', (e) => { const li = e.target.closest('.palette-item'); if (li && +li.dataset.i !== pSel) { pSel = +li.dataset.i; renderPalette(); } });
palette.addEventListener('click', (e) => { if (e.target === palette) palette.close(); });
addEventListener('keydown', (e) => {
  const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
  if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); openPalette(); track('palette-open', { from: 'keyboard' }); }
});
if (/Mac|iPhone|iPad/.test(navigator.platform)) $('#paletteBtn kbd').textContent = '⌘K';

// ── Story: the active step drives the round stage ───────────────
const steps = $$('.step'), panels = $$('.panel'), stageProg = $('#stageProg');
const showStep = (i) => {
  steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
  panels.forEach((p, j) => p.classList.toggle('is-active', j === i));
  stageProg.style.strokeDashoffset = 100 - (i + 1) * 25;
};
showStep(0);
const storyObs = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { const i = +e.target.dataset.step; showStep(i); track('story-step', { step: i + 1 }); }
}, { rootMargin: '-40% 0px -55% 0px' });
steps.forEach((s) => storyObs.observe(s));
addEventListener('beforeprint', () => panels.forEach((p) => p.classList.add('is-active')));

// ── Lens: a loupe over each screenshot, for reading the fine print ─
if (finePointer) $$('.lens').forEach((lens) => {
  const img = $('img', lens), loupe = Object.assign(document.createElement('span'), { className: 'loupe' });
  loupe.setAttribute('aria-hidden', 'true'); lens.appendChild(loupe);
  const Z = 2.4;
  lens.addEventListener('pointermove', (e) => {
    const r = lens.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    loupe.style.left = x + 'px'; loupe.style.top = y + 'px';
    loupe.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
    loupe.style.backgroundSize = `${r.width * Z}px auto`;
    loupe.style.backgroundPosition = `${-(x * Z - 95)}px ${-(y * Z - 95)}px`;
  });
});

// Tallybank rule wires draw in when visible.
$$('.rule-wire').forEach((w) => w.style.setProperty('--w', reduce ? 1 : 0));
new IntersectionObserver(([e], ob) => {
  if (!e.isIntersecting) return; ob.disconnect();
  $$('.rule-wire').forEach((w, i) => setTimeout(() => w.style.setProperty('--w', 1), 150 * i));
}, { threshold: 0.4 }).observe($('.rule'));

// ── Release ring: the stages run in order, only while visible ───
(() => {
  const pipe = $('#pipe'), ring = $('.ring'), prog = $('#ringProg');
  const items = $$('li', pipe), n = items.length;
  const labels = items.map((li, i) => {
    const s = document.createElement('span'); s.className = 'ring-stage'; s.style.setProperty('--a', `${(i / n) * 360}deg`);
    s.innerHTML = `<span>${li.querySelector('b').textContent}</span>`; s.dataset.s = 'ok'; ring.appendChild(s); return s;
  });
  const set = (i, state) => { items[i].dataset.s = state; labels[i].dataset.s = state; };
  if (reduce) return;
  let timer = null, i = 0;
  const tick = () => {
    if (i === 0) for (let j = 0; j < n; j++) set(j, 'wait');
    if (i < n) { if (i > 0) set(i - 1, 'ok'); set(i, 'run'); prog.style.strokeDashoffset = 100 - (i / n) * 100; i++; timer = setTimeout(tick, 1100); }
    else { set(n - 1, 'ok'); prog.style.strokeDashoffset = 0; i = 0; timer = setTimeout(tick, 2600); }
  };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !timer) tick();
    else if (!e.isIntersecting && timer) { clearTimeout(timer); timer = null; i = 0; for (let j = 0; j < n; j++) set(j, 'ok'); prog.style.strokeDashoffset = 0; }
  }, { threshold: 0.4 }).observe(ring);
})();

// ── Contact: a small eye that closes as the page ends ───────────
(() => {
  const up = $('#miniUp'), low = $('#miniLow'), clip = $('#miniClipPath'), pupil = $('#miniPupil');
  const st = { o: 1 };
  const draw = () => {
    const uy = 48 - 50.7 * st.o, ly = 48 + 50.7 * st.o * 0.85;
    const u = `M10 48 C 65 ${uy} 175 ${uy} 230 48`, l = `M10 48 C 65 ${ly} 175 ${ly} 230 48`;
    up.setAttribute('d', u); low.setAttribute('d', l); clip.setAttribute('d', `${u} C 175 ${ly} 65 ${ly} 10 48 Z`);
  };
  draw();
  if (!hasGsap) return;
  let base = 1;
  gsap.to(st, { o: 0.06, ease: 'none', onUpdate: draw, scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: 0.5, onUpdate: (s) => { base = 1 - s.progress * 0.94; } } });
  $('#contactEmail').addEventListener('pointerenter', () => {
    pupil.setAttribute('r', 17);
    gsap.timeline({ onUpdate: draw }).to(st, { o: 0.02, duration: 0.1 }).to(st, { o: base, duration: 0.25 });
  });
  $('#contactEmail').addEventListener('pointerleave', () => pupil.setAttribute('r', 13));
})();

// ── Read depth: which sections people actually reach ────────────
const seen = new Set();
const depth = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const name = e.target.dataset.section;
    if (e.isIntersecting && !seen.has(name)) { seen.add(name); track('section-view', { section: name }); }
  }
}, { threshold: 0.3 });
$$('[data-section]').forEach((el) => depth.observe(el));

// ── Live numbers (public, unauthenticated sources only) ─────────
// Anything marked data-live-hide stays hidden until its number arrives, so a slow or
// rate-limited API never leaves a bare "-" on the page.
const ACCOUNTS = ['Het101', 'Hetu29'];
const getJSON = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const setLive = (key, n) => $$(`[data-live="${key}"]`).forEach((el) => {
  el.closest('[data-live-hide]')?.removeAttribute('hidden');
  el.textContent = Number(n).toLocaleString('en-IN');
});
Promise.all(['threadvault', 'retirement-radar'].map((pkg) => getJSON(`https://api.npmjs.org/downloads/point/last-month/${pkg}`)))
  .then(([tv, rr]) => {
    if (tv && tv.downloads != null) setLive('npm', tv.downloads);
    // npm's stats lag a new package by a day or two; the count appears once it exists.
    if (rr && rr.downloads != null) setLive('npmRadar', rr.downloads);
    const all = (tv?.downloads || 0) + (rr?.downloads || 0);
    if (all) { setLive('npmAll', all); drawVeins(); }
  });

(async () => {
  // ponytail: contributions come from a third-party public API; move to a server-side job if it disappears.
  const per = await Promise.all(ACCOUNTS.map(async (u) => {
    const [cal, repos, prs] = await Promise.all([
      getJSON(`https://github-contributions-api.jogruber.de/v4/${u}?y=last`),
      getJSON(`https://api.github.com/users/${u}/repos?per_page=100&type=owner`),
      getJSON(`https://api.github.com/search/issues?q=author:${u}+type:pr`),
    ]);
    return { cal, repos: Array.isArray(repos) ? repos.length : 0, prs: prs?.total_count || 0 };
  }));
  const sum = (k) => per.reduce((s, p) => s + p[k], 0);
  if (sum('repos')) setLive('repos', sum('repos'));
  if (sum('prs')) setLive('prs', sum('prs'));
  const days = new Map();
  for (const p of per) for (const d of p.cal?.contributions || []) days.set(d.date, (days.get(d.date) || 0) + d.count);
  const heat = $('#heatmap');
  if (!days.size) { heat.querySelector('p').textContent = 'Contribution data is unavailable right now.'; return; }
  setLive('contributions', [...days.values()].reduce((a, b) => a + b, 0));
  const sorted = [...days.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  const pad = new Date(sorted[0][0]).getUTCDay();
  const level = (n) => (n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 10 ? 3 : 4);
  const cells = Array.from({ length: pad }, () => '<i style="visibility:hidden"></i>');
  for (const [date, n] of sorted) cells.push(`<i data-l="${level(n)}" title="${n} on ${date}"></i>`);
  heat.innerHTML = cells.join('');
  if (hasGsap) ScrollTrigger.refresh();
})();

// ── Live domain check: the real DNS Intelligence API ────────────
(() => {
  const form = $('#checkForm'); if (!form) return;
  const input = $('#checkInput'), btn = $('#checkGo'), err = $('#checkErr'), panel = $('#checkPanel');
  const API = 'https://dns.hetops.dev/api';
  const show = (state) => $$('.check-state', panel).forEach((el) => { el.hidden = el.dataset.state !== state; });
  const clean = (v) => v.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[/?#].*$/, '').replace(/\.$/, '');
  const valid = (d) => /^(?!-)[a-z0-9-]{1,63}(\.(?!-)[a-z0-9-]{1,63})+$/.test(d);
  const post = (path, domain) => fetch(`${API}/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain }),
  }).then((r) => r.json().then((d) => (r.ok ? d : Promise.reject(new Error(d.error || `HTTP ${r.status}`)))));
  const tile = (id, value, note, tone) => { const t = $('#' + id); t.dataset.tone = tone; $('.tile-v', t).textContent = value; $('.tile-n', t).textContent = note; };
  async function run(domain) {
    err.hidden = true;
    if (!valid(domain)) { err.textContent = 'Enter a domain like example.com.'; err.hidden = false; input.focus(); return; }
    btn.disabled = true; show('loading');
    try {
      const [mail, tls] = await Promise.allSettled([post('email-security', domain), post('ssl', domain)]);
      if (mail.status === 'rejected' && tls.status === 'rejected') throw mail.reason;
      $('#checkDomain').textContent = domain;
      const spf = mail.status === 'fulfilled' ? mail.value.spf || {} : null;
      if (!spf) tile('tileSpf', '-', 'Could not check', 'muted');
      else if (spf.error) tile('tileSpf', '-', 'DNS lookup failed, try again', 'muted');
      else if (!spf.present) tile('tileSpf', 'None', 'No SPF record published', 'err');
      else {
        const n = spf.lookups?.count ?? 0, lim = spf.lookups?.limit || 10;
        tile('tileSpf', `${n}/${lim}`, n > lim ? 'Over the limit: SPF fails' : n === lim ? 'At the limit: one more breaks SPF' : n >= lim - 2 ? `${lim - n} left before SPF breaks` : 'Within the limit', n > lim ? 'err' : n >= lim - 2 ? 'warn' : 'ok');
        $('#tileSpf .tile-bar i').style.transform = `scaleX(${Math.min(1, n / lim)})`;
      }
      const dm = mail.status === 'fulfilled' ? mail.value.dmarc || {} : null;
      if (!dm || dm.error) tile('tileDmarc', '-', 'Could not check', 'muted');
      else if (!dm.present) tile('tileDmarc', 'None', 'Spoofed mail is not blocked', 'err');
      else tile('tileDmarc', dm.policy || 'none', dm.policy === 'reject' ? 'Spoofed mail is rejected' : dm.policy === 'quarantine' ? 'Spoofed mail goes to spam' : 'Monitoring only', dm.policy === 'reject' ? 'ok' : dm.policy === 'quarantine' ? 'warn' : 'err');
      const days = tls.status === 'fulfilled' ? tls.value.certificate?.daysRemaining : null;
      if (days == null) tile('tileTls', '-', 'No certificate found', 'muted');
      else tile('tileTls', `${days}d`, days <= 7 ? 'Expires this week' : days <= 30 ? 'Renew soon' : 'Valid', days <= 7 ? 'err' : days <= 30 ? 'warn' : 'ok');
      $('#checkFull').href = `https://dns.hetops.dev/?domain=${encodeURIComponent(domain)}`;
      show('result');
      track('portfolio-check');
    } catch (e) {
      show('empty');
      const msg = /rate|429/i.test(e.message) ? 'Too many checks right now. Try again in a minute.'
        : e instanceof TypeError ? 'Couldn\'t reach DNS Intelligence from here.'
        : `That check didn't finish (${e.message}).`;
      const retry = Object.assign(document.createElement('button'), { type: 'button', className: 'check-retry', textContent: 'Try again' });
      retry.addEventListener('click', () => run(domain));
      const full = Object.assign(document.createElement('a'), { href: `https://dns.hetops.dev/?domain=${encodeURIComponent(domain)}`, target: '_blank', rel: 'noopener', textContent: 'run it on dns.hetops.dev' });
      err.replaceChildren(msg + ' ', retry, ' or ', full, '.');
      err.hidden = false;
      track('portfolio-check-error');
    } finally { btn.disabled = false; }
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); const d = clean(input.value); input.value = d; run(d); });
  $$('[data-try]').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.try; run(b.dataset.try); }));
})();
