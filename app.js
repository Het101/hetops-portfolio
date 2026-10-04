// hetops.dev: theme, reveal, live stats, analytics. No tokens in this file, ever:
// anything shipped to the browser is readable by every visitor.

// ── Analytics (Umami, self-hosted, cookieless) ──────────────────
// Set both values after deploying Umami on Coolify; until then nothing loads.
const UMAMI_SRC = '';        // e.g. 'https://analytics.hetops.dev/script.js'
const UMAMI_WEBSITE_ID = ''; // from Umami: Settings > Websites > hetops.dev

if (UMAMI_SRC && UMAMI_WEBSITE_ID) {
  const s = document.createElement('script');
  s.defer = true;
  s.src = UMAMI_SRC;
  s.dataset.websiteId = UMAMI_WEBSITE_ID;
  s.dataset.domains = 'hetops.dev'; // local previews never count
  document.head.appendChild(s);
}
// Elements with data-umami-event are tracked by Umami itself. This covers the rest.
const track = (name, data) => { try { window.umami && window.umami.track(name, data); } catch (e) {} };

document.documentElement.classList.add('js');

// ── Theme ───────────────────────────────────────────────────────
const root = document.documentElement;
const toggle = document.getElementById('themeToggle');
const syncIcon = () => {
  toggle.querySelector('i').className = root.dataset.theme === 'light' ? 'ph ph-moon' : 'ph ph-sun';
};
syncIcon();
toggle.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
  try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  syncIcon();
  track('theme-toggle', { theme: root.dataset.theme });
});

// ── Nav border once the hero scrolls away ───────────────────────
const nav = document.querySelector('.nav');
new IntersectionObserver(([e]) => nav.classList.toggle('scrolled', !e.isIntersecting))
  .observe(document.querySelector('.hero'));

// ── Reveal on scroll ────────────────────────────────────────────
const revealer = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); revealer.unobserve(e.target); }
}, { rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('.reveal').forEach((el) => revealer.observe(el));
// Printing never scrolls, so reveal everything first.
addEventListener('beforeprint', () => document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in')));

// ── Read depth: which sections people actually reach ────────────
const seen = new Set();
const depth = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const name = e.target.dataset.section;
    if (e.isIntersecting && !seen.has(name)) { seen.add(name); track('section-view', { section: name }); }
  }
}, { threshold: 0.35 });
document.querySelectorAll('[data-section]').forEach((el) => depth.observe(el));

// ── Copy email ──────────────────────────────────────────────────
const toast = document.getElementById('toast');
document.querySelectorAll('[data-copy]').forEach((btn) => btn.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(btn.dataset.copy); toast.textContent = 'Email copied'; }
  catch (e) { toast.textContent = btn.dataset.copy; }
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}));

// ── Live numbers (public, unauthenticated sources only) ─────────
const ACCOUNTS = ['Het101', 'Hetu29'];
const getJSON = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const setLive = (key, n) => {
  document.querySelectorAll(`[data-live="${key}"]`).forEach((el) => { el.textContent = Number(n).toLocaleString('en-IN'); });
};

getJSON('https://api.npmjs.org/downloads/point/last-month/threadvault')
  .then((d) => { if (d && d.downloads) setLive('npm', d.downloads); });

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
  const total = [...days.values()].reduce((a, b) => a + b, 0);
  const heat = document.getElementById('heatmap');
  if (!days.size) { heat.querySelector('p').textContent = 'Contribution data is unavailable right now.'; return; }
  setLive('contributions', total);

  // Oldest first, padded so each column is one Sunday-to-Saturday week.
  const sorted = [...days.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  const pad = new Date(sorted[0][0]).getUTCDay();
  const level = (n) => (n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 10 ? 3 : 4);
  const cells = Array.from({ length: pad }, () => '<i style="visibility:hidden"></i>');
  for (const [date, n] of sorted) cells.push(`<i data-l="${level(n)}" title="${n} on ${date}"></i>`);
  heat.innerHTML = cells.join('');
})();
