import { isNight, hourOf, roomTemp, FILTERS } from './sim.js';
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
      <span class="name">${escapeHtml(t.name)}</span>
      <button class="rename-btn" data-rename="${t.id}" title="改名字" aria-label="幫 ${escapeHtml(t.name)} 改名字">✏️</button>
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
  tempRow.querySelector('.num').textContent = `${temp.toFixed(1)}℃（室溫 ${roomTemp(s).toFixed(0)}℃${s.equip.heater ? '・加溫中' : ''}）`;
  tempRow.classList.toggle('low', temp < 18);
  tempRow.classList.toggle('high', temp > 32);

  // 設備（使用者正在操作時不要蓋掉）
  if (document.activeElement?.id !== 'eqFilter') $('eqFilter').value = s.equip.filter;
  if (document.activeElement?.id !== 'eqLamp') $('eqLamp').value = s.equip.lamp;
  $('eqHeater').checked = s.equip.heater;
  const hints = [];
  if (s.equip.filter === 'none') hints.push('沒有過濾器，水會髒得很快');
  if (FILTERS[s.equip.filter].current) hints.push('水流強，幼龜和麝香龜會累');
  if (s.equip.lamp === 'heat') hints.push('保溫燈沒有 UVB，曬背效果只有一半');
  if (!s.equip.heater && temp < 20) hints.push('水有點冷，建議開加溫棒');
  $('eqHint').textContent = hints.join('；');

  const lamp = $('btnLamp');
  lamp.textContent = `💡 曬背燈：${s.lamp.on ? '開' : '關'}`;
  lamp.classList.toggle('on', s.lamp.on);
  $('chkTimer').checked = s.lamp.timer;
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
  if (st.health < 35) return '🤒 身體不太舒服';
  if (s.tank.temp < 16 && t?.mode !== 'sleep') return '🥶 太冷了，躲在水底不動';
  if (t?.mode === 'food') return '🍽️ 搶食中！';
  if (t?.mode === 'sleep') return t.path.length ? '🌙 準備去睡覺' : '💤 正在睡覺';
  if (t?.mode === 'bask') return t.path.length ? '🧗 爬上曬台' : '☀️ 在曬台上曬背';
  if (st.hunger < 25) return '😣 肚子餓了';
  if (s.tank.water < 30) return '🤢 水有點髒';
  if (t?.mode === 'shallow') return '🌿 在淺水區發呆';
  if (t?.mode === 'bottom') return '🪨 在水底散步';
  const h = hourOf(s);
  return h < 9 ? '🌅 剛睡醒，慢慢游' : '🏊 悠閒地游泳';
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
