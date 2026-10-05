// hetops.dev "Inside the eye": scrolling flies a camera through the iris into four stops,
// each one real work: multi-cloud clusters, the release pipeline, cost automation, Threadvault.
// Without WebGL or with reduced motion, the captions show as a plain list instead.
import * as THREE from 'three';

const section = document.getElementById('inside');
const canvas = document.getElementById('insideCanvas');
const caps = [...section.querySelectorAll('.inside-cap')];
const counter = document.getElementById('insideCounter');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 760px)').matches;

let renderer = null;
if (!reduce) { try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: false, powerPreference: 'high-performance' }); } catch (e) { renderer = null; } }

if (!renderer) {
  section.classList.add('static');
} else {
  section.classList.add('live');
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.25 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x08090a, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x08090a, 0.022);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.PointLight(0xf0bd5e, 60, 60, 1.6); scene.add(key);
  const GOLD = new THREE.Color(0xe3a944), MOSS = new THREE.Color(0x45b88d), RED = new THREE.Color(0xef7a64), DIM = new THREE.Color(0x151819);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // ── Entrance: an iris you fly through, then a tunnel of fibres ─
  const irisCanvas = document.createElement('canvas'); irisCanvas.width = irisCanvas.height = 1024;
  {
    const g = irisCanvas.getContext('2d'), R = 512; g.translate(R, R);
    for (let i = 0; i < 2600; i++) {
      const a = rnd() * Math.PI * 2, r0 = R * 0.2, r1 = R * (0.55 + rnd() * 0.44);
      g.strokeStyle = rnd() < 0.55 ? `rgba(240,190,96,${(0.2 + rnd() * 0.5).toFixed(2)})` : `rgba(110,210,165,${(0.18 + rnd() * 0.45).toFixed(2)})`;
      g.lineWidth = 1 + rnd() * 2.2; g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a + (rnd() - 0.5) * 0.06) * r1, Math.sin(a + (rnd() - 0.5) * 0.06) * r1); g.stroke();
    }
  }
  const irisTex = new THREE.CanvasTexture(irisCanvas); irisTex.colorSpace = THREE.SRGBColorSpace;
  const iris = new THREE.Mesh(new THREE.RingGeometry(1.6, 9, 128), new THREE.MeshBasicMaterial({ map: irisTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  iris.position.z = 2; scene.add(iris);
  const tunnelPts = [], tunnelCol = [];
  for (let i = 0; i < (small ? 1400 : 3200); i++) {
    const a = rnd() * Math.PI * 2, r = 3 + rnd() * 5, z = -rnd() * 62, len = 0.6 + rnd() * 3.2, tw = (rnd() - 0.5) * 0.08;
    tunnelPts.push(Math.cos(a) * r, Math.sin(a) * r, z, Math.cos(a + tw) * r * 1.02, Math.sin(a + tw) * r * 1.02, z - len);
    const c = rnd() < 0.55 ? GOLD : MOSS, f = 0.4 + rnd() * 0.6;
    tunnelCol.push(c.r * f, c.g * f, c.b * f, c.r * f * 0.3, c.g * f * 0.3, c.b * f * 0.3);
  }
  const tunnelGeo = new THREE.BufferGeometry();
  tunnelGeo.setAttribute('position', new THREE.Float32BufferAttribute(tunnelPts, 3)); tunnelGeo.setAttribute('color', new THREE.Float32BufferAttribute(tunnelCol, 3));
  scene.add(new THREE.LineSegments(tunnelGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));

  // ── Stop 1: three clouds, a grid of pods each; one region fails over ─
  const CL = new THREE.Vector3(0, -2, -96), clusters = [];
  const box = new THREE.BoxGeometry(0.55, 0.55, 0.55);
  ['AWS', 'GCP', 'Azure'].forEach((name, k) => {
    const g = new THREE.Group(); g.position.set(CL.x + (k - 1) * 13, CL.y, CL.z); scene.add(g);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.4, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0x111416, roughness: 0.6, metalness: 0.3, emissive: 0x0d1a14, emissiveIntensity: 0.6 }));
    g.add(plat);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(plat.geometry), new THREE.LineBasicMaterial({ color: 0x45b88d, transparent: true, opacity: 0.6 }));
    g.add(edge);
    const pods = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial(), 25);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 25; i++) { m.makeTranslation(((i % 5) - 2) * 1.4, 0.5, (Math.floor(i / 5) - 2) * 1.4); pods.setMatrixAt(i, m); pods.setColorAt(i, MOSS); }
    g.add(pods); clusters.push({ g, pods, edge, name });
  });

  // ── Stop 2: the release track with five gates ────────────────
  const PZ = -152, gatesX = [-16, -8, 0, 8, 16], gates = [];
  const track = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 52, 12), new THREE.MeshStandardMaterial({ color: 0x2a2416, emissive: 0xe3a944, emissiveIntensity: 0.35 }));
  track.rotation.z = Math.PI / 2; track.position.set(0, 0, PZ); scene.add(track);
  gatesX.forEach((x) => {
    const gate = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.09, 12, 64), new THREE.MeshStandardMaterial({ color: 0x222, emissive: 0x45b88d, emissiveIntensity: 0.2 }));
    gate.rotation.y = Math.PI / 2; gate.position.set(x, 0, PZ); scene.add(gate); gates.push(gate);
  });
  const packets = Array.from({ length: 9 }, (_, i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf0bd5e }));
    s.position.set(-26 + i * 6, 0, PZ); scene.add(s); return s;
  });

  // ── Stop 3: 400 servers; idle ones switch off as you scroll ───
  const CZ = -214, N = 400, servers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshBasicMaterial(), N);
  const order = [], m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++) {
    m4.makeTranslation(((i % 20) - 9.5) * 1.5, -3 + Math.sin(i * 1.3) * 0.15, CZ + (Math.floor(i / 20) - 9.5) * 1.5);
    servers.setMatrixAt(i, m4); servers.setColorAt(i, GOLD); order.push({ i, r: rnd() });
  }
  order.sort((a, b) => a.r - b.r); scene.add(servers);

  // ── Stop 4: 7,200 threads move from the old resource to the new ─
  const TZ = -276, TN = small ? 1800 : 3600, tPos = new Float32Array(TN * 3), tCol = new Float32Array(TN * 3), tFrom = [], tTo = [];
  for (let i = 0; i < TN; i++) {
    const u = rnd() * Math.PI * 2, v = Math.acos(2 * rnd() - 1), r = Math.cbrt(rnd()) * 3.4;
    const d = new THREE.Vector3(Math.sin(v) * Math.cos(u) * r, Math.sin(v) * Math.sin(u) * r, Math.cos(v) * r);
    tFrom.push(d.clone().add(new THREE.Vector3(-7, 0, TZ))); tTo.push(d.clone().add(new THREE.Vector3(7, 0, TZ)));
  }
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3)); tGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
  scene.add(new THREE.Points(tGeo, new THREE.PointsMaterial({ size: 0.2, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

  // ── Camera path ──────────────────────────────────────────────
  const camPath = new THREE.CatmullRomCurve3([
    [0, 0, 16], [0, 0, 4], [0, 0.5, -30], [0, 1, -58], [12, 9, -82], [-14, 7, -108], [-26, 4, -140], [0, 5, -140], [26, 4, -142],
    [12, 16, -190], [-6, 12, -200], [0, 9, -228], [0, 3, -258], [0, 1, -266],
  ].map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  const lookPath = new THREE.CatmullRomCurve3([
    [0, 0, 0], [0, 0, -20], [0, 0, -60], [0, -2, -96], [0, -2, -96], [0, -2, -96], [-6, 0, PZ], [4, 0, PZ], [16, 0, PZ],
    [0, -3, CZ], [0, -3, CZ], [0, 0, TZ], [0, 0, TZ - 4], [0, 0, TZ - 8],
  ].map((p) => new THREE.Vector3(...p)), false, 'centripetal');

  // ── Scroll progress ──────────────────────────────────────────
  let progress = 0, shown = 0, W = 1, H = 1, visible = false, running = false, clock = 0, last = performance.now();
  const measure = () => {
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setSize(W, H, false); camera.aspect = W / H;
    camera.fov = camera.aspect < 0.8 ? 70 : 55; camera.updateProjectionMatrix();
  };
  new ResizeObserver(measure).observe(canvas); measure();
  const readScroll = () => {
    const r = section.getBoundingClientRect(), span = r.height - innerHeight;
    progress = Math.min(1, Math.max(0, -r.top / (span || 1)));
  };

  const band = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
  const fmt = (n) => '$' + (n >= 1e6 ? (n / 1e6).toFixed(n >= 1.995e6 ? 0 : 2) + 'M' : Math.round(n / 1000) + 'k');
  const tmpC = new THREE.Color();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    readScroll(); // read in the frame loop rather than on every scroll event
    shown += (progress - shown) * Math.min(1, dt * 6);
    const p = shown;
    camera.position.copy(camPath.getPointAt(p));
    camera.lookAt(lookPath.getPointAt(Math.min(1, p + 0.01)));
    key.position.copy(camera.position).add(new THREE.Vector3(0, 3, -4));
    iris.rotation.z = clock * 0.05; iris.material.opacity = 1 - band(p, 0.02, 0.07);

    // Clusters: pods pulse; between 0.24 and 0.32 AWS fails and its pods go dark while the rest light up.
    const fail = band(p, 0.24, 0.3), back = band(p, 0.31, 0.35);
    clusters.forEach((c, k) => {
      for (let i = 0; i < 25; i++) {
        const pulse = 0.75 + 0.25 * Math.sin(clock * 3 + i * 0.7 + k);
        if (k === 0) tmpC.copy(MOSS).lerp(RED, Math.min(1, fail * 2)).lerp(DIM, Math.max(0, fail * 2 - 1)).lerp(MOSS, back);
        else tmpC.copy(MOSS).lerp(GOLD, fail * (1 - back) * (i % 3 === 0 ? 1 : 0.3));
        c.pods.setColorAt(i, tmpC.multiplyScalar(pulse));
      }
      c.pods.instanceColor.needsUpdate = true;
      c.edge.material.color.copy(k === 0 ? MOSS.clone().lerp(RED, fail * (1 - back)) : MOSS);
      c.g.rotation.y = Math.sin(clock * 0.2 + k) * 0.08;
    });

    // Pipeline: packets glide along; a gate flashes green as one passes through it.
    packets.forEach((s) => { s.position.x += dt * 6; if (s.position.x > 26) s.position.x -= 54; });
    gates.forEach((g) => {
      const near = packets.some((s) => Math.abs(s.position.x - g.position.x) < 0.7);
      g.material.emissiveIntensity += ((near ? 2.4 : 0.25) - g.material.emissiveIntensity) * Math.min(1, dt * 10);
    });

    // Cost: the idle 60% switch off as the stop plays; the counter follows.
    const off = band(p, 0.6, 0.78), offN = Math.floor(off * N * 0.6);
    for (let k = 0; k < N; k++) servers.setColorAt(order[k].i, k < offN ? DIM : GOLD);
    servers.instanceColor.needsUpdate = true;
    if (counter) counter.textContent = fmt(off * 2e6);

    // Threads: wrong-author red at the old resource, restored green at the new one.
    const mv = band(p, 0.84, 0.97);
    for (let i = 0; i < TN; i++) {
      const lag = Math.min(1, Math.max(0, mv * 1.6 - (i / TN) * 0.6));
      const e = lag * lag * (3 - 2 * lag), a = tFrom[i], b = tTo[i];
      tPos[i * 3] = a.x + (b.x - a.x) * e; tPos[i * 3 + 1] = a.y + (b.y - a.y) * e + Math.sin(e * Math.PI) * 1.2; tPos[i * 3 + 2] = a.z;
      tmpC.copy(RED).lerp(MOSS, e); tCol[i * 3] = tmpC.r; tCol[i * 3 + 1] = tmpC.g; tCol[i * 3 + 2] = tmpC.b;
    }
    tGeo.attributes.position.needsUpdate = true; tGeo.attributes.color.needsUpdate = true;

    caps.forEach((c) => { const a = +c.dataset.from, b = +c.dataset.to; c.classList.toggle('on', p >= a && p <= b); });
    renderer.render(scene, camera);
    if (running) requestAnimationFrame(frame);
  }
  const start = () => { if (!running && visible && !document.hidden) { running = true; last = performance.now(); readScroll(); requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else running = false; }, { rootMargin: '200px 0px' }).observe(section);
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else start(); });
}
