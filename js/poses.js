// 烏龜姿勢：載入切好的姿勢圖、依狀態挑姿勢、加上程式做的小動作（呼吸、擺動、跳一下）。
// 2D 和 2.5D 都用這裡的 renderTurtle 畫烏龜，所以兩邊長得一樣。
import { drawTurtleShape } from './turtle-shape.js';

export class PoseSet {
  constructor(meta, images) {
    this.meta = meta;
    this.images = images;
    const std = meta.poses.walk_a_R_1 || meta.poses.walk_a || Object.values(meta.poses)[0];
    this.stdBottom = std.bottom; // 標準站姿時，腳底在背甲中心下方多遠（背甲寬為單位）
  }

  has(key) {
    return !!this.images[key];
  }

  bottom(key) {
    return this.meta.poses[key]?.bottom ?? this.stdBottom;
  }
}

// 哪些品種有姿勢圖（由 tools/slice_poses.py 產生的 assets/poses/index.json）
export async function loadPoseIndex() {
  try {
    const res = await fetch('assets/poses/index.json', { cache: 'no-cache' });
    if (!res.ok) return [];
    // 舊版切圖工具寫的是陣列，新版是 { version, species }
    const data = await res.json();
    return Array.isArray(data) ? data : (data.species || []);
  } catch {
    return [];
  }
}

// 每個品種的姿勢圖放在 assets/poses/<品種 id>/；沒有的品種回傳 null（改用程式畫的替代圖）
export async function loadPoses(speciesId) {
  const dir = `assets/poses/${speciesId}`;
  try {
    const res = await fetch(`${dir}/poses.json`, { cache: 'no-cache' });
    if (!res.ok) return null;
    const meta = await res.json();
    const entries = await Promise.all(Object.entries(meta.poses).map(([key, p]) => new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve([key, img]);
      img.onerror = () => resolve([key, null]);
      img.src = `${dir}/${p.file}`;
    })));
    const images = Object.fromEntries(entries.filter(([, img]) => img));
    return Object.keys(images).length ? new PoseSet(meta, images) : null;
  } catch {
    return null;
  }
}

// 4 個視角：R 右側 / L 左側 / F 正面 / B 背面。切圖工具產出的 key 是
// `動作_視角_第幾幀`（例如 walk_a_R_3），每個動作固定 4 幀。
// 舊品種還是舊格式（walk_a、walk_a_R、walk_1…），所以下面的候選 key 兩種都找。
const FRAMES_PER_ACTION = 4;

// 這張圖本身就是朝特定方向畫的（walk_a_R_3、walk_a_R…），畫的時候就不要再左右翻
export function isDirectional(key) {
  return /_[RLFB](_\d+)?$/.test(key || '');
}

function dirOf(t) {
  // 以臉面向為主；未來要用 z 深度時，這裡才會回傳 F / B
  return t.face > 0 ? 'R' : 'L';
}

// 把一個 key 換成另一個視角，保持同一個動作和同一幀（walk_a_R_3 → walk_a_F_3）。
// 那個視角沒有圖就回傳原本的 key。2.5D 鏡頭繞圈時用這個換視角。
export function withView(poses, key, view) {
  if (!poses || !key || !view) return key;
  const m = /^(.*?)_([RLFB])(?:_(\d+))?$/.exec(key);
  if (!m) return key;
  const [, action, , frame] = m;
  for (const candidate of frame ? [`${action}_${view}_${frame}`, `${action}_${view}_1`]
                                : [`${action}_${view}`]) {
    if (poses.has(candidate)) return candidate;
  }
  return key;
}

// 找這個動作實際存在的圖：先照方向、再照幀，都沒有就換視角或退回第 1 幀
export function pickPose(poses, action, dir, anim, fps = 6) {
  if (!poses || !action) return null;
  const idx = Math.floor(Math.max(0, anim) * fps) % FRAMES_PER_ACTION + 1;
  const views = dir === 'L' ? ['L', 'R', 'F', 'B'] : ['R', 'L', 'F', 'B'];
  const frames = idx === 1 ? [1] : [idx, 1];

  for (const view of views) {
    for (const frame of frames) {
      for (const key of [`${action}_${view}_${frame}`, `${action}_${frame}_${view}`]) {
        if (poses.has(key)) return key;
      }
    }
    if (poses.has(`${action}_${view}`)) return `${action}_${view}`;
  }
  for (const frame of frames) {
    if (poses.has(`${action}_${frame}`)) return `${action}_${frame}`;
  }
  return poses.has(action) ? action : null;
}

// 各情境可以隨機穿插的小動作（v3 動作名稱，見 gpt/actions/bangui_v3/README.md）
const IDLE_EXTRAS = {
  bask: ['yawn', 'look', 'happy', 'sniff'],
  shallow: ['sniff', 'look', 'happy', 'yawn'],
  bottom: ['look', 'sniff'],
  float: ['surface', 'hover'],
};
const IDLE_BASE = { bask: 'bask', shallow: 'look', bottom: 'bottom_rest', float: 'float' };

// 某個動作還沒有圖時，依序改用哪些姿勢（只往下找一層）。
// v3 的新動作先退回舊版切圖的名稱，所以新圖還沒生成、或其他品種還是舊素材時都有圖可用。
const POSE_FALLBACK = {
  // ---- v3 水上 ----
  walk: ['walk_a', 'walk_b'],
  turn: ['walk', 'walk_a'],
  look: ['observe', 'neck_up', 'think'],
  sniff: ['observe', 'look'],
  eat: ['nibble', 'sniff'],
  bask: ['stretch', 'rest', 'relax'],
  sleep: ['rest', 'hide', 'head_in'],
  yawn: ['angry', 'relax'],
  hide: ['head_in', 'rest'],
  startled: ['alert', 'neck_up', 'look'],
  happy: ['shake', 'wag', 'observe', 'look'],
  enter_water: ['walk', 'walk_a'],
  flip: ['hide', 'rest'],
  // ---- v3 水下 ----
  swim: ['walk_b', 'walk_a'],
  swim_turn: ['swim', 'walk_b'],
  hover: ['float', 'swim'],
  dive: ['swim', 'walk_b'],
  surface: ['rise', 'float', 'swim'],
  float: ['swim', 'rest'],
  eat_water: ['nibble', 'sniff'],
  bottom_walk: ['walk', 'walk_a', 'walk_b'],
  bottom_rest: ['rest', 'sleep', 'relax'],
  climb_out: ['walk', 'walk_a'],
  // ---- 舊名稱（其他品種的舊素材還在用） ----
  rise: ['swim', 'neck_up'],
  nibble: ['sniff', 'angry'],
  rest: ['hide', 'relax'],
  observe: ['look', 'neck_up'],
};

// 找這個姿勢能用的圖：沒有這個動作就照 POSE_FALLBACK 找替代，最後退回走路
function resolvePose(poses, key, anim, dir) {
  if (!poses) return key;
  for (const k of [key, ...(POSE_FALLBACK[key] || [])]) {
    const found = pickPose(poses, k, dir, anim);
    if (found) return found;
  }
  return pickPose(poses, 'walk', dir, anim) || pickPose(poses, 'walk_a', dir, anim) || key;
}

export function choosePose(t, time, ctx) {
  const dir = dirOf(t);
  const base = baseKey(t, time, ctx);
  // 動作的幀用 t.anim 推進，走得快動得就快
  return resolvePose(ctx.poses, base, t.anim, dir);
}

function baseKey(t, time, ctx) {
  if (t.mode === 'flipped') return 'flip';

  // 在哪裡：曬台（陸上）、淺灘（算陸上）、水底、水中
  const where = t.grounded
    ? (t.y < ctx.waterTop ? 'bask' : t.x > ctx.swimLimit - 40 ? 'shallow' : 'bottom')
    : 'float';
  const underwater = where === 'bottom' || where === 'float';

  if (t.flash && time < t.flash.until) {
    // 吃東西：水裡用水中版，陸上用陸上版
    if (t.flash.key === 'eat' && underwater) return 'eat_water';
    return t.flash.key;
  }

  const wp = t.path[0];
  if (wp) {
    if (wp.walk) return where === 'bottom' ? 'bottom_walk' : 'walk';
    if (t.vy > 0.6) return 'dive';
    if (t.vy < -0.6) return 'surface';
    return 'swim';
  }

  if (t.mode === 'sleep' || ctx.sick) return underwater ? 'bottom_rest' : 'sleep';
  if (t.mode === 'food') return where === 'float' ? 'hover' : 'sniff';

  // 每隔幾秒隨機做個小動作
  if (time > t.idleNext) {
    const extras = IDLE_EXTRAS[where];
    t.idleKey = extras[Math.floor(Math.random() * extras.length)];
    t.idleUntil = time + 2 + Math.random() * 2;
    t.idleNext = t.idleUntil + 4 + Math.random() * 6;
  }
  if (time < t.idleUntil && t.idleKey) return t.idleKey;
  return IDLE_BASE[where];
}

// 沒有姿勢圖時，退回程式畫的三種樣子
function fallbackKind(key) {
  if (['sleep', 'hide', 'head_in', 'rest', 'alert'].includes(key)) return 'sleep';
  if (['bask', 'relax', 'purr', 'stretch'].includes(key)) return 'bask';
  return 'swim';
}

// 程式做的動感：呼吸、划水擺動、走路起伏、開心跳一下
export function poseMotion(t, key, time, w) {
  const m = { dy: 0, rot: 0, sx: 1, sy: 1 };
  const moving = t.path.length > 0;
  if (!moving) {
    m.sy = 1 + Math.sin(time * 2.2) * 0.015;
  } else if (t.path[0].walk) {
    m.dy = -Math.abs(Math.sin(t.anim * 6)) * w * 0.02;
    m.rot = Math.sin(t.anim * 6) * 0.02;
  } else {
    m.rot = Math.sin(t.anim * 4) * 0.04;
    m.sx = 1 + Math.sin(t.anim * 8) * 0.02;
  }
  if (t.flash && time < t.flash.until) {
    const k = 1 - (t.flash.until - time) / t.flash.dur;
    if (['happy', 'wag', 'shake'].includes(t.flash.key)) m.dy -= Math.sin(k * Math.PI) * w * 0.12;
    if (t.flash.key === 'startled') m.dy -= Math.sin(Math.min(1, k * 3) * Math.PI) * w * 0.08;
    if (t.flash.key === 'hide' || t.flash.key === 'angry') m.rot += Math.sin(k * 40) * 0.03 * (1 - k);
  }
  return m;
}

// 以背甲中心為原點、背甲寬 shellPx 畫出姿勢，alpha 用來做換姿勢時的淡入淡出
export function renderTurtle(ctx, poses, key, shellPx, anim, alpha = 1, palette) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  const img = poses?.images[key];
  if (img) {
    const k = shellPx / poses.meta.shellWidth;
    const [ax, ay] = poses.meta.anchor;
    ctx.drawImage(img, -ax * k, -ay * k, img.width * k, img.height * k);
  } else {
    drawTurtleShape(ctx, shellPx / 0.94, fallbackKind(key), anim, palette);
  }
  ctx.restore();
}

// 換姿勢時，舊姿勢淡出、新姿勢淡入
export function trackPoseChange(t, key, time) {
  if (key !== t.pose) {
    // 同一組循環動畫的幀之間直接切換，不做淡入淡出
    const sameLoop = t.pose && key.replace(/_\d+$/, '') === t.pose.replace(/_\d+$/, '') && /_\d+$/.test(key);
    t.prevPose = sameLoop ? null : t.pose;
    t.pose = key;
    if (!sameLoop) t.poseAt = time;
  }
  return Math.min(1, (time - t.poseAt) / 0.15);
}
