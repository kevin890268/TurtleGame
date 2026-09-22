// 地形。2D 和 2.5D 共用這份資料，座標是 1000×600 的邏輯座標（y 往下為正）。
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
// 戶外池：一路四等分，深水／淺水／石頭陸地／草地各 1/4 寬
//   ┌───────────┬───────────┬───────────┬───────────┐
//   │  深水區    │  淺水區    │ 石頭陸地區  │  草地區    │
//   └───────────┴───────────┴───────────┴───────────┘

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

// 戶外池地面剖面：四段依序是深水（0-250）／淺水（250-500）／石頭陸地（500-750）／草地（750-1000），
// 每段內部再用幾個控制點做出自然的坡度，跟室內缸共用同一套平滑插值。
export const OUTDOOR_PROFILE = [
  [0, 520], [150, 522], [250, 500],
  [330, 420], [410, 310], [470, 225], [500, 195],
  [520, 165], [580, 150], [650, 145], [750, 143],
  [850, 140], [1000, 138],
];

export const OUTDOOR_ZONES = {
  deep: [30, 220],
  shallow: [300, 480],
  bask: [520, 980], // 石頭陸地＋草地都算「陸地」，烏龜行為不分；畫面上才分兩種材質
};

// 石頭陸地／草地的分界（3D 畫地形顏色時用）
export const OUTDOOR_GRASS_X = 750;

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

function makeSwimLimitX(groundYFn) {
  // 從左邊開始，水深還夠這麼高（h）的烏龜游泳的最右邊 x
  return function swimLimitX(h) {
    let last = 0;
    for (let x = 0; x <= W; x += 5) {
      if (groundYFn(x) - WATER_TOP < h * 1.15) break;
      last = x;
    }
    return last;
  };
}

export const swimLimitX = makeSwimLimitX(groundY);
export const outdoorSwimLimitX = makeSwimLimitX(outdoorGroundY);

export function isUnderwater(y) {
  return y > WATER_TOP;
}

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
