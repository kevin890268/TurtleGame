// 戶外池的世界：一個漂在天空裡的圓柱形小天地。
//
// - 圓台頂面是一張高度圖（js/outdoor-land.js）：碗狀的池子靠在正面、圓弧形的沙灘、草地、小溪、濕地。
// - 正面沿池子切開，是一整面土層剖面，看得到水裡的烏龜；圓台四周也是土層。
// - 圓台外面什麼都沒有，只有天空：太陽和月亮會照遊戲時間慢慢從天上劃過。
// - 景物（石頭、灌木、花草、蘆葦）在 js/outdoor-garden.js。
//
// 圖片都是可選的：assets/scene/outdoor/ 裡有 soil、grass（.webp 或 .png）就用，
// 沒有就用這裡程式畫的替代圖。提示詞在 gpt/scene/outdoor/。
import * as THREE from 'three';
import { makeLand, DISC_R, FRONT } from './outdoor-land.js';
import { buildGarden } from './outdoor-garden.js';

const DIR = 'assets/scene/outdoor/';
const STEP = 2.5;          // 地面高度圖的格子大小
const SOIL_TILE = 34;      // 土層紋理每隔多少單位重複一次
const GRASS_TILE = 36;     // 草地紋理每隔多少單位重複一次
const SKY_R = 1800;        // 天空球的半徑
export const GRASS_COLOR = '#6b9a45';

// 地面的顏色（草地以外的地方）
const GROUND = {
  deep: '#a08d67',     // 池子深處的沙
  shallow: '#cbb98c',  // 池子淺處的沙
  wet: '#b5a178',      // 水邊的濕沙
  beach: '#dccb9f',    // 沙灘
  gravel: '#a39884',   // 溪床的碎石
  stone: '#9a9486',    // 溪流石頭區的碎石地
  mud: '#6f6c45',      // 濕地的泥
};

/**
 * @param {THREE.Scene} scene
 * @param {object} o
 * @param {number} o.rim     池邊地面的高度（y）
 * @param {number} o.waterY  池子水面的高度（y）
 * @param {number} o.deepY   池子最深處的高度（y）
 * @param {(x: number) => number} o.profileY  3D 的 x → 池子剖面的地面高度
 * @param {THREE.WebGLRenderer} o.renderer
 */
export function buildOutdoorWorld(scene, { rim, waterY, deepY, profileY, renderer }) {
  const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const land = makeLand({ rim, waterY, deepY, profileY });
  const { disc, base } = land;

  // ---------- 紋理：先用程式畫的，有圖檔就換掉 ----------
  const soil = canvasTexture(drawSoil(256), aniso);
  const grass = canvasTexture(drawGrass(256), aniso);
  const speckle = canvasTexture(drawSpeckle(128), aniso);
  loadOptional(DIR + 'soil', aniso, img => { soil.image = img; soil.needsUpdate = true; });
  loadOptional(DIR + 'grass', aniso, img => { grass.image = img; grass.needsUpdate = true; });

  // ---------- 圓台頂面：高度圖 ----------
  // 方格鋪滿整個圓，圓外的格點拉回圓周上，邊緣才會是圓的
  const xs = [], zs = [];
  for (let x = -DISC_R; x <= DISC_R + 0.01; x += STEP) xs.push(x);
  for (let z = FRONT; z >= disc.cz - DISC_R - 0.01; z -= STEP) zs.push(z);
  const nx = xs.length, nz = zs.length;
  const pos = new Float32Array(nx * nz * 3);
  const uv = new Float32Array(nx * nz * 2);
  const ground = new Float32Array(nx * nz * 4);
  const inside = new Uint8Array(nx * nz);
  const col = {};
  for (const k in GROUND) col[k] = new THREE.Color(GROUND[k]);
  const c = new THREE.Color();
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      let x = xs[i], z = zs[j];
      const d = Math.hypot(x - disc.cx, z - disc.cz);
      inside[k] = d <= DISC_R ? 1 : 0;
      if (!inside[k]) { x = disc.cx + (x - disc.cx) * DISC_R / d; z = disc.cz + (z - disc.cz) * DISC_R / d; }
      const f = land.info(x, z);
      pos.set([x, f.h, z], k * 3);
      uv.set([x / GRASS_TILE, -z / GRASS_TILE], k * 2);
      if (f.underwater) {
        c.copy(col.shallow).lerp(col.deep, Math.min(1, (waterY - f.h) / (waterY - deepY)));
      } else {
        c.copy(col.beach).lerp(col.wet, f.bank);
      }
      c.lerp(col.stone, f.rocky * (0.85 + 0.15 * Math.sin(x * 0.37 + z * 0.29)));
      c.lerp(col.gravel, Math.max(f.stream, f.spring)).lerp(col.mud, f.mud);
      c.multiplyScalar(0.95 + 0.05 * Math.sin(x * 0.21 + z * 0.17));
      ground.set([c.r, c.g, c.b, f.underwater ? 0 : f.grass], k * 4);
    }
  }
  const idx = [];
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, cc = a + nx, d = cc + 1;
      if (!(inside[a] || inside[b] || inside[cc] || inside[d])) continue;
      idx.push(a, b, cc, b, d, cc);
    }
  }
  const landGeo = new THREE.BufferGeometry();
  landGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  landGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  landGeo.setAttribute('ground', new THREE.BufferAttribute(ground, 4));
  landGeo.setIndex(idx);
  landGeo.computeVertexNormals();
  const landMesh = new THREE.Mesh(landGeo, groundMaterial(grass, speckle));
  scene.add(landMesh);

  // ---------- 圓台側面與正面：土層 ----------
  const soilMat = new THREE.MeshStandardMaterial({ map: soil, roughness: 1 });
  const half = Math.sqrt(DISC_R * DISC_R - (FRONT - disc.cz) ** 2); // 正面那條弦的一半長
  // 正面：從底部到地面（池子那一段就是池底的剖面）
  {
    const p = [], t = [], ix = [];
    const fx = [-half, ...xs.filter(x => x > -half && x < half), half];
    fx.forEach((x, i) => {
      const top = land.height(x, FRONT);
      p.push(x, base, FRONT, x, top, FRONT);
      t.push(x / SOIL_TILE, base / SOIL_TILE, x / SOIL_TILE, top / SOIL_TILE);
      if (i < fx.length - 1) { const a = i * 2; ix.push(a, a + 2, a + 1, a + 2, a + 3, a + 1); }
    });
    scene.add(new THREE.Mesh(stripGeometry(p, t, ix), soilMat));
  }
  // 側面：圓周從右前角往後繞到左前角
  {
    const p = [], t = [], ix = [];
    const a0 = Math.atan2(FRONT - disc.cz, half), a1 = -(Math.PI + a0);
    const n = 160;
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      const x = disc.cx + Math.cos(a) * DISC_R, z = disc.cz + Math.sin(a) * DISC_R;
      const top = land.height(x, z);
      const u = (-a * DISC_R) / SOIL_TILE;
      p.push(x, base, z, x, top, z);
      t.push(u, base / SOIL_TILE, u, top / SOIL_TILE);
      if (i < n) { const b = i * 2; ix.push(b, b + 2, b + 1, b + 2, b + 3, b + 1); }
    }
    scene.add(new THREE.Mesh(stripGeometry(p, t, ix), soilMat));
  }

  // ---------- 天空：太陽和月亮 ----------
  const sky = buildSky(scene);

  // ---------- 圓台上的景物 ----------
  const garden = buildGarden(scene, { land, rim, waterY, aniso });

  const day = new THREE.Color(1, 1, 1);
  const night = new THREE.Color(0.22, 0.26, 0.42);
  const light = new THREE.Color();
  return {
    land,
    landMesh,   // 手手放烏龜時，用來找點到地面的哪裡
    disc,
    grassColor: GRASS_COLOR,
    sunDir: sky.sunDir,
    moonDir: sky.moonDir,
    // 日夜：小溪、水窪的顏色跟著變暗
    setDaylight(f) {
      light.copy(night).lerp(day, f);
      garden.setDaylight(light);
    },
    // 遊戲時間（0～24 時）：太陽、月亮的位置和天空的顏色
    setHour(h) {
      sky.setHour(h);
    },
    update(time) {
      garden.update(time);
    },
  };
}

// 地面材質：草地紋理和沙／泥的顏色依頂點上的比重混合，再疊一層細小顆粒
function groundMaterial(grass, speckle) {
  const mat = new THREE.MeshStandardMaterial({ map: grass, roughness: 1 });
  mat.onBeforeCompile = shader => {
    shader.uniforms.speckleMap = { value: speckle };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 ground;\nvarying vec4 vGround;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGround = ground;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vGround;\nuniform sampler2D speckleMap;')
      .replace('#include <map_fragment>', `
        vec4 grassTex = texture2D( map, vMapUv );
        float sp = texture2D( speckleMap, vMapUv * 3.0 ).r;
        diffuseColor.rgb *= mix( vGround.rgb * ( 0.8 + 0.2 * sp ), grassTex.rgb, vGround.a );
      `);
  };
  return mat;
}

function stripGeometry(p, t, ix) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(t, 2));
  g.setIndex(ix);
  g.computeVertexNormals();
  return g;
}

// 天空球：上下的漸層顏色、太陽、月亮、星星都在 shader 裡畫
function buildSky(scene) {
  const C = hex => new THREE.Color(hex);
  const PAL = {
    dayTop: C('#79b2dc'), dayHor: C('#dcecef'),
    duskTop: C('#6c7bb0'), duskHor: C('#f3b98c'),
    nightTop: C('#0d1433'), nightHor: C('#27335c'),
  };
  const u = {
    uTop: { value: new THREE.Color() },
    uHor: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
    uSunCol: { value: new THREE.Color() },
    uStars: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uTop, uHor, uSunDir, uMoonDir, uSunCol;
      uniform float uStars;
      varying vec3 vPos;
      void main() {
        vec3 d = normalize(vPos - cameraPosition);
        float up = max(d.y, 0.0);
        vec3 col = mix(uHor, uTop, pow(up, 0.55));
        if (d.y < 0.0) col = mix(uHor, uHor * 0.72, clamp(-d.y * 2.5, 0.0, 1.0));
        // 星星
        vec3 cell = floor(d * 170.0);
        float r = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float star = step(0.993, r) * smoothstep(0.42, 0.12, length(fract(d * 170.0) - 0.5));
        col += vec3(0.9, 0.92, 1.0) * star * uStars * smoothstep(0.0, 0.15, d.y);
        // 太陽：圓盤＋一圈柔和的光暈
        float s = max(dot(d, uSunDir), 0.0);
        col += uSunCol * (0.3 * pow(s, 90.0) + 0.06 * pow(s, 8.0));
        col = mix(col, uSunCol * 1.1 + 0.12, smoothstep(0.99925, 0.99945, s));
        // 月亮：淡黃色的彎月（圓盤被偏一點的暗圓蓋住一角）
        float m = dot(d, uMoonDir);
        vec3 side = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0)));
        float m2 = dot(d, normalize(uMoonDir + side * 0.012));
        float moon = smoothstep(0.99945, 0.9996, m) * (1.0 - 0.85 * smoothstep(0.99945, 0.9996, m2));
        col += vec3(0.75, 0.8, 1.0) * 0.08 * pow(max(m, 0.0), 60.0) * step(0.0, uMoonDir.y);
        col = mix(col, vec3(1.0, 0.96, 0.8), moon * smoothstep(-0.02, 0.05, uMoonDir.y));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(SKY_R, 48, 24), mat);
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  scene.add(mesh);

  const smooth = (e0, e1, v) => { const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const sunDir = u.uSunDir.value, moonDir = u.uMoonDir.value;
  const warm = C('#ffcf8f'), noon = C('#fff4d6');
  return {
    sunDir, moonDir,
    setHour(h) {
      // 太陽 6 點從左邊升起、19 點從右邊落下；月亮 19 點升起、隔天 6 點落下。
      // 都在池子後方的天空低低地劃過（鏡頭不太能往上看，太高就看不到了）
      const ps = Math.PI * (h - 6) / 13;
      sunDir.set(-Math.cos(ps), Math.sin(ps) * 0.17, -0.9).normalize();
      const pm = Math.PI * (((h - 19 + 24) % 24) / 11);
      moonDir.set(-Math.cos(pm), Math.sin(pm) * 0.15, -0.9).normalize();
      // 天空顏色看太陽「走到哪裡」：1 是正中午，0 是剛好在地平線
      const e = Math.sin(ps);
      const dayK = smooth(-0.15, 0.35, e);
      const dusk = Math.exp(-((e / 0.2) ** 2));
      u.uTop.value.copy(PAL.nightTop).lerp(PAL.dayTop, dayK).lerp(PAL.duskTop, dusk * 0.35);
      u.uHor.value.copy(PAL.nightHor).lerp(PAL.dayHor, dayK).lerp(PAL.duskHor, dusk * 0.6);
      u.uSunCol.value.copy(noon).lerp(warm, dusk).multiplyScalar(smooth(-0.04, 0.02, e));
      u.uStars.value = 1 - smooth(-0.2, 0.05, e);
    },
  };
}

function canvasTexture(canvas, aniso) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

// 有圖檔就載入（先找 .webp 再找 .png），沒有就維持程式畫的
function loadOptional(stem, aniso, onLoad) {
  const tryExt = exts => {
    if (!exts.length) return;
    const img = new Image();
    img.onload = () => onLoad(img);
    img.onerror = () => tryExt(exts.slice(1));
    img.src = `${stem}.${exts[0]}`;
  };
  tryExt(['webp', 'png']);
}

// ---------------------------------------------------------------------------
// 程式畫的替代圖（還沒有 ChatGPT 的圖時用）
// ---------------------------------------------------------------------------

// 固定亂數，每次畫出來都一樣
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// 土層：幾條深淺不同的橫向土層＋小石頭＋細根，上下左右都能無縫拼接
function drawSoil(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const bands = ['#86694b', '#7c6044', '#8a6d4d', '#735a3f', '#806447'];
  const h = size / bands.length;
  bands.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * h, size, h + 1); });
  const r = rng(7);
  // 土層的交界不要太直
  for (let i = 1; i < bands.length; i++) {
    g.fillStyle = bands[i - 1];
    for (let x = 0; x < size; x += 4) g.fillRect(x, i * h - 2 + Math.sin(x * 0.07 + i) * 3, 4, 4);
  }
  // 小石頭（左右跨邊界的畫兩次，拼接才不會斷）
  for (let i = 0; i < 90; i++) {
    const x = r() * size, y = r() * size, rr = 0.8 + r() * 2.2;
    const tone = 140 + r() * 45;
    g.fillStyle = `rgb(${tone},${tone * 0.9},${tone * 0.75})`;
    for (const dx of [0, -size, size]) for (const dy of [0, -size, size]) {
      g.beginPath();
      g.ellipse(x + dx, y + dy, rr * 1.3, rr, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }
  // 細根
  g.strokeStyle = 'rgba(60, 40, 25, .45)';
  g.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    let x = r() * size, y = r() * size * 0.5;
    g.beginPath();
    g.moveTo(x, y);
    for (let j = 0; j < 6; j++) { x += (r() - 0.5) * 14; y += 4 + r() * 8; g.lineTo(x, y); }
    g.stroke();
  }
  return c;
}

// 細小顆粒（灰階），疊在地形的頂點顏色上
function drawSpeckle(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#e6e6e6';
  g.fillRect(0, 0, size, size);
  const r = rng(31);
  for (let i = 0; i < 700; i++) {
    const v = 170 + r() * 85;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(r() * size, r() * size, 1 + r() * 2, 1 + r() * 2);
  }
  return c;
}

// 草地：綠色底＋深淺斑點＋短草線
function drawGrass(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = GRASS_COLOR;
  g.fillRect(0, 0, size, size);
  const r = rng(11);
  for (let i = 0; i < 900; i++) {
    const x = r() * size, y = r() * size;
    const light = r() < 0.5;
    g.strokeStyle = light ? 'rgba(160, 200, 100, .55)' : 'rgba(55, 95, 40, .5)';
    g.lineWidth = 1;
    for (const dx of [0, -size, size]) for (const dy of [0, -size, size]) {
      g.beginPath();
      g.moveTo(x + dx, y + dy);
      g.lineTo(x + dx + (r() - 0.5) * 3, y + dy - 3 - r() * 4);
      g.stroke();
    }
  }
  return c;
}
