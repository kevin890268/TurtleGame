// 想互動請求：每隔一段時間，某隻烏龜會想要你幫牠做某件事。
// 畫面右下角會出現一排直排的圓形按鈕（烏龜頭像＋右上角一個小圖示，例如刷子），
// 點下去打開遊戲內視窗，烏龜在中間，玩家用旁邊的工具跟牠互動。
//
// 目前做好的互動只有「刷屁屁」；其他的規劃在 docs/interactions.md。
// 請求只存在記憶體裡（不寫進存檔），重新整理就會清掉，不影響存檔版號。
import { renderTurtle, pickPose, withView } from './poses.js';

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);

const SPAWN_MIN = 45;        // 兩次請求之間最少幾秒（現實時間，網頁看得到時才算）
const SPAWN_MAX = 100;
const LIFETIME = 180;        // 沒理牠的話，幾秒後請求消失
const MAX_ACTIVE = 3;        // 右下角最多同時幾個
const TURTLE_COOLDOWN = 240; // 同一隻烏龜兩次請求之間至少幾秒

// 各種請求。can() 決定這隻烏龜現在適不適合提出；game 是點開後的小遊戲。
export const REQUEST_TYPES = {
  brush: {
    icon: '🪥',
    title: name => `幫${name}刷屁屁`,
    hint: '拿右邊的刷子，在牠的屁股上來回刷',
    label: name => `${name} 想刷屁屁`,
    can: (t, agent) => !t.flipped && agent?.t.mode !== 'sleep',
    game: 'brush',
  },
};

export class Requests {
  /**
   * @param {object} opts
   * @param {() => object} opts.getState   取得遊戲狀態
   * @param {() => object} opts.getTank    取得 Tank（拿 agent 的即時狀態）
   * @param {(sp: string) => object} opts.getPoses  品種的姿勢圖
   * @param {(sp: string) => object} opts.getPalette  品種配色（沒有姿勢圖時用）
   * @param {(turtleId: string, type: string) => void} opts.onComplete  完成一次互動
   */
  constructor(opts) {
    this.opts = opts;
    this.list = [];            // { id, turtleId, type, expires }
    this.lastFor = new Map();  // 每隻烏龜上一次提出請求的時間
    this.nextAt = now() + rand(12, 25); // 開遊戲後不久就先來一個，讓玩家知道有這個功能
    this.box = $('requests');
    this.game = new BrushGame(opts, (turtleId, type) => this.finish(turtleId, type));
    setInterval(() => this.tick(), 1000);
  }

  tick() {
    if (document.hidden) return;
    const t = now();
    const before = this.list.length;
    this.list = this.list.filter(r => r.expires > t || this.game.openFor === r.id);
    if (t >= this.nextAt) {
      this.spawn();
      this.nextAt = t + rand(SPAWN_MIN, SPAWN_MAX);
    }
    if (this.list.length !== before || this.dirty) this.render();
    this.dirty = false;
  }

  // 挑一隻目前沒有請求、也不在冷卻中的烏龜，給牠一個適合的請求
  spawn(forceType) {
    const state = this.opts.getState();
    const tank = this.opts.getTank();
    const limit = Math.min(MAX_ACTIVE, state.turtles.length);
    if (this.list.length >= limit) return null;

    const t0 = now();
    const busy = new Set(this.list.map(r => r.turtleId));
    const candidates = state.turtles.filter(t =>
      !busy.has(t.id) && (forceType || t0 - (this.lastFor.get(t.id) ?? -1e9) > TURTLE_COOLDOWN));
    const pairs = [];
    for (const t of candidates) {
      const agent = tank?.agents?.get(t.id);
      for (const [type, def] of Object.entries(REQUEST_TYPES)) {
        if (forceType && type !== forceType) continue;
        if (def.can(t, agent)) pairs.push([t, type]);
      }
    }
    if (!pairs.length) return null;

    const [turtle, type] = pairs[Math.floor(Math.random() * pairs.length)];
    const req = { id: `r${Math.random().toString(36).slice(2, 8)}`, turtleId: turtle.id, type, expires: t0 + LIFETIME };
    this.list.push(req);
    this.lastFor.set(turtle.id, t0);
    this.render();
    return req;
  }

  finish(turtleId, type) {
    this.list = this.list.filter(r => !(r.turtleId === turtleId && r.type === type));
    this.render();
    this.opts.onComplete(turtleId, type);
  }

  // 右下角的一排按鈕：新的在最下面，往上疊
  render() {
    const state = this.opts.getState();
    this.box.replaceChildren();
    for (const r of this.list) {
      const t = state.turtles.find(x => x.id === r.turtleId);
      if (!t) continue;
      const def = REQUEST_TYPES[r.type];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'req-btn';
      btn.title = def.label(t.name);
      btn.setAttribute('aria-label', def.label(t.name));

      const face = document.createElement('canvas');
      face.className = 'req-face';
      drawPortrait(face, this.opts.getPoses(t.species), this.opts.getPalette(t.species));
      const badge = document.createElement('span');
      badge.className = 'req-badge';
      badge.textContent = def.icon;
      const name = document.createElement('span');
      name.className = 'req-name';
      name.textContent = t.name;

      btn.append(face, badge, name);
      btn.addEventListener('click', () => this.game.open(r, t));
      this.box.append(btn);
    }
  }
}

function now() {
  return performance.now() / 1000;
}

// 按鈕裡的烏龜頭像：側面、面向右，鏡頭拉近在頭和前半身
function drawPortrait(canvas, poses, palette) {
  const size = 56;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const key = poses ? (pickPose(poses, 'look', 'R', 0) || pickPose(poses, 'walk', 'R', 0)
    || pickPose(poses, 'walk_a', 'R', 0)) : 'walk';
  ctx.translate(size * 0.38, size * 0.58);
  renderTurtle(ctx, poses, key, size * 0.62, 0, 1, palette);
}

// ---------------------------------------------------------------------------
// 刷屁屁小遊戲
// ---------------------------------------------------------------------------

const STAGE = 300;        // 畫布的 CSS 尺寸
const NEED = 1400;        // 在屁股上總共要刷多少距離（px）才算完成
const SHELL = 150;        // 小遊戲裡烏龜背甲的大小

class BrushGame {
  constructor(opts, onDone) {
    this.opts = opts;
    this.onDone = onDone;
    this.modal = $('careModal');
    this.canvas = $('careCanvas');
    this.tool = $('careTool');
    this.bar = $('careBar');
    this.stage = this.canvas.parentElement;
    this.openFor = null;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = STAGE * dpr;
    this.canvas.height = STAGE * dpr;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(dpr, dpr);

    for (const el of this.modal.querySelectorAll('[data-care-close]')) {
      el.addEventListener('click', () => this.close());
    }
    this.modal.addEventListener('click', e => { if (e.target === this.modal) this.close(); });

    // 拖著刷子：按住刷子開始，也可以直接在烏龜身上按住（手機比較好操作）
    const start = e => {
      e.preventDefault();
      this.dragging = true;
      this.stage.setPointerCapture?.(e.pointerId);
      this.moveTool(e);
    };
    this.stage.addEventListener('pointerdown', start); // 刷子在舞台裡，按刷子也會觸發
    this.stage.addEventListener('pointermove', e => { if (this.dragging) this.moveTool(e); });
    const stop = () => {
      this.dragging = false;
      this.last = null;
    };
    this.stage.addEventListener('pointerup', stop);
    this.stage.addEventListener('pointercancel', stop);
  }

  open(req, turtle) {
    const def = REQUEST_TYPES[req.type];
    this.req = req;
    this.turtle = turtle;
    this.openFor = req.id;
    this.poses = this.opts.getPoses(turtle.species);
    this.palette = this.opts.getPalette(turtle.species);
    this.view = backPoseView(this.poses);
    this.progress = 0;
    this.done = false;
    this.bubbles = [];
    this.last = null;
    this.brushing = 0;
    $('careTitle').textContent = def.title(turtle.name);
    $('careHint').textContent = def.hint;
    this.bar.style.width = '0%';
    this.modal.hidden = false;
    this.placeTool(STAGE - 38, STAGE / 2); // 視窗顯示後舞台才有尺寸
    this.t0 = performance.now();
    const loop = () => {
      if (this.modal.hidden) return;
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  close() {
    this.modal.hidden = true;
    this.openFor = null;
    this.dragging = false;
  }

  // x, y 是 300×300 的畫布座標；舞台在手機上會縮小，要換算成實際的 CSS 像素
  placeTool(x, y) {
    this.toolX = x;
    this.toolY = y;
    const k = (this.stage.clientWidth || STAGE) / STAGE;
    this.tool.style.transform = `translate(${x * k - 22}px, ${y * k - 22}px)`;
  }

  moveTool(e) {
    if (this.done) return;
    const r = this.stage.getBoundingClientRect();
    const x = (e.clientX - r.left) * (STAGE / r.width);
    const y = (e.clientY - r.top) * (STAGE / r.height);
    this.placeTool(x, y);

    // 刷毛在刷子圖示的左下角
    const bx = x - 12;
    const by = y + 10;
    if (this.last && this.inHotspot(bx, by)) {
      const d = Math.hypot(bx - this.last.x, by - this.last.y);
      if (d > 0.5 && d < 80) {
        this.progress = Math.min(1, this.progress + d / NEED);
        this.brushing = performance.now();
        if (Math.random() < 0.5) {
          this.bubbles.push({ x: bx + rand(-8, 8), y: by + rand(-6, 6), r: rand(3, 7), born: performance.now() });
        }
        this.bar.style.width = `${Math.round(this.progress * 100)}%`;
        if (this.progress >= 1) this.complete();
      }
    }
    this.last = { x: bx, y: by };
  }

  // 屁股的位置：從目前這張圖的實際輪廓算。
  // 背面圖：輪廓下半部（尾巴朝鏡頭）；側面圖（面向右）：輪廓左半部。
  inHotspot(x, y) {
    const box = this.box || { x0: -0.6, y0: -0.5, x1: 0.6, y1: 0.5 };
    const cx = STAGE / 2;
    const cy = STAGE / 2 + 10;
    const L = cx + box.x0 * SHELL, R = cx + box.x1 * SHELL;
    const T = cy + box.y0 * SHELL, B = cy + box.y1 * SHELL;
    const w = R - L, h = B - T;
    const [hx, hy, rx, ry] = this.view.back
      ? [L + w * 0.5, T + h * 0.7, w * 0.45, h * 0.38]
      : [L + w * 0.25, T + h * 0.55, w * 0.3, h * 0.45];
    return ((x - hx) / rx) ** 2 + ((y - hy) / ry) ** 2 <= 1;
  }

  complete() {
    this.done = true;
    this.dragging = false;
    this.doneAt = performance.now();
    const { id: turtleId } = this.turtle;
    const { type } = this.req;
    setTimeout(() => {
      this.close();
      this.onDone(turtleId, type);
    }, 1400);
  }

  draw() {
    const ctx = this.ctx;
    const t = (performance.now() - this.t0) / 1000;
    ctx.clearRect(0, 0, STAGE, STAGE);

    // 地面的影子
    ctx.fillStyle = 'rgba(60, 50, 20, .12)';
    ctx.beginPath();
    ctx.ellipse(STAGE / 2, STAGE / 2 + SHELL * 0.55, SHELL * 0.62, SHELL * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // 被刷的時候（或刷完）搖屁屁，其他時候站著
    const happy = this.done || performance.now() - this.brushing < 400;
    const key = poseFor(this.poses, happy ? this.view.happy : this.view.idle, t);
    this.box = spriteBox(this.poses, key) || this.box;
    ctx.save();
    ctx.translate(STAGE / 2, STAGE / 2 + 10);
    renderTurtle(ctx, this.poses, key, SHELL, t, 1, this.palette);
    ctx.restore();

    // 泡泡
    const nowMs = performance.now();
    this.bubbles = this.bubbles.filter(b => nowMs - b.born < 900);
    for (const b of this.bubbles) {
      const k = (nowMs - b.born) / 900;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#8fb8c9';
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath();
      ctx.arc(b.x, b.y - k * 18, b.r * (1 + k * 0.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 刷完：愛心往上飄
    if (this.done) {
      const k = Math.min(1, (nowMs - this.doneAt) / 1200);
      ctx.globalAlpha = 1 - k * 0.6;
      ctx.font = '28px serif';
      ctx.textAlign = 'center';
      ctx.fillText('💕', STAGE / 2, STAGE / 2 - SHELL * 0.55 - k * 30);
      ctx.globalAlpha = 1;
    }
  }
}

// 小遊戲要用背面（看得到屁股）；沒有背面圖的品種就用側面
function backPoseView(poses) {
  if (poses?.has('happy_B_1')) {
    // 站著時用搖屁屁的第 1 幀，開始刷才播放：角度一致，不會跳
    return { back: true, idle: { key: 'happy', view: 'B' }, happy: { key: 'happy', view: 'B', loop: true } };
  }
  if (poses) {
    for (const idle of ['rest', 'bask', 'walk', 'walk_b', 'walk_a', 'turn', 'hide']) {
      if (poses.has(`${idle}_B_1`)) {
        const happy = poses.has('happy_B_1') ? 'happy' : idle;
        return { back: true, idle: { key: idle, view: 'B' }, happy: { key: happy, view: 'B', loop: true } };
      }
    }
  }
  return { back: false, idle: { key: 'walk', view: 'R' }, happy: { key: 'happy', view: 'R', loop: true } };
}

function poseFor(poses, spec, t) {
  if (!poses) return spec.key;
  const anim = spec.loop ? t : 0;
  const k = pickPose(poses, spec.key, 'R', anim, 7)
    || pickPose(poses, 'walk', 'R', anim) || pickPose(poses, 'walk_a', 'R', anim);
  return spec.view === 'B' ? withView(poses, k, 'B') : k;
}

// 一張姿勢圖的輪廓範圍，以背甲中心為原點、背甲寬為單位（跟 renderTurtle 的座標一致）
const boxCache = new WeakMap();
function spriteBox(poses, key) {
  const img = poses?.images?.[key];
  if (!img) return null;
  if (boxCache.has(img)) return boxCache.get(img);
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const a = g.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y += 2) {
    for (let x = 0; x < c.width; x += 2) {
      if (a[(y * c.width + x) * 4 + 3] > 60) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const [ax, ay] = poses.meta.anchor;
  const sw = poses.meta.shellWidth;
  const box = x1 > x0 ? { x0: (x0 - ax) / sw, y0: (y0 - ay) / sw, x1: (x1 - ax) / sw, y1: (y1 - ay) / sw } : null;
  boxCache.set(img, box);
  return box;
}

