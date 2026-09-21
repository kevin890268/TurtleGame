// 遊戲規則：數值隨時間變化，以及玩家動作的效果。與畫面無關，離線補算也走這裡。
import { CONFIG } from './config.js';
import { addLog } from './state.js';

export const FOODS = {
  pellet: { name: '烏龜飼料', pieces: 6, hunger: 4, dirt: 0.4, mood: 0 },
  shrimp: { name: '蝦乾', pieces: 3, hunger: 7, dirt: 1.2, mood: 3 },
  veggie: { name: '蔬菜', pieces: 3, hunger: 3, dirt: 0.3, mood: 1 },
};

const H = 3.6e6;
export const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export function stageOf(len) {
  return len < 6 ? '幼龜' : len < 12 ? '亞成龜' : '成龜';
}

export function hourOf(s) {
  const d = new Date(s.gameTime);
  return d.getHours() + d.getMinutes() / 60;
}

export function isNight(s) {
  const h = hourOf(s);
  return h < CONFIG.dayStart || h >= CONFIG.nightStart;
}

// 推進遊戲時間 hours 小時，回傳期間發生的事件訊息
export function advance(s, hours) {
  const events = [];
  const stepH = CONFIG.stepMinutes / 60;
  let left = hours;
  while (left > 1e-9) {
    const h = Math.min(stepH, left);
    step(s, h, events);
    left -= h;
  }
  return events;
}

function step(s, h, events) {
  const st = s.stats;
  const len = s.turtle.length;
  const night = isNight(s);
  const hr = hourOf(s);

  if (s.lamp.timer) s.lamp.on = hr >= CONFIG.lampTimer.on && hr < CONFIG.lampTimer.off;

  // 小烏龜代謝快、容易餓；晚上睡覺消耗少
  const hungerRate = len < 6 ? 1.5 : len < 12 ? 1.1 : 0.8;
  st.hunger -= hungerRate * h * (night ? 0.5 : 1);
  // 烏龜越大，水髒得越快
  st.water -= (0.9 + len * 0.04) * h;

  if (night) {
    st.sun -= 0.5 * h;
    if (s.lamp.on) st.mood -= 6 * h; // 晚上開燈睡不好
  } else {
    st.sun += (s.lamp.on ? 12 : -4) * h;
  }

  let harm = 0;
  if (st.hunger < 15) harm += 1.2;
  if (st.water < 20) harm += 1.0;
  if (st.sun < 15) harm += 0.6;
  if (night && s.lamp.on) harm += 0.3;
  if (harm > 0) st.health -= harm * h;
  else if (st.hunger > 40 && st.water > 50 && st.sun > 40) st.health += 1.5 * h;

  const care = (st.hunger + st.water + st.sun + st.health) / 4;
  st.mood += (care - st.mood) * Math.min(1, 0.15 * h);

  if (st.hunger > 30 && st.health > 40) {
    const room = Math.max(0, 1 - len / CONFIG.maxLength);
    const before = stageOf(len);
    s.turtle.length += CONFIG.growthPerHour * (care / 100) * room * dietBonus(s) * h;
    const after = stageOf(s.turtle.length);
    if (after !== before) {
      const msg = `${s.turtle.name} 長大成${after}了！背甲 ${s.turtle.length.toFixed(1)} 公分。`;
      addLog(s, msg);
      events.push(msg);
    }
  }

  for (const k of Object.keys(st)) st[k] = clamp(st[k]);
  s.turtle.ageHours += h;
  s.gameTime += h * H;
  checkAlerts(s, events);
}

// 三天內吃過越多種食物，長得越好
function dietBonus(s) {
  const kinds = Object.values(s.lastFood).filter(t => t && s.gameTime - t < 72 * H).length;
  return 0.8 + 0.2 * kinds;
}

const ALERTS = [
  { key: 'hunger', below: 25, text: n => `${n} 肚子餓了，在水面東張西望。` },
  { key: 'water', below: 30, text: () => '水變混濁了，該換水囉。' },
  { key: 'sun', below: 25, text: n => `${n} 曬背不足，記得開曬背燈。` },
  { key: 'health', below: 35, text: n => `${n} 看起來沒什麼精神，可能生病了…` },
];

function checkAlerts(s, events) {
  for (const a of ALERTS) {
    const v = s.stats[a.key];
    if (v < a.below && !s.alerts[a.key]) {
      s.alerts[a.key] = true;
      const msg = a.text(s.turtle.name);
      addLog(s, msg);
      events.push(msg);
    } else if (v > a.below + 15) {
      s.alerts[a.key] = false;
    }
  }
}

// ---- 玩家動作：回傳要顯示的提示文字 ----

export function eat(s, type) {
  const f = FOODS[type];
  const st = s.stats;
  if (st.hunger >= 98) return false;
  // 小烏龜偏肉食，蔬菜吃得少
  const gain = type === 'veggie' && s.turtle.length < 6 ? f.hunger * 0.5 : f.hunger;
  st.hunger = clamp(st.hunger + gain);
  st.water = clamp(st.water - f.dirt);
  st.mood = clamp(st.mood + f.mood);
  s.lastFood[type] = s.gameTime;
  return true;
}

export function rot(s) {
  s.stats.water = clamp(s.stats.water - 2.5);
}

export function feedMessage(s, type) {
  const name = s.turtle.name;
  addLog(s, `餵了${FOODS[type].name}。`);
  if (isNight(s)) return `${name} 在睡覺，晚上餵的食物可能會泡爛喔。`;
  if (s.stats.hunger >= 90) return `${name} 還很飽，吃不完的食物會弄髒水。`;
  if (type === 'veggie' && s.turtle.length < 6) return '小烏龜比較愛吃肉，蔬菜只會吃一點點。';
  return null;
}

export function changeWater(s) {
  s.stats.water = 100;
  s.stats.mood = clamp(s.stats.mood - 3);
  addLog(s, '換了一缸乾淨的水。');
  return '水變清澈了！';
}

export function toggleLamp(s) {
  s.lamp.on = !s.lamp.on;
  let msg = s.lamp.on ? '曬背燈打開了。' : '曬背燈關掉了。';
  if (s.lamp.timer) {
    s.lamp.timer = false;
    msg += '（已關閉定時器，改成手動）';
  }
  if (s.lamp.on && isNight(s)) msg += ' 晚上開燈會吵到牠睡覺喔。';
  return msg;
}

export function setTimer(s, on) {
  s.lamp.timer = on;
  if (on) {
    const hr = hourOf(s);
    s.lamp.on = hr >= CONFIG.lampTimer.on && hr < CONFIG.lampTimer.off;
  }
  return on ? '定時器開啟：每天 08:00 開燈、18:00 關燈。' : '定時器關閉。';
}

export function play(s) {
  const name = s.turtle.name;
  s.plays = s.plays.filter(t => s.gameTime - t < H);
  if (isNight(s)) {
    s.stats.mood = clamp(s.stats.mood - 4);
    return `${name} 睡得正香，被吵醒有點不高興。`;
  }
  if (s.plays.length >= 3) {
    s.stats.mood = clamp(s.stats.mood - 6);
    return `${name} 被打擾太多次，縮進殼裡了。`;
  }
  s.plays.push(s.gameTime);
  s.stats.mood = clamp(s.stats.mood + 8);
  return `${name} 伸長脖子看著你。`;
}

export function vet(s) {
  if (s.stats.health >= 40) return '牠很健康，不需要看獸醫。';
  if (s.gameTime < s.vetReadyAt) return '剛看過獸醫，讓牠休息一下。';
  s.stats.health = 75;
  s.stats.mood = clamp(s.stats.mood - 10);
  s.vetReadyAt = s.gameTime + 24 * H;
  addLog(s, '帶去看獸醫，打了針也拿了藥。');
  return '看完獸醫，精神好多了。';
}
