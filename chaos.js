// hetops.dev "Break production": a small simulated system visitors can break, then watch heal.
// Clearly a simulation; the recoveries mirror how I run real systems.
(() => {
  const root = document.getElementById('chaos'); if (!root) return;
  const svg = root.querySelector('svg'), logEl = root.querySelector('.chaos-log'), btns = [...root.querySelectorAll('[data-break]')];
  const mAvail = root.querySelector('[data-m="avail"]'), mErr = root.querySelector('[data-m="err"]'), mLat = root.querySelector('[data-m="lat"]'), mTime = root.querySelector('[data-m="mttr"]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };

  // Layout in a 720x380 box: users -> load balancer -> pods -> database.
  const P = { users: [70, 190], lb: [230, 190], db: [640, 190] };
  const podY = [70, 130, 190, 250, 310], NAMES = ['pod-4', 'pod-1', 'pod-2', 'pod-3', 'pod-5'];
  const state = { pods: [], cert: 57, release: 'v42', traffic: 1, certBad: false };
  const wires = el('g', { class: 'c-wires' }), dots = el('g', { class: 'c-dots' }), nodes = el('g', { class: 'c-nodes' });
  const node = (x, y, label, sub, cls) => {
    const g = el('g', { class: 'c-node ' + (cls || ''), transform: `translate(${x} ${y})` }, nodes);
    el('rect', { x: -52, y: -24, width: 104, height: 48, rx: 24 }, g);
    const t = el('text', { y: -2, 'text-anchor': 'middle', class: 'c-label' }, g); t.textContent = label;
    const s = el('text', { y: 14, 'text-anchor': 'middle', class: 'c-sub' }, g); s.textContent = sub;
    return { g, sub: s };
  };
  const users = node(...P.users, 'Users', 'traffic x1', 'users');
  const lb = node(...P.lb, 'Load balancer', 'TLS 57d', 'lb');
  node(...P.db, 'Postgres', 'primary', 'db');
  const wire = (a, b) => el('path', { d: `M${a[0]} ${a[1]} C ${(a[0] + b[0]) / 2} ${a[1]}, ${(a[0] + b[0]) / 2} ${b[1]}, ${b[0]} ${b[1]}` }, wires);
  const wUsers = wire(P.users, P.lb);
  function addPod(i, ver = state.release) {
    const pos = [440, podY[i]];
    const n = node(...pos, NAMES[i], ver, 'pod');
    const pod = { i, up: true, ver, n, pos, inWire: wire(P.lb, pos), outWire: wire(pos, P.db), weight: 1 };
    state.pods[i] = pod; return pod;
  }
  [1, 2, 3].forEach((i) => addPod(i));
  const setPod = (pod, cls, sub) => { pod.n.g.setAttribute('class', 'c-node pod ' + cls); if (sub) pod.n.sub.textContent = sub; };

  // Requests: dots ride the wires. A request to a down pod or through a dead cert turns red.
  const live = [];
  function send() {
    const ups = state.pods.filter((p) => p && p.weight > 0);
    const target = ups.length ? ups[Math.floor(Math.random() * ups.length)] : null;
    const bad = state.certBad || !target || !target.up || (target.ver !== 'v42' && Math.random() < 0.6);
    const c = el('circle', { r: 4, class: bad ? 'bad' : 'ok' }, dots);
    live.push({ c, legs: state.certBad || !target ? [wUsers] : [wUsers, target.inWire, ...(bad ? [] : [target.outWire])], leg: 0, t: 0, bad });
  }
  let acc = 0, last = performance.now(), errWindow = [];
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    acc += dt * 7 * state.traffic;
    while (acc >= 1) { acc -= 1; send(); }
    for (let k = live.length - 1; k >= 0; k--) {
      const d = live[k], path = d.legs[d.leg], len = path.getTotalLength();
      d.t += (dt * 420) / len;
      if (d.t >= 1) {
        d.leg++; d.t = 0;
        if (d.leg >= d.legs.length) { errWindow.push(d.bad ? 1 : 0); if (errWindow.length > 60) errWindow.shift(); d.c.remove(); live.splice(k, 1); continue; }
      }
      const pt = d.legs[d.leg].getPointAtLength(d.t * d.legs[d.leg].getTotalLength());
      d.c.setAttribute('cx', pt.x); d.c.setAttribute('cy', pt.y);
    }
    const err = errWindow.length ? errWindow.reduce((a, b) => a + b, 0) / errWindow.length : 0;
    const ups = state.pods.filter((p) => p && p.up).length || 1;
    mErr.textContent = (err * 100).toFixed(1) + '%';
    mAvail.textContent = (100 - err * 100).toFixed(err ? 1 : 2) + '%';
    mLat.textContent = Math.round(80 + Math.max(0, state.traffic * 3 / ups - 1) * 520) + ' ms';
    root.classList.toggle('alarm', err > 0.05);
    if (running) mTime.textContent = ((now - started) / 1000).toFixed(1) + 's';
    requestAnimationFrame(tick);
  }
  if (!reduce) requestAnimationFrame(tick);

  // Incident log.
  const log = (text, kind = '') => {
    const li = document.createElement('li'); li.className = kind;
    const t = running ? ((performance.now() - started) / 1000).toFixed(1) + 's' : '';
    li.innerHTML = `<time>${t}</time><span></span>`; li.lastChild.textContent = text;
    logEl.prepend(li); while (logEl.children.length > 7) logEl.lastChild.remove();
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let running = false, started = 0;
  const begin = (title) => { running = true; started = performance.now(); btns.forEach((b) => { b.disabled = true; }); log(title, 'alert'); };
  const end = (msg) => { log(msg, 'ok'); running = false; btns.forEach((b) => { b.disabled = false; b.classList.remove('running'); }); window.umami && window.umami.track('chaos-resolved'); };

  const SCENARIOS = {
    async pod() {
      const pod = state.pods[3];
      begin('ALERT  pod-3 CrashLoopBackOff, 1 in 3 requests failing');
      pod.up = false; setPod(pod, 'down', 'CrashLoop');
      await wait(1400); pod.weight = 0; setPod(pod, 'down drained', 'out of rotation'); log('Readiness probe fails; the load balancer stops sending it traffic');
      await wait(2200); setPod(pod, 'starting', 'restarting'); log('Kubernetes restarts the container (liveness probe)');
      await wait(1600); pod.up = true; pod.weight = 1; setPod(pod, '', state.release); log('pod-3 ready, back in rotation');
      end(`Resolved in ${((performance.now() - started) / 1000).toFixed(1)}s with no one paged.`);
    },
    async spike() {
      begin('ALERT  traffic x4, p95 latency over 600 ms');
      state.traffic = 4; users.sub.textContent = 'traffic x4';
      await wait(1800); log('Autoscaler: CPU above target, scaling 3 to 5 pods');
      await wait(700); addPod(0); await wait(400); addPod(4);
      await wait(1600); log('Latency back under 150 ms at x4 traffic');
      await wait(2200); state.traffic = 1; users.sub.textContent = 'traffic x1';
      log('Traffic normal; scale-down after the cooldown');
      [0, 4].forEach((i) => { const p = state.pods[i]; p.n.g.remove(); p.inWire.remove(); p.outWire.remove(); state.pods[i] = null; });
      end(`Absorbed in ${((performance.now() - started) / 1000).toFixed(1)}s without dropping a request.`);
    },
    async cert() {
      begin('ALERT  TLS certificate expired, every request rejected');
      state.certBad = true; lb.g.setAttribute('class', 'c-node lb down'); lb.sub.textContent = 'TLS expired';
      await wait(1300); log('DNS Intelligence watch: certificate expiry on the domain');
      await wait(1700); log('Certificate renewed and reloaded on the load balancer');
      state.certBad = false; lb.g.setAttribute('class', 'c-node lb'); lb.sub.textContent = 'TLS 90d';
      await wait(900); log('Next time the alert fires 30 days early, before anyone notices');
      end(`Resolved in ${((performance.now() - started) / 1000).toFixed(1)}s.`);
    },
    async release() {
      const pod = state.pods[1];
      begin('Deploy v43 as a canary on pod-1');
      pod.ver = 'v43'; setPod(pod, 'canary', 'v43 canary');
      await wait(1500); log('Canary analysis: error rate 7% against a 1% budget', 'alert');
      await wait(1500); pod.ver = 'v42'; setPod(pod, '', 'v42'); log('GitOps rollback to v42; v43 never reaches the other pods');
      await wait(800);
      end(`Bad release stopped in ${((performance.now() - started) / 1000).toFixed(1)}s, before 25% of traffic saw it.`);
    },
  };
  btns.forEach((b) => b.addEventListener('click', () => { if (!running) { SCENARIOS[b.dataset.break](); b.classList.add('running'); window.umami && window.umami.track('chaos-' + b.dataset.break); } }));
  log('All systems normal. Pick something to break.', 'ok');
})();
