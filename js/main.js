import { CONFIG } from './config.js';
import { newState, load, save, clear, isValidSave, addLog } from './state.js';
import * as sim from './sim.js';
import { loadAssets } from './assets.js';
import { loadPoses } from './poses.js';
import * as ui from './ui.js';

const $ = id => document.getElementById(id);
const HOUR = 3.6e6;
const VIEW_KEY = 'banGui.view';

function getView() {
  try { return localStorage.getItem(VIEW_KEY) || '3d'; } catch { return '3d'; }
}

// 2.5D 需要從網路載入 Three.js，載入失敗就退回 2D
async function loadTankClass(view) {
  if (view === '3d') {
    try {
      return (await import('./tank3d.js')).Tank3D;
    } catch (e) {
      console.error(e);
      ui.toast('2.5D 畫面載入失敗（需要網路），先用 2D 顯示。');
    }
  }
  return (await import('./tank.js')).Tank;
}

let state = load();
let tank = null;

// 把現實經過的時間換算成遊戲時間並推進。離開太久的話只補算最後 maxOfflineHours 小時。
function catchUp() {
  const now = Date.now();
  let hours = (now - state.lastRealTime) * CONFIG.timeScale / HOUR;
  state.lastRealTime = now;
  if (hours <= 0) return { hours: 0, events: [] };
  const total = hours;
  if (hours > CONFIG.maxOfflineHours) {
    state.gameTime += (hours - CONFIG.maxOfflineHours) * HOUR;
    hours = CONFIG.maxOfflineHours;
  }
  return { hours: total, events: sim.advance(state, hours) };
}

function welcomeBack() {
  const before = { ...state.stats };
  const { hours } = catchUp();
  if (hours < 0.25) return;
  const lost = Object.entries(before)
    .filter(([k]) => ['hunger', 'water', 'sun'].includes(k))
    .map(([k, v]) => v - state.stats[k]);
  const text = hours >= 1
    ? `你離開了 ${hours.toFixed(1)} 小時。`
    : `你離開了 ${Math.round(hours * 60)} 分鐘。`;
  addLog(state, text);
  ui.toast(lost.some(d => d > 20) ? `${text}快去看看 ${state.turtle.name} 吧！` : `歡迎回來！${text}`);
}

function tick() {
  const { events } = catchUp();
  if (events.length) ui.toast(events[events.length - 1]);
  ui.render(state, tank);
}

function act(msg) {
  if (msg) ui.toast(msg);
  save(state);
  ui.render(state, tank);
}

function bindActions() {
  document.querySelector('.actions').addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const type = btn.dataset.food;
    switch (btn.dataset.act) {
      case 'feed': selectFood(type); break;
      case 'water':
        tank.react('startled');
        act(sim.changeWater(state));
        break;
      case 'lamp': act(sim.toggleLamp(state)); break;
      case 'play': poke(); break;
      case 'vet': act(sim.vet(state)); break;
    }
  });
  $('chkTimer').addEventListener('change', e => act(sim.setTimer(state, e.target.checked)));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && tank.tool) selectFood(tank.tool);
  });

  $('btnExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = `斑龜存檔-${state.turtle.name}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('btnImport').addEventListener('click', () => $('fileImport').click());
  $('fileImport').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!isValidSave(data)) throw new Error('bad save');
      if (!confirm(`要用「${data.turtle.name}」的存檔取代目前進度嗎？`)) return;
      save(data);
      location.reload();
    } catch {
      ui.toast('這不是有效的存檔檔案。');
    }
  });
  $('btnReset').addEventListener('click', () => {
    if (!confirm(`確定要重新開始嗎？${state.turtle.name} 的紀錄會被清除（建議先匯出存檔）。`)) return;
    clear();
    location.reload();
  });
}

// 投餵模式：選了食物之後，點水缸哪裡就在那裡丟一顆；再按一次同一個按鈕或按 Esc 取消
function selectFood(type) {
  const next = tank.tool === type ? null : type;
  tank.setTool(next);
  for (const b of document.querySelectorAll('button[data-act="feed"]')) {
    b.classList.toggle('on', b.dataset.food === next);
  }
  if (next) ui.toast(`點水缸就會丟一顆${sim.FOODS[next].name}（再按一次按鈕取消）`);
}

let lastFeedLog = 0;
function onDrop(type) {
  // 連續丟食物只記一次日誌，避免洗版
  const now = Date.now();
  if (now - lastFeedLog > 20000) act(sim.feedMessage(state, type));
  lastFeedLog = now;
}

function poke() {
  const msg = sim.play(state);
  tank.react(msg.includes('看著你') ? 'happy' : 'annoyed');
  act(msg);
}

async function start() {
  welcomeBack();
  ui.buildStats();
  const view = getView();
  const btnView = $('btnView');
  btnView.textContent = view === '3d' ? '切換成 2D' : '切換成 2.5D';
  btnView.addEventListener('click', () => {
    save(state);
    try { localStorage.setItem(VIEW_KEY, view === '3d' ? '2d' : '3d'); } catch {}
    location.reload();
  });

  const [assets, poses, Tank] = await Promise.all([loadAssets(), loadPoses(), loadTankClass(view)]);
  assets.poses = poses;
  tank = new Tank($('tank'), () => state, assets, {
    onEat: type => sim.eat(state, type),
    onRot: n => {
      for (let i = 0; i < n; i++) sim.rot(state);
      ui.toast('有食物沒吃完，泡在水裡爛掉了…');
    },
    onPoke: poke,
    onDrop,
  });
  if (CONFIG.timeScale !== 1) window.debug = { tank, state: () => state };
  bindActions();
  ui.render(state, tank);

  let last = performance.now();
  const frame = now => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    tank.update(dt);
    tank.draw();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  setInterval(tick, 1000);
  setInterval(() => save(state), 15000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save(state);
    else welcomeBack();
  });
  window.addEventListener('pagehide', () => save(state));
}

function askName() {
  const modal = $('nameModal');
  modal.hidden = false;
  $('nameInput').focus();
  $('nameForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('nameInput').value.trim() || '小斑';
    state = newState(name);
    addLog(state, `${name} 來到新家了！`);
    save(state);
    modal.hidden = true;
    start();
  });
}

if (state) start();
else askName();
