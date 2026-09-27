// 缸裡的一隻烏龜：行為（游泳、在淺灘走路、上岸曬背、追食物、睡覺）與要畫的姿勢。
// 數值在存檔的 turtles[] 裡（由 sim.js 管），這裡只管牠在缸裡怎麼動。座標是 1000×600 的邏輯座標。
import { CONFIG } from './config.js';
import { W, H, WATER_TOP, terrainOf } from './terrain.js';
import { planTrip } from './explore.js';
import { TURTLE_REACT, EMOTES } from './signals.js';
import { choosePose, poseMotion, renderTurtle, trackPoseChange } from './poses.js';
import { getSpecies } from './species.js';
import { relation, FRIEND_AT, BEST_FRIEND_AT, RIVAL_AT } from './sim.js';

const rand = (a, b) => a + Math.random() * (b - a);

// 烏龜整體的快慢（config.js 的 turtlePace）。移動和動畫一定要用同一個倍率，
// 不然身體移得慢、腳卻划得跟原本一樣快，看起來像在滑冰。
const PACE = CONFIG.turtlePace;
const ANIM_RATE = 0.5 * PACE;

// 平常的移動速度（px/s，乘上 PACE 之前）
export const MOVE = {
  walkLand: 13,   // 岸上、曬台
  walkWater: 20,  // 淺灘、水底
  swim: 37.5,     // 游泳（再乘上品種的 swimSpeed）
  depth: 8,       // 2.5D 的前後移動
};
// 追食物時「只比平常快一點點」，而且是慢慢加速上去，不是一下子衝出去。
// 原本是走路 ×1.8、游泳 ×1.47、前後 ×3.75，而且瞬間切換，看起來像在衝。
export const FOOD_BOOST = 1.2;
const BOOST_EASE = 0.8;   // 每秒補上差距的比例：大約 1～2 秒才加速到位、放慢回來也一樣
// 所有「被動」的移動（被推開、跟著朋友）最快也不超過追食物時的游泳速度
export const MAX_SHOVE = MOVE.swim * FOOD_BOOST * PACE;

// dur 是動作速度為 1 時的秒數；動畫放慢時要播久一點，動作才做得完
const REACTIONS = {
  happy: { key: 'happy', dur: 1.8 / PACE },       // 開心：搖屁屁
  annoyed: { key: 'hide', dur: 2.2 / PACE },
  annoyedFood: { key: 'startled', dur: 1.5 / PACE }, // 食物被搶走：嚇一跳
  rescued: { key: 'happy', dur: 1.8 / PACE },
  startled: { key: 'startled', dur: 1.3 / PACE },
  eat: { key: 'eat', dur: 0.6 / PACE },           // 水裡會自動換成 eat_water（poses.js）
};

// 出門走走：每次白天閒晃決定下一件事時有多少機率想出門；走路比平常快一點；回來後隔多久才會再出門（秒）
const EXPLORE_CHANCE = 0.08;
const EXPLORE_SPEED = 1.5;
const EXPLORE_REST = [180, 420];

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

    // 被玩家的手手抓著：位置由 tank 決定，縮在殼裡等著被放下
    if (t.held) {
      t.flash = { key: 'hide', until: this.tank.time + 0.5, dur: 100 };
      t.path = [];
      t.grounded = false;
      return;
    }
    t.timer -= dt;
    t.boost ??= 1;
    t.boost += ((t.mode === 'food' || t.mode === 'chase' ? FOOD_BOOST : 1) - t.boost) * Math.min(1, dt * BOOST_EASE);

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

    // 出門走走中：先照平常的方式走上沙灘，再沿著路線在圓台上走
    if (t.mode === 'explore' && t.trip) {
      if (t.trip.stage === 'toShore') {
        if (t.path.length) {
          this.move(dt, h, foot);
          this.updateDepth(dt);
          return;
        }
        t.trip.stage = 'go';
      }
      this.explore(dt, night, foot);
      return;
    }

    // 注意四周的動靜（波紋、水草晃、小魚游過去…），有興趣就過去看或追
    this.perceive(dt, night, h, foot);

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

    if (t.mode === 'chase') this.chaseCritter(dt, w, h, foot);
    if (t.mode !== 'food' && t.mode !== 'chase' && !t.path.length && t.timer <= 0) this.decide(s, night, h, foot);

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
    // 戶外：偶爾想出門，到圓台上的小溪邊、石頭區、濕地、灌木叢下走走（生病時不想出門）
    if (this.tank.world && this.turtle.stats.health >= 50 && this.tank.time > (t.exploreAfter ?? 60)
        && Math.random() < EXPLORE_CHANCE && this.startExplore(foot)) return;

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
      const x = rand(this.terrain.ZONES.deep[0], Math.max(this.terrain.ZONES.deep[0] + 30, this.swimLimit - 20));
      const y = rand(WATER_TOP + h * 0.4, Math.max(WATER_TOP + h * 0.5, this.terrain.groundY(x) - foot - 5));
      this.planPath({ x, y, ground: false }, foot);
      t.timer = rand(2, 6);
      this.zTarget = rand(-14, 14);
    }
  }

  // ---------- 對動靜的反應（js/signals.js） ----------

  // 頭上冒一個小泡泡（符號或顏文字）
  emote(kind) {
    const list = EMOTES[kind];
    this.t.emote = { text: list[Math.floor(Math.random() * list.length)], at: this.tank.time, until: this.tank.time + 2.4 };
  }

  // 看看最近有什麼動靜：夠近、夠大、而且還有好奇心，就過去看看或追上去
  perceive(dt, night, h, foot) {
    const t = this.t;
    const bus = this.tank.signals;
    if (!bus) return;
    t.curiosity = Math.min(1, (t.curiosity ?? 0.8) + dt * 0.04); // 好奇心慢慢恢復
    const fresh = bus.since(this.seenSignal ?? 0);
    this.seenSignal = bus.seq;
    if (!fresh.length || t.mode === 'food' || t.stackOn) return;
    const x = this.tank.X(t.x);
    let best = null, bestScore = 0;
    for (const s of fresh) {
      if (s.source === this.id) continue;
      const react = TURTLE_REACT[s.type];
      if (!react) continue;
      const d = Math.hypot(s.x - x, s.z - this.z);
      if (d > s.range) continue;
      const near = 1 - d / s.range;
      if (react.startleNear && near >= react.startleNear && s.strength >= 0.6) {
        this.startle();
        return;
      }
      if (react.act === 'startle' || t.mode === 'sleep') continue; // 睡著了，小動靜吵不醒
      if (react.act === 'chase' && (t.mode === 'chase' || !s.critter)) continue;
      const score = s.strength * near * (0.4 + t.curiosity) * (react.act === 'chase' ? 1.3 : 1);
      if (score > bestScore) { bestScore = score; best = s; }
    }
    if (!best || bestScore < 0.32) return;
    if ((t.mode === 'curious' || t.mode === 'chase') && bestScore < 0.7) return; // 已經在忙了
    t.curiosity = Math.max(0, t.curiosity - 0.3);
    t.stackOn = null;
    if (TURTLE_REACT[best.type].act === 'chase') this.startChase(best.critter);
    else this.goLook(best, h, foot);
  }

  // 嚇一跳：縮進殼裡一下
  startle() {
    const t = this.t;
    this.react('annoyed');
    this.emote('startle');
    t.path = [];
    t.timer = rand(2, 3.5);
    if (t.mode === 'chase' || t.mode === 'curious') t.mode = t.grounded ? 'bask' : 'swim';
  }

  // 過去看看：水面的動靜就游到水面附近，水草的動靜就游到水草旁邊
  goLook(s, h, foot) {
    const t = this.t;
    const x = Math.max(20, Math.min(W - 15, s.x / this.tank.S + W / 2));
    const [z0, z1] = this.tank.zRange;
    t.mode = 'curious';
    this.emote('curious');
    const floor = this.terrain.groundY(x) - foot;
    if (x < this.swimLimit - 10) {
      const surface = s.type === 'ripple' || s.type === 'splash';
      const y = surface ? WATER_TOP + h * 0.35 : (WATER_TOP + floor) / 2;
      this.planPath({ x, y: Math.max(WATER_TOP + h * 0.3, Math.min(floor, y)), ground: false }, foot);
    } else {
      this.planPath({ x, ground: true }, foot);
    }
    this.zTarget = Math.max(z0, Math.min(z1, s.z));
    t.timer = rand(3, 6); // 到了之後在那裡看一會兒
  }

  startChase(critter) {
    const t = this.t;
    t.mode = 'chase';
    t.chase = { id: critter.id, until: this.tank.time + rand(6, 10), retarget: 0, tryAt: 0 };
    t.path = [];
    this.emote('notice');
  }

  // 追小魚：每隔一下重新瞄準；追到嘴邊有機會吃到，沒吃到魚就竄走
  chaseCritter(dt, w, h, foot) {
    const t = this.t, tank = this.tank;
    const fish = tank.critters?.byId(t.chase?.id);
    if (!fish || tank.time > t.chase.until) {
      if (fish) this.emote('giveUp');
      t.mode = t.grounded ? 'bask' : 'swim';
      t.chase = null;
      t.path = [];
      t.timer = rand(2, 4);
      return;
    }
    t.chase.retarget -= dt;
    if (t.chase.retarget <= 0) {
      t.chase.retarget = 0.35;
      const x = Math.max(20, Math.min(W - 15, fish.x / tank.S + W / 2));
      const floor = this.terrain.groundY(x) - foot;
      const y = Math.max(WATER_TOP + h * 0.3, Math.min(floor, H - fish.y / tank.S));
      this.planPath({ x, y, ground: false }, foot);
      const [z0, z1] = tank.zRange;
      this.zTarget = Math.max(z0, Math.min(z1, fish.z));
    }
    const headX = tank.X(t.x + t.face * w * 0.45), headY = tank.Y(t.y);
    if (tank.time > t.chase.tryAt && Math.hypot(fish.x - headX, fish.y - headY, fish.z - this.z) < 3.2) {
      t.chase.tryAt = tank.time + 1;
      if (Math.random() < 0.35) {
        tank.critters.remove(fish);
        if (tank.hooks.onEat(this.id, 'fish')) this.react('eat');
        this.emote('happy');
        t.mode = 'swim';
        t.chase = null;
        t.path = [];
        t.timer = rand(3, 5);
      } else {
        fish.burst(headX, this.z);
      }
    }
  }

  // ---------- 出門走走（只有戶外池） ----------

  startExplore(foot) {
    const t = this.t;
    const homeX = rand(640, 900);
    const trip = planTrip(this.tank.world.land, this.tank.X(homeX));
    if (!trip) return false;
    t.mode = 'explore';
    t.trip = { ...trip, pts: [...trip.route, trip.dest], i: 0, stage: 'toShore', back: false, stay: rand(25, 60) };
    t.stackOn = null;
    this.planPath({ x: rand(640, 760), ground: true }, foot);
    this.zTarget = rand(-6, 6);
    this.tank.hooks.onEvent?.(`「${this.turtle.name}」想出去走走，往${trip.label}去了。`);
    return true;
  }

  // 沿著路線走（3D 座標），到了目的地待一下，再照原路走回沙灘
  explore(dt, night, foot) {
    const t = this.t, tank = this.tank, trip = t.trip;
    let x = tank.X(t.x), z = this.z;
    if (night && !trip.back) this.headHome();
    const wp = trip.pts[trip.i];
    if (wp) {
      const dx = wp[0] - x, dz = wp[1] - z, d = Math.hypot(dx, dz);
      const step = MOVE.walkLand * EXPLORE_SPEED * PACE * t.boost * tank.S * dt;
      if (d <= step) { x = wp[0]; z = wp[1]; trip.i++; } else { x += (dx / d) * step; z += (dz / d) * step; }
      if (Math.abs(dx) > 0.2) t.face = dx > 0 ? 1 : -1;
      t.heading = Math.atan2(dz, dx);    // 往前後走的時候，畫面要選對應方向的圖
      t.path = [{ x: t.x, walk: true }]; // 只是讓姿勢播走路，實際移動在這裡
    } else if (trip.back) {
      this.endExplore(foot);
      return;
    } else {
      t.path = [];
      trip.stay -= dt;
      if (trip.stay <= 0) this.headHome();
    }
    t.x = x / tank.S + W / 2;
    this.z = this.zTarget = z;
    t.y = H - tank.world.land.height(x, z) / tank.S - foot;
    t.grounded = true;
    t.tilt *= 0.9;
  }

  headHome() {
    const trip = this.t.trip;
    trip.pts = [...trip.route].reverse().concat([trip.home]);
    trip.i = 0;
    trip.back = true;
  }

  endExplore(foot) {
    const t = this.t;
    t.mode = 'bask';
    t.trip = null;
    t.heading = null;
    t.path = [];
    t.grounded = true;
    t.y = this.terrain.groundY(t.x) - foot;
    t.timer = rand(4, 8);
    t.exploreAfter = this.tank.time + rand(...EXPLORE_REST);
  }

  // 被玩家用手手抓起來、放到 (x, z)：放在水裡就浮在水中，放在岸上就趴在地上，過一下再自己決定要做什麼
  place(x, z) {
    const t = this.t;
    const { h, foot } = this.size();
    t.held = false;
    t.trip = null;
    t.chase = null;
    t.heading = null;
    t.x = Math.max(20, Math.min(W - 15, x));
    this.z = this.zTarget = z;
    t.path = [];
    t.stackOn = null;
    t.vy = 0;
    t.tilt = 0;
    const floor = this.terrain.groundY(t.x) - foot;
    if (t.x < this.swimLimit - 10) {
      t.grounded = false;
      t.mode = 'swim';
      t.y = Math.min(floor, WATER_TOP + h * 0.6);
    } else {
      t.grounded = true;
      t.mode = 'bask';
      t.y = floor;
    }
    t.timer = rand(2, 4);
  }

  // 被別隻烏龜擠開：在地上就沿著地面移動，在水裡可以上下左右移動
  nudge(dx, dy) {
    const t = this.t;
    if (t.held || t.mode === 'explore') return;
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
        // 慢慢爬上去（跟著動作快慢），不要一下子貼上去
        t.x += (f.t.x - fs.shell * 0.08 * f.t.face - t.x) * Math.min(1, dt * 4 * PACE);
        t.y += (f.t.y - fs.h * 0.62 - t.y) * Math.min(1, dt * 4 * PACE);
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
      const speed = (inWater ? MOVE.walkWater : MOVE.walkLand) * t.boost * PACE;
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
    const speed = MOVE.swim * this.species.swimSpeed * cold * t.boost * PACE;
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
    const speed = MOVE.depth * (this.t.boost ?? 1) * PACE;
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
