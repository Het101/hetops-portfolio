// hetops.dev/lab: a live view of the real chaos lab, or the in-browser simulation when the lab is offline.
// Network data only ever reaches the page through textContent and setAttribute, never innerHTML.
import { GROUPS, ACTIONS, tone, diffSnapshots, verdict, formatMs, refusalText, budgetView, costText, apiBase, hueOf, tiers, placePods, planVisit, visitLine, route, cut } from './core.js';

const API = apiBase(location.search);
const NS = 'http://www.w3.org/2000/svg';
const C = 360; // scene centre
// Rings are tiers, the hop a pod serves. The pupil is the ingress and the rings run out in hop order, web, api, data.
const RINGS = { web: 128, api: 204, data: 268 };
const PUPIL = 46;
const SHORT = { postgres: 'pg', worker: 'wkr', 'nightly-report': 'rpt' };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = (s, root = document) => root.querySelector(s);
const scene = $('#lab-scene');
const podsG = $('.lab-pods', scene), dotsG = $('.lab-dots', scene), trailsG = $('.lab-trails', scene), arc = $('.lab-arc', scene);
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

// The tier rings, their labels, and the worker's link to postgres. data-tier picks the tier's colour in CSS.
const ringEls = {};
const link = svgEl('line', { class: 'lab-link' }, $('.lab-rings', scene));
(function drawTiers() {
  const defs = $('defs', scene), g = $('.lab-rings', scene);
  for (const [tier, r] of Object.entries(RINGS)) {
    svgEl('path', { id: `lab-path-${tier}`, d: `M${C - r} ${C} A${r} ${r} 0 1 1 ${C + r} ${C} A${r} ${r} 0 1 1 ${C - r} ${C}` }, defs);
    const ring = svgEl('circle', { class: 'lab-ring', 'data-tier': tier, cx: C, cy: C, r }, g);
    const label = svgEl('text', { class: 'lab-ring-label', 'data-tier': tier, dy: 30 }, g);
    const tp = svgEl('textPath', { href: `#lab-path-${tier}`, startOffset: '3%' }, label);
    tp.textContent = tier;
    ringEls[tier] = { ring, label, tp };
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
  const cost = costText(exp.cost);
  if (cost) narrate([{ text: `This experiment ${cost}.`, tone: 'warn' }]);
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
  const cost = costText(exp.cost);
  if (cost) li.append(make('span', 'lab-log-cost', cost));
  if (first) log.prepend(li); else log.append(li);
  while (log.children.length > 10) log.lastElementChild.remove();
  $('#lab-incidents .lab-empty').hidden = log.children.length > 0;
}

// ── Pods ───────────────────────────────────────────────────────
const nodes = new Map(); // pod name -> { g, circle, title, x, y }
const shortApp = (app) => SHORT[app] ?? String(app || '').slice(0, 4);

const pgNode = () => [...nodes.values()].find((n) => n.app === 'postgres');

function renderPods(snap) {
  const t = tiers(snap);
  for (const [tier, el] of Object.entries(ringEls)) {
    el.ring.classList.toggle('lab-gone', t.gone[tier]);
    el.label.classList.toggle('lab-gone', t.gone[tier]);
    el.tp.textContent = t.gone[tier] ? `${tier}: namespace deleted` : tier;
  }
  const seen = new Set();
  for (const p of placePods(t, RINGS, { cx: C, cy: C })) {
    seen.add(p.name);
    const tn = tone(p);
    let n = nodes.get(p.name);
    if (!n) {
      const g = svgEl('g', { class: 'lab-pod', 'data-tier': hueOf(p) }, podsG);
      n = { g, title: svgEl('title', {}, g), circle: svgEl('circle', { r: 16 }, g) };
      svgEl('text', { class: 'lab-pod-app', y: 3.5, 'text-anchor': 'middle' }, g).textContent = shortApp(p.app);
      nodes.set(p.name, n);
      // Born at the pupil, then slides out to its ring; never from the SVG's top-left corner.
      g.style.transform = `translate(${C}px, ${C}px)`;
      g.getBoundingClientRect();
    }
    n.g.style.transform = `translate(${p.x}px, ${p.y}px)`;
    Object.assign(n, { x: p.x, y: p.y, r: p.r, a: p.a, app: p.app });
    n.circle.setAttribute('class', 'lab-' + tn);
    n.g.dataset.tone = tn;
    n.title.textContent = `${p.name} · ${p.state}${p.restarts ? ` · ${p.restarts} restart${p.restarts > 1 ? 's' : ''}` : ''}`;
  }
  for (const [name, n] of nodes) if (!seen.has(name)) { n.g.remove(); nodes.delete(name); }
  // The worker only ever talks to postgres: a still link with no dots, because nothing measures it.
  const w = [...nodes.values()].find((n) => n.app === 'worker'), pg = pgNode();
  link.style.display = w && pg ? '' : 'none';
  if (w && pg) {
    const d = Math.hypot(pg.x - w.x, pg.y - w.y) || 1, ux = (pg.x - w.x) / d, uy = (pg.y - w.y) / d;
    const ends = { x1: w.x + ux * 18, y1: w.y + uy * 18, x2: pg.x - ux * 18, y2: pg.y - uy * 18 };
    for (const k in ends) link.setAttribute(k, ends[k].toFixed(1));
  }
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

// ── Visits ─────────────────────────────────────────────────────
// Ready api pods right now: the ones a request can actually reach.
const readyApiPods = () => [...nodes.values()].filter((n) => n.app === 'api' && n.g.dataset.tone === 'ok').length;

function onProbes(batch) {
  if (!Array.isArray(batch)) return;
  const line = $('#lab-probe-line');
  // Each part stays on one line when the status wraps on a phone.
  line.textContent = visitLine(batch, readyApiPods()).split(' · ').map((s) => s.replaceAll(' ', ' ')).join(' · ');
  line.title = [...new Set(batch.flatMap((p) => [p.web?.ok && p.web.pod, p.pod]).filter(Boolean))].sort().join(', '); // hover for the pod names
  line.classList.toggle('lab-down', batch.some((p) => !p.ok || (p.web && !p.web.ok)));
  if (reduce || document.hidden) return;
  // One visit every 200 ms; each leg is aimed when it launches, since pods may have moved since the batch arrived.
  batch.forEach((p, i) => setTimeout(() => visit(p, i, batch.length), i * 200));
}

async function visit(p, i, count) {
  for (const leg of planVisit(p, (name) => nodes.has(name))) if (!(await fly(leg, i, count))) return;
}

// A leg's path is spokes and ring arcs, so it reads as moving through the tiers. A pod we cannot aim at (none is
// Ready) gets a spot on its tier's ring, spread by the visit's place in the batch.
function legRoute(leg, i, count) {
  const n = leg.pod && nodes.get(leg.pod), o = { cx: C, cy: C, trim: 18 };
  if (leg.hop === 'db') {
    const pg = pgNode();
    return n && pg ? route({ r: n.r + 18, a: n.a }, { r: pg.r, a: pg.a }, pg.r, o) : null; // out to the data ring, round to postgres
  }
  const to = n ? { r: n.r, a: n.a } : { r: RINGS[leg.hop === 'back' ? 'web' : leg.hop], a: (i / count) * 2 * Math.PI - Math.PI / 2 };
  const pts = route({ r: PUPIL, a: to.a }, to, PUPIL, o);
  return leg.hop === 'back' ? pts.reverse() : pts;
}

const HOP_TIER = { web: 'web', back: 'web', api: 'api', db: 'data' };

// Flies one leg; resolves true when the visit should go on to its next leg.
function fly(leg, i, count) {
  return new Promise((done) => {
    // A page that gets no frames (yet is not document.hidden) would pile up dots: past 60 in flight, skip the leg.
    const full = !document.hidden && dotsG.childElementCount < 60 && legRoute(leg, i, count);
    if (!full) return done(false);
    const pts = leg.ok ? full : cut(full, leg.die); // a failed hop dies part of the way
    let len = 0;
    for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    const duration = Math.min(1000, 220 + len * 0.8), cls = leg.ok ? 'lab-ok' : 'lab-down';
    const tier = HOP_TIER[leg.hop]; // a dot takes the colour of the tier it is heading to; a failure stays red
    // A faint trace of each leg, so the shape of a visit stays readable after its dot has gone.
    if (leg.hop !== 'back') {
      const trail = svgEl('polyline', { class: 'lab-trail ' + cls, 'data-tier': tier, points: pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ') }, trailsG);
      trail.animate([{ opacity: 0.16 }, { opacity: 0 }], { duration: duration + 700, easing: 'ease-out' }).onfinish = () => trail.remove();
    }
    const fade = !leg.ok || leg.hop === 'back'; // the dot dies, or dims on its way back for the next request
    const tf = ([x, y]) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    const dot = svgEl('circle', { r: 4, class: cls, 'data-tier': tier }, dotsG);
    dot.style.transform = tf(pts[0]);
    const anim = dot.animate(pts.map((p, k) => ({ transform: tf(p), opacity: fade ? 1 - (k / (pts.length - 1)) * (leg.ok ? 0.6 : 1) : 1 })),
      { duration, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
    anim.onfinish = () => {
      dot.remove();
      const hit = leg.hop === 'db' ? pgNode() : leg.hop !== 'back' && nodes.get(leg.pod);
      if (leg.ok && hit && hit.g.isConnected) ping(hit);
      done(true);
    };
    anim.oncancel = () => { dot.remove(); done(false); };
  });
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

// The error budget: chaos-api reads it from Prometheus every 30 s. Frozen means the budget is spent and visitor
// experiments are refused (423) until 5% is back.
let frozen = false;
const budgetEl = $('#lab-budget');
function renderBudget(slo) {
  const v = budgetView(slo);
  budgetEl.dataset.state = v.state;
  $('.lab-meter-fill', budgetEl).style.width = `${Math.round(v.meter * 100)}%`;
  $('.lab-meter', budgetEl).setAttribute('aria-valuenow', String(Math.round(v.meter * 100)));
  $('.lab-budget-label', budgetEl).textContent = v.label;
  $('.lab-budget-sli', budgetEl).textContent = v.sli;
  $('.lab-budget-burn', budgetEl).textContent = v.burn;
  const was = frozen;
  frozen = v.state === 'frozen';
  $('#lab-check').hidden = frozen;
  if (frozen) say(refusalText('budget-spent'));
  else if (was && enabled) say('');
  setButtons();
}
$('.lab-budget-why').addEventListener('click', (e) => {
  const help = $('#lab-budget-help');
  help.hidden = !help.hidden;
  e.currentTarget.setAttribute('aria-expanded', String(!help.hidden));
});

// Each visitor waits 60 s between experiments (chaos-api enforces it); show the countdown where it is seen first.
let waitUntil = 0, waitTick = 0;
function startWait(ms) {
  waitUntil = Date.now() + ms;
  const el = $('#lab-wait');
  const draw = () => {
    const left = Math.ceil((waitUntil - Date.now()) / 1000);
    if (left <= 0) { clearInterval(waitTick); el.hidden = true; setButtons(); return; }
    el.textContent = `Your next experiment in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  };
  clearInterval(waitTick);
  el.hidden = false;
  draw();
  waitTick = setInterval(draw, 1000);
  setButtons();
}

function setButtons() {
  const off = !token || !!running || !enabled || pending || frozen || Date.now() < waitUntil;
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
    if (r.status === 202) startWait(60_000);
    else {
      const body = await r.json().catch(() => ({}));
      if (body.reason === 'cooldown') startWait(body.retryAfterMs);
      else say(refusalText(body.reason, body.retryAfterMs));
      if (body.reason === 'budget-spent') { frozen = true; setButtons(); }
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
    if ('slo' in status.value) renderBudget(status.value.slo);
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
  es.addEventListener('slo', (e) => renderBudget(parse(e)));
  es.addEventListener('error', () => {
    if (!live) { clearTimeout(giveUp); enterSim(es); return; }
    if (es.readyState === EventSource.CONNECTING) setMode('wait', 'Reconnecting…');
    // CLOSED means the browser gave up (an HTTP error, not a dropped connection): try again ourselves.
    else if (es.readyState === EventSource.CLOSED) { setMode('wait', 'Reconnecting…'); setTimeout(connect, 5000); }
  });
}

setInterval(() => { for (const li of log.children) $('time', li).textContent = ago(+li.dataset.t); }, 30000);
connect();
