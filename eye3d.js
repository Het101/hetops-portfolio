// hetops.dev hero: a 3D eye that wakes up, looks at what you point at, and is circled by
// two orbits: the tools I built (inner) and results and stack (outer).
// three.js comes from the import map in index.html. Without WebGL the CSS fallback eye shows.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const stage = document.getElementById('eyeStage');
const canvas = document.getElementById('eyeCanvas');
const list = document.getElementById('orbits');
const caption = document.getElementById('eyeCaption');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const { PRODUCTS = [], track = () => {} } = window.HETOPS || {};

const OUTER = [
  { big: '$2M+', small: 'saved a year' },
  { label: 'Kubernetes' },
  { big: '10k+', small: 'canary deploys' },
  { label: 'Terraform' },
  { big: '100+', small: 'node clusters' },
  { label: 'Argo CD' },
  { big: '62 → 0', small: 'security alerts' },
  { label: 'AWS · GCP · Azure' },
  { big: '7,200', small: 'threads repaired' },
  { label: 'GitHub Actions' },
  { big: '99.9%', small: 'uptime kept' },
  { label: 'Prometheus' },
];

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  stage.classList.add('no-gl');
}

if (renderer) {
  stage.classList.add('gl');
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 8);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xfff0d8, 2.2); key.position.set(-3, 4, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fd8bd, 2.4); rim.position.set(4, 2, -5); scene.add(rim);
  const under = new THREE.DirectionalLight(0xe3a944, 0.6); under.position.set(0, -5, 2); scene.add(under);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x0b0c0e, 0.35));

  // ── Eyeball texture ──────────────────────────────────────────
  // Equirectangular: the top row is the front pole, so the iris's radial fibres are vertical strokes.
  const P = 0.17, I = 0.56, Lb = 0.64; // pupil, iris, limbus as angles from the front (radians)
  function eyeTexture() {
    const W = 2048, H = 1024, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), row = (t) => (t / Math.PI) * H;
    let seed = 41; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // Sclera: warm off-white, darker towards the back.
    let gr = g.createLinearGradient(0, row(Lb), 0, H);
    gr.addColorStop(0, '#e4ddcf'); gr.addColorStop(0.35, '#cfc6b5'); gr.addColorStop(1, '#7b746a');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // Veins: thin red branches creeping towards the iris.
    for (let i = 0; i < 70; i++) {
      let x = rnd() * W, y = row(1.25 + rnd() * 0.9); const toward = row(Lb + 0.05 + rnd() * 0.25);
      g.strokeStyle = `rgba(150,40,34,${(0.12 + rnd() * 0.22).toFixed(2)})`; g.lineWidth = 0.6 + rnd() * 1.6;
      g.beginPath(); g.moveTo(x, y);
      while (y > toward) { x += (rnd() - 0.5) * 26; y -= 8 + rnd() * 14; g.lineTo(x, y); }
      g.stroke();
    }
    // Iris base.
    gr = g.createLinearGradient(0, 0, 0, row(I));
    gr.addColorStop(0, '#2a1806'); gr.addColorStop(P / I, '#6b4513'); gr.addColorStop(0.42, '#b07a24');
    gr.addColorStop(0.62, '#4f8a68'); gr.addColorStop(0.86, '#2a5a46'); gr.addColorStop(1, '#173328');
    g.fillStyle = gr; g.fillRect(0, 0, W, row(I));
    // Stroma fibres.
    for (let i = 0; i < 3200; i++) {
      const x = rnd() * W, y0 = row(P) * (1 + rnd() * 0.08), y1 = row(P) + Math.pow(rnd(), 0.7) * (row(I) - row(P));
      const goldish = rnd() < 0.62 - ((y1 - row(P)) / (row(I) - row(P))) * 0.42;
      g.strokeStyle = goldish ? `rgba(240,190,96,${(0.15 + rnd() * 0.4).toFixed(2)})` : `rgba(110,210,165,${(0.12 + rnd() * 0.35).toFixed(2)})`;
      g.lineWidth = 0.8 + rnd() * 2.2; g.beginPath(); g.moveTo(x, y0);
      g.quadraticCurveTo(x + (rnd() - 0.5) * 14, (y0 + y1) / 2, x + (rnd() - 0.5) * 8, y1); g.stroke();
    }
    for (let i = 0; i < 90; i++) {
      const x = rnd() * W, y = row(P) + (0.35 + rnd() * 0.5) * (row(I) - row(P));
      g.fillStyle = 'rgba(8,14,10,0.28)'; g.beginPath(); g.ellipse(x, y, 6 + rnd() * 10, 3 + rnd() * 6, 0, 0, Math.PI * 2); g.fill();
    }
    // Collarette: the ragged gold ring between inner and outer iris.
    const cy = row(P) + 0.36 * (row(I) - row(P));
    g.strokeStyle = 'rgba(250,200,110,0.6)'; g.lineWidth = 3; g.beginPath();
    for (let x = 0; x <= W; x += 8) g.lineTo(x, cy + Math.sin(x / W * Math.PI * 22) * 5 + (rnd() - 0.5) * 4);
    g.stroke();
    // Pupil with a soft edge, then the dark limbal ring that makes it read as an eye.
    gr = g.createLinearGradient(0, 0, 0, row(P) * 1.25);
    gr.addColorStop(0, '#040404'); gr.addColorStop(0.8, '#060505'); gr.addColorStop(1, 'rgba(6,5,5,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, row(P) * 1.25);
    gr = g.createLinearGradient(0, row(I) * 0.86, 0, row(Lb));
    gr.addColorStop(0, 'rgba(8,16,12,0)'); gr.addColorStop(0.45, 'rgba(8,16,12,0.92)'); gr.addColorStop(1, 'rgba(8,16,12,0)');
    g.fillStyle = gr; g.fillRect(0, row(I) * 0.86, W, row(Lb) - row(I) * 0.86);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }

  // ── Eye: a gaze group (eyeball, cornea, pupil) inside fixed lids ─
  const head = new THREE.Group(); scene.add(head);
  const gaze = new THREE.Group(); head.add(gaze);
  const ballGeo = new THREE.SphereGeometry(1, 128, 96); ballGeo.rotateX(Math.PI / 2);
  gaze.add(new THREE.Mesh(ballGeo, new THREE.MeshPhysicalMaterial({ map: eyeTexture(), roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.8 })));
  // Pupil cap: a separate black cap so it can dilate.
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x030303 });
  let pupilGeo = null, pupilSize = P;
  const pupil = new THREE.Mesh(undefined, pupilMat); gaze.add(pupil);
  const setPupil = (a) => {
    pupilSize = a; pupilGeo?.dispose();
    pupilGeo = new THREE.SphereGeometry(1.002, 64, 6, 0, Math.PI * 2, 0, a); pupilGeo.rotateX(Math.PI / 2);
    pupil.geometry = pupilGeo;
  };
  setPupil(P);
  // Cornea: a clear bulge over the iris that catches the light.
  const corneaGeo = new THREE.SphereGeometry(0.66, 96, 48, 0, Math.PI * 2, 0, 1.05); corneaGeo.rotateX(Math.PI / 2);
  const cornea = new THREE.Mesh(corneaGeo, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, metalness: 0, transparent: true, opacity: 0.1, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 2.6, depthWrite: false }));
  cornea.position.z = 0.46; gaze.add(cornea);

  const lidMat = new THREE.MeshStandardMaterial({ color: 0x0f1012, roughness: 0.9, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.12 });
  const lidGeo = new THREE.SphereGeometry(1.07, 128, 48, 0, Math.PI * 2, 0, Math.PI / 2);
  const upper = new THREE.Mesh(lidGeo, lidMat), lower = new THREE.Mesh(lidGeo, lidMat);
  lower.rotation.z = Math.PI; // the same hemisphere, flipped to cover the bottom
  head.add(upper, lower);
  // Lashes on the upper lid's edge: two-segment curls, longest at the centre.
  const lash = [];
  for (let i = 0; i <= 44; i++) {
    const phi = -1.25 + (i / 44) * 2.5, s = Math.cos(phi * 0.8), len = 0.2 * Math.pow(Math.max(s, 0), 0.6) + 0.04;
    const bx = Math.sin(phi) * 1.07, bz = Math.cos(phi) * 1.07;
    const out = new THREE.Vector3(bx, 0, bz).normalize();
    const mid = new THREE.Vector3(bx, 0, bz).addScaledVector(out, len * 0.55).add(new THREE.Vector3(0, len * 0.25, 0));
    const tip = new THREE.Vector3(bx, 0, bz).addScaledVector(out, len * 0.8).add(new THREE.Vector3(Math.sin(phi) * len * 0.3, len * 0.75, 0));
    lash.push(bx, 0, bz, mid.x, mid.y, mid.z, mid.x, mid.y, mid.z, tip.x, tip.y, tip.z);
  }
  const lashGeo = new THREE.BufferGeometry(); lashGeo.setAttribute('position', new THREE.Float32BufferAttribute(lash, 3));
  upper.add(new THREE.LineSegments(lashGeo, new THREE.LineBasicMaterial({ color: 0xd8d0c0, transparent: true, opacity: 0.75 })));

  // Lid openness 0 = closed, 1 = open. Upper swings further than lower, like a real eye.
  const lid = { o: 0 };
  const OPEN_UP = 0.6, OPEN_LOW = 0.38;

  // ── Orbits ───────────────────────────────────────────────────
  const orbitDefs = [
    { r: 1.72, tiltX: 1.08, tiltZ: -0.22, speed: 0.13, items: PRODUCTS.map((p, i) => ({ tool: i })) },
    { r: 2.4, tiltX: 1.2, tiltZ: 0.34, speed: -0.06, items: matchMedia('(max-width: 760px)').matches ? OUTER.filter((o) => o.big) : OUTER },
  ];
  const orbits = orbitDefs.map((d) => {
    const pivot = new THREE.Object3D(); pivot.rotation.set(d.tiltX, 0, d.tiltZ); scene.add(pivot);
    const pts = new THREE.EllipseCurve(0, 0, d.r, d.r).getPoints(160).map((p) => new THREE.Vector3(p.x, p.y, 0));
    pivot.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xe3a944, transparent: true, opacity: 0.22 })));
    return { ...d, pivot, phase: 0, speedNow: d.speed };
  });

  // DOM for orbit items: crisp text, real links and buttons.
  const els = [];
  orbits.forEach((o, oi) => o.items.forEach((it, k) => {
    const li = document.createElement('li');
    if (it.tool != null) {
      const p = PRODUCTS[it.tool];
      li.className = 'orb orb-tool';
      li.innerHTML = `<button type="button" aria-label="${p.name}: ${p.status}"><img src="${p.icon}" alt="" width="34" height="34"></button>`;
      const btn = li.firstChild;
      btn.addEventListener('click', () => pick(it.tool, true, o, els.length));
      btn.addEventListener('focus', () => pick(it.tool, false, o));
      if (fine) { btn.addEventListener('pointerenter', () => pick(it.tool, false, o)); btn.addEventListener('pointerleave', () => unpick()); }
    } else {
      li.className = 'orb ' + (it.big ? 'orb-num' : 'orb-tag');
      li.innerHTML = it.big ? `<b>${it.big}</b><span>${it.small}</span>` : `<span>${it.label}</span>`;
    }
    list.appendChild(li);
    els.push({ li, o, angle: (k / o.items.length) * Math.PI * 2 + oi * 0.4, tool: it.tool });
  }));

  let picked = null;
  const defaultCaption = caption.innerHTML;
  function pick(i, byUser, o) {
    const p = PRODUCTS[i]; picked = els.find((e) => e.tool === i);
    els.forEach((e) => e.li.classList.toggle('on', e === picked));
    const ext = p.url.startsWith('http');
    caption.innerHTML = `<img src="${p.icon}" alt=""><b>${p.name}</b> <span>${p.text}</span> <a href="${p.url}"${ext ? ' target="_blank" rel="noopener"' : ''} data-umami-event="project-link" data-umami-event-project="eye-${p.key}">${p.link} <i class="ph ph-arrow-up-right" aria-hidden="true"></i></a>`;
    if (byUser) track('eye-pick', { tool: p.key });
  }
  function unpick() { picked = null; els.forEach((e) => e.li.classList.remove('on')); }
  stage.addEventListener('pointerleave', () => { if (picked) { unpick(); caption.innerHTML = defaultCaption; } });

  // ── Layout ───────────────────────────────────────────────────
  let W = 1, H = 1, eyeR = 1;
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    renderer.setSize(W, H, false); camera.aspect = W / H;
    // Keep the outer orbit inside the stage on any aspect.
    const fit = Math.max((W < 560 ? 3 : 2.5) / camera.aspect, 1.6);
    camera.position.z = fit / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.updateProjectionMatrix();
    eyeR = (H / 2) / (camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.07;
  }
  new ResizeObserver(resize).observe(stage); resize();

  // ── Pointer: the eye follows the pointer, or the tool you point at ─
  const aim = { x: 0, y: 0 }, look = { x: 0, y: 0 };
  if (fine && !reduce) addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    aim.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 0.6)));
    aim.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 0.6)));
  }, { passive: true });

  // ── Tiny tween runner (the render loop drives it) ─────────────
  const tweens = [];
  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)), easeIn = (t) => t * t, easeOut = (t) => 1 - (1 - t) * (1 - t);
  const tween = (to, dur, ease = easeOut) => new Promise((done) => tweens.push({ from: lid.o, to, dur, ease, t: 0, done }));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ── Frame ────────────────────────────────────────────────────
  const v = new THREE.Vector3(), cam = new THREE.Vector3();
  let last = performance.now(), running = false, visible = true;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i]; tw.t = Math.min(1, tw.t + dt / tw.dur);
      lid.o = tw.from + (tw.to - tw.from) * tw.ease(tw.t);
      if (tw.t === 1) { tweens.splice(i, 1); tw.done(); }
    }
    // Where to look: the picked tool, else the pointer.
    let tx = aim.x, ty = aim.y;
    if (picked && picked.sx != null) { tx = (picked.sx - W / 2) / (W * 0.35); ty = (picked.sy - H / 2) / (H * 0.35); }
    look.x += (tx - look.x) * Math.min(1, dt * 5); look.y += (ty - look.y) * Math.min(1, dt * 5);
    gaze.rotation.y = look.x * 0.42; gaze.rotation.x = look.y * 0.3;
    upper.rotation.x = -lid.o * (OPEN_UP + Math.min(0, look.y) * -0.18);
    lower.rotation.x = lid.o * OPEN_LOW;
    // Pupil dilates while a tool is picked.
    const want = picked ? P * 1.32 : P;
    if (Math.abs(want - pupilSize) > 0.002) setPupil(pupilSize + (want - pupilSize) * Math.min(1, dt * 6));

    for (const o of orbits) {
      o.speedNow += ((picked && picked.o === o ? 0 : o.speed) - o.speedNow) * Math.min(1, dt * 4);
      if (!reduce) o.phase += o.speedNow * dt;
      o.pivot.updateMatrixWorld();
    }
    for (const e of els) {
      const a = e.angle + e.o.phase;
      v.set(Math.cos(a) * e.o.r, Math.sin(a) * e.o.r, 0).applyMatrix4(e.o.pivot.matrixWorld);
      const behind = v.z < 0;
      cam.copy(v).project(camera);
      const sx = (cam.x * 0.5 + 0.5) * W, sy = (-cam.y * 0.5 + 0.5) * H;
      e.sx = sx; e.sy = sy;
      const hidden = behind && Math.hypot(sx - W / 2, sy - H / 2) < eyeR;
      const depth = (v.z / e.o.r + 1) / 2; // 0 back, 1 front
      const scale = 0.78 + depth * 0.3;
      e.li.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      e.li.style.opacity = hidden ? '0' : (0.35 + depth * 0.65).toFixed(2);
      e.li.style.zIndex = behind ? 1 : 3;
      e.li.classList.toggle('hidden', hidden);
    }
    renderer.render(scene, camera);
    if (running) requestAnimationFrame(frame);
  }
  const start = () => { if (!running && visible && !document.hidden) { running = true; last = performance.now(); requestAnimationFrame(frame); } };
  const stop = () => { running = false; };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(stage);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  // ── Wake up: a beat closed, a sleepy flutter, then open; blink now and then ─
  if (reduce) {
    lid.o = 1; stage.classList.add('awake'); running = true; frame(performance.now()); running = false;
    // Reduced motion: no loop, but redraw on resize.
    new ResizeObserver(() => { running = true; frame(performance.now()); running = false; }).observe(stage);
  } else {
    start();
    (async () => {
      await wait(650);
      await tween(0.3, 0.32, easeOut);
      await tween(0.06, 0.2, easeIn);
      await wait(140);
      stage.classList.add('awake');
      await tween(1, 1.2, easeOutExpo);
      const blink = async () => {
        if (running) { await tween(0.02, 0.09, easeIn); await tween(1, 0.22, easeOut); }
        setTimeout(blink, 4800 + Math.random() * 5200);
      };
      setTimeout(blink, 5200);
    })();
  }
}
