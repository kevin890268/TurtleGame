// 功能表：右下角主按鈕 → 圖示選單 → 展開對應的功能區塊（其他收起來）。
// 要調整結構，只要改 SECTIONS：順序就是面板和選單的順序，id 對應 index.html 裡的 data-section。

export const SECTIONS = [
  { id: 'turtles', icon: '🐢', label: '烏龜' },
  { id: 'feed', icon: '🍽️', label: '餵食' },
  { id: 'care', icon: '🌿', label: '照顧' },
  { id: 'equip', icon: '🔧', label: '設備' },
  { id: 'decor', icon: '🏗️', label: '造景' },
  { id: 'time', icon: '⏰', label: '時間' },
  { id: 'log', icon: '📜', label: '日誌' },
  { id: 'save', icon: '💾', label: '存檔' },
];

const OPEN_KEY = 'banGui.openSections';

function loadOpen() {
  try {
    const v = JSON.parse(localStorage.getItem(OPEN_KEY));
    return Array.isArray(v) ? v : ['turtles', 'feed'];
  } catch {
    return ['turtles', 'feed'];
  }
}

function saveOpen(panel) {
  const open = [...panel.querySelectorAll('.section[open]')].map(d => d.dataset.section);
  try { localStorage.setItem(OPEN_KEY, JSON.stringify(open)); } catch {}
}

export function initMenu() {
  const panel = document.getElementById('panel');
  const btn = document.getElementById('menuBtn');
  const menu = document.getElementById('quickMenu');
  const open = loadOpen();

  // 依 SECTIONS 排好區塊順序、加上圖示、還原上次展開的狀態
  for (const sec of SECTIONS) {
    const el = panel.querySelector(`.section[data-section="${sec.id}"]`);
    if (!el) continue;
    panel.appendChild(el);
    el.querySelector('summary').dataset.icon = sec.icon;
    el.open = open.includes(sec.id);
    el.addEventListener('toggle', () => saveOpen(panel));
  }

  menu.innerHTML = SECTIONS.map(sec =>
    `<button type="button" data-go="${sec.id}"><span>${sec.icon}</span>${sec.label}</button>`).join('');

  const setMenu = show => {
    menu.hidden = !show;
    btn.setAttribute('aria-expanded', String(show));
  };
  btn.addEventListener('click', e => {
    e.stopPropagation();
    setMenu(menu.hidden);
  });
  document.addEventListener('click', e => {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) setMenu(false);
  });

  menu.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (!go) return;
    setMenu(false);
    openSection(go.dataset.go, true);
  });
}

// 展開某個區塊；only = true 時把其他區塊收起來
export function openSection(id, only = false) {
  const panel = document.getElementById('panel');
  for (const el of panel.querySelectorAll('.section')) {
    if (el.dataset.section === id) el.open = true;
    else if (only) el.open = false;
  }
  const target = panel.querySelector(`.section[data-section="${id}"]`);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  target.classList.add('flash');
  setTimeout(() => target.classList.remove('flash'), 700);
}
