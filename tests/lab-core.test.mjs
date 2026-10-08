import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, GROUPS, tone, livePods, ringLayout, diffSnapshots, probeSummary, refusalText, formatMs, verdict, apiBase } from '../lab/core.js';

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

test('probe summary', () => {
  assert.deepEqual(probeSummary([{ ok: true, pod: 'api-a' }, { ok: true, pod: 'api-b' }, { ok: true, pod: 'api-a' }, { ok: false, pod: null }]),
    { ok: 3, failed: 1, pods: ['api-a', 'api-b'] });
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
