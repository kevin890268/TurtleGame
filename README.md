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

## 烏龜姿勢圖（斑龜 v3）

每個動作一張圖，流程：

1. 在 ChatGPT 依序上傳三個檔案：
   - `reference/character/bangui_character.png`（角色參考）
   - `gpt/rules/rules_bangui_v3.6.md`（規則：三視角、3 × 4）
   - `gpt/actions/bangui_v3/action_NN_xxx.md`（要做的那個動作）
2. 產出的圖存成 `reference/sheets/bangui/action_NN_xxx.png`（檔名照動作檔）
3. 切圖並更新素材狀態表（需要 Python 的 numpy、scipy、Pillow）：
   ```bash
   python tools/slice_poses_v4.py bangui
   ```
   ```bash
   python tools/asset_status.py
   ```
4. 切好的圖在 `assets/poses/bangui/`，進度看根目錄的 `bangui_asset_status.md`

v3 的三個視角：**正面**（前方、俯看 45°）、**側面**（面向右）、**背面**（後方、俯看 45°）。
左側由切圖工具鏡像產生。動作分成水上 13 個、水下 10 個，清單在
`gpt/actions/bangui_v3/README.md`。

還沒有 v3 新圖的動作，遊戲會先用舊圖代替（`js/poses.js` 的 `POSE_FALLBACK`），不會缺畫面。

## 資料夾結構

```
index.html, css/style.css      遊戲本體（靜態網站，不用建置）
js/
  config.js      可調參數（時間倍率、日夜時段、成長速度…）
  state.js       存檔／讀檔（含版號）
  sim.js         遊戲規則（數值變化、玩家動作）
  species.js     品種資料
  terrain.js     地形剖面（深水區、淺水區、曬台）
  tank.js        烏龜缸：食物物理、多隻烏龜、2D 畫面
  tank3d.js      2.5D 畫面（繼承 tank.js，只換掉繪圖）
  turtle-agent.js  每隻烏龜的行為
  poses.js       姿勢圖載入、依狀態挑動作
  requests.js    想互動請求（右下角按鈕）與刷屁屁小遊戲
  turtle-shape.js  沒有姿勢圖時用程式畫的烏龜
  menu.js, ui.js, decor.js  功能表、面板、造景
  main.js        把上面串起來
bangui_asset_status.md         斑龜素材進度（tools/asset_status.py 產生）
status.md                      開發狀態
README.md

assets/
  poses/<品種>/                切好的姿勢圖 + poses.json（切圖工具產生，不要手改）
  manifest.json, icon.png      網頁圖示

gpt/                           ★ 所有給 ChatGPT 的 md（見 gpt/README.md）
  rules/                       生圖規則（rules_bangui_v3.6.md 是目前版本）
  actions/bangui_v3/           斑龜 v3 動作（23 個）
  character/                   定裝照／角色設計提示詞
  back_fill/                   補背面用
  archive/                     舊版動作、舊規格

reference/                     GPT 產的原始圖
  character/                   角色參考圖
  concept/                     概念圖、標題圖
  sheets/<品種>/               動作圖（切圖工具的輸入）
    bangui/_incoming/          還沒分類的新圖（不知道是哪個動作，先放這裡）
    bangui/_v3_archive/        更早期的舊圖
  species/<英文名>/            之後想加的品種的設定板
  previews/                    切圖預覽

docs/                          想法與紀錄（不是給 GPT 的）
  backlog.md                   待辦（含查證資料）
  interactions.md              玩家互動與「想互動請求」規劃
  nature_objects.md            水中／陸上自然物清單（造景用）
  species*.md, ideas_species.md  品種研究與候選

tools/                         見 tools/README.md
```

## 存檔版號

存檔一定帶 `version`，由 `js/state.js` 的 `SAVE_VERSION` 決定，`save()` 每次寫入時自動蓋上。

**改了存檔格式就把 `SAVE_VERSION` +1。** 讀檔時：

- **版號不符** → 整份存檔作廢並從 localStorage 刪掉，開起來就是全新的一缸。不做舊格式升級——
  與其讓半舊的資料混在裡面跑出奇怪的狀態，不如乾脆重來。
- **版號相符但有壞掉的紀錄** → 只刪那幾筆（欄位不全的烏龜、指向不存在烏龜的關係、壞掉的日誌），
  其餘保留，並在遊戲裡提示清掉了幾筆。
- 匯入舊版號的存檔檔案會被擋下來，並顯示它是第幾版。
