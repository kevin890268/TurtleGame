// 遊戲可調參數。網址加 ?speed=60 可加速時間（1 秒 = 1 分鐘）方便測試，
// 加速模式使用獨立存檔，不會弄亂正式存檔。
const params = new URLSearchParams(location.search);
const speed = Math.max(1, Number(params.get('speed')) || 1);

export const CONFIG = {
  timeScale: speed,
  saveKey: speed === 1 ? 'banGui.save.v1' : 'banGui.save.debug',

  maxOfflineHours: 72,   // 離線補算上限，避免一次離開太久直接出事
  stepMinutes: 10,       // 模擬步長

  dayStart: 6,           // 06:00 天亮
  nightStart: 19,        // 19:00 天黑
  lampTimer: { on: 8, off: 18 },

  startLength: 3.5,      // 剛孵化的背甲長 (cm)
  maxLength: 22,
  growthPerHour: 0.005,  // 照顧滿分時的基礎成長速度 (cm/h)

  foodRotSeconds: 120,    // 沒吃完的食物多久後泡爛（真實秒數）
};
