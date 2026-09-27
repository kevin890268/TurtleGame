// 遊戲可調參數。網址加 ?speed=60 可加速時間（1 秒 = 1 分鐘）方便測試，
// 加速模式使用獨立存檔，不會弄亂正式存檔。
const params = new URLSearchParams(location.search);
const speed = Math.max(1, Number(params.get('speed')) || 1);

export const CONFIG = {
  timeScale: speed,
  saveKey: speed === 1 ? 'banGui.save.v1' : 'banGui.save.debug',

  maxOfflineHours: 72,   // 離線補算上限，避免一次離開太久直接出事
  stepMinutes: 10,       // 模擬步長

  // 畫面上的一天多長（現實分鐘）。只影響日夜、燈光、定時器和烏龜什麼時候睡，
  // 飽足、日照、水質、成長這些數值都還是照現實時間變化（烏龜很耐餓）。
  // 晚上玩的人也看得到早上和中午；1440 ÷ 90 = 16，每天同一個現實時刻對到同一個遊戲時刻。
  dayMinutes: 90,

  dayStart: 6,           // 06:00 天亮
  nightStart: 19,        // 19:00 天黑
  lampTimer: { on: 8, off: 18 },

  startLength: 3.5,      // 剛孵化的背甲長 (cm)
  maxLength: 22,
  growthPerHour: 0.005,  // 照顧滿分時的基礎成長速度 (cm/h)

  foodRotSeconds: 120,    // 沒吃完的食物多久後泡爛（真實秒數）

  // 烏龜動作的整體快慢：移動速度、動畫播放速度、每個反應／小動作持續多久一起調。
  // 1＝原本，0.5＝慢一半（2026-09-24 調慢），想再慢就再調小。
  turtlePace: 0.5,
};
