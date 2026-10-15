// The homepage's lab section: three live readings from the real cluster and the hero chip.
// Two plain requests, no stream; if the lab does not answer, the readings stay hidden.
import { apiBase, budgetView, lastRun } from '/lab/core.js';

const API = apiBase(location.search);
const sec = document.getElementById('lab');

async function getJSON(path) {
  const r = await fetch(API + path, { signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}

async function load() {
  const [status, incidents] = await Promise.allSettled([getJSON('/chaos/status'), getJSON('/chaos/incidents')]);
  const st = status.status === 'fulfilled' ? status.value : null;
  const run = incidents.status === 'fulfilled' ? lastRun(incidents.value) : null;
  const live = sec.querySelector('.hl-live');
  if (!st) { live.hidden = true; return; }

  const b = budgetView(st.slo);
  const put = (k, text, state) => { const el = live.querySelector(`[data-k="${k}"]`); el.hidden = !text; el.dataset.state = state || ''; el.querySelector('dd').textContent = text; };
  put('state', st.enabled !== true ? 'Switched off for now' : b.state === 'frozen' || b.state === 'spent' ? 'Frozen: the error budget is spent' : 'Open: pick a failure', st.enabled !== true ? 'off' : b.state === 'frozen' || b.state === 'spent' ? 'bad' : 'ok');
  put('budget', b.state === 'none' ? '' : `${Math.round(b.meter * 100)}%`, b.state === 'ok' ? 'ok' : 'bad');
  put('last', run ? (run.healed ? `${run.title}: healed in ${run.time}` : `${run.title}: did not recover`) : '', run?.healed ? 'ok' : 'bad');
  live.hidden = false;

  const chip = document.querySelector('[data-proof="lab"]');
  if (chip && run?.healed) {
    chip.hidden = false; chip.dataset.state = 'ok';
    chip.querySelector('span').textContent = `· last failure healed in ${run.time}`;
  }
}

// Hovering or focusing a ring lights the rows that guard it, and the other way round.
const rings = [...sec.querySelectorAll('.hl-ring')], rows = [...sec.querySelectorAll('.hl-list li[data-layers]')];
function light(layers) {
  rings.forEach((g) => g.classList.toggle('on', layers.includes(g.dataset.layer)));
  rows.forEach((li) => li.classList.toggle('on', li.dataset.layers.split(' ').some((l) => layers.includes(l))));
}
for (const g of rings) {
  for (const ev of ['pointerenter', 'focus']) g.addEventListener(ev, () => light([g.dataset.layer]));
  for (const ev of ['pointerleave', 'blur']) g.addEventListener(ev, () => light([]));
}
for (const li of rows) {
  li.addEventListener('pointerenter', () => light(li.dataset.layers.split(' ')));
  li.addEventListener('pointerleave', () => light([]));
}

load();
