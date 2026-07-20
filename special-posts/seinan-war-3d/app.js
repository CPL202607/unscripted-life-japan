/* ════════════════════════════════════════════════════════════
   西南戰爭 3D 互動沙盤 — 引擎
   Three.js r149
   ════════════════════════════════════════════════════════════ */
(function () {
'use strict';

/* ───────── 工具 ───────── */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeIO = t => t * t * (3 - 2 * t);

/* 決定性偽隨機（value noise） */
function hash2(x, y) {
  let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
let seedCounter = 1;
function srand() { seedCounter = (seedCounter * 16807) % 2147483647; return (seedCounter - 1) / 2147483646; }

/* ───────── 地形高度場 ───────── */
function gauss(x, z, cx, cz, rx, rz) {
  const dx = (x - cx) / rx, dz = (z - cz) / rz;
  return Math.exp(-(dx * dx + dz * dz));
}
function capsule(x, z, ax, az, bx, bz, w) {
  const abx = bx - ax, abz = bz - az;
  const t = clamp(((x - ax) * abx + (z - az) * abz) / (abx * abx + abz * abz), 0, 1);
  const dx = x - (ax + abx * t), dz = z - (az + abz * t);
  const d2 = dx * dx + dz * dz;
  return Math.exp(-d2 / (w * w));
}

function hAt(x, z) {
  /* 九州陸塊 */
  let m = 0;
  m = Math.max(m, gauss(x, z, -38, -118, 52, 40));   // 筑後・福岡
  m = Math.max(m, gauss(x, z, -12, -72, 50, 42));    // 熊本北部
  m = Math.max(m, gauss(x, z, -24, -30, 18, 28));    // 八代平野
  m = Math.max(m, gauss(x, z, 30, -62, 55, 48));     // 阿蘇・大分
  m = Math.max(m, gauss(x, z, 58, -30, 34, 40));     // 延岡
  m = Math.max(m, gauss(x, z, -6, 15, 48, 42));      // 球磨・人吉
  m = Math.max(m, gauss(x, z, -42, 20, 16, 20));     // 出水・水俣
  m = Math.max(m, gauss(x, z, 30, 35, 38, 48));      // 宮崎平原
  m = Math.max(m, gauss(x, z, -40, 72, 22, 38));     // 薩摩半島
  m = Math.max(m, gauss(x, z, -4, 78, 26, 40));      // 大隅半島
  m = Math.max(m, gauss(x, z, -30, 46, 22, 18));     // 川内・薩摩北部
  m = Math.max(m, gauss(x, z, -6, 50, 26, 20));      // 霧島山麓
  m = Math.max(m, gauss(x, z, -56, -54, 13, 17));    // 島原半島
  m = Math.max(m, gauss(x, z, -64, -22, 12, 16));    // 天草下島
  m = Math.max(m, gauss(x, z, -55, -34, 9, 11));     // 天草上島
  /* 內灣挖除 */
  m *= 1 - 0.95 * capsule(x, z, -46, -92, -32, -52, 11);  // 有明海
  m *= 1 - 0.9 * capsule(x, z, -52, -4, -46, 26, 8);      // 八代海
  m *= 1 - 0.92 * capsule(x, z, -22, 62, -21, 98, 10);    // 鹿兒島灣
  /* 櫻島（灣中火山島） */
  m = Math.max(m, gauss(x, z, -22, 79, 8, 7) * 1.2);
  const shore = smoothstep(0.34, 0.52, m);
  /* 山脈 */
  let mtn = 0;
  mtn += capsule(x, z, 16, -40, 2, 12, 20) * 14;          // 九州山地
  mtn += gauss(x, z, 18, -60, 10, 8) * 22;                // 阿蘇
  mtn -= gauss(x, z, 18, -60, 3, 2.5) * 9;                // 阿蘇火口
  mtn += gauss(x, z, -2, 44, 7, 7) * 20;                  // 霧島
  mtn += gauss(x, z, -22, 79, 5, 5) * 16;                 // 櫻島
  mtn += gauss(x, z, 58, -36, 14, 11) * 13;               // 可愛岳一帶
  mtn += gauss(x, z, -26, -70, 6, 4) * 4;                 // 田原坂丘陵
  mtn += gauss(x, z, -30, -130, 14, 11) * 7;              // 北部山地
  mtn += gauss(x, z, -42, 62, 9, 12) * 7;                 // 薩摩山地
  mtn += gauss(x, z, -57, -54, 6, 7) * 9;                 // 雲仙
  mtn -= gauss(x, z, -14, 10, 7, 6) * 5;                  // 人吉盆地
  mtn = Math.max(mtn, 0);
  const n = vnoise(x * 0.06, z * 0.06) * 0.6 + vnoise(x * 0.16, z * 0.16) * 0.4;
  const hland = 1.2 + n * 2.2 + mtn * (0.75 + 0.5 * n);
  return -5 * (1 - shore) + shore * hland;
}
function groundY(x, z) { return Math.max(hAt(x, z), 0.4); }

/* ───────── 場景 ───────── */
const canvas = document.getElementById('c3d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc2d1d9);
scene.fog = new THREE.Fog(0xc2d1d9, 560, 1200);
const camera = new THREE.PerspectiveCamera(46, 1, 1, 2500);

const hemi = new THREE.HemisphereLight(0xf2f6f8, 0x8a8068, 0.95);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dc, 0.85);
sun.position.set(-160, 220, -120);
scene.add(sun);

/* 地形網格 */
(function buildTerrain() {
  const W = 300, H = 380, SX = 200, SZ = 250;
  const geo = new THREE.PlaneGeometry(W, H, SX, SZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cSea = new THREE.Color(0x6d92a6), cSand = new THREE.Color(0xbcae8b);
  const cPlain = new THREE.Color(0x97a578), cHill = new THREE.Color(0x8b845f);
  const cMtn = new THREE.Color(0x7a6a53), cPeak = new THREE.Color(0xaba296)
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = hAt(x, z);
    pos.setY(i, h);
    if (h <= 0.1) tmp.copy(cSea);
    else if (h < 2) tmp.copy(cSand).lerp(cPlain, smoothstep(0.6, 2, h));
    else if (h < 8) tmp.copy(cPlain).lerp(cHill, smoothstep(2, 8, h));
    else if (h < 17) tmp.copy(cHill).lerp(cMtn, smoothstep(8, 17, h));
    else tmp.copy(cMtn).lerp(cPeak, smoothstep(17, 26, h));
    const sh = 0.92 + vnoise(x * 0.3, z * 0.3) * 0.13;
    colors[i * 3] = tmp.r * sh; colors[i * 3 + 1] = tmp.g * sh; colors[i * 3 + 2] = tmp.b * sh;
  }
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  scene.add(new THREE.Mesh(geo, mat));
  /* 海面 */
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, 1600),
    new THREE.MeshLambertMaterial({ color: 0x85a9bd, transparent: true, opacity: 0.9 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.05;
  scene.add(water);
})();

/* 城市標記（3D 小點） */
CITIES.forEach(c => {
  if (c.mtn) return;
  const dot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.6, 8),
    new THREE.MeshBasicMaterial({ color: 0x6b6353 })
  );
  dot.position.set(c.p[0], groundY(c.p[0], c.p[1]) + 0.3, c.p[1]);
  scene.add(dot);
});

/* 熊本城 */
const castle = new THREE.Group();
(function buildCastle() {
  const [cx, cz] = GEO.kumamoto;
  const y = groundY(cx, cz);
  const base = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.2, 4.5),
    new THREE.MeshLambertMaterial({ color: 0x8d8778 }));
  base.position.y = 1.1;
  castle.add(base);
  const keep = new THREE.Group();
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 3), new THREE.MeshLambertMaterial({ color: 0x3a3d45 }));
  t1.position.y = 3;
  const r1 = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1, 4), new THREE.MeshLambertMaterial({ color: 0x2b2e36 }));
  r1.position.y = 4.2; r1.rotation.y = Math.PI / 4;
  const t2 = new THREE.Mesh(new THREE.BoxGeometry(2, 1.3, 2), new THREE.MeshLambertMaterial({ color: 0x3a3d45 }));
  t2.position.y = 5.1;
  const r2 = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.1, 4), new THREE.MeshLambertMaterial({ color: 0x2b2e36 }));
  r2.position.y = 6.2; r2.rotation.y = Math.PI / 4;
  keep.add(t1, r1, t2, r2);
  keep.name = 'keep';
  castle.add(keep);
  castle.position.set(cx, y, cz);
  scene.add(castle);
})();

/* ───────── 旗幟貼圖 ───────── */
const flagTextures = {};
function flagTexture(f) {
  if (flagTextures[f]) return flagTextures[f];
  const fa = FACTIONS[f];
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2);
  g.fillStyle = fa.css; g.fill();
  g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 64px "Noto Serif TC", serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(fa.kanji, 64, 68);
  const tex = new THREE.CanvasTexture(cv);
  flagTextures[f] = tex;
  return tex;
}

/* ───────── 部隊 ───────── */
const labelsEl = document.getElementById('labels');
const activeObjects = [];   // {update(u,dt), dispose(), setFade(k)}

function pathPoints(def) {
  return (def.path || [def.at]).map(p => new THREE.Vector3(p[0], 0, p[1]));
}
function samplePath(pts, t) {
  if (pts.length === 1) return pts[0].clone();
  const segs = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) { const d = pts[i].distanceTo(pts[i + 1]); segs.push(d); total += d; }
  let dist = clamp(t, 0, 1) * total;
  for (let i = 0; i < segs.length; i++) {
    if (dist <= segs[i] || i === segs.length - 1) {
      return pts[i].clone().lerp(pts[i + 1], segs[i] ? clamp(dist / segs[i], 0, 1) : 0);
    }
    dist -= segs[i];
  }
  return pts[pts.length - 1].clone();
}

class ArmyUnit {
  constructor(def) {
    this.def = def;
    this.pts = pathPoints(def);
    this.group = new THREE.Group();
    const men = def.men || 1000;
    const count = Math.round(clamp(men / 110, 14, 260));
    this.spread = 1.8 + Math.sqrt(men) / 26;
    const posArr = new Float32Array(count * 3);
    this.offsets = [];
    for (let i = 0; i < count; i++) {
      const a = srand() * Math.PI * 2, r = Math.sqrt(srand()) * this.spread;
      this.offsets.push([Math.cos(a) * r, Math.sin(a) * r]);
      posArr[i * 3] = this.offsets[i][0];
      posArr[i * 3 + 1] = 0.5;
      posArr[i * 3 + 2] = this.offsets[i][1];
    }
    const pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    this.dotMat = new THREE.PointsMaterial({ color: FACTIONS[def.f].color, size: 1.5, sizeAttenuation: true, transparent: true, opacity: 0.95 });
    this.group.add(new THREE.Points(pgeo, this.dotMat));
    /* 底環 */
    this.ringMat = new THREE.MeshBasicMaterial({ color: FACTIONS[def.f].color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.CircleGeometry(this.spread + 1.2, 40), this.ringMat);
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25;
    this.group.add(ring);
    /* 軍旗 */
    this.flagMat = new THREE.SpriteMaterial({ map: flagTexture(def.f), transparent: true });
    const flag = new THREE.Sprite(this.flagMat);
    flag.scale.set(5.5, 5.5, 1);
    flag.position.y = 7.5;
    this.group.add(flag);
    this.poleMat = new THREE.LineBasicMaterial({ color: 0x444444, transparent: true });
    const pole = new THREE.Line(new THREE.BufferGeometry().setFromPoints(
      [new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(0, 5.2, 0)]), this.poleMat);
    this.group.add(pole);
    /* 行軍軌跡 */
    this.trail = null;
    if (this.pts.length > 1) {
      const curvePts = [];
      for (let i = 0; i <= 60; i++) {
        const p = samplePath(this.pts, i / 60);
        curvePts.push(new THREE.Vector3(p.x, Math.max(hAt(p.x, p.z), 0.2) + 1.2, p.z));
      }
      const curve = new THREE.CatmullRomCurve3(curvePts);
      this.trailMat = new THREE.MeshBasicMaterial({ color: FACTIONS[def.f].color, transparent: true, opacity: 0.45, depthWrite: false });
      this.trail = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.55, 5, false), this.trailMat);
      scene.add(this.trail);
      /* 箭頭 */
      const end = curvePts[curvePts.length - 1], prev = curvePts[curvePts.length - 2];
      const dir = end.clone().sub(prev).normalize();
      this.cone = new THREE.Mesh(new THREE.ConeGeometry(1.8, 4, 8), this.trailMat);
      this.cone.position.copy(end).add(dir.clone().multiplyScalar(2));
      this.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      scene.add(this.cone);
    }
    scene.add(this.group);
    /* HTML 標籤 */
    this.el = document.createElement('div');
    this.el.className = 'unit-label f-' + def.f;
    this.el.innerHTML = '<b>' + def.lab + '</b>' + (def.sub ? '<span>' + def.sub + '</span>' : '');
    labelsEl.appendChild(this.el);
    this.fade = 0;
  }
  localU(u) {
    const u0 = this.def.u0 || 0, u1 = this.def.u1 != null ? this.def.u1 : 1;
    return clamp((u - u0) / Math.max(u1 - u0, 0.001), 0, 1);
  }
  update(u) {
    const u0 = this.def.u0 || 0, u1 = this.def.u1 != null ? this.def.u1 : 1;
    let vis = 1;
    if (u < u0) vis = 0;
    if (this.def.u1 != null && u > u1) vis = Math.max(0, 1 - (u - u1) * 6);
    this.vis = vis;
    const p = samplePath(this.pts, easeIO(this.localU(u)));
    this.group.position.set(p.x, Math.max(hAt(p.x, p.z), 0.2) + 0.15, p.z);
    this.worldPos = new THREE.Vector3(p.x, this.group.position.y + 6 + (this.stagger || 0), p.z);
  }
  setFade(k) {
    const o = k * (this.vis == null ? 1 : this.vis);
    this.fade = o;
    this.dotMat.opacity = 0.95 * o;
    this.ringMat.opacity = 0.16 * o;
    this.flagMat.opacity = o;
    this.poleMat.opacity = o;
    if (this.trailMat) this.trailMat.opacity = 0.45 * o;
    this.el.style.opacity = o;
    this.group.visible = o > 0.02;
    if (this.trail) { this.trail.visible = o > 0.02; this.cone.visible = o > 0.02; }
  }
  dispose() {
    scene.remove(this.group);
    if (this.trail) { scene.remove(this.trail); scene.remove(this.cone); }
    this.el.remove();
  }
}

class FleetUnit {
  constructor(def) {
    this.def = def;
    this.pts = pathPoints(def);
    this.group = new THREE.Group();
    this.mats = [];
    const n = def.ships || 5;
    this.ships = [];
    for (let i = 0; i < n; i++) {
      const ship = new THREE.Group();
      const hullMat = new THREE.MeshLambertMaterial({ color: 0x2e3238, transparent: true });
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 4.6), hullMat);
      hull.position.y = 0.5;
      const supMat = new THREE.MeshLambertMaterial({ color: 0xd9d4c8, transparent: true });
      const sup = new THREE.Mesh(new THREE.BoxGeometry(1, 0.7, 2), supMat);
      sup.position.y = 1.2;
      const funMat = new THREE.MeshLambertMaterial({ color: 0x1c1e22, transparent: true });
      const fun = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.4, 8), funMat);
      fun.position.set(0, 1.9, -0.4);
      ship.add(hull, sup, fun);
      this.mats.push(hullMat, supMat, funMat);
      this.group.add(ship);
      this.ships.push(ship);
    }
    scene.add(this.group);
    if (this.pts.length > 1) {
      const curvePts = [];
      for (let i = 0; i <= 50; i++) {
        const p = samplePath(this.pts, i / 50);
        curvePts.push(new THREE.Vector3(p.x, 0.6, p.z));
      }
      this.trailMat = new THREE.LineDashedMaterial({ color: FACTIONS[def.f].color, transparent: true, opacity: 0.7, dashSize: 2.5, gapSize: 1.8 });
      this.trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curvePts), this.trailMat);
      this.trail.computeLineDistances();
      scene.add(this.trail);
    }
    this.el = document.createElement('div');
    this.el.className = 'unit-label f-' + def.f;
    this.el.innerHTML = '<b>' + def.lab + '</b>' + (def.sub ? '<span>' + def.sub + '</span>' : '');
    labelsEl.appendChild(this.el);
  }
  update(u, dt, time) {
    const u0 = this.def.u0 || 0, u1 = this.def.u1 != null ? this.def.u1 : 1;
    this.vis = u < u0 ? 0 : 1;
    const t = easeIO(clamp((u - u0) / Math.max(u1 - u0, 0.001), 0, 1));
    const lead = samplePath(this.pts, t);
    let dir = new THREE.Vector3(0, 0, -1);
    if (this.pts.length > 1) {
      const ahead = samplePath(this.pts, Math.min(t + 0.02, 1));
      dir = ahead.sub(lead.clone()).normalize();
      if (dir.length() < 0.01) dir.set(0, 0, -1);
    }
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    this.ships.forEach((s, i) => {
      const back = dir.clone().multiplyScalar(-(i * 5.5));
      const off = side.clone().multiplyScalar((i % 2 ? 1 : -1) * (1.5 + (i % 3)));
      s.position.copy(lead).add(back).add(off);
      s.position.y = 0.15 + Math.sin(time * 2 + i) * 0.12;
      s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    });
    this.worldPos = new THREE.Vector3(lead.x, 5, lead.z);
  }
  setFade(k) {
    const o = k * (this.vis == null ? 1 : this.vis);
    this.fade = o;
    this.mats.forEach(m => m.opacity = o);
    if (this.trailMat) this.trailMat.opacity = 0.7 * o;
    this.el.style.opacity = o;
    this.group.visible = o > 0.02;
    if (this.trail) this.trail.visible = o > 0.02;
  }
  dispose() {
    scene.remove(this.group);
    if (this.trail) scene.remove(this.trail);
    this.el.remove();
  }
}

/* ───────── 火焰特效 ───────── */
class FireFX {
  constructor(x, z, scale) {
    this.n = 130;
    this.scale = scale || 1;
    this.base = new THREE.Vector3(x, groundY(x, z), z);
    const pos = new Float32Array(this.n * 3);
    const col = new Float32Array(this.n * 3);
    this.life = [];
    for (let i = 0; i < this.n; i++) { this.life.push(srand()); }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.mat = new THREE.PointsMaterial({ size: 2.2 * this.scale, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    this.points = new THREE.Points(this.geo, this.mat);
    scene.add(this.points);
    this.seeds = [];
    for (let i = 0; i < this.n; i++) this.seeds.push([srand() * 2 - 1, srand() * 2 - 1, srand()]);
  }
  update(dt) {
    const pos = this.geo.attributes.position.array;
    const col = this.geo.attributes.color.array;
    for (let i = 0; i < this.n; i++) {
      this.life[i] += dt * (0.5 + this.seeds[i][2] * 0.8);
      if (this.life[i] > 1) this.life[i] -= 1;
      const l = this.life[i];
      const r = (1 - l) * 2.2 * this.scale;
      pos[i * 3] = this.base.x + this.seeds[i][0] * r;
      pos[i * 3 + 1] = this.base.y + l * 7 * this.scale;
      pos[i * 3 + 2] = this.base.z + this.seeds[i][1] * r;
      col[i * 3] = 1;
      col[i * 3 + 1] = 0.55 * (1 - l) + 0.15;
      col[i * 3 + 2] = 0.08 * (1 - l);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
  setFade(k) { this.mat.opacity = 0.9 * k; this.points.visible = k > 0.02; }
  dispose() { scene.remove(this.points); }
}

/* ───────── 天候 ───────── */
function makeWeather(kind) {
  const n = kind === 'snow' ? 1400 : 900;
  const box = 220;
  const pos = new Float32Array(n * 3);
  const vel = [];
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (srand() - 0.5) * box;
    pos[i * 3 + 1] = srand() * 90;
    pos[i * 3 + 2] = (srand() - 0.5) * box;
    vel.push(kind === 'snow' ? 6 + srand() * 5 : 60 + srand() * 30);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = kind === 'snow'
    ? new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, transparent: true, opacity: 0.8, depthWrite: false })
    : new THREE.PointsMaterial({ color: 0x9db6c4, size: 0.5, transparent: true, opacity: 0.55, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  pts.visible = false;
  scene.add(pts);
  return { pts, geo, mat, vel, n, box,
    update(dt, center) {
      if (!pts.visible) return;
      const a = geo.attributes.position.array;
      for (let i = 0; i < n; i++) {
        a[i * 3 + 1] -= vel[i] * dt;
        if (a[i * 3 + 1] < 0) {
          a[i * 3 + 1] = 80 + srand() * 15;
          a[i * 3] = (srand() - 0.5) * box;
          a[i * 3 + 2] = (srand() - 0.5) * box;
        }
      }
      geo.attributes.position.needsUpdate = true;
      pts.position.set(center.x, 0, center.z);
    } };
}
const snowFX = makeWeather('snow');
const rainFX = makeWeather('rain');

/* ───────── 播放時間軸 ───────── */
const TOTAL = PHASES.reduce((s, p) => s + p.dur, 0);
const state = {
  t: 0, playing: false, speed: 1, phase: -1, u: 0,
  manual: false, started: false, fade: 0,
};
let fires = [];
let calloutEls = [];

function phaseAt(t) {
  let acc = 0;
  for (let i = 0; i < PHASES.length; i++) {
    if (t < acc + PHASES[i].dur || i === PHASES.length - 1) return { i, u: clamp((t - acc) / PHASES[i].dur, 0, 1) };
    acc += PHASES[i].dur;
  }
  return { i: PHASES.length - 1, u: 1 };
}
function phaseStart(i) {
  let acc = 0;
  for (let k = 0; k < i; k++) acc += PHASES[k].dur;
  return acc;
}

function enterPhase(i) {
  state.phase = i;
  const P = PHASES[i];
  /* 清場 */
  activeObjects.forEach(o => o.dispose());
  activeObjects.length = 0;
  fires.forEach(f => f.dispose());
  fires = [];
  calloutEls.forEach(c => c.el.remove());
  calloutEls = [];
  /* 部隊 */
  Object.keys(P.units || {}).forEach((id, idx) => {
    const def = P.units[id];
    const u = def.kind === 'fleet' ? new FleetUnit(def) : new ArmyUnit(def);
    u.stagger = (idx % 3) * 3.2;
    activeObjects.push(u);
  });
  /* 特效 */
  snowFX.pts.visible = !!(P.fx && P.fx.snow);
  rainFX.pts.visible = !!(P.fx && P.fx.rain);
  if (P.fx && P.fx.fire === 'tenshu') fires.push(new FireFX(GEO.kumamoto[0], GEO.kumamoto[1], 1));
  if (P.fx && P.fx.fire === 'shiroyama') fires.push(new FireFX(GEO.shiroyama[0], GEO.shiroyama[1], 1.4));
  /* 天守存滅：第 3 幕（index 2）中段燒毀後不再出現 */
  const keep = castle.getObjectByName('keep');
  keep.visible = i < 2 || (i === 2 && state.u < 0.15);
  /* 光線氛圍 */
  const tod = (P.fx && P.fx.tod) || 0;
  hemi.intensity = lerp(0.95, 0.55, tod);
  sun.intensity = lerp(0.85, 0.45, tod);
  sun.color.setHex(tod > 0.3 ? 0xffc890 : 0xfff2dc);
  const fogC = new THREE.Color(0xc2d1d9).lerp(new THREE.Color(0x8b8a95), tod);
  scene.fog.color.copy(fogC);
  scene.background.copy(fogC);
  /* 標註 */
  (P.callouts || []).forEach(co => {
    const el = document.createElement('div');
    el.className = 'callout';
    el.innerHTML = '<i></i><div><b>' + co.txt + '</b>' + (co.sub ? '<span>' + co.sub + '</span>' : '') + '</div>';
    el.style.opacity = 0;
    labelsEl.appendChild(el);
    calloutEls.push({ el, co, shown: false });
  });
  state.fade = 0;
  renderHUD(P, i);
}

/* ───────── HUD ───────── */
const $ = id => document.getElementById(id);
const chipsEl = $('chips');
PHASES.forEach((p, i) => {
  const b = document.createElement('button');
  b.className = 'chip';
  b.innerHTML = '<i>' + (i + 1) + '</i>' + p.chip;
  b.onclick = () => { seekTo(phaseStart(i) + 0.001); play(); };
  chipsEl.appendChild(b);
});

function fmtMen(v) {
  if (typeof v !== 'number') return v;
  if (v >= 10000) {
    const w = v / 10000;
    return (w % 1 ? w.toFixed(1) : w) + ' 萬';
  }
  return v.toLocaleString();
}

function renderHUD(P, i) {
  /* chips */
  [...chipsEl.children].forEach((c, k) => c.classList.toggle('on', k === i));
  $('phaseNum').textContent = '第 ' + (i + 1) + ' / ' + PHASES.length + ' 幕';
  /* 勢力 */
  ['go', 'sa', 'ch'].forEach(f => {
    const row = $('str-' + f);
    const d = P.str[f];
    row.querySelector('.v').textContent = d ? fmtMen(d[0]) : '—';
    row.querySelector('.note').textContent = (d && d[1]) ? d[1] : '';
  });
  /* 解說面板 */
  $('dDate').textContent = P.date;
  $('dTitle').textContent = P.title;
  $('dNarr').textContent = P.narr;
  $('dEvents').innerHTML = P.events.map(e => '<li>' + e + '</li>').join('');
  $('dSciT').textContent = P.sci.t;
  $('dSciTxt').textContent = P.sci.txt;
  $('dSciSrc').innerHTML = P.sci.src.map(s => '<a href="' + s[1] + '" target="_blank" rel="noopener">' + s[0] + ' ↗</a>').join('');
  $('dPeople').innerHTML = P.people.map(p =>
    '<span class="pp f-' + p[0] + '">' + FACTIONS[p[0]].kanji + '｜' + p[1] + '</span>').join('');
  /* 幕標題浮現 */
  const toast = $('toast');
  toast.innerHTML = '<i>第' + '一二三四五六七八九十十十'.charAt(i) + (i >= 9 ? ['十', '十一', '十二'][i - 9] : '') + '幕</i>' + P.title;
  toast.innerHTML = '<i>第 ' + (i + 1) + ' 幕</i>' + P.title;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
}

/* ───────── 相機 ───────── */
const cam = { t: new THREE.Vector3(-15, 0, -25), r: 460, th: -0.25, el: 1.05 };
function desiredCam(P, u) {
  const a = P.cam.a, b = P.cam.b;
  const k = easeIO(u);
  return {
    tx: lerp(a.t[0], b.t[0], k), tz: lerp(a.t[1], b.t[1], k),
    r: lerp(a.r, b.r, k), th: lerp(a.th, b.th, k), el: lerp(a.el, b.el, k),
  };
}
function applyCam() {
  const ty = Math.max(hAt(cam.t.x, cam.t.z), 0) + 2;
  const horiz = cam.r * Math.cos(cam.el);
  camera.position.set(
    cam.t.x + horiz * Math.sin(cam.th),
    ty + cam.r * Math.sin(cam.el),
    cam.t.z + horiz * Math.cos(cam.th)
  );
  camera.lookAt(cam.t.x, ty, cam.t.z);
}

/* 手動視角 */
const manualBtn = $('manualBtn');
function setManual(m) {
  state.manual = m;
  manualBtn.classList.toggle('on', m);
  manualBtn.innerHTML = m ? '🎬 回到自動運鏡' : '✋ 手動視角';
}
manualBtn.onclick = () => setManual(!state.manual);
let dragging = false, panning = false, px = 0, py = 0;
canvas.addEventListener('pointerdown', e => {
  if (!state.started) return;
  dragging = true; panning = (e.button === 2 || e.shiftKey);
  px = e.clientX; py = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = e.clientX - px, dy = e.clientY - py;
  px = e.clientX; py = e.clientY;
  if (!state.manual) setManual(true);
  if (panning) {
    const s = cam.r * 0.0016;
    const fx = Math.sin(cam.th), fz = Math.cos(cam.th);
    cam.t.x -= (dx * fz - (-dy) * fx) * s * -1;
    cam.t.z -= (dx * -fx + (-dy) * fz) * s * -1;
    cam.t.x = clamp(cam.t.x, -140, 140);
    cam.t.z = clamp(cam.t.z, -180, 160);
  } else {
    cam.th -= dx * 0.005;
    cam.el = clamp(cam.el + dy * 0.004, 0.18, 1.45);
  }
});
canvas.addEventListener('pointerup', () => dragging = false);
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => {
  if (!state.started) return;
  e.preventDefault();
  if (!state.manual) setManual(true);
  cam.r = clamp(cam.r * (1 + e.deltaY * 0.0012), 35, 650);
}, { passive: false });

/* ───────── 播放控制 ───────── */
function play() { state.playing = true; $('playBtn').textContent = '⏸'; }
function pause() { state.playing = false; $('playBtn').textContent = '▶'; }
$('playBtn').onclick = () => state.playing ? pause() : play();
$('prevBtn').onclick = () => { const c = phaseAt(state.t); seekTo(phaseStart(Math.max(c.i - 1, 0)) + 0.001); play(); };
$('nextBtn').onclick = () => { const c = phaseAt(state.t); seekTo(phaseStart(Math.min(c.i + 1, PHASES.length - 1)) + 0.001); play(); };
const speeds = [1, 2, 0.5];
let spIdx = 0;
$('speedBtn').onclick = () => {
  spIdx = (spIdx + 1) % speeds.length;
  state.speed = speeds[spIdx];
  $('speedBtn').textContent = speeds[spIdx] + 'x';
};
$('bar').addEventListener('pointerdown', e => {
  const rect = $('bar').getBoundingClientRect();
  seekTo(clamp((e.clientX - rect.left) / rect.width, 0, 1) * TOTAL);
  play();
});
function seekTo(t) {
  state.t = clamp(t, 0, TOTAL - 0.01);
  const c = phaseAt(state.t);
  state.u = c.u;
  if (c.i !== state.phase) { enterPhase(c.i); state.snapCam = true; }
  else {
    calloutEls.forEach(ce => { if (c.u < ce.co.t) { ce.shown = false; ce.el.style.opacity = 0; } });
  }
}
document.addEventListener('keydown', e => {
  if (!state.started) return;
  if (e.code === 'Space') { e.preventDefault(); state.playing ? pause() : play(); }
  if (e.code === 'ArrowLeft') $('prevBtn').onclick();
  if (e.code === 'ArrowRight') $('nextBtn').onclick();
});

/* 解說面板 */
$('drawerToggle').onclick = () => { $('drawer').classList.add('open'); $('drawerToggle').style.display = 'none'; };
$('drawerClose').onclick = () => { $('drawer').classList.remove('open'); $('drawerToggle').style.display = ''; };

/* 說明、全螢幕 */
$('helpBtn').onclick = () => $('helpModal').classList.add('show');
$('helpClose').onclick = () => $('helpModal').classList.remove('show');
$('helpModal').addEventListener('click', e => { if (e.target === $('helpModal')) $('helpModal').classList.remove('show'); });
$('fsBtn').onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
};

/* 進場 */
$('enterBtn').onclick = () => {
  $('intro').classList.add('gone');
  state.started = true;
  seekTo(0);
  play();
};

/* ───────── 投影輔助 ───────── */
const projV = new THREE.Vector3();
function toScreen(v) {
  projV.copy(v).project(camera);
  if (projV.z > 1) return null;
  return {
    x: (projV.x * 0.5 + 0.5) * innerWidth,
    y: (-projV.y * 0.5 + 0.5) * innerHeight,
  };
}

/* 城市 HTML 標籤 */
const cityEls = CITIES.map(c => {
  const el = document.createElement('div');
  el.className = 'city-label' + (c.min ? ' min' : '') + (c.mtn ? ' mtn' : '');
  el.textContent = (c.mtn ? '▲ ' : '') + c.n;
  labelsEl.appendChild(el);
  return { el, c };
});

/* ───────── 標籤碰撞排除 ─────────
   每幀以螢幕空間矩形檢測重疊，優先序：事件標註 > 部隊 > 城市。
   部隊標籤逐步上移閃避；城市標籤閃避失敗則暫時隱藏。 */
function labelSize(el) {
  if (el._w == null) { el._w = el.offsetWidth; el._h = el.offsetHeight; }
}
function clearSizeCache() {
  cityEls.forEach(({ el }) => { el._w = null; });
  activeObjects.forEach(o => { if (o.el) o.el._w = null; });
  calloutEls.forEach(ce => { ce.el._w = null; });
}
const frameRects = [];
function rectOverlaps(x, y, w, h) {
  for (let i = 0; i < frameRects.length; i++) {
    const o = frameRects[i];
    if (x < o.x + o.w + 4 && x + w + 4 > o.x && y < o.y + o.h + 3 && y + h + 3 > o.y) return true;
  }
  return false;
}
/* 依序嘗試：原位 → 逐步上移 → 逐步下移 */
const DY_CANDIDATES = [0, -13, -26, -39, -52, -65, -78, -91, -104, 18, 36, 54, 72];
function findFreeDy(x, yTop, w, h) {
  for (let i = 0; i < DY_CANDIDATES.length; i++) {
    if (!rectOverlaps(x, yTop + DY_CANDIDATES[i], w, h)) return DY_CANDIDATES[i];
  }
  return DY_CANDIDATES[0];
}

/* ───────── 主迴圈 ───────── */
let lastTime = performance.now();
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  clearSizeCache();
}
addEventListener('resize', resize);
resize();

function animate(now) {
  requestAnimationFrame(animate);
  const dtRaw = Math.min((now - lastTime) / 1000, 1.5);
  const dt = Math.min(dtRaw, 0.1);
  lastTime = now;
  const time = now / 1000;

  if (state.started && state.playing) {
    state.t += dtRaw * state.speed;
    if (state.t >= TOTAL) { state.t = TOTAL - 0.001; pause(); }
  }
  const c = phaseAt(state.t);
  state.u = c.u;
  if (c.i !== state.phase && state.started) enterPhase(c.i);
  const P = PHASES[state.phase < 0 ? 0 : state.phase];

  /* 相機 */
  if (state.started && !state.manual) {
    const d = desiredCam(P, state.u);
    if (state.snapCam) {
      cam.t.x = d.tx; cam.t.z = d.tz; cam.r = d.r; cam.th = d.th; cam.el = d.el;
      state.snapCam = false;
    }
    const k = 1 - Math.exp(-dtRaw * 2.6);
    cam.t.x = lerp(cam.t.x, d.tx, k);
    cam.t.z = lerp(cam.t.z, d.tz, k);
    cam.r = lerp(cam.r, d.r, k);
    cam.th = lerp(cam.th, d.th, k);
    cam.el = lerp(cam.el, d.el, k);
  }
  applyCam();

  /* 部隊（先更新位置與淡入，標籤稍後統一佈局） */
  state.fade = Math.min(state.fade + dt * 1.8, 1);
  activeObjects.forEach(o => {
    o.update(state.u, dt, time);
    o.setFade(state.fade);
  });
  frameRects.length = 0;

  /* 天守於第 3 幕中燒毀 */
  if (state.phase === 2) {
    castle.getObjectByName('keep').visible = state.u < 0.15;
  }

  /* 特效 */
  fires.forEach(f => { f.update(dt); f.setFade(state.fade); });
  snowFX.update(dt, cam.t);
  rainFX.update(dt, cam.t);

  /* 標註浮現（最優先，佔位不閃避） */
  calloutEls.forEach(ce => {
    if (state.u >= ce.co.t && !ce.shown) { ce.shown = true; }
    ce.el.style.opacity = ce.shown ? 1 : 0;
    const y = Math.max(hAt(ce.co.p[0], ce.co.p[1]), 0.3) + 3;
    const s = toScreen(new THREE.Vector3(ce.co.p[0], y, ce.co.p[1]));
    if (s) {
      let dy = 0;
      if (ce.shown) {
        labelSize(ce.el);
        dy = findFreeDy(s.x - 4, s.y - ce.el._h / 2, ce.el._w, ce.el._h);
        frameRects.push({ x: s.x - 4, y: s.y - ce.el._h / 2 + dy, w: ce.el._w, h: ce.el._h });
      }
      ce.el.style.transform = 'translate(-4px,-50%) translate(' + s.x + 'px,' + (s.y + dy) + 'px)';
      ce.el.style.display = '';
    } else ce.el.style.display = 'none';
  });

  /* 部隊標籤（重疊時逐步上移閃避） */
  activeObjects.forEach(o => {
    if (!o.el || !o.worldPos) return;
    if (o.fade != null && o.fade < 0.04) { o.el.style.display = 'none'; return; }
    const s = toScreen(o.worldPos);
    if (!s) { o.el.style.display = 'none'; return; }
    labelSize(o.el);
    const dy = findFreeDy(s.x - o.el._w / 2, s.y - o.el._h, o.el._w, o.el._h);
    frameRects.push({ x: s.x - o.el._w / 2, y: s.y - o.el._h + dy, w: o.el._w, h: o.el._h });
    o.el.style.transform = 'translate(-50%,-100%) translate(' + s.x + 'px,' + (s.y + dy) + 'px)';
    o.el.style.display = '';
  });

  /* 城市標籤（閃避失敗則隱藏） */
  const showMin = cam.r < 190;
  cityEls.forEach(({ el, c }) => {
    if (c.min && !showMin) { el.style.display = 'none'; return; }
    const y = Math.max(hAt(c.p[0], c.p[1]), 0.3) + (c.mtn ? 4 : 1.2);
    const s = toScreen(new THREE.Vector3(c.p[0], y, c.p[1]));
    if (!(s && s.x > -50 && s.x < innerWidth + 50 && s.y > -20 && s.y < innerHeight + 20)) {
      el.style.display = 'none'; return;
    }
    labelSize(el);
    let dy = 0, ok = false;
    for (let k = 0; k < 3; k++) {
      if (!rectOverlaps(s.x - el._w / 2, s.y - el._h + dy, el._w, el._h)) { ok = true; break; }
      dy -= 12;
    }
    if (!ok) { el.style.display = 'none'; return; }
    frameRects.push({ x: s.x - el._w / 2, y: s.y - el._h + dy, w: el._w, h: el._h });
    el.style.display = '';
    el.style.transform = 'translate(-50%,-100%) translate(' + s.x + 'px,' + (s.y + dy) + 'px)';
  });

  /* 進度條、羅盤、比例尺 */
  $('barFill').style.width = (state.t / TOTAL * 100) + '%';
  $('needle').style.transform = 'rotate(' + (-cam.th) + 'rad)';
  const s1 = toScreen(new THREE.Vector3(cam.t.x - 25, 0, cam.t.z));
  const s2 = toScreen(new THREE.Vector3(cam.t.x + 25, 0, cam.t.z));
  if (s1 && s2) {
    const px50 = Math.abs(s2.x - s1.x);
    $('scalebar').style.width = clamp(px50, 30, 260) + 'px';
  }

  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

/* 初始鏡頭（進場前緩慢繞行） */
(function idleSpin() {
  setInterval(() => {
    if (!state.started) cam.th += 0.0006;
  }, 16);
})();

})();
