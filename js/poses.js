// 烏龜姿勢：載入切好的姿勢圖、依狀態挑姿勢、加上程式做的小動作（呼吸、擺動、跳一下）。
// 2D 和 2.5D 都用這裡的 renderTurtle 畫烏龜，所以兩邊長得一樣。
import { drawTurtleShape } from './turtle-shape.js';

export class PoseSet {
  constructor(meta, images) {
    this.meta = meta;
    this.images = images;
    const std = meta.poses.walk_a || Object.values(meta.poses)[0];
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
    return res.ok ? await res.json() : [];
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

// 各情境可以隨機穿插的小動作
const IDLE_EXTRAS = {
  bask: ['yawn', 'stretch', 'relax', 'neck_up', 'purr', 'look', 'wag', 'shake'],
  shallow: ['drink', 'sniff', 'look', 'exhale', 'think', 'neck_up', 'wag', 'shake'],
  bottom: ['look', 'sniff', 'think', 'exhale'],
  float: ['exhale', 'float'],
};
const IDLE_BASE = { bask: 'bask', shallow: 'observe', bottom: 'rest', float: 'float' };

// 依烏龜目前的狀態決定要用哪個姿勢（t 是 Tank 裡的烏龜狀態）
// 某個品種還沒有這個姿勢的圖時，依序改用最接近的姿勢（最後退回標準站姿）
const POSE_FALLBACK = {
  sleep: ['rest', 'hide', 'head_in'],
  bask: ['rest', 'relax', 'stretch'],
  swim: ['walk_b', 'walk_a'],
  dive: ['swim', 'walk_b'],
  rise: ['swim', 'neck_up'],
  float: ['swim', 'rest'],
  drink: ['neck_up', 'observe'],
  nibble: ['sniff', 'angry'],
  exhale: ['neck_up', 'observe'],
  run: ['walk_b', 'walk_a'],
  yawn: ['angry', 'relax'],
  stretch: ['neck_up', 'relax'],
  purr: ['relax', 'rest'],
  relax: ['rest', 'walk_a'],
  startled: ['alert', 'neck_up', 'look'],
  angry: ['hide'],
  happy: ['observe', 'look'],
  wag: ['shake', 'happy', 'relax'],
  shake: ['wag', 'happy', 'relax'],
  think: ['look', 'observe'],
  look: ['observe', 'think'],
  observe: ['look', 'neck_up'],
  hide: ['head_in', 'rest'],
  rest: ['hide', 'relax'],
};

// 找這個姿勢能用的圖：有循環幀就輪播，沒有圖就照 POSE_FALLBACK 找替代，最後退回標準站姿
function resolvePose(poses, key, time) {
  if (!poses) return key;
  for (const k of [key, ...(POSE_FALLBACK[key] || [])]) {
    const frame = loopFrame(poses, k, time, 6);
    if (frame) return frame;
    if (poses.has(k)) return k;
  }
  return poses.has('walk_a') ? 'walk_a' : key;
}

export function choosePose(t, time, ctx) {
  return resolvePose(ctx.poses, baseKey(t, time, ctx), time);
}

function baseKey(t, time, ctx) {
  if (t.flash && time < t.flash.until) return t.flash.key;

  const wp = t.path[0];
  if (wp) {
    if (wp.walk) {
      if (t.mode === 'food') return 'run';
      return loopFrame(ctx.poses, 'walk', t.anim, 5) || (Math.floor(t.anim * 3) % 2 ? 'walk_b' : 'walk_a');
    }
    if (t.vy > 0.6) return 'dive';
    if (t.vy < -0.6) return 'rise';
    return loopFrame(ctx.poses, 'swim', t.anim, 6) || 'swim';
  }

  if (t.mode === 'sleep') return 'sleep';
  if (ctx.sick) return 'rest';
  if (t.mode === 'food') return 'sniff';

  const where = t.grounded
    ? (t.y < ctx.waterTop ? 'bask' : t.x > ctx.swimLimit - 40 ? 'shallow' : 'bottom')
    : 'float';

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

function loopFrame(poses, name, anim, fps) {
  if (!poses?.has(`${name}_1`)) return null;
  return `${name}_${Math.floor(anim * fps) % 4 + 1}`;
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
    const sameLoop = t.pose && key.replace(/_\d$/, '') === t.pose.replace(/_\d$/, '') && /_\d$/.test(key);
    t.prevPose = sameLoop ? null : t.pose;
    t.pose = key;
    if (!sameLoop) t.poseAt = time;
  }
  return Math.min(1, (time - t.poseAt) / 0.15);
}
