import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, GROUPS, tone, livePods, ringLayout, diffSnapshots, refusalText, formatMs, verdict, apiBase,
  layoutOf, tierOf, tiers, placePods, planVisit, visitLine, route, cut } from '../lab/core.js';

const IDS = ['kill-pod', 'evict-api', 'delete-api-pods', 'crash', 'leak', 'hang', 'scale-zero', 'delete-web', 'delete-api-svc',
  'bad-release', 'delete-secret', 'rogue-netpol', 'kill-postgres', 'traffic-spike', 'nuke-namespace'];

test('every chaos-api action has a group, a target, an explanation and a command', () => {
  assert.deepEqual(Object.keys(ACTIONS), IDS);
  for (const id of IDS) {
    const a = ACTIONS[id];
    assert.ok(GROUPS.some((g) => g.id === a.group), id);
    assert.ok(a.target > 0 && a.explain.length > 20 && a.kubectl.startsWith('kubectl '), id);
  }
  assert.equal(ACTIONS['kill-pod'].target, 30);
  assert.equal(ACTIONS['nuke-namespace'].target, 300);
});

const pod = (name, over = {}) => ({ name, app: name.split('-')[0], state: 'Running', ready: true, restarts: 0, lastReason: null, ...over });

test('tone reads the true state', () => {
  assert.equal(tone(pod('api-a')), 'ok');
  assert.equal(tone(pod('api-a', { ready: false, state: 'ContainerCreating' })), 'starting');
  assert.equal(tone(pod('api-a', { ready: false, state: 'CrashLoopBackOff' })), 'down');
  assert.equal(tone(pod('api-a', { ready: false, state: 'OOMKilled' })), 'down');
  assert.equal(tone(pod('api-a', { ready: false, state: 'ImagePullBackOff' })), 'down');
  assert.equal(tone(pod('api-a', { ready: true, state: 'Terminating' })), 'down');
});

test('finished job pods are not part of the live cluster', () => {
  assert.deepEqual(livePods([pod('api-a'), pod('migrate-x', { state: 'Completed', ready: false })]).map((p) => p.name), ['api-a']);
});

test('ring layout starts at 12 o\'clock and spaces pods evenly', () => {
  const [a, b] = ringLayout([pod('api-a'), pod('api-b')], { cx: 100, cy: 100, r: 50 });
  assert.deepEqual([a.x, a.y], [100, 50]);
  assert.deepEqual([b.x, b.y], [100, 150]);
});

const snap = (pods, argo = { sync: 'Synced', health: 'Healthy', operation: null }, exists = true) =>
  ({ clinic: { exists, pods, deployments: [] }, 'clinic-data': { exists: true, pods: [pod('postgres-0')], deployments: [] }, argo });

test('narration: created, gone, state changes and restarts', () => {
  const prev = snap([pod('api-a'), pod('api-b')]);
  const next = snap([pod('api-a', { restarts: 1, lastReason: 'OOMKilled' }), pod('api-c', { ready: false, state: 'ContainerCreating' })]);
  assert.deepEqual(diffSnapshots(prev, next), [
    { text: 'api-a restarted (OOMKilled)', tone: 'warn' },
    { text: 'api-b is gone', tone: 'down' },
    { text: 'api-c created: ContainerCreating', tone: 'warn' },
  ]);
  assert.deepEqual(diffSnapshots(next, snap([pod('api-a', { restarts: 1 }), pod('api-c')])), [{ text: 'api-c is Ready', tone: 'ok' }]);
});

test('narration: Argo CD drift, revert and a vanished namespace', () => {
  const ok = snap([pod('api-a')]);
  const drift = snap([pod('api-a')], { sync: 'OutOfSync', health: 'Healthy', operation: 'Running' });
  assert.deepEqual(diffSnapshots(ok, drift), [{ text: 'Argo CD: drift detected, reverting to git', tone: 'warn' }]);
  assert.deepEqual(diffSnapshots(drift, ok), [{ text: 'Argo CD: back in sync with git', tone: 'ok' }]);
  const nuked = snap([], ok.argo, false);
  assert.deepEqual(diffSnapshots(ok, nuked)[0], { text: 'namespace clinic is gone', tone: 'down' });
  assert.deepEqual(diffSnapshots(nuked, ok)[0], { text: 'namespace clinic is back', tone: 'ok' });
  assert.deepEqual(diffSnapshots(null, ok), []);
});

test('refusals become plain sentences', () => {
  assert.equal(refusalText('cooldown', 41_200), 'You can break something again in 42 s.');
  assert.match(refusalText('busy'), /Someone else/);
  assert.match(refusalText('healing'), /still healing/);
  assert.match(refusalText('who-knows'), /did not work/);
});

test('times and verdicts', () => {
  assert.equal(formatMs(4104), '4.1 s');
  assert.equal(formatMs(125_000), '2 min 05 s');
  assert.deepEqual(verdict({ action: 'kill-pod', status: 'recovered', recoveryMs: 4104 }), { label: '4.1 s', within: true });
  assert.deepEqual(verdict({ action: 'kill-pod', status: 'recovered', recoveryMs: 31_000 }), { label: '31.0 s', within: false });
  assert.deepEqual(verdict({ action: 'kill-pod', status: 'timeout' }), { label: 'did not recover in 10 min', within: false });
});

test('only a localhost api override is honoured', () => {
  assert.equal(apiBase(''), 'https://lab.hetops.dev');
  assert.equal(apiBase('?api=http://localhost:8787'), 'http://localhost:8787');
  assert.equal(apiBase('?api=https://evil.example'), 'https://lab.hetops.dev');
});

test('layout comes from ?layout=, default a', () => {
  assert.equal(layoutOf(''), 'a');
  assert.equal(layoutOf('?layout=c&api=x'), 'c');
  assert.equal(layoutOf('?layout=zzz'), 'a');
});

test('pods go by tier, not namespace; postgres leads the data tier', () => {
  assert.deepEqual(['web', 'api', 'worker', 'postgres', 'whatever'].map((app) => tierOf({ app })), ['web', 'api', 'data', 'data', 'api']);
  const t = tiers({ clinic: { exists: true, pods: [pod('worker-a'), pod('web-a'), pod('api-a'), pod('migrate-x', { state: 'Completed' })] },
    'clinic-data': { exists: true, pods: [pod('postgres-0')] } });
  assert.deepEqual([t.web, t.api, t.data].map((l) => l.map((p) => p.name)), [['web-a'], ['api-a'], ['postgres-0', 'worker-a']]);
  assert.deepEqual(tiers({ clinic: { exists: false, pods: [] }, 'clinic-data': { exists: true, pods: [] } }).gone, { web: true, api: true, data: false });
});

test('placement: layout a rings out from the pupil, layout c puts postgres in it', () => {
  const t = { web: [pod('web-a'), pod('web-b')], api: [pod('api-a')], data: [pod('postgres-0'), pod('worker-a')] };
  const c = { cx: 0, cy: 0 };
  const a = Object.fromEntries(placePods(t, { id: 'a', rings: { web: 100, api: 200, data: 300 } }, c).map((p) => [p.name, p]));
  assert.deepEqual([a['web-a'].x, a['web-a'].y, a['api-a'].y, a['postgres-0'].y], [0, -100, -200, 300]);
  assert.ok(Math.hypot(a['worker-a'].x - a['postgres-0'].x, a['worker-a'].y - a['postgres-0'].y) < 100, 'worker beside postgres');
  const cc = Object.fromEntries(placePods(t, { id: 'c', rings: { web: 250, api: 175 }, worker: 110 }, c).map((p) => [p.name, p]));
  assert.deepEqual([cc['postgres-0'].x, cc['postgres-0'].y], [0, 0]);
  assert.notEqual(cc['web-a'].x, 0, 'no web pod at 12, where the ingress mark is');
  assert.equal(Math.round(Math.hypot(cc['worker-a'].x, cc['worker-a'].y)), 110);
});

test('a visit: page hop and back, api hop, then postgres', () => {
  const all = () => true;
  const hops = (p, known = all) => planVisit(p, known).map((l) => `${l.hop}:${l.ok ? 'ok' : `dies@${l.die}`}`);
  assert.deepEqual(hops({ ok: true, status: 200, pod: 'api-a', web: { ok: true, pod: 'web-a' } }), ['web:ok', 'back:ok', 'api:ok', 'db:ok']);
  // No web field (today's chaos-api): skip the page hop.
  assert.deepEqual(hops({ ok: true, status: 200, pod: 'api-a' }), ['api:ok', 'db:ok']);
  // No web pods: the page dies, the api call still happens.
  assert.deepEqual(hops({ ok: true, status: 200, pod: 'api-a', web: { ok: false, pod: null } }), ['web:dies@0.4', 'api:ok', 'db:ok']);
  // The api pod answered 503: the database is down.
  assert.deepEqual(hops({ ok: false, status: 503, pod: 'api-a' }), ['api:ok', 'db:dies@0.5']);
  // Nothing answered.
  assert.deepEqual(hops({ ok: false, status: 0, pod: null }), ['api:dies@0.4']);
  assert.deepEqual(hops({ ok: false, status: 503, pod: null }), ['api:dies@0.4']);
  // A pod the page has not drawn yet gets no dot rather than a false red one.
  assert.deepEqual(hops({ ok: true, status: 200, pod: 'api-new', web: { ok: true, pod: 'web-new' } }, () => false), []);
});

test('status line', () => {
  const v = (pod, web, over = {}) => ({ ok: true, status: 200, pod, web, ...over });
  const ok5 = ['api-a', 'api-b', 'api-c', 'api-a', 'api-b'].map((a, i) => v(a, { ok: true, pod: i % 2 ? 'web-a' : 'web-b' }));
  assert.equal(visitLine(ok5, 3), 'Last second: 5 visits · page 5/5 (2 web pods) · api 5/5 (3 of 3 api pods) · database 5/5');
  const down = [v(null, { ok: false, pod: null }, { ok: false, status: 0 }), v('api-a', { ok: true, pod: 'web-a' }, { ok: false, status: 503 })];
  assert.equal(visitLine(down, 1), 'Last second: 2 visits · page 1/2 (1 web pod) · api 0/2 · database 0/1');
  assert.match(visitLine([v('api-a', { ok: true, pod: 'web-a' })], 0), /(1 of 1 api pod)/);
  assert.equal(visitLine([v(null, undefined, { ok: false, status: 0 })], 0), 'Last second: 1 visit · api 0/1 · database not reached');
});

test('a route runs along the spoke, round the ring the short way, and in', () => {
  const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-9;
  const spoke = route({ r: 46, a: 0 }, { r: 120, a: 0 }, 46);
  assert.ok(near(spoke[0], [46, 0]) && near(spoke.at(-1), [120, 0]));
  assert.ok(spoke.every(([, y]) => Math.abs(y) < 1e-9));
  // From 12 o'clock to 3 o'clock is a quarter turn clockwise, not three quarters the other way.
  const arc = route({ r: 300, a: -Math.PI / 2 }, { r: 200, a: 0 }, 300, { step: 5 });
  assert.ok(arc.every(([x]) => x > -1e-9));
  assert.ok(near(arc.at(-1), [200, 0]));
  const trimmed = route({ r: 46, a: 0 }, { r: 146, a: 0 }, 46, { trim: 18 });
  assert.ok(trimmed.at(-1)[0] <= 128 && trimmed.at(-1)[0] >= 118);
  assert.equal(cut(spoke, 0.5).length, Math.round((spoke.length - 1) / 2) + 1);
  assert.equal(cut(spoke, 0).length, 2);
});
