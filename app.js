// hetops.dev: navigation, motion, live data, analytics.
// No tokens in this file, ever: anything shipped to the browser is readable by every visitor.

// ── Analytics (Umami, self-hosted, cookieless) ──────────────────
// Set both after deploying Umami on Coolify (see DOCKER_SETUP.md); until then nothing loads.
const UMAMI_SRC = '';
const UMAMI_WEBSITE_ID = '';
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
const NAV_H = 68;

// ── Smooth scroll + GSAP ────────────────────────────────────────
const hasGsap = !!(window.gsap && window.ScrollTrigger) && !reduce;
let lenis = null;
if (hasGsap) {
  gsap.registerPlugin(ScrollTrigger);
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
}
const scrollToId = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -NAV_H - 8 });
  else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
};
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  if (!id || !document.getElementById(id)) return;
  e.preventDefault();
  closeMenu();
  scrollToId(id);
  history.replaceState(null, '', id === 'top' ? location.pathname : '#' + id);
});

// ── Theme ───────────────────────────────────────────────────────
const root = document.documentElement;
const toggle = $('#themeToggle');
const syncIcon = () => { toggle.querySelector('i').className = root.dataset.theme === 'light' ? 'ph ph-moon' : 'ph ph-sun'; };
const flipTheme = () => {
  root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
  try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  syncIcon();
  track('theme-toggle', { theme: root.dataset.theme });
};
syncIcon();
toggle.addEventListener('click', flipTheme);

// ── Nav: border, hide on fast scroll down, active-section indicator ─
const nav = $('#nav');
const pill = $('.nav-pill');
const indicator = $('.nav-indicator');
const moveIndicator = (link) => {
  if (!link) { indicator.style.opacity = 0; return; }
  const p = pill.getBoundingClientRect(), r = link.getBoundingClientRect();
  indicator.style.width = r.width + 'px';
  indicator.style.transform = `translateX(${r.left - p.left}px)`;
  indicator.style.opacity = 1;
};
const navLinks = $$('.nav-pill a');
const setActive = (id) => {
  navLinks.forEach((a) => a.classList.toggle('active', a.dataset.nav === id));
  moveIndicator(navLinks.find((a) => a.dataset.nav === id));
};
const sectionIds = navLinks.map((a) => a.dataset.nav);
const spy = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
}, { rootMargin: '-45% 0px -50% 0px' });
sectionIds.forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
new IntersectionObserver(([e]) => { nav.classList.toggle('scrolled', !e.isIntersecting); if (e.isIntersecting) setActive(null); })
  .observe($('#top'));
addEventListener('resize', () => moveIndicator($('.nav-pill a.active')));

if (hasGsap) {
  gsap.to('.nav-progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
  // Hide the nav while reading downwards fast; bring it back on any upward scroll.
  ScrollTrigger.create({ start: 300, end: 'max', onUpdate: (self) => nav.classList.toggle('hidden', self.direction === 1 && self.getVelocity() > 900) });
}

// ── Mobile menu ─────────────────────────────────────────────────
const menu = $('#menu'), menuBtn = $('#menuBtn');
function closeMenu() { if (menu.hidden) return; menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.querySelector('i').className = 'ph ph-list'; }
menuBtn.addEventListener('click', () => {
  const open = menu.hidden;
  menu.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.querySelector('i').className = open ? 'ph ph-x' : 'ph ph-list';
  if (open) track('menu-open');
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

// ── Command palette ─────────────────────────────────────────────
const palette = $('#palette'), pInput = $('#paletteInput'), pList = $('#paletteList');
const go = (id) => () => scrollToId(id);
const open = (url) => () => window.open(url, '_blank', 'noopener');
const ACTIONS = [
  { group: 'Sections', icon: 'ph-book-open', label: 'The Threadvault story', run: go('story') },
  { group: 'Sections', icon: 'ph-squares-four', label: 'Work', run: go('work') },
  { group: 'Sections', icon: 'ph-graph', label: 'Ecosystem map', run: go('ecosystem') },
  { group: 'Sections', icon: 'ph-briefcase', label: 'Experience', run: go('experience') },
  { group: 'Sections', icon: 'ph-pen-nib', label: 'Writing', run: go('writing') },
  { group: 'Sections', icon: 'ph-envelope-simple', label: 'Contact', run: go('contact') },
  { group: 'Projects', img: '/assets/brand/threadvault-icon.webp', label: 'Threadvault on GitHub', hint: 'github.com', run: open('https://github.com/Het101/threadvault') },
  { group: 'Projects', img: '/assets/brand/dns-icon.svg', label: 'DNS Intelligence', hint: 'dns.hetops.dev', run: open('https://dns.hetops.dev') },
  { group: 'Projects', img: '/assets/brand/tools-icon.webp', label: 'Dev Toolkit', hint: 'tools.hetops.dev', run: open('https://tools.hetops.dev') },
  { group: 'Projects', img: '/assets/brand/status-icon.webp', label: 'Status page', hint: 'status.hetops.dev', run: open('https://status.hetops.dev') },
  { group: 'Actions', icon: 'ph-copy', label: 'Copy email address', run: () => copyEmail('hetpatidar09@gmail.com') },
  { group: 'Actions', icon: 'ph-file-pdf', label: 'Open résumé (PDF)', run: open('/Het_Patel_Resume.pdf') },
  { group: 'Actions', icon: 'ph-moon', label: 'Switch light / dark theme', run: flipTheme },
  { group: 'Actions', icon: 'ph-linkedin-logo', label: 'LinkedIn', run: open('https://www.linkedin.com/in/het11/') },
];
let pSel = 0, pItems = [];
const renderPalette = () => {
  const q = pInput.value.trim().toLowerCase();
  pItems = ACTIONS.filter((a) => !q || (a.label + ' ' + (a.hint || '') + ' ' + a.group).toLowerCase().includes(q));
  pSel = Math.min(pSel, Math.max(0, pItems.length - 1));
  if (!pItems.length) { pList.innerHTML = '<li class="palette-empty">Nothing matches that.</li>'; return; }
  let html = '', last = '';
  pItems.forEach((a, i) => {
    if (a.group !== last) { html += `<li class="palette-group" role="presentation">${a.group}</li>`; last = a.group; }
    const icon = a.img ? `<img src="${a.img}" alt="">` : `<i class="ph ${a.icon}" aria-hidden="true"></i>`;
    html += `<li class="palette-item" role="option" data-i="${i}" aria-selected="${i === pSel}">${icon}<span>${a.label}</span>${a.hint ? `<span class="hint">${a.hint}</span>` : ''}</li>`;
  });
  pList.innerHTML = html;
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

// ── Copy email ──────────────────────────────────────────────────
const toast = $('#toast');
const showToast = (msg) => { toast.textContent = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1800); };
async function copyEmail(addr) {
  try { await navigator.clipboard.writeText(addr); showToast('Email copied'); } catch (e) { showToast(addr); }
}
$$('[data-copy]').forEach((b) => b.addEventListener('click', () => copyEmail(b.dataset.copy)));

// ── Hero: word reveal, tilt, spotlight ──────────────────────────
// Each word is wrapped so it can rise out of its own mask; text stays real text for readers and SEO.
$$('.split').forEach((el) => {
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const w = document.createElement('span'); w.className = 'w';
          const inner = document.createElement('span'); inner.textContent = part;
          w.appendChild(inner); frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(el);
});

if (hasGsap) {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.hero h1 .w > span', { yPercent: 110, duration: 1.1, stagger: 0.06 })
    .from('.lede, .hero-ctas', { y: 18, opacity: 0, duration: 0.9, stagger: 0.1 }, '-=0.7')
    .from('.shot-back', { y: 40, opacity: 0, duration: 1.2 }, '-=1.0')
    .from('.shot-front', { y: 60, opacity: 0, duration: 1.2 }, '-=0.95')
    .from('.chip', { scale: 0.8, opacity: 0, duration: 0.8, stagger: 0.12, ease: 'back.out(1.6)' }, '-=0.7');
  // The two screenshots drift apart as the hero scrolls away (depth, not decoration).
  gsap.to('.shot-back', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.shot-front', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // Contact headline reveals the same way as the hero, once.
  gsap.from('.contact h2 .w > span', { yPercent: 110, duration: 1, stagger: 0.05, ease: 'expo.out', scrollTrigger: { trigger: '.contact', start: 'top 75%' } });
}

if (!reduce && finePointer) {
  const tilt = $('#tilt'), stage = $('.tilt-stage'), hero = $('.hero');
  let raf = 0, px = 0, py = 0;
  hero.addEventListener('pointermove', (e) => {
    const r = tilt.getBoundingClientRect(), hr = hero.getBoundingClientRect();
    px = (e.clientX - r.left) / r.width - 0.5; py = (e.clientY - r.top) / r.height - 0.5;
    hero.style.setProperty('--mx', `${e.clientX - hr.left}px`);
    hero.style.setProperty('--my', `${e.clientY - hr.top}px`);
    if (!raf) raf = requestAnimationFrame(() => {
      stage.style.setProperty('--ry', `${px * 10}deg`); stage.style.setProperty('--rx', `${-py * 8}deg`); raf = 0;
    });
  });
  hero.addEventListener('pointerleave', () => { stage.style.setProperty('--ry', '0deg'); stage.style.setProperty('--rx', '0deg'); });

  // Spotlight borders follow the pointer.
  $$('.spot').forEach((el) => el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--sx', `${e.clientX - r.left}px`); el.style.setProperty('--sy', `${e.clientY - r.top}px`);
  }));

  // Magnetic primary buttons.
  $$('.magnetic').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transition = 'transform 0.5s cubic-bezier(.16,1,.3,1)'; b.style.transform = ''; setTimeout(() => { b.style.transition = ''; }, 500); });
  });
}

// ── Count-up numbers ────────────────────────────────────────────
const countUp = (el, to) => {
  if (reduce || !window.gsap) { el.textContent = Number(to).toLocaleString('en-IN'); return; }
  const o = { v: 0 };
  gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('en-IN'); } });
};
const proofSeen = new Promise((res) => new IntersectionObserver(([e], ob) => { if (e.isIntersecting) { ob.disconnect(); res(); } }, { threshold: 0.4 }).observe($('.proof')));
proofSeen.then(() => $$('[data-count]').forEach((el) => countUp(el, +el.dataset.count)));

// ── Story: active step drives the stage ─────────────────────────
const steps = $$('.step'), panels = $$('.stage-panel');
const showStep = (i) => {
  steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
  panels.forEach((p, j) => p.classList.toggle('is-active', j === i));
};
showStep(0);
const storyObs = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { const i = +e.target.dataset.step; showStep(i); track('story-step', { step: i + 1 }); }
}, { rootMargin: '-40% 0px -55% 0px' });
steps.forEach((s) => storyObs.observe(s));
if (hasGsap) {
  gsap.to('.stage-rail span', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.story-steps', start: 'top 60%', end: 'bottom 60%', scrub: true } });
}

// ── Work: cards stack; the one underneath sinks as the next arrives ─
if (hasGsap && matchMedia('(min-width: 1025px)').matches) {
  const cards = $$('.stack-card');
  cards.forEach((card, i) => {
    const next = cards[i + 1];
    if (!next) return;
    gsap.to(card, { scale: 0.94, opacity: 0.55, ease: 'none',
      scrollTrigger: { trigger: next, start: 'top bottom', end: `top ${NAV_H + 40}px`, scrub: true } });
  });
}
// Tallybank rule wires draw in when visible.
new IntersectionObserver(([e], ob) => {
  if (!e.isIntersecting) return; ob.disconnect();
  $$('.rule-wire').forEach((w, i) => setTimeout(() => w.style.setProperty('--w', 1), 150 * i));
}, { threshold: 0.4 }).observe($('.rule'));
$$('.rule-wire').forEach((w) => w.style.setProperty('--w', reduce ? 1 : 0));

// ── Ecosystem map ───────────────────────────────────────────────
const ECOSYSTEM = [
  { key: 'dns', name: 'DNS Intelligence', icon: '/assets/brand/dns-icon.svg', c: '8,145,178', status: 'live', label: 'Live', url: 'https://dns.hetops.dev', link: 'dns.hetops.dev',
    text: '26 checks across DNS, TLS, headers, DNSSEC and email authentication, with monitoring, alerts and a public API.' },
  { key: 'threadvault', name: 'Threadvault', icon: '/assets/brand/threadvault-icon.webp', c: '109,59,235', status: 'live', label: 'Open source on npm', url: 'https://github.com/Het101/threadvault', link: 'github.com/Het101/threadvault',
    text: 'Mirrors Azure Communication Services and Twilio chat into your own Postgres, then migrates, replays and verifies it.' },
  { key: 'tallybank', name: 'Tallybank', icon: '/assets/brand/tallybank-icon.svg', c: '36,89,212', status: 'private', label: 'Private', url: '', link: '',
    text: 'Bank statements to Tally ERP 9 vouchers for five family books. Ties every run to the bank totals and never guesses.' },
  { key: 'status', name: 'Status', icon: '/assets/brand/status-icon.webp', c: '101,163,13', status: 'live', label: 'Live', url: 'https://status.hetops.dev', link: 'status.hetops.dev',
    text: 'Uptime monitoring for every HetOps service, powered by Uptime Kuma.' },
  { key: 'tools', name: 'Dev Toolkit', icon: '/assets/brand/tools-icon.webp', c: '63,71,86', status: 'live', label: 'Live', url: 'https://tools.hetops.dev', link: 'tools.hetops.dev',
    text: '100+ developer utilities: encoders, formatters, generators and converters. Based on it-tools.' },
  { key: 'domainwatch', name: 'Domain Watch', icon: '/assets/brand/domainwatch-icon.webp', c: '217,119,6', status: 'planned', label: 'Planned', url: '', link: '',
    text: 'Daily monitoring for DNS, certificates and email authentication, built on DNS Intelligence.' },
  { key: 'radar', name: 'Retirement Radar', icon: '/assets/brand/radar-icon.webp', c: '229,72,77', status: 'planned', label: 'Planned', url: '', link: '',
    text: 'Finds cloud services and versions in your account that are about to retire or start costing extra.' },
  { key: 'restore', name: 'Restore Drill', icon: '/assets/brand/restoredrill-icon.webp', c: '194,55,143', status: 'planned', label: 'Planned', url: '', link: '',
    text: 'Restores your backups on a schedule and proves they work, with evidence for auditors.' },
];
const ecoMap = $('#ecoMap'), wires = $('.eco-wires'), ecoPanel = $('#ecoPanel');
const R = 40; // radius in % of the map
ECOSYSTEM.forEach((p, i) => {
  const a = (i / ECOSYSTEM.length) * Math.PI * 2 - Math.PI / 2;
  p.x = 50 + R * Math.cos(a); p.y = 50 + R * Math.sin(a);
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', 300); line.setAttribute('y1', 300); line.setAttribute('x2', p.x * 6); line.setAttribute('y2', p.y * 6);
  line.setAttribute('class', p.status === 'planned' ? 'planned' : 'live');
  line.style.setProperty('--c', p.c);
  wires.appendChild(line); p.line = line;
  const b = document.createElement('button');
  b.className = 'eco-node' + (p.status === 'planned' ? ' planned' : '');
  b.style.left = p.x + '%'; b.style.top = p.y + '%'; b.style.setProperty('--c', p.c);
  b.innerHTML = `<img src="${p.icon}" alt="" width="60" height="60"><span>${p.name}</span>`;
  b.setAttribute('aria-label', `${p.name}: ${p.label}`);
  b.addEventListener('click', () => { selectEco(i, true); });
  b.addEventListener('pointerenter', () => { if (finePointer) selectEco(i, false); });
  ecoMap.appendChild(b); p.btn = b;
});
let ecoCur = -1, ecoTimer = 0, ecoUserPicked = false;
function selectEco(i, byUser) {
  if (byUser) { ecoUserPicked = true; clearInterval(ecoTimer); track('ecosystem-pick', { tool: ECOSYSTEM[i].key }); }
  if (i === ecoCur) return;
  ecoCur = i;
  const p = ECOSYSTEM[i];
  ECOSYSTEM.forEach((q, j) => { q.btn.classList.toggle('on', j === i); q.line.classList.toggle('on', j === i); });
  ecoPanel.style.setProperty('--c', p.c);
  ecoPanel.classList.remove('swap'); void ecoPanel.offsetWidth; ecoPanel.classList.add('swap');
  ecoPanel.innerHTML = `
    <img class="p-icon" src="${p.icon}" width="48" height="48" alt="">
    <span class="eco-status ${p.status}">${p.label}</span>
    <h3>${p.name}</h3>
    <p>${p.text}</p>
    ${p.url ? `<div class="links"><a href="${p.url}" target="_blank" rel="noopener" data-umami-event="project-link" data-umami-event-project="eco-${p.key}">${p.link} <i class="ph ph-arrow-up-right"></i></a></div>` : ''}`;
}
selectEco(0, false);
// Gently cycle through the tools while the map is on screen, until someone picks one.
if (!reduce) new IntersectionObserver(([e]) => {
  clearInterval(ecoTimer);
  if (e.isIntersecting && !ecoUserPicked) ecoTimer = setInterval(() => selectEco((ecoCur + 1) % ECOSYSTEM.length, false), 3200);
}, { threshold: 0.5 }).observe(ecoMap);
if (hasGsap) gsap.from('.eco-node', { scale: 0, opacity: 0, duration: 0.8, stagger: 0.07, ease: 'back.out(1.7)', scrollTrigger: { trigger: ecoMap, start: 'top 70%' } });

// ── Experience: line fills, dots light up ───────────────────────
if (hasGsap) {
  gsap.to('.timeline-fill', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 65%', end: 'bottom 65%', scrub: true } });
}
const litObs = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('lit'); }), { rootMargin: '0px 0px -35% 0px' });
$$('.timeline li').forEach((li) => litObs.observe(li));

// ── Marquee (logos only; AWS, Azure and Oracle have no public logo set) ─
const LOGOS = ['kubernetes', 'docker', 'terraform', 'helm', 'argo', 'githubactions', 'prometheus', 'grafana', 'ansible', 'jenkins',
  'gitlab', 'vault', 'cloudflare', 'traefikproxy', 'nginx', 'googlecloud', 'pulumi', 'opentelemetry', 'linux', 'postgresql', 'n8n', 'python', 'typescript'];
const logoHtml = LOGOS.map((s) => `<img src="https://cdn.simpleicons.org/${s}/e4e4e7" alt="${s}" width="28" height="28" loading="lazy">`).join('');
$('#marquee').innerHTML = logoHtml + logoHtml.replace(/alt="[^"]*"/g, 'alt="" aria-hidden="true"');

// ── Read depth: which sections people actually reach ────────────
const seen = new Set();
const depth = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const name = e.target.dataset.section;
    if (e.isIntersecting && !seen.has(name)) { seen.add(name); track('section-view', { section: name }); }
  }
}, { threshold: 0.3 });
$$('[data-section]').forEach((el) => depth.observe(el));

// Generic entrance for section heads and cards (GSAP only; visible without it).
if (hasGsap) {
  $$('.section-head, .section > .h2, .quote, .posts li, .activity, .proof-item').forEach((el) => {
    gsap.from(el, { y: 36, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
}

// ── Live numbers (public, unauthenticated sources only) ─────────
const ACCOUNTS = ['Het101', 'Hetu29'];
const getJSON = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const setLive = (key, n) => {
  $$(`[data-live="${key}"]`).forEach((el) => {
    if (el.closest('.proof')) proofSeen.then(() => countUp(el, n));
    else el.textContent = Number(n).toLocaleString('en-IN');
  });
};
getJSON('https://api.npmjs.org/downloads/point/last-month/threadvault').then((d) => { if (d && d.downloads) setLive('npm', d.downloads); });

(async () => {
  const year = new Date().getFullYear();
  // ponytail: contributions come from a third-party public API; move to a server-side job if it disappears.
  const per = await Promise.all(ACCOUNTS.map(async (u) => {
    const [cal, repos, prs, commits] = await Promise.all([
      getJSON(`https://github-contributions-api.jogruber.de/v4/${u}?y=last`),
      getJSON(`https://api.github.com/users/${u}/repos?per_page=100&type=owner`),
      getJSON(`https://api.github.com/search/issues?q=author:${u}+type:pr`),
      getJSON(`https://api.github.com/search/commits?q=author:${u}+committer-date:>=${year}-01-01`),
    ]);
    return { cal, repos: Array.isArray(repos) ? repos.length : 0, prs: prs?.total_count || 0, commits: commits?.total_count || 0 };
  }));
  const sum = (k) => per.reduce((s, p) => s + p[k], 0);
  if (sum('repos')) setLive('repos', sum('repos'));
  if (sum('prs')) setLive('prs', sum('prs'));
  if (sum('commits')) setLive('commits', sum('commits'));

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
  if (hasGsap) {
    gsap.from('#heatmap i', { scale: 0, opacity: 0, duration: 0.4, ease: 'back.out(2)', stagger: { each: 0.0025, from: 'start' },
      scrollTrigger: { trigger: heat, start: 'top 85%' } });
    ScrollTrigger.refresh();
  }
})();

addEventListener('beforeprint', () => { $$('.stage-panel').forEach((p) => p.classList.add('is-active')); });
