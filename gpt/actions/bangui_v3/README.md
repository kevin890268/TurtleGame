# 斑龜動作 v3：水上 13 ＋ 水下 10 ＝ 23 個

> 由 `tools/make_actions_v3.py` 產生，要改內容請改那支程式再執行。
> 規則：`gpt/rules/rules_bangui_v3.6.md`（三視角：正面俯看 45°／側面／背面俯看 45°，每張 3 × 4）。

## 怎麼用

1. 上傳 `reference/character/bangui_character.png`（角色參考）
2. 上傳 `gpt/rules/rules_bangui_v3.6.md`（規則）
3. 上傳要做的那一個 `action_NN_xxx.md`
4. 產出的圖存成 `reference/sheets/bangui/action_NN_xxx.png`，跑 `python tools/slice_poses_v4.py bangui`

## 挑選原則

- **動作要簡單、一眼看得出來**：尾巴擺動、生氣這種幅度小或表情型的動作都刪了。
- **水上、水下各自完整**：兩邊都有移動、轉向、進食、休息，以及進出水的過場（下水／上岸）。
- **不要快速動作**：`run`、`swim_fast` 刪除，搶食也用一般速度（配合 docs/backlog.md 第 2 項）。

## 水上（陸地、曬台、淺灘）

| # | 動作 | 中文 | 類型 | 內容 |
|---:|---|---|---|---|
| 01 | `walk` | 走路 | 循環 | A slow, calm walk on land. The shell stays level and lifted just above the ground. |
| 02 | `turn` | 轉身 | 單次 | The whole turtle turns about 90 degrees toward its own left, stepping in place. |
| 03 | `look` | 抬頭張望 | 循環 | The turtle stops, lifts its neck and looks around. |
| 04 | `sniff` | 低頭聞聞 | 循環 | The turtle lowers its head and sniffs the ground. |
| 05 | `eat` | 吃東西（陸上） | 單次 | The turtle eats something lying on the ground. The food itself is NOT drawn. |
| 06 | `bask` | 曬背 | 循環 | Basking under a lamp: resting on its plastron, neck stretched up toward the light, hind legs stretched backward. |
| 07 | `sleep` | 睡覺 | 循環 | Sleeping on land: plastron on the ground, head partly withdrawn, eyes closed. A slow breathing loop. |
| 08 | `yawn` | 打哈欠 | 單次 | A slow, big yawn. |
| 09 | `hide` | 縮進殼裡 | 單次 | The turtle pulls its head and legs into the shell, then peeks out. |
| 10 | `startled` | 嚇一跳 | 單次 | A harmless surprise: the head jerks back, then the turtle calms down. |
| 11 | `happy` | 開心（搖屁屁） | 循環 | A happy little wiggle: the rear of the body sways from side to side while the front stays planted. |
| 12 | `enter_water` | 下水 | 單次 | From the edge of land, the turtle slides forward into the water. Water is NOT drawn. |
| 13 | `flip` | 翻過來 | 循環 | The turtle is stuck UPSIDE DOWN on its carapace and tries to turn itself back over. |

## 水下

| # | 動作 | 中文 | 類型 | 內容 |
|---:|---|---|---|---|
| 14 | `swim` | 游泳 | 循環 | Calm swimming. Body level, neck stretched forward, tail trailing behind. |
| 15 | `swim_turn` | 水中轉向 | 單次 | While swimming, the turtle banks and turns about 90 degrees toward its own left. |
| 16 | `hover` | 水中懸停 | 循環 | Staying in one place in mid-water with small, lazy paddling. |
| 17 | `dive` | 下潛 | 單次 | From level swimming the turtle points its nose down and dives. |
| 18 | `surface` | 上浮換氣 | 單次 | The turtle swims up and pushes its nose out of the water to breathe. The water surface is NOT drawn. |
| 19 | `float` | 水面漂浮 | 循環 | Resting at the surface: body almost level, rear slightly lower, legs relaxed and spread, head up. |
| 20 | `eat_water` | 水中吃東西 | 單次 | The turtle bites food in mid-water. The body floats; it is NOT standing. The food itself is NOT drawn. |
| 21 | `bottom_walk` | 水底走路 | 循環 | Walking slowly on the bottom of the water. Lighter and floatier than walking on land. |
| 22 | `bottom_rest` | 水底休息 | 循環 | Resting (or sleeping) on the bottom of the water. Plastron on the bottom, neck stretched forward, legs relaxed. |
| 23 | `climb_out` | 上岸 | 單次 | From the water the turtle climbs up onto the basking platform. The platform is NOT drawn. |

## 跟舊的 27 動作對照

| 舊動作（27） | v3 | 說明 |
|---|---|---|
| `walk_a` | `walk` | 改名 |
| `run` | — | 刪除：烏龜不該衝，搶食也改成慢慢走（見 docs/backlog.md 第 2 項） |
| `turn` | `turn` | 保留 |
| `look` | `look` | 保留 |
| `sniff` | `sniff` | 保留 |
| `bask` | `bask` | 保留（之前一直沒生成） |
| `sleep` | `sleep` | 保留 |
| `yawn` | `yawn` | 保留 |
| `stretch` | `bask` | 併入：伸懶腰跟曬背伸腿幾乎一樣 |
| `hide` | `hide` | 保留，並規定 Frame 1 一定要是頭腳都伸出來 |
| `rest` | sleep / bottom_rest | 併入：陸上休息＝睡覺，水裡休息另外做 |
| `happy` | `happy` | 改成搖屁屁 |
| `startled` | `startled` | 保留 |
| `angry` | — | 刪除：烏龜生氣看不太出來，改用 startled / hide 表現 |
| `wag` | `happy` | 併入：尾巴擺動太小，畫出來幾乎看不出在動 |
| `shake` | `happy` | 併入（改名 happy） |
| `dig` | — | 刪除：遊戲裡沒有用到的情境 |
| `eat` | `eat` | 保留，限定陸上 |
| `poop` | — | 刪除：之後撈便便用物件表現，不需要動作 |
| `play` | — | 刪除：太模糊，改由互動請求做 |
| `enter_water` | `enter_water` | 保留 |
| `swim` | `swim` | 保留 |
| `swim_fast` | — | 刪除：烏龜不該衝 |
| `swim_turn` | `swim_turn` | 保留 |
| `dive` | `dive` | 保留 |
| `float` | `float` | 保留 |
| `surface` | `surface` | 保留 |

新增：`flip`（翻過來）、`hover`（水中懸停）、`eat_water`（水中吃）、`bottom_walk`（水底走路）、`bottom_rest`（水底休息）、`climb_out`（上岸）。

在新圖生成之前，遊戲會自動用舊的切圖代替（例如 `walk` → `walk_a`、`bottom_rest` → `rest`），不會缺圖。
