// 底部功能表：5 個主分頁，其中「照顧」「更多」點下去會先彈出子選單（icon），
// 選了子項才會從底部滑出對應的面板（sheet）。
// 要調整結構，只要改 NAV：每個主分頁的 sections 只有 1 項時會直接開面板，
// 超過 1 項時會先彈子選單。id 對應 index.html 的 data-section。

export const NAV = [
  { id: 'turtles', icon: '🐢', label: '烏龜', sections: [
    { id: 'turtles', icon: '🐢', label: '烏龜' },
  ] },
  { id: 'feed', icon: '🍽️', label: '餵食', sections: [
    { id: 'feed', icon: '🍽️', label: '餵食' },
  ] },
  { id: 'care', icon: '🌿', label: '照顧', sections: [
    { id: 'care', icon: '🌿', label: '照顧' },
    { id: 'equip', icon: '🔧', label: '設備' },
  ] },
  { id: 'decor', icon: '🏗️', label: '造景', sections: [
    { id: 'scene', icon: '🏞️', label: '選場景' },
    { id: 'decor', icon: '🏗️', label: '造景擺設' },
  ] },
  { id: 'more', icon: '⚙️', label: '更多', sections: [
    { id: 'time', icon: '⏰', label: '時間' },
    { id: 'log', icon: '📜', label: '日誌' },
    { id: 'save', icon: '💾', label: '存檔' },
  ] },
];

// section id -> { nav, meta } 查表，開面板時要用
const SECTION_INDEX = new Map();
for (const nav of NAV) {
  for (const sec of nav.sections) SECTION_INDEX.set(sec.id, { nav, meta: sec });
}

// initMenu() 執行後才會填入，讓 openSection() 可以直接呼叫、不必模擬點擊
let openSheetImpl = null;

export function initMenu() {
  const bottomNav = document.getElementById('bottomNav');
  const submenu = document.getElementById('submenu');
  const backdrop = document.getElementById('sheetBackdrop');
  const sheet = document.getElementById('sheet');
  const sheetTitle = document.getElementById('sheetTitle');
  const sheetClose = document.getElementById('sheetClose');
  const sheetSections = [...sheet.querySelectorAll('.sheet-section')];

  bottomNav.innerHTML = NAV.map(nav =>
    `<button type="button" class="nav-btn" data-nav="${nav.id}">
      <span class="nav-icon">${nav.icon}</span>
      <span class="nav-label">${nav.label}</span>
    </button>`).join('');

  function setActiveNav(navId) {
    for (const btn of bottomNav.querySelectorAll('.nav-btn')) {
      btn.classList.toggle('active', btn.dataset.nav === navId);
    }
  }

  function closeSubmenu() {
    submenu.hidden = true;
    submenu.innerHTML = '';
  }

  function closeSheet() {
    sheet.hidden = true;
    sheet.classList.remove('open');
    backdrop.hidden = true;
    setActiveNav(null);
  }

  function closeAll() {
    closeSubmenu();
    closeSheet();
  }

  function openSheet(sectionId) {
    const found = SECTION_INDEX.get(sectionId);
    if (!found) return;
    closeSubmenu();
    for (const el of sheetSections) el.hidden = el.dataset.section !== sectionId;
    sheetTitle.textContent = `${found.meta.icon} ${found.meta.label}`;
    sheet.hidden = false;
    backdrop.hidden = false;
    requestAnimationFrame(() => sheet.classList.add('open'));
    setActiveNav(found.nav.id);
  }

  function openSubmenu(nav) {
    closeSheet();
    submenu.innerHTML = nav.sections.map(sec =>
      `<button type="button" data-sub="${sec.id}">
        <span>${sec.icon}</span>${sec.label}
      </button>`).join('');
    submenu.hidden = false;
    setActiveNav(nav.id);
  }

  bottomNav.addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn');
    if (!btn) return;
    const nav = NAV.find(n => n.id === btn.dataset.nav);
    if (!nav) return;

    const submenuOpenForThis = !submenu.hidden && btn.classList.contains('active');
    const sheetOpenForThis = !sheet.hidden && btn.classList.contains('active');
    if (submenuOpenForThis || sheetOpenForThis) { closeAll(); return; }

    if (nav.sections.length === 1) openSheet(nav.sections[0].id);
    else openSubmenu(nav);
  });

  submenu.addEventListener('click', e => {
    const btn = e.target.closest('[data-sub]');
    if (!btn) return;
    openSheet(btn.dataset.sub);
  });

  backdrop.addEventListener('click', closeAll);
  sheetClose.addEventListener('click', closeAll);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAll();
  });
  // 子選單沒有背景遮罩，點畫面其他地方（例如水缸）要自己關掉
  document.addEventListener('click', e => {
    if (submenu.hidden) return;
    if (submenu.contains(e.target) || bottomNav.contains(e.target)) return;
    closeSubmenu();
  });

  openSheetImpl = openSheet;
}

// 從畫面其他地方（例如點水缸裡的烏龜）直接開某個面板
export function openSection(id) {
  if (openSheetImpl) openSheetImpl(id);
}
