// 戶外池圓台上的景物：小溪（含流進池子的小瀑布）、溪邊的石頭、濕地、小樹、小花、草叢。
//
// 全部是程式做的低面數模型＋程式畫的小貼圖，用 InstancedMesh 一次畫一大批，
// 整個花園大約十幾次繪製呼叫，手機也跑得動。亂數固定種子，每次開遊戲擺設都一樣。
//
// 座標：跟 tank3d 一樣的 3D 單位，池子在 x ∈ [-TW/2, TW/2]、z ∈ [-TD/2, TD/2]，
// 圓台中心 (disc.cx, disc.cz)、半徑 disc.r、頂面高度 rim。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// 小溪：從圓台後方的泉水，彎彎曲曲流進池子後緣，最後變成小瀑布掉進池子
const STREAM = [
  [100, -212], [86, -186], [58, -160], [22, -140], [-12, -114], [-34, -86], [-44, -60], [-45, -45.5],
];
const STREAM_W0 = 8, STREAM_W1 = 13;   // 源頭寬、出口寬

// 濕地：幾個形狀不規則的淺水窪
const POOLS = [
  { x: -100, z: -140, r: 21 }, { x: -126, z: -108, r: 13 },
  { x: -72, z: -170, r: 14 }, { x: -130, z: -166, r: 10 },
];
const SPRING = { x: 100, z: -214, r: 9 }; // 小溪的源頭

// 小樹（x, z, 高度, 樹冠大小）與灌木
const TREES = [[130, -80, 40, 15], [152, -140, 34, 13], [40, -226, 44, 16], [-162, -46, 36, 14]];
const BUSHES = [[-58, -208, 9], [168, -36, 8], [-150, 14, 7], [118, -168, 7], [-176, -96, 8]];

export function buildGarden(scene, { disc, TW, TD, rim, waterY, aniso }) {
  const rand = rng(20260927);
  const R = (a, b) => a + (b - a) * rand();
  const group = new THREE.Group();
  scene.add(group);

  const lightUniform = { value: new THREE.Color(1, 1, 1) };
  const timeUniform = { value: 0 };

  // ---------- 可以放東西的地方：在圓台上、不在池子／溪／水窪／樹幹上 ----------
  const path = STREAM.map(([x, z]) => new THREE.Vector2(x, z));
  const distToStream = (x, z) => {
    let best = Infinity;
    for (let i = 0; i < path.length - 1; i++) best = Math.min(best, segDist(x, z, path[i], path[i + 1]));
    return best;
  };
  const inPond = (x, z, m = 0) => Math.abs(x) < TW / 2 + m && Math.abs(z) < TD / 2 + m;
  const onDisc = (x, z, m = 0) => z < disc.front - m && Math.hypot(x - disc.cx, z - disc.cz) < disc.r - m;
  const inPool = (x, z, m = 0) => POOLS.concat([SPRING]).some(p => Math.hypot(x - p.x, z - p.z) < p.r + m);
  const nearTree = (x, z, m) => TREES.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < m);
  const freeSpot = (x, z, m = 2) =>
    onDisc(x, z, 3) && !inPond(x, z, 3) && distToStream(x, z) > STREAM_W1 / 2 + m && !inPool(x, z, m) && !nearTree(x, z, 4);

  // ---------- 小溪 ----------
  const curve = new THREE.CatmullRomCurve3(STREAM.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'catmullrom', 0.4);
  const samples = 140;
  const pts = curve.getSpacedPoints(samples);
  const widthAt = t => STREAM_W0 + (STREAM_W1 - STREAM_W0) * t;
  const ribbon = (y, extra) => {
    const pos = [], uv = [], idx = [];
    let len = 0;
    for (let i = 0; i <= samples; i++) {
      const p = pts[i];
      const q = pts[Math.min(samples, i + 1)], o = pts[Math.max(0, i - 1)];
      const tx = q.x - o.x, tz = q.z - o.z, tl = Math.hypot(tx, tz) || 1;
      const nx = -tz / tl, nz = tx / tl;
      const w = widthAt(i / samples) / 2 + extra;
      if (i > 0) len += p.distanceTo(pts[i - 1]);
      pos.push(p.x + nx * w, y, p.z + nz * w, p.x - nx * w, y, p.z - nz * w);
      uv.push(len / 10, 0, len / 10, 1);
      if (i < samples) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  // 溪床（沙色，比水寬一點）＋ 會流動的水
  const bed = new THREE.Mesh(ribbon(rim + 0.06, 1.6), new THREE.MeshLambertMaterial({ color: 0xb49e78 }));
  group.add(bed);
  const streamMat = waterMaterial({ timeUniform, lightUniform, deep: 0x4f9fb0, light: 0xbfe6ea, speed: 1.2, opacity: 0.88 });
  group.add(new THREE.Mesh(ribbon(rim + 0.3, 0), streamMat));

  // 泉水源頭：一個小水潭
  const springMesh = new THREE.Mesh(blobGeometry(SPRING.r, rand, 0.18), waterMaterial({
    timeUniform, lightUniform, deep: 0x4a98aa, light: 0xb8e2e8, speed: 0.4, opacity: 0.9,
  }));
  springMesh.position.set(SPRING.x, rim + 0.28, SPRING.z);
  group.add(springMesh);

  // 小瀑布：從池子後緣掉進池子
  const end = pts[samples];
  const fallH = rim - waterY;
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(STREAM_W1, fallH + 0.6), waterMaterial({
    timeUniform, lightUniform, deep: 0x7fc4d0, light: 0xf4fbfc, speed: 3.2, opacity: 0.85, vertical: true,
  }));
  fall.position.set(end.x, waterY + fallH / 2, -TD / 2 + 0.6);
  group.add(fall);
  // 瀑布落水處的水花
  const splashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
  const splash = new THREE.Mesh(new THREE.RingGeometry(3, 8, 24), splashMat);
  splash.rotation.x = -Math.PI / 2;
  splash.position.set(end.x, waterY + 0.35, -TD / 2 + 5);
  group.add(splash);

  // ---------- 石頭：溪的兩岸很多，源頭和瀑布口堆多一點 ----------
  const stones = [];
  for (let i = 2; i < samples - 1; i += 2) {
    const p = pts[i], q = pts[i + 1];
    const tl = Math.hypot(q.x - p.x, q.z - p.z) || 1;
    const nx = -(q.z - p.z) / tl, nz = (q.x - p.x) / tl;
    const w = widthAt(i / samples) / 2;
    for (const side of [-1, 1]) {
      if (rand() < 0.25) continue;
      const off = w + R(0.4, 3.2);
      const s = rand() < 0.15 ? R(3, 5) : R(1.1, 2.8);   // 偶爾一顆大石頭
      stones.push([p.x + nx * off * side, p.z + nz * off * side, s]);
    }
    if (rand() < 0.18) stones.push([p.x + nx * R(-w, w) * 0.6, p.z + nz * R(-w, w) * 0.6, R(0.6, 1.2), true]); // 溪裡的小石頭
  }
  for (let i = 0; i < 12; i++) {
    const a = R(0, Math.PI * 2), d = SPRING.r + R(0, 5);
    stones.push([SPRING.x + Math.cos(a) * d, SPRING.z + Math.sin(a) * d, R(2.2, 5.2)]);
  }
  for (const dx of [-1, 1]) for (let i = 0; i < 3; i++) {
    stones.push([end.x + dx * (STREAM_W1 / 2 + R(1, 5)), -TD / 2 - R(1.5, 5), R(2.4, 4.4)]);
  }
  // 草地上零星的石頭
  for (let n = 0; n < 26;) {
    const x = R(-disc.r, disc.r), z = R(disc.cz - disc.r, disc.front);
    if (!freeSpot(x, z, 4)) continue;
    stones.push([x, z, R(1, 3)]);
    n++;
  }
  const stoneMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }), stones.length);
  const stoneColors = [0xa89f8c, 0x938b7a, 0xb8ae98, 0x857d6e, 0x9ea08e, 0xc2b8a2].map(c => new THREE.Color(c));
  const m = new THREE.Matrix4(), qn = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  stones.forEach(([x, z, s, wet], i) => {
    const sy = s * R(0.45, 0.75);
    e.set(R(-0.3, 0.3), R(0, Math.PI * 2), R(-0.3, 0.3));
    m.compose(v.set(x, rim + sy * (wet ? 0.1 : 0.35), z), qn.setFromEuler(e), sc.set(s * R(0.9, 1.3), sy, s * R(0.8, 1.2)));
    stoneMesh.setMatrixAt(i, m);
    stoneMesh.setColorAt(i, stoneColors[Math.floor(rand() * stoneColors.length)]);
  });
  group.add(stoneMesh);

  // ---------- 濕地 ----------
  // 水窪周圍一圈比較深、比較濕的泥地
  for (const p of POOLS) {
    const mud = new THREE.Mesh(blobGeometry(p.r + 7, rand, 0.25), new THREE.MeshLambertMaterial({ color: 0x5f7d3c }));
    mud.position.set(p.x, rim + 0.04, p.z);
    group.add(mud);
  }
  const poolMat = waterMaterial({ timeUniform, lightUniform, deep: 0x4b7f72, light: 0x9fc8b8, speed: 0.25, opacity: 0.9 });
  for (const p of POOLS) {
    const pool = new THREE.Mesh(blobGeometry(p.r, rand, 0.22), poolMat);
    pool.position.set(p.x, rim + 0.12, p.z);
    group.add(pool);
  }
  // 蓮葉（缺一角的圓）＋ 幾朵粉紅花
  const pads = [], lotus = [];
  for (const p of POOLS) {
    const n = Math.round(p.r / 3);
    for (let i = 0; i < n; i++) {
      const a = R(0, Math.PI * 2), d = R(0, p.r * 0.75);
      pads.push([p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, R(1.6, 3), R(0, Math.PI * 2)]);
      if (rand() < 0.3) lotus.push([pads[pads.length - 1][0], pads[pads.length - 1][1]]);
    }
  }
  const padMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 14, 0.35, Math.PI * 2 - 0.7).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x5d9a3e, side: THREE.DoubleSide }), pads.length);
  pads.forEach(([x, z, s, rot], i) => {
    m.compose(v.set(x, rim + 0.3, z), qn.setFromEuler(e.set(0, rot, 0)), sc.set(s, 1, s));
    padMesh.setMatrixAt(i, m);
  });
  group.add(padMesh);
  const lotusMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1.6, 6).translate(0, 0.8, 0),
    new THREE.MeshLambertMaterial({ color: 0xf2a6c0, flatShading: true }), Math.max(1, lotus.length));
  lotus.forEach(([x, z], i) => {
    m.compose(v.set(x, rim + 0.3, z), qn.identity(), sc.set(1.1, 1.3, 1.1));
    lotusMesh.setMatrixAt(i, m);
  });
  lotusMesh.count = lotus.length;
  group.add(lotusMesh);

  // 蘆葦（細長的錐）與香蒲（頂端褐色的穗）：長在水窪邊
  const reeds = [], cattails = [];
  for (const p of POOLS) {
    const n = Math.round(p.r * 3.4);
    for (let i = 0; i < n; i++) {
      const a = R(0, Math.PI * 2), d = p.r + R(-1.5, 5);
      const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      if (!onDisc(x, z, 2)) continue;
      const h = R(7, 15);
      reeds.push([x, z, h]);
      if (rand() < 0.22) cattails.push([x, z, h]);
    }
  }
  const reedMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.32, 1, 4).translate(0, 0.5, 0),
    new THREE.MeshLambertMaterial({ color: 0xffffff }), reeds.length);
  const reedColors = [0x6f9a44, 0x86a84c, 0x5e8a3a, 0x9bb057].map(c => new THREE.Color(c));
  reeds.forEach(([x, z, h], i) => {
    m.compose(v.set(x, rim, z), qn.setFromEuler(e.set(R(-0.12, 0.12), 0, R(-0.12, 0.12))), sc.set(1, h, 1));
    reedMesh.setMatrixAt(i, m);
    reedMesh.setColorAt(i, reedColors[i % reedColors.length]);
  });
  group.add(reedMesh);
  const catMesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.55, 2.2, 3, 6),
    new THREE.MeshLambertMaterial({ color: 0x7a4f2c }), Math.max(1, cattails.length));
  cattails.forEach(([x, z, h], i) => {
    m.compose(v.set(x, rim + h * 0.92, z), qn.identity(), sc.set(1, 1, 1));
    catMesh.setMatrixAt(i, m);
  });
  catMesh.count = cattails.length;
  group.add(catMesh);

  // ---------- 小樹與灌木：樹幹＋幾團低面數的樹冠 ----------
  const trunks = [], blobs = [];
  for (const [x, z, h, c] of TREES) {
    trunks.push([x, z, h]);
    const top = rim + h * 0.62;
    blobs.push([x, top + c * 0.35, z, c]);
    for (let i = 0; i < 4; i++) {
      const a = R(0, Math.PI * 2);
      blobs.push([x + Math.cos(a) * c * 0.55, top + R(-0.2, 0.25) * c, z + Math.sin(a) * c * 0.55, c * R(0.6, 0.8)]);
    }
  }
  for (const [x, z, c] of BUSHES) {
    for (let i = 0; i < 3; i++) blobs.push([x + R(-c, c) * 0.5, rim + c * 0.45, z + R(-c, c) * 0.5, c * R(0.6, 0.85)]);
  }
  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.7, 1.3, 1, 7).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 1, flatShading: true }), trunks.length);
  trunks.forEach(([x, z, h], i) => {
    m.compose(v.set(x, rim, z), qn.identity(), sc.set(1.3, h * 0.7, 1.3));
    trunkMesh.setMatrixAt(i, m);
  });
  group.add(trunkMesh);
  const canopy = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }), blobs.length);
  const leafColors = [0x5f9442, 0x74a84c, 0x4f8339, 0x86b45a].map(c => new THREE.Color(c));
  blobs.forEach(([x, y, z, s], i) => {
    m.compose(v.set(x, y, z), qn.setFromEuler(e.set(R(0, 3), R(0, 3), 0)), sc.set(s, s * R(0.8, 0.95), s));
    canopy.setMatrixAt(i, m);
    canopy.setColorAt(i, leafColors[Math.floor(rand() * leafColors.length)]);
  });
  group.add(canopy);

  // ---------- 小花、草叢：十字交叉的兩片小貼圖，從哪個方向看都有東西 ----------
  const cross = crossQuad();
  const scatter = (count, avoidMargin, cluster) => {
    const out = [];
    let guard = 0;
    while (out.length < count && guard++ < count * 40) {
      let x, z;
      if (cluster && out.length && rand() < 0.65) {
        const [px, pz] = out[Math.floor(rand() * out.length)];
        x = px + R(-7, 7); z = pz + R(-7, 7);
      } else {
        x = R(-disc.r, disc.r); z = R(disc.cz - disc.r, disc.front);
      }
      if (freeSpot(x, z, avoidMargin)) out.push([x, z]);
    }
    return out;
  };
  const flowerColors = [['#ffffff', '#f3d34a'], ['#f6d24a', '#e0932f'], ['#f4a7c0', '#f8e08a'], ['#b9a2e0', '#f6e27a']];
  for (const [petal, center] of flowerColors) {
    const tex = canvasTexture(drawFlower(petal, center), aniso);
    const spots = scatter(70, 1.5, true);
    const mesh = new THREE.InstancedMesh(cross, new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide }), spots.length);
    spots.forEach(([x, z], i) => {
      const s = R(3.4, 5);
      m.compose(v.set(x, rim, z), qn.setFromEuler(e.set(0, R(0, Math.PI), 0)), sc.set(s, s, s));
      mesh.setMatrixAt(i, m);
    });
    group.add(mesh);
  }
  const grassTex = canvasTexture(drawTuft(), aniso);
  const tufts = scatter(460, 0.5, true);
  const tuftMesh = new THREE.InstancedMesh(cross, new THREE.MeshLambertMaterial({ map: grassTex, alphaTest: 0.45, side: THREE.DoubleSide }), tufts.length);
  tufts.forEach(([x, z], i) => {
    const s = R(2.6, 4.6);
    m.compose(v.set(x, rim, z), qn.setFromEuler(e.set(0, R(0, Math.PI), 0)), sc.set(s * R(0.9, 1.3), s, s));
    tuftMesh.setMatrixAt(i, m);
  });
  group.add(tuftMesh);

  return {
    setDaylight(color) {
      lightUniform.value.copy(color);
    },
    update(time) {
      timeUniform.value = time;
      const k = (time * 1.4) % 1;                 // 水花一圈一圈擴散
      splash.scale.setScalar(0.8 + k * 0.5);
      splashMat.opacity = 0.55 * (1 - k);
    },
  };
}

// ---------------------------------------------------------------------------

// 會流動的水：兩個顏色之間的波紋，沿著 uv.x（溪的長度方向）流動；vertical 時往下流（瀑布）
function waterMaterial({ timeUniform, lightUniform, deep, light, speed, opacity, vertical = false }) {
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
      uVertical: { value: vertical ? 1 : 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime, uSpeed, uOpacity, uVertical;
      uniform vec3 uDeep, uLightCol, uLight;
      varying vec2 vUv;
      void main() {
        vec3 col;
        if (uVertical > 0.5) {
          // 瀑布：一絲一絲往下流，底部是白色水花
          float x = vUv.x * 7.0;
          float streak = pow(sin(x * 3.1 + sin(x * 1.7) * 2.0) * 0.5 + 0.5, 3.0);
          float flow = sin(vUv.y * 9.0 + uTime * uSpeed + x) * 0.5 + 0.5;
          float foam = smoothstep(0.28, 0.0, vUv.y);
          col = mix(uDeep, uLightCol, clamp(streak * 0.6 + flow * 0.25 + foam, 0.0, 1.0));
        } else {
          // 溪水：沿著長度方向慢慢流，稀疏的亮紋；兩岸邊緣淺一點
          vec2 p = vec2(vUv.x - uTime * uSpeed * 0.3, vUv.y);
          float w = sin(p.x * 3.2 + sin(p.y * 4.0 + p.x * 1.1) * 1.3) * 0.5 + 0.5;
          w = pow(w, 4.0);
          float w2 = pow(sin(p.x * 5.3 - p.y * 3.0 + 1.7) * 0.5 + 0.5, 6.0);
          float edge = smoothstep(0.3, 0.5, abs(vUv.y - 0.5));
          col = mix(uDeep, uLightCol, clamp(w * 0.45 + w2 * 0.35 + edge * 0.45, 0.0, 1.0));
        }
        gl_FragColor = vec4(col * uLight, uOpacity);
        #include <colorspace_fragment>
      }`,
  });
}

// 形狀不規則的圓（水窪、泥地），平放在地上
function blobGeometry(r, rand, wobble) {
  const shape = new THREE.Shape();
  const n = 28;
  const ph = [rand() * 6, rand() * 6, rand() * 6];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + wobble * (0.5 * Math.sin(a * 2 + ph[0]) + 0.3 * Math.sin(a * 3 + ph[1]) + 0.2 * Math.sin(a * 5 + ph[2])));
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  // ShapeGeometry 的 uv 是形狀座標，換成 0～1 讓水的波紋大小一致
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / (r * 2) + 0.5, uv.getY(i) / (r * 2) + 0.5);
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

function segDist(x, z, a, b) {
  const dx = b.x - a.x, dz = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.y) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - (a.x + dx * t), z - (a.y + dz * t));
}

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
