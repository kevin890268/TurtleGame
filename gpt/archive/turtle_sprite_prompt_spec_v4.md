# 烏龜 Sprite Sheet 產圖規格 v3 — 斑龜 2.5D 4×4 正式版

## 1. 目的

建立一套固定的「單一烏龜角色 + 2.5D 四視角 + 動畫動作 + Sprite Sheet」Prompt 規格。

本版本採用：

> **32 個標準動作 × 4 個視角 × 每視角 4 幀 = 512 frames / turtle**

每一個動作輸出一張 **4×4 Sprite Sheet**：

```text
4 views × 4 frames = 16 cells / action
```

因此：

```text
32 actions = 32 sprite sheets
32 sheets × 16 cells = 512 frames
```

---

# 2. v3 正式生成架構

```text
character_reference.png
        +
rules.md
        +
一個 action prompt
        ↓
ONE 4×4 Sprite Sheet
        ↓
4 rows = 4 views
4 columns = 4 animation frames
        ↓
16 cells
        ↓
Python slicer
        ↓
16 個獨立 PNG
```

角色、視角、動作、遊戲邏輯彼此分離。

```text
CHARACTER REFERENCE
= 這是哪一隻烏龜？

RULES
= 這隻烏龜永遠長什麼樣、怎麼畫、怎麼切圖？

ACTION
= 這隻烏龜現在做什麼？

FRAME
= 這個動作進行到哪裡？

GAME LOGIC
= 動畫完成後遊戲狀態怎麼改變？
```

---

# 3. CHARACTER REFERENCE — 角色參考圖

`character_reference.png` 是角色身份的主要視覺依據。

對斑龜而言，應使用實際目標個體的照片作為基準，再將其轉換成日系繪本風格。

角色 Prompt 不應只寫「Mauremys reevesii」，而應鎖定實際個體的外觀。

## 斑龜 Character DNA

本專案目前使用的斑龜具有：

- 深黑褐／深橄欖褐色背甲
- 背甲明顯三條縱向隆起稜脊
- 背甲盾片結構清楚
- 深色盾片邊界
- 部分盾片具有細微橙褐／黃褐色自然紋理
- 黃綠色頭部與頸部
- 頭部與頸部具有密集黑色縱向條紋
- 小而自然的深色眼睛
- 四肢具有黑色／黃綠色細密條紋
- 後腳較強壯，具有自然半水棲龜腳趾結構
- 尾巴明顯、細長、自然收尖
- 殼是整個角色最大的視覺主體
- 頭部相對較小
- 頸部相對較長
- 整體比例修長，不是圓滾滾的卡通龜

## 角色固定規則

所有動畫與視角必須維持：

```text
same shell silhouette
same shell proportions
same three shell keels
same scute arrangement
same shell markings
same dark shell color
same head shape
same facial stripes
same neck proportions
same eyes
same striped legs
same toe structure
same tail
same body proportions
same art style
```

只允許改變：

```text
animation pose
body orientation
viewing direction
```

禁止重新設計角色。

---

# 4. ART STYLE

固定使用：

> Japanese children's picture-book illustration.

風格：

- 日系兒童繪本
- 溫暖手繪動物插畫
- 深棕色手繪輪廓
- 有機、略微不規則的墨線
- 柔和不透明平塗
- 輕微手繪質感
- 暖橄欖綠
- 深褐色
- 黃綠色
- 米白
- 米色
- 簡單柔和陰影
- 少量高光
- 清楚輪廓
- 可愛但符合動物解剖

禁止：

```text
watercolor
watercolor wash
watercolor bleeding
photorealistic
wildlife photography
3D
CGI
anime
manga
cel shading
chibi
vector
SVG
sticker
plastic
glossy 3D
```

風格可以簡化細節，但不能改變角色身份。

---

# 5. rules.md 的定位

`rules.md` 是整個角色的固定規則檔。

不需要另外維護一份 `character.md` 才能確認角色。

推薦結構：

```text
prompts/
└── bangui/
    ├── character_reference.png
    ├── rules.md
    └── actions/
        ├── 01_walk_a.md
        ├── 02_walk_b.md
        ├── ...
        └── 32_surface.md
```

`rules.md` 必須包含：

1. Character Identity
2. Character Appearance
3. Character DNA
4. Species Exclusion
5. Art Style
6. Character Consistency
7. 2.5D View Rules
8. Animation Rules
9. Sprite Sheet Rules
10. Background Rules
11. Eat / Poop Rules
12. Negative Rules

---

# 6. STANDARD_32 動作

所有澤龜品種共用以下 32 個標準動作。

每個動作：

```text
4 views × 4 frames = 16 cells
```

## A. 陸地基本行為 01～08

| # | Key | 動作 |
|---|---|---|
| 01 | `walk_a` | 悠閒散步 |
| 02 | `walk_b` | 慢慢爬 |
| 03 | `run` | 快速爬行 |
| 04 | `turn` | 轉方向 |
| 05 | `look` | 停下張望 |
| 06 | `neck_up` | 伸長脖子 |
| 07 | `observe` | 抬頭觀察 |
| 08 | `sniff` | 低頭聞聞 |

## B. 休息與生活 09～16

| # | Key | 動作 |
|---|---|---|
| 09 | `bask` | 曬太陽 |
| 10 | `sleep` | 睡覺 |
| 11 | `yawn` | 打哈欠 |
| 12 | `stretch` | 伸懶腰 |
| 13 | `hide` | 縮進殼裡 |
| 14 | `rest` | 趴著休息 |
| 15 | `happy` | 開心 |
| 16 | `relax` | 放鬆 |

## C. 情緒與互動 17～24

| # | Key | 動作 |
|---|---|---|
| 17 | `startled` | 驚嚇 |
| 18 | `angry` | 生氣 |
| 19 | `wag` | 搖尾巴 |
| 20 | `shake` | 搖屁屁 |
| 21 | `dig` | 挖土 |
| 22 | `eat` | 吃東西 |
| 23 | `poop` | 排泄 |
| 24 | `play` | 玩耍 |

## D. 水中行為 25～32

| # | Key | 動作 |
|---|---|---|
| 25 | `enter_water` | 進入水中 |
| 26 | `swim` | 悠閒游泳 |
| 27 | `swim_fast` | 快速游泳 |
| 28 | `swim_turn` | 水中轉向 |
| 29 | `dive` | 下潛 |
| 30 | `rise` | 浮出水面 |
| 31 | `float` | 水中漂浮 |
| 32 | `surface` | 水面換氣 |

不加入：

```text
pee
drink
```

---

# 7. 每個 Action 的 Frame 規則

一般動作：

```text
Frame 1 = 起始
Frame 2 = 動作發展
Frame 3 = 動作最明顯／最完整
Frame 4 = 回復或完成
```

循環動作：

```text
Frame 1 → Frame 2 → Frame 3 → Frame 4 → Frame 1
```

推薦循環：

```text
walk_a
walk_b
run
wag
shake
swim
swim_fast
float
```

一次性或狀態轉換：

```text
turn
yawn
hide
eat
poop
enter_water
dive
rise
surface
```

一次性動作的 Frame 4 可以是完成狀態，而不是強制回到 Frame 1。

---

# 8. 2.5D 四視角

本版本不再使用「正面／正側面／正背面」的死板圖鑑角度。

四個主要 View 都是：

> **約 35～45° 的 3/4 視角**

定義：

```text
F = Front 3/4
R = Right 3/4
B = Back 3/4
L = Left 3/4
```

概念：

```text
                 F
              ↙     ↘
           L             R
              ↖     ↗
                 B
```

## F — Front 3/4

約 35～45° 前方斜視。

可看到：

- 臉
- 頭部前方
- 頭部兩側部分
- 背甲前方
- 中央稜脊
- 左右兩側稜脊
- 近側四肢
- 部分遠側四肢

禁止完全正面。

## R — Right 3/4

約 35～45° 右前／右側斜視。

可看到：

- 臉
- 頭部右側
- 背甲前方
- 背甲右側
- 三條縱向稜脊
- 近側四肢
- 部分遠側四肢

禁止 90° 完全正側面。

## B — Back 3/4

約 35～45° 後方斜視。

可看到：

- 背甲後方
- 三條縱向稜脊
- 後方盾片
- 後腳
- 尾巴
- 必要時可看到部分頭頸

B 必須是真正的後方 3/4 視角。

禁止把 F 水平翻轉當成 B。

## L — Left 3/4

約 35～45° 左前／左側斜視。

可看到：

- 臉
- 頭部左側
- 背甲前方
- 背甲左側
- 三條縱向稜脊
- 近側四肢
- 部分遠側四肢

L 必須是真正的左側物理視角。

禁止直接鏡像 R。

---

# 9. 2.5D 視角一致性

四個 View 必須像同一個 3D 模型。

保持：

```text
shell width
shell height
body length
head size
neck length
leg length
tail
camera distance
character scale
```

不允許：

```text
F = 一隻龜
R = 另一隻龜
B = shell 改形
L = 頭型改變
```

四個 View 必須能在遊戲中直接切換。

---

# 10. TURN 特殊規則

`turn` 是唯一需要特別處理的動作。

TURN 不是：

```text
只轉頭
```

而是：

```text
整個身體 + 背甲 + 頭 + 四肢
一起完成方向旋轉
```

例如：

```text
F → R
```

Frame：

```text
Frame 1 = F
Frame 2 = F/R 中間角度
Frame 3 = 接近 R
Frame 4 = R
```

另一方向：

```text
F → L
```

Frame：

```text
Frame 1 = F
Frame 2 = F/L 中間角度
Frame 3 = 接近 L
Frame 4 = L
```

同理：

```text
R → B
B → L
L → F
```

都必須是真正的身體旋轉。

### TURN 的 sheet 解釋

一般 Action 的 4×4：

```text
Row 1 = F
Row 2 = R
Row 3 = B
Row 4 = L
```

`turn` 例外：

```text
每一列代表「起始 View」。

Row 1 = 從 F 開始轉
Row 2 = 從 R 開始轉
Row 3 = 從 B 開始轉
Row 4 = 從 L 開始轉
```

每列四幀代表：

```text
起始方向
→ 中間角度
→ 接近目標方向
→ 完成目標方向
```

因此 `turn_F_4` 實際上可能已經是 R 視角。

`turn` 的 metadata 必須可選擇記錄：

```text
startView
targetView
frame
```

而一般 Action 使用：

```text
view
frame
```

---

# 11. Sprite Sheet 正式規格

**一個 Action = 一張 4×4 Sprite Sheet。**

```text
4 columns × 4 rows
= 16 cells
```

一般 Action 排列：

```text
             Frame 1   Frame 2   Frame 3   Frame 4

F Front 3/4      ●         ●         ●         ●
R Right 3/4     ●         ●         ●         ●
B Back 3/4      ●         ●         ●         ●
L Left 3/4      ●         ●         ●         ●
```

因此：

```text
Row 1 = F
Row 2 = R
Row 3 = B
Row 4 = L
```

每個 Cell：

- 只能有一隻完整烏龜
- 烏龜不能跨格
- 不得裁切
- 大小盡量一致
- shell center 盡量一致
- 無格線
- 無邊框
- 無文字
- 無數字
- 無標籤
- 無 UI
- 無 watermark

---

# 12. 背景

所有 Cell 使用：

```text
RGB 255, 0, 255
```

純洋紅背景。

禁止：

```text
gradient
texture
floor
ground
grass
water
rocks
plants
environment
props
particles
effects
```

這是為了讓 Python 自動去背。

---

# 13. Sprite Sheet 命名

每個 Action 一張 Sheet：

```text
01_walk_a.png
02_walk_b.png
03_run.png
04_turn.png
05_look.png
...
32_surface.png
```

切圖後：

```text
walk_a_F_1.png
walk_a_F_2.png
walk_a_F_3.png
walk_a_F_4.png

walk_a_R_1.png
walk_a_R_2.png
walk_a_R_3.png
walk_a_R_4.png

walk_a_B_1.png
walk_a_B_2.png
walk_a_B_3.png
walk_a_B_4.png

walk_a_L_1.png
walk_a_L_2.png
walk_a_L_3.png
walk_a_L_4.png
```

總共：

```text
32 actions × 4 views × 4 frames
= 512 PNG
```

---

# 14. Action × View × Frame

標準 Sprite：

```text
<action>_<view>_<frame>.png
```

例如：

```text
eat_F_1.png
eat_F_2.png
eat_F_3.png
eat_F_4.png

eat_R_1.png
eat_R_2.png
eat_R_3.png
eat_R_4.png

eat_B_1.png
eat_B_2.png
eat_B_3.png
eat_B_4.png

eat_L_1.png
eat_L_2.png
eat_L_3.png
eat_L_4.png
```

---

# 15. EAT 規則

`eat` 只表現烏龜的進食動作。

可以：

```text
head lowering
neck extending
mouth opening
small bite
head lifting
```

禁止在 Sprite Sheet 出現：

```text
food
food bowl
plate
pellet
insect
vegetable
crumb
detached object
```

食物由遊戲系統另外繪製。

---

# 16. POOP 規則

`poop` 是「排泄行為動畫」，不是便便物件動畫。

四幀：

```text
Frame 1
停止活動，身體稍微降低

Frame 2
後半身稍微抬高，尾巴自然偏移

Frame 3
維持排泄姿勢

Frame 4
恢復正常姿勢
```

禁止：

```text
poop object
feces
waste object
feces particles
poop pile
dirty-water effect
```

遊戲程式處理：

```text
poop animation completed
        ↓
water_dirty += POOP_DIRTINESS
```

動畫與遊戲數值完全分離。

---

# 17. 水中動畫

澤龜是半水棲龜，因此水中行為是標準系統的一部分。

包括：

```text
enter_water
swim
swim_fast
swim_turn
dive
rise
float
surface
```

水中動作必須仍然是：

```text
turtle
```

不是魚。

禁止：

```text
fish fins
fish tail
fish anatomy
mermaid-like movement
```

保持：

- 剛性的背甲
- 龜的四肢
- 自然划水
- 自然浮力
- 合理身體姿勢

Sprite Sheet 本身仍然只畫烏龜，不加入水面、氣泡或環境效果。

---

# 18. 動畫與遊戲事件分離

動畫只負責：

> 「看起來正在做什麼」

遊戲系統負責：

> 「做完之後發生什麼」

例如：

```text
eat animation
        ↓
game logic:
food -= 1
hunger -= X
```

例如：

```text
poop animation
        ↓
game logic:
water_dirty += X
water_quality -= X
```

不要把遊戲數值寫進 Sprite。

---

# 19. Python STANDARD_32

```python
STANDARD_32 = [
    ("walk_a", "悠閒散步"),
    ("walk_b", "慢慢爬"),
    ("run", "快速爬行"),
    ("turn", "轉方向"),
    ("look", "停下張望"),
    ("neck_up", "伸長脖子"),
    ("observe", "抬頭觀察"),
    ("sniff", "低頭聞聞"),

    ("bask", "曬太陽"),
    ("sleep", "睡覺"),
    ("yawn", "打哈欠"),
    ("stretch", "伸懶腰"),
    ("hide", "縮進殼裡"),
    ("rest", "趴著休息"),
    ("happy", "開心"),
    ("relax", "放鬆"),

    ("startled", "驚嚇"),
    ("angry", "生氣"),
    ("wag", "搖尾巴"),
    ("shake", "搖屁屁"),
    ("dig", "挖土"),
    ("eat", "吃東西"),
    ("poop", "排泄"),
    ("play", "玩耍"),

    ("enter_water", "進入水中"),
    ("swim", "悠閒游泳"),
    ("swim_fast", "快速游泳"),
    ("swim_turn", "水中轉向"),
    ("dive", "下潛"),
    ("rise", "浮出水面"),
    ("float", "水中漂浮"),
    ("surface", "水面換氣"),
]

VIEWS = ["F", "R", "B", "L"]
FRAMES = [1, 2, 3, 4]
```

---

# 20. 資料量

單一 Action：

```text
4 views × 4 frames
= 16 cells
```

單一視角：

```text
32 actions × 4 frames
= 128 frames
```

完整四視角：

```text
32 actions × 4 views × 4 frames
= 512 frames
```

每隻烏龜：

```text
32 sprite sheets
512 individual PNG
```

---

# 21. 建議資料夾

```text
prompts/
└── bangui/
    ├── character_reference.png
    ├── rules.md
    └── actions/
        ├── 01_walk_a.md
        ├── 02_walk_b.md
        ├── 03_run.md
        ├── 04_turn.md
        ├── 05_look.md
        ├── 06_neck_up.md
        ├── 07_observe.md
        ├── 08_sniff.md
        ├── 09_bask.md
        ├── 10_sleep.md
        ├── 11_yawn.md
        ├── 12_stretch.md
        ├── 13_hide.md
        ├── 14_rest.md
        ├── 15_happy.md
        ├── 16_relax.md
        ├── 17_startled.md
        ├── 18_angry.md
        ├── 19_wag.md
        ├── 20_shake.md
        ├── 21_dig.md
        ├── 22_eat.md
        ├── 23_poop.md
        ├── 24_play.md
        ├── 25_enter_water.md
        ├── 26_swim.md
        ├── 27_swim_fast.md
        ├── 28_swim_turn.md
        ├── 29_dive.md
        ├── 30_rise.md
        ├── 31_float.md
        └── 32_surface.md
```

產圖：

```text
01_walk_a.png
02_walk_b.png
...
32_surface.png
```

切圖：

```text
assets/
└── poses/
    └── bangui/
        ├── walk_a_F_1.png
        ├── walk_a_F_2.png
        ├── ...
        ├── walk_a_L_4.png
        ├── eat_F_1.png
        ├── eat_R_1.png
        ├── eat_B_1.png
        ├── eat_L_1.png
        ├── poop_F_1.png
        ├── ...
        └── poses.json
```

---

# 22. poses.json

一般 Frame 至少：

```json
{
  "action": "walk_a",
  "frame": 1,
  "view": "F",
  "file": "walk_a_F_1.png",
  "shellFound": true,
  "bottom": 487,
  "scale": 1.0,
  "clipped": false
}
```

`turn` 建議額外：

```json
{
  "action": "turn",
  "startView": "F",
  "targetView": "R",
  "frame": 1,
  "file": "turn_F_1.png"
}
```

遊戲選圖：

```text
action
+
view
+
frame
```

`turn` 則使用：

```text
action
+
startView
+
targetView
+
frame
```

---

# 23. slice_poses.py v3 必須支援

輸入：

```text
01_walk_a.png
```

因為每張圖片本身就是：

```text
4 rows × 4 columns
```

程式知道：

```text
row 1 = F
row 2 = R
row 3 = B
row 4 = L
```

一般 Action 產生：

```text
walk_a_F_1.png
walk_a_F_2.png
walk_a_F_3.png
walk_a_F_4.png

walk_a_R_1.png
...
walk_a_L_4.png
```

`turn` 需要特殊 metadata，但仍然輸出同一組：

```text
turn_F_1.png
...
turn_L_4.png
```

並另外記錄起始／目標方向。

---

# 24. 產圖操作流程

新開對話：

### Step 1

上傳：

```text
character_reference.png
```

這是這一隻烏龜的唯一角色參考。

### Step 2

貼：

```text
rules.md
```

並告訴模型：

```text
Please use the uploaded character_reference.png
as the primary character identity reference.

Follow rules.md for every future sprite sheet.

Do not redesign the turtle.
```

### Step 3

貼一個 Action：

```text
01_walk_a.md
```

### Step 4

產生：

```text
01_walk_a.png
```

### Step 5

依序：

```text
02_walk_b.md
03_run.md
...
32_surface.md
```

最後：

```text
32 sprite sheets
↓
Python slice_poses_v3.py
↓
512 PNG
```

---

# 25. 核心原則

```text
character_reference.png
= 固定「這一隻龜」

rules.md
= 固定「這隻龜怎麼畫、怎麼看、怎麼切」

action prompt
= 固定「這次做什麼」

4×4 sheet
= 4 views × 4 frames

32 actions
= 32 sheets

32 × 4 × 4
= 512 frames
```

最重要：

> **不是 32 個靜態姿勢。**

而是：

> **32 個真正的動畫動作，每個動作都有 4 個連續 frame，而且每個 frame 都有 F/R/B/L 四個 3/4 視角。**

---

# 26. v3 最終目標

最終讓同一隻斑龜存在於一個：

```text
2.5D cozy turtle-raising game
```

中。

玩家可以看到：

```text
F  Front 3/4
R  Right 3/4
B  Back 3/4
L  Left 3/4
```

並讓牠：

```text
walk
crawl
run
turn
look
stretch neck
observe
sniff

bask
sleep
yawn
stretch
hide
rest
happy
relax

startled
angry
wag
shake
dig
eat
poop
play

enter water
swim
swim fast
swim turn
dive
rise
float
surface
```

遊戲系統另外管理：

```text
hunger
energy
happiness
water_dirty
water_quality
```

最終原則：

> **動畫負責「看起來在做什麼」。**

> **遊戲系統負責「做了之後發生什麼」。**
