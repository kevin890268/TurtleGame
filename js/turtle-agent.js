// 缸裡的一隻烏龜：行為（游泳、在淺灘走路、上岸曬背、追食物、睡覺）與要畫的姿勢。
// 數值在存檔的 turtles[] 裡（由 sim.js 管），這裡只管牠在缸裡怎麼動。座標是 1000×600 的邏輯座標。
import { W, WATER_TOP, ZONES, groundY, groundSlope, swimLimitX } from './terrain.js';
import { choosePose, poseMotion, renderTurtle, trackPoseChange } from './poses.js';
import { getSpecies } from './species.js';

const rand = (a, b) => a + Math.random() * (b - a);

const REACTIONS = {
  happy: { key: ['wag', 'shake'], dur: 1.8 }, // 開心時隨機搖尾巴或搖屁屁
  annoyed: { key: 'hide', dur: 2.2 },
  startled: { key: 'startled', dur: 1.3 },
  eat: { key: 'nibble', dur: 0.6 },
};

export class TurtleAgent {
  constructor(tank, id) {
    this.tank = tank;
    this.id = id;
    this.z = rand(-12, 12);      // 2.5D 用的前後深度
    this.zTarget = this.z;
    this.swimLimit = W;
    this.t = {
      x: rand(80, 500), y: rand(300, 450), face: Math.random() < 0.5 ? 1 : -1, tilt: 0,
      mode: 'swim', path: [], grounded: false,
      timer: rand(0, 2), anim: rand(0, 5), vy: 0, ignoreFoodUntil: 0,
      flash: null, idleKey: null, idleUntil: 0, idleNext: rand(2, 8),
      pose: 'swim', prevPose: null, poseAt: 0,
    };
  }

  get turtle() {
    return this.tank.getState().turtles.find(t => t.id === this.id);
  }

  get species() {
    return getSpecies(this.turtle.species);
  }

  get poses() {
    return this.tank.posesFor(this.turtle.species);
  }

  // w：烏龜全長；shell：背甲寬；foot：站立時背甲中心離地面多高
  size() {
    const w = 30 + this.turtle.length * 8;
    const h = w * 0.5;
    const shell = w * 0.9;
    const poses = this.poses;
    const foot = poses ? poses.stdBottom * shell : h * 0.42;
    return { w, h, shell, foot };
  }

  react(kind) {
    const r = REACTIONS[kind];
    if (!r) return;
    const key = Array.isArray(r.key) ? r.key[Math.floor(Math.random() * r.key.length)] : r.key;
    this.t.flash = { key, until: this.tank.time + r.dur, dur: r.dur };
    if (kind === 'happy') this.tank.showHearts(this);
  }

  // ---------- 行為 ----------

  update(dt, s, night) {
    const t = this.t;
    const turtle = this.turtle;
    const { w, h, foot } = this.size();
    this.swimLimit = swimLimitX(h);
    t.anim += dt;
    t.timer -= dt;

    const foodInWater = this.tank.food.filter(f => f.inWater);
    const hungry = turtle.stats.hunger < 98 && !night && this.tank.time > t.ignoreFoodUntil;

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
    this.updateDepth(dt);
  }

  chaseFood(foods, w, h, foot) {
    const t = this.t;
    const target = nearest(foods, t.x, t.y);
    this.zTarget = target.z ?? this.zTarget;
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
      const food = this.tank.food;
      food.splice(food.indexOf(target), 1);
      if (this.tank.hooks.onEat(this.id, target.type)) {
        this.react('eat');
      } else {
        food.push(target); // 吃飽了，食物留在水裡給別隻
        t.ignoreFoodUntil = this.tank.time + 30;
        t.mode = 'swim';
        t.timer = 0;
        t.path = [];
      }
    }
  }

  // 在 [lo, hi] 之間挑一個離其他烏龜最遠的位置（曬台、淺灘、睡覺的地方才不會擠在一起）
  pickX(lo, hi) {
    const others = [...this.tank.agents.values()].filter(a => a !== this);
    const spotOf = a => (a.t.path.length ? a.t.path[a.t.path.length - 1].x : a.t.x);
    let best = rand(lo, hi), bestGap = -1;
    for (let i = 0; i < 8; i++) {
      const x = rand(lo, hi);
      const gap = Math.min(Infinity, ...others.map(a => Math.abs(spotOf(a) - x)));
      if (gap > bestGap) { bestGap = gap; best = x; }
    }
    return best;
  }

  // 白天閒晃時決定下一件事；各品種的習性不同（麝香龜愛在水底走、地圖龜愛曬背）
  decide(s, night, h, foot) {
    const t = this.t;
    const habits = this.species.habits;
    const r = Math.random();
    if (night) {
      // 晚上睡在深水區的底部，或淺灘上
      t.mode = 'sleep';
      const x = r < 0.5 ? this.pickX(ZONES.deep[0] + 30, ZONES.deep[1] - 40) : this.pickX(...ZONES.shallow);
      this.planPath({ x, ground: true }, foot);
      t.timer = rand(400, 800);
      this.zTarget = rand(-14, 14);
      return;
    }
    if (s.tank.temp < 16) {
      // 太冷：躲在深水區底部不太動（研究資料：斑龜低於 15℃ 會躲起來不動）
      t.mode = 'bottom';
      this.planPath({ x: this.pickX(ZONES.deep[0] + 20, ZONES.deep[1]), ground: true }, foot);
      t.timer = rand(60, 120);
      return;
    }
    const baskChance = s.lamp.on && this.turtle.stats.sun < 95 ? habits.bask : 0;
    if (r < baskChance) {
      t.mode = 'bask';
      this.planPath({ x: this.pickX(ZONES.bask[0] + 10, ZONES.bask[1] - 10), ground: true }, foot);
      t.timer = rand(25, 55);
      this.zTarget = rand(-8, 8); // 待在燈下附近
    } else if (r < baskChance + habits.shallow) {
      t.mode = 'shallow';
      this.planPath({ x: this.pickX(...ZONES.shallow), ground: true }, foot);
      t.timer = rand(8, 20);
      this.zTarget = rand(-14, 14);
    } else if (r < baskChance + habits.shallow + habits.bottom) {
      t.mode = 'bottom';
      this.planPath({ x: this.pickX(ZONES.deep[0] + 20, ZONES.deep[1]), ground: true }, foot);
      t.timer = rand(6, 15);
      this.zTarget = rand(-14, 14);
    } else {
      t.mode = 'swim';
      const x = rand(30, Math.max(60, this.swimLimit - 20));
      const y = rand(WATER_TOP + h * 0.4, Math.max(WATER_TOP + h * 0.5, groundY(x) - foot - 5));
      this.planPath({ x, y, ground: false }, foot);
      t.timer = rand(2, 6);
      this.zTarget = rand(-14, 14);
    }
  }

  // 被別隻烏龜擠開：在地上就沿著地面移動，在水裡可以上下左右移動
  nudge(dx, dy) {
    const t = this.t;
    const { h, foot } = this.size();
    t.x = Math.max(20, Math.min(W - 15, t.x + dx));
    if (t.grounded) {
      t.y = groundY(t.x) - foot;
    } else {
      t.y = Math.max(WATER_TOP + h * 0.15, Math.min(groundY(t.x) - foot, t.y + dy));
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
        t.y += Math.sin(this.tank.time * 1.5 + t.anim) * 3 * dt; // 原地輕輕漂浮
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
    const cold = this.tank.getState().tank.temp < 20 ? 0.6 : 1; // 冷的時候游得慢
    const speed = (t.mode === 'food' ? 110 : 75) * this.species.swimSpeed * cold;
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

  // 前後深度（只有 2.5D 看得出來）
  updateDepth(dt) {
    const speed = this.t.mode === 'food' ? 30 : 8;
    const d = this.zTarget - this.z;
    this.z += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
  }

  // ---------- 要畫的樣子（2D 和 2.5D 共用） ----------

  frame() {
    const t = this.t;
    const turtle = this.turtle;
    const poses = this.poses;
    const { w, shell } = this.size();
    const key = choosePose(t, this.tank.time, {
      poses, sick: turtle.stats.health < 35, waterTop: WATER_TOP, swimLimit: this.swimLimit,
    });
    const fade = trackPoseChange(t, key, this.tank.time);
    const m = poseMotion(t, key, this.tank.time, w);
    // 站在地上時，讓這個姿勢的腳底剛好貼地
    const ground = t.grounded && poses ? (poses.stdBottom - poses.bottom(key)) * shell : 0;
    return { key, fade, m, dy: ground + m.dy, shell, w };
  }

  paint(ctx, f, shellPx) {
    const t = this.t;
    const poses = this.poses;
    const pal = this.species.palette;
    if (f.fade < 1 && t.prevPose) renderTurtle(ctx, poses, t.prevPose, shellPx, t.anim, 1 - f.fade, pal);
    renderTurtle(ctx, poses, f.key, shellPx, t.anim, f.fade < 1 && t.prevPose ? f.fade : 1, pal);
  }

  get sleeping() {
    return this.t.mode === 'sleep' && !this.t.path.length;
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
