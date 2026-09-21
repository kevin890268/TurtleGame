# 🐢 斑龜日記

網頁版的斑龜飼養遊戲。遊戲時間和現實時間同步，關掉網頁再回來，期間的變化都會補算。

## 在本機玩

因為用到 ES modules，不能直接雙擊 `index.html` 開啟，必須用本機伺服器：

```bash
python -m http.server 8123
```

接著打開 http://localhost:8123

測試用的加速模式：http://localhost:8123/?speed=600（1 秒 = 10 分鐘，使用獨立存檔）

## 2D / 2.5D

右上角的按鈕可以切換畫面，存檔是共用的。

- **2.5D**（預設）：場景用 Three.js 做成 3D，可以拖曳旋轉、用滾輪縮放；澤龜是一張會轉向鏡頭的 2D 圖片。Three.js 從 CDN 載入，所以需要網路，載入失敗時會自動退回 2D。
- **2D**：純 Canvas，不需要網路。

兩種畫面共用同一套烏龜行為（`tank.js`），`tank3d.js` 只負責把畫面換成 3D。

## 放上網（免費）

這是純靜態網站，直接用 GitHub Pages 就行：把資料夾推到 GitHub repo，然後在 Settings → Pages 選 `main` 分支。

## 玩法

| 數值 | 怎麼照顧 |
|---|---|
| 飽足 | 餵飼料、蝦乾、蔬菜。吃不完的食物 2 分鐘後會泡爛，弄髒水 |
| 水質 | 會慢慢變髒，烏龜越大髒得越快，要記得換水 |
| 日照 | 白天開曬背燈，烏龜會爬上平台曬背。開定時器就會自動開關 |
| 健康 | 餓太久、水太髒、日照不足都會扣健康；照顧得好就會慢慢回復 |
| 心情 | 綜合上面四項。陪牠玩可以加一點，但玩太多次牠會嫌煩 |

成長：幼龜（小於 6 cm）→ 亞成龜（小於 12 cm）→ 成龜。三天內吃的食物種類越多，長得越快。

## 缸內地形

由左到右：**深水區** → 斜坡 → **淺水區** → 岸邊 → **曬台**（露出水面，曬背燈在正上方）。
地形定義在 `js/terrain.js` 的 `PROFILE`，2D 和 2.5D 共用。
烏龜在水夠深的地方用游的，在淺水區和曬台上用走的；小烏龜在淺水區也游得起來，長大後就只能用走的。

## 烏龜姿勢圖

1. 照 `assets/prompts/PROMPTS_<品種英文名>.md` 請 GPT 生姿勢表，存到 `reference/sheets/<品種>/`
2. 執行切圖工具（需要 Python 的 numpy、scipy、Pillow）：
   ```bash
   python tools/slice_poses.py
   ```
3. 切好的圖會放在 `assets/poses/<品種>/`，預覽圖在 `reference/previews/`

工具會自動去背、濾掉文字和特效，並以背甲中心對齊、統一大小。`reference/sheets/bangui/proto_36.png` 是原型，
`reference/sheets/bangui/` 裡的正式版會覆蓋同名姿勢。

## 檔案結構

```
index.html
css/style.css
js/config.js   可調參數（時間倍率、日夜時段、成長速度…）
js/state.js    存檔／讀檔
js/sim.js      遊戲規則（數值變化、玩家動作）
js/terrain.js  地形剖面（深水區、淺水區、曬台）
js/tank.js     烏龜行為（游泳、走路、上岸、吃東西）+ 2D 畫面
js/tank3d.js   2.5D 畫面（繼承 tank.js，只換掉繪圖）
js/poses.js    姿勢圖載入、依狀態挑姿勢、程式做的小動作
js/turtle-shape.js  沒有姿勢圖時用程式畫的烏龜
js/ui.js       面板顯示
js/main.js     把上面串起來
assets/poses/  切好的姿勢圖（由 tools/slice_poses.py 產生）
reference/     GPT 原始圖：concept/ 概念圖、sheets/<品種>/ 姿勢表、previews/ 切圖預覽
tools/slice_poses.py  姿勢表切圖工具
```
