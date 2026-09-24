import { CONFIG } from './config.js';
import { newState, newTurtle, load, save, clear, isValidSave, addLog, findTurtle, MAX_TURTLES, SAVE_VERSION } from './state.js';
import * as sim from './sim.js';
import { loadAssets } from './assets.js';
import { loadPoses, loadPoseIndex } from './poses.js';
import { SPECIES_LIST, getSpecies } from './species.js';
import * as ui from './ui.js';
import { initMenu } from './menu.js';
import { Requests, REQUEST_TYPES } from './requests.js';

const $ = id => document.getElementById(id);
const HOUR = 3.6e6;
const VIEW_KEY = 'banGui.view';
const SPEED_KEY = 'banGui.speed';

// 玩家調的時間速度（1～10 倍），只在網頁開著、看得到的時候有效
let speed = 1;
try { speed = Math.min(10, Math.max(1, Number(localStorage.getItem(SPEED_KEY)) || 1)); } catch {}

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
let assets = null;
let selectedId = null;
let posesReady = [];   // 有姿勢圖的品種（assets/poses/index.json）

const selected = () => findTurtle(state, selectedId) || state.turtles[0];

// 把現實經過的時間換算成遊戲時間並推進。離開太久的話只補算最後 maxOfflineHours 小時。
// scale 是玩家調的速度；離開網頁的時間一律用 1 倍
function catchUp(scale = 1) {
  const now = Date.now();
  let hours = (now - state.lastRealTime) * CONFIG.timeScale * scale / HOUR;
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
  const before = state.turtles.map(t => t.stats.hunger);
  const water = state.tank.water;
  const { hours } = catchUp();
  if (hours < 0.25) return;
  const worried = state.tank.water < water - 20 || state.turtles.some((t, i) => before[i] - t.stats.hunger > 20);
  const text = hours >= 1
    ? `你離開了 ${hours.toFixed(1)} 小時。`
    : `你離開了 ${Math.round(hours * 60)} 分鐘。`;
  addLog(state, text);
  ui.toast(worried ? `${text}快去看看牠們吧！` : `歡迎回來！${text}`);
}

function refresh() {
  ui.render(state, tank, selected().id);
}

function tick() {
  const { events } = catchUp(document.hidden ? 1 : speed);
  if (events.length) ui.toast(events[events.length - 1]);
  refresh();
}

function act(msg) {
  if (msg) ui.toast(msg);
  save(state);
  refresh();
}

function select(id) {
  selectedId = id;
  tank.setSelected(id);
  refresh();
}

// ---------- 烏龜：改名、新增 ----------

function openModal(id) {
  $(id).hidden = false;
}

function closeModals() {
  for (const m of document.querySelectorAll('.modal')) m.hidden = true;
}

let renamingId = null;
function openRename(id) {
  const t = findTurtle(state, id);
  if (!t) return;
  renamingId = id;
  $('renameTitle').textContent = `幫 ${t.name} 改名字`;
  $('renameInput').value = t.name;
  openModal('renameModal');
  $('renameInput').select();
}

// 某個品種的姿勢圖還沒載入就載入（加進新品種的烏龜時）；載入前烏龜先用程式畫的樣子
async function ensurePoses(speciesId) {
  if (!assets || assets.poses[speciesId] || !posesReady.includes(speciesId)) return;
  assets.poses[speciesId] = await loadPoses(speciesId);
}

function addTurtle(speciesId) {
  if (state.turtles.length >= MAX_TURTLES) return;
  const t = newTurtle(speciesId, state.turtles.map(x => x.name));
  state.turtles.push(t);
  ensurePoses(speciesId); // 這個品種第一次進缸：現在才載入牠的姿勢圖
  const sp = getSpecies(speciesId);
  addLog(state, `${sp.name}「${t.name}」搬進缸裡了。`);
  closeModals();
  select(t.id);
  act(sp.intro.replace(/一隻/, `「${t.name}」，一隻`));
}

// ---------- 投餵 ----------

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

function poke(id) {
  const t = findTurtle(state, id);
  if (!t) return;
  const { msg, happy } = sim.play(state, t);
  tank.react(id, happy ? 'happy' : 'annoyed');
  act(msg);
}

// ---------- 送養、詳細資料、事件、關係 ----------

function adoptTurtle(id) {
  const t = findTurtle(state, id);
  if (!t) return;
  if (state.turtles.length <= 1) return ui.toast('缸裡至少要留一隻烏龜。');
  const extra = t.species === 'slider' ? '\n巴西龜是入侵種，請送到收容單位，不要放生到野外。' : '';
  if (!confirm(`確定要把 ${t.name} 送養嗎？送養後就不會回來了。${extra}`)) return;
  const msg = sim.adopt(state, t);
  if (selectedId === id) select(state.turtles[0].id);
  act(msg);
}

function openDetail(id) {
  openModal('detailModal');
  ui.renderDetail(state, id);
}

function onRelation(a, b, delta) {
  const msg = sim.addRelation(state, a, b, delta);
  if (msg) act(msg);
}

function onFlip(id) {
  const t = findTurtle(state, id);
  if (!t) return;
  act(sim.flip(state, t));
}

function onRescue(id) {
  const t = findTurtle(state, id);
  if (!t) return;
  tank.react(id, 'rescued');
  select(id);
  act(sim.rescue(state, t));
}

function onEvent(msg) {
  addLog(state, msg);
  act(msg);
}

function bindActions() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    switch (btn.dataset.act) {
      case 'feed': selectFood(btn.dataset.food); break;
      case 'water':
        tank.reactAll('startled');
        act(sim.changeWater(state));
        break;
      case 'lamp': act(sim.toggleLamp(state)); break;
      case 'play': poke(selected().id); break;
      case 'vet': act(sim.vet(state, selected())); break;
    }
  });
  $('chkTimer').addEventListener('change', e => act(sim.setTimer(state, e.target.checked)));

  // 選場景：換場景要重整才會重建 3D 場景，跟切換 2D/2.5D 一樣
  $('sceneList').addEventListener('click', e => {
    const btn = e.target.closest('[data-scene]');
    if (!btn || btn.disabled) return;
    const id = btn.dataset.scene;
    if (id === state.scene) return;
    const msg = sim.setScene(state, id);
    if (!msg) return;
    save(state);
    location.reload();
  });

  // 設備
  $('eqFilter').addEventListener('change', e => act(sim.setFilter(state, e.target.value)));
  $('eqLamp').addEventListener('change', e => act(sim.setLamp(state, e.target.value)));
  $('eqHeater').addEventListener('change', e => act(sim.setHeater(state, e.target.checked)));

  // 快轉：真的經過這段時間
  for (const b of document.querySelectorAll('[data-skip]')) {
    b.addEventListener('click', () => {
      catchUp(document.hidden ? 1 : speed); // 先把到現在為止的時間結算掉
      const hours = Number(b.dataset.skip);
      const events = sim.fastForward(state, hours);
      tank.onTimeJump();
      act(events.length ? events[events.length - 1] : `時間過了 ${hours} 小時。`);
    });
  }
  // 調時鐘：只改時刻
  const clock = $('clockInput');
  clock.addEventListener('focus', () => {
    const d = new Date(state.gameTime);
    clock.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  $('clockForm').addEventListener('submit', e => {
    e.preventDefault();
    const [hh, mm] = clock.value.split(':').map(Number);
    if (Number.isNaN(hh)) return;
    catchUp(document.hidden ? 1 : speed);
    const msg = sim.setClock(state, hh, mm);
    tank.onTimeJump();
    act(msg);
  });

  // 烏龜清單：點一列選取，點名字看詳細資料，✏️ 改名，🏠 送養
  $('turtleList').addEventListener('click', e => {
    const rename = e.target.closest('[data-rename]');
    if (rename) return openRename(rename.dataset.rename);
    const adopt = e.target.closest('[data-adopt]');
    if (adopt) return adoptTurtle(adopt.dataset.adopt);
    const row = e.target.closest('.turtle-row');
    if (!row) return;
    select(row.dataset.id);
    if (e.target.closest('[data-detail]')) openDetail(row.dataset.id);
  });
  $('renameForm').addEventListener('submit', e => {
    e.preventDefault();
    const t = findTurtle(state, renamingId);
    const name = $('renameInput').value.trim();
    closeModals();
    if (t && name && name !== t.name) act(sim.rename(state, t, name));
  });

  $('btnAdd').addEventListener('click', () => {
    // 哪些品種有圖（不管載入了沒）
    ui.renderSpeciesGrid(Object.fromEntries(posesReady.map(id => [id, true])));
    openModal('speciesModal');
  });
  $('speciesGrid').addEventListener('click', e => {
    const card = e.target.closest('[data-species]');
    if (card) addTurtle(card.dataset.species);
  });

  for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', closeModals);
  for (const m of document.querySelectorAll('.modal')) {
    m.addEventListener('click', e => { if (e.target === m) closeModals(); });
  }

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ([...document.querySelectorAll('.modal')].some(m => !m.hidden)) closeModals();
    else if (tank.tool) selectFood(tank.tool);
  });

  const slider = $('speed');
  const showSpeed = () => { $('speedOut').textContent = `${speed}x`; };
  slider.value = speed;
  showSpeed();
  slider.addEventListener('input', () => {
    catchUp(speed); // 先用舊速度結算到現在，再換新速度
    speed = Number(slider.value);
    showSpeed();
    try { localStorage.setItem(SPEED_KEY, speed); } catch {}
  });
  slider.addEventListener('change', () => ui.toast(speed === 1 ? '時間恢復正常速度。' : `時間加速 ${speed} 倍。`));

  $('btnExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = `烏龜存檔-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('btnImport').addEventListener('click', () => $('fileImport').click());
  $('fileImport').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data?.version !== SAVE_VERSION) {
        ui.toast(`這個存檔是舊版本（v${data?.version ?? '?'}），目前的版本是 v${SAVE_VERSION}，沒辦法讀取。`);
        return;
      }
      if (!isValidSave(data)) throw new Error('bad save');
      if (!confirm('要用這個存檔取代目前進度嗎？')) return;
      save(data);
      location.reload();
    } catch {
      ui.toast('這不是有效的存檔檔案。');
    }
  });
  $('btnReset').addEventListener('click', () => {
    const names = state.turtles.map(t => t.name).join('、');
    if (!confirm(`確定要重新開始嗎？${names} 的紀錄會被清除（建議先匯出存檔）。\n也會一起清掉這個網頁在瀏覽器裡的暫存，手機畫面怪怪的時候可以用。`)) return;
    clear();
    window.hardReset();
  });
}

async function start() {
  welcomeBack();
  if (state.droppedRecords) {
    // 讀檔時清掉了壞掉的紀錄，讓玩家知道少了什麼
    const msg = `存檔有 ${state.droppedRecords.length} 筆壞掉的紀錄已清除。`;
    addLog(state, msg);
    ui.toast(msg);
    delete state.droppedRecords;
    save(state);
  }
  ui.buildStats();
  ui.buildFoodGrid();
  ui.buildScenes(state);
  ui.buildDecor();
  initMenu();
  const view = getView();
  const btnView = $('btnView');
  btnView.textContent = view === '3d' ? '2D' : '2.5D';
  btnView.title = view === '3d' ? '切換成 2D' : '切換成 2.5D';
  btnView.addEventListener('click', () => {
    save(state);
    try { localStorage.setItem(VIEW_KEY, view === '3d' ? '2d' : '3d'); } catch {}
    location.reload();
  });

  const btnFullscreen = $('btnFullscreen');
  const appFrame = document.getElementById('frame');
  const syncFullscreenBtn = () => {
    const on = !!document.fullscreenElement;
    btnFullscreen.setAttribute('aria-pressed', String(on));
    btnFullscreen.textContent = on ? '⤡' : '⛶';
  };
  btnFullscreen.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else appFrame.requestFullscreen?.().catch(() => {});
  });
  document.addEventListener('fullscreenchange', syncFullscreenBtn);
  syncFullscreenBtn();

  // 每個品種的姿勢圖都先載入（沒有的品種會是 null，改用程式畫的替代圖）
  // 只載入缸裡現在有的品種：全部品種一起載入要解碼幾百張圖，iPhone 的 Safari 會因為記憶體不夠直接關掉網頁。
  // 之後加進新品種的烏龜時才載入那個品種（ensurePoses）。
  posesReady = await loadPoseIndex();
  const inTank = new Set(state.turtles.map(t => t.species));
  const [base, poseList, Tank] = await Promise.all([
    loadAssets(),
    Promise.all(SPECIES_LIST.map(sp => (posesReady.includes(sp.id) && inTank.has(sp.id) ? loadPoses(sp.id) : null))),
    loadTankClass(view),
  ]);
  assets = base;
  assets.poses = Object.fromEntries(SPECIES_LIST.map((sp, i) => [sp.id, poseList[i]]));

  selectedId = state.turtles[0].id;
  tank = new Tank($('tank'), () => state, assets, {
    onEat: (id, type) => {
      const t = findTurtle(state, id);
      return t ? sim.eat(state, t, type) : false;
    },
    onRot: n => {
      for (let i = 0; i < n; i++) sim.rot(state);
      ui.toast('有食物沒吃完，泡在水裡爛掉了…');
    },
    onPoke: poke,
    onSelect: select,
    onDrop,
    onRelation,
    onFlip,
    onRescue,
    onEvent,
  });
  tank.setSelected(selectedId);

  // 想互動請求（右下角的按鈕）
  const requests = new Requests({
    getState: () => state,
    getTank: () => tank,
    getPoses: sp => assets.poses[sp],
    getPalette: sp => getSpecies(sp).palette,
    onComplete: (id, type) => {
      const t = findTurtle(state, id);
      const def = REQUEST_TYPES[type];
      if (!t || !def) return;
      for (const [stat, add] of Object.entries(def.reward)) t.stats[stat] = sim.clamp(t.stats[stat] + add);
      const msg = def.done(t.name);
      addLog(state, msg);
      tank.agents.get(id)?.react('happy');
      act(msg);
    },
  });

  if (CONFIG.timeScale !== 1) window.debug = { tank, state: () => state, requests };
  bindActions();
  refresh();

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
  window.__gameStarted = true; // index.html 的載入失敗提示看這個
  document.getElementById('loadError')?.remove(); // 有錯誤但遊戲還是起來了（例如 2.5D 退回 2D），就不要擋畫面
}

// 第一次玩：兩隻隨機命名的斑龜
if (!state) {
  state = newState();
  const [a, b] = state.turtles;
  addLog(state, `${a.name} 和 ${b.name} 來到新家了！`);
  save(state);
}
start();
