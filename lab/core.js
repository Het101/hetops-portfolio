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
  hang: { group: 'kubelet', target: 60, kubectl: 'kubectl -n clinic get events --field-selector reason=Unhealthy',
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
    explain: 'A deny-all NetworkPolicy cut every pod off. It was marked as owned by Argo CD but is not in git, so Argo CD pruned it.' },
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

export function ringLayout(pods, { cx, cy, r }) {
  return pods.map((p, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / pods.length;
    return { ...p, x: Math.round(cx + r * Math.cos(a)), y: Math.round(cy + r * Math.sin(a)) };
  });
}

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

export function probeSummary(batch) {
  const ok = batch.filter((p) => p.ok).length;
  return { ok, failed: batch.length - ok, pods: [...new Set(batch.filter((p) => p.ok && p.pod).map((p) => p.pod))].sort() };
}

const REFUSALS = {
  busy: 'Someone else\'s experiment is running. Watch it heal, then try yours.',
  healing: 'The lab is still healing from the last experiment. Give it a moment.',
  'hourly-cap': 'The two heavy experiments are capped at 3 an hour. Try a lighter one.',
  disabled: 'Experiments are paused right now. You can still watch the live cluster.',
  'node-memory': 'The server is short on memory right now. Try again in a minute.',
  turnstile: 'The human check did not pass. Try again.',
  'busy-stream': 'Too many people are watching right now. Try again shortly.',
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
