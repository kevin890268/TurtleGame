// 遊戲規則：數值隨時間變化，以及玩家動作的效果。與畫面無關，離線補算也走這裡。
// 整缸共用：水質、曬背燈、時間；每隻烏龜各自：飽足、日照、健康、心情、成長。
import { CONFIG } from './config.js';
import { addLog } from './state.js';
import { getSpecies, stageOf } from './species.js';

export { stageOf };

export const FOODS = {
  pellet: { name: '烏龜飼料', hunger: 4, dirt: 0.4, mood: 0 },
  shrimp: { name: '蝦乾', hunger: 7, dirt: 1.2, mood: 3 },
  veggie: { name: '蔬菜', hunger: 3, dirt: 0.3, mood: 1 },
};

// 設備
export const FILTERS = {
  none: { name: '沒有過濾器', dirt: 1.6 },
  small: { name: '小型過濾器', dirt: 1 },
  strong: { name: '強力過濾器', dirt: 0.55, current: true }, // 水流強，小烏龜會累
};
export const LAMPS = {
  heat: { name: '保溫燈', sun: 0.5 },   // 只有熱度沒有 UVB，日照只漲一半
  uvb: { name: 'UVB 曬背燈', sun: 1 },
};
export const HEATER_SET = 26;

// 台灣室內的月均溫（大約值，1～12 月），水溫會慢慢接近室溫
const ROOM_TEMP = [17, 18, 20, 23, 26, 28, 30, 29, 28, 25, 22, 19];

export function roomTemp(s) {
  const d = new Date(s.gameTime);
  const hour = d.getHours() + d.getMinutes() / 60;
  // 下午三點最暖、清晨最冷
  return ROOM_TEMP[d.getMonth()] + 1.5 * Math.sin(((hour - 9) / 24) * Math.PI * 2);
}

const H = 3.6e6;
export const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

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
  const night = isNight(s);
  const hr = hourOf(s);

  if (s.lamp.timer) s.lamp.on = hr >= CONFIG.lampTimer.on && hr < CONFIG.lampTimer.off;

  // 水溫：慢慢接近室溫；開加溫棒時不會低於設定溫度；曬背燈開著會稍微加溫
  let target = roomTemp(s) + (s.lamp.on ? 0.5 : 0);
  if (s.equip.heater) target = Math.max(target, HEATER_SET);
  s.tank.temp += (target - s.tank.temp) * Math.min(1, 0.3 * h);

  // 水質：基本消耗加上每隻烏龜弄髒的量（越大隻、越多隻，髒得越快），過濾器越強髒得越慢
  let dirt = 0.5;
  for (const t of s.turtles) dirt += (0.4 + t.length * 0.04) * getSpecies(t.species).rates.dirt;
  s.tank.water = clamp(s.tank.water - dirt * FILTERS[s.equip.filter].dirt * h);

  for (const t of s.turtles) stepTurtle(s, t, h, night, events);

  s.gameTime += h * H;
  checkTankAlerts(s, events);
}

function stepTurtle(s, t, h, night, events) {
  const st = t.stats;
  const sp = getSpecies(t.species);
  const len = t.length;
  const water = s.tank.water;
  const temp = s.tank.temp;
  // 變溫動物：水溫低代謝就慢（24～30℃ 最有活力）
  const warmth = temp >= 24 ? 1 : temp <= 15 ? 0.25 : 0.25 + 0.75 * (temp - 15) / 9;

  // 小烏龜代謝快、容易餓；晚上睡覺消耗少；冷的時候也吃得少
  const hungerRate = len < sp.stages[0] ? 1.5 : len < sp.stages[1] ? 1.1 : 0.8;
  st.hunger -= hungerRate * sp.rates.hunger * warmth * h * (night ? 0.5 : 1);

  if (night) {
    st.sun -= 0.5 * sp.rates.sun * h;
    if (s.lamp.on) st.mood -= 6 * h; // 晚上開燈睡不好
  } else {
    st.sun += (s.lamp.on ? 12 * LAMPS[s.equip.lamp].sun : -4 * sp.rates.sun) * h;
  }

  // 強力過濾器水流大，小烏龜游得很累
  if (FILTERS[s.equip.filter].current && (len < sp.stages[0] || sp.swimSpeed < 0.7)) st.mood -= 1.5 * h;

  // 每個品種能忍受的程度不同（例如地圖龜對水質很敏感）
  let harm = 0;
  if (st.hunger < sp.harmBelow.hunger) harm += 1.2;
  if (water < sp.harmBelow.water) harm += 1.0;
  if (st.sun < sp.harmBelow.sun) harm += 0.6;
  if (night && s.lamp.on) harm += 0.3;
  if (temp < 15) harm += 0.5;   // 太冷
  if (temp > 33) harm += 0.8;   // 太熱
  if (harm > 0) st.health -= harm * h;
  else if (st.hunger > 40 && water > Math.max(50, sp.harmBelow.water + 15) && st.sun > 40) st.health += 1.5 * h;

  const care = (st.hunger + water + st.sun + st.health) / 4;
  st.mood += (care - st.mood) * Math.min(1, 0.15 * h);

  if (st.hunger > 30 && st.health > 40) {
    const room = Math.max(0, 1 - len / sp.maxLength);
    const before = stageOf(len, sp);
    t.length += CONFIG.growthPerHour * sp.growth * (care / 100) * room * dietBonus(s, t) * warmth * h;
    const after = stageOf(t.length, sp);
    if (after !== before) {
      const msg = `${t.name} 長大成${after}了！背甲 ${t.length.toFixed(1)} 公分。`;
      addLog(s, msg);
      events.push(msg);
    }
  }

  for (const k of Object.keys(st)) st[k] = clamp(st[k]);
  t.ageHours += h;
  checkTurtleAlerts(s, t, events);
}

// 三天內吃過越多種食物，長得越好
function dietBonus(s, t) {
  const kinds = Object.values(t.lastFood).filter(time => time && s.gameTime - time < 72 * H).length;
  return 0.8 + 0.2 * kinds;
}

const TURTLE_ALERTS = [
  { key: 'hunger', below: 25, text: n => `${n} 肚子餓了，在水面東張西望。` },
  { key: 'sun', below: 25, text: n => `${n} 曬背不足，記得開曬背燈。` },
  { key: 'health', below: 35, text: n => `${n} 看起來沒什麼精神，可能生病了…` },
];

function checkTurtleAlerts(s, t, events) {
  for (const a of TURTLE_ALERTS) {
    const v = t.stats[a.key];
    if (v < a.below && !t.alerts[a.key]) {
      t.alerts[a.key] = true;
      const msg = a.text(t.name);
      addLog(s, msg);
      events.push(msg);
    } else if (v > a.below + 15) {
      t.alerts[a.key] = false;
    }
  }
}

function checkTankAlerts(s, events) {
  const temp = s.tank.temp;
  if (temp < 18 && !s.alerts.cold) {
    s.alerts.cold = true;
    const msg = `水溫只有 ${temp.toFixed(1)}℃，烏龜會懶得動、吃得少，考慮開加溫棒。`;
    addLog(s, msg);
    events.push(msg);
  } else if (temp > 21) {
    s.alerts.cold = false;
  }
  const v = s.tank.water;
  if (v < 30 && !s.alerts.water) {
    s.alerts.water = true;
    const msg = '水變混濁了，該換水囉。';
    addLog(s, msg);
    events.push(msg);
  } else if (v > 45) {
    s.alerts.water = false;
  }
}

// ---- 玩家動作：回傳要顯示的提示文字 ----

export function eat(s, t, type) {
  const f = FOODS[type];
  const st = t.stats;
  const sp = getSpecies(t.species);
  if (st.hunger >= 98) return false;
  // 各品種偏好不同；小烏龜偏肉食，蔬菜吃得少
  let gain = f.hunger * sp.diet[type];
  if (type === 'veggie' && t.length < sp.stages[0]) gain *= 0.5;
  st.hunger = clamp(st.hunger + gain);
  st.mood = clamp(st.mood + f.mood);
  s.tank.water = clamp(s.tank.water - f.dirt);
  t.lastFood[type] = s.gameTime;
  return true;
}

export function rot(s) {
  s.tank.water = clamp(s.tank.water - 2.5);
}

export function feedMessage(s, type) {
  addLog(s, `餵了${FOODS[type].name}。`);
  if (isNight(s)) return '大家都在睡覺，晚上餵的食物可能會泡爛喔。';
  if (s.turtles.every(t => t.stats.hunger >= 90)) return '大家都還很飽，吃不完的食物會弄髒水。';
  const picky = s.turtles.filter(t => {
    const sp = getSpecies(t.species);
    return sp.diet.veggie < 0.5 || t.length < sp.stages[0];
  });
  if (type === 'veggie' && picky.length === s.turtles.length) return '牠們比較愛吃肉，蔬菜只會吃一點點。';
  return null;
}

export function changeWater(s) {
  s.tank.water = 100;
  for (const t of s.turtles) t.stats.mood = clamp(t.stats.mood - 3);
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
  if (s.lamp.on && isNight(s)) msg += ' 晚上開燈會吵到牠們睡覺喔。';
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

// 回傳 { msg, happy }：happy 表示牠開心（畫面會播開心的反應）
export function play(s, t) {
  const name = t.name;
  t.plays = t.plays.filter(time => s.gameTime - time < H);
  if (isNight(s)) {
    t.stats.mood = clamp(t.stats.mood - 4);
    return { msg: `${name} 睡得正香，被吵醒有點不高興。`, happy: false };
  }
  if (t.plays.length >= 3) {
    t.stats.mood = clamp(t.stats.mood - 6);
    return { msg: `${name} 被打擾太多次，縮進殼裡了。`, happy: false };
  }
  t.plays.push(s.gameTime);
  t.stats.mood = clamp(t.stats.mood + 8);
  return { msg: `${name} 伸長脖子看著你。`, happy: true };
}

export function vet(s, t) {
  if (t.stats.health >= 40) return `${t.name} 很健康，不需要看獸醫。`;
  if (s.gameTime < t.vetReadyAt) return `${t.name} 剛看過獸醫，讓牠休息一下。`;
  t.stats.health = 75;
  t.stats.mood = clamp(t.stats.mood - 10);
  t.vetReadyAt = s.gameTime + 24 * H;
  addLog(s, `帶 ${t.name} 去看獸醫，打了針也拿了藥。`);
  return `${t.name} 看完獸醫，精神好多了。`;
}

// ---- 設備 ----

export function setFilter(s, kind) {
  s.equip.filter = kind;
  addLog(s, `換成${FILTERS[kind].name}。`);
  if (kind === 'none') return '沒有過濾器，水會髒得很快。';
  if (kind === 'strong') return '強力過濾器水很乾淨，但水流大，小烏龜會游得很累。';
  return '換成小型過濾器。';
}

export function setLamp(s, kind) {
  s.equip.lamp = kind;
  addLog(s, `燈具換成${LAMPS[kind].name}。`);
  return kind === 'heat' ? '保溫燈只有熱度沒有 UVB，曬背的效果只有一半。' : '換上 UVB 曬背燈，曬背效果完整。';
}

export function setHeater(s, on) {
  s.equip.heater = on;
  addLog(s, on ? '打開加溫棒。' : '關掉加溫棒。');
  return on ? `加溫棒打開了，水溫會慢慢升到 ${HEATER_SET}℃。` : '加溫棒關掉了，水溫會跟著室溫變化。';
}

// ---- 時間 ----

// 快轉：真的經過這段時間（烏龜會變餓、水會變髒）
export function fastForward(s, hours) {
  const events = advance(s, hours);
  addLog(s, `時間快轉了 ${hours} 小時。`);
  return events;
}

// 調時鐘：只改時刻，不模擬中間的時間（給作息跟遊戲對不上的人用）
export function setClock(s, hh, mm) {
  const d = new Date(s.gameTime);
  d.setHours(hh, mm, 0, 0);
  s.gameTime = d.getTime();
  if (s.lamp.timer) s.lamp.on = hh + mm / 60 >= CONFIG.lampTimer.on && hh + mm / 60 < CONFIG.lampTimer.off;
  const text = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  addLog(s, `把時鐘調到 ${text}。`);
  return `時鐘調到 ${text} 了。`;
}

export function rename(s, t, name) {
  const old = t.name;
  t.name = name;
  addLog(s, `${old} 改名叫 ${name} 了。`);
  return `${old} 現在叫 ${name} 了！`;
}
