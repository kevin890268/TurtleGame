# 斑龜素材狀態（以 27 動作為準）

更新：2026-09-24。切圖工具 `tools/slice_poses_v4.py`，輸出 328 張。

側面（R/L）是遊戲現在唯一會用到的視角：切圖時所有側面一律正規化成朝右，
左側由程式鏡像產生，所以左右一定對稱。正面／背面（F/B）目前還沒被算圖用到，
是留給之後鏡頭轉向（2.5D 深度）用的。

| # | 動作 | 說明 | 已有視角 | 來源舊動作 | 狀態 |
|---|---|---|---|---|---|
| 1 | walk_a | 地面行走 | BFLR | walk_a+walk_b | OK |
| 2 | run | 快速爬行 | BFLR | run | OK |
| 3 | turn | 轉方向 | FLR | turn | 缺 背面 |
| 4 | look | 停下張望／抬頭伸脖 | BFLR | look+neck_up+observe | OK |
| 5 | sniff | 低頭聞聞 | LR | sniff | 缺 正面／背面 |
| 6 | bask | 曬太陽 | — | bask | **整張缺**：沒有這個動作的圖 |
| 7 | sleep | 睡覺 | LR | sleep | 缺 正面／背面 |
| 8 | yawn | 打哈欠 | LR | yawn | 缺 正面／背面 |
| 9 | stretch | 伸懶腰 | LR | stretch | 缺 正面／背面 |
| 10 | hide | 縮進殼裡 | FLR | hide | 缺 背面 |
| 11 | rest | 趴著休息／放鬆 | FLR | rest+relax | 缺 背面 |
| 12 | happy | 開心 | FLR | happy | 缺 背面 |
| 13 | startled | 驚嚇 | FLR | startled | 缺 背面 |
| 14 | angry | 生氣 | FLR | angry | 缺 背面 |
| 15 | wag | 搖尾巴 | FLR | wag | 缺 背面 |
| 16 | shake | 搖屁屁 | FLR | shake | 缺 背面 |
| 17 | dig | 挖土 | FLR | dig | 缺 背面 |
| 18 | eat | 吃東西 | LR | eat | 缺 正面／背面 |
| 19 | poop | 排泄 | FLR | poop | 缺 背面 |
| 20 | play | 玩耍 | LR | play | 缺 正面／背面 |
| 21 | enter_water | 進入水中 | LR | enter_water | 缺 正面／背面 |
| 22 | swim | 悠閒游泳 | LR | swim | 缺 正面／背面 |
| 23 | swim_fast | 快速游泳 | LR | swim_fast | 缺 正面／背面 |
| 24 | swim_turn | 水中轉向 | LR | swim_turn | 缺 正面／背面 |
| 25 | dive | 下潛 | FLR | dive | 缺 背面 |
| 26 | float | 水中漂浮 | LR | float | 缺 正面／背面 |
| 27 | surface | 上浮換氣 | LR | surface+rise | 缺 正面／背面 |
