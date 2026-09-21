import { stageOf, isNight, hourOf } from './sim.js';

const STATS = [
  ['hunger', '飽足', '#e0a24a'],
  ['water', '水質', '#4aa3c8'],
  ['sun', '日照', '#e3c233'],
  ['health', '健康', '#5bb36a'],
  ['mood', '心情', '#d9739a'],
];

const $ = id => document.getElementById(id);

export function buildStats() {
  $('stats').innerHTML = STATS.map(([key, label, color]) => `
    <div class="stat" data-key="${key}">
      <span>${label}</span>
      <div class="bar"><div class="fill" style="background:${color}"></div></div>
      <span class="num"></span>
    </div>`).join('');
}

const pad = n => String(n).padStart(2, '0');
function fmtTime(t) {
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

let lastLogTop = null;

export function render(s, tank) {
  const day = Math.floor(s.turtle.ageHours / 24) + 1;
  const d = new Date(s.gameTime);
  $('clock').textContent = `${isNight(s) ? '🌙' : '☀️'} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

  $('tName').textContent = s.turtle.name;
  $('tMeta').textContent = `${stageOf(s.turtle.length)} · 背甲 ${s.turtle.length.toFixed(2)} cm · 第 ${day} 天`;
  $('tStatus').textContent = statusText(s, tank.t);

  for (const [key] of STATS) {
    const row = document.querySelector(`.stat[data-key="${key}"]`);
    const v = Math.round(s.stats[key]);
    row.querySelector('.fill').style.width = `${v}%`;
    row.querySelector('.num').textContent = v;
    row.classList.toggle('low', v < 25);
  }

  const lamp = $('btnLamp');
  lamp.textContent = `💡 曬背燈：${s.lamp.on ? '開' : '關'}`;
  lamp.classList.toggle('on', s.lamp.on);
  $('chkTimer').checked = s.lamp.timer;
  $('btnVet').disabled = s.stats.health >= 40;

  const top = s.log[0];
  if (top !== lastLogTop) {
    lastLogTop = top;
    $('log').innerHTML = s.log.map(e => `<li><time>${fmtTime(e.t)}</time>${escapeHtml(e.text)}</li>`).join('');
  }
}

function statusText(s, t) {
  const st = s.stats;
  if (st.health < 35) return '🤒 身體不太舒服';
  if (t.mode === 'food') return '🍽️ 搶食中！';
  if (t.mode === 'sleep') return t.path.length ? '🌙 準備去睡覺' : '💤 正在睡覺';
  if (t.mode === 'bask') return t.path.length ? '🧗 爬上平台' : '☀️ 張開後腿曬背中';
  if (st.hunger < 25) return '😣 肚子餓了';
  if (st.water < 30) return '🤢 水有點髒';
  const h = hourOf(s);
  return h < 9 ? '🌅 剛睡醒，慢慢游' : '🏊 悠閒地游泳';
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
