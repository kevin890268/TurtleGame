// 游標工具：每一種工具就是一種「滑鼠」，換工具游標也跟著換。
//
// 拓樸表 AFFORD：工具 × 碰到的東西 → 做什麼。
// 要加新工具、新東西，只要在 TOOLS 加一個工具、在 AFFORD 加一列，再到 tank3d.js 寫那個動作（act_○○）。
//
// 碰到的東西（kind）：turtle 龜龜、plant 水草、water 水面、ground 地面
// 動作的時機：tap 點一下；drag 按住拖曳（按下、移動、放開都會呼叫）

export const TOOLS = [
  { id: 'view', icon: '👁️', label: '看看', hint: '拖曳轉鏡頭，點一下東西戳戳看' },
  { id: 'hand', icon: '✋', grab: '✊', label: '手手', hint: '按住龜龜或地面（撿小石頭）拖曳，甩出去就是丟' },
  { id: 'touch', icon: '👆', label: '撥一撥', hint: '在水面或水草上劃過去' },
];

export const AFFORD = {
  view: {
    turtle: { tap: 'pet' },
    plant: { tap: 'poke' },
    water: { tap: 'poke' },
  },
  hand: {
    turtle: { drag: 'grab' },
    ground: { drag: 'pebble' },
  },
  touch: {
    turtle: { tap: 'pet' },
    plant: { drag: 'stir' },
    water: { drag: 'stir' },
  },
  food: {
    any: { tap: 'drop' },
  },
};

// 這個工具碰到這種東西要做什麼（沒有就是 null）
export function affordance(tool, kind) {
  const row = AFFORD[tool];
  return row?.[kind] ?? row?.any ?? null;
}

// 把圖示畫成滑鼠游標（桌機才看得到；手機沒有游標，用手指就好）
const cache = new Map();
export function cursorFor(icon) {
  if (!cache.has(icon)) {
    const c = document.createElement('canvas');
    c.width = c.height = 40;
    const g = c.getContext('2d');
    g.font = '30px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,0,0,.35)';
    g.shadowBlur = 3;
    g.fillText(icon, 20, 22);
    cache.set(icon, `url(${c.toDataURL()}) 14 8, pointer`);
  }
  return cache.get(icon);
}
