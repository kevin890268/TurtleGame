// 戶外池圓台的地形：整個圓台頂面是一張高度圖。
//
// - 池子是碗狀的：靠圓台正面（正面切開，看得到水裡的烏龜），中間深、四周是緩坡。
//   沿著烏龜走的那一條（z ≈ 0）完全照 terrain.js 的 OUTDOOR_PROFILE，烏龜的行為不用改。
// - 池子右邊是一片圓弧形的沙灘（烏龜曬背的地方），其他是草地。
// - 小溪、濕地的水窪、泉水直接挖在地形裡。
// 景物（石頭、灌木、花草）的擺放在 js/outdoor-garden.js，擺放時用這裡的 height / info 查地面。
//
// 座標：跟 tank3d 一樣的 3D 單位。x 向右、z 向前（正面在 z = FRONT）、y 向上。

// ---------- 版面 ----------
export const DISC_R = 190;         // 圓台半徑
export const FRONT = 44;           // 圓台正面（池子剖面）的 z
export const DISC_CZ = FRONT - 106;  // 圓台圓心的 z（正面切在圓心前方 106）
export const THICK = 32;           // 圓台厚度（池子最深的地方離底部還有幾單位土）

// 池子：以正面上的一點為中心的橢圓（碗），q < 0.6 的範圍完全照剖面，往外慢慢升到地面
const POND = { x: -40, rx: 95, rz: 100 };

// 沙灘：池子右岸、烏龜曬背那一段
const BEACH = { x: 32, z: 4, rx: 46, rz: 32 };

// 溪流石頭區：小溪上游、泉水周圍一片微微隆起的碎石坡，溪水在石頭之間往下流，不長草
export const ROCKY = { x: 92, z: -162, rx: 58, rz: 44 };
const ROCKY_RISE = 5;              // 石頭區中間比草地高多少

// 小溪：從圓台後方的泉水彎彎曲曲流進池子後緣
export const STREAM = [
  [84, -186], [70, -166], [48, -150], [18, -134], [-12, -112], [-32, -88], [-42, -64], [-42, -36],
];
export const STREAM_W0 = 21, STREAM_W1 = 33;  // 源頭寬、出口寬
export const SPRING = { x: 86, z: -194, r: 15 };
// 濕地：幾個形狀不規則的淺水窪
export const POOLS = [
  { x: -100, z: -140, r: 20 }, { x: -128, z: -106, r: 12 },
  { x: -70, z: -172, r: 13 }, { x: -130, z: -164, r: 9 },
];

// 矮灌木（x, z, 大小）：一叢一叢貼著地面，不要有樹幹
export const BUSHES = [
  [130, -84, 9], [150, -134, 8], [40, -216, 10], [-160, -48, 8], [-56, -206, 9],
  [166, -36, 7], [-174, -96, 7], [-150, 14, 7], [104, -40, 6],
  [-18, -188, 7], [-120, -206, 6], [160, 6, 6], [70, -92, 6],
];

const STREAM_DEPTH = 2;
const POOL_DEPTH = 1.9;

export function makeLand({ rim, waterY, deepY, profileY }) {
  const base = rim - THICK;
  const disc = { cx: 0, cz: DISC_CZ, r: DISC_R, front: FRONT, top: rim, base };
  const stream = STREAM.map(([x, z]) => ({ x, z }));

  // 形狀不規則的圓：半徑隨角度起伏（水窪、沙灘、池子共用）
  const wobble = (a, ph) => 1 + 0.07 * Math.sin(a * 3 + ph) + 0.05 * Math.sin(a * 5 + ph * 1.7) + 0.03 * Math.sin(a * 2 + ph * 2.3);
  // 點在橢圓裡的「相對距離」：1 剛好在邊上
  const ellipseQ = (x, z, cx, cz, rx, rz, ph) => {
    const dx = (x - cx) / rx, dz = (z - cz) / rz;
    return Math.hypot(dx, dz) / wobble(Math.atan2(dz, dx), ph);
  };
  const pondQ = (x, z) => ellipseQ(x, z, POND.x, FRONT, POND.rx, POND.rz, 1);
  const beachQ = (x, z) => ellipseQ(x, z, BEACH.x, BEACH.z, BEACH.rx, BEACH.rz, 4);
  const poolQ = (p, i, x, z) => ellipseQ(x, z, p.x, p.z, p.r, p.r * 0.85, i * 2.1 + 0.5);
  const rockyQ = (x, z) => ellipseQ(x, z, ROCKY.x, ROCKY.z, ROCKY.rx, ROCKY.rz, 2.6);

  const smooth = (e0, e1, v) => {
    const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  const noise = (x, z) => 0.5 * Math.sin(x * 0.13 + z * 0.07) + 0.5 * Math.sin(x * 0.05 - z * 0.11 + 1.3);

  const distToStream = (x, z) => {
    let best = Infinity, at = 0;
    for (let i = 0; i < stream.length - 1; i++) {
      const [d, t] = segDist(x, z, stream[i], stream[i + 1]);
      if (d < best) { best = d; at = (i + t) / (stream.length - 1); }
    }
    return [best, at];
  };
  const streamWidth = t => STREAM_W0 + (STREAM_W1 - STREAM_W0) * t;

  // 沒挖溪、水窪之前的地面：池子的碗 ＋ 草地上很緩的起伏
  function baseHeight(x, z) {
    const q = pondQ(x, z);
    const bowl = rim - (rim - deepY) * (1 - smooth(0.6, 1.0, q));
    // 烏龜走的那一段（z ≈ 0）照剖面；往後岸線稍微彎一點，才不會是一直線
    const sh = smooth(-16, -34, z) * 9 * Math.sin(z * 0.07 + 2);
    let h = Math.max(profileY(x + sh), bowl);
    // 草地的小起伏：離水遠一點才有，圓台邊緣收回到 rim（跟側面接齊）
    const r = Math.hypot(x - disc.cx, z - disc.cz);
    const land = smooth(waterY + 3, rim, h) * (1 - smooth(DISC_R - 16, DISC_R - 4, r)) * (1 - smooth(FRONT - 10, FRONT, z));
    h += land * 0.9 * (Math.sin(x * 0.045 + 0.7) * Math.cos(z * 0.05 - 0.4) + 0.4 * Math.sin(x * 0.11 + z * 0.09));
    // 溪流石頭區：中間隆起、凹凸不平，小溪順著坡往下流
    const rq = rockyQ(x, z);
    if (rq < 1.2) h += (1 - smooth(0.15, 1.1, rq)) * (ROCKY_RISE + 0.8 * Math.sin(x * 0.19) * Math.cos(z * 0.23));
    return h;
  }

  // 各種地面的比重（0～1），畫顏色、擺景物都用這個
  function info(x, z) {
    const h0 = baseHeight(x, z);
    const n = noise(x, z);
    const dry = smooth(waterY + 0.3, waterY + 2, h0);        // 高出水面多少
    // 溪
    const [ds, at] = distToStream(x, z);
    const hw = streamWidth(at) / 2;
    const streamCut = STREAM_DEPTH * (1 - smooth(hw - 1, hw + 2.5, ds)) * dry;
    const streamBank = (1 - smooth(hw + 0.5, hw + 3.5 + n, ds)) * dry;
    // 水窪與泉水
    let poolCut = 0, mud = 0;
    POOLS.forEach((p, i) => {
      const q = poolQ(p, i, x, z);
      poolCut = Math.max(poolCut, POOL_DEPTH * (1 - smooth(0.7, 1.05, q)));
      mud = Math.max(mud, 1 - smooth(1.05, 1.5 + n * 0.15, q));
    });
    const sq = Math.hypot(x - SPRING.x, z - SPRING.z) / SPRING.r;
    poolCut = Math.max(poolCut, POOL_DEPTH * (1 - smooth(0.7, 1.05, sq)));
    const springBank = 1 - smooth(1.05, 1.6, sq);
    // 沙灘、池邊的濕沙
    const beach = 1 - smooth(0.85, 1.05 + n * 0.06, beachQ(x, z));
    const rocky = 1 - smooth(0.8, 1.02 + n * 0.08, rockyQ(x, z));
    const bank = 1 - smooth(waterY + 1.2, waterY + 4 + n * 1.5, h0);
    const h = h0 - Math.max(streamCut, poolCut);
    const grass = Math.max(0, 1 - Math.max(beach, bank, streamBank, springBank, mud * 0.9, rocky));
    return { h, h0, beach, bank, stream: streamBank, spring: springBank, mud, rocky, grass, underwater: h < waterY };
  }

  const height = (x, z) => info(x, z).h;

  // 小溪水面的高度：沿著溪流，離開平地之後順著池岸往下流進池子
  const streamSurface = (x, z) => Math.max(waterY + 0.05, baseHeight(x, z) - 0.55);

  const inDisc = (x, z, m = 0) => z < FRONT - m && Math.hypot(x - disc.cx, z - disc.cz) < DISC_R - m;

  return {
    disc, rim, waterY, base,
    height, info, baseHeight, streamSurface, inDisc,
    pondQ, rockyQ, distToStream, streamWidth, wobble,
    // 池子水面的範圍（水面平面只要蓋住這一塊；超出的地方會被地面擋住）
    pondBox: { x0: POND.x - POND.rx * 1.25, x1: POND.x + POND.rx * 1.25, z0: FRONT - POND.rz * 1.25, z1: FRONT },
  };
}

function segDist(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return [Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)), t];
}
