// 缸內地形。2D 和 2.5D 共用這份資料，座標是 1000×600 的邏輯座標（y 往下為正）。
//
//   ┌──────────────────────────────────────────────┐
//   │                                  💡          │
//   │~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ ▁▁▁▁▁▁▁│ ← 曬台（露出水面）
//   │                         ▁▁▁▁▁▁▁▁▁▁／        │ ← 淺水區
//   │   深水區              ／                     │
//   │▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁／                      │
//   └──────────────────────────────────────────────┘

export const W = 1000, H = 600;
export const WATER_TOP = 175;

// 地面剖面 [x, y]，由左到右
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

export function groundY(x) {
  if (x <= PROFILE[0][0]) return PROFILE[0][1];
  for (let i = 1; i < PROFILE.length; i++) {
    const [x1, y1] = PROFILE[i];
    if (x <= x1) {
      const [x0, y0] = PROFILE[i - 1];
      const t = (x - x0) / (x1 - x0);
      const s = t * t * (3 - 2 * t); // 平滑轉折，讓斜坡不要有尖角
      return y0 + (y1 - y0) * (0.5 * t + 0.5 * s);
    }
  }
  return PROFILE[PROFILE.length - 1][1];
}

export function groundSlope(x) {
  return (groundY(x + 3) - groundY(x - 3)) / 6;
}

// 從左邊開始，水深還夠這麼高（h）的烏龜游泳的最右邊 x
export function swimLimitX(h) {
  let last = 0;
  for (let x = 0; x <= W; x += 5) {
    if (groundY(x) - WATER_TOP < h * 1.15) break;
    last = x;
  }
  return last;
}

export function isUnderwater(y) {
  return y > WATER_TOP;
}

// 取樣出一串點，給畫地形用
export function sampleGround(step = 5) {
  const pts = [];
  for (let x = 0; x <= W; x += step) pts.push([x, groundY(x)]);
  return pts;
}

// 水面到岸邊為止的 x（再往右就是露出水面的曬台）
export const SHORE_X = (() => {
  let x = 0;
  while (x < W && groundY(x) > WATER_TOP) x += 2;
  return x;
})();
