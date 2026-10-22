// hetops.dev "Inside the eye": scrolling flies a camera through the iris and out into deep space, past four stops,
// each one real work: multi-cloud clusters, the release pipeline, cost automation, Threadvault.
// Stars twinkle, light glows (bloom), and the faster you scroll the more the stars stretch into streaks.
// Without WebGL or with reduced motion, the captions show as a plain list instead.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const section = document.getElementById('inside');
const canvas = document.getElementById('insideCanvas');
const caps = [...section.querySelectorAll('.inside-cap')];
const counter = document.getElementById('insideCounter');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 760px)').matches;

let renderer = null;
if (!reduce) { try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' }); } catch (e) { renderer = null; } }

if (!renderer) {
  section.classList.add('static');
} else {
  section.classList.add('live');
  const PR = Math.min(devicePixelRatio || 1, small ? 1.25 : 1.5);
  renderer.setPixelRatio(PR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x050607, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050607, 0.011);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  // Shaded shapes (hex pods, bars, diamonds) need real light: a warm key from above and a cool sky.
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2); sun.position.set(12, 30, 18); scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xdff5ea, 0x1a1408, 1.1));
  const key = new THREE.PointLight(0xf0bd5e, 50, 60, 1.6); scene.add(key);

  // Bloom: anything bright (pods, gates, packets, threads) glows; the dark stays dark.
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(small ? 1 : PR);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), small ? 0.5 : 0.6, 0.4, 0.55);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const dotTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.7)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  const GOLD = new THREE.Color(0xe3a944), MOSS = new THREE.Color(0x45b88d), RED = new THREE.Color(0xef7a64), DIM = new THREE.Color(0x151819), ICE = new THREE.Color(0xcfe9ff);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const U = { time: { value: 0 }, scale: { value: 400 } }; // shared by every point shader: clock and pixels per world unit at depth 1

  // Glow on instanced shapes: each instance's own colour is also its light.
  const glowing = (mat, amount) => {
    mat.onBeforeCompile = (s) => {
      s.uniforms.uGlow = { value: amount }; mat.userData.glow = s.uniforms.uGlow;
      s.fragmentShader = 'uniform float uGlow;\n' + s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vColor * uGlow;');
    };
    return mat;
  };

  // ── Deep space: twinkling stars, faint nebulae, and streaks that stretch with speed ─
  const stars = (() => {
    const n = small ? 1800 : 3500, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), phase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, r = 14 + Math.pow(rnd(), 0.6) * 150;
      pos.set([Math.cos(a) * r, Math.sin(a) * r * 0.7, 30 - rnd() * 420], i * 3);
      const c = rnd() < 0.7 ? ICE : rnd() < 0.6 ? GOLD : MOSS, f = 0.5 + rnd() * 0.7;
      col.set([c.r * f, c.g * f, c.b * f], i * 3);
      size[i] = rnd() < 0.04 ? 0.9 + rnd() * 0.9 : 0.18 + rnd() * 0.42; phase[i] = rnd();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: U.time, uScale: U.scale, uMap: { value: dotTex } },
      vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aPhase; uniform float uTime, uScale; varying vec3 vC;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          float tw = 0.45 + 0.55 * (0.5 + 0.5 * sin(uTime * (0.5 + aPhase * 2.2) + aPhase * 60.0));
          vC = aColor * tw; gl_PointSize = clamp(aSize * uScale / -mv.z, 1.0, 14.0); }`,
      fragmentShader: `uniform sampler2D uMap; varying vec3 vC; void main() { float a = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(vC * a, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p); return p;
  })();

  const streaks = (() => {
    const n = small ? 500 : 1300, pos = new Float32Array(n * 6), tail = new Float32Array(n * 2), col = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, r = 5 + rnd() * 45, z = 20 - rnd() * 360, x = Math.cos(a) * r, y = Math.sin(a) * r * 0.75;
      pos.set([x, y, z, x, y, z], i * 6); tail.set([0, 1], i * 2);
      const c = rnd() < 0.5 ? ICE : rnd() < 0.5 ? GOLD : MOSS; col.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aTail', new THREE.BufferAttribute(tail, 1)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    const m = new THREE.ShaderMaterial({
      uniforms: { uStretch: { value: 0 }, uAlpha: { value: 0 } },
      vertexShader: `attribute float aTail; attribute vec3 aColor; uniform float uStretch, uAlpha; varying vec3 vC;
        void main() { vec3 p = position; p.z -= aTail * uStretch; vC = aColor * (1.0 - aTail) * uAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
      fragmentShader: `varying vec3 vC; void main() { gl_FragColor = vec4(vC, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const l = new THREE.LineSegments(g, m); l.frustumCulled = false; scene.add(l); return m;
  })();

  const cloudTex = (rgb) => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    for (let i = 0; i < 9; i++) {
      const x = 70 + rnd() * 116, y = 70 + rnd() * 116, r = 50 + rnd() * 70, gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${rgb},0.55)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    }
    // Fade the whole cloud to nothing well inside the square, so no edge ever shows.
    const fade = g.createRadialGradient(128, 128, 30, 128, 128, 128); fade.addColorStop(0, '#000'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-in'; g.fillStyle = fade; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  };
  [['227,169,68', -70, 30, -200, 150, 0.07], ['69,184,141', 80, -14, -250, 170, 0.06], ['90,140,200', -50, 36, -330, 190, 0.06], ['239,122,100', 60, 12, -380, 170, 0.05]]
    .forEach(([rgb, x, y, z, s, o]) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex(rgb), transparent: true, opacity: o, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
      sp.scale.set(s, s * 0.7, 1); sp.position.set(x, y, z); scene.add(sp);
    });

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
  const tunnel = new THREE.LineSegments(tunnelGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(tunnel);

  // ── Stop 1: three clouds, a mesh of pods each; one region fails over and its work arcs to the others ─
  const CL = new THREE.Vector3(0, -2, -96), clusters = [];
  const hexPod = new THREE.CylinderGeometry(0.46, 0.46, 0.8, 6);
  const PODS = 19, honey = [[0, 0]];
  for (let ring = 1; ring <= 2; ring++) {
    // Walk each hexagonal ring in axial coordinates.
    let q = ring, r = 0;
    const dirs = [[-1, 1], [-1, 0], [0, -1], [1, -1], [1, 0], [0, 1]];
    for (const [dq, dr] of dirs) for (let k = 0; k < ring; k++) { honey.push([q, r]); q += dq; r += dr; }
  }
  const podXY = honey.map(([q, r]) => [1.62 * (q + r / 2), 1.62 * r * 0.866]);
  const meshPts = [];
  podXY.forEach((a, i) => podXY.forEach((b, j) => { if (j > i && Math.hypot(a[0] - b[0], a[1] - b[1]) < 1.7) meshPts.push(a[0], 1.0, a[1], b[0], 1.0, b[1]); }));
  const meshGeo = new THREE.BufferGeometry(); meshGeo.setAttribute('position', new THREE.Float32BufferAttribute(meshPts, 3));
  ['AWS', 'GCP', 'Azure'].forEach((name, k) => {
    const g = new THREE.Group(); g.position.set(CL.x + (k - 1) * 13, CL.y, CL.z); scene.add(g);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.4, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0x0e1113, roughness: 0.5, metalness: 0.4, emissive: 0x0d1a14, emissiveIntensity: 0.8 }));
    g.add(plat);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(plat.geometry), new THREE.LineBasicMaterial({ color: 0x45b88d, transparent: true, opacity: 0.9 }));
    g.add(edge);
    const links = new THREE.LineSegments(meshGeo, new THREE.LineBasicMaterial({ color: 0x45b88d, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.add(links);
    const pods = new THREE.InstancedMesh(hexPod, glowing(new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 }), 0.22), PODS);
    const m = new THREE.Matrix4();
    for (let i = 0; i < PODS; i++) { m.makeTranslation(podXY[i][0], 0.55, podXY[i][1]); pods.setMatrixAt(i, m); pods.setColorAt(i, MOSS); }
    g.add(pods); clusters.push({ g, pods, edge, links, name });
  });
  // Failover arcs: workloads leave AWS for GCP and Azure as glowing motes.
  const ARC_N = 40, arcs = [1, 2].map((k) => new THREE.QuadraticBezierCurve3(
    clusters[0].g.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
    clusters[0].g.position.clone().lerp(clusters[k].g.position, 0.5).add(new THREE.Vector3(0, 7 + k * 1.5, k === 1 ? 2 : -2)),
    clusters[k].g.position.clone().add(new THREE.Vector3(0, 1.2, 0))));
  const arcPos = new Float32Array(arcs.length * ARC_N * 3), arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPos, 3));
  const arcMat = new THREE.PointsMaterial({ size: 0.18, map: dotTex, color: 0xf0bd5e, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const arcPts = new THREE.Points(arcGeo, arcMat); arcPts.frustumCulled = false; scene.add(arcPts);
  const arcLine = new THREE.LineBasicMaterial({ color: 0xe3a944, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  arcs.forEach((c) => scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(60)), arcLine)));
  const tmpV = new THREE.Vector3();

  // ── Stop 2: the release track with five gates; packets trail light ─
  const PZ = -152, gatesX = [-16, -8, 0, 8, 16], gates = [];
  const track = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 56, 8), new THREE.MeshBasicMaterial({ color: 0x8a6420 }));
  track.rotation.z = Math.PI / 2; track.position.set(0, 0, PZ); scene.add(track);
  gatesX.forEach((x) => {
    const gate = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.08, 12, 72), new THREE.MeshStandardMaterial({ color: 0x111, emissive: 0x45b88d, emissiveIntensity: 0.3 }));
    gate.rotation.y = Math.PI / 2; gate.position.set(x, 0, PZ); scene.add(gate); gates.push(gate);
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), new THREE.MeshStandardMaterial({ color: 0x111, emissive: 0xe3a944, emissiveIntensity: 0.6, flatShading: true }));
  core.position.set(24, 0, PZ); scene.add(core);
  const packets = Array.from({ length: 9 }, (_, i) => {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.34), new THREE.MeshStandardMaterial({ color: 0xf0bd5e, emissive: 0xe3a944, emissiveIntensity: 1.4, roughness: 0.3, flatShading: true }));
    s.position.set(-26 + i * 6, 0, PZ); scene.add(s); return s;
  });
  const trailPos = new Float32Array(packets.length * 6), trailCol = new Float32Array(packets.length * 6), trailGeo = new THREE.BufferGeometry();
  packets.forEach((_, i) => trailCol.set([GOLD.r * 1.6, GOLD.g * 1.6, GOLD.b * 1.6, 0, 0, 0], i * 6));
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3)); trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
  const trails = new THREE.LineSegments(trailGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  trails.frustumCulled = false; scene.add(trails);

  // ── Stop 3: 400 servers on a lit floor; idle ones switch off as you scroll ───
  const CZ = -214, N = 400, servers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 1, 0.42), glowing(new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.25 }), 0.14), N);
  const floor = new THREE.PolarGridHelper(17, 24, 8, 96, 0x45b88d, 0x2a6e55);
  floor.material.transparent = true; floor.material.opacity = 0.35; floor.position.set(0, -3, CZ); scene.add(floor);
  const barPos = [], barH = [], barNow = new Float32Array(N).fill(1), qI = new THREE.Quaternion(), vS = new THREE.Vector3(), vP = new THREE.Vector3();
  const order = [], m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++) {
    const ga = i * 2.39996323, gr = 0.72 * Math.sqrt(i + 0.5);
    barPos.push([Math.cos(ga) * gr, CZ + Math.sin(ga) * gr]); barH.push(1.2 + rnd() * 1.6);
    m4.compose(vP.set(Math.cos(ga) * gr, -3 + barH[i] / 2, CZ + Math.sin(ga) * gr), qI, vS.set(1, barH[i], 1));
    servers.setMatrixAt(i, m4); servers.setColorAt(i, GOLD); order.push({ i, r: rnd() });
  }
  order.sort((a, b) => a.r - b.r); scene.add(servers);

  // ── Stop 4: 7,200 threads move from the old resource to the new (on the GPU) ─
  const TZ = -276, TN = small ? 1800 : 3600, tFrom = new Float32Array(TN * 3), tTo = new Float32Array(TN * 3), tLag = new Float32Array(TN);
  for (let i = 0; i < TN; i++) {
    const u = rnd() * Math.PI * 2, v = Math.acos(2 * rnd() - 1), r = Math.cbrt(rnd()) * 3.4;
    const x = Math.sin(v) * Math.cos(u) * r, y = Math.sin(v) * Math.sin(u) * r, z = Math.cos(v) * r;
    tFrom.set([x - 7, y, z + TZ], i * 3); tTo.set([x + 7, y, z + TZ], i * 3); tLag[i] = i / TN;
  }
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute('position', new THREE.BufferAttribute(tFrom, 3)); tGeo.setAttribute('aTo', new THREE.BufferAttribute(tTo, 3)); tGeo.setAttribute('aLag', new THREE.BufferAttribute(tLag, 1));
  const tMat = new THREE.ShaderMaterial({
    uniforms: { uMove: { value: 0 }, uTime: U.time, uScale: U.scale, uMap: { value: dotTex }, uFrom: { value: RED.clone().multiplyScalar(1.3) }, uTo: { value: MOSS.clone().multiplyScalar(1.3) } },
    vertexShader: `attribute vec3 aTo; attribute float aLag; uniform float uMove, uTime, uScale; uniform vec3 uFrom, uTo; varying vec3 vC;
      void main() { float l = clamp(uMove * 1.6 - aLag * 0.6, 0.0, 1.0), e = l * l * (3.0 - 2.0 * l);
        vec3 p = mix(position, aTo, e); p.y += sin(e * 3.14159) * 1.4;
        p += 0.07 * vec3(sin(uTime * 0.9 + aLag * 91.0), cos(uTime * 1.1 + aLag * 57.0), sin(uTime * 0.7 + aLag * 33.0));
        vC = mix(uFrom, uTo, e); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(0.24 * uScale / -mv.z, 1.0, 10.0); }`,
    fragmentShader: `uniform sampler2D uMap; varying vec3 vC; void main() { float a = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(vC * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const threads = new THREE.Points(tGeo, tMat); threads.frustumCulled = false; scene.add(threads);

  // ── Labels in the scene: cloud names over the clusters, stage names over the gates ─
  const label = (text, color, x, y, z, h = 1.1) => {
    const c = document.createElement('canvas'), g = c.getContext('2d'), font = '600 128px Archivo, system-ui, sans-serif';
    g.font = font; const w = Math.ceil(g.measureText(text).width) + 96; c.width = w; c.height = 192;
    g.font = font; g.fillStyle = 'rgba(5,6,7,0.7)'; g.beginPath(); g.roundRect(0, 16, w, 160, 80); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 3; g.stroke();
    g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(text, 48, 100);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
    s.scale.set(h * (w / 192), h, 1); s.position.set(x, y, z); scene.add(s); return s;
  };
  document.fonts.ready.then(() => {
    clusters.forEach((c) => label(c.name, '#efe9dd', c.g.position.x, c.g.position.y + 2.4, c.g.position.z));
    ['test', 'hygiene', 'analyze', 'stage', 'approve'].forEach((n, k) => label(n, '#74d3ab', gatesX[k], 2.6, PZ, 0.8));
    label('main', '#f0bd5e', 24, 2.2, PZ, 0.8);
  });

  // ── Camera path ──────────────────────────────────────────────
  const camPath = new THREE.CatmullRomCurve3([
    [0, 0, 16], [0, 0, 4], [0, 0.5, -30], [0, 1, -58], [12, 9, -82], [-14, 7, -108], [-26, 4, -140], [0, 5, -140], [26, 4, -142],
    [12, 16, -190], [-6, 12, -200], [0, 9, -228], [0, 3, -258], [0, 1, -266],
  ].map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  const lookPath = new THREE.CatmullRomCurve3([
    [0, 0, 0], [0, 0, -20], [0, 0, -60], [0, -2, -96], [0, -2, -96], [0, -2, -96], [-6, 0, PZ], [4, 0, PZ], [16, 0, PZ],
    [0, -3, CZ], [0, -3, CZ], [0, 0, TZ], [0, 0, TZ - 4], [0, 0, TZ - 8],
  ].map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  const pathLen = camPath.getLength();

  // ── Scroll progress ──────────────────────────────────────────
  let progress = 0, shown = 0, speed = 0, W = 1, H = 1, visible = false, running = false, clock = 0, last = performance.now();
  const measure = () => {
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setSize(W, H, false); composer.setSize(W, H); camera.aspect = W / H;
    camera.fov = camera.aspect < 0.8 ? 70 : 55; camera.updateProjectionMatrix();
    U.scale.value = (H * renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  };
  new ResizeObserver(measure).observe(canvas); measure();
  const readScroll = () => {
    const r = section.getBoundingClientRect(), span = r.height - innerHeight;
    progress = Math.min(1, Math.max(0, -r.top / (span || 1)));
  };

  const band = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
  const fmt = (n) => '$' + (n >= 1e6 ? (n / 1e6).toFixed(n >= 1.995e6 ? 0 : 2) + 'M' : Math.round(n / 1000) + 'k');
  const tmpC = new THREE.Color();
  // Pointer parallax: the camera leans a little toward the pointer for depth.
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  if (matchMedia('(pointer: fine)').matches) addEventListener('pointermove', (e) => { lean.tx = (e.clientX / innerWidth - 0.5) * 2; lean.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  // Journey rail: five stops, current one lit, each one a jump.
  const rail = [...section.querySelectorAll('.inside-rail button')];
  rail.forEach((b) => b.addEventListener('click', () => {
    const span = section.offsetHeight - innerHeight;
    scrollTo({ top: section.offsetTop + span * +b.dataset.p, behavior: 'smooth' });
  }));

  let costShown = -1;
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; // rAF can stamp a frame before start() read the clock clock += dt; U.time.value = clock;
    readScroll(); // read in the frame loop rather than on every scroll event
    const prev = shown;
    shown += (progress - shown) * Math.min(1, dt * 4.5);
    const p = Math.min(1, Math.max(0, shown));
    // Speed in world units a second, eased so the streaks bloom and fade rather than flicker.
    speed += ((Math.abs(p - prev) * pathLen) / Math.max(dt, 1e-3) - speed) * Math.min(1, dt * 5);
    streaks.uniforms.uStretch.value = Math.min(18, speed * 0.1);
    streaks.uniforms.uAlpha.value = Math.min(0.55, speed * 0.006);
    bloom.strength = (small ? 0.5 : 0.6) + Math.min(0.25, speed * 0.002);

    camera.position.copy(camPath.getPointAt(p));
    lean.x += (lean.tx - lean.x) * Math.min(1, dt * 3); lean.y += (lean.ty - lean.y) * Math.min(1, dt * 3);
    camera.position.x += lean.x * 0.9; camera.position.y -= lean.y * 0.6;
    camera.lookAt(lookPath.getPointAt(Math.min(1, p + 0.01)));
    key.position.copy(camera.position).add(tmpV.set(0, 3, -4));
    iris.rotation.z = clock * 0.05; iris.material.opacity = 1 - band(p, 0.02, 0.07);
    tunnel.material.opacity = 0.9 * (1 - band(p, 0.12, 0.2));
    stars.rotation.z = clock * 0.004;

    // Clusters: pods pulse; between 0.24 and 0.32 AWS fails, its pods go dark and its work arcs to the others.
    if (p < 0.45) {
      const fail = band(p, 0.24, 0.3), back = band(p, 0.31, 0.35), out = fail * (1 - back);
      clusters.forEach((c, k) => {
        for (let i = 0; i < PODS; i++) {
          const pulse = 0.75 + 0.25 * Math.sin(clock * 3 + i * 0.7 + k);
          if (k === 0) tmpC.copy(MOSS).lerp(RED, Math.min(1, fail * 2)).lerp(DIM, Math.max(0, fail * 2 - 1)).lerp(MOSS, back);
          else tmpC.copy(MOSS).lerp(GOLD, out * (i % 3 === 0 ? 1 : 0.3));
          c.pods.setColorAt(i, tmpC.multiplyScalar(pulse));
        }
        c.pods.instanceColor.needsUpdate = true;
        c.edge.material.color.copy(k === 0 ? tmpC.copy(MOSS).lerp(RED, out) : MOSS);
        c.links.material.opacity = k === 0 ? 0.35 * (1 - out) : 0.35 + 0.3 * out;
        c.g.rotation.y = Math.sin(clock * 0.2 + k) * 0.08;
      });
      arcMat.opacity = Math.min(1, out * 1.5); arcLine.opacity = 0.25 * out;
      if (out > 0) arcs.forEach((curve, a) => {
        for (let i = 0; i < ARC_N; i++) { curve.getPoint((clock * 0.35 + i / ARC_N) % 1, tmpV); arcPos.set([tmpV.x, tmpV.y, tmpV.z], (a * ARC_N + i) * 3); }
      });
      arcGeo.attributes.position.needsUpdate = true;
    }

    // Pipeline: packets glide along trailing light; a gate flashes and swells as one passes; main glows on arrival.
    if (p > 0.3 && p < 0.7) {
      packets.forEach((s, i) => {
        s.position.x += dt * 6; s.rotation.x += dt * 2.2; s.rotation.y += dt * 1.4; if (s.position.x > 24) s.position.x -= 50;
        const x = s.position.x, t = Math.min(3.2, x + 26);
        trailPos.set([x, 0, PZ, x - t, 0, PZ], i * 6);
      });
      trailGeo.attributes.position.needsUpdate = true;
      gates.forEach((g) => {
        const near = packets.some((s) => Math.abs(s.position.x - g.position.x) < 0.7);
        g.material.emissiveIntensity += ((near ? 3.2 : 0.3) - g.material.emissiveIntensity) * Math.min(1, dt * 10);
        g.scale.setScalar(1 + (g.material.emissiveIntensity - 0.3) * 0.04);
      });
      const arrive = packets.some((s) => s.position.x > 22.5);
      core.material.emissiveIntensity += ((arrive ? 3 : 0.6) - core.material.emissiveIntensity) * Math.min(1, dt * 8);
      core.rotation.y += dt * 0.6; core.rotation.x += dt * 0.25;
    }

    // Cost: the idle 60% switch off as the stop plays; the counter follows.
    if (p > 0.5 && p < 0.92) {
      const off = band(p, 0.6, 0.78), offN = Math.floor(off * N * 0.6);
      for (let k = 0; k < N; k++) {
        const i = order[k].i, on = k >= offN;
        barNow[i] += ((on ? 1 : 0.06) - barNow[i]) * Math.min(1, dt * 5);
        const h = barH[i] * barNow[i];
        m4.compose(vP.set(barPos[i][0], -3 + h / 2, barPos[i][1]), qI, vS.set(1, h, 1)); servers.setMatrixAt(i, m4);
        servers.setColorAt(i, on ? GOLD : DIM);
      }
      servers.instanceMatrix.needsUpdate = true;
      servers.instanceColor.needsUpdate = true;
      if (counter && off !== costShown) { counter.textContent = fmt(off * 2e6); costShown = off; }
    }

    // Threads: wrong-author red at the old resource, restored green at the new one.
    tMat.uniforms.uMove.value = band(p, 0.84, 0.97);
    threads.visible = p > 0.78; // from the cost stop it would read as a stray planet

    caps.forEach((c) => { const a = +c.dataset.from, b = +c.dataset.to; c.classList.toggle('on', p >= a && p <= b); });
    let cur = 0; rail.forEach((b, k) => { if (p >= +b.dataset.p - 0.05) cur = k; });
    rail.forEach((b, k) => b.classList.toggle('on', k === cur));
    section.style.setProperty('--journey', p.toFixed(4));
    composer.render(dt);
    if (running) requestAnimationFrame(frame);
  }
  const start = () => { if (!running && visible && !document.hidden) { running = true; last = performance.now(); readScroll(); requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else running = false; }, { rootMargin: '200px 0px' }).observe(section);
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else start(); });
}
