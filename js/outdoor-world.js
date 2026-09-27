// 戶外池的周遭世界：圓柱形的小天地、四周一圈全景、地面與剖面的紋理。
//
// 做法：一個圓柱形的台子（高度＝池邊的地面），池子放在台子前緣，挖一個跟池子一樣大的缺口，
// 並沿著池子正面切齊——從正面看是一整面「土層剖面」，池子是剖面上的一扇窗，看得到水下的烏龜；
// 台子後面是小溪、石頭、濕地、小樹、小花（js/outdoor-garden.js）。
//
// 圖片都是可選的：assets/scene/outdoor/ 裡有 panorama、soil、grass（.webp 或 .png）就用，
// 沒有就用這裡程式畫的替代圖。提示詞在 gpt/scene/outdoor/。
import * as THREE from 'three';
import { buildGarden } from './outdoor-garden.js';

const DIR = 'assets/scene/outdoor/';
// 圓柱形的台子：池子在前緣，後面是小溪、濕地、小樹
const DISC_R = 190;          // 台子半徑
const DISC_BACK = 106;       // 台子圓心在池子正面後方多遠（正面切線到圓心的距離）
const FIELD_DROP = 26;       // 底座外面的遠方田野，比草地低多少（底座看起來像立體模型的台子）
const FIELD_R = 910;         // 遠方田野的半徑：比全景（900）大一點，藏在全景後面，接縫才不會露出一條白線
const PANO_R = 900;        // 全景圓筒半徑，比草地大一點
const PANO_H = 520;        // 全景圓筒高度
// 全景圖繞一圈重複幾次：ChatGPT 最寬只能出 1536×1024，一張拉滿一整圈會變形得很嚴重；
// 重複 6 次時每張只佔 60°，手機畫面一次看不到兩張，也只橫向拉長約 1.2 倍
const PANO_REPEAT = 6;
const SOIL_DEPTH = 220;    // 剖面在池底以下還有多深：夠深，從高處往下看才不會看到底下的空洞
const SOIL_TILE = 34;      // 土層紋理每隔多少單位重複一次
const GRASS_TILE = 36;     // 草地紋理每隔多少單位重複一次
// 草地的底色：池子地形裡的草地（頂點顏色）也用這個，兩邊才接得起來
export const GRASS_COLOR = '#6b9a45';
// 遠方田野的顏色：程式畫的全景最下面那條田野也用這個
const FIELD_COLOR = '#7ba452';

/**
 * @param {THREE.Scene} scene
 * @param {object} o
 * @param {number} o.TW  池子寬（x）
 * @param {number} o.TD  池子深（z）
 * @param {number} o.rim 池邊地面的高度（y）
 * @param {number} o.waterY 池子水面的高度（y）
 * @param {THREE.WebGLRenderer} o.renderer
 */
export function buildOutdoorWorld(scene, { TW, TD, rim, waterY, renderer }) {
  const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  // ---------- 紋理：先用程式畫的，有圖檔就換掉 ----------
  const soil = canvasTexture(drawSoil(256), aniso);
  const grass = canvasTexture(drawGrass(256), aniso);
  const pano = canvasTexture(drawPanorama(1536, 1024), aniso);
  pano.wrapT = THREE.ClampToEdgeWrapping;

  // 池子剖面（正面）用的土層：UV 是世界座標 (x, y)
  const soilCap = soil.clone();
  soilCap.repeat.set(1 / SOIL_TILE, 1 / SOIL_TILE);

  // 草地的側面（也是土層）：ExtrudeGeometry 的側面 UV 是 (x, 1 - 擠出方向)，
  // 翻轉並位移，讓土層高度跟池子剖面對齊（同一個 y 是同一層土）
  const base = -SOIL_DEPTH;
  const soilSide = soil.clone();
  const k = 1 / SOIL_TILE;
  soilSide.repeat.set(k, -k);
  soilSide.offset.set(0, k * (1 + base));

  grass.repeat.set(1 / GRASS_TILE, 1 / GRASS_TILE);

  const soilTextures = [soilCap, soilSide];   // 土層貼圖（之後建立的也會加進來）
  loadOptional(DIR + 'soil', aniso, img => {
    for (const t of soilTextures) { t.image = img; t.needsUpdate = true; }
  });
  loadOptional(DIR + 'grass', aniso, img => { grass.image = img; grass.needsUpdate = true; });
  loadOptional(DIR + 'panorama', aniso, img => { pano.image = img; pano.needsUpdate = true; });

  // ---------- 圓柱形的台子 ----------
  // 圓心在池子正面後方 DISC_BACK；正面沿池子切齊（一條弦），中間挖掉池子
  const hx = TW / 2, hz = TD / 2;
  const front = hz;
  const disc = { cx: 0, cz: front - DISC_BACK, r: DISC_R, front, top: rim };
  const half = Math.sqrt(DISC_R * DISC_R - DISC_BACK * DISC_BACK); // 正面那條弦的一半長
  const shape = new THREE.Shape();
  // Shape 的 (x, y) 對應世界的 (x, -z)
  const P = (x, z) => [x, -z];
  shape.moveTo(...P(-half, front));
  shape.lineTo(...P(-hx, front));
  shape.lineTo(...P(-hx, -hz));
  shape.lineTo(...P(hx, -hz));
  shape.lineTo(...P(hx, front));
  shape.lineTo(...P(half, front));
  // 從右前方沿圓周往後繞到左前方
  const a0 = Math.atan2(front - disc.cz, half), a1 = Math.PI - a0 - Math.PI * 2;
  for (let i = 1; i < 120; i++) {
    const a = a0 + (a1 - a0) * (i / 120);
    shape.lineTo(...P(disc.cx + Math.cos(a) * DISC_R, disc.cz + Math.sin(a) * DISC_R));
  }
  shape.closePath();

  // 上半段（池底到地面）挖掉池子；下半段（池底以下）是實心的，不然池子正下方會是一個空洞。
  // 土層紋理的位移要依各段的起點算，上下兩段的土層才會對齊。
  const soilFrom = y0 => {
    const t = soil.clone();
    t.repeat.set(k, -k);
    t.offset.set(0, k * (1 + y0));
    return t;
  };
  const extrude = (shp, y0, y1, topMap) => {
    const geo = new THREE.ExtrudeGeometry(shp, { depth: y1 - y0, bevelEnabled: false, steps: 1, curveSegments: 6 });
    geo.rotateX(-Math.PI / 2);   // 擠出方向變成往上
    geo.translate(0, y0, 0);
    const side = soilFrom(y0);
    soilTextures.push(side);
    const mesh = new THREE.Mesh(geo, [
      new THREE.MeshStandardMaterial({ map: topMap, roughness: 1 }),  // 上下兩面
      new THREE.MeshStandardMaterial({ map: side, roughness: 1 }),    // 側面（含正面剖面）
    ]);
    scene.add(mesh);
  };
  const solid = new THREE.Shape();
  solid.moveTo(...P(-half, front));
  solid.lineTo(...P(half, front));
  for (let i = 1; i < 120; i++) {
    const a = a0 + (a1 - a0) * (i / 120);
    solid.lineTo(...P(disc.cx + Math.cos(a) * DISC_R, disc.cz + Math.sin(a) * DISC_R));
  }
  solid.closePath();
  extrude(shape, 0, rim, grass);     // 池底以上：挖掉池子
  extrude(solid, base, 0, grass);    // 池底以下：實心

  // ---------- 底座外面：低一截的遠方田野，一路接到全景 ----------
  // 也是一塊沿池子正面切齊、挖掉池子的厚板（不然平面會在剖面前面擋住水下），
  // 正面往後退一點點，避免跟底座的正面重疊閃爍。
  const fieldY = rim - FIELD_DROP;
  const ff = front - 0.3;
  const cut = Math.asin(Math.min(1, ff / FIELD_R));
  const fshape = new THREE.Shape();
  fshape.moveTo(...P(-Math.cos(cut) * FIELD_R, ff));
  fshape.lineTo(...P(-hx, ff));
  fshape.lineTo(...P(-hx, -hz));
  fshape.lineTo(...P(hx, -hz));
  fshape.lineTo(...P(hx, ff));
  fshape.lineTo(...P(Math.cos(cut) * FIELD_R, ff));
  // 從右前方往後繞到左前方：(x, z) = R(cosθ, sinθ)，θ 從 cut 一路減到 -(π + cut)
  for (let i = 1; i < 96; i++) {
    const a = cut + (-(Math.PI + cut) - cut) * (i / 96);
    fshape.lineTo(...P(Math.cos(a) * FIELD_R, Math.sin(a) * FIELD_R));
  }
  fshape.closePath();
  const fgeo = new THREE.ExtrudeGeometry(fshape, { depth: fieldY - base, bevelEnabled: false, steps: 1, curveSegments: 1 });
  fgeo.rotateX(-Math.PI / 2);
  fgeo.translate(0, base, 0);
  // 田野表面跟全景最下面那條田野同色、同樣不受燈光影響，接起來才不會看到一條分界
  const fieldMat = new THREE.MeshBasicMaterial({ color: FIELD_COLOR });
  const field = new THREE.Mesh(fgeo, [
    fieldMat,
    new THREE.MeshStandardMaterial({ map: soilSide, roughness: 1 }),
  ]);
  scene.add(field);

  // ---------- 全景：一圈圓筒，從遠方田野往上 ----------
  const panoGeo = new THREE.CylinderGeometry(PANO_R, PANO_R, PANO_H, 96, 1, true);
  panoGeo.translate(0, fieldY - 2 + PANO_H / 2, 0);
  pano.wrapS = THREE.RepeatWrapping;
  pano.repeat.x = -PANO_REPEAT; // 負號：從圓筒內側看圖會左右相反，翻回來
  const panoMat = new THREE.MeshBasicMaterial({ map: pano, side: THREE.BackSide, fog: false });
  const panorama = new THREE.Mesh(panoGeo, panoMat);
  scene.add(panorama);

  const day = new THREE.Color(1, 1, 1);
  const night = new THREE.Color(0.22, 0.26, 0.42);
  // ---------- 池子裡面的岸壁：淡淡的泥沙色 ----------
  // 池子四周的草地側面是土層剖面，從正面透過水看過去會是一整片深褐色、很花，
  // 烏龜（也是褐色）會跟背景混在一起。池子裡面另外貼一層淡色、低對比的岸壁。
  const bankTex = canvasTexture(drawBank(256), aniso);
  bankTex.wrapT = THREE.ClampToEdgeWrapping;
  const bankMat = new THREE.MeshStandardMaterial({ map: bankTex, roughness: 1 });
  const inset = 0.25;
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(TW, rim), bankMat);
  backWall.position.set(0, rim / 2, -hz + inset);
  scene.add(backWall);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(TD, rim), bankMat);
    wall.rotation.y = -side * Math.PI / 2;
    wall.position.set(side * (hx - inset), rim / 2, 0);
    scene.add(wall);
  }

  // ---------- 台子上的小溪、石頭、濕地、小樹、小花 ----------
  const garden = buildGarden(scene, { disc, TW, TD, rim, waterY, aniso });

  // 池子自己的地形表面（沙、石頭、草地是用頂點顏色分的）疊一層細小的顆粒感
  const speckle = canvasTexture(drawSpeckle(128), aniso);
  speckle.repeat.set(1 / 12, 1 / 12);

  return {
    soilCap,
    speckle,
    grassColor: GRASS_COLOR,
    // 鏡頭不能鑽進去的範圍：圓台（高到 rim）、遠方田野（高到 fieldY）
    disc,
    fieldY,
    // 日夜：全景不受燈光影響，自己調色
    setDaylight(f) {
      panoMat.color.copy(night).lerp(day, f);
      fieldMat.color.set(FIELD_COLOR).multiply(panoMat.color);
      garden.setDaylight(panoMat.color);
    },
    update(time) {
      garden.update(time);
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

// 池子裡的岸壁：上淺下深的泥沙色，對比很低，當作水下的背景
function drawBank(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#d9ccab');
  grad.addColorStop(0.5, '#c8bc98');
  grad.addColorStop(1, '#b3a988');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const r = rng(23);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(255,255,240,.12)' : 'rgba(90,80,50,.10)';
    g.fillRect(r() * size, r() * size, 2, 2);
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

// 全景：上方天空、遠山、竹林樹叢、最下面接草地。左右兩端接得起來。
function drawPanorama(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#9fc8e0');
  sky.addColorStop(0.6, '#dbe9e6');
  sky.addColorStop(1, '#eef1e4');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);

  // 週期正好是整張寬，左右接得起來
  const wave = (x, k, p) => Math.sin((x / w) * Math.PI * 2 * k + p);
  const ridge = (baseY, amp, ks, color) => {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) {
      const y = baseY - amp * (0.5 * wave(x, ks[0], 1) + 0.3 * wave(x, ks[1], 2.3) + 0.2 * wave(x, ks[2], 4.1));
      g.lineTo(x, y);
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();
  };
  ridge(h * 0.62, h * 0.12, [2, 5, 11], '#a9bfc4');   // 最遠的山
  ridge(h * 0.72, h * 0.08, [3, 7, 17], '#8fae9a');   // 近一點的丘陵
  ridge(h * 0.84, h * 0.05, [9, 23, 41], '#6f9460');  // 樹叢、竹林
  // 最下面：田地／草地，跟地面的草接起來
  g.fillStyle = FIELD_COLOR;
  g.fillRect(0, h * 0.9, w, h * 0.1);
  return c;
}
