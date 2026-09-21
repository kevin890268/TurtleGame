import { CONFIG } from './config.js';

export function newState(name) {
  const now = Date.now();
  return {
    version: 1,
    createdAt: now,
    lastRealTime: now,
    gameTime: now,
    turtle: { name, length: CONFIG.startLength, ageHours: 0 },
    stats: { hunger: 70, water: 90, sun: 60, health: 90, mood: 70 },
    lamp: { on: false, timer: true },
    lastFood: { pellet: 0, shrimp: 0, veggie: 0 },
    vetReadyAt: 0,
    plays: [],
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
  return s && typeof s === 'object' && s.turtle && s.stats && typeof s.gameTime === 'number';
}

// 之後存檔格式有改時，在這裡把舊版補齊欄位
function migrate(s) {
  return isValidSave(s) ? s : null;
}

export function addLog(s, text) {
  s.log.unshift({ t: s.gameTime, text });
  if (s.log.length > 80) s.log.length = 80;
}
