// 地形。烏龜的行為和 3D 畫面共用這份資料，座標是 1000×600 的邏輯座標（y 往下為正）。
// 室內缸跟戶外池是兩份不同的地形剖面，但共用同一套演算法（groundY 等），
// 呼叫時用 terrainOf(scene) 拿對應那份，用法一樣不用另外學。
//
// 室內缸：
//   ┌──────────────────────────────────────────────┐
//   │                                  💡          │
//   │~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ ▁▁▁▁▁▁▁│ ← 曬台（露出水面）
//   │                         ▁▁▁▁▁▁▁▁▁▁／        │ ← 淺水區
//   │   深水區              ／                     │
//   │▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁／                      │
//   └──────────────────────────────────────────────┘
//
// 戶外池：像真的池塘，左邊淺、中間深、右邊慢慢變淺上岸；深度跟圓台一樣淺（只有 2.5D）
//   ┌───────────────────────────────────────────────┐
//   │~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~   ▁▁▁▁▁▁▁▁▁│ ← 沙灘、草地
//   │ ＼＿        深水區        ＿／ 淺水            │
//   │     ＼＿＿＿＿＿＿＿＿＿／                     │
//   └───────────────────────────────────────────────┘

export const W = 1000, H = 600;
export const WATER_TOP = 175;

// 室內缸地面剖面 [x, y]，由左到右
export const PROFILE = [
  [0, 548], [360, 548], [440, 530], [520, 450], [580, 350], [630, 292], [670, 280],
  [760, 276], [800, 258], [830, 205], [855, 160], [885, 146], [1000, 140],
];

export const ZONES = {
  deep: [30, 400],
  shallow: [650, 780],
  bask: [880, 985],
};

export const LAMP_X = 930;
export const AIR_STONE_X = 70;

// 戶外池地面剖面：最深約 116（圓台厚度以內），左右兩邊都是緩坡，右邊上岸是沙灘接草地。
// 3D 的碗狀池子（前後方向也是淺→深）由 js/outdoor-land.js 依這條剖面做出來。
export const OUTDOOR_PROFILE = [
  [0, 238], [60, 262], [140, 286], [240, 292], [330, 286],
  [400, 264], [460, 230], [510, 198], [545, 180], [580, 166],
  [650, 152], [750, 145], [850, 140], [1000, 138],
];

export const OUTDOOR_ZONES = {
  deep: [90, 400],
  shallow: [430, 540],
  bask: [590, 980], // 沙灘＋草地
};

function makeGroundY(profile) {
  return function groundY(x) {
    if (x <= profile[0][0]) return profile[0][1];
    for (let i = 1; i < profile.length; i++) {
      const [x1, y1] = profile[i];
      if (x <= x1) {
        const [x0, y0] = profile[i - 1];
        const t = (x - x0) / (x1 - x0);
        const s = t * t * (3 - 2 * t); // 平滑轉折，讓斜坡不要有尖角
        return y0 + (y1 - y0) * (0.5 * t + 0.5 * s);
      }
    }
    return profile[profile.length - 1][1];
  };
}

export const groundY = makeGroundY(PROFILE);
export const outdoorGroundY = makeGroundY(OUTDOOR_PROFILE);

function makeGroundSlope(groundYFn) {
  return x => (groundYFn(x + 3) - groundYFn(x - 3)) / 6;
}

export const groundSlope = makeGroundSlope(groundY);
export const outdoorGroundSlope = makeGroundSlope(outdoorGroundY);

function makeSwimLimitX(groundYFn, k) {
  // 從最深的地方往右，水深還夠這麼高（h）的烏龜游泳的最右邊 x。
  // k：水深至少要烏龜身高的幾倍（戶外池很淺，烏龜半浮在水面也算在游）
  let deepest = 0;
  for (let x = 0; x <= W; x += 5) if (groundYFn(x) > groundYFn(deepest)) deepest = x;
  return function swimLimitX(h) {
    let last = deepest;
    for (let x = deepest; x <= W; x += 5) {
      if (groundYFn(x) - WATER_TOP < h * k) break;
      last = x;
    }
    return last;
  };
}

export const swimLimitX = makeSwimLimitX(groundY, 1.15);
export const outdoorSwimLimitX = makeSwimLimitX(outdoorGroundY, 0.8);

function makeSampleGround(groundYFn) {
  // 取樣出一串點，給畫地形用
  return function sampleGround(step = 5) {
    const pts = [];
    for (let x = 0; x <= W; x += step) pts.push([x, groundYFn(x)]);
    return pts;
  };
}

export const sampleGround = makeSampleGround(groundY);
export const outdoorSampleGround = makeSampleGround(outdoorGroundY);

function shoreOf(groundYFn) {
  // 水面到岸邊為止的 x（再往右就是露出水面的陸地）
  let x = 0;
  while (x < W && groundYFn(x) > WATER_TOP) x += 2;
  return x;
}

export const SHORE_X = shoreOf(groundY);
export const OUTDOOR_SHORE_X = shoreOf(outdoorGroundY);

// 依場景取一整包地形函式/資料，室內外都用同一組 key，呼叫端不用分兩套寫法
const INDOOR_TERRAIN = { ZONES, groundY, groundSlope, swimLimitX, sampleGround, SHORE_X };
const OUTDOOR_TERRAIN = {
  ZONES: OUTDOOR_ZONES, groundY: outdoorGroundY, groundSlope: outdoorGroundSlope,
  swimLimitX: outdoorSwimLimitX, sampleGround: outdoorSampleGround, SHORE_X: OUTDOOR_SHORE_X,
};

export function terrainOf(scene) {
  return scene === 'outdoor' ? OUTDOOR_TERRAIN : INDOOR_TERRAIN;
}
