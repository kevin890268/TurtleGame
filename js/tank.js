// 烏龜缸的邏輯：食物物理、多隻烏龜、隨機事件、關係。
// 每隻烏龜的行為在 turtle-agent.js；所有座標都是 1000×600 的邏輯座標。
// 這個類別不會單獨使用：畫面、點擊、視窗大小都由 tank3d.js 的 Tank3D 負責（2D 畫面已取消）。
import { CONFIG } from './config.js';
import { isNight } from './sim.js';
import { WATER_TOP, AIR_STONE_X, groundY, terrainOf } from './terrain.js';
import { TurtleAgent, MAX_SHOVE } from './turtle-agent.js';

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

  // 現在這個場景的地形（室內缸／戶外池不一樣）
  get land() {
    return terrainOf(this.getState().scene);
  }

  // 在 x（和 2.5D 的深度 z）的正上方掉一顆食物
  dropFoodAt(type, x, z = rand(-12, 12)) {
    if (this.food.length >= MAX_FOOD) return false;
    this.food.push({
      type, x: Math.max(20, Math.min(this.land.SHORE_X - 15, x)), z, y: WATER_TOP - rand(50, 70),
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
    const onLand = [...this.agents.values()].filter(a => a.t.grounded && a.t.y < WATER_TOP && !a.t.path.length && !a.t.stackOn && !a.turtle.flipped && a.t.mode !== 'explore');
    if (onLand.length && Math.random() < 0.3) {
      this.hooks.onFlip(onLand[Math.floor(Math.random() * onLand.length)].id);
    } else {
      this.dropFoodAt('bug', rand(80, this.land.SHORE_X - 60));
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
        if (a.t.mode === 'explore' || b.t.mode === 'explore') continue; // 出門走走的在圓台上別的地方
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
      const floor = this.land.groundY(f.x) - 3;

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
      f.x = Math.max(5, Math.min(this.land.SHORE_X - 5, f.x));
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
    const { groundY: gy, SHORE_X: shore } = this.land;
    const floor = gy(f.x) - 8;
    if (f.x < 15 || f.x > shore - 15) { f.vx *= -1; f.x = Math.max(15, Math.min(shore - 15, f.x)); }
    if (f.y < WATER_TOP + 8 || f.y > floor) { f.vy *= -1; f.y = Math.max(WATER_TOP + 8, Math.min(floor, f.y)); }
    f.floating = false;
  }

  updateBubbles(dt) {
    this.bubbleClock -= dt;
    // 泡泡是室內缸的打氣石冒的，戶外池沒有打氣石
    if (this.bubbleClock <= 0 && this.getState().scene !== 'outdoor') {
      this.bubbleClock = rand(0.08, 0.3);
      this.bubbles.push({ x: AIR_STONE_X + rand(-4, 4), y: groundY(AIR_STONE_X) - 10, r: rand(2, 5), p: rand(0, 6.28) });
    }
    for (const b of this.bubbles) {
      b.y -= (50 + b.r * 12) * dt;
      b.x += Math.sin(this.time * 3 + b.p) * 12 * dt;
    }
    this.bubbles = this.bubbles.filter(b => b.y > WATER_TOP);
  }
}
