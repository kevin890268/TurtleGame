// 缸裡的一隻烏龜：行為（游泳、在淺灘走路、上岸曬背、追食物、睡覺）與要畫的姿勢。
// 數值在存檔的 turtles[] 裡（由 sim.js 管），這裡只管牠在缸裡怎麼動。座標是 1000×600 的邏輯座標。
import { CONFIG } from './config.js';
import { W, WATER_TOP, terrainOf } from './terrain.js';
import { choosePose, poseMotion, renderTurtle, trackPoseChange } from './poses.js';
import { getSpecies } from './species.js';
import { relation, FRIEND_AT, BEST_FRIEND_AT, RIVAL_AT } from './sim.js';

const rand = (a, b) => a + Math.random() * (b - a);

// 烏龜整體的快慢（config.js 的 turtlePace）。移動和動畫一定要用同一個倍率，
// 不然身體移得慢、腳卻划得跟原本一樣快，看起來像在滑冰。
const PACE = CONFIG.turtlePace;
const ANIM_RATE = 0.5 * PACE;

// dur 是動作速度為 1 時的秒數；動畫放慢時要播久一點，動作才做得完
const REACTIONS = {
  happy: { key: 'happy', dur: 1.8 / PACE },       // 開心：搖屁屁
  annoyed: { key: 'hide', dur: 2.2 / PACE },
  annoyedFood: { key: 'startled', dur: 1.5 / PACE }, // 食物被搶走：嚇一跳
  rescued: { key: 'happy', dur: 1.8 / PACE },
  startled: { key: 'startled', dur: 1.3 / PACE },
  eat: { key: 'eat', dur: 0.6 / PACE },           // 水裡會自動換成 eat_water（poses.js）
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
      stackOn: null, // 疊在哪隻好朋友的背上曬背
      eatCount: 0, eatPauseUntil: 0, // 一次最多連吃 3 個，吃完要休息一下才會再去找食物
    };
  }

  others() {
    return [...this.tank.agents.values()].filter(a => a !== this);
  }

  // 室內缸跟戶外池是不同的地形剖面，深水/淺水/曬台的範圍也不一樣；
  // 演算法完全共用，只是依目前場景換一包資料（見 terrain.js 的 terrainOf）
  get terrain() {
    return terrainOf(this.tank.getState().scene);
  }

  rel(other) {
    return relation(this.tank.getState(), this.id, other.id);
  }

  // 最要好的朋友（沒有就是 null）
  bestFriend() {
    let best = null, score = FRIEND_AT - 1;
    for (const a of this.others()) {
      const r = this.rel(a);
      if (r > score) { score = r; best = a; }
    }
    return best;
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
    if (kind === 'happy' || kind === 'rescued') this.tank.showHearts(this);
  }

  // ---------- 行為 ----------

  update(dt, s, night) {
    const t = this.t;
    const turtle = this.turtle;
    const { w, h, foot } = this.size();
    this.swimLimit = this.terrain.swimLimitX(h);
    t.anim += dt * ANIM_RATE;
    t.timer -= dt;

    // 翻身卡住：原地腳亂划，等玩家幫忙
    if (turtle.flipped) {
      t.mode = 'flipped';
      t.path = [];
      t.stackOn = null;
      t.grounded = true;
      t.y = this.terrain.groundY(t.x) - foot;
      this.updateDepth(dt);
      return;
    }
    if (t.mode === 'flipped') {
      t.mode = 'bask';
      t.timer = 0;
    }

    // 疊在朋友背上：朋友一離開就下來
    if (t.stackOn) {
      const f = this.tank.agents.get(t.stackOn);
      if (!f || f.t.path.length || f.t.mode !== 'bask' || t.mode !== 'bask' || night) {
        t.stackOn = null;
        t.y = this.terrain.groundY(t.x) - foot;
      }
    }

    const foodInWater = this.tank.food.filter(f => f.inWater);
    const hungry = turtle.stats.hunger < 98 && !night && this.tank.time > t.ignoreFoodUntil;

    if (hungry && foodInWater.length && t.mode !== 'food') {
      t.mode = 'food';
      t.path = [];
      t.stackOn = null;
      t.eatCount = 0;
    }

    if (t.mode === 'food') {
      if (!hungry || !foodInWater.length) {
        t.mode = 'swim';
        t.timer = 0;
        t.path = [];
      } else if (this.tank.time < t.eatPauseUntil) {
        // 剛吃完一口，發呆一下再繼續找下一個（不要一口接一口吃）
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
    const onBottom = target.y >= this.terrain.groundY(target.x) - 6;
    if (target.x > this.swimLimit - 10 || (onBottom && t.grounded)) {
      this.planPath({ x: tx, ground: true }, foot);
    } else {
      const ty = Math.max(WATER_TOP + h * 0.3, Math.min(this.terrain.groundY(tx) - foot, target.y + h * 0.1));
      this.planPath({ x: tx, y: ty, ground: false }, foot);
    }

    const headX = t.x + t.face * w * 0.5;
    this.target = target;
    if (Math.abs(headX - target.x) < 14 + w * 0.12 && Math.abs(t.y - target.y) < foot + 18) {
      const food = this.tank.food;
      food.splice(food.indexOf(target), 1);
      if (this.tank.hooks.onEat(this.id, target.type)) {
        this.react('eat');
        // 搶食：別隻也正追著這一顆、而且就在旁邊，被搶的那隻會生氣
        for (const o of this.others()) {
          if (o.t.mode === 'food' && o.target === target && Math.hypot(o.t.x - t.x, o.t.y - t.y) < 120) {
            o.react('annoyedFood');
            this.tank.hooks.onRelation(this.id, o.id, -6);
          }
        }
        // 一次最多連吃 3 個，吃完要休息幾秒才會再去找食物；每一口之間也會先發呆一下
        t.eatCount += 1;
        if (t.eatCount >= 3) {
          t.eatCount = 0;
          t.mode = 'swim';
          t.timer = 0;
          t.path = [];
          t.ignoreFoodUntil = this.tank.time + rand(6, 10);
        } else {
          t.eatPauseUntil = this.tank.time + rand(1.5, 3);
        }
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
    // 互看不順眼的那隻要離更遠（距離打對折來算）
    const weight = a => (relation(this.tank.getState(), this.id, a.id) <= RIVAL_AT ? 0.5 : 1);
    let best = rand(lo, hi), bestGap = -1;
    for (let i = 0; i < 8; i++) {
      const x = rand(lo, hi);
      const gap = Math.min(Infinity, ...others.map(a => Math.abs(spotOf(a) - x) * weight(a)));
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
      const x = r < 0.5 ? this.pickX(this.terrain.ZONES.deep[0] + 30, this.terrain.ZONES.deep[1] - 40) : this.pickX(...this.terrain.ZONES.shallow);
      this.planPath({ x, ground: true }, foot);
      t.timer = rand(400, 800);
      this.zTarget = rand(-14, 14);
      return;
    }
    if (s.tank.temp < 16) {
      // 太冷：躲在深水區底部不太動（研究資料：斑龜低於 15℃ 會躲起來不動）
      t.mode = 'bottom';
      this.planPath({ x: this.pickX(this.terrain.ZONES.deep[0] + 20, this.terrain.ZONES.deep[1]), ground: true }, foot);
      t.timer = rand(60, 120);
      return;
    }
    // 好朋友：一半的機率跟著朋友做同一件事，待在牠旁邊
    const friend = this.bestFriend();
    const fm = friend?.t.mode;
    if (friend && ['bask', 'shallow', 'bottom'].includes(fm) && (fm !== 'bask' || s.lamp.on) && Math.random() < 0.5) {
      t.mode = fm;
      const { shell } = friend.size();
      const fx = friend.t.path.length ? friend.t.path[friend.t.path.length - 1].x : friend.t.x;
      this.planPath({ x: fx + (Math.random() < 0.5 ? -1 : 1) * shell * 0.9, ground: true }, foot);
      t.timer = rand(20, 45);
      this.zTarget = friend.zTarget + rand(-3, 3);
      this.followId = friend.id;
      return;
    }
    this.followId = null;

    const baskChance = s.lamp.on && this.turtle.stats.sun < 95 ? habits.bask : 0;
    if (r < baskChance) {
      t.mode = 'bask';
      this.planPath({ x: this.pickX(this.terrain.ZONES.bask[0] + 10, this.terrain.ZONES.bask[1] - 10), ground: true }, foot);
      t.timer = rand(25, 55);
      this.zTarget = rand(-8, 8); // 待在燈下附近
    } else if (r < baskChance + habits.shallow) {
      t.mode = 'shallow';
      this.planPath({ x: this.pickX(...this.terrain.ZONES.shallow), ground: true }, foot);
      t.timer = rand(8, 20);
      this.zTarget = rand(-14, 14);
    } else if (r < baskChance + habits.shallow + habits.bottom) {
      t.mode = 'bottom';
      this.planPath({ x: this.pickX(this.terrain.ZONES.deep[0] + 20, this.terrain.ZONES.deep[1]), ground: true }, foot);
      t.timer = rand(6, 15);
      this.zTarget = rand(-14, 14);
    } else {
      t.mode = 'swim';
      const x = rand(30, Math.max(60, this.swimLimit - 20));
      const y = rand(WATER_TOP + h * 0.4, Math.max(WATER_TOP + h * 0.5, this.terrain.groundY(x) - foot - 5));
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
      t.y = this.terrain.groundY(t.x) - foot;
    } else {
      t.y = Math.max(WATER_TOP + h * 0.15, Math.min(this.terrain.groundY(t.x) - foot, t.y + dy));
    }
  }

  // 規劃路線：游不起來的淺灘和岸上要用走的，游泳區可以直線游過去
  planPath(dest, foot) {
    const t = this.t;
    const sm = this.swimLimit;
    const gy = x => this.terrain.groundY(x) - foot;
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
    const slopeTilt = () => Math.atan(this.terrain.groundSlope(t.x)) * t.face * 0.8;

    if (!wp) {
      // 最要好的朋友在旁邊曬背，而且自己比較小：爬到牠背上
      if (!t.stackOn && t.mode === 'bask' && t.grounded && t.y < WATER_TOP) {
        const f = this.others().find(o => o.t.mode === 'bask' && !o.t.path.length && !o.t.stackOn
          && Math.abs(o.t.x - t.x) < o.size().shell * 1.2 && this.rel(o) >= BEST_FRIEND_AT
          && o.turtle.length > this.turtle.length);
        if (f) t.stackOn = f.id;
      }
      if (t.stackOn) {
        const f = this.tank.agents.get(t.stackOn);
        const fs = f.size();
        t.x += (f.t.x - fs.shell * 0.08 * f.t.face - t.x) * Math.min(1, dt * 4);
        t.y += (f.t.y - fs.h * 0.62 - t.y) * Math.min(1, dt * 4);
        t.face = f.t.face;
        t.tilt = f.t.tilt;
        this.zTarget = f.z + 0.5;
        return;
      }
      if (t.grounded) {
        t.y = this.terrain.groundY(t.x) - foot;
        t.tilt += (slopeTilt() - t.tilt) * Math.min(1, dt * 5);
      } else {
        t.y += Math.sin(this.tank.time * 1.5 * PACE + t.anim) * 3 * PACE * dt; // 原地輕輕漂浮
        t.tilt *= 0.9;
      }
      t.vy *= 0.9;
      return;
    }

    if (wp.walk) {
      const inWater = t.y > WATER_TOP;
      const speed = (inWater ? 20 : 13) * (t.mode === 'food' ? 1.8 : 1) * PACE;
      const dx = wp.x - t.x;
      t.grounded = true;
      t.vy = 0;
      if (Math.abs(dx) < 1.5) {
        t.path.shift();
        return;
      }
      t.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
      t.face = dx > 0 ? 1 : -1;
      t.y = this.terrain.groundY(t.x) - foot;
      t.tilt += (slopeTilt() - t.tilt) * Math.min(1, dt * 6);
      return;
    }

    t.grounded = false;
    const cold = this.tank.getState().tank.temp < 20 ? 0.6 : 1; // 冷的時候游得慢
    const speed = (t.mode === 'food' ? 55 : 37.5) * this.species.swimSpeed * cold * PACE;
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
    t.y = Math.max(WATER_TOP + h * 0.15, Math.min(this.terrain.groundY(t.x) - foot, t.y));
    if (Math.abs(dx) > 2) t.face = dx > 0 ? 1 : -1;
    t.vy += (dy / dist - t.vy) * Math.min(1, dt * 6);
    // 下潛／上浮的姿勢本身就是斜的，不用再轉
    const targetTilt = Math.abs(t.vy) > 0.6 ? 0 : Math.max(-0.4, Math.min(0.4, Math.atan2(dy, Math.abs(dx)))) * 0.5;
    t.tilt += (targetTilt - t.tilt) * Math.min(1, dt * 5);
  }

  // 前後深度（只有 2.5D 看得出來）
  updateDepth(dt) {
    const speed = (this.t.mode === 'food' ? 30 : 8) * PACE;
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
    if (t.mode === 'flipped') {
      // 沒有翻身圖的品種：把縮殼的圖倒過來畫；不管哪種都加上腳亂划的晃動
      if (key !== 'flip') m.rot += Math.PI;
      m.rot += Math.sin(this.tank.time * 9) * 0.08;
    }
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
