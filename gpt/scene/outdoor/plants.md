# Outdoor pond — plants（小植物貼圖）

> 產出一張 **1024 × 1024 方圖**，存成 `reference/scene/outdoor/plants.png`。
> 這張會被切成 16 個小貼圖，取代目前程式畫的小花、草叢、蘆葦等，種在戶外池的圓台上。
> （切圖和換上去的程式，等圖生好後我再接上。）

```
Create ONE square sprite sheet image, 1024 x 1024 pixels,
arranged as 4 columns x 4 rows = 16 equal cells.

PURPOSE:
Small plant sprites for a cozy turtle game. Each sprite is placed
standing upright on the ground of a small countryside pond diorama,
seen from the SIDE at eye level, and repeated many times.

EACH CELL CONTAINS EXACTLY ONE PLANT:
- Centered horizontally.
- Its base (roots / bottom of the stem) touches the BOTTOM edge of the cell,
  at the horizontal center.
- The plant fills about 80 percent of the cell height.
- Nothing crosses into the neighbouring cells.

THE 16 PLANTS, row by row (left to right):
Row 1: white daisy-like wildflower | yellow wildflower | pink wildflower | pale purple wildflower
Row 2: short grass tuft | taller grass tuft | clover patch with a few leaves | small fern
Row 3: a clump of green reeds | a cattail (green leaves, one brown seed head) |
       a small cluster of rushes | a young bamboo shoot with a few leaves
Row 4: a small round shrub | a pink lotus flower on a short stem |
       a lily pad seen from the side, slightly tilted | a few tall wild grasses with seed heads

STYLE:
- Japanese children's picture-book illustration.
- Soft hand-painted watercolor / gouache, clean soft outlines.
- Gentle, natural colors; slightly LOWER saturation than a character,
  so a small turtle stands out in front of them.
- No photorealism. No 3D render.

BACKGROUND:
- Every cell has a completely flat, solid magenta background, exact RGB 255, 0, 255.
- One single flat color across the whole image: no gradient, no shadows,
  no ground line, no soil, no grass carpet.

DO NOT DRAW:
- grid lines, borders, labels, numbers, text
- animals, insects, turtles
- ground, soil, water, pots

OUTPUT:
One single image, 1024 x 1024, 4 x 4 cells.
```
