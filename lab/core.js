// Pure logic for the lab console. No DOM here, so `node --test tests/` can check all of it.

export const GROUPS = [
  { id: 'kubernetes', title: 'Kubernetes heals it', note: 'ReplicaSets, StatefulSets, PodDisruptionBudgets, the autoscaler' },
  { id: 'kubelet', title: 'The kubelet heals it', note: 'restarts a sick container inside its pod' },
  { id: 'argo', title: 'Argo CD heals it', note: 'puts the cluster back to what git says' },
];

// Targets are the spec's recovery targets, in seconds.
export const ACTIONS = {
  'kill-pod': { group: 'kubernetes', target: 30, kubectl: 'kubectl -n clinic get pods -l app=api -w',
    explain: 'One api pod was deleted. Its ReplicaSet wants 3, counted 2, and started a replacement. Traffic kept flowing to the other two.' },
  'evict-api': { group: 'kubernetes', target: 90, kubectl: 'kubectl -n clinic get pdb api',
    explain: 'Evictions ask permission first. The PodDisruptionBudget keeps 2 api pods serving, so it let one go and refused the rest (HTTP 429).' },
  'delete-api-pods': { group: 'kubernetes', target: 60, kubectl: 'kubectl -n clinic get rs -l app=api',
    explain: 'A plain delete skips the PodDisruptionBudget. Every api pod went at once, so requests failed until the first replacement was Ready.' },
  crash: { group: 'kubelet', target: 30, kubectl: 'kubectl -n clinic get pods -l app=api',
    explain: 'The process exited. The kubelet restarted the container inside the same pod: watch its restart count go up.' },
  leak: { group: 'kubelet', target: 60, kubectl: 'kubectl -n clinic describe pod -l app=api | grep -A3 "Last State"',
    explain: 'Memory grew until the 256 MiB limit. The kernel killed the container (OOMKilled) and the kubelet started it again.' },
  hang: { group: 'kubelet', target: 90, kubectl: 'kubectl -n clinic get events --field-selector reason=Unhealthy',
    explain: 'The app froze. Its readiness probe failed first, so traffic moved away; then the liveness probe failed and the kubelet restarted it.' },
  'scale-zero': { group: 'argo', target: 120, kubectl: 'kubectl -n argocd get app clinic',
    explain: 'The web tier was scaled to 0 by hand. Git says 2, so Argo CD saw the drift and scaled it back.' },
  'delete-web': { group: 'argo', target: 120, kubectl: 'kubectl -n argocd get app clinic',
    explain: 'The web Deployment was deleted. It still exists in git, so Argo CD recreated it.' },
  'delete-api-svc': { group: 'argo', target: 120, kubectl: 'kubectl -n clinic get endpointslices -l kubernetes.io/service-name=api',
    explain: 'The api Service was deleted: the pods were healthy but nothing could find them. Argo CD recreated the Service from git.' },
  'bad-release': { group: 'argo', target: 180, kubectl: 'kubectl -n clinic rollout status deploy/api',
    explain: 'Someone set an image that does not exist. maxUnavailable: 0 kept the old pods serving while the new one failed, and Argo CD put the image back.' },
  'delete-secret': { group: 'argo', target: 120, kubectl: 'kubectl -n clinic get sealedsecret,secret clinic-db',
    explain: 'The database Secret was deleted. Its encrypted copy still lives in git, so it was decrypted again. Running pods never noticed.' },
  'rogue-netpol': { group: 'argo', target: 180, kubectl: 'kubectl -n clinic get networkpolicy',
    explain: 'The rule that lets traffic reach the api was deleted, so the namespace default-deny blocked every request. Argo CD saw the rule missing from git and put it back.' },
  'kill-postgres': { group: 'kubernetes', target: 120, kubectl: 'kubectl -n clinic-data get pod,pvc',
    explain: 'The database pod was deleted. The StatefulSet brought back postgres-0 with the same name and the same disk, so no data was lost.' },
  'traffic-spike': { group: 'kubernetes', target: 480, kubectl: 'kubectl -n clinic get hpa api -w',
    explain: '90 seconds of heavy requests. CPU rose and the HorizontalPodAutoscaler added api pods (3 to 5); it scales back down a few minutes later.' },
  'nuke-namespace': { group: 'argo', target: 300, kubectl: 'kubectl -n argocd get app clinic -w',
    explain: 'The whole clinic namespace was deleted. Argo CD rebuilt the namespace and everything in it from git. The database lives in clinic-data, untouched.' },
};

const DOWN = /Terminating|Error|CrashLoop|OOMKilled|ImagePull|ErrImage|Evicted/;

export const tone = (pod) => (DOWN.test(pod.state) ? 'down' : pod.ready ? 'ok' : 'starting');

// Finished Job pods (migrations, reports) are history, not the running cluster.
export const livePods = (pods) => pods.filter((p) => p.state !== 'Completed' && p.state !== 'Succeeded');

// Pods spaced evenly round a ring, the first at angle a0 (default 12 o'clock). r and a are kept for routing dots.
export function ringLayout(pods, { cx, cy, r, a0 = -Math.PI / 2 }) {
  return pods.map((p, i) => at(p, { cx, cy }, r, a0 + (2 * Math.PI * i) / pods.length));
}

const at = (p, { cx, cy }, r, a) => ({ ...p, r, a, x: Math.round(cx + r * Math.cos(a)), y: Math.round(cy + r * Math.sin(a)) });

// ── The visit's journey ──
// A visit is three real hops: the page from a web pod, /api/whoami from an api pod, and that pod's query to postgres.
// Pods are drawn by tier, the hop they serve, not by namespace.

const JOBS = new Set(['worker', 'nightly-report', 'migrate']); // background work that only talks to postgres

export const tierOf = (pod) => (pod.app === 'web' ? 'web' : pod.app === 'postgres' || JOBS.has(pod.app) ? 'data' : 'api');

// The colour a pod is drawn in: its tier, except jobs, which sit on the data ring but stay quiet.
export const hueOf = (pod) => (JOBS.has(pod.app) ? 'jobs' : tierOf(pod));

// Live pods by tier, postgres first in data so the worker sits beside it. A tier is gone when its namespace is.
export function tiers(snap) {
  const out = { web: [], api: [], data: [] };
  for (const ns of ['clinic', 'clinic-data']) for (const p of livePods(snap[ns]?.pods ?? [])) out[tierOf(p)].push(p);
  out.data.sort((a, b) => (a.app === 'postgres' ? 0 : 1) - (b.app === 'postgres' ? 0 : 1));
  const clinicGone = snap.clinic?.exists === false;
  out.gone = { web: clinicGone, api: clinicGone, data: snap['clinic-data']?.exists === false };
  return out;
}

// Where each pod sits: rings out from the ingress pupil in hop order, web, api, data.
export function placePods(t, rings, c) {
  return [
    ...ringLayout(t.web, { ...c, r: rings.web }),
    ...ringLayout(t.api, { ...c, r: rings.api }),
    ...t.data.map((p, i) => at(p, c, rings.data, Math.PI / 2 + i * 0.26)), // postgres at 6 o'clock, jobs beside it
  ];
}

// The legs of one visit, in order. known(name) says whether that pod is on screen.
// A failed hop dies 40% of the way; an error an api pod answered (the database is down) dies halfway to postgres.
export function planVisit(p, known) {
  const legs = [];
  if (p.web) {
    const pod = p.web.pod && known(p.web.pod) ? p.web.pod : null;
    if (!p.web.ok) legs.push({ hop: 'web', ok: false, pod, die: 0.4 });
    else if (pod) legs.push({ hop: 'web', ok: true, pod }, { hop: 'back', ok: true, pod });
  }
  const pod = p.pod && known(p.pod) ? p.pod : null;
  if (p.ok) { if (pod) legs.push({ hop: 'api', ok: true, pod }, { hop: 'db', ok: true, pod }); }
  else if (pod) legs.push({ hop: 'api', ok: true, pod }, { hop: 'db', ok: false, pod, die: 0.5 });
  else legs.push({ hop: 'api', ok: false, pod, die: 0.4 });
  return legs;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// "Last second: 5 visits · page 5/5 (2 web pods) · api 5/5 (3 of 3 api pods) · database 5/5"
export function visitLine(batch, readyApi) {
  const parts = [`Last second: ${plural(batch.length, 'visit')}`];
  const pages = batch.filter((p) => p.web).map((p) => p.web);
  if (pages.length) {
    const n = new Set(pages.filter((w) => w.ok && w.pod).map((w) => w.pod)).size;
    parts.push(`page ${pages.filter((w) => w.ok).length}/${pages.length}` + (n ? ` (${plural(n, 'web pod')})` : ''));
  }
  // The api answered when a pod did, whatever the status; the database only counts on a 2xx.
  const answered = batch.filter((p) => p.pod);
  const n = new Set(answered.map((p) => p.pod)).size, of = Math.max(n, readyApi); // a pod can answer the second before the snapshot shows it Ready
  parts.push(`api ${answered.length}/${batch.length}` + (n ? ` (${n} of ${of} api pod${of === 1 ? '' : 's'})` : ''));
  parts.push(answered.length ? `database ${answered.filter((p) => p.ok).length}/${answered.length}` : 'database not reached');
  return parts.join(' · ');
}

// The points a dot follows, about `step` px apart: out or in along its spoke to arcR, round that ring the short way,
// then along the target's spoke. Polar in ({ r, a }), scene coordinates out. trim drops the last px (the pod's edge).
export function route(from, to, arcR, { cx = 0, cy = 0, step = 10, trim = 0 } = {}) {
  const da = ((((to.a - from.a) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const segs = [[from.r, arcR, from.a, from.a], [arcR, arcR, from.a, from.a + da], [arcR, to.r, from.a + da, from.a + da]];
  const xy = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const pts = [xy(from.r, from.a)];
  for (const [r0, r1, a0, a1] of segs) {
    const len = Math.abs(r1 - r0) + arcR * Math.abs(a1 - a0);
    if (len < 0.5) continue;
    const n = Math.ceil(len / step);
    for (let i = 1; i <= n; i++) pts.push(xy(r0 + ((r1 - r0) * i) / n, a0 + ((a1 - a0) * i) / n));
  }
  for (let left = trim; left > 0 && pts.length > 2; pts.pop()) {
    const [[x0, y0], [x1, y1]] = pts.slice(-2);
    left -= Math.hypot(x1 - x0, y1 - y0);
  }
  return pts;
}

// The first fraction f of a route: how far a failed hop gets before it dies.
export const cut = (pts, f) => pts.slice(0, Math.max(2, Math.round((pts.length - 1) * f) + 1));

function diffPods(prev, next, out) {
  const before = new Map(livePods(prev).map((p) => [p.name, p]));
  const after = new Map(livePods(next).map((p) => [p.name, p]));
  for (const name of new Set([...before.keys(), ...after.keys()].sort())) {
    const a = before.get(name), b = after.get(name);
    if (!b) out.push({ text: `${name} is gone`, tone: 'down' });
    else if (!a) out.push({ text: `${name} created: ${b.state}`, tone: tone(b) === 'ok' ? 'ok' : 'warn' });
    else if (b.restarts > a.restarts) out.push({ text: `${name} restarted (${b.lastReason ?? 'exited'})`, tone: 'warn' });
    else if (b.ready && !a.ready) out.push({ text: `${name} is Ready`, tone: 'ok' });
    else if (b.state !== a.state) out.push({ text: `${name}: ${b.state}`, tone: tone(b) === 'down' ? 'down' : 'warn' });
  }
}

// What changed between two snapshots, as lines a visitor can read.
export function diffSnapshots(prev, next) {
  if (!prev) return [];
  const out = [];
  for (const ns of ['clinic', 'clinic-data']) {
    const a = prev[ns], b = next[ns];
    if (a.exists && !b.exists) { out.push({ text: `namespace ${ns} is gone`, tone: 'down' }); continue; }
    if (!a.exists && b.exists) out.push({ text: `namespace ${ns} is back`, tone: 'ok' });
    diffPods(a.pods, b.pods, out);
  }
  if (prev.argo.sync === 'Synced' && next.argo.sync === 'OutOfSync') out.push({ text: 'Argo CD: drift detected, reverting to git', tone: 'warn' });
  if (prev.argo.sync !== 'Synced' && next.argo.sync === 'Synced') out.push({ text: 'Argo CD: back in sync with git', tone: 'ok' });
  return out;
}

const REFUSALS = {
  busy: 'Someone else\'s experiment is running. Watch it heal, then try yours.',
  healing: 'The lab is still healing from the last experiment. Give it a moment.',
  'hourly-cap': 'The two heavy experiments are capped at 3 an hour. Try a lighter one.',
  disabled: 'Experiments are paused right now. You can still watch the live cluster.',
  'node-memory': 'The server is short on memory right now. Try again in a minute.',
  turnstile: 'The human check did not pass. Try again.',
  'busy-stream': 'Too many people are watching right now. Try again shortly.',
  'budget-spent': 'Error budget spent. The lab is frozen until reliability recovers. Reopens as older incidents age out of the 7-day window.',
};

export const refusalText = (reason, retryAfterMs) =>
  reason === 'cooldown' ? `You can break something again in ${Math.ceil(retryAfterMs / 1000)} s.` : REFUSALS[reason] ?? 'That did not work. Try again.';

export function formatMs(ms) {
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
}

export function verdict(exp) {
  if (exp.status !== 'recovered') return { label: 'did not recover in 10 min', within: false };
  return { label: formatMs(exp.recoveryMs), within: exp.recoveryMs <= ACTIONS[exp.action].target * 1000 };
}

export function apiBase(search) {
  const api = new URLSearchParams(search).get('api') ?? '';
  return /^http:\/\/localhost:\d+$/.test(api) ? api : 'https://lab.hetops.dev';
}

// The error budget panel: everything as plain text, set with textContent.
export function budgetView(slo) {
  if (!slo || ![slo.budget, slo.sli7d, slo.burn5m, slo.burn1h].every(Number.isFinite)) return { state: 'none', meter: 0, label: 'Budget unavailable right now', sli: '', burn: '' };
  const x = (n) => `${n.toFixed(1)}×`;
  return {
    state: slo.frozen ? 'frozen' : slo.budget <= 0 ? 'spent' : slo.budget < 0.25 ? 'low' : 'ok',
    meter: Math.max(0, Math.min(1, slo.budget)),
    label: slo.budget <= 0 ? 'Spent: no error budget left this week' : `${Math.round(slo.budget * 100)}% of this week's error budget left`,
    sli: `${(slo.sli7d * 100).toFixed(2)}% of visits good over 7 days · target 99%`,
    // 5 m shows an incident as it happens; otherwise the steadier 1 h pace.
    burn: slo.burn5m >= 2 ? `Burning ${x(slo.burn5m)} right now (1 h: ${x(slo.burn1h)})` : `Burning ${x(slo.burn1h)} budget pace`,
  };
}

export function costText(cost) {
  if (typeof cost !== 'number') return '';
  if (cost === 0) return 'cost no error budget';
  const pct = cost * 100;
  return `cost ${pct < 0.01 ? '<0.01' : pct.toFixed(2)}% of the weekly budget`;
}
