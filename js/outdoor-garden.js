// 戶外池圓台上的景物：小溪的水、溪邊的石頭、濕地（水窪、蓮葉、蘆葦、香蒲）、矮灌木、
// 沙灘上的漂流木和小石子、草地上的小花、草叢、菇類。
//
// 全部是程式做的低面數模型＋程式畫的小貼圖，用 InstancedMesh 一次畫一大批，手機也跑得動。
// 亂數固定種子，每次開遊戲擺設都一樣。地面高度、哪裡是草地／沙灘都問 land（js/outdoor-land.js）。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { STREAM, SPRING, POOLS, ROCKY } from './outdoor-land.js';

// 矮灌木（x, z, 大小）：一叢一叢貼著地面，不要有樹幹
const BUSHES = [
  [130, -84, 9], [150, -134, 8], [40, -216, 10], [-160, -48, 8], [-56, -206, 9],
  [166, -36, 7], [-174, -96, 7], [-150, 14, 7], [104, -40, 6],
  [-18, -188, 7], [-120, -206, 6], [160, 6, 6], [70, -92, 6],
];
// 菇類的小群落
const MUSHROOMS = [[122, -96], [-150, -60], [-40, -196]];

export function buildGarden(scene, { land, rim, waterY, aniso }) {
  const rand = rng(20260927);
  const R = (a, b) => a + (b - a) * rand();
  const group = new THREE.Group();
  scene.add(group);

  const lightUniform = { value: new THREE.Color(1, 1, 1) };
  const timeUniform = { value: 0 };
  const H = (x, z) => land.height(x, z);

  // 烏龜會走到的地方（池子正面到右岸的沙灘、草地），不要擺東西擋住牠們
  const turtleZone = (x, z) => x > -92 && x < 94 && z > -20;
  const nearBush = (x, z, m) => BUSHES.some(([bx, bz, s]) => Math.hypot(x - bx, z - bz) < s + m);
  const freeSpot = (x, z, m = 2) =>
    land.inDisc(x, z, 4) && !turtleZone(x, z) && land.info(x, z).grass > 0.85 && !nearBush(x, z, m);
  const randomOnDisc = () => {
    const a = R(0, Math.PI * 2), r = Math.sqrt(rand()) * land.disc.r;
    return [land.disc.cx + Math.cos(a) * r, land.disc.cz + Math.sin(a) * r];
  };

  const m = new THREE.Matrix4(), qn = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();

  // ---------- 小溪的水 ----------
  const curve = new THREE.CatmullRomCurve3(STREAM.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'catmullrom', 0.4);
  const samples = 160;
  const pts = curve.getSpacedPoints(samples);
  // 水面高度：平地上是一條淺淺的溪，到了池邊順著岸坡流下去，碰到池子的水面就停
  for (const p of pts) p.y = land.streamSurface(p.x, p.z);
  let last = samples;
  for (let i = 10; i <= samples; i++) {
    if (pts[i].y <= waterY + 0.06) { last = Math.min(samples, i + 2); break; }
  }
  const mouth = pts[last];
  {
    const pos = [], uv = [], idx = [];
    let len = 0;
    for (let i = 0; i <= last; i++) {
      const p = pts[i];
      const q = pts[Math.min(last, i + 1)], o = pts[Math.max(0, i - 1)];
      const tx = q.x - o.x, tz = q.z - o.z, tl = Math.hypot(tx, tz) || 1;
      const nx = -tz / tl, nz = tx / tl;
      const w = land.streamWidth(i / samples) / 2 + 0.6;
      if (i > 0) len += p.distanceTo(pts[i - 1]);
      pos.push(p.x + nx * w, p.y, p.z + nz * w, p.x - nx * w, p.y, p.z - nz * w);
      uv.push(len / 10, 0, len / 10, 1);
      if (i < last) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    group.add(new THREE.Mesh(g, waterMaterial({ timeUniform, lightUniform, deep: 0x4f9fb0, light: 0xbfe6ea, speed: 1.2, opacity: 0.88 })));
  }
  // 溪水流進池子的地方：一圈一圈的水紋
  const splashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  const splash = new THREE.Mesh(new THREE.RingGeometry(1.6, 3.4, 24).rotateX(-Math.PI / 2), splashMat);
  splash.position.set(mouth.x, waterY + 0.5, mouth.z + 2);
  group.add(splash);

  // 泉水源頭與濕地的水窪（形狀跟地形挖的洞一樣）
  const springMat = waterMaterial({ timeUniform, lightUniform, deep: 0x4a98aa, light: 0xb8e2e8, speed: 0.4, opacity: 0.9 });
  const spring = new THREE.Mesh(blobGeometry(SPRING.r * 1.02, SPRING.r * 1.02, () => 1), springMat);
  spring.position.set(SPRING.x, land.baseHeight(SPRING.x, SPRING.z) - 0.55, SPRING.z);
  group.add(spring);
  const poolMat = waterMaterial({ timeUniform, lightUniform, deep: 0x4b7f72, light: 0x9fc8b8, speed: 0.25, opacity: 0.9 });
  POOLS.forEach((p, i) => {
    const pool = new THREE.Mesh(blobGeometry(p.r * 1.02, p.r * 0.85 * 1.02, a => land.wobble(a, i * 2.1 + 0.5)), poolMat);
    pool.position.set(p.x, land.baseHeight(p.x, p.z) - 0.5, p.z);
    group.add(pool);
  });

  // ---------- 石頭 ----------
  // [x, z, 大小, 扁平度, 顏色組]
  const stones = [];
  for (let i = 3; i < last - 3; i += 2) {
    const p = pts[i], q = pts[i + 1];
    const tl = Math.hypot(q.x - p.x, q.z - p.z) || 1;
    const nx = -(q.z - p.z) / tl, nz = (q.x - p.x) / tl;
    const w = land.streamWidth(i / samples) / 2;
    for (const side of [-1, 1]) {
      if (rand() < 0.3) continue;
      const off = w + R(0.6, 3.4);
      const s = rand() < 0.15 ? R(2.6, 4.2) : R(1, 2.4);   // 偶爾一顆大石頭
      stones.push([p.x + nx * off * side, p.z + nz * off * side, s, R(0.45, 0.75), 0]);
    }
  }
  // 過溪的踏腳石
  {
    const i = Math.round(samples * 0.42);
    const p = pts[i], q = pts[i + 1];
    const tl = Math.hypot(q.x - p.x, q.z - p.z) || 1;
    const nx = -(q.z - p.z) / tl, nz = (q.x - p.x) / tl;
    for (const k of [-1.6, -0.55, 0.55, 1.6]) stones.push([p.x + nx * k * 3.2, p.z + nz * k * 3.2, R(1.9, 2.3), 0.4, 0]);
  }
  for (let i = 0; i < 12; i++) {
    const a = R(0, Math.PI * 2), d = SPRING.r + R(0.5, 5);
    stones.push([SPRING.x + Math.cos(a) * d, SPRING.z + Math.sin(a) * d, R(2, 4.6), R(0.45, 0.7), 0]);
  }
  // 溪流石頭區：滿滿的大小石頭（不擋住溪水），溪裡也有被水沖圓的小石頭
  {
    const inRocky = (x, z, q) => land.rockyQ(x, z) < q && land.inDisc(x, z, 3);
    const clearOfWater = (x, z, m) => {
      const [d, at] = land.distToStream(x, z);
      return d > land.streamWidth(at) / 2 + m && Math.hypot(x - SPRING.x, z - SPRING.z) > SPRING.r + m;
    };
    const rx = () => ROCKY.x + R(-1, 1) * ROCKY.rx, rz = () => ROCKY.z + R(-1, 1) * ROCKY.rz;
    for (let i = 2; i < last - 2; i += 3) {                  // 溪的兩岸夾著大石頭
      const p = pts[i], q = pts[i + 1];
      if (land.rockyQ(p.x, p.z) > 0.9) continue;
      const tl = Math.hypot(q.x - p.x, q.z - p.z) || 1;
      const nx = -(q.z - p.z) / tl, nz = (q.x - p.x) / tl;
      const w = land.streamWidth(i / samples) / 2;
      for (const side of [-1, 1]) {
        if (rand() < 0.35) continue;
        const s = R(2.4, 5), off = w + s * 0.75 + R(0, 1.5);
        stones.push([p.x + nx * off * side, p.z + nz * off * side, s, R(0.55, 0.85), 0]);
      }
    }
    for (let n = 0, g = 0; n < 22 && g < 3000; g++) {        // 大石頭
      const x = rx(), z = rz(), s = R(2.8, 6.5);
      if (!inRocky(x, z, 0.85) || !clearOfWater(x, z, s * 0.8)) continue;
      stones.push([x, z, s, R(0.5, 0.8), 0]);
      n++;
    }
    for (let n = 0, g = 0; n < 90 && g < 4000; g++) {        // 中小石頭
      const x = rx(), z = rz();
      if (!inRocky(x, z, 1) || !clearOfWater(x, z, 1.2)) continue;
      stones.push([x, z, R(0.9, 2.4), R(0.45, 0.75), 0]);
      n++;
    }
    for (let n = 0, g = 0; n < 160 && g < 5000; g++) {       // 碎石
      const x = rx(), z = rz();
      if (!inRocky(x, z, 1.05) || !clearOfWater(x, z, 0.3)) continue;
      stones.push([x, z, R(0.3, 0.75), R(0.5, 0.8), 1]);
      n++;
    }
    for (let i = 3; i < last - 3; i++) {                     // 溪裡被水沖圓的小石頭
      const p = pts[i];
      if (land.rockyQ(p.x, p.z) > 0.95 || rand() < 0.45) continue;
      const w = land.streamWidth(i / samples) / 2;
      stones.push([p.x + R(-w, w) * 0.7, p.z + R(-w, w) * 0.7, R(0.6, 1.5), 0.7, 2]);
    }
  }
  // 草地上三三兩兩的小石堆
  for (let n = 0; n < 9;) {
    const [x, z] = randomOnDisc();
    if (!freeSpot(x, z, 4)) continue;
    const k = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < k; i++) stones.push([x + R(-3, 3), z + R(-3, 3), i ? R(0.8, 1.6) : R(1.8, 2.8), R(0.5, 0.75), 0]);
    n++;
  }
  // 沙灘：曬背用的大平石、滿地的小石子
  stones.push([44, -26, 6.5, 0.28, 0], [66, -23, 4.8, 0.3, 0], [-6, -30, 4.2, 0.32, 0]);
  for (let n = 0; n < 90;) {
    const x = R(-20, 95), z = R(-40, 40);
    const f = land.info(x, z);
    if (f.underwater || f.beach + f.bank < 0.6 || !land.inDisc(x, z, 3)) continue;
    stones.push([x, z, R(0.3, 0.8), R(0.5, 0.8), 1]);
    n++;
  }
  const stoneMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }), stones.length);
  const stoneColors = [
    [0xa89f8c, 0x938b7a, 0xb8ae98, 0x857d6e, 0x9ea08e, 0xc2b8a2],
    [0xe3dccb, 0xcfc4ad, 0xb9ad96, 0xeae4d6, 0xa99d86],     // 沙灘上的小石子：淺一點
    [0x6f7466, 0x7d7a6c, 0x65695e, 0x857f70],               // 溪裡濕濕的石頭：深一點
  ].map(g => g.map(c => new THREE.Color(c)));
  stones.forEach(([x, z, s, flat, set], i) => {
    const sy = s * flat;
    e.set(R(-0.2, 0.2), R(0, Math.PI * 2), R(-0.2, 0.2));
    m.compose(v.set(x, H(x, z) + sy * 0.3, z), qn.setFromEuler(e), sc.set(s * R(0.9, 1.3), sy, s * R(0.8, 1.2)));
    stoneMesh.setMatrixAt(i, m);
    const cs = stoneColors[set];
    stoneMesh.setColorAt(i, cs[Math.floor(rand() * cs.length)]);
  });
  group.add(stoneMesh);

  // 漂流木：沙灘後面一根橫躺的木頭，旁邊一小段
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x9b8264, roughness: 1, flatShading: true });
  for (const [x, z, len, r, rot] of [[30, -38, 20, 1.5, 0.35], [72, -44, 9, 1, -0.6]]) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, len, 7).rotateZ(Math.PI / 2), woodMat);
    log.position.set(x, H(x, z) + r * 0.7, z);
    log.rotation.y = rot;
    group.add(log);
  }

  // ---------- 濕地：蓮葉、蓮花、蘆葦、香蒲 ----------
  const pads = [], lotus = [];
  POOLS.forEach(p => {
    const y = land.baseHeight(p.x, p.z) - 0.3;
    const n = Math.round(p.r / 3);
    for (let i = 0; i < n; i++) {
      const a = R(0, Math.PI * 2), d = R(0, p.r * 0.7);
      pads.push([p.x + Math.cos(a) * d, y, p.z + Math.sin(a) * d * 0.85, R(1.6, 3)]);
      if (rand() < 0.3) lotus.push(pads[pads.length - 1]);
    }
  });
  // 池子後半邊也漂幾片（前半邊留給烏龜）
  for (let n = 0; n < 9;) {
    const x = R(-120, 0), z = R(-50, -24);
    const f = land.info(x, z);
    if (!f.underwater || waterY - f.h < 2) continue;
    pads.push([x, waterY + 0.5, z, R(2, 3.4)]);
    if (rand() < 0.35) lotus.push(pads[pads.length - 1]);
    n++;
  }
  const padMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 14, 0.35, Math.PI * 2 - 0.7).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x5d9a3e, side: THREE.DoubleSide }), pads.length);
  pads.forEach(([x, y, z, s], i) => {
    m.compose(v.set(x, y, z), qn.setFromEuler(e.set(0, R(0, Math.PI * 2), 0)), sc.set(s, 1, s));
    padMesh.setMatrixAt(i, m);
  });
  group.add(padMesh);
  const lotusMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1.6, 6).translate(0, 0.8, 0),
    new THREE.MeshLambertMaterial({ color: 0xf2a6c0, flatShading: true }), Math.max(1, lotus.length));
  lotus.forEach(([x, y, z], i) => {
    m.compose(v.set(x, y, z), qn.identity(), sc.set(1.1, 1.3, 1.1));
    lotusMesh.setMatrixAt(i, m);
  });
  lotusMesh.count = lotus.length;
  group.add(lotusMesh);

  const reeds = [], cattails = [];
  const addReed = (x, z) => {
    const h = R(7, 15);
    reeds.push([x, z, h]);
    if (rand() < 0.22) cattails.push([x, z, h]);
  };
  POOLS.forEach((p, i) => {
    const n = Math.round(p.r * 3.2);
    for (let k = 0; k < n; k++) {
      const a = R(0, Math.PI * 2), d = R(0.9, 1.25) * land.wobble(a, i * 2.1 + 0.5);
      const x = p.x + Math.cos(a) * d * p.r, z = p.z + Math.sin(a) * d * p.r * 0.85;
      if (land.inDisc(x, z, 2)) addReed(x, z);
    }
  });
  // 池子後岸、左岸的水邊：一叢一叢的蘆葦
  for (let n = 0, guard = 0; n < 14 && guard < 4000; guard++) {
    const x = R(-150, 10), z = R(-70, 30);
    if (turtleZone(x, z) && z > -24) continue;
    const h = land.height(x, z);
    if (h < waterY - 1.5 || h > waterY + 1.2) continue;
    if (Math.hypot(x - mouth.x, z - mouth.z) < 12) continue;
    for (let i = 0; i < 6 + rand() * 6; i++) addReed(x + R(-3, 3), z + R(-3, 3));
    n++;
  }
  const reedMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.32, 1, 4).translate(0, 0.5, 0),
    new THREE.MeshLambertMaterial({ color: 0xffffff }), reeds.length);
  const reedColors = [0x6f9a44, 0x86a84c, 0x5e8a3a, 0x9bb057].map(c => new THREE.Color(c));
  reeds.forEach(([x, z, h], i) => {
    m.compose(v.set(x, H(x, z) - 0.3, z), qn.setFromEuler(e.set(R(-0.12, 0.12), 0, R(-0.12, 0.12))), sc.set(1, h, 1));
    reedMesh.setMatrixAt(i, m);
    reedMesh.setColorAt(i, reedColors[i % reedColors.length]);
  });
  group.add(reedMesh);
  const catMesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.55, 2.2, 3, 6),
    new THREE.MeshLambertMaterial({ color: 0x7a4f2c }), Math.max(1, cattails.length));
  cattails.forEach(([x, z, h], i) => {
    m.compose(v.set(x, H(x, z) + h * 0.9, z), qn.identity(), sc.set(1, 1, 1));
    catMesh.setMatrixAt(i, m);
  });
  catMesh.count = cattails.length;
  group.add(catMesh);

  // ---------- 矮灌木：一團一團壓扁的葉叢貼著地面，有的開著小花 ----------
  const blobs = [], blooms = [];
  for (const [bx, bz, s] of BUSHES) {
    const n = 6 + Math.floor(rand() * 4);
    for (let i = 0; i < n; i++) {
      const a = R(0, Math.PI * 2), d = R(0, s * 0.75);
      const x = bx + Math.cos(a) * d, z = bz + Math.sin(a) * d * 0.8;
      const r = s * R(0.42, 0.62) * (1 - d / (s * 1.6));
      const y = H(x, z) + r * R(0.25, 0.45) + (i < 2 ? s * 0.15 : 0);
      blobs.push([x, y, z, r, i < 3 ? 1 : 0]);
      if (s > 6.5 && rand() < 0.6) {
        for (let k = 0; k < 3; k++) {
          const b = R(0, Math.PI * 2);
          blooms.push([x + Math.cos(b) * r * 0.6, y + r * 0.45, z + Math.sin(b) * r * 0.6]);
        }
      }
    }
  }
  const leafMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }), blobs.length);
  const leafColors = [[0x4f8339, 0x5a8e3e, 0x467a34], [0x6ea24a, 0x7fb055, 0x86b45a]].map(g => g.map(c => new THREE.Color(c)));
  blobs.forEach(([x, y, z, r, top], i) => {
    m.compose(v.set(x, y, z), qn.setFromEuler(e.set(R(0, 3), R(0, 3), 0)), sc.set(r * R(1, 1.25), r * R(0.55, 0.7), r * R(1, 1.2)));
    leafMesh.setMatrixAt(i, m);
    const cs = leafColors[top];
    leafMesh.setColorAt(i, cs[Math.floor(rand() * cs.length)]);
  });
  group.add(leafMesh);
  const bloomMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.45, 0),
    new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), Math.max(1, blooms.length));
  const bloomColors = [0xfff6ee, 0xf6c2d4, 0xfff0a8].map(c => new THREE.Color(c));
  blooms.forEach(([x, y, z], i) => {
    m.compose(v.set(x, y, z), qn.identity(), sc.set(1, 1, 1));
    bloomMesh.setMatrixAt(i, m);
    bloomMesh.setColorAt(i, bloomColors[i % bloomColors.length]);
  });
  bloomMesh.count = blooms.length;
  group.add(bloomMesh);

  // ---------- 菇類：白色的柄＋紅褐色的傘 ----------
  const caps = [];
  for (const [cx, cz] of MUSHROOMS) {
    for (let i = 0; i < 4 + rand() * 3; i++) caps.push([cx + R(-3, 3), cz + R(-3, 3), R(0.6, 1.2)]);
  }
  const stemMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.32, 1, 6).translate(0, 0.5, 0),
    new THREE.MeshLambertMaterial({ color: 0xf1ead8 }), caps.length);
  const capMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0xffffff }), caps.length);
  const capColors = [0xc8553d, 0xb46a3c, 0xd9a05b].map(c => new THREE.Color(c));
  caps.forEach(([x, z, s], i) => {
    const y = H(x, z);
    m.compose(v.set(x, y, z), qn.identity(), sc.set(s, s * 1.6, s));
    stemMesh.setMatrixAt(i, m);
    m.compose(v.set(x, y + s * 1.5, z), qn.identity(), sc.set(s * 0.9, s * 0.6, s * 0.9));
    capMesh.setMatrixAt(i, m);
    capMesh.setColorAt(i, capColors[i % capColors.length]);
  });
  group.add(stemMesh, capMesh);

  // ---------- 小花、草叢：十字交叉的兩片小貼圖，從哪個方向看都有東西 ----------
  const cross = crossQuad();
  const scatter = (count, margin) => {
    const out = [];
    let guard = 0;
    while (out.length < count && guard++ < count * 40) {
      let x, z;
      if (out.length && rand() < 0.65) {
        const [px, pz] = out[Math.floor(rand() * out.length)];
        x = px + R(-7, 7); z = pz + R(-7, 7);
      } else {
        [x, z] = randomOnDisc();
      }
      if (freeSpot(x, z, margin)) out.push([x, z]);
    }
    return out;
  };
  const flowerColors = [['#ffffff', '#f3d34a'], ['#f6d24a', '#e0932f'], ['#f4a7c0', '#f8e08a'], ['#b9a2e0', '#f6e27a']];
  for (const [petal, center] of flowerColors) {
    const tex = canvasTexture(drawFlower(petal, center), aniso);
    const spots = scatter(60, 1.5);
    const mesh = new THREE.InstancedMesh(cross, new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide }), spots.length);
    spots.forEach(([x, z], i) => {
      const s = R(3.4, 5);
      m.compose(v.set(x, H(x, z) - 0.1, z), qn.setFromEuler(e.set(0, R(0, Math.PI), 0)), sc.set(s, s, s));
      mesh.setMatrixAt(i, m);
    });
    group.add(mesh);
  }
  const grassTex = canvasTexture(drawTuft(), aniso);
  const tufts = scatter(420, 0.5);
  const tuftMesh = new THREE.InstancedMesh(cross, new THREE.MeshLambertMaterial({ map: grassTex, alphaTest: 0.45, side: THREE.DoubleSide }), tufts.length);
  tufts.forEach(([x, z], i) => {
    const s = R(2.6, 4.6);
    m.compose(v.set(x, H(x, z) - 0.1, z), qn.setFromEuler(e.set(0, R(0, Math.PI), 0)), sc.set(s * R(0.9, 1.3), s, s));
    tuftMesh.setMatrixAt(i, m);
  });
  group.add(tuftMesh);

  return {
    setDaylight(color) {
      lightUniform.value.copy(color);
    },
    update(time) {
      timeUniform.value = time;
      const k = (time * 0.9) % 1;                 // 水紋一圈一圈擴散
      splash.scale.setScalar(0.7 + k * 0.8);
      splashMat.opacity = 0.35 * (1 - k);
    },
  };
}

// ---------------------------------------------------------------------------

// 會流動的水：兩個顏色之間的波紋，沿著 uv.x（溪的長度方向）流動
function waterMaterial({ timeUniform, lightUniform, deep, light, speed, opacity }) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: timeUniform,
      uLight: lightUniform,
      uDeep: { value: new THREE.Color(deep) },
      uLightCol: { value: new THREE.Color(light) },
      uSpeed: { value: speed },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime, uSpeed, uOpacity;
      uniform vec3 uDeep, uLightCol, uLight;
      varying vec2 vUv;
      void main() {
        // 沿著長度方向慢慢流，稀疏的亮紋；兩岸邊緣淺一點
        vec2 p = vec2(vUv.x - uTime * uSpeed * 0.3, vUv.y);
        float w = sin(p.x * 3.2 + sin(p.y * 4.0 + p.x * 1.1) * 1.3) * 0.5 + 0.5;
        w = pow(w, 4.0);
        float w2 = pow(sin(p.x * 5.3 - p.y * 3.0 + 1.7) * 0.5 + 0.5, 6.0);
        float edge = smoothstep(0.3, 0.5, abs(vUv.y - 0.5));
        vec3 col = mix(uDeep, uLightCol, clamp(w * 0.45 + w2 * 0.35 + edge * 0.45, 0.0, 1.0));
        gl_FragColor = vec4(col * uLight, uOpacity);
        #include <colorspace_fragment>
      }`,
  });
}

// 形狀不規則的圓（水窪），平放在地上；wob(角度) 是半徑的起伏
function blobGeometry(rx, rz, wob) {
  const shape = new THREE.Shape();
  const n = 36;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const w = wob(a);
    const x = Math.cos(a) * rx * w, y = -Math.sin(a) * rz * w;   // Shape 的 y 轉平之後是 -z
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  // ShapeGeometry 的 uv 是形狀座標，換成 0～1 讓水的波紋大小一致
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / (rx * 2) + 0.5, uv.getY(i) / (rx * 2) + 0.5);
  return g;
}

// 兩片互相垂直的小四邊形，底部在 y = 0
function crossQuad() {
  const a = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const b = a.clone().rotateY(Math.PI / 2);
  return mergeGeometries([a, b]);
}

function canvasTexture(canvas, aniso) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

// 小花：綠色的莖＋五片花瓣＋花心
function drawFlower(petal, center) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.strokeStyle = '#4f8a36';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(32, 64); g.quadraticCurveTo(29, 44, 32, 24); g.stroke();
  g.fillStyle = '#5f9a40';
  g.beginPath(); g.ellipse(24, 46, 6, 3, -0.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = petal;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    g.beginPath(); g.ellipse(32 + Math.cos(a) * 8, 20 + Math.sin(a) * 8, 7, 5, a, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = center;
  g.beginPath(); g.arc(32, 20, 4.5, 0, Math.PI * 2); g.fill();
  return c;
}

// 草叢：幾根彎彎的草葉
function drawTuft() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = rng(77);
  const greens = ['#5e8f3c', '#6fa347', '#7fb050', '#4f7f33'];
  for (let i = 0; i < 11; i++) {
    const x0 = 18 + r() * 28, h = 30 + r() * 30, lean = (r() - 0.5) * 26;
    g.strokeStyle = greens[i % greens.length];
    g.lineWidth = 2.5 + r() * 2;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, 64); g.quadraticCurveTo(x0 + lean * 0.3, 64 - h * 0.6, x0 + lean, 64 - h); g.stroke();
  }
  return c;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
