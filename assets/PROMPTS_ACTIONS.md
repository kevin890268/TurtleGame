# 斑龜姿勢圖：GPT 產圖提示詞（高解析度正式版）

目前遊戲先用 `reference/active2.png` 切出來的 36 個姿勢當原型。這份提示詞是用來重生**乾淨、高解析度**的正式版本。

## 進度

| 姿勢表 | 檔案 | 狀態 |
|---|---|---|
| A 陸地日常 | `sheets/sheet_a.png` | ✅ 已完成 |
| B 休息 | `sheets/sheet_b.png` | ✅ 已完成 |
| C 心情反應 | `sheets/sheet_c.png` | ⬜ 還沒生（目前用 active2 的原型） |
| D 水中動作 | `sheets/sheet_d.png` | ✅ 已完成 |
| E 游泳循環 | `sheets/loop_swim.png` | ✅ 已完成 |
| F 爬行循環 | `sheets/loop_walk.png` | ✅ 已完成 |
| 搖尾巴循環 | `sheets/loop_wag.png` | ✅ 已完成（額外加的，開心時會播） |

## 做法：一個動作一張姿勢圖

每個動作只要 **1 張姿勢圖**，晃動、呼吸、傾斜、位移都由程式處理。
只有「游泳」和「爬行」這兩個會循環播放的動作，才另外生連續幀。

## 使用步驟

1. 每張圖都在**新的對話**裡生成，並上傳 `reference/active2.png` 當角色參考。
2. 直接複製下面的完整提示詞。
3. 姿勢表每張 **1536×1024、3 欄 × 2 列，共 6 格，每格 512×512**，照「左上 → 右上 → 右上角 → 左下 → 下中 → 右下」的順序。
4. 背景一律用**純洋紅色 #FF00FF**，不要用透明背景。GPT 的「透明」其實是半透明加雜訊，就是 active2 背景那些紅黃色斑塊。洋紅色在斑龜身上完全不會出現，切圖工具可以乾淨地去背。
5. 存到 `reference/sheets/`，檔名照下面各段標示的名稱，再跑切圖工具：
   ```
   python tools/slice_poses.py
   ```

---

## 姿勢表 A：陸地日常｜`sheet_a.png`

```
2D game character pose sheet, 1536x1024 image, a grid of 3 columns x 2 rows = six
512x512 cells, no grid lines, no borders.

Use the attached reference image as the EXACT character design: the same young Chinese
stripe-necked turtle (Mauremys sinensis), same dark olive-brown carapace with thin golden
seams and speckles, same cream-yellow plastron, same olive-green skin with thin yellow
stripes, same round dark eyes, same proportions, same soft hand-painted storybook
watercolor style with clean dark brown outlines. No red patch behind the eye.

Rules for EVERY cell:
- exactly one turtle, full body, three-quarter side view, body facing RIGHT
- the same turtle size in every cell: shell length about 45% of the cell width
- shell centered horizontally slightly left of center, leave room for the head
- background: perfectly flat solid magenta #FF00FF, no gradient, no shadow, no ground
- NO text, NO numbers, NO labels, NO sound effects, NO symbols, NO sparkles

Cells (left to right, top row then bottom row):
1. walking slowly, right front leg stepping forward
2. crawling low and slow, left front leg stepping forward, body closer to the ground
3. standing still, head raised, looking around alertly
4. neck stretched up to maximum length, curious
5. head held up, observing something in the distance
6. head lowered to the ground, sniffing
```

## 姿勢表 B：休息與情緒｜`sheet_b.png`

```
2D game character pose sheet, 1536x1024 image, a grid of 3 columns x 2 rows = six
512x512 cells, no grid lines, no borders.

Use the attached reference image as the EXACT character design: the same young Chinese
stripe-necked turtle (Mauremys sinensis), same dark olive-brown carapace with thin golden
seams and speckles, same cream-yellow plastron, same olive-green skin with thin yellow
stripes, same round dark eyes, same proportions, same soft hand-painted storybook
watercolor style with clean dark brown outlines. No red patch behind the eye.

Rules for EVERY cell:
- exactly one turtle, full body, three-quarter side view, body facing RIGHT
- the same turtle size in every cell: shell length about 45% of the cell width
- shell centered horizontally slightly left of center, leave room for the head
- background: perfectly flat solid magenta #FF00FF, no gradient, no shadow, no ground
- NO text, NO numbers, NO labels, NO "zzz", NO sun, NO music notes, NO symbols

Cells (left to right, top row then bottom row):
1. basking: lying flat, neck stretched forward and up, eyes closed blissfully,
   BOTH HIND LEGS STRETCHED STRAIGHT BACKWARDS
2. sleeping: head half pulled in, eyes closed, lying flat
3. yawning: head tilted up, mouth wide open showing pink inside, eyes squeezed shut
4. big lazy stretch: front legs reaching forward, neck fully out, hind legs pushed back
5. head and legs fully pulled into the shell, only a peeking closed-eye face
6. lying flat resting, chin on the ground, relaxed half-closed eyes
```

## 姿勢表 C：心情反應｜`sheet_c.png`

```
2D game character pose sheet, 1536x1024 image, a grid of 3 columns x 2 rows = six
512x512 cells, no grid lines, no borders.

Use the attached reference image as the EXACT character design: the same young Chinese
stripe-necked turtle (Mauremys sinensis), same dark olive-brown carapace with thin golden
seams and speckles, same cream-yellow plastron, same olive-green skin with thin yellow
stripes, same round dark eyes, same proportions, same soft hand-painted storybook
watercolor style with clean dark brown outlines. No red patch behind the eye.

Rules for EVERY cell:
- exactly one turtle, full body, three-quarter side view, body facing RIGHT
- the same turtle size in every cell: shell length about 45% of the cell width
- shell centered horizontally slightly left of center, leave room for the head
- background: perfectly flat solid magenta #FF00FF, no gradient, no shadow, no ground
- NO text, NO numbers, NO labels, NO symbols, NO speech bubbles, NO hearts, NO lines

Cells (left to right, top row then bottom row):
1. happy: head up, mouth open in a big smile, eyes sparkling
2. startled: neck shot straight up, eyes wide open, body leaning back
3. grumpy: frowning eyebrows, head pulled back a little, pouting
4. content: eyes closed with a gentle smile, cheeks slightly rosy
5. thinking: head tilted, looking up to the side, curious
6. relaxed: standing calmly, eyes closed, peaceful smile
```

## 姿勢表 D：水中動作｜`sheet_d.png`

```
2D game character pose sheet, 1536x1024 image, a grid of 3 columns x 2 rows = six
512x512 cells, no grid lines, no borders.

Use the attached reference image as the EXACT character design: the same young Chinese
stripe-necked turtle (Mauremys sinensis), same dark olive-brown carapace with thin golden
seams and speckles, same cream-yellow plastron, same olive-green skin with thin yellow
stripes, same round dark eyes, same proportions, same soft hand-painted storybook
watercolor style with clean dark brown outlines. No red patch behind the eye.

Rules for EVERY cell:
- exactly one turtle, full body, three-quarter side view, body facing RIGHT
- the same turtle size in every cell: shell length about 45% of the cell width
- the shell centered in the cell
- background: perfectly flat solid magenta #FF00FF, no gradient, no shadow
- NO water, NO bubbles, NO ripples, NO text, NO numbers, NO symbols

Cells (left to right, top row then bottom row):
1. swimming horizontally, neck forward, front legs sweeping back
2. diving down, body tilted nose-down about 40 degrees, legs paddling
3. rising to the surface, body tilted nose-up about 40 degrees, neck stretched up
4. floating and stretching, all four legs spread wide and limp
5. standing on the bottom with only the head raised, nose up as if breathing at the
   surface of shallow water
6. biting a small torn piece of green water-plant leaf, neck extended
```

## 循環幀 E：游泳 4 幀｜`loop_swim.png`

```
2D game animation frames, 1024x1024 image, a 2x2 grid of four 512x512 cells,
no grid lines.

Use the attached reference image as the EXACT character design (same young Chinese
stripe-necked turtle, same colors, stripes, proportions and storybook watercolor style
with clean dark brown outlines).

Every cell: the same turtle at exactly the same size and position (shell length about
45% of the cell width, shell centered), three-quarter side view, facing RIGHT, body
horizontal, neck extended forward. Background perfectly flat solid magenta #FF00FF.
No water, no bubbles, no text.

A looping SWIM cycle; the shell and head stay in exactly the same place, only the legs move.
Frame 1 (top-left): front legs reaching forward, back legs pulled in.
Frame 2 (top-right): front legs sweeping down and back, back legs kicking back.
Frame 3 (bottom-left): front legs fully back along the body, back legs extended.
Frame 4 (bottom-right): legs relaxed and gliding, halfway back to frame 1.
```

## 循環幀 F：爬行 4 幀｜`loop_walk.png`

```
2D game animation frames, 1024x1024 image, a 2x2 grid of four 512x512 cells,
no grid lines.

Use the attached reference image as the EXACT character design (same young Chinese
stripe-necked turtle, same colors, stripes, proportions and storybook watercolor style
with clean dark brown outlines).

Every cell: the same turtle at exactly the same size and position (shell length about
45% of the cell width), three-quarter side view, facing RIGHT, the bottom of the feet on
the same horizontal line at 75% of the cell height. Background perfectly flat solid
magenta #FF00FF. No ground, no text.

A looping slow WALK cycle; the shell stays in the same place, only the legs and a tiny
head bob change.
Frame 1 (top-left): right front leg stepping forward, left back leg pushing back.
Frame 2 (top-right): legs passing under the body, feet close together.
Frame 3 (bottom-left): left front leg stepping forward, right back leg pushing back.
Frame 4 (bottom-right): legs passing under the body again, head slightly lower.
```

---

## 生成後的檢查清單

- [ ] 背景是純洋紅色，沒有漸層也沒有影子
- [ ] 沒有文字、編號、zzz、泡泡、符號
- [ ] 每格烏龜大小大致相同（切圖工具會再自動校正）
- [ ] 全部面向右邊，眼睛後方沒有紅斑
- [ ] 烏龜沒有超出格子邊界
