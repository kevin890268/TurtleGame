# 共用動作提示詞（4 視角版）

> **此檔案為所有澤龜共用**，不含任何外觀描述。生成時需上傳該品種的 26 方向定裝照（`ref_26.png`）作角色參考。
> 品種無關：斑龜、歐洲澤龜、剃刀龜等皆用同一套動作。

## 共用規則（所有 Sheet 皆適用）

```
Attached image: the 26-view character reference of your species — use it as the EXACT character design.
Character: the same turtle as the attached reference. Keep EVERY appearance detail identical: same carapace colors and seams, same plastron color, same stripe pattern, same eye color, same style (soft hand-painted watercolor with clean dark-brown outlines). Do NOT change colors, patterns, stripe count, eye size or style. Only the pose, limb positions, neck angle and expression may change.

Rules for every cell:
- Exactly one full-body turtle per cell, no cropping
- Same turtle scale in every cell (carapace length ~45% of cell width)
- Background: flat solid magenta #FF00FF only, no water, ground, shadow, bubbles, ripples, motion lines, text, labels or symbols
- No grid lines or borders
```

**視角定義**：
| 代碼 | 描述 |
|------|------|
| `R` | facing RIGHT, right side closest |
| `L` | facing LEFT,  left side closest (mirror of R) |
| `F` | FRONT, toward viewer, symmetrical |
| `B` | BACK, away from viewer, domed carapace dominates |

---

## Sheet 1：日常移動｜`sheet_move.png`（6×4 = 24 格，3072×2048）

| 動作 | 姿勢重點（純動作） |
|------|-------------------|
| walk_a | 對角步態中段：近前腿與遠後腿同時前伸、另兩腿後蹬，殼離地，頭平視 |
| walk_b | 低爬：腹部近貼地，四肢彎曲外展，遠前腿前探，頭低前伸 |
| look | 直腿站立，頸 45° 抬，頭微轉向觀眾，雙眼圓睜警覺 |
| neck_up | 頸近垂直極限伸展，前腿撐直抬高身軀 |
| observe | 頸前伸微上揚，頭平視遠方，一前腳半抬定格 |
| sniff | 頭全壓低觸地，頸向下彎，後端較高，眼看地面 |

```
2D game pose sheet, 3072x2048 image, 6 columns x 4 rows = 24 cells of 512x512, no grid lines.
Rows top-to-bottom are views R, L, F, B; columns left-to-right are the 6 actions above in order.
Land poses: all feet on invisible ground line at 75% cell height; shell centered slightly left of center to leave room for head. Only the pose changes.
```

---

## Sheet 2：休息狀態｜`sheet_rest.png`（6×4）

| 動作 | 姿勢重點 |
|------|----------|
| bask | 腹貼地，頸前上伸向光，雙眼閉，雙後腿完全伸直向後、腳底朝天 |
| sleep | 平趴，頭縮入僅露臉，雙眼閉，四肢內收 |
| yawn | 頭後仰向上，嘴張到最大，雙眼緊閉，前腿撐起上半身 |
| stretch | 前腿極限前伸，頸拉長平伸，後腿極限後伸，全身最長 |
| hide | 頭四肢全縮入，僅鼻尖與閉眼露前開口，殼平放 |
| rest | 平趴，下巴抵地，四肢鬆弛，半閉眼 |

```
Same header as Sheet 1 (3072x2048, 6x4, rows R/L/F/B, cols the 6 actions above).
```

---

## Sheet 3：情緒反應｜`sheet_mood.png`（6×4）

| 動作 | 姿勢重點 |
|------|----------|
| happy | 頭向觀眾抬，嘴大張笑，眼發光，前半身微彈 |
| startled | 頸筆直彈起，雙眼瞪圓，後坐後腿上，前腳離地 |
| angry | 皺眉，頭微縮，嘴噘，斜睨觀眾 |
| purr | 安穩趴伏，眼閉成弧，嘴角上揚 |
| think | 頭側傾一眼向上遠望，嘴微張 |
| relax | 四腿直立，頸自然下垂，雙眼閉 |

```
Same header as Sheet 1.
```

---

## Sheet 4：水中動作｜`sheet_water.png`（6×4）

| 動作 | 姿勢重點 |
|------|----------|
| swim | 水平，頸前伸，近前腿划水中段向後，遠前腿前探，後腿蹬踢 |
| dive | 全身傾 40° 首朝下，頸向下伸，前腿收後，後腿向上蹬 |
| rise | 全身傾 40° 首朝上，頸伸向水面，鼻孔領頭 |
| float | 水平放鬆，四肢大張無力，頸鬆弛，半閉眼 |
| drink | 站底，僅頸筆直向上，鼻孔朝天 |
| nibble | 頸前伸，嘴合褐色飼料粒，臉頰鼓起 |

```
Same header as Sheet 1, but water poses: shell centered in cell, no ground line, still magenta background, no water/bubbles.
```

---

## Sheet 5：游泳循環｜`loop_swim.png`（4×4 = 16 格，2048×2048）

> 單張 4 視角 × 4 幀。行=R/L/F/B，列=幀1-4。同視角內殼頭頸完全一致，只有四肢動。

| 視角 | 幀1 | 幀2 | 幀3 | 幀4 |
|------|-----|-----|-----|-----|
| R/L/F/B | 近前腿極限前伸，近後腿收回 | 近前腿向下向後強力划水，後腿蹬踢 | 近前腿貼殼側向後平放，後腿完全伸直 | 四肢放鬆滑回中點 |

```
2D game animation frames, 2048x2048 image, 4 columns x 4 rows = 16 cells of 512x512, no grid lines.
Rows R,L,F,B; columns frames 1-4 in order. Body horizontal, neck straight forward, same scale/position in every cell, flat magenta.
```

---

## Sheet 6：爬行循環｜`loop_walk.png`（4×4）

| 幀 | 姿勢重點 |
|----|----------|
| 1 | 近前腿+遠後腿同時前伸（對角步） |
| 2 | 四腿身體下，殼最高 |
| 3 | 遠前腿+近後腿同時前伸 |
| 4 | 四腿身體下，殼微沉，頭微點 |

```
Same header as Sheet 5 (2048x2048, 4x4, rows R/L/F/B, cols frames 1-4). Ground line at 75% cell height, head stays level.
```

---

## Sheet 7：搖尾巴循環｜`loop_wag.png`（4×4）

> 頭殼四肢完全不動，只有短尾巴動。

| 幀 | 尾巴 |
|----|------|
| 1 | 向觀眾側甩 |
| 2 | 回中間筆直向後 |
| 3 | 向遠側甩（被殼擋半） |
| 4 | 回中間並向上一翹 |

```
Same header as Sheet 5. Same turtle position in every cell, only tail moves. Flat magenta.
```

---

## Sheet 8：搖屁屁循環｜`loop_shake.png`（4×4）

> 前端（頭/頸/前腿/前半背甲）完全固定，只有抬高的後半身翻滾。

| 幀 | 姿勢重點 |
|----|----------|
| 1 | 後端高翹，後腿近乎伸直，殼前低後高 20° |
| 2 | 後半殼向觀眾側翻滾，露出米黃腹甲邊緣 |
| 3 | 回中間微向下彈，後腿微彎 |
| 4 | 後半殼向遠離觀眾翻滾，藏住腹甲 |

```
Same header as Sheet 5, rows R/L/F/B, cols frames 1-4. Ground line at 78% cell height. Front end identical in all cells.
Critical 4-view difference: frame2 must show plastron, frame4 must hide it.
```

---

## 檔名與生成

| Sheet | 檔名 | 格局 |
|-------|------|------|
| 日常移動 | `sheet_move.png` | 6×4 (3072×2048) |
| 休息 | `sheet_rest.png` | 6×4 |
| 情緒 | `sheet_mood.png` | 6×4 |
| 水中 | `sheet_water.png` | 6×4 |
| 游泳循環 | `loop_swim.png` | 4×4 (2048×2048) |
| 爬行循環 | `loop_walk.png` | 4×4 |
| 搖尾巴 | `loop_wag.png` | 4×4 |
| 搖屁屁 | `loop_shake.png` | 4×4 |

**步驟**：上傳該品種的 `ref_26.png` 定裝照作唯一角色參考，貼上對應 Sheet 的 prompt（已不含外觀）。
