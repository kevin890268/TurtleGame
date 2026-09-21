# 剃刀龜姿勢圖：GPT 產圖提示詞

品種：**剃刀龜**（razor-backed musk turtle）*Sternotherus carinatus*。品種資料見 [docs/species.md](../../docs/species.md)、[docs/species_traits.md](../../docs/species_traits.md)。

> 這份檔案由 `tools/make_prompts.py` 產生，要修改請改那支程式再重新執行。

> 這個品種還沒登記進 `js/species.js` 和 `tools/slice_poses.py`，生好圖之後要先登記，遊戲和切圖工具才認得它。

## 外觀重點

- **背甲中線像屋頂一樣尖尖地隆起**（剃刀背），兩側是陡坡
- 背甲淺褐色到棕褐色，布滿**黑色小斑點**，盾片邊緣較深
- 腹甲小
- 皮膚灰褐色，頭上有深色小斑點；吻部尖長，腳短

## 行為特色

- 跟麝香龜是近親，也常在水底走路
- 比麝香龜稍微大一點

## 提示詞的撰寫標準

1. **描述看得到的畫面**：不寫「左腳／右腳」，改寫「靠近觀眾的腳／遠離觀眾的腳」「往觀眾這邊／遠離觀眾」。烏龜面向右時，牠的右側朝向觀眾，只寫左右 GPT 很容易搞混。
2. **講清楚哪些部位固定不動**：循環動畫都會指定固定的部位，切圖對齊後播放才不會整隻晃。
3. **用熟悉的畫面比喻**：例如「像落葉一樣漂浮」「像突然定格」，讓 GPT 抓到感覺。
4. **放大關鍵特徵**：例如曬背時後腿往後伸直、腳底朝天；伸長脖子時要伸到極限。
5. **動作符合真實**：烏龜走路是對角的兩隻腳一起動（靠近觀眾的前腳配遠離觀眾的後腳）。
6. **每格附中文說明**：方便你核對 GPT 生出來的圖有沒有畫對。

---

## 使用步驟

1. **先做定裝照（第 0 步）**：上傳 `reference/sheets/bangui/sheet_a.png`（斑龜的姿勢表）當畫風參考，滿意後存成 `reference/sheets/razorback/razorback_ref.png`
2. 之後每張都在**新的對話**裡生成，上傳兩張圖：
   - `razorback_ref.png`：角色參考
   - `reference/sheets/bangui/sheet_a.png`：畫風參考（斑龜的姿勢表，讓各品種畫風和大小一致）
3. 直接複製下面的完整提示詞
4. 存到 `reference/sheets/razorback/`，檔名照各段標示的名稱，再執行 `python tools/slice_poses.py razorback`

背景一律是**純洋紅色 #FF00FF**。GPT 的「透明背景」其實是半透明加雜訊，切圖工具處理洋紅色最乾淨。

---

## 第 0 步：定裝照｜`razorback_ref.png`

```
Character design reference for a 2D game. Match the ART STYLE of the attached reference
image exactly (soft hand-painted storybook watercolor coloring, clean dark brown outlines,
cute proportions), but draw a DIFFERENT species described below.

Character: a young razor-backed musk turtle (Sternotherus carinatus): a steep, ROOF-SHAPED carapace with a sharp central ridge like the edge of a razor, light tan to brown with many small black spots and darker scute edges, a small plastron, grey-brown skin with small dark spots on the head, a long pointed snout and short stubby legs.
NOT a common musk turtle (the shell is steep and roof-like, not a smooth dome).

Pose: standing calmly, three-quarter side view, body facing RIGHT, neck relaxed, all four
legs visible. One single turtle, centered, full body.
Background: perfectly flat solid magenta #FF00FF, no ground, no scenery, no text, no shadow.
Square image 1024x1024, the shell length is about 45% of the image width.
```

---

## 姿勢表 A：日常｜`sheet_a.png`

| 格 | 動作 |
|---|---|
| 1 左上 | 在水底散步 |
| 2 中上 | 慢慢爬 |
| 3 右上 | 張望 |
| 4 左下 | 伸長脖子 |
| 5 中下 | 抬頭觀察 |
| 6 右下 | 低頭聞聞 |

```
2D game character pose sheet, 1536x1024 image, a grid of 3 columns x 2 rows = six
512x512 cells, no grid lines, no borders.

Attached images: (1) razorback_ref.png is the EXACT character design; (2) the other image is the ART STYLE and layout reference only (do not copy that turtle's species).

Character: a young razor-backed musk turtle (Sternotherus carinatus): a steep, ROOF-SHAPED carapace with a sharp central ridge like the edge of a razor, light tan to brown with many small black spots and darker scute edges, a small plastron, grey-brown skin with small dark spots on the head, a long pointed snout and short stubby legs.
NOT a common musk turtle (the shell is steep and roof-like, not a smooth dome). Soft hand-painted storybook watercolor style with clean dark brown outlines.

Rules for EVERY cell:
- exactly one turtle, full body, three-quarter side view, body facing RIGHT
  (so the turtle's right side faces the viewer: "near" legs are closest to us)
- the same turtle size in every cell: shell length about 45% of the cell width
- shell centered horizontally slightly left of center, leave room for the head
- land poses: all feet on the same ground line at 75% of the cell height
- background: perfectly flat solid magenta #FF00FF, no gradient, no shadow, no ground
- NO text, NO numbers, NO labels, NO sound effects, NO symbols, NO sparkles

Cells (left to right, top row then bottom row):
1. WALKING ALONG THE BOTTOM: head held low and forward, the near front leg and the far hind leg stepping forward together, the tall roof-shaped shell proudly up
2. CRAWLING low and slow: the belly almost touching the ground, all four legs bent and splayed wide, the far front leg reaching forward, head low and forward, a patient determined look
3. LOOKING AROUND: standing still on straight legs, neck raised at about 45 degrees, head turned slightly toward the viewer, eyes wide and alert
4. NECK STRETCHED TO THE MAX: the neck points almost straight up and is as long as it can possibly be, showing its full length and markings, chin up, amazed curious eyes; the front legs are straight, lifting the front of the body
5. WATCHING SOMETHING FAR AWAY: neck extended forward and slightly up, head level, eyes focused into the distance, body leaning a little forward, one front foot lifted mid-step as if it froze
6. SNIFFING THE GROUND: head lowered all the way down, nose touching the ground just in front of the front feet, neck curved downward, the back end a little higher than the front, eyes looking down
```

## 姿勢表 B：休息｜`sheet_b.png`

| 格 | 動作 |
|---|---|
| 1 左上 | 曬背 |
| 2 中上 | 睡覺 |
| 3 右上 | 打哈欠 |
| 4 左下 | 伸懶腰 |
| 5 中下 | 縮進殼裡 |
| 6 右下 | 趴著休息 |

```
2D game character pose sheet, 1536x1024 image, a grid of 3 columns x 2 rows = six
512x512 cells, no grid lines, no borders.

Attached images: (1) razorback_ref.png is the EXACT character design; (2) the other image is the ART STYLE and layout reference only (do not copy that turtle's species).

Character: a young razor-backed musk turtle (Sternotherus carinatus): a steep, ROOF-SHAPED carapace with a sharp central ridge like the edge of a razor, light tan to brown with many small black spots and darker scute edges, a small plastron, grey-brown skin with small dark spots on the head, a long pointed snout and short stubby legs.
NOT a common musk turtle (the shell is steep and roof-like, not a smooth dome). Soft hand-painted storybook watercolor style with clean dark brown outlines.

Rules for EVERY cell:
- exactly one turtle, full body, three-quarter side view, body facing RIGHT
  (so the turtle's right side faces the viewer: "near" legs are closest to us)
- the same turtle size in every cell: shell length about 45% of the cell width
- shell centered horizontally slightly left of center, leave room for the head
- land poses: all feet on the same ground line at 75% of the cell height
- background: perfectly flat solid magenta #FF00FF, no gradient, no shadow, no ground
- NO text, NO numbers, NO labels, NO "zzz", NO sun, NO music notes, NO symbols

Cells (left to right, top row then bottom row):
1. BASKING in warm light: belly flat on the ground, neck stretched forward and upward toward the light, eyes closed in bliss, front legs spread out to the sides, and BOTH HIND LEGS STRETCHED STRAIGHT BACKWARDS behind the shell with the soles of the hind feet turned up toward the sky
2. SLEEPING: lying flat, head pulled halfway into the shell so only the face shows at the opening, eyes closed, a peaceful expression, legs tucked in close
3. BIG YAWN: head tilted back and up, mouth opened as wide as possible showing the pink inside, eyes squeezed shut, front legs pushing the body up a little
4. LAZY FULL-BODY STRETCH: front legs pushed far forward, neck stretched out long and low, hind legs pushed straight back, the whole body as long as it can be, eyes closed, a satisfied look
5. HIDING IN THE SHELL: head and all four legs pulled completely inside; only the tip of the snout and two closed eyes peek out of the front opening; the shell rests flat on the ground
6. RESTING: lying flat with the chin resting on the ground, legs relaxed and loosely spread, half-closed sleepy eyes
```

## 姿勢表 C：心情反應｜`sheet_c.png`

| 格 | 動作 |
|---|---|
| 1 左上 | 開心 |
| 2 中上 | 驚嚇 |
| 3 右上 | 生氣 |
| 4 左下 | 滿足 |
| 5 中下 | 思考 |
| 6 右下 | 放鬆 |

```
2D game character pose sheet, 1536x1024 image, a grid of 3 columns x 2 rows = six
512x512 cells, no grid lines, no borders.

Attached images: (1) razorback_ref.png is the EXACT character design; (2) the other image is the ART STYLE and layout reference only (do not copy that turtle's species).

Character: a young razor-backed musk turtle (Sternotherus carinatus): a steep, ROOF-SHAPED carapace with a sharp central ridge like the edge of a razor, light tan to brown with many small black spots and darker scute edges, a small plastron, grey-brown skin with small dark spots on the head, a long pointed snout and short stubby legs.
NOT a common musk turtle (the shell is steep and roof-like, not a smooth dome). Soft hand-painted storybook watercolor style with clean dark brown outlines.

Rules for EVERY cell:
- exactly one turtle, full body, three-quarter side view, body facing RIGHT
  (so the turtle's right side faces the viewer: "near" legs are closest to us)
- the same turtle size in every cell: shell length about 45% of the cell width
- shell centered horizontally slightly left of center, leave room for the head
- land poses: all feet on the same ground line at 75% of the cell height
- background: perfectly flat solid magenta #FF00FF, no gradient, no shadow, no ground
- NO text, NO numbers, NO labels, NO symbols, NO speech bubbles, NO hearts, NO lines

Cells (left to right, top row then bottom row):
1. HAPPY: head raised toward the viewer, mouth open in a big smile, eyes sparkling, the front of the body lifted a little as if bouncing
2. STARTLED: neck shot straight up in surprise, eyes as wide and round as possible, the body leaning back onto the hind legs, front feet lifted slightly off the ground
3. GRUMPY: frowning eyebrows, head pulled back a little into the shell, mouth pressed into a pout, eyes glancing sideways at the viewer
4. CONTENT: settled comfortably, eyes closed into happy curves, a gentle closed-mouth smile, cheeks slightly rosy
5. THINKING: head tilted to one side, eyes looking up and away, mouth slightly open, as if pondering a question
6. RELAXED: standing calmly on all four legs, neck at a gentle easy angle, eyes closed, a peaceful smile
```

## 姿勢表 D：水中動作｜`sheet_d.png`

| 格 | 動作 |
|---|---|
| 1 左上 | 有點笨拙地游泳 |
| 2 中上 | 下潛 |
| 3 右上 | 上浮 |
| 4 左下 | 漂浮 |
| 5 中下 | 呼吸管換氣 |
| 6 右下 | 咬食物 |

```
2D game character pose sheet, 1536x1024 image, a grid of 3 columns x 2 rows = six
512x512 cells, no grid lines, no borders.

Attached images: (1) razorback_ref.png is the EXACT character design; (2) the other image is the ART STYLE and layout reference only (do not copy that turtle's species).

Character: a young razor-backed musk turtle (Sternotherus carinatus): a steep, ROOF-SHAPED carapace with a sharp central ridge like the edge of a razor, light tan to brown with many small black spots and darker scute edges, a small plastron, grey-brown skin with small dark spots on the head, a long pointed snout and short stubby legs.
NOT a common musk turtle (the shell is steep and roof-like, not a smooth dome). Soft hand-painted storybook watercolor style with clean dark brown outlines.

Rules for EVERY cell:
- exactly one turtle, full body, three-quarter side view, body facing RIGHT
  (so the turtle's right side faces the viewer: "near" legs are closest to us)
- the same turtle size in every cell: shell length about 45% of the cell width
- the shell centered in the cell
- background: perfectly flat solid magenta #FF00FF, no gradient, no shadow, no ground
- NO water, NO bubbles, NO ripples, NO text, NO numbers, NO symbols

Cells (left to right, top row then bottom row):
1. SWIMMING a little clumsily: paddling with all four legs at once, neck forward
2. DIVING DOWN: the whole body tilted nose-down about 40 degrees, neck stretched toward the bottom, front legs pulling back, hind legs kicking up behind
3. RISING TO THE SURFACE: the whole body tilted nose-up about 40 degrees, neck stretched up toward the surface, nostrils leading, front legs sweeping down
4. FLOATING LAZILY: body level and relaxed, all four legs spread wide and limp, neck loose, eyes half closed, drifting like a leaf on the water
5. SNORKELING: standing on the bottom with the neck stretched STRAIGHT UP, nostrils at the very top as if breathing at the surface
6. EATING: neck extended forward, mouth closed on a small brown food pellet, cheeks puffed, happy eyes
```

## 循環幀 E：游泳 4 幀｜`loop_swim.png`

| 格 | 動作 |
|---|---|
| 1 左上 | 前腳往前伸到最長 |
| 2 右上 | 前腳往下往後划（出力） |
| 3 左下 | 前腳貼著殼往後收 |
| 4 右下 | 四肢放鬆往前滑回 |

```
2D game animation frames, 1024x1024 image, a 2x2 grid of four 512x512 cells,
no grid lines.

Attached images: (1) razorback_ref.png is the EXACT character design; (2) the other image is the ART STYLE and layout reference only (do not copy that turtle's species).

Character: a young razor-backed musk turtle (Sternotherus carinatus): a steep, ROOF-SHAPED carapace with a sharp central ridge like the edge of a razor, light tan to brown with many small black spots and darker scute edges, a small plastron, grey-brown skin with small dark spots on the head, a long pointed snout and short stubby legs.
NOT a common musk turtle (the shell is steep and roof-like, not a smooth dome). Soft hand-painted storybook watercolor style with clean dark brown outlines.

Every cell: the same turtle at exactly the same size (shell length about 45% of the cell
width), three-quarter side view, facing RIGHT, body level and horizontal, neck extended forward; the shell and head stay in EXACTLY the same place in all four cells, only the legs move.
Background perfectly flat solid magenta #FF00FF. No water, no ground, no motion lines, no text.

A looping SWIM cycle, smooth and rhythmic like a paddle stroke:
Frame 1 (top-left): the near front leg reaches forward at full extension while the near hind leg is pulled in.
Frame 2 (top-right): the near front leg sweeps down and back in a strong power stroke, the hind legs kick backward.
Frame 3 (bottom-left): the near front leg lies flat back along the side of the shell, the hind legs fully extended behind.
Frame 4 (bottom-right): all legs glide forward again, relaxed, halfway back to frame 1.
```

## 循環幀 F：爬行 4 幀｜`loop_walk.png`

| 格 | 動作 |
|---|---|
| 1 左上 | 近前腳＋遠後腳往前 |
| 2 右上 | 四隻腳都在身體下面，殼抬到最高 |
| 3 左下 | 遠前腳＋近後腳往前 |
| 4 右下 | 四隻腳又回到下面，殼微微沉下 |

```
2D game animation frames, 1024x1024 image, a 2x2 grid of four 512x512 cells,
no grid lines.

Attached images: (1) razorback_ref.png is the EXACT character design; (2) the other image is the ART STYLE and layout reference only (do not copy that turtle's species).

Character: a young razor-backed musk turtle (Sternotherus carinatus): a steep, ROOF-SHAPED carapace with a sharp central ridge like the edge of a razor, light tan to brown with many small black spots and darker scute edges, a small plastron, grey-brown skin with small dark spots on the head, a long pointed snout and short stubby legs.
NOT a common musk turtle (the shell is steep and roof-like, not a smooth dome). Soft hand-painted storybook watercolor style with clean dark brown outlines.

Every cell: the same turtle at exactly the same size (shell length about 45% of the cell
width), three-quarter side view, facing RIGHT, all feet on the same ground line at 75% of the cell height; the head stays level and the shell stays in the same place, only the legs and a tiny body bob change.
Background perfectly flat solid magenta #FF00FF. No water, no ground, no motion lines, no text.

A looping slow WALK cycle. Turtles move DIAGONAL legs as a pair:
Frame 1 (top-left): the near front leg and the far hind leg step forward together, the other two push back.
Frame 2 (top-right): all four feet under the body, the shell at its highest point.
Frame 3 (bottom-left): the far front leg and the near hind leg step forward together, the other two push back.
Frame 4 (bottom-right): all four feet under the body again, the shell dips slightly lower and the head bobs down a little.
```

## 循環幀 G：搖尾巴 4 幀｜`loop_wag.png`

| 格 | 動作 |
|---|---|
| 1 左上 | 尾巴甩向觀眾 |
| 2 右上 | 尾巴回到中間 |
| 3 左下 | 尾巴甩到遠側（被殼擋住一半） |
| 4 右下 | 尾巴回到中間、往上一翹 |

```
2D game animation frames, 1024x1024 image, a 2x2 grid of four 512x512 cells,
no grid lines.

Attached images: (1) razorback_ref.png is the EXACT character design; (2) the other image is the ART STYLE and layout reference only (do not copy that turtle's species).

Character: a young razor-backed musk turtle (Sternotherus carinatus): a steep, ROOF-SHAPED carapace with a sharp central ridge like the edge of a razor, light tan to brown with many small black spots and darker scute edges, a small plastron, grey-brown skin with small dark spots on the head, a long pointed snout and short stubby legs.
NOT a common musk turtle (the shell is steep and roof-like, not a smooth dome). Soft hand-painted storybook watercolor style with clean dark brown outlines.

Every cell: the same turtle at exactly the same size (shell length about 45% of the cell
width), three-quarter side view, facing RIGHT, standing on all four legs with a happy face looking up at the viewer; the head, shell and legs stay in EXACTLY the same place in all four cells, only the short tail moves.
Background perfectly flat solid magenta #FF00FF. No water, no ground, no motion lines, no text.

A looping happy TAIL-WAG cycle, quick and cheerful like a puppy:
Frame 1 (top-left): the short tail swung up and TOWARD THE VIEWER.
Frame 2 (top-right): the tail in the middle, pointing straight back.
Frame 3 (bottom-left): the tail swung AWAY FROM THE VIEWER, half hidden behind the shell.
Frame 4 (bottom-right): the tail back in the middle with a little upward flick.
```

## 循環幀 H：搖屁屁 4 幀｜`loop_shake.png`

| 格 | 動作 | 看得到什麼 |
|---|---|---|
| 1 左上 | 正中間：屁股翹最高，後腿幾乎伸直，尾巴朝上 | 背甲側面 |
| 2 右上 | 屁股往**觀眾這邊**甩，後半個殼跟著翻過來 | **看得到米黃色的腹甲邊緣**和近側後腿內側 |
| 3 左下 | 回到中間、往下輕輕彈一下，後腿微彎 | 背甲側面 |
| 4 右下 | 屁股往**遠離觀眾**的方向甩，殼翻過去 | **腹甲被藏住**，看到更多背甲的圓頂 |

頭和前腳在 4 格裡都固定不動，只有後半身在動。

```
2D game animation frames, 1024x1024 image, a 2x2 grid of four 512x512 cells,
no grid lines.

Attached images: (1) razorback_ref.png is the EXACT character design; (2) the other image is the ART STYLE and layout reference only (do not copy that turtle's species).

Character: a young razor-backed musk turtle (Sternotherus carinatus): a steep, ROOF-SHAPED carapace with a sharp central ridge like the edge of a razor, light tan to brown with many small black spots and darker scute edges, a small plastron, grey-brown skin with small dark spots on the head, a long pointed snout and short stubby legs.
NOT a common musk turtle (the shell is steep and roof-like, not a smooth dome). Soft hand-painted storybook watercolor style with clean dark brown outlines.

THE ACTION: a joyful BUTT WIGGLE, the turtle shaking its bottom like an excited puppy
that wants to play.
- The FRONT END is planted and does NOT move between frames: the head, neck and both
  front legs stay in exactly the same position and size in all four cells. The head is
  low and pushed forward, the front legs are bent with elbows out and the chin is close
  to the ground, like a playful "play bow".
- The BACK END is lifted HIGH: both hind legs are pushed out almost STRAIGHT, raising the
  rear edge of the shell well above the front, so the whole shell tilts nose-down about
  20 degrees. The rear rim of the shell is clearly higher than the head.
- The short tail sticks up and flicks with every wiggle.
- Face: squinting happy eyes and a wide open-mouth smile, having the time of its life.

Every cell: the same turtle at the same size, three-quarter side view, body facing RIGHT,
all feet standing on the same ground line at 78% of the cell height.
Background perfectly flat solid magenta #FF00FF. NO motion lines, NO sweat drops,
NO sparkles, NO text, NO ground, NO shadow.

A looping 4-frame wiggle. Only the raised back end moves, swinging and ROLLING from side
to side like a pendulum, so the shell turns a little with every swing:
Frame 1 (top-left): CENTER. The rear is lifted to its highest point straight behind,
  hind legs nearly straight, tail pointing up.
Frame 2 (top-right): the rear swings TOWARD THE VIEWER. The back half of the shell rolls
  toward us, so we can clearly see its underside: the cream-yellow edge of the plastron
  and the soft inner side of the near hind leg are showing. The near hind leg is fully
  straight, the far hind leg bends. The tail flicks toward the viewer.
Frame 3 (bottom-left): CENTER again with a little bounce: the rear dips slightly lower
  than in frame 1, hind legs a little bent, tail curling.
Frame 4 (bottom-right): the rear swings AWAY FROM THE VIEWER. The back half of the shell
  rolls away from us, so the underside is completely hidden and we see more of the domed
  top of the carapace. The near hind leg is bent and tucked in, the far hind leg is
  straight and partly hidden behind the shell. The tail flicks away.
```

---

## 生成後的檢查清單

- [ ] 是剃刀龜：背甲中線像屋頂一樣尖尖地隆起（剃刀背），兩側是陡坡；背甲淺褐色到棕褐色，布滿黑色小斑點，盾片邊緣較深
- [ ] 每一格都照上面的中文說明畫對了（特別注意哪隻腳在前、身體往哪邊斜）
- [ ] 背景是純洋紅色，沒有文字、泡泡、動態線、符號
- [ ] 每格烏龜大小大致相同，全部面向右邊
- [ ] 循環動畫裡固定的部位真的沒有動
- [ ] 烏龜沒有超出格子邊界
