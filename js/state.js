import { CONFIG } from './config.js';
import { getSpecies } from './species.js';

export const MAX_TURTLES = 8;

// 存檔版號。存檔格式一改就 +1。
// 讀檔時版號不合的存檔會整份丟掉、重新開始，不做舊格式升級——
// 與其讓半舊的資料混在裡面跑出奇怪的狀態，不如乾脆重來。
export const SAVE_VERSION = 5;

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
    version: SAVE_VERSION,
    createdAt: now,
    lastRealTime: now,
    gameTime: now,
    tank: { water: 90, temp: 26 },
    lamp: { on: false, timer: true },
    equip: { filter: 'small', lamp: 'uvb', heater: false },
    scene: 'indoor60',
    turtles: [a, b],
    relations: {},
    alerts: {},
    log: [],
  };
}

export function load() {
  let raw;
  try {
    raw = localStorage.getItem(CONFIG.saveKey);
  } catch {
    return null;
  }
  if (!raw) return null;

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    clear();
    return null;
  }

  if (!isValidSave(data)) {
    // 版號不合或格式壞掉：直接刪掉，下次開就是全新的一缸
    clear();
    return null;
  }

  return cleanSave(data);
}

export function save(s) {
  // 正在清除網頁紀錄（index.html 的 hardReset）：不要把舊存檔寫回去
  if (globalThis.__banGuiResetting) return;
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify({ ...s, version: SAVE_VERSION }));
  } catch {}
}

export function clear() {
  try { localStorage.removeItem(CONFIG.saveKey); } catch {}
}

// 這份存檔能不能用：版號要對得上，基本結構也要在
export function isValidSave(s) {
  if (!s || typeof s !== 'object') return false;
  if (s.version !== SAVE_VERSION) return false;
  if (typeof s.gameTime !== 'number') return false;
  return Array.isArray(s.turtles) && s.turtles.some(isValidTurtle);
}

function isValidTurtle(t) {
  return !!t
    && typeof t === 'object'
    && typeof t.id === 'string'
    && typeof t.name === 'string'
    && typeof t.length === 'number'
    && Number.isFinite(t.length)
    && !!t.stats
    && typeof t.stats.hunger === 'number';
}

// 版號對得上、但裡面有壞掉的紀錄時，把那幾筆刪掉（而不是整份丟掉）
function cleanSave(s) {
  const dropped = [];

  const turtles = s.turtles.filter(t => {
    if (isValidTurtle(t)) return true;
    dropped.push(`烏龜 ${t?.name ?? t?.id ?? '(無名)'}`);
    return false;
  });
  s.turtles = turtles.slice(0, MAX_TURTLES);
  if (turtles.length > MAX_TURTLES) dropped.push(`超過 ${MAX_TURTLES} 隻的部分`);

  const ids = new Set(s.turtles.map(t => t.id));

  // 關係表裡指向已經不存在的烏龜的紀錄
  if (s.relations && typeof s.relations === 'object') {
    for (const key of Object.keys(s.relations)) {
      const pair = key.split('|');
      if (pair.length !== 2 || !pair.every(id => ids.has(id))) {
        delete s.relations[key];
        dropped.push(`關係 ${key}`);
      }
    }
  } else {
    s.relations = {};
  }

  // 壞掉的日誌
  if (Array.isArray(s.log)) {
    const log = s.log.filter(e => e && typeof e.t === 'number' && typeof e.text === 'string');
    if (log.length !== s.log.length) dropped.push(`${s.log.length - log.length} 筆日誌`);
    s.log = log;
  } else {
    s.log = [];
  }

  if (dropped.length) {
    console.warn('[存檔] 刪掉不符合格式的紀錄：', dropped.join('、'));
    s.droppedRecords = dropped;
  }

  return s;
}

export function addLog(s, text) {
  s.log.unshift({ t: s.gameTime, text });
  if (s.log.length > 80) s.log.length = 80;
}

export function findTurtle(s, id) {
  return s.turtles.find(t => t.id === id);
}
