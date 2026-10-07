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

// ── Tools: shared with the 3D eye (eye3d.js) and the palette ─────
const PRODUCTS = [
  { key: 'dns', name: 'DNS Intelligence', icon: '/assets/brand/dns-icon.svg', status: 'Live', text: '26 checks across DNS, TLS, headers and email authentication. Free, with Pro and Team plans.', url: 'https://dns.hetops.dev', link: 'dns.hetops.dev' },
  { key: 'threadvault', name: 'Threadvault', icon: '/assets/brand/threadvault-icon.webp', status: 'Open source on npm', text: 'Mirrors ACS and Twilio chat into your own Postgres, then migrates, replays and verifies it.', url: 'https://github.com/Het101/threadvault', link: 'GitHub' },
  { key: 'radar', name: 'Retirement Radar', icon: '/assets/brand/radar-icon.webp', status: 'Open source on npm', text: 'Finds AWS versions at or near end of support before extended support reaches the bill.', url: 'https://github.com/Het101/retirement-radar', link: 'GitHub' },
  { key: 'radarcloud', name: 'Radar Cloud', icon: '/assets/brand/radarcloud-icon.webp', status: 'Live', text: 'Retirement Radar, hosted: scheduled scans of your AWS accounts through a read-only role, with email and Slack alerts.', url: 'https://radar.hetops.dev', link: 'radar.hetops.dev' },
  { key: 'restoredrill', name: 'Restore Drill', icon: '/assets/brand/restoredrill-icon.webp', status: 'Live', text: 'Restores the newest backup into a throwaway copy every few hours and proves it: integrity, tables, row counts, freshness. Open source.', url: 'https://drill.hetops.dev', link: 'drill.hetops.dev' },
  { key: 'tallybank', name: 'Tallybank', icon: '/assets/brand/tallybank-icon.svg', status: 'Private', text: 'Bank statements to Tally vouchers for five family books. Ties every run to the bank totals.', url: '#work', link: 'How it decides' },
  { key: 'status', name: 'Status', icon: '/assets/brand/status-icon.webp', status: 'Live', text: 'Live status for every HetOps service: response times, incidents and backup checks, watched from outside too.', url: 'https://status.hetops.dev', link: 'status.hetops.dev' },
  { key: 'tools', name: 'Dev Toolkit', icon: '/assets/brand/tools-icon.webp', status: 'Live', text: '100+ developer utilities: encoders, formatters, generators and converters.', url: 'https://tools.hetops.dev', link: 'tools.hetops.dev' },
];
window.HETOPS = { PRODUCTS, track };

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
  { group: 'Actions', icon: 'ph-terminal-window', label: 'sudo hire het', run: () => hire() },
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
    s.appendChild(document.createElement('span')).textContent = li.querySelector('b').textContent; s.dataset.s = 'ok'; ring.appendChild(s); return s;
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
  if (reduce) return;
  // Openness follows the real distance to the end of the page (a measured trigger goes stale
  // as fonts and the 3D sections settle). Only runs while the contact section is on screen.
  let on = false, winkUntil = 0;
  const END = 520;
  const step = (now) => {
    if (!on) return;
    const left = document.documentElement.scrollHeight - (scrollY + innerHeight);
    const target = Math.max(0.02, Math.min(1, left / END)) * (now < winkUntil ? 0.05 : 1);
    st.o += (target - st.o) * 0.18; draw();
    requestAnimationFrame(step);
  };
  new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) requestAnimationFrame(step); }).observe($('#contact'));
  $('#contactEmail').addEventListener('pointerenter', () => { pupil.setAttribute('r', 17); winkUntil = performance.now() + 160; });
  $('#contactEmail').addEventListener('pointerleave', () => pupil.setAttribute('r', 13));
})();

// ── Focus: things come into focus as the eye reaches them ──────
// Headings and chart rows sharpen from a blur; screenshots open through a round aperture.
if (!reduce && 'IntersectionObserver' in window) {
  const focusables = $$('.head h2, .words > h2, .writing > h2, .activity-head h2, .check-copy h2, .contact h2');
  const rows = $$('.chart li'), lenses = $$('.lens, .stage, .rule, .ring');
  [...focusables, ...rows].forEach((el) => el.classList.add('pre-focus'));
  lenses.forEach((el) => el.classList.add('pre-aperture'));
  // A shape clipped to nothing never "intersects", so apertures are watched through their parent.
  const watched = new Map(lenses.map((el) => [el.parentElement, el]));
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = watched.get(e.target) || e.target, i = rows.indexOf(el);
    setTimeout(() => el.classList.add(el.classList.contains('pre-aperture') ? 'apertured' : 'focused'), i > 0 ? i * 140 : 0);
    window.dispatchEvent(new CustomEvent('eye:glance', { detail: el }));
  }), { rootMargin: '0px 0px -18% 0px', threshold: 0.2 });
  [...focusables, ...rows, ...watched.keys()].forEach((el) => io.observe(el));
}

// ── Easter egg: type `sudo hire het` anywhere ──────────────────
const HIRE_LINES = [
  ['$ sudo hire het', 'cmd'],
  ['[sudo] password for recruiter: ********', ''],
  ['Checking candidate... 3 years in production, every commit signed', 'ok'],
  ['Running the release ring: test, hygiene, analyze, stage, approve', 'ok'],
  ['Provisioning DevOps Engineer... done', 'ok'],
  ['Attaching on-call pager... done', 'ok'],
  ['Opening a line to patel.x.het@gmail.com', 'go'],
];
let hiring = false;
async function hire() {
  if (hiring) return; hiring = true; track('easter-egg', { egg: 'sudo-hire-het' });
  const box = document.createElement('div');
  box.className = 'hire'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'sudo hire het');
  box.innerHTML = '<div class="hire-term"><div class="hire-bar"><i></i><i></i><i></i><span>het@hetops: ~</span><button type="button" aria-label="Close">Esc</button></div><ol class="hire-out" aria-live="polite"></ol></div>';
  document.body.appendChild(box);
  const out = box.querySelector('.hire-out');
  const close = () => { box.classList.add('out'); setTimeout(() => box.remove(), 300); hiring = false; removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', onKey);
  box.addEventListener('click', (e) => { if (e.target === box || e.target.closest('.hire-bar button')) close(); });
  requestAnimationFrame(() => box.classList.add('in'));
  for (const [text, kind] of HIRE_LINES) {
    if (!box.isConnected) return;
    const li = document.createElement('li'); li.className = kind; out.appendChild(li);
    if (kind === 'cmd' && !reduce) { for (const ch of text) { li.textContent += ch; await new Promise((r) => setTimeout(r, 45)); } }
    else { if (kind === 'ok') li.appendChild(Object.assign(document.createElement('i'), { className: 'ph ph-check' })); li.append(text); }
    await new Promise((r) => setTimeout(r, reduce ? 120 : kind === 'cmd' ? 350 : 520));
  }
  if (!box.isConnected) return;
  location.href = 'mailto:patel.x.het@gmail.com?subject=' + encodeURIComponent("Let's talk (sudo hire het)");
}
let typed = '';
addEventListener('keydown', (e) => {
  if (/INPUT|TEXTAREA/.test(document.activeElement.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length !== 1) return;
  typed = (typed + e.key.toLowerCase()).slice(-13);
  if (typed === 'sudo hire het') { typed = ''; hire(); }
});

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
    if (all) setLive('npmAll', all);
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
