// hetops.dev effects lab: three signature moments to compare, switched by ?fx=xray|pupil|iris.
// Without the parameter nothing here runs, so the live site is unchanged.
(() => {
  const fx = new URLSearchParams(location.search).get('fx');
  if (!fx) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  document.documentElement.dataset.fx = fx;

  // Switcher: only exists while comparing.
  const sw = document.createElement('nav');
  sw.className = 'fx-switch'; sw.setAttribute('aria-label', 'Compare effects');
  sw.innerHTML = [['xray', 'X-ray vision'], ['pupil', 'Through the pupil'], ['iris', 'Living iris'], ['', 'Off']]
    .map(([k, l]) => `<a href="${k ? '?fx=' + k : location.pathname}"${k === fx ? ' aria-current="true"' : ''}>${l}</a>`).join('');
  document.body.appendChild(sw);

  // ── A. X-ray vision: the cursor sees the infrastructure under each section ─
  if (fx === 'xray' && fine && !reduce) {
    const LAYERS = {
      top: { label: 'Dockerfile', code: `FROM nginx:alpine

COPY index.html styles.css app.js eye3d.js intro.js robots.txt sitemap.xml Het_Patel_Resume.pdf \\
     favicon.ico favicon.svg apple-touch-icon.png icon-192.png icon-512.png site.webmanifest /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# deployed by Coolify on one Oracle Cloud ARM machine, behind Traefik` },
      experience: { label: 'git log --oneline', code: `$ git -C hetops-dns log --oneline
064e0a2 feat(api): allow the portfolio's live domain check (no credentials)
b025ffd chore: fold Domain Watch into DNS Intelligence Pro and Team (#30)
4ff227e feat: SPF checker page; a DNS failure is not a missing record (#29)
d6d7d55 feat(spf): count DNS lookups through nested includes, as receivers do (#26)
2421203 fix(security): CodeQL triage: SSRF, ReDoS, escaping, dead code (#25)

$ git -C retirement-radar log --oneline
5b8b2bb chore(release): 0.3.0 (#10)
6444382 feat: ElastiCache, OpenSearch and MSK; dates re-checked against AWS (#9)
513ec7e ci: add CI, CodeQL, Scorecard and a staged npm release workflow

$ git -C hetops-portfolio log --oneline
76ae375 feat: intro eye that lands in the hero, and an eye that keeps watching (#16)
b52f6d4 feat: 3D eye hero with orbiting tools, results and stack (#15)` },
      'how-i-ship': { label: '.github/workflows/ci.yml', code: `name: ci
on:
  push:
    branches: [main]
  pull_request:

# Least privilege by default. A job that needs more asks for it explicitly.
permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20, 22, 24]
    steps:
      - uses: step-security/harden-runner@e14015d583714f6e62063499dc959a02595150a1 # v2.21.1
        with:
          egress-policy: audit
      # Actions are pinned to commit SHAs, not tags. A tag is mutable.
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7
        with:
          persist-credentials: false
      - run: npm ci
      - run: npm run lint
      - run: npm test` },
      check: { label: 'POST /api/email-security', code: `$ curl -s https://dns.hetops.dev/api/email-security \\
    -H 'content-type: application/json' -d '{"domain":"github.com"}'
{
  "spf": {
    "present": true,
    "lookups": { "count": 10, "limit": 10 }
  },
  "dmarc": {
    "present": true,
    "policy": "quarantine"
  }
}
# 10 of 10: one more include and SPF fails for every receiver` },
    };
    const layers = [];
    for (const [id, l] of Object.entries(LAYERS)) {
      const sec = document.getElementById(id); if (!sec) continue;
      sec.classList.add('xray-host');
      const layer = document.createElement('div');
      layer.className = 'xray-layer'; layer.setAttribute('aria-hidden', 'true');
      // Repeat the file until it fills the section, like a wall of source behind the page.
      const pre = document.createElement('pre'); pre.textContent = Array(6).fill(l.code).join('\n\n');
      layer.appendChild(pre); sec.appendChild(layer);
      layers.push({ sec, layer, label: l.label });
    }
    const ring = document.createElement('div'); ring.className = 'xray-ring'; ring.innerHTML = '<span></span>';
    document.body.appendChild(ring);
    let raf = 0, ev = null;
    addEventListener('pointermove', (e) => { ev = e; if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
    function paint() {
      raf = 0;
      let hit = null;
      for (const L of layers) {
        const r = L.sec.getBoundingClientRect();
        const inside = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
        L.layer.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
        L.layer.style.setProperty('--my', (ev.clientY - r.top) + 'px');
        L.layer.classList.toggle('on', inside);
        if (inside) hit = L;
      }
      ring.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px)`;
      ring.classList.toggle('on', !!hit);
      if (hit) ring.firstChild.textContent = hit.label;
    }
  }

  // ── B. Through the pupil: every jump goes through the eye ──────
  if (fx === 'pupil' && !reduce) {
    const veil = document.createElement('div'); veil.className = 'pupil-veil'; veil.setAttribute('aria-hidden', 'true');
    const rim = document.createElement('div'); rim.className = 'pupil-rim'; rim.setAttribute('aria-hidden', 'true');
    document.body.append(veil, rim);
    const origin = () => {
      const b = document.getElementById('eyeBody').getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    };
    let busy = false;
    window.HETOPS = window.HETOPS || {};
    window.HETOPS.navigate = async (id) => {
      const el = document.getElementById(id); if (!el || busy) return;
      busy = true;
      const R = Math.hypot(innerWidth, innerHeight);
      const grow = (o, from, to, ms, ease) => Promise.all([
        veil.animate([{ clipPath: `circle(${from}px at ${o.x}px ${o.y}px)` }, { clipPath: `circle(${to}px at ${o.x}px ${o.y}px)` }], { duration: ms, easing: ease, fill: 'forwards' }).finished,
        rim.animate([{ transform: `translate(${o.x}px, ${o.y}px) translate(-50%, -50%) scale(${Math.max(from, 1) / 100})` }, { transform: `translate(${o.x}px, ${o.y}px) translate(-50%, -50%) scale(${Math.max(to, 1) / 100})` }], { duration: ms, easing: ease, fill: 'forwards' }).finished,
      ]);
      veil.classList.add('on'); rim.classList.add('on');
      await grow(origin(), 0, R, 520, 'cubic-bezier(0.7, 0, 0.84, 0)');
      el.scrollIntoView({ behavior: 'instant', block: 'start' });
      await new Promise((r) => setTimeout(r, 140));
      await grow(origin(), R, 0, 620, 'cubic-bezier(0.16, 1, 0.3, 1)');
      veil.classList.remove('on'); rim.classList.remove('on');
      busy = false;
    };
  }
})();
