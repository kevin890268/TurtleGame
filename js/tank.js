// 烏龜缸：場景、食物物理、多隻烏龜，以及 2D 畫面。
// 每隻烏龜的行為在 turtle-agent.js；所有座標都是 1000×600 的邏輯座標。
// 2.5D 版（tank3d.js）繼承這個類別，只換掉繪圖。
import { CONFIG } from './config.js';
import { isNight } from './sim.js';
import { W, H, WATER_TOP, LAMP_X, AIR_STONE_X, SHORE_X, groundY, sampleGround } from './terrain.js';
import { TurtleAgent, MAX_SHOVE } from './turtle-agent.js';
import { isDirectional } from './poses.js';
import { drawHeart } from './turtle-shape.js';

const rand = (a, b) => a + Math.random() * (b - a);

// 食物的浮沉：密度小於 1 會浮在水面，泡水後密度慢慢變大（d0 → d1，花 soak 秒），超過 1 就開始下沉。
// k 決定下沉速度，sway 是下沉時左右飄的程度（菜葉像落葉一樣飄）。
export const FOOD_PHYSICS = {
  pellet: { d0: 0.85, d1: 1.15, soak: 30, k: 60, sway: 0.4 },
  shrimp: { d0: 0.95, d1: 1.3, soak: 12, k: 60, sway: 0.8 },
  veggie: { d0: 0.9, d1: 1.05, soak: 40, k: 80, sway: 3 },
  snail: { d0: 1.4, d1: 1.4, soak: 1, k: 70, sway: 0 },   // 很重，一下就沉到底，然後慢慢爬
  worm: { d0: 1.05, d1: 1.1, soak: 10, k: 90, sway: 2 },  // 一邊扭一邊慢慢沉
  fruit: { d0: 0.95, d1: 1.2, soak: 15, k: 50, sway: 0.5 },
  bug: { d0: 0.5, d1: 0.5, soak: 1, k: 0, sway: 0 },      // 浮在水面掙扎
  fish: null,                                             // 活的，會自己游
};
const FOOD_LIFETIME = { bug: 60 }; // 蟲子沒被吃掉會飛走（不會弄髒水）
const MAX_FOOD = 40;

export class Tank {
  // assets.poses：{ 品種 id: PoseSet 或 null }
  constructor(canvas, getState, assets, hooks) {
    this.c = canvas;
    this.ctx = null; // 2D 版在第一次繪圖時才取得，讓 2.5D 版可以改用 WebGL
    this.getState = getState;
    this.assets = assets;
    this.hooks = hooks;
    this.time = 0;
    this.food = [];
    this.bubbles = [];
    this.hearts = [];
    this.ripples = [];
    this.agents = new Map(); // 烏龜 id → TurtleAgent
    this.selectedId = null;
    this.tool = null; // 目前選中的食物（投餵模式）
    this.bubbleClock = 0;
    this.lastNight = null;
    this.flakes = [];            // 脫皮的皮屑
    this.eventClock = rand(40, 90); // 下一次隨機事件的倒數（秒）
    this.relationClock = 0;
    this.seenShed = new Map();   // 已經畫過皮屑的脫皮（避免重複）

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

    this.syncAgents();
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

  posesFor(speciesId) {
    return this.assets.poses?.[speciesId] || null;
  }

  // 存檔裡的烏龜清單有增減時，缸裡的烏龜跟著增減
  syncAgents() {
    const ids = new Set(this.getState().turtles.map(t => t.id));
    for (const [id, agent] of this.agents) {
      if (!ids.has(id)) {
        this.agents.delete(id);
        this.onAgentRemoved(agent);
      }
    }
    for (const id of ids) {
      if (!this.agents.has(id)) {
        const agent = new TurtleAgent(this, id);
        this.agents.set(id, agent);
        this.onAgentAdded(agent);
      }
    }
  }

  // 給 2.5D 版建立／移除烏龜的 3D 物件用
  onAgentAdded() {}
  onAgentRemoved() {}

  // 點到的烏龜（2D）：離點擊位置夠近的那一隻
  agentAt(x, y) {
    let best = null, bd = Infinity;
    for (const a of this.agents.values()) {
      const { w } = a.size();
      const d = Math.hypot(x - a.t.x, y - a.t.y);
      if (d < w * 0.7 && d < bd) { bd = d; best = a; }
    }
    return best;
  }

  onPointer(e) {
    const r = this.c.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * W;
    const y = (e.clientY - r.top) / r.height * H;
    if (this.tool) {
      if (this.dropFoodAt(this.tool, x)) this.hooks.onDrop(this.tool);
      return;
    }
    this.clickAgent(this.agentAt(x, y));
  }

  // 點一下選取；點已經選取的那隻就是陪牠玩；翻身卡住的就幫牠翻回來
  clickAgent(agent) {
    if (!agent) return;
    if (agent.turtle.flipped) this.hooks.onRescue(agent.id);
    else if (agent.id === this.selectedId) this.hooks.onPoke(agent.id);
    else this.hooks.onSelect(agent.id);
  }

  setSelected(id) {
    this.selectedId = id;
  }

  // 選擇食物進入投餵模式；null 取消
  setTool(type) {
    this.tool = type;
    this.c.style.cursor = type ? 'crosshair' : '';
  }

  react(id, kind) {
    this.agents.get(id)?.react(kind);
  }

  reactAll(kind) {
    for (const a of this.agents.values()) a.react(kind);
  }

  showHearts(agent, n = 3) {
    const { h } = agent.size();
    for (let i = 0; i < n; i++) {
      this.hearts.push({ x: agent.t.x + rand(-20, 20), y: agent.t.y - h * 0.8, z: agent.z, life: 1.6 + i * 0.25, vx: rand(-10, 10) });
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

  // ---------- 更新 ----------

  update(dt) {
    this.time += dt;
    const s = this.getState();
    const night = isNight(s);

    this.syncAgents();
    this.updateFood(dt);
    this.updateBubbles(dt);
    this.hearts = this.hearts.filter(p => (p.life -= dt) > 0);
    for (const p of this.hearts) { p.y -= 35 * dt; p.x += p.vx * dt; }

    const nightChanged = night !== this.lastNight;
    this.lastNight = night;
    for (const a of this.agents.values()) {
      if (nightChanged) a.t.timer = 0;
      a.update(dt, s, night);
    }
    this.separate(dt);
    this.updateRelations(dt);
    this.updateEvents(dt, s, night);
    this.updateFlakes(dt, s);
  }

  // 一起在曬台上曬背的烏龜，關係會慢慢變好
  updateRelations(dt) {
    this.relationClock += dt;
    if (this.relationClock < 1) return;
    this.relationClock = 0;
    const list = [...this.agents.values()];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        const together = a.t.mode === 'bask' && b.t.mode === 'bask' && !a.t.path.length && !b.t.path.length
          && Math.abs(a.t.x - b.t.x) < (a.size().shell + b.size().shell) * 1.2;
        if (together) this.hooks.onRelation(a.id, b.id, 0.5);
      }
    }
  }

  // 隨機事件（網頁開著時才會發生）：蟲子落水、在曬台上翻身
  updateEvents(dt, s, night) {
    this.eventClock -= dt;
    if (this.eventClock > 0 || night) return;
    this.eventClock = rand(60, 150);
    const onLand = [...this.agents.values()].filter(a => a.t.grounded && a.t.y < WATER_TOP && !a.t.path.length && !a.t.stackOn && !a.turtle.flipped);
    if (onLand.length && Math.random() < 0.3) {
      this.hooks.onFlip(onLand[Math.floor(Math.random() * onLand.length)].id);
    } else {
      this.dropFoodAt('bug', rand(80, SHORE_X - 60));
      this.hooks.onEvent('一隻小蟲掉進水裡了，看誰先抓到！');
    }
  }

  // 脫皮：水裡漂著白色的皮屑（離線時發生的只在回來後畫一次）
  updateFlakes(dt, s) {
    for (const t of s.turtles) {
      if (!t.shedAt || this.seenShed.get(t.id) === t.shedAt) continue;
      this.seenShed.set(t.id, t.shedAt);
      if (s.gameTime - t.shedAt > 6 * 3.6e6) continue; // 太久以前的就不畫了
      const a = this.agents.get(t.id);
      if (!a) continue;
      for (let i = 0; i < 6; i++) {
        this.flakes.push({ x: a.t.x + rand(-20, 20), y: Math.max(WATER_TOP + 5, a.t.y + rand(-15, 5)), z: a.z, r: rand(3, 6), life: rand(20, 35), seed: rand(0, 6.28) });
      }
    }
    for (const f of this.flakes) {
      f.life -= dt;
      f.y = Math.max(WATER_TOP + 3, f.y - 3 * dt);
      f.x += Math.sin(this.time + f.seed) * 4 * dt;
    }
    this.flakes = this.flakes.filter(f => f.life > 0);
  }

  // 烏龜靠太近時互相推開，避免疊在一起
  separate(dt) {
    const list = [...this.agents.values()];
    const k = Math.min(1, dt * 4);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.t.stackOn === b.id || b.t.stackOn === a.id || a.t.stackOn || b.t.stackOn) continue; // 疊在背上的不推開
        const sa = a.size(), sb = b.size();
        const minX = (sa.shell + sb.shell) * 0.45;
        const minY = (sa.h + sb.h) * 0.5;
        const dx = b.t.x - a.t.x, dy = b.t.y - a.t.y;
        if (Math.abs(dx) >= minX || Math.abs(dy) >= minY) continue;
        const dir = dx === 0 ? (a.id < b.id ? 1 : -1) : Math.sign(dx);
        // 慢慢挪開：推開的速度最快也只到追食物時的游泳速度（不然重疊很多時會被彈開）
        const push = Math.min((minX - Math.abs(dx)) * k / 2, MAX_SHOVE * dt);
        // 兩隻都在游泳時，也稍微上下錯開
        const vy = !a.t.grounded && !b.t.grounded
          ? (dy === 0 ? 1 : Math.sign(dy)) * Math.min((minY - Math.abs(dy)) * k / 4, MAX_SHOVE * dt / 2)
          : 0;
        a.nudge(-dir * push, -vy);
        b.nudge(dir * push, vy);
        // 2.5D 裡也前後錯開一點
        if (Math.abs(a.zTarget - b.zTarget) < 6) {
          a.zTarget = Math.max(-14, a.zTarget - 3);
          b.zTarget = Math.min(14, b.zTarget + 3);
        }
      }
    }
  }

  // 快轉或調時鐘之後，讓烏龜依新的時間重新決定要做什麼
  onTimeJump() {
    this.lastNight = null;
    for (const a of this.agents.values()) {
      a.t.timer = 0;
      if (a.t.mode !== 'food') a.t.path = [];
    }
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

      if (f.type === 'fish') {
        this.swimFish(f, dt);
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
          if (f.type === 'snail') f.x += Math.sin(f.seed) * 4 * dt; // 小螺在沙上慢慢爬
        }
      }
      if (f.type === 'bug' && f.floating) f.x += Math.sin(this.time * 9 + f.seed) * 20 * dt; // 掙扎
      f.x = Math.max(5, Math.min(SHORE_X - 5, f.x));
    }

    this.ripples = this.ripples.filter(r => (r.age += dt) < 1.5);

    // 小魚是活的不會爛；蟲子太久沒被吃會飛走
    this.food = this.food.filter(f => !(FOOD_LIFETIME[f.type] && f.age > FOOD_LIFETIME[f.type]));
    const rotten = this.food.filter(f => f.type !== 'fish' && f.age > CONFIG.foodRotSeconds);
    if (rotten.length) {
      this.food = this.food.filter(f => f.type === 'fish' || f.age <= CONFIG.foodRotSeconds);
      this.hooks.onRot(rotten.length);
    }
  }

  // 小魚：在水裡隨機游動，偶爾轉向
  swimFish(f, dt) {
    f.turn = (f.turn ?? 0) - dt;
    if (f.turn <= 0) {
      f.turn = rand(1, 3);
      f.vx = rand(-60, 60);
      f.vy = rand(-25, 25);
    }
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    const floor = groundY(f.x) - 8;
    if (f.x < 15 || f.x > SHORE_X - 15) { f.vx *= -1; f.x = Math.max(15, Math.min(SHORE_X - 15, f.x)); }
    if (f.y < WATER_TOP + 8 || f.y > floor) { f.vy *= -1; f.y = Math.max(WATER_TOP + 8, Math.min(floor, f.y)); }
    f.floating = false;
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

  // ---------- 2D 繪圖 ----------

  draw() {
    const ctx = this.ctx ||= this.c.getContext('2d');
    const s = this.getState();
    const night = isNight(s);
    const dirt = 1 - s.tank.water / 100;

    ctx.setTransform(this.c.width / W, 0, 0, this.c.height / H, 0, 0);
    ctx.clearRect(0, 0, W, H);

    this.drawBackdrop(ctx);
    this.drawTerrain(ctx);
    this.drawPlants(ctx);
    if (s.lamp.on) this.drawLightCone(ctx);
    for (const f of this.food) this.drawFood(ctx, f);
    this.drawTurtles(ctx);
    this.drawBubbles(ctx);
    this.drawFlakes(ctx);
    this.drawWater(ctx, dirt);
    this.drawRipples(ctx);
    this.drawLamp(ctx, s.lamp.on);

    if (night) {
      ctx.fillStyle = 'rgba(12, 18, 52, 0.6)';
      ctx.fillRect(0, 0, W, H);
      if (s.lamp.on) this.drawLampGlow(ctx);
    }
    this.drawHearts(ctx);
    this.drawZzz(ctx);
    this.drawNames(ctx);
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
    } else if (f.type === 'veggie') {
      ctx.fillStyle = rotting ? '#6f7a3a' : '#6cc04a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 5, f.seed, 0, Math.PI * 2);
      ctx.fill();
    } else if (f.type === 'snail') {
      ctx.fillStyle = '#8a6a48';
      ctx.beginPath();
      ctx.arc(0, -2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5a4430';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -2, 2.5, 0, Math.PI * 1.6);
      ctx.stroke();
      ctx.fillStyle = '#b8a07a';
      ctx.fillRect(-6, 2, 11, 2);
    } else if (f.type === 'worm') {
      ctx.strokeStyle = rotting ? '#7a4a40' : '#c8322c';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const x = -8 + i * 2.7, y = Math.sin(this.time * 6 + f.seed + i) * 2.5;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    } else if (f.type === 'fish') {
      ctx.restore();
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(f.vx < 0 ? -1 : 1, 1);
      ctx.fillStyle = '#e8a33c';
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(-14, -4 + Math.sin(this.time * 12) * 1.5);
      ctx.lineTo(-14, 4 + Math.sin(this.time * 12) * 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.fillRect(4, -1.5, 1.8, 1.8);
    } else if (f.type === 'fruit') {
      ctx.fillStyle = rotting ? '#8a4a40' : '#e0424a';
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.bezierCurveTo(-7, 1, -6, -5, 0, -4);
      ctx.bezierCurveTo(6, -5, 7, 1, 0, 6);
      ctx.fill();
      ctx.fillStyle = '#4c9a3c';
      ctx.fillRect(-2, -6, 4, 2);
    } else if (f.type === 'bug') {
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 4, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(220, 230, 240, .7)';
      const flap = Math.sin(this.time * 30) * 2;
      ctx.beginPath();
      ctx.ellipse(-1, -3 - flap, 3, 1.5, -0.5, 0, Math.PI * 2);
      ctx.ellipse(2, -3 + flap, 3, 1.5, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawTurtles(ctx) {
    // 後面（z 小）的先畫，前面的蓋在上面
    // 後面（z 小）的先畫，疊在背上的最後畫
    const agents = [...this.agents.values()].sort((a, b) => (a.t.stackOn ? 1 : 0) - (b.t.stackOn ? 1 : 0) || a.z - b.z);
    for (const a of agents) {
      const t = a.t;
      const f = a.frame();
      ctx.save();
      ctx.translate(t.x, t.y + f.dy);
      // 有 4 方向圖時直接用對應方向的圖，不要再翻轉（翻兩次等於沒翻）
      const dirPose = isDirectional(f.key);
      ctx.scale((dirPose ? 1 : t.face) * f.m.sx, f.m.sy);
      ctx.rotate((t.tilt + f.m.rot) * (dirPose ? t.face : 1));
      a.paint(ctx, f, f.shell);
      ctx.restore();
    }
  }

  // 每隻烏龜頭上的名字，選取中的那隻比較明顯
  drawNames(ctx) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px sans-serif';
    const placed = [];
    for (const a of [...this.agents.values()].sort((p, q) => p.t.y - q.t.y)) {
      const { h } = a.size();
      const selected = a.id === this.selectedId;
      const x = a.t.x;
      let y = a.t.y - h * 0.95 - 8;
      // 跟別隻的名字太近就往上錯開（例如一起在曬台曬背）
      while (placed.some(p => Math.abs(p.x - x) < 70 && Math.abs(p.y - y) < 18)) y -= 18;
      placed.push({ x, y });
      const text = (selected ? '▼ ' : '') + a.turtle.name;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(30, 30, 20, .55)';
      ctx.strokeText(text, x, y);
      ctx.fillStyle = selected ? '#ffe27a' : 'rgba(255, 255, 255, .9)';
      ctx.fillText(text, x, y);
    }
    ctx.textAlign = 'start';
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

  drawFlakes(ctx) {
    for (const f of this.flakes) {
      ctx.fillStyle = `rgba(245, 245, 235, ${Math.min(0.75, f.life / 10)})`;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.r, f.r * 0.45, Math.sin(this.time * 0.8 + f.seed), 0, Math.PI * 2);
      ctx.fill();
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
    ctx.fillStyle = 'rgba(255, 255, 255, .85)';
    for (const a of this.agents.values()) {
      if (!a.sleeping) continue;
      const { w, h } = a.size();
      for (let i = 0; i < 3; i++) {
        const ph = (this.time * 0.5 + i / 3) % 1;
        ctx.globalAlpha = 1 - ph;
        ctx.font = `bold ${12 + i * 4}px sans-serif`;
        ctx.fillText('z', a.t.x + a.t.face * w * 0.3 + ph * 20, a.t.y - h * 0.7 - ph * 50);
      }
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
