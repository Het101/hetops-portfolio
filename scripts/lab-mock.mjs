// A fake chaos-api for building the console without the cluster: node scripts/lab-mock.mjs, then open /lab/?api=http://localhost:8787
import { createServer } from 'node:http';

const ids = ['kill-pod', 'evict-api', 'delete-api-pods', 'crash', 'leak', 'hang', 'scale-zero', 'delete-web', 'delete-api-svc',
  'bad-release', 'delete-secret', 'rogue-netpol', 'kill-postgres', 'traffic-spike', 'nuke-namespace'];
const titles = ['Kill a pod', 'Evict every API pod', 'Delete every API pod', 'Crash the process', 'Memory leak', 'Hang the app',
  'Scale the web tier to 0', 'Delete the web Deployment', 'Delete the api Service', 'Ship a bad release by hand',
  'Delete the database Secret', 'Delete the api network allow rule', 'Kill Postgres', 'Traffic spike', 'Nuke the clinic namespace'];
const heavy = new Set(['traffic-spike', 'nuke-namespace']);
// node scripts/lab-mock.mjs [ok|frozen|none]: the error budget state to show.
const sloMode = process.argv[2] ?? 'ok';
const slo = { budget: sloMode === 'frozen' ? -0.04 : 0.71, sli7d: sloMode === 'frozen' ? 0.9896 : 0.99712, burn5m: 0.3, burn1h: 0.3, frozen: sloMode === 'frozen' };
const sloNow = () => (sloMode === 'none' ? null : { ...slo });

let n = 0;
const mk = (app) => ({ name: `${app}-7f9c${(n++).toString(36).padStart(3, '0')}`, app, state: 'Running', ready: true, restarts: 0, lastReason: null });
const state = { pods: [mk('api'), mk('api'), mk('api'), mk('web'), mk('web'), mk('worker')], exists: true, argo: 'Synced', running: null, pg: 'Running' };
const incidents = [];
const clients = new Set();

const snapshot = () => ({
  at: Date.now(),
  clinic: { exists: state.exists, pods: state.exists ? state.pods : [], deployments: [] },
  'clinic-data': { exists: true, pods: [{ name: 'postgres-0', app: 'postgres', state: state.pg, ready: state.pg === 'Running', restarts: 0, lastReason: null }], deployments: [] },
  argo: { sync: state.argo, health: state.argo === 'Synced' ? 'Healthy' : 'Progressing', operation: state.argo === 'Synced' ? null : 'Running' },
});
const send = (event, data) => { for (const res of clients) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// A rough imitation of each healing, enough to see every state the page draws.
async function play(id, exp) {
  const victim = state.pods.find((p) => p.app === 'api');
  if (id === 'kill-postgres') { state.pg = 'Terminating'; await wait(1500); state.pg = 'ContainerCreating'; await wait(2500); state.pg = 'Running'; }
  else if (id === 'traffic-spike') { // the autoscaler adds two api pods, then scales back down
    const extra = [mk('api'), mk('api')].map((p) => Object.assign(p, { ready: false, state: 'ContainerCreating' }));
    state.pods.push(...extra); await wait(3000);
    for (const p of extra) Object.assign(p, { ready: true, state: 'Running' }); await wait(6000);
    for (const p of extra) p.state = 'Terminating'; await wait(1500);
    state.pods = state.pods.filter((p) => !extra.includes(p));
  }
  else if (id === 'nuke-namespace') { state.exists = false; state.argo = 'OutOfSync'; await wait(6000); state.exists = true; state.argo = 'Synced'; }
  else if (['scale-zero', 'delete-web', 'delete-api-svc', 'bad-release', 'delete-secret', 'rogue-netpol'].includes(id)) {
    if (id === 'scale-zero' || id === 'delete-web') state.pods = state.pods.filter((p) => p.app !== 'web');
    state.argo = 'OutOfSync'; await wait(4000);
    if (!state.pods.some((p) => p.app === 'web')) state.pods.push({ ...mk('web'), ready: false, state: 'ContainerCreating' }, { ...mk('web'), ready: false, state: 'ContainerCreating' });
    state.argo = 'Synced';
  } else if (['crash', 'leak', 'hang'].includes(id)) {
    Object.assign(victim, { ready: false, state: id === 'hang' ? 'Running' : 'CrashLoopBackOff' }); await wait(3000);
    Object.assign(victim, { ready: true, state: 'Running', restarts: victim.restarts + 1, lastReason: id === 'leak' ? 'OOMKilled' : 'Error' });
  } else {
    const gone = id === 'delete-api-pods' ? state.pods.filter((p) => p.app === 'api') : [victim];
    for (const p of gone) p.state = 'Terminating';
    await wait(1500);
    state.pods = state.pods.filter((p) => !gone.includes(p));
    state.pods.push(...gone.map(() => ({ ...mk('api'), ready: false, state: 'ContainerCreating' })));
  }
  await wait(2500);
  for (const p of state.pods) Object.assign(p, { ready: true, state: 'Running' });
  Object.assign(exp, { status: 'recovered', recoveryMs: Date.now() - exp.startedAt, endedAt: Date.now() });
  exp.cost = id === 'nuke-namespace' ? 0.0193 : id === 'kill-postgres' ? 0.0122 : 0.0011;
  slo.budget -= exp.cost; slo.burn5m = 12.5; slo.burn1h = 1.0;
  setTimeout(() => { slo.burn5m = 0.3; slo.burn1h = 0.4; }, 20_000);
  incidents.unshift({ ...exp });
  state.running = null;
  send('experiment', exp);
}

setInterval(() => send('snapshot', snapshot()), 1000);
setInterval(() => send('slo', sloNow()), 5000); // the real chaos-api sends every 30 s; faster here to see changes
// Each visit: the page from a web pod (round-robin, like the Service), then /api/whoami, which reads postgres.
let visits = 0;
setInterval(() => {
  const ready = (app) => (state.exists ? state.pods.filter((p) => p.app === app && p.ready && p.state === 'Running') : []);
  const api = ready('api'), web = ready('web');
  send('probes', Array.from({ length: 5 }, (_, i) => {
    const w = web[visits++ % (web.length || 1)];
    const page = { ok: !!w, pod: w ? w.name : null };
    const pod = api[i % (api.length || 1)];
    if (!pod) return { at: Date.now(), ok: false, status: 0, pod: null, ms: 1000, web: page };
    // With postgres down the api pod still answers, with a 503.
    return state.pg === 'Running' ? { at: Date.now(), ok: true, status: 200, pod: pod.name, ms: 4, web: page }
      : { at: Date.now(), ok: false, status: 503, pod: pod.name, ms: 6, web: page };
  }));
}, 1000);

createServer((req, res) => {
  const json = (code, body) => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(body)); };
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET, POST' }); return res.end(); }
  if (req.url === '/chaos/stream') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'access-control-allow-origin': '*' });
    res.write(`event: snapshot\ndata: ${JSON.stringify(snapshot())}\n\n`);
    res.write(`event: slo
data: ${JSON.stringify(sloNow())}

`);
    clients.add(res); req.on('close', () => clients.delete(res)); return;
  }
  if (req.url === '/chaos/actions') return json(200, ids.map((id, i) => ({ id, title: titles[i], heavy: heavy.has(id) })));
  if (req.url === '/chaos/incidents') return json(200, incidents);
  if (req.url === '/chaos/status') return json(200, { enabled: true, experiment: state.running, slo: sloNow() });
  const m = req.url.match(/^\/chaos\/actions\/([a-z-]+)$/);
  if (req.method === 'POST' && m) {
    if (!ids.includes(m[1])) return json(404, { reason: 'unknown-action' });
    if (sloNow()?.frozen) return json(423, { ok: false, reason: 'budget-spent' });
    if (state.running) return json(409, { reason: 'busy' });
    const exp = { id: crypto.randomUUID(), action: m[1], title: titles[ids.indexOf(m[1])], startedAt: Date.now(), status: 'running' };
    state.running = exp; send('experiment', exp); play(m[1], exp);
    return json(202, exp);
  }
  json(404, { error: 'not found' });
}).listen(8787, () => console.log('mock chaos-api on http://localhost:8787'));
