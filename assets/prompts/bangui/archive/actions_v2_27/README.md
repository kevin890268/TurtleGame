# 斑龜 Action Set v2 — 精簡版 27 Actions

## 目的

原本 32 個 Action 中，有 5 個與其他動作的功能高度重複。
本版本整理成 **27 個獨立 Action**，減少重複動畫，同時保留
對養成遊戲有價值的個性與水域行為。

## 刪除／合併的 5 個 Action

### `walk_b` → `walk_a`
兩者都是一般地面行走，主要差異只有速度／節奏。
保留 `walk_a`；快速移動由 `run` 負責。

### `neck_up` → `look`
伸脖子與停下張望容易形成高度相似的動畫。
`look` 可以在 4 個 Frame 中包含停下、抬頭、伸脖子、張望。

### `observe` → `look`
兩者都是觀察類 Idle。統一由 `look` 表現普通張望與較專注的觀察。

### `relax` → `rest`
兩者都是低活動量休息狀態。`rest` 可表現普通休息與舒服放鬆。

### `rise` → `surface`
兩者是連續的同一個水中行為流程。
`surface` 直接包含「上升 → 接近水面 → 頭出水 → 換氣」。

## 27 個新 Action

| 新編號 | 原編號 | Action | 中文 | 類型 |
|---:|---:|---|---|---|
| 01 | 01 | `walk_a` | 悠閒散步 | 核心移動 |
| 02 | 03 | `run` | 快速爬行 | 核心移動 |
| 03 | 04 | `turn` | 轉方向 | 核心移動 |
| 04 | 05 | `look` | 停下張望 | 核心 Idle |
| 05 | 08 | `sniff` | 低頭聞聞 | 日常 |
| 06 | 09 | `bask` | 曬太陽 | 日常 |
| 07 | 10 | `sleep` | 睡覺 | 日常 |
| 08 | 11 | `yawn` | 打哈欠 | 日常 |
| 09 | 12 | `stretch` | 伸懶腰 | 日常 |
| 10 | 13 | `hide` | 縮進殼裡 | 防禦 |
| 11 | 14 | `rest` | 趴著休息 | 核心 Idle |
| 12 | 15 | `happy` | 開心 | 情緒 |
| 13 | 17 | `startled` | 驚嚇 | 情緒 |
| 14 | 18 | `angry` | 生氣 | 情緒 |
| 15 | 19 | `wag` | 搖尾巴 | 個性 |
| 16 | 20 | `shake` | 搖屁屁 | 個性 |
| 17 | 21 | `dig` | 挖土 | 個性／環境 |
| 18 | 22 | `eat` | 吃東西 | 核心養成 |
| 19 | 23 | `poop` | 排泄 | 養成 |
| 20 | 24 | `play` | 玩耍 | 個性／養成 |
| 21 | 25 | `enter_water` | 進入水中 | 水域 |
| 22 | 26 | `swim` | 悠閒游泳 | 核心水域 |
| 23 | 27 | `swim_fast` | 快速游泳 | 水域 |
| 24 | 28 | `swim_turn` | 水中轉向 | 水域 |
| 25 | 29 | `dive` | 下潛 | 水域 |
| 26 | 31 | `float` | 水中漂浮 | 水域 Idle |
| 27 | 32 | `surface` | 水面換氣 | 水域 |

## 動畫總量

原本：

`32 × 4 Views × 4 Frames = 512 sprites`

現在：

`27 × 4 Views × 4 Frames = 432 sprites`

減少 **80 sprites**。

## 四視角

每個 Action 仍為 4×4：

```text
        Frame 1  Frame 2  Frame 3  Frame 4
F          F1       F2       F3       F4
R          R1       R2       R3       R4
B          B1       B2       B3       B4
L          L1       L2       L3       L4
```

視角沿用目前的 Rules v3.5：

- F / B：維持目前成功的約 45° 3/4
- R / L：約 30–35° 前偏 3/4
- R / L 不得變成完整側面
- TURN 才允許更強的側身旋轉

## 建議製作順序

### 第一批：基礎骨架

```text
01 walk_a
02 run
03 turn
04 look
```

先把角色比例、四視角、腳的位置、尾巴長度、Shell anchor、
動畫節奏與 Python slicing 全部定穩。

### 第二批：日常生活

```text
05 sniff
06 bask
07 sleep
08 yawn
09 stretch
10 hide
11 rest
```

### 第三批：情緒與個性

```text
12 happy
13 startled
14 angry
15 wag
16 shake
17 dig
18 eat
19 poop
20 play
```

### 第四批：水域

```text
21 enter_water
22 swim
23 swim_fast
24 swim_turn
25 dive
26 float
27 surface
```

## 設計原則

目標不是讓 Action 越少越好，而是讓每個 Action 都有清楚、
不可被其他 Action 完全取代的用途。

`wag`、`shake`、`play` 雖不是核心操作，但保留它們，
因為它們能增加日系繪本風養成遊戲中的角色個性。
