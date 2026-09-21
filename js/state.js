import { CONFIG } from './config.js';
import { getSpecies } from './species.js';

export const MAX_TURTLES = 4;

// 隨機取名用的寵物名
const PET_NAMES = [
  '小斑', '豆豆', '麻糬', '布丁', '湯圓', '芝麻', '波波', '嘟嘟', '球球', '綠豆',
  '毛豆', '丸子', '奶茶', '可可', '咕嚕', '慢慢', '小石頭', '海苔', '栗子', '米果',
  '阿龜', '胖胖', '小寶', '橘子', '花生', '黑糖', '年糕', '仙草', '菜頭', '小鼓',
];

export function randomName(taken = []) {
  const free = PET_NAMES.filter(n => !taken.includes(n));
  const pool = free.length ? free : PET_NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function newTurtle(speciesId, taken = []) {
  const sp = getSpecies(speciesId);
  return {
    id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: randomName(taken),
    species: sp.id,
    length: sp.startLength,
    ageHours: 0,
    stats: { hunger: 70, sun: 60, health: 90, mood: 70 },
    lastFood: { pellet: 0, shrimp: 0, veggie: 0 },
    vetReadyAt: 0,
    plays: [],
    alerts: {},
    history: [{ day: 0, len: sp.startLength }], // 成長紀錄
    eaten: {},                                  // 各種食物吃過幾次
    flipped: false,                             // 翻身卡住
    shedAt: 0,                                  // 最近一次脫皮的時間
  };
}

// 新遊戲：一缸兩隻斑龜
export function newState() {
  const now = Date.now();
  const a = newTurtle('bangui');
  const b = newTurtle('bangui', [a.name]);
  return {
    version: 4,
    createdAt: now,
    lastRealTime: now,
    gameTime: now,
    tank: { water: 90, temp: 26 },
    lamp: { on: false, timer: true },
    equip: { filter: 'small', lamp: 'uvb', heater: false },
    turtles: [a, b],
    relations: {},
    alerts: {},
    log: [],
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function save(s) {
  try { localStorage.setItem(CONFIG.saveKey, JSON.stringify(s)); } catch {}
}

export function clear() {
  try { localStorage.removeItem(CONFIG.saveKey); } catch {}
}

export function isValidSave(s) {
  if (!s || typeof s !== 'object' || typeof s.gameTime !== 'number') return false;
  return Array.isArray(s.turtles) ? s.turtles.length > 0 : !!(s.turtle && s.stats);
}

// 舊版存檔補齊成新版格式
function migrate(s) {
  if (!isValidSave(s)) return null;
  if (!s.turtles) {
    // 第 1 版：只有一隻烏龜，數值和水質放在一起 → 拆成整缸共用和每隻各自的，並再放一隻斑龜作伴
    const { water, ...stats } = s.stats;
    const first = {
      ...newTurtle('bangui'),
      name: s.turtle.name,
      species: s.turtle.species || 'bangui',
      length: s.turtle.length,
      ageHours: s.turtle.ageHours,
      stats,
      lastFood: s.lastFood || { pellet: 0, shrimp: 0, veggie: 0 },
      vetReadyAt: s.vetReadyAt || 0,
      plays: s.plays || [],
      alerts: { ...s.alerts, water: undefined },
    };
    const buddy = newTurtle('bangui', [first.name]);
    s = {
      version: 2,
      createdAt: s.createdAt,
      lastRealTime: s.lastRealTime,
      gameTime: s.gameTime,
      tank: { water },
      lamp: s.lamp,
      turtles: [first, buddy],
      alerts: { water: s.alerts?.water },
      log: s.log || [],
      migratedBuddy: buddy.name,
    };
  }
  // 第 3 版：加入水溫和設備
  s.tank.temp ??= 26;
  s.equip ??= { filter: 'small', lamp: 'uvb', heater: false };
  // 第 4 版：關係、成長紀錄、食物統計、事件
  s.relations ??= {};
  for (const t of s.turtles) {
    t.history ??= [{ day: Math.floor(t.ageHours / 24), len: +t.length.toFixed(2) }];
    t.eaten ??= {};
    t.flipped ??= false;
    t.shedAt ??= 0;
  }
  s.version = 4;
  return s;
}

export function addLog(s, text) {
  s.log.unshift({ t: s.gameTime, text });
  if (s.log.length > 80) s.log.length = 80;
}

export function findTurtle(s, id) {
  return s.turtles.find(t => t.id === id);
}
