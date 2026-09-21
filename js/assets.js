// 讀取 assets/manifest.json 列出的圖片。沒列到或載入失敗的，畫面會改用程式繪製的替代圖。
export async function loadAssets() {
  let manifest = {};
  try {
    const res = await fetch('assets/manifest.json', { cache: 'no-cache' });
    if (res.ok) manifest = await res.json();
  } catch {}

  const entries = await Promise.all(
    Object.entries(manifest)
      .filter(([key, file]) => !key.startsWith('_') && typeof file === 'string' && file)
      .map(([key, file]) => new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve([key, img]);
        img.onerror = () => {
          console.warn(`圖片載入失敗：assets/${file}（${key}），改用內建繪圖`);
          resolve([key, null]);
        };
        img.src = `assets/${file}`;
      }))
  );
  return Object.fromEntries(entries.filter(([, img]) => img));
}
