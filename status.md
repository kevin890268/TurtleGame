# 斑龜日記：開發狀態

最後更新：2026-09-21

網頁版的斑龜（*Mauremys sinensis*）飼養遊戲。純前端靜態網站，不需要建置步驟，可以直接放上 GitHub Pages。

---

## 怎麼跑

```bash
python -m http.server 8123 --directory C:/Users/User/Desktop/Turtle
```

- 本機：http://localhost:8123
- 同一個 Wi-Fi 的手機：http://192.168.0.151:8123。啟動時要加 `--bind 0.0.0.0`，防火牆也要放行 8123。這個 IP 是路由器分配的，可能會變。
- 加速測試：`?speed=600`（1 秒 = 10 分鐘，使用獨立存檔，並開啟 `window.debug` 除錯入口）

---

## 已完成

### 遊戲系統
- [x] 五項數值：飽足、水質、日照、健康、心情
- [x] 遊戲時間和現實時間同步，離開後回來會補算，最多補 72 小時
- [x] 日夜：06:00 天亮、19:00 天黑；曬背燈可手動開關，也可用定時器（08–18）
- [x] 成長：幼龜 → 亞成龜 → 成龜，三天內吃的食物種類越多長得越快
- [x] 陪牠玩（玩太多次會嫌煩）、看獸醫（健康低於 40 才能用）
- [x] 存檔放在瀏覽器（localStorage），可匯出、匯入 JSON
- [x] 飼養日誌

### 畫面
- [x] **2.5D（預設）**：Three.js 3D 場景，澤龜是轉向鏡頭的 2D 圖片；可拖曳轉鏡頭、滾輪縮放
- [x] **2D**：純 Canvas，不需要網路；右上角可切換
- [x] 地形：深水區 → 斜坡 → 淺水區（挺水植物）→ 岸邊 → 曬台（燈在正上方）
- [x] 水質變差時水會變混濁、出現漂浮雜質；打氣石會冒泡；水面有波浪

### 烏龜行為
- [x] 水夠深的地方用游的，淺水區和曬台上用走的（小烏龜在淺水區也游得起來）
- [x] 開燈時爬上曬台曬背、晚上在深水區底部或淺灘睡覺、看到食物會追過去吃
- [x] 依狀態切換 48 個姿勢：游泳和爬行播 4 幀循環、下潛和上浮有專用姿勢、停下時隨機打哈欠或伸懶腰等
- [x] 反應：陪牠玩時搖尾巴、跳一下；玩太多次縮進殼裡；換水時嚇一跳
- [x] 程式做的動感：呼吸起伏、划水擺動、換姿勢時淡入淡出

### 投餵
- [x] 經典養魚遊戲的操作：選食物後，點水缸哪裡就從那裡上方掉一顆（Esc 或再按一次取消）
- [x] 浮沉物理：依密度浮在水面，吸水後密度變大就開始下沉，越沉越快；落水時有漣漪
  - 飼料：浮約 15 秒，約 40 秒沉到底
  - 蝦乾：浮 1～2 秒，沉得最快
  - 菜葉：浮約 25 秒，像落葉一樣左右飄著慢慢沉
- [x] 沒吃完的食物 2 分鐘後泡爛，會弄髒水

### 美術素材流程
- [x] GPT 提示詞：`assets/PROMPTS_ACTIONS.md`（洋紅色底的姿勢表）
- [x] 切圖工具 `tools/slice_poses.py`：自動去背，濾掉文字和特效，扣掉邊緣殘留的洋紅色，以背甲中心對齊、統一大小

---

## 素材進度

| 姿勢表 | 檔案 | 狀態 |
|---|---|---|
| 原型（36 姿勢） | `reference/active2.png` | ✅ 使用中，被正式版覆蓋的姿勢不再使用 |
| A 陸地日常 | `reference/sheets/sheet_a.png` | ✅ |
| B 休息 | `reference/sheets/sheet_b.png` | ✅ |
| C 心情反應 | `reference/sheets/sheet_c.png` | ⬜ 還沒生（開心、驚嚇、生氣等目前用原型） |
| D 水中動作 | `reference/sheets/sheet_d.png` | ✅ |
| 游泳循環 | `reference/sheets/loop_swim.png` | ✅ |
| 爬行循環 | `reference/sheets/loop_walk.png` | ✅ |
| 搖尾巴循環 | `reference/sheets/loop_wag.png` | ✅ 開心時播放 |
| 搖屁股循環 | `reference/shakebutton2.png` | 🟡 已生成，還沒接進遊戲 |

其他參考圖：`reference/active.png`（16 種動作概念圖）、`reference/styles_36.png`（36 種畫風樣品，選了 01 溫柔手繪風）

---

## 程式結構

```
index.html
css/style.css
js/config.js        可調參數（時間倍率、日夜、成長速度、食物泡爛時間）
js/state.js         存檔／讀檔
js/sim.js           遊戲規則（數值變化、玩家動作），離線補算也走這裡
js/terrain.js       地形剖面，2D 和 2.5D 共用
js/tank.js          烏龜行為、食物物理 + 2D 畫面
js/tank3d.js        2.5D 畫面（繼承 tank.js，只換掉繪圖）
js/poses.js         姿勢載入、依狀態挑姿勢、程式動感
js/turtle-shape.js  沒有姿勢圖時用程式畫的烏龜
js/ui.js            面板顯示
js/main.js          把上面串起來
assets/poses/       切好的姿勢圖（由切圖工具產生，不要手動改）
reference/          GPT 原始圖與姿勢表
tools/slice_poses.py
```

常調的參數：
- 食物浮沉：`js/tank.js` 的 `FOOD_PHYSICS`
- 地形形狀：`js/terrain.js` 的 `PROFILE`
- 2.5D 裡烏龜和食物的放大倍率：`js/tank3d.js` 的 `TURTLE_SCALE`、`FOOD_SCALE`

---

## 已知問題

- 原型圖裡部分姿勢腳下帶著淡色的地面陰影（縮頭、警戒、產卵等），等姿勢表 C 或重生後就會消失
- 2.5D 裡烏龜放大了 1.4 倍，站在淺灘時看起來比水深還大一點
- 手機版版面還沒最佳化：按鈕面板排在缸子下面，要捲動才看得到
- Three.js 從 CDN 載入，沒網路時 2.5D 會自動退回 2D

---

## 下一步

1. **GitHub Pages 上線**：repo 已推送，到 Settings → Pages 選 `main` 分支就能啟用
2. **姿勢表 C**：生好後放到 `reference/sheets/sheet_c.png`，執行 `python tools/slice_poses.py`
3. **搖屁股接進遊戲**：把 `shakebutton2.png` 搬到 `reference/sheets/loop_shake.png`，加進切圖工具，當作開心或閒置時的小動作
4. **手機版**：缸子全螢幕，按鈕做成浮在下方的工具列
5. **養成內容**（擇一開始）：成長相簿、隨機事件（脫殼、打噴嚏）、布置缸子、零用錢和商店、季節與水溫、提醒通知
6. **畫面**：音效、水底光紋、烏龜影子、在淺灘時身體半露出水面
