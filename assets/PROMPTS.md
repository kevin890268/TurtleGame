# GPT 生圖提示詞

所有圖片請用**同一種畫風**。建議先生出 `turtle_swim`，之後的烏龜圖都把它當參考圖一起丟給 GPT，並加上「同一隻烏龜、同樣畫風」，這樣造型才會一致。

完成後把檔案放進 `assets/`，再到 `assets/manifest.json` 填上檔名（例如 `"turtle_swim": "turtle_swim.png"`）。沒填的會繼續用內建繪圖。

## 共用風格（每張都加在提示詞最前面）

```
Cute hand-painted storybook illustration, soft watercolor texture with clean dark outlines,
warm natural colors, 2D game asset, side view, no text, no watermark.
```

## 烏龜（透明背景 PNG，面向右邊，約 1024×640）

烏龜的物種特徵要寫清楚，GPT 才不會畫成巴西龜（紅耳龜）：

```
A juvenile Chinese stripe-necked turtle (Mauremys sinensis), dark olive-brown domed carapace
with three low keels, pale yellow plastron edge, many thin bright yellow-green stripes on the
head and neck, NO red patch behind the eye. Facing right. Transparent background.
```

| 檔名 | 額外描述 |
|---|---|
| `turtle_swim.png` | swimming pose, front flippers reaching forward, neck extended |
| `turtle_bask.png` | basking pose on a flat surface, neck stretched up, hind legs stretched straight backwards, relaxed |
| `turtle_sleep.png` | sleeping, head and legs pulled into the shell, eyes closed |

## 場景

| 檔名 | 尺寸 | 描述 |
|---|---|---|
| `bg.png` | 2000×1200 | Side view inside a clean home aquarium, soft teal water filling the lower 70% of the image, water surface line at about 29% from the top, beige wall visible above the water, sand and small pebbles at the bottom 10%, a few aquatic plants at the far left and far right edges. Leave the middle empty. No turtle, no platform, no lamp. |
| `dock.png` | 1100×280，透明背景 | A floating wooden turtle basking platform, seen from the side, wide and flat. |
| `lamp.png` | 480×300，透明背景 | A small dark grey dome-shaped reptile heat lamp, hanging, bulb facing down, seen from the side. |

## 食物（透明背景，256×256，畫面上只會縮到約 20px，造型簡單就好）

| 檔名 | 描述 |
|---|---|
| `food_pellet.png` | a single brown turtle food pellet stick |
| `food_shrimp.png` | a single small dried shrimp, orange |
| `food_veggie.png` | a small torn piece of green lettuce leaf |

## 小提醒

- ChatGPT 生出的「透明背景」有時會變成白底或灰白格子底。如果出現這種情況，可以用 remove.bg 之類的工具去背。
- 烏龜圖片會依背甲長度自動縮放，並以圖片中心當作烏龜中心，所以圖片四周不要留太多空白。
