import { isNight, hourOf, ambientTemp, FILTERS, FOODS, relation, relationLabel } from './sim.js';
import { SCENES, PROPS } from './decor.js';
import { getSpecies, stageOf, SPECIES_LIST } from './species.js';
import { MAX_TURTLES } from './state.js';

// 每隻烏龜各自的數值
const TURTLE_STATS = [
  ['hunger', '飽足', '#e0a24a'],
  ['sun', '日照', '#e3c233'],
  ['health', '健康', '#5bb36a'],
  ['mood', '心情', '#d9739a'],
];

const $ = id => document.getElementById(id);

export function buildStats() {
  const row = (key, label, color) => `
    <div class="stat" data-key="${key}">
      <span>${label}</span>
      <div class="bar"><div class="fill" style="background:${color}"></div></div>
      <span class="num"></span>
    </div>`;
  $('stats').innerHTML = `
    <div class="group-title" id="statsTitle"></div>
    ${TURTLE_STATS.map(([k, l, c]) => row(k, l, c)).join('')}
    <div class="group-title">整缸</div>
    ${row('water', '水質', '#4aa3c8')}
    <div class="stat-text" id="tempRow"><span>水溫</span><span class="num"></span></div>`;
}

const pad = n => String(n).padStart(2, '0');
function fmtTime(t) {
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function setStat(key, value) {
  const row = document.querySelector(`.stat[data-key="${key}"]`);
  const v = Math.round(value);
  row.querySelector('.fill').style.width = `${v}%`;
  row.querySelector('.num').textContent = v;
  row.classList.toggle('low', v < 25);
}

let lastLogTop = null;
let lastListHtml = '';

export function render(s, tank, selectedId) {
  const d = new Date(s.gameTime);
  $('clock').textContent = `${isNight(s) ? '🌙' : '☀️'} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

  // 烏龜清單
  const html = s.turtles.map(t => {
    const sp = getSpecies(t.species);
    const day = Math.floor(t.ageHours / 24) + 1;
    const agent = tank?.agents.get(t.id);
    return `<li class="turtle-row${t.id === selectedId ? ' selected' : ''}" data-id="${t.id}">
      <span class="name" data-detail="${t.id}" title="看詳細資料">${escapeHtml(t.name)}</span>
      <span class="row-btns">
        <button data-rename="${t.id}" title="改名字" aria-label="幫 ${escapeHtml(t.name)} 改名字">✏️</button>
        <button data-adopt="${t.id}" title="送養" aria-label="送養 ${escapeHtml(t.name)}">🏠</button>
      </span>
      <span class="meta">${sp.name} · ${stageOf(t.length, sp)} · 背甲 ${t.length.toFixed(2)} cm · 第 ${day} 天</span>
      <span class="status">${statusText(s, t, agent)}</span>
    </li>`;
  }).join('');
  if (html !== lastListHtml) {
    lastListHtml = html;
    $('turtleList').innerHTML = html;
  }
  $('turtleCount').textContent = `${s.turtles.length} / ${MAX_TURTLES}`;
  $('btnAdd').disabled = s.turtles.length >= MAX_TURTLES;

  // 選取中那隻的數值 + 整缸水質
  const sel = s.turtles.find(t => t.id === selectedId) || s.turtles[0];
  $('statsTitle').textContent = sel.name;
  for (const [key] of TURTLE_STATS) setStat(key, sel.stats[key]);
  setStat('water', s.tank.water);
  const temp = s.tank.temp;
  const tempRow = $('tempRow');
  const outdoor = s.scene === 'outdoor';
  tempRow.querySelector('.num').textContent = `${temp.toFixed(1)}℃（${outdoor ? '氣溫' : '室溫'} ${ambientTemp(s).toFixed(0)}℃${!outdoor && s.equip.heater ? '・加溫中' : ''}）`;
  tempRow.classList.toggle('low', temp < 18);
  tempRow.classList.toggle('high', temp > 32);

  // 設備（使用者正在操作時不要蓋掉）
  if (document.activeElement?.id !== 'eqFilter') $('eqFilter').value = s.equip.filter;
  if (document.activeElement?.id !== 'eqLamp') $('eqLamp').value = s.equip.lamp;
  $('eqHeater').checked = s.equip.heater;
  $('eqLamp').disabled = outdoor;
  $('eqHeater').disabled = outdoor;
  const hints = [];
  if (outdoor) {
    hints.push('戶外池曬真的太陽，燈具和加溫棒沒有作用');
  } else {
    if (s.equip.lamp === 'heat') hints.push('保溫燈沒有 UVB，曬背效果只有一半');
    if (!s.equip.heater && temp < 20) hints.push('水有點冷，建議開加溫棒');
  }
  if (s.equip.filter === 'none') hints.push('沒有過濾器，水會髒得很快');
  if (FILTERS[s.equip.filter].current) hints.push('水流強，幼龜和麝香龜會累');
  $('eqHint').textContent = hints.join('；');

  const lamp = $('btnLamp');
  lamp.textContent = outdoor ? '💡 曬背燈（戶外不需要）' : `💡 曬背燈：${s.lamp.on ? '開' : '關'}`;
  lamp.classList.toggle('on', s.lamp.on && !outdoor);
  lamp.disabled = outdoor;
  $('chkTimer').checked = s.lamp.timer;
  $('chkTimer').disabled = outdoor;
  $('btnVet').disabled = sel.stats.health >= 40;

  const top = s.log[0];
  if (top !== lastLogTop) {
    lastLogTop = top;
    $('log').innerHTML = s.log.map(e => `<li><time>${fmtTime(e.t)}</time>${escapeHtml(e.text)}</li>`).join('');
  }
}

function statusText(s, turtle, agent) {
  const st = turtle.stats;
  const t = agent?.t;
  if (turtle.flipped) return '🙃 翻過去了！點牠幫忙翻回來';
  if (st.health < 35) return '🤒 身體不太舒服';
  if (s.tank.temp < 16 && t?.mode !== 'sleep') return '🥶 太冷了，躲在水底不動';
  if (t?.mode === 'food') return '🍽️ 搶食中！';
  if (t?.mode === 'sleep') return t.path.length ? '🌙 準備去睡覺' : '💤 正在睡覺';
  if (t?.stackOn) return '🐢 疊在好朋友背上曬背';
  if (t?.mode === 'bask') return t.path.length ? '🧗 爬上曬台' : '☀️ 在曬台上曬背';
  if (st.hunger < 25) return '😣 肚子餓了';
  if (s.tank.water < 30) return '🤢 水有點髒';
  if (t?.mode === 'shallow') return '🌿 在淺水區發呆';
  if (t?.mode === 'bottom') return '🪨 在水底散步';
  const h = hourOf(s);
  return h < 9 ? '🌅 剛睡醒，慢慢游' : '🏊 悠閒地游泳';
}

// 餵食：玩家可以丟的食物按鈕
export function buildFoodGrid() {
  $('foodGrid').innerHTML = Object.entries(FOODS).filter(([, f]) => !f.hidden).map(([key, f]) =>
    `<button data-act="feed" data-food="${key}"><span>${f.icon}</span>${f.name}</button>`).join('');
}

// 選場景：可以點來切換的缸子/戶外池清單
export function buildScenes(s) {
  $('sceneList').innerHTML = SCENES.map(sc => {
    const current = s.scene === sc.id;
    const badge = current ? '使用中' : sc.locked ? '即將推出' : '點一下切換';
    return `
      <button type="button" class="decor-item scene-item${current ? ' current' : ''}" data-scene="${sc.id}" ${sc.locked ? 'disabled' : ''}>
        <span class="icon">${sc.icon}</span>
        <span class="title">${sc.name}<span class="badge">${badge}</span></span>
        <span class="desc">${sc.desc}</span>
      </button>`;
  }).join('');
}

// 造景擺設目錄（先純展示，功能之後再做）
export function buildDecor() {
  $('decorList').innerHTML = PROPS.map(it => `
    <div class="decor-item">
      <span class="icon">${it.icon}</span>
      <span class="title">${it.name}<span class="badge">即將推出</span></span>
      <span class="desc">${it.desc}</span>
    </div>`).join('');
}

// 烏龜詳細資料頁
export function renderDetail(s, id) {
  const t = s.turtles.find(x => x.id === id);
  if (!t) return false;
  const sp = getSpecies(t.species);
  const day = Math.floor(t.ageHours / 24) + 1;
  const bar = (label, v) => `<div class="kv"><span>${label}</span><span>${Math.round(v)}</span></div>`;
  const eaten = Object.entries(FOODS).filter(([k]) => t.eaten[k])
    .sort(([a], [b]) => t.eaten[b] - t.eaten[a])
    .map(([k, f]) => `<div class="kv"><span>${f.icon} ${f.name}${sp.favorites?.includes(k) ? ' ❤️' : ''}</span><span>${t.eaten[k]} 次</span></div>`).join('')
    || '<div class="hint">還沒吃過東西</div>';
  const favs = (sp.favorites || []).map(k => `${FOODS[k].icon} ${FOODS[k].name}`).join('、');
  const rels = s.turtles.filter(o => o.id !== t.id).map(o => {
    const r = relation(s, t.id, o.id);
    return `<div class="kv"><span>${escapeHtml(o.name)}</span><span>${relationLabel(r)}（${Math.round(r)}）</span></div>`;
  }).join('') || '<div class="hint">缸裡只有牠一隻</div>';
  const first = t.history[0];

  $('detailBody').innerHTML = `
    <div class="detail-head">
      <h2>${escapeHtml(t.name)}</h2>
      <span>${sp.name}（<i>${sp.latin}</i>）</span>
    </div>
    <p>${sp.blurb}</p>
    <div class="detail-grid">
      <div class="box">
        <h3>基本資料</h3>
        <div class="kv"><span>成長階段</span><span>${stageOf(t.length, sp)}</span></div>
        <div class="kv"><span>背甲長</span><span>${t.length.toFixed(2)} cm（最大約 ${sp.maxLength} cm）</span></div>
        <div class="kv"><span>在家裡的天數</span><span>第 ${day} 天</span></div>
        <div class="kv"><span>來的時候</span><span>${first ? first.len.toFixed(1) : '?'} cm</span></div>
      </div>
      <div class="box">
        <h3>目前狀態</h3>
        ${bar('飽足', t.stats.hunger)}${bar('日照', t.stats.sun)}${bar('健康', t.stats.health)}${bar('心情', t.stats.mood)}
      </div>
      <div class="box full">
        <h3>成長曲線（背甲長，每天記錄一次）</h3>
        <canvas id="growthChart"></canvas>
      </div>
      <div class="box">
        <h3>吃過的食物（❤️ 是最愛）</h3>
        ${eaten}
        <div class="hint">最愛：${favs || '沒有特別偏好'}</div>
      </div>
      <div class="box">
        <h3>跟其他烏龜的關係</h3>
        ${rels}
        <div class="hint">常一起曬背會變好朋友，常搶食會互看不順眼</div>
      </div>
    </div>`;
  drawGrowth($('growthChart'), t.history, sp.maxLength);
  return true;
}

function drawGrowth(canvas, history, maxLen) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const pad = { l: 34, r: 10, t: 10, b: 22 };
  const pts = history.length > 1 ? history : [...history, ...history];
  const days = Math.max(1, pts[pts.length - 1].day - pts[0].day);
  const lo = Math.floor(Math.min(...pts.map(p => p.len))), hi = Math.max(lo + 1, Math.ceil(Math.max(...pts.map(p => p.len)) + 0.5));
  const X = d => pad.l + (d - pts[0].day) / days * (w - pad.l - pad.r);
  const Y = v => h - pad.b - (v - lo) / (hi - lo) * (h - pad.t - pad.b);
  ctx.strokeStyle = '#e4dccb';
  ctx.fillStyle = '#7c7560';
  ctx.font = '11px sans-serif';
  for (let i = 0; i <= 2; i++) {
    const v = lo + (hi - lo) * i / 2;
    ctx.beginPath();
    ctx.moveTo(pad.l, Y(v));
    ctx.lineTo(w - pad.r, Y(v));
    ctx.stroke();
    ctx.fillText(`${v.toFixed(1)}`, 2, Y(v) + 4);
  }
  ctx.fillText(`第 ${pts[0].day + 1} 天`, pad.l, h - 6);
  const end = `第 ${pts[pts.length - 1].day + 1} 天`;
  ctx.fillText(end, w - pad.r - ctx.measureText(end).width, h - 6);
  ctx.strokeStyle = '#4f7a4a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(X(p.day), Y(p.len)) : ctx.moveTo(X(p.day), Y(p.len))));
  ctx.stroke();
  if (history.length < 2) {
    ctx.fillStyle = '#7c7560';
    ctx.fillText('再過幾天就能看到成長曲線', pad.l + 8, pad.t + 14);
  }
}

// 新增烏龜的品種卡片；沒有姿勢圖的品種標示「圖片製作中」
export function renderSpeciesGrid(posesBySpecies) {
  $('speciesGrid').innerHTML = SPECIES_LIST.map(sp => `
    <button type="button" class="species-card" data-species="${sp.id}">
      <span class="sp-name">${sp.name}${posesBySpecies[sp.id] ? '' : '<span class="badge">圖片製作中</span>'}</span>
      <span class="sp-latin">${sp.latin}</span>
      <span class="sp-tags">${sp.tag} · 難度 ${'★'.repeat(sp.difficulty)}${'☆'.repeat(3 - sp.difficulty)}</span>
      <span class="sp-blurb">${sp.blurb}</span>
    </button>`).join('');
}

function escapeHtml(str) {
  return str.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

let toastTimer = 0;
export function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}
