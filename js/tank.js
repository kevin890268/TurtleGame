// 烏龜缸：烏龜的行為（游泳、在淺灘走路、上岸曬背、吃東西）與 2D 畫面。
// 所有座標都是 1000×600 的邏輯座標；2.5D 版（tank3d.js）繼承這個類別，只換掉繪圖。
import { CONFIG } from './config.js';
import { isNight } from './sim.js';
import { W, H, WATER_TOP, ZONES, LAMP_X, AIR_STONE_X, SHORE_X, groundY, groundSlope, swimLimitX, sampleGround } from './terrain.js';
import { choosePose, poseMotion, renderTurtle, trackPoseChange } from './poses.js';
import { drawHeart } from './turtle-shape.js';

const rand = (a, b) => a + Math.random() * (b - a);

// 食物的浮沉：密度小於 1 會浮在水面，泡水後密度慢慢變大（d0 → d1，花 soak 秒），超過 1 就開始下沉。
// k 決定下沉速度，sway 是下沉時左右飄的程度（菜葉像落葉一樣飄）。
export const FOOD_PHYSICS = {
  pellet: { d0: 0.85, d1: 1.15, soak: 30, k: 60, sway: 0.4 },
  shrimp: { d0: 0.95, d1: 1.3, soak: 12, k: 60, sway: 0.8 },
  veggie: { d0: 0.9, d1: 1.05, soak: 40, k: 80, sway: 3 },
};
const MAX_FOOD = 40;

const REACTIONS = {
  happy: { key: 'happy', dur: 1.6 },
  annoyed: { key: 'hide', dur: 2.2 },
  startled: { key: 'startled', dur: 1.3 },
  eat: { key: 'nibble', dur: 0.6 },
};

export class Tank {
  constructor(canvas, getState, assets, hooks) {
    this.c = canvas;
    this.ctx = null; // 2D 版在第一次繪圖時才取得，讓 2.5D 版可以改用 WebGL
    this.getState = getState;
    this.assets = assets;
    this.poses = assets.poses || null;
    this.hooks = hooks;
    this.time = 0;
    this.food = [];
    this.bubbles = [];
    this.hearts = [];
    this.ripples = [];
    this.tool = null; // 目前選中的食物（投餵模式）
    this.bubbleClock = 0;
    this.lastNight = null;

    this.motes = Array.from({ length: 60 }, () => {
      const x = rand(0, 820);
      return { x, y: rand(WATER_TOP + 5, groundY(x) - 5), r: rand(1, 2.5), p: rand(0, 6.28) };
    });
    this.gravel = Array.from({ length: 320 }, () => {
      const x = rand(0, 850);
      return { x, y: groundY(x) + rand(3, 45), r: rand(3, 7), c: Math.floor(rand(0, 4)) };
    }).filter(g => g.y < H);
    // 深水區的沉水植物，和淺水區長出水面的挺水植物
    this.plants = [
      { x: 30, h: 220 }, { x: 120, h: 170 }, { x: 160, h: 240 }, { x: 330, h: 150 }, { x: 395, h: 200 },
      { x: 690, h: 190, emergent: true }, { x: 745, h: 230, emergent: true },
    ].map(p => ({ ...p, p: rand(0, 6.28) }));

    this.t = {
      x: 250, y: 400, face: 1, tilt: 0, mode: 'swim', path: [], grounded: false,
      timer: 0, anim: 0, vy: 0, ignoreFoodUntil: 0,
      flash: null, idleKey: null, idleUntil: 0, idleNext: 3,
      pose: 'swim', prevPose: null, poseAt: 0,
    };

    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
    canvas.addEventListener('pointerdown', e => this.onPointer(e));
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = this.c.getBoundingClientRect();
    this.c.width = Math.max(1, Math.round(r.width * dpr));
    this.c.height = Math.max(1, Math.round(r.height * dpr));
  }

  // w：烏龜全長；shell：背甲寬；foot：站立時背甲中心離地面多高
  size() {
    const w = 30 + this.getState().turtle.length * 8;
    const h = w * 0.5;
    const shell = w * 0.9;
    const foot = this.poses ? this.poses.stdBottom * shell : h * 0.42;
    return { w, h, shell, foot };
  }

  onPointer(e) {
    const r = this.c.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * W;
    const y = (e.clientY - r.top) / r.height * H;
    if (this.tool) {
      if (this.dropFoodAt(this.tool, x)) this.hooks.onDrop(this.tool);
      return;
    }
    const { w } = this.size();
    if (Math.hypot(x - this.t.x, y - this.t.y) < w * 0.7) this.hooks.onPoke();
  }

  // 選擇食物進入投餵模式；null 取消
  setTool(type) {
    this.tool = type;
    this.c.style.cursor = type ? 'crosshair' : '';
  }

  // 對玩家動作的反應：換一個表情姿勢一小段時間
  react(kind) {
    const r = REACTIONS[kind];
    if (!r) return;
    this.t.flash = { key: r.key, until: this.time + r.dur, dur: r.dur };
    if (kind === 'happy') this.showHearts();
  }

  showHearts(n = 3) {
    const { h } = this.size();
    for (let i = 0; i < n; i++) {
      this.hearts.push({ x: this.t.x + rand(-20, 20), y: this.t.y - h * 0.8, life: 1.6 + i * 0.25, vx: rand(-10, 10) });
    }
  }

  // 在 x（和 2.5D 的深度 z）的正上方掉一顆食物
  dropFoodAt(type, x, z = rand(-12, 12)) {
    if (this.food.length >= MAX_FOOD) return false;
    this.food.push({
      type, x: Math.max(20, Math.min(SHORE_X - 15, x)), z, y: WATER_TOP - rand(50, 70),
      vy: 0, age: 0, wet: 0, inWater: false, floating: false, seed: rand(0, 6.28), spin: rand(-1.5, 1.5),
    });
    return true;
  }

  dropFood(type, pieces) {
    for (let i = 0; i < pieces; i++) this.dropFoodAt(type, rand(120, SHORE_X - 40));
  }

  // ---------- 更新 ----------

  update(dt) {
    this.time += dt;
    const s = this.getState();
    const night = isNight(s);

    this.updateFood(dt);
    this.updateBubbles(dt);
    this.hearts = this.hearts.filter(p => (p.life -= dt) > 0);
    for (const p of this.hearts) { p.y -= 35 * dt; p.x += p.vx * dt; }

    if (night !== this.lastNight) {
      this.lastNight = night;
      this.t.timer = 0;
    }
    this.updateTurtle(dt, s, night);
  }

  updateFood(dt) {
    for (const f of this.food) {
      f.age += dt;
      if (!f.inWater) {
        // 空中自由落下
        f.vy += 700 * dt;
        f.y += f.vy * dt;
        if (f.y >= WATER_TOP) {
          f.inWater = true;
          f.vy *= 0.15; // 落水的衝力讓它先沒入水面一點
          this.ripples.push({ x: f.x, z: f.z, age: 0 });
        }
        continue;
      }

      const P = FOOD_PHYSICS[f.type];
      f.wet += dt;
      const density = P.d0 + (P.d1 - P.d0) * Math.min(1, f.wet / P.soak);
      const floor = groundY(f.x) - 3;

      if (density < 1 && f.y <= WATER_TOP + 2) {
        // 浮在水面，隨水流慢慢漂
        f.floating = true;
        f.vy = 0;
        f.y += (WATER_TOP + 1 - f.y) * Math.min(1, dt * 4);
        f.x += Math.sin(this.time * 0.7 + f.seed) * 6 * dt;
      } else {
        // 密度 > 1 往下沉（越吸水沉越快）；還 < 1 的話會慢慢浮回水面
        f.floating = false;
        const terminal = P.k * (density - 1);
        f.vy += (terminal - f.vy) * Math.min(1, dt * 1.5);
        f.y = Math.max(WATER_TOP + 1, f.y + f.vy * dt);
        if (f.y < floor) f.x += Math.sin(this.time * 1.3 + f.seed) * P.sway * 6 * dt;
        if (f.y >= floor) {
          f.y = floor;
          f.vy = 0;
        }
      }
      f.x = Math.max(5, Math.min(SHORE_X - 5, f.x));
    }

    this.ripples = this.ripples.filter(r => (r.age += dt) < 1.5);

    const rotten = this.food.filter(f => f.age > CONFIG.foodRotSeconds);
    if (rotten.length) {
      this.food = this.food.filter(f => f.age <= CONFIG.foodRotSeconds);
      this.hooks.onRot(rotten.length);
    }
  }

  updateBubbles(dt) {
    this.bubbleClock -= dt;
    if (this.bubbleClock <= 0) {
      this.bubbleClock = rand(0.08, 0.3);
      this.bubbles.push({ x: AIR_STONE_X + rand(-4, 4), y: groundY(AIR_STONE_X) - 10, r: rand(2, 5), p: rand(0, 6.28) });
    }
    for (const b of this.bubbles) {
      b.y -= (50 + b.r * 12) * dt;
      b.x += Math.sin(this.time * 3 + b.p) * 12 * dt;
    }
    this.bubbles = this.bubbles.filter(b => b.y > WATER_TOP);
  }

  updateTurtle(dt, s, night) {
    const t = this.t;
    const { w, h, foot } = this.size();
    this.swimLimit = swimLimitX(h);
    t.anim += dt;
    t.timer -= dt;

    const foodInWater = this.food.filter(f => f.inWater);
    const hungry = s.stats.hunger < 98 && !night && this.time > t.ignoreFoodUntil;

    if (hungry && foodInWater.length && t.mode !== 'food') {
      t.mode = 'food';
      t.path = [];
    }

    if (t.mode === 'food') {
      if (!hungry || !foodInWater.length) {
        t.mode = 'swim';
        t.timer = 0;
        t.path = [];
      } else {
        this.chaseFood(foodInWater, w, h, foot);
      }
    }

    if (t.mode !== 'food' && !t.path.length && t.timer <= 0) this.decide(s, night, h, foot);

    this.move(dt, h, foot);
  }

  chaseFood(foods, w, h, foot) {
    const t = this.t;
    const target = nearest(foods, t.x, t.y);
    const side = target.x > t.x ? 1 : -1;
    const tx = Math.max(20, target.x - side * w * 0.45);
    const onBottom = target.y >= groundY(target.x) - 6;
    if (target.x > this.swimLimit - 10 || (onBottom && t.grounded)) {
      this.planPath({ x: tx, ground: true }, foot);
    } else {
      const ty = Math.max(WATER_TOP + h * 0.3, Math.min(groundY(tx) - foot, target.y + h * 0.1));
      this.planPath({ x: tx, y: ty, ground: false }, foot);
    }

    const headX = t.x + t.face * w * 0.5;
    if (Math.abs(headX - target.x) < 14 + w * 0.12 && Math.abs(t.y - target.y) < foot + 18) {
      this.food.splice(this.food.indexOf(target), 1);
      if (this.hooks.onEat(target.type)) {
        this.react('eat');
      } else {
        this.food.push(target); // 吃飽了，食物留在水裡
        t.ignoreFoodUntil = this.time + 30;
        t.mode = 'swim';
        t.timer = 0;
        t.path = [];
      }
    }
  }

  decide(s, night, h, foot) {
    const t = this.t;
    const r = Math.random();
    if (night) {
      // 晚上睡在深水區的底部，或淺灘上
      t.mode = 'sleep';
      const x = r < 0.5 ? rand(ZONES.deep[0] + 30, ZONES.deep[1] - 40) : rand(...ZONES.shallow);
      this.planPath({ x, ground: true }, foot);
      t.timer = rand(400, 800);
    } else if (s.lamp.on && s.stats.sun < 95 && r < 0.5) {
      t.mode = 'bask';
      this.planPath({ x: rand(ZONES.bask[0] + 10, ZONES.bask[1] - 10), ground: true }, foot);
      t.timer = rand(25, 55);
    } else if (r < 0.72) {
      t.mode = 'shallow';
      this.planPath({ x: rand(...ZONES.shallow), ground: true }, foot);
      t.timer = rand(8, 20);
    } else {
      t.mode = 'swim';
      const x = rand(30, Math.max(60, this.swimLimit - 20));
      const y = rand(WATER_TOP + h * 0.4, Math.max(WATER_TOP + h * 0.5, groundY(x) - foot - 5));
      this.planPath({ x, y, ground: false }, foot);
      t.timer = rand(2, 6);
    }
  }

  // 規劃路線：游不起來的淺灘和岸上要用走的，游泳區可以直線游過去
  planPath(dest, foot) {
    const t = this.t;
    const sm = this.swimLimit;
    const gy = x => groundY(x) - foot;
    const path = [];
    if (t.grounded && dest.ground) {
      path.push({ x: dest.x, walk: true });
    } else if (t.grounded && t.x > sm) {
      path.push({ x: sm - 5, walk: true }, { x: dest.x, y: dest.y });
    } else if (dest.ground && dest.x > sm) {
      path.push({ x: sm - 5, y: gy(sm - 5), settle: true }, { x: dest.x, walk: true });
    } else {
      path.push({ x: dest.x, y: dest.ground ? gy(dest.x) : dest.y, settle: dest.ground });
    }
    t.path = path;
  }

  move(dt, h, foot) {
    const t = this.t;
    const wp = t.path[0];
    const slopeTilt = () => Math.atan(groundSlope(t.x)) * t.face * 0.8;

    if (!wp) {
      if (t.grounded) {
        t.y = groundY(t.x) - foot;
        t.tilt += (slopeTilt() - t.tilt) * Math.min(1, dt * 5);
      } else {
        t.y += Math.sin(this.time * 1.5) * 3 * dt; // 原地輕輕漂浮
        t.tilt *= 0.9;
      }
      t.vy *= 0.9;
      return;
    }

    if (wp.walk) {
      const inWater = t.y > WATER_TOP;
      const speed = (inWater ? 40 : 26) * (t.mode === 'food' ? 1.8 : 1);
      const dx = wp.x - t.x;
      t.grounded = true;
      t.vy = 0;
      if (Math.abs(dx) < 1.5) {
        t.path.shift();
        return;
      }
      t.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
      t.face = dx > 0 ? 1 : -1;
      t.y = groundY(t.x) - foot;
      t.tilt += (slopeTilt() - t.tilt) * Math.min(1, dt * 6);
      return;
    }

    t.grounded = false;
    const speed = t.mode === 'food' ? 110 : 75;
    const dx = wp.x - t.x, dy = wp.y - t.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3) {
      t.path.shift();
      t.grounded = !!wp.settle;
      return;
    }
    const k = Math.min(1, (speed * dt) / dist);
    t.x += dx * k;
    t.y += dy * k;
    // 不要鑽進地形、也不要游出水面
    t.y = Math.max(WATER_TOP + h * 0.15, Math.min(groundY(t.x) - foot, t.y));
    if (Math.abs(dx) > 2) t.face = dx > 0 ? 1 : -1;
    t.vy += (dy / dist - t.vy) * Math.min(1, dt * 6);
    // 下潛／上浮的姿勢本身就是斜的，不用再轉
    const targetTilt = Math.abs(t.vy) > 0.6 ? 0 : Math.max(-0.4, Math.min(0.4, Math.atan2(dy, Math.abs(dx)))) * 0.5;
    t.tilt += (targetTilt - t.tilt) * Math.min(1, dt * 5);
  }

  // 目前要畫的姿勢與位移，2D 和 2.5D 共用
  turtleFrame() {
    const t = this.t;
    const s = this.getState();
    const { w, shell } = this.size();
    const key = choosePose(t, this.time, {
      poses: this.poses, sick: s.stats.health < 35, waterTop: WATER_TOP, swimLimit: this.swimLimit ?? W,
    });
    const fade = trackPoseChange(t, key, this.time);
    const m = poseMotion(t, key, this.time, w);
    // 站在地上時，讓這個姿勢的腳底剛好貼地
    const ground = t.grounded && this.poses ? (this.poses.stdBottom - this.poses.bottom(key)) * shell : 0;
    return { key, fade, m, dy: ground + m.dy, shell, w };
  }

  paintTurtle(ctx, f, shellPx) {
    const t = this.t;
    if (f.fade < 1 && t.prevPose) renderTurtle(ctx, this.poses, t.prevPose, shellPx, t.anim, 1 - f.fade);
    renderTurtle(ctx, this.poses, f.key, shellPx, t.anim, f.fade < 1 && t.prevPose ? f.fade : 1);
  }

  // ---------- 2D 繪圖 ----------

  draw() {
    const ctx = this.ctx ||= this.c.getContext('2d');
    const s = this.getState();
    const night = isNight(s);
    const dirt = 1 - s.stats.water / 100;

    ctx.setTransform(this.c.width / W, 0, 0, this.c.height / H, 0, 0);
    ctx.clearRect(0, 0, W, H);

    this.drawBackdrop(ctx);
    this.drawTerrain(ctx);
    this.drawPlants(ctx);
    if (s.lamp.on) this.drawLightCone(ctx);
    for (const f of this.food) this.drawFood(ctx, f);
    this.drawTurtle(ctx);
    this.drawBubbles(ctx);
    this.drawWater(ctx, dirt);
    this.drawRipples(ctx);
    this.drawLamp(ctx, s.lamp.on);

    if (night) {
      ctx.fillStyle = 'rgba(12, 18, 52, 0.6)';
      ctx.fillRect(0, 0, W, H);
      if (s.lamp.on) this.drawLampGlow(ctx);
    }
    this.drawHearts(ctx);
    if (this.t.mode === 'sleep' && !this.t.path.length) this.drawZzz(ctx);
    this.drawGlass(ctx);
  }

  drawBackdrop(ctx) {
    if (this.assets.bg) {
      ctx.drawImage(this.assets.bg, 0, 0, W, H);
      return;
    }
    const wall = ctx.createLinearGradient(0, 0, 0, WATER_TOP);
    wall.addColorStop(0, '#efe6d2');
    wall.addColorStop(1, '#e2d6bb');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, WATER_TOP);
    const water = ctx.createLinearGradient(0, WATER_TOP, 0, H);
    water.addColorStop(0, '#8fcbd2');
    water.addColorStop(1, '#3f8595');
    ctx.fillStyle = water;
    ctx.fillRect(0, WATER_TOP, W, H - WATER_TOP);
  }

  terrainPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (const [x, y] of sampleGround(5)) ctx.lineTo(x, y);
    ctx.lineTo(W, H);
    ctx.closePath();
  }

  drawTerrain(ctx) {
    // 水面下：砂
    const sand = ctx.createLinearGradient(0, 260, 0, H);
    sand.addColorStop(0, '#cdb88f');
    sand.addColorStop(1, '#a8926b');
    ctx.fillStyle = sand;
    this.terrainPath(ctx);
    ctx.fill();

    const colors = ['#9c8a66', '#cbb995', '#877556', '#d8c9a8'];
    for (const g of this.gravel) {
      ctx.fillStyle = colors[g.c];
      ctx.beginPath();
      ctx.ellipse(g.x, g.y, g.r, g.r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 水面上：曬台的石頭和土
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, WATER_TOP + 2);
    ctx.clip();
    ctx.fillStyle = '#8f7a5c';
    this.terrainPath(ctx);
    ctx.fill();
    ctx.fillStyle = '#a28c6a';
    for (const [x, y, rx, ry] of [[900, 150, 34, 12], [955, 146, 28, 10], [868, 163, 18, 8], [985, 150, 20, 9]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // 曬台頂的青苔
    ctx.strokeStyle = '#7d9a4f';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = 860; x <= W; x += 5) {
      const y = groundY(x) - 1;
      x === 860 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 打氣石
    ctx.fillStyle = '#7d7d82';
    ctx.beginPath();
    ctx.ellipse(AIR_STONE_X, groundY(AIR_STONE_X) - 4, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPlants(ctx) {
    ctx.lineCap = 'round';
    for (const p of this.plants) {
      const base = groundY(p.x) + 6;
      for (let i = 0; i < 4; i++) {
        // 挺水植物的莖比較硬，水面上幾乎不晃
        const sway = Math.sin(this.time * 0.8 + p.p + i) * (p.emergent ? 5 : 18);
        const bx = p.x + i * 7 - 10;
        ctx.strokeStyle = p.emergent ? (i % 2 ? '#6d9a3c' : '#5b8a32') : (i % 2 ? '#4f8a3c' : '#3f7431');
        ctx.lineWidth = p.emergent ? 4 : 6;
        ctx.beginPath();
        ctx.moveTo(bx, base);
        ctx.quadraticCurveTo(bx + sway * 0.4, base - p.h * 0.5, bx + sway + (p.emergent ? (i - 1.5) * 8 : 0), base - p.h + i * 18);
        ctx.stroke();
      }
    }
  }

  drawLightCone(ctx) {
    const top = groundY(LAMP_X);
    const g = ctx.createLinearGradient(0, 50, 0, top);
    g.addColorStop(0, 'rgba(255, 226, 140, .55)');
    g.addColorStop(1, 'rgba(255, 226, 140, 0.05)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(LAMP_X - 30, 55);
    ctx.lineTo(LAMP_X + 30, 55);
    ctx.lineTo(LAMP_X + 90, top);
    ctx.lineTo(LAMP_X - 110, top + 15);
    ctx.closePath();
    ctx.fill();
  }

  drawWater(ctx, dirt) {
    // 半透明的水蓋在水中的東西上，讓它們看起來在水裡
    ctx.fillStyle = 'rgba(110, 185, 200, 0.18)';
    ctx.fillRect(0, WATER_TOP, W, H - WATER_TOP);
    if (dirt > 0.05) {
      ctx.fillStyle = `rgba(104, 112, 48, ${Math.min(0.55, dirt * 0.6)})`;
      ctx.fillRect(0, WATER_TOP, W, H - WATER_TOP);
    }
    const n = Math.floor(this.motes.length * dirt);
    ctx.fillStyle = 'rgba(90, 80, 40, .5)';
    for (let i = 0; i < n; i++) {
      const m = this.motes[i];
      ctx.beginPath();
      ctx.arc(m.x + Math.sin(this.time * 0.5 + m.p) * 10, m.y + Math.cos(this.time * 0.4 + m.p) * 6, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, .6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    let started = false;
    for (let x = 0; x <= W; x += 10) {
      if (groundY(x) < WATER_TOP) break; // 水面只畫到岸邊
      const y = WATER_TOP + Math.sin(x * 0.03 + this.time * 2) * 2;
      started ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      started = true;
    }
    ctx.stroke();
  }

  drawRipples(ctx) {
    for (const r of this.ripples) {
      const k = r.age / 1.5;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * (1 - k)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(r.x, WATER_TOP, 6 + k * 30, 2 + k * 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawLamp(ctx, on) {
    if (this.assets.lamp) {
      ctx.drawImage(this.assets.lamp, LAMP_X - 60, -10, 120, 75);
    } else {
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(LAMP_X, 0);
      ctx.lineTo(LAMP_X, 18);
      ctx.stroke();
      ctx.fillStyle = '#4a4a4f';
      ctx.beginPath();
      ctx.moveTo(LAMP_X - 18, 16);
      ctx.lineTo(LAMP_X + 18, 16);
      ctx.lineTo(LAMP_X + 42, 52);
      ctx.lineTo(LAMP_X - 42, 52);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = on ? '#fff3b0' : '#cfcfc6';
    ctx.beginPath();
    ctx.ellipse(LAMP_X, 54, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawLampGlow(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(LAMP_X, 60, 10, LAMP_X, 120, 220);
    g.addColorStop(0, 'rgba(255, 210, 120, .45)');
    g.addColorStop(1, 'rgba(255, 210, 120, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(LAMP_X - 260, 0, 520, 360);
    ctx.restore();
  }

  drawFood(ctx, f) {
    const img = this.assets[`food_${f.type}`];
    if (img) {
      ctx.drawImage(img, f.x - 10, f.y - 10, 20, 20);
      return;
    }
    const rotting = f.age > CONFIG.foodRotSeconds * 0.6;
    ctx.save();
    ctx.translate(f.x, f.y);
    // 浮著時平躺微晃，下沉時慢慢翻滾（菜葉像落葉一樣擺）
    ctx.rotate(f.floating ? Math.sin(this.time * 2 + f.seed) * 0.15
      : f.type === 'veggie' ? Math.sin(this.time * 2 + f.seed) * 0.6 : f.seed + f.spin * f.age);
    if (f.type === 'pellet') {
      ctx.fillStyle = rotting ? '#6d6040' : '#8b5a2b';
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 3.5, f.seed, 0, Math.PI * 2);
      ctx.fill();
    } else if (f.type === 'shrimp') {
      ctx.strokeStyle = rotting ? '#8a7a5a' : '#e0825a';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0.3, Math.PI * 1.4);
      ctx.stroke();
    } else {
      ctx.fillStyle = rotting ? '#6f7a3a' : '#6cc04a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 5, f.seed, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawTurtle(ctx) {
    const t = this.t;
    const f = this.turtleFrame();
    ctx.save();
    ctx.translate(t.x, t.y + f.dy);
    ctx.scale(t.face * f.m.sx, f.m.sy);
    ctx.rotate(t.tilt + f.m.rot);
    this.paintTurtle(ctx, f, f.shell);
    ctx.restore();
  }

  drawBubbles(ctx) {
    ctx.strokeStyle = 'rgba(255, 255, 255, .7)';
    ctx.lineWidth = 1.5;
    for (const b of this.bubbles) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawHearts(ctx) {
    for (const p of this.hearts) {
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.fillStyle = '#ef6f8f';
      drawHeart(ctx, p.x, p.y, 9);
    }
    ctx.globalAlpha = 1;
  }

  drawZzz(ctx) {
    const { w, h } = this.size();
    ctx.fillStyle = 'rgba(255, 255, 255, .85)';
    for (let i = 0; i < 3; i++) {
      const ph = (this.time * 0.5 + i / 3) % 1;
      ctx.globalAlpha = 1 - ph;
      ctx.font = `bold ${12 + i * 4}px sans-serif`;
      ctx.fillText('z', this.t.x + this.t.face * w * 0.3 + ph * 20, this.t.y - h * 0.7 - ph * 50);
    }
    ctx.globalAlpha = 1;
  }

  drawGlass(ctx) {
    ctx.fillStyle = 'rgba(255, 255, 255, .08)';
    ctx.beginPath();
    ctx.moveTo(40, WATER_TOP);
    ctx.lineTo(120, WATER_TOP);
    ctx.lineTo(40, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();
  }
}

function nearest(list, x, y) {
  let best = list[0], bd = Infinity;
  for (const f of list) {
    const d = Math.hypot(f.x - x, f.y - y);
    if (d < bd) { bd = d; best = f; }
  }
  return best;
}

