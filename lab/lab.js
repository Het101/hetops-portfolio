// hetops.dev/lab: a live view of the real chaos lab, or the in-browser simulation when the lab is offline.
// Network data only ever reaches the page through textContent and setAttribute, never innerHTML.
import { GROUPS, ACTIONS, tone, livePods, ringLayout, diffSnapshots, probeSummary, verdict, formatMs, refusalText, apiBase } from './core.js';

const API = apiBase(location.search);
const NS = 'http://www.w3.org/2000/svg';
const C = 360; // scene centre
const RINGS = { 'clinic-data': 150, clinic: 270 };
const SHORT = { postgres: 'pg', worker: 'wkr' };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = (s, root = document) => root.querySelector(s);
const scene = $('#lab-scene');
const podsG = $('.lab-pods', scene), dotsG = $('.lab-dots', scene), arc = $('.lab-arc', scene);
const modeEl = $('#lab-mode'), feed = $('#lab-feed'), log = $('#lab-incidents .lab-log');
const stageClock = $('#lab-stage-clock'); // a copy of the clock under the scene, so it stays in view while you scroll the buttons
const timerEl = $('#lab-timer'), targetEl = $('#lab-target'), verdictEl = $('#lab-verdict');

const svgEl = (tag, attrs, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};
const make = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const track = (name, data) => window.umami && window.umami.track(name, data);
const parse = (e) => { try { return JSON.parse(e.data); } catch { return null; } };
const targetText = (s) => (s >= 120 && s % 60 === 0 ? `${s / 60} min` : `${s} s`);

function setMode(state, text) { modeEl.dataset.state = state; modeEl.textContent = text; }

// The iris: fine fibres between the pupil and the inner ring, seeded so every visit draws the same eye.
(function drawIris() {
  const g = $('.lab-iris', scene);
  svgEl('circle', { class: 'lab-collarette', cx: C, cy: C, r: 92 }, g);
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * Math.PI * 2, h = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    // Most fibres stop at the collarette; one in four runs on out towards the limbal ring.
    const r0 = 52 + h * 6, r1 = h > 0.75 ? 160 + (h - 0.75) * 480 : 84 + h * 64;
    svgEl('line', { class: h > 0.75 ? 'lab-fibre lab-fibre-long' : h > 0.5 ? 'lab-fibre lab-fibre-moss' : 'lab-fibre',
      x1: (C + r0 * Math.cos(a)).toFixed(1), y1: (C + r0 * Math.sin(a)).toFixed(1),
      x2: (C + r1 * Math.cos(a)).toFixed(1), y2: (C + r1 * Math.sin(a)).toFixed(1) }, g);
  }
})();

// ── Clock ──────────────────────────────────────────────────────
let skew = 0; // client clock minus server clock, from snapshot.at
let running = null, tick = 0;

function stopTimer() { cancelAnimationFrame(tick); clearInterval(tick); tick = 0; }

function startClock(exp) {
  running = exp;
  const a = ACTIONS[exp.action];
  stopTimer();
  $('.lab-clock-title').textContent = exp.title || exp.action;
  targetEl.textContent = `target ${targetText(a ? a.target : 0)}`;
  targetEl.hidden = !a;
  verdictEl.hidden = true;
  scene.classList.add('lab-busy');
  const draw = () => { timerEl.textContent = formatMs(Math.max(0, Date.now() - skew - exp.startedAt)); stageClock.textContent = `${exp.title || exp.action} · ${timerEl.textContent}`; };
  stageClock.hidden = false;
  draw();
  if (reduce) tick = setInterval(draw, 1000);
  else { const loop = () => { draw(); tick = requestAnimationFrame(loop); }; tick = requestAnimationFrame(loop); }
  if (a) {
    $('.lab-explain').textContent = a.explain;
    const k = $('.lab-kubectl');
    $('code', k).textContent = a.kubectl;
    k.hidden = false;
  }
  setButtons();
}

function finishClock(exp) {
  stopTimer();
  running = null;
  scene.classList.remove('lab-busy');
  const ms = exp.recoveryMs ?? (exp.endedAt ? exp.endedAt - exp.startedAt : Date.now() - skew - exp.startedAt);
  timerEl.textContent = formatMs(ms);
  stageClock.hidden = true;
  const a = ACTIONS[exp.action];
  if (a) {
    const v = verdict(exp);
    verdictEl.textContent = exp.status !== 'recovered' ? v.label
      : v.within ? `healed in ${v.label}, inside the ${targetText(a.target)} target` : `healed in ${v.label}, over the target`;
    verdictEl.className = 'lab-verdict ' + (v.within ? 'lab-ok' : 'lab-down');
    verdictEl.hidden = false;
  }
  addIncident(exp, true);
  if (enabled) say('');
  setButtons();
}

function onExperiment(exp) {
  if (!exp || !exp.action) return;
  if (exp.status === 'running') startClock(exp);
  else if (running && running.id === exp.id) finishClock(exp);
  else addIncident(exp, true);
}

// ── Incidents ──────────────────────────────────────────────────
const ago = (t) => {
  const s = Math.max(0, (Date.now() - skew - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

function addIncident(exp, first) {
  const a = ACTIONS[exp.action];
  if (!a || !exp.startedAt) return;
  const old = log.querySelector(`[data-id="${CSS.escape(String(exp.id))}"]`);
  if (old) old.remove();
  const v = verdict(exp);
  const li = make('li');
  li.dataset.id = exp.id;
  li.dataset.t = exp.endedAt || exp.startedAt;
  li.append(make('span', 'lab-log-title', exp.title || exp.action), make('span', 'lab-log-v ' + (v.within ? 'lab-ok' : 'lab-down'), v.label),
    make('span', 'lab-log-target', `target ${targetText(a.target)}`), make('time', 'lab-log-when', ago(+li.dataset.t)));
  if (first) log.prepend(li); else log.append(li);
  while (log.children.length > 10) log.lastElementChild.remove();
  $('#lab-incidents .lab-empty').hidden = log.children.length > 0;
}

// ── Pods ───────────────────────────────────────────────────────
const nodes = new Map(); // pod name -> { g, circle, title, x, y }
const shortApp = (app) => SHORT[app] ?? String(app || '').slice(0, 4);

function renderPods(snap) {
  const seen = new Set();
  for (const [ns, r] of Object.entries(RINGS)) {
    const data = snap[ns] || { exists: false, pods: [] };
    const gone = data.exists === false;
    $(`.lab-ring[data-ns="${ns}"]`, scene).classList.toggle('lab-gone', gone);
    const label = $(`.lab-ring-label[data-ns="${ns}"]`, scene);
    label.classList.toggle('lab-gone', gone);
    $('textPath', label).textContent = gone ? `${ns}: deleted` : ns;
    for (const p of ringLayout(livePods(data.pods || []), { cx: C, cy: C, r })) {
      seen.add(p.name);
      const t = tone(p);
      let n = nodes.get(p.name);
      if (!n) {
        const g = svgEl('g', { class: 'lab-pod' }, podsG);
        n = { g, title: svgEl('title', {}, g), circle: svgEl('circle', { r: 16 }, g) };
        svgEl('text', { class: 'lab-pod-app', y: 3.5, 'text-anchor': 'middle' }, g).textContent = shortApp(p.app);
        nodes.set(p.name, n);
        // Born at the pupil, then slides out to its ring; never from the SVG's top-left corner.
        g.style.transform = `translate(${C}px, ${C}px)`;
        g.getBoundingClientRect();
      }
      n.g.style.transform = `translate(${p.x}px, ${p.y}px)`;
      n.x = p.x; n.y = p.y; n.app = p.app;
      n.circle.setAttribute('class', 'lab-' + t);
      n.g.dataset.tone = t;
      n.title.textContent = `${p.name} · ${p.state}${p.restarts ? ` · ${p.restarts} restart${p.restarts > 1 ? 's' : ''}` : ''}`;
    }
  }
  for (const [name, n] of nodes) if (!seen.has(name)) { n.g.remove(); nodes.delete(name); }
}

// ── Argo CD ────────────────────────────────────────────────────
function renderArgo(argo) {
  if (!argo) return;
  arc.setAttribute('class', 'lab-arc ' + (argo.sync === 'Synced' ? 'lab-synced' : 'lab-drift'));
  $('#lab-argo-state').textContent = argo.operation === 'Running' ? 'Argo CD: drift detected, reverting' : `Argo CD: ${argo.sync} · ${argo.health}`;
}

// ── Feed ───────────────────────────────────────────────────────
function narrate(lines) {
  for (const l of lines) feed.prepend(make('li', 'lab-' + l.tone, l.text));
  while (feed.children.length > 12) feed.lastElementChild.remove();
}

// ── Requests ───────────────────────────────────────────────────
const shortPod = (name) => { const s = name.split('-'); return s.length > 2 ? `${s[0]}-…${s[s.length - 1]}` : name; };

// Ready api pods right now: the ones a request can actually reach.
const readyApiPods = () => [...nodes.values()].filter((n) => n.app === 'api' && n.g.dataset.tone === 'ok').length;

function onProbes(batch) {
  if (!Array.isArray(batch)) return;
  const s = probeSummary(batch);
  const line = $('#lab-probe-line');
  // Only api pods serve /api/whoami; web, worker and postgres never get these requests, so they get no dots.
  line.textContent = `Last second: ${s.ok} of ${batch.length} requests to /api answered`
    + (s.pods.length ? `, by ${s.pods.length} of the ${readyApiPods()} api pods` : '');
  line.title = s.pods.join(', '); // hover for the pod names
  line.classList.toggle('lab-down', s.failed > 0);
  if (reduce || document.hidden) return;
  // One dot every 200 ms, aimed when it launches: pods may have moved (or been added) since the batch arrived.
  batch.forEach((p, i) => setTimeout(() => fly(p, i, batch.length), i * 200));
}

function fly(p, i, count) {
  if (document.hidden) return;
  const n = p.pod && nodes.get(p.pod);
  const ok = p.ok && n;
  // A failed request heads for the outer ring and dies 40% of the way out.
  const a = n ? Math.atan2(n.y - C, n.x - C) : (i / count) * Math.PI * 2 - Math.PI / 2;
  const dist = n ? Math.hypot(n.x - C, n.y - C) - 18 : 270;
  const end = ok ? dist : 46 + (dist - 46) * 0.4;
  const pt = (r) => `translate(${(C + r * Math.cos(a)).toFixed(1)}px, ${(C + r * Math.sin(a)).toFixed(1)}px)`;
  const dot = svgEl('circle', { r: 4, class: ok ? 'lab-ok' : 'lab-down' }, dotsG);
  dot.style.transform = pt(46);
  const anim = dot.animate(
    [{ transform: pt(46), opacity: 1 }, { transform: pt(end), opacity: ok ? 1 : 0 }],
    { duration: ok ? 650 : 520, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
  anim.onfinish = () => { dot.remove(); if (ok && n.g.isConnected) ping(n); };
  anim.oncancel = () => dot.remove();
}

// The pod that answered gives a small ring: you can see which pod took the request.
function ping(n) {
  const ring = svgEl('circle', { r: 16, class: 'lab-ping' }, n.g);
  ring.animate([{ transform: 'scale(1)', opacity: 0.9 }, { transform: 'scale(1.7)', opacity: 0 }], { duration: 450, easing: 'ease-out' })
    .onfinish = () => ring.remove();
}

// ── Buttons ────────────────────────────────────────────────────
const buttons = [];

function renderActions(list) {
  const wrap = $('#lab-actions .lab-groups');
  wrap.replaceChildren();
  buttons.length = 0;
  for (const grp of GROUPS) {
    const mine = list.filter((x) => ACTIONS[x.id] && ACTIONS[x.id].group === grp.id);
    if (!mine.length) continue;
    const box = make('div', 'lab-group');
    const row = make('div', 'lab-acts');
    box.append(make('h3', null, grp.title), make('p', 'lab-note', grp.note), row);
    for (const x of mine) {
      const b = make('button', 'lab-act', x.title);
      b.type = 'button';
      b.dataset.action = x.id;
      b.title = x.title;
      b.disabled = true;
      if (x.heavy) b.append(make('span', 'lab-heavy', 'heavy'));
      row.append(b);
      buttons.push(b);
    }
    wrap.append(box);
  }
}

// A button works only with a fresh Turnstile token, no experiment running, the kill switch on, and no press in flight.
let token = null, enabled = false, pending = false;
const say = (text) => { $('#lab-say').textContent = text; };

function setButtons() {
  const off = !token || !!running || !enabled || pending;
  for (const b of buttons) b.disabled = off;
}

function loadTurnstile() {
  const el = $('#lab-check');
  const s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  s.async = true;
  s.onload = () => window.turnstile.render('#lab-check', {
    sitekey: el.dataset.sitekey,
    appearance: 'interaction-only',
    callback: (t) => { token = t; setButtons(); },
    'expired-callback': () => { token = null; setButtons(); },
  });
  s.onerror = () => say('The human check could not load, so the buttons are off. You can still watch the cluster.');
  document.head.append(s);
}

async function press(id) {
  if (!token || pending) return;
  pending = true;
  setButtons();
  say('');
  track('lab-break', { action: id });
  try {
    const r = await fetch(API + '/chaos/actions/' + encodeURIComponent(id), {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ turnstileToken: token }),
    });
    if (r.status !== 202) {
      const body = await r.json().catch(() => ({}));
      say(refusalText(body.reason, body.retryAfterMs));
    }
  } catch {
    say(refusalText());
  } finally {
    token = null;
    pending = false;
    if (window.turnstile) window.turnstile.reset('#lab-check');
    setButtons();
  }
}

$('#lab-actions').addEventListener('click', (e) => {
  const b = e.target.closest('button.lab-act');
  if (b && !b.disabled) press(b.dataset.action);
});

// ── Connection ─────────────────────────────────────────────────
let prev = null, live = false;

function enterSim(es) {
  es.close();
  $('#lab-sim').hidden = false;
  $('.lab-lede').textContent = 'The live cluster on my server cannot be reached right now, so here are four of the failures as a simulation in your browser. Come back later to break the real one.';
  setMode('sim', 'Simulation');
  track('lab-sim');
}

async function getJSON(path) {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}

async function enterLive() {
  live = true;
  $('#lab-live').hidden = false;
  setMode('live', 'Live');
  track('lab-live');
  const [actions, incidents, status] = await Promise.allSettled([getJSON('/chaos/actions'), getJSON('/chaos/incidents'), getJSON('/chaos/status')]);
  if (actions.status === 'fulfilled' && Array.isArray(actions.value)) renderActions(actions.value);
  if (incidents.status === 'fulfilled' && Array.isArray(incidents.value)) incidents.value.slice(0, 10).forEach((x) => addIncident(x, false));
  if (status.status === 'fulfilled' && status.value) {
    enabled = status.value.enabled === true;
    const exp = status.value.experiment;
    if (exp && exp.status === 'running' && !running) startClock(exp);
  }
  if (!enabled) say(refusalText('disabled'));
  else loadTurnstile();
  setButtons();
}

function connect() {
  const es = new EventSource(API + '/chaos/stream');
  const giveUp = live ? 0 : setTimeout(() => { if (!live) enterSim(es); }, 5000);
  es.addEventListener('snapshot', (e) => {
    const snap = parse(e);
    if (!snap || !snap.clinic || !snap['clinic-data']) return;
    if (snap.at) skew = Date.now() - snap.at;
    if (!live) { clearTimeout(giveUp); enterLive(); }
    if (modeEl.dataset.state !== 'live') setMode('live', 'Live');
    narrate(diffSnapshots(prev, snap));
    prev = snap;
    renderPods(snap);
    renderArgo(snap.argo);
  });
  es.addEventListener('probes', (e) => onProbes(parse(e)));
  es.addEventListener('experiment', (e) => onExperiment(parse(e)));
  es.addEventListener('error', () => {
    if (!live) { clearTimeout(giveUp); enterSim(es); return; }
    if (es.readyState === EventSource.CONNECTING) setMode('wait', 'Reconnecting…');
    // CLOSED means the browser gave up (an HTTP error, not a dropped connection): try again ourselves.
    else if (es.readyState === EventSource.CLOSED) { setMode('wait', 'Reconnecting…'); setTimeout(connect, 5000); }
  });
}

setInterval(() => { for (const li of log.children) $('time', li).textContent = ago(+li.dataset.t); }, 30000);
connect();
