# 斑龜素材狀態（v3 動作）

由 `tools/asset_status.py` 產生。目前切出 528 張。

v3 規則：三視角（正面俯看 45°／側面朝右／背面俯看 45°），每個動作一張 3 × 4 的圖。
左側由程式鏡像產生，不用畫。動作清單與提示詞：`gpt/actions/bangui_v3/`。

還沒有 v3 新圖的動作，遊戲會先用舊圖代替（下表「用舊圖」），所以不會缺畫面；
但舊圖的正面／背面是舊的平視角度，跟 v3 的俯看 45° 不一樣，最終都要換成新圖。

## 水上（13）

| # | 動作 | 說明 | 現有視角 | 狀態 |
|---:|---|---|---|---|
| 01 | `walk` | 走路 | BFLR | 用舊圖 `walk_a`、`walk_b` |
| 02 | `turn` | 轉身 | BFLR | 用舊圖 `turn` |
| 03 | `look` | 抬頭張望 | BFLR | 用舊圖 `look`、`neck_up`、`observe` |
| 04 | `sniff` | 低頭聞聞 | BFLR | ✅ v3 新圖 |
| 05 | `eat` | 吃東西（陸上） | BFLR | ✅ v3 新圖 |
| 06 | `bask` | 曬背 | BFLR | ✅ v3 新圖 |
| 07 | `sleep` | 睡覺 | BFLR | 用舊圖 `sleep`、`rest`、`relax` |
| 08 | `yawn` | 打哈欠 | BFLR | ✅ v3 新圖 |
| 09 | `hide` | 縮進殼裡 | BFLR | ✅ v3 新圖 |
| 10 | `startled` | 嚇一跳 | BFLR | ✅ v3 新圖 |
| 11 | `happy` | 開心（搖屁屁） | BFLR | 用舊圖 `happy`、`shake`、`wag` |
| 12 | `enter_water` | 下水 | BFLR | ✅ v3 新圖 |
| 13 | `flip` | 翻過來 | BFLR | ✅ v3 新圖 |

## 水下（10）

| # | 動作 | 說明 | 現有視角 | 狀態 |
|---:|---|---|---|---|
| 14 | `swim` | 游泳 | BFLR | ✅ v3 新圖 |
| 15 | `swim_turn` | 水中轉向 | BFLR | ✅ v3 新圖 |
| 16 | `hover` | 水中懸停 | BFLR | ✅ v3 新圖 |
| 17 | `dive` | 下潛 | BFLR | ✅ v3 新圖 |
| 18 | `surface` | 上浮換氣 | BFLR | ✅ v3 新圖 |
| 19 | `float` | 水面漂浮 | BFLR | ✅ v3 新圖 |
| 20 | `eat_water` | 水中吃東西 | BFLR | ✅ v3 新圖 |
| 21 | `bottom_walk` | 水底走路 | BFLR | ✅ v3 新圖 |
| 22 | `bottom_rest` | 水底休息 | BFLR | ✅ v3 新圖 |
| 23 | `climb_out` | 上岸 | BFLR | ✅ v3 新圖 |

**進度：18 / 23 個動作有 v3 新圖；0 個完全沒有圖。**

還要生成：01 `walk`（走路）、02 `turn`（轉身）、03 `look`（抬頭張望）、07 `sleep`（睡覺）、11 `happy`（開心（搖屁屁））
