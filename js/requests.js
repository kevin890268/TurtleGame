// 想互動請求：每隔一段時間，某隻烏龜會想要你幫牠做某件事。
// 畫面右下角會出現一排直排的圓形按鈕（烏龜頭像＋右上角一個小圖示），
// 點下去打開遊戲內視窗，烏龜在中間，玩家用旁邊的工具跟牠互動。
//
// 已完成：刷屁屁、擦背甲藻斑、摸下巴、拍照。其他的規劃在 docs/interactions.md。
// 請求只存在記憶體裡（不寫進存檔），重新整理就會清掉，不影響存檔版號。
import { renderTurtle, pickPose, withView } from './poses.js';

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);

const SPAWN_MIN = 45;        // 兩次請求之間最少幾秒（現實時間，網頁看得到時才算）
const SPAWN_MAX = 100;
const LIFETIME = 180;        // 沒理牠的話，幾秒後請求消失
const MAX_ACTIVE = 3;        // 右下角最多同時幾個
const TURTLE_COOLDOWN = 240; // 同一隻烏龜兩次請求之間至少幾秒

const awake = (t, agent) => !t.flipped && agent?.t.mode !== 'sleep';

// 各種請求。can() 決定這隻烏龜現在適不適合提出；reward 是完成後加的數值。
export const REQUEST_TYPES = {
  brush: {
    icon: '🪥',
    label: n => `${n} 想刷屁屁`,
    title: n => `幫${n}刷屁屁`,
    hint: '拿右邊的刷子，在牠的屁股上來回刷',
    done: n => `${n} 被刷屁屁刷得好舒服，心情變好了！`,
    reward: { mood: 10 },
    can: awake,
    game: () => BrushGame,
  },
  scrub: {
    icon: '🧽',
    label: n => `${n} 的背甲長藻了`,
    title: n => `幫${n}擦背甲`,
    hint: '背甲上長了綠色的藻，用海綿把每一塊擦掉',
    done: n => `${n} 的背甲擦乾淨了，看起來清爽多了。`,
    reward: { health: 4, mood: 4 },
    // 水質差或曬不夠太陽時，背甲比較容易長藻
    can: (t, agent, s) => awake(t, agent) && (s.tank.water < 70 || t.stats.sun < 50),
    game: () => ScrubGame,
  },
  chin: {
    icon: '☝️',
    label: n => `${n} 想被摸下巴`,
    title: n => `摸摸${n}的下巴`,
    hint: '用手指在牠的下巴下面「慢慢」來回摸，太快牠會嚇到',
    done: n => `${n} 被摸下巴摸得瞇起眼睛，好舒服。`,
    reward: { mood: 8 },
    can: (t, agent) => awake(t, agent) && t.stats.mood >= 45,
    game: () => ChinGame,
  },
  photo: {
    icon: '📷',
    label: n => `${n} 想拍照`,
    title: n => `幫${n}拍照`,
    hint: '牠會轉來轉去，等牠「看向鏡頭」的那一刻按快門',
    done: n => `幫 ${n} 拍了一張照片！`,
    reward: { mood: 4 },
    can: (t, agent) => awake(t, agent) && t.stats.mood >= 35,
    game: () => PhotoGame,
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
    this.modal = new CareModal();
    this.games = {};
    for (const [type, def] of Object.entries(REQUEST_TYPES)) {
      const Game = def.game();
      this.games[type] = new Game(this.modal, opts, (turtleId, t) => this.finish(turtleId, t));
    }
    setInterval(() => this.tick(), 1000);
  }

  // 目前打開的小遊戲（除錯用）
  get game() {
    return this.modal.current;
  }

  tick() {
    if (document.hidden) return;
    const t = now();
    const before = this.list.length;
    this.list = this.list.filter(r => r.expires > t || this.modal.openFor === r.id);
    if (t >= this.nextAt) {
      this.spawn();
      this.nextAt = t + rand(SPAWN_MIN, SPAWN_MAX);
    }
    if (this.list.length !== before) this.render();
  }

  // 挑一隻目前沒有請求、也不在冷卻中的烏龜，給牠一個適合的請求。
  // forceType：除錯用，指定種類並略過條件檢查。
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
        if (forceType ? type === forceType : def.can(t, agent, state)) pairs.push([t, type]);
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
      btn.addEventListener('click', () => this.games[r.type].open(r, t));
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
// 小遊戲視窗：四種互動共用同一個視窗，每次打開時換上對應的小遊戲
// ---------------------------------------------------------------------------

const STAGE = 300;        // 畫布的座標尺寸（CSS 上會依螢幕縮放）
const SHELL = 150;        // 小遊戲裡烏龜背甲的大小
const CX = STAGE / 2;     // 烏龜背甲中心在畫布上的位置
const CY = STAGE / 2 + 10;

class CareModal {
  constructor() {
    this.el = $('careModal');
    this.canvas = $('careCanvas');
    this.tool = $('careTool');
    this.bar = $('careBar');
    this.hint = $('careHint');
    this.shutter = $('careShutter');
    this.save = $('careSave');
    this.stage = this.canvas.parentElement;
    this.current = null;
    this.openFor = null;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = STAGE * dpr;
    this.canvas.height = STAGE * dpr;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(dpr, dpr);

    for (const el of this.el.querySelectorAll('[data-care-close]')) {
      el.addEventListener('click', () => this.close());
    }
    this.el.addEventListener('click', e => { if (e.target === this.el) this.close(); });

    // 拖曳工具：在舞台任何地方按住就把工具拿到手指下面（工具本身也在舞台裡）
    let last = null;
    this.stage.addEventListener('pointerdown', e => {
      if (!this.current?.usesTool) return;
      e.preventDefault();
      this.dragging = true;
      last = this.point(e);
      try { this.stage.setPointerCapture(e.pointerId); } catch { /* 沒有實體指標時抓不到，沒關係 */ }
      this.current.drag(last, null);
    });
    this.stage.addEventListener('pointermove', e => {
      if (!this.dragging || !this.current) return;
      const p = this.point(e);
      this.current.drag(p, last);
      last = p;
    });
    const stop = () => {
      this.dragging = false;
      last = null;
    };
    this.stage.addEventListener('pointerup', stop);
    this.stage.addEventListener('pointercancel', stop);
    this.shutter.addEventListener('click', () => this.current?.shoot?.());
  }

  // 事件座標 → 300×300 畫布座標
  point(e) {
    const r = this.stage.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (STAGE / r.width),
      y: (e.clientY - r.top) * (STAGE / r.height),
      t: performance.now(),
    };
  }

  open(game, req, turtle) {
    this.current = game;
    this.openFor = req.id;
    const def = REQUEST_TYPES[req.type];
    $('careTitle').textContent = def.title(turtle.name);
    this.setHint(def.hint);
    this.setProgress(0);
    this.tool.textContent = game.toolIcon || '';
    this.tool.hidden = !game.usesTool;
    this.shutter.hidden = !game.shoot;
    this.save.hidden = true;
    this.el.hidden = false;
    this.placeTool(STAGE - 38, STAGE / 2); // 視窗顯示後舞台才有尺寸
    const loop = () => {
      if (this.el.hidden || this.current !== game) return;
      game.draw(this.ctx);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  close() {
    const game = this.current;
    this.el.hidden = true;
    this.openFor = null;
    this.dragging = false;
    this.current = null;
    game?.closed?.();
  }

  setHint(text) {
    this.hint.textContent = text;
  }

  setProgress(k) {
    this.bar.style.width = `${Math.round(Math.max(0, Math.min(1, k)) * 100)}%`;
  }

  // x, y 是畫布座標；舞台在手機上會縮小，要換算成實際的 CSS 像素
  placeTool(x, y) {
    const k = (this.stage.clientWidth || STAGE) / STAGE;
    this.tool.style.transform = `translate(${x * k - 22}px, ${y * k - 22}px)`;
  }
}

// 各小遊戲的共同部分：畫烏龜、泡泡、完成時的愛心
class CareGame {
  constructor(modal, opts, onDone) {
    this.modal = modal;
    this.opts = opts;
    this.onDone = onDone;
  }

  get usesTool() {
    return true;
  }

  open(req, turtle) {
    this.req = req;
    this.turtle = turtle;
    this.poses = this.opts.getPoses(turtle.species);
    this.palette = this.opts.getPalette(turtle.species);
    this.done = false;
    this.doneAt = 0;
    this.bubbles = [];
    this.t0 = performance.now();
    this.setup();
    this.modal.open(this, req, turtle);
  }

  setup() {}

  // 完成：給獎勵；autoClose 時愛心飄一下就自動關視窗
  succeed(autoClose = true) {
    if (this.done) return;
    this.done = true;
    this.doneAt = performance.now();
    this.modal.dragging = false;
    this.modal.setProgress(1);
    this.onDone(this.turtle.id, this.req.type);
    if (autoClose) {
      setTimeout(() => { if (this.modal.current === this) this.modal.close(); }, 1400);
    }
  }

  time() {
    return (performance.now() - this.t0) / 1000;
  }

  drawTurtle(ctx, spec) {
    // 地面的影子
    ctx.fillStyle = 'rgba(60, 50, 20, .12)';
    ctx.beginPath();
    ctx.ellipse(CX, CY + SHELL * 0.45, SHELL * 0.62, SHELL * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    const key = poseFor(this.poses, spec, this.time());
    this.key = key;
    ctx.save();
    ctx.translate(CX, CY);
    renderTurtle(ctx, this.poses, key, SHELL, this.time(), 1, this.palette);
    ctx.restore();
    return key;
  }

  addBubble(x, y) {
    if (Math.random() < 0.5) this.bubbles.push({ x: x + rand(-8, 8), y: y + rand(-6, 6), r: rand(3, 7), born: performance.now() });
  }

  drawEffects(ctx) {
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

    if (this.done) {
      const k = Math.min(1, (nowMs - this.doneAt) / 1200);
      ctx.globalAlpha = 1 - k * 0.6;
      ctx.font = '28px serif';
      ctx.textAlign = 'center';
      ctx.fillText('💕', CX, CY - SHELL * 0.62 - k * 30);
      ctx.globalAlpha = 1;
    }
  }
}

// ---------------- 刷屁屁 ----------------

const BRUSH_NEED = 1400;  // 在屁股上總共要刷多少距離才算完成

class BrushGame extends CareGame {
  toolIcon = '🪥';

  setup() {
    this.view = backView(this.poses);
    this.progress = 0;
    this.brushing = 0;
  }

  drag(p, last) {
    if (this.done) return;
    this.modal.placeTool(p.x, p.y);
    // 刷毛在刷子圖示的左下角
    const bx = p.x - 12;
    const by = p.y + 10;
    if (last && this.inRear(bx, by)) {
      const d = Math.hypot(p.x - last.x, p.y - last.y);
      if (d > 0.5 && d < 80) {
        this.progress = Math.min(1, this.progress + d / BRUSH_NEED);
        this.brushing = performance.now();
        this.addBubble(bx, by);
        this.modal.setProgress(this.progress);
        if (this.progress >= 1) this.succeed();
      }
    }
  }

  // 屁股：背面圖是輪廓下半部（尾巴朝鏡頭）；只有側面圖（面向右）時是輪廓左半部
  inRear(x, y) {
    const box = analyze(this.poses, this.key)?.box || { x0: -0.6, y0: -0.5, x1: 0.6, y1: 0.5 };
    const L = CX + box.x0 * SHELL, R = CX + box.x1 * SHELL;
    const T = CY + box.y0 * SHELL, B = CY + box.y1 * SHELL;
    const w = R - L, h = B - T;
    const [hx, hy, rx, ry] = this.view.back
      ? [L + w * 0.5, T + h * 0.7, w * 0.45, h * 0.38]
      : [L + w * 0.25, T + h * 0.55, w * 0.3, h * 0.45];
    return ((x - hx) / rx) ** 2 + ((y - hy) / ry) ** 2 <= 1;
  }

  draw(ctx) {
    ctx.clearRect(0, 0, STAGE, STAGE);
    // 被刷的時候（或刷完）搖屁屁，其他時候站著
    const happy = this.done || performance.now() - this.brushing < 400;
    this.drawTurtle(ctx, happy ? this.view.happy : this.view.idle);
    this.drawEffects(ctx);
  }
}

// ---------------- 擦背甲藻斑 ----------------

const SPOTS = 6;

class ScrubGame extends CareGame {
  toolIcon = '🧽';

  setup() {
    this.view = backView(this.poses);
    // 藻斑要長在背甲上：從圖上挑深色（背甲）的點；沒有姿勢圖的品種就在背甲範圍內隨機放
    const key = poseFor(this.poses, this.view.idle, 0);
    const shellPts = analyze(this.poses, key)?.shell || [];
    this.spots = [];
    for (let i = 0; i < SPOTS; i++) {
      let u = 0, v = 0;
      for (let tries = 0; tries < 40; tries++) {
        [u, v] = shellPts.length
          ? shellPts[Math.floor(Math.random() * shellPts.length)]
          : [rand(-0.3, 0.3), rand(-0.3, 0.15)];
        // 彼此不要疊在一起
        if (this.spots.every(s => Math.hypot(s.u - u, s.v - v) > 0.16)) break;
      }
      this.spots.push({
        u, v,
        r: rand(0.06, 0.09),
        dirt: 1,
        // 每塊藻斑由幾個小圓組成，看起來比較自然
        blobs: Array.from({ length: 4 }, () => [rand(-0.6, 0.6), rand(-0.6, 0.6), rand(0.5, 0.9)]),
      });
    }
  }

  drag(p, last) {
    if (this.done) return;
    this.modal.placeTool(p.x, p.y);
    if (!last) return;
    const d = Math.hypot(p.x - last.x, p.y - last.y);
    if (d < 0.5 || d > 80) return;
    for (const s of this.spots) {
      const sx = CX + s.u * SHELL, sy = CY + s.v * SHELL;
      if (s.dirt > 0 && Math.hypot(p.x - sx, p.y - sy) < s.r * SHELL + 16) {
        s.dirt = Math.max(0, s.dirt - d / 170);
        this.addBubble(p.x, p.y);
      }
    }
    const left = this.spots.reduce((a, s) => a + s.dirt, 0) / this.spots.length;
    this.modal.setProgress(1 - left);
    if (this.spots.every(s => s.dirt <= 0.02)) this.succeed();
  }

  draw(ctx) {
    ctx.clearRect(0, 0, STAGE, STAGE);
    this.drawTurtle(ctx, this.done ? this.view.happy : this.view.idle);
    for (const s of this.spots) {
      if (s.dirt <= 0.02) continue;
      const sx = CX + s.u * SHELL, sy = CY + s.v * SHELL;
      ctx.fillStyle = `rgba(92, 128, 48, ${0.85 * s.dirt})`;
      for (const [bx, by, br] of s.blobs) {
        ctx.beginPath();
        ctx.arc(sx + bx * s.r * SHELL, sy + by * s.r * SHELL, br * s.r * SHELL, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    this.drawEffects(ctx);
  }
}

// ---------------- 摸下巴 ----------------

const CHIN_NEED = 900;     // 慢慢摸的總距離
const CHIN_SLOW = 320;     // 每秒移動少於這個才算「慢慢摸」（畫布座標 px/s）
const CHIN_FAST = 650;     // 超過這個就太快了，會嚇到

class ChinGame extends CareGame {
  toolIcon = '☝️';

  setup() {
    // 正面（臉朝你）；沒有正面圖的品種用側面
    this.view = frontView(this.poses);
    this.progress = 0;
    this.speed = 0;
    this.petting = 0;
    this.scaredUntil = 0;
    this.win = { d: 0, t: 0 };
    this.chin = this.findChin();
  }

  // 下巴：頭（黃綠色皮膚的中心）再往下一點
  findChin() {
    const key = poseFor(this.poses, this.view.idle, 0);
    const head = analyze(this.poses, key)?.head;
    if (!head) return this.view.front ? { u: 0, v: 0.12 } : { u: 0.55, v: 0.05 };
    return { u: head.u, v: head.v + (this.view.front ? 0.12 : 0.08) };
  }

  drag(p, last) {
    if (this.done) return;
    this.modal.placeTool(p.x, p.y);
    if (!last) {
      this.win = { d: 0, t: p.t };
      return;
    }
    if (performance.now() < this.scaredUntil) return;
    const d = Math.hypot(p.x - last.x, p.y - last.y);
    // 速度用一小段時間（至少 60ms）的平均：觸控事件常常擠在一起送來，
    // 只看相鄰兩個事件會算出假的超高速
    this.win.d += d;
    const span = p.t - this.win.t;
    if (span >= 60) {
      const v = this.win.d / (span / 1000);
      this.speed = this.speed ? this.speed * 0.5 + v * 0.5 : v;
      this.win = { d: 0, t: p.t };
    }

    // 指尖在手指圖示的上方
    const fx = p.x, fy = p.y - 16;
    const cx = CX + this.chin.u * SHELL, cy = CY + this.chin.v * SHELL;
    if (Math.hypot(fx - cx, fy - cy) > SHELL * 0.18) return;

    if (this.speed > CHIN_FAST) {
      // 太快：縮頭，進度倒退一點
      this.scaredUntil = performance.now() + 1200;
      this.progress = Math.max(0, this.progress - 0.15);
      this.modal.setProgress(this.progress);
      this.modal.setHint('太快了！牠嚇得縮起頭，等一下再慢慢摸');
      this.modal.dragging = false;
      this.speed = 0;
      this.win = { d: 0, t: p.t };
      return;
    }
    if (this.speed <= CHIN_SLOW) {
      this.progress = Math.min(1, this.progress + d / CHIN_NEED);
      this.petting = performance.now();
      this.modal.setProgress(this.progress);
      this.modal.setHint('對，就是這樣，慢慢來…');
      if (this.progress >= 1) this.succeed();
    } else {
      this.modal.setHint('再慢一點…');
    }
  }

  draw(ctx) {
    ctx.clearRect(0, 0, STAGE, STAGE);
    const scared = performance.now() < this.scaredUntil;
    const enjoying = this.done || performance.now() - this.petting < 500;
    this.drawTurtle(ctx, scared ? this.view.scared : enjoying ? this.view.enjoy : this.view.idle);

    // 一開始提示下巴的位置，摸到一點之後就不顯示了
    if (this.progress < 0.15 && !scared) {
      const cx = CX + this.chin.u * SHELL, cy = CY + this.chin.v * SHELL;
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = `rgba(79, 122, 74, ${0.5 + 0.3 * Math.sin(this.time() * 4)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, SHELL * 0.14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    this.drawEffects(ctx);
  }
}

// ---------------- 拍照 ----------------

class PhotoGame extends CareGame {
  get usesTool() {
    return false;
  }

  setup() {
    // 會輪流出現的方向；只有「看向鏡頭」（正面）時拍才算成功
    this.views = photoViews(this.poses);
    this.target = this.views.includes('F') ? 'F' : 'R';
    this.viewIdx = Math.floor(Math.random() * this.views.length);
    this.nextTurn = performance.now() + rand(900, 1500);
    this.flashAt = 0;
    this.photo = null;
    this.tries = 0;
  }

  get view() {
    return this.views[this.viewIdx];
  }

  shoot() {
    if (this.done) return;
    this.flashAt = performance.now();
    this.tries += 1;
    if (this.view !== this.target) {
      this.modal.setHint(this.tries >= 3 ? '別急，等牠轉過來看你的時候再按' : '牠沒有看鏡頭，再試一次');
      return;
    }
    this.photo = this.takePhoto();
    this.modal.setHint('拍到了！可以存到手機或電腦裡');
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    this.modal.save.href = this.photo;
    this.modal.save.download = `${this.turtle.name}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.png`;
    this.modal.save.hidden = false;
    this.modal.shutter.hidden = true;
    this.succeed(false); // 拍到就給獎勵，但留著視窗讓玩家存照片
  }

  // 另外畫一張乾淨的大圖當照片（沒有取景框、有名字和日期）
  takePhoto() {
    const size = 600;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size + 70;
    const g = c.getContext('2d');
    g.fillStyle = '#fffdf8';
    g.fillRect(0, 0, c.width, c.height);
    const grad = g.createRadialGradient(size / 2, size * 0.6, 20, size / 2, size * 0.6, size * 0.7);
    grad.addColorStop(0, '#eaf2e4');
    grad.addColorStop(1, '#cfe0c6');
    g.fillStyle = grad;
    g.fillRect(20, 20, size - 40, size - 40);
    g.save();
    g.translate(size / 2, size / 2 + 20);
    renderTurtle(g, this.poses, this.key, SHELL * 2, this.time(), 1, this.palette);
    g.restore();
    const d = new Date();
    g.fillStyle = '#33301f';
    g.font = '28px sans-serif';
    g.textAlign = 'center';
    g.fillText(`${this.turtle.name}　${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}　背甲 ${this.turtle.length.toFixed(1)} 公分`,
      size / 2, size + 40);
    return c.toDataURL('image/png');
  }

  draw(ctx) {
    ctx.clearRect(0, 0, STAGE, STAGE);
    const nowMs = performance.now();

    // 拍到之前會一直轉來轉去；看鏡頭的時間短一點，要抓時機
    if (!this.done && nowMs > this.nextTurn) {
      let next;
      do next = Math.floor(Math.random() * this.views.length);
      while (this.views.length > 1 && next === this.viewIdx);
      this.viewIdx = next;
      this.nextTurn = nowMs + (this.view === this.target ? rand(700, 1100) : rand(900, 1700));
    }
    // 拍到之後維持拍照那一刻的姿勢（愛心代表開心），不要換動作
    this.drawTurtle(ctx, { key: 'look', view: this.view });

    // 取景框
    ctx.strokeStyle = 'rgba(51, 48, 31, .55)';
    ctx.lineWidth = 3;
    const m = 24, L = 30;
    for (const [x, y, sx, sy] of [[m, m, 1, 1], [STAGE - m, m, -1, 1], [m, STAGE - m, 1, -1], [STAGE - m, STAGE - m, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * L);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * L, y);
      ctx.stroke();
    }

    // 閃光
    const k = (nowMs - this.flashAt) / 350;
    if (k < 1) {
      ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - k)})`;
      ctx.fillRect(0, 0, STAGE, STAGE);
    }
    this.drawEffects(ctx);
  }

  closed() {
    this.modal.save.hidden = true;
  }
}

// ---------------------------------------------------------------------------
// 姿勢挑選與圖片分析
// ---------------------------------------------------------------------------

// 背面（看得到屁股和背甲）；沒有背面圖的品種用側面
function backView(poses) {
  if (poses?.has('happy_B_1')) {
    // 站著時用搖屁屁的第 1 幀，動起來才播放：角度一致，不會跳
    return { back: true, idle: { key: 'happy', view: 'B' }, happy: { key: 'happy', view: 'B', loop: true } };
  }
  if (poses) {
    for (const idle of ['rest', 'bask', 'walk', 'walk_b', 'walk_a', 'turn', 'hide']) {
      if (poses.has(`${idle}_B_1`)) {
        return { back: true, idle: { key: idle, view: 'B' }, happy: { key: idle, view: 'B', loop: true } };
      }
    }
  }
  return { back: false, idle: { key: 'walk', view: 'R' }, happy: { key: 'happy', view: 'R', loop: true } };
}

// 正面（臉朝你）：站著用 look 第 1 幀，被摸得舒服時慢慢播放 look（伸長脖子），嚇到時縮頭
function frontView(poses) {
  const has = k => poses?.has(`${k}_F_1`);
  if (has('look') || has('walk') || has('walk_a')) {
    const base = has('look') ? 'look' : has('walk') ? 'walk' : 'walk_a';
    return {
      front: true,
      idle: { key: base, view: 'F' },
      enjoy: { key: base, view: 'F', loop: true, fps: 3 },
      scared: { key: has('hide') ? 'hide' : base, view: 'F' },
    };
  }
  return {
    front: false,
    idle: { key: 'look', view: 'R' },
    enjoy: { key: 'look', view: 'R', loop: true, fps: 3 },
    scared: { key: 'hide', view: 'R' },
  };
}

// 拍照時會輪流出現的方向
function photoViews(poses) {
  const views = ['R', 'L'];
  if (poses?.has('look_F_1') || poses?.has('walk_F_1') || poses?.has('walk_a_F_1')) views.push('F');
  if (poses?.has('look_B_1') || poses?.has('walk_B_1') || poses?.has('walk_b_B_1')) views.push('B');
  return views;
}

function poseFor(poses, spec, t) {
  if (!poses) return spec.key;
  const anim = spec.loop ? t : 0;
  const dir = spec.view === 'L' ? 'L' : 'R';
  const k = pickPose(poses, spec.key, dir, anim, spec.fps || 7)
    || pickPose(poses, 'walk', dir, anim) || pickPose(poses, 'walk_a', dir, anim);
  if (spec.view === 'F' || spec.view === 'B') {
    const v = withView(poses, k, spec.view);
    if (v !== k) return v;
    // 這個動作沒有該視角：改用有該視角的走路圖
    for (const alt of ['walk', 'walk_a', 'walk_b']) {
      const a = pickPose(poses, alt, 'R', 0);
      const w = a && withView(poses, a, spec.view);
      if (w && w !== a) return w;
    }
  }
  return k;
}

// 分析一張姿勢圖：輪廓範圍、頭（皮膚）的位置、背甲上的點。
// 座標以背甲中心為原點、背甲寬為單位（跟 renderTurtle 一致）。
const analysisCache = new WeakMap();
function analyze(poses, key) {
  const img = poses?.images?.[key];
  if (!img) return null;
  if (analysisCache.has(img)) return analysisCache.get(img);

  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, c.width, c.height).data;
  const [ax, ay] = poses.meta.anchor;
  const sw = poses.meta.shellWidth;

  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  let hx = 0, hy = 0, hn = 0;
  const shell = [];
  for (let y = 0; y < c.height; y += 2) {
    for (let x = 0; x < c.width; x += 2) {
      const i = (y * c.width + x) * 4;
      if (px[i + 3] < 200) continue;
      const r = px[i], gr = px[i + 1], b = px[i + 2];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      const u = (x - ax) / sw, v = (y - ay) / sw;
      // 頭：黃綠色皮膚（藍色要明顯比綠色低，跟奶油色的腹甲分開），只看中間那一條，避開四肢
      if (gr > 120 && gr > b + 40 && gr >= r * 0.9 && Math.abs(u) < 0.22) {
        hx += u;
        hy += v;
        hn += 1;
      }
      // 背甲：深色、而且在背甲中心附近
      const lum = 0.299 * r + 0.587 * gr + 0.114 * b;
      if (lum < 105 && u * u / 0.16 + v * v / 0.1 < 1 && x % 6 === 0 && y % 6 === 0) shell.push([u, v]);
    }
  }
  const result = x1 > x0 ? {
    box: { x0: (x0 - ax) / sw, y0: (y0 - ay) / sw, x1: (x1 - ax) / sw, y1: (y1 - ay) / sw },
    head: hn > 20 ? { u: hx / hn, v: hy / hn } : null,
    shell,
  } : null;
  analysisCache.set(img, result);
  return result;
}
