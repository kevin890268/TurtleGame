# Action 06 — bask（曬背）

> 情境：**水上**｜循環
> 搭配 `character_reference.png` 與 `docs/spec/rules_bangui_v3.6.md` 一起使用。
> 產出一張 **3 × 4** 的圖，存成 `reference/sheets/bangui/action_06_bask.png`。

ACTION_ID:
06

ACTION_NAME:
bask

CONTEXT:
ABOVE WATER — the turtle stands on an invisible flat ground. Feet (or plastron, for resting poses) touch that ground. Legs support the weight.

DESCRIPTION:
Basking under a lamp: resting on its plastron, neck stretched up toward the light, hind legs stretched backward.

==================================================
1. FRAME SEQUENCE
==================================================

FRAME 1:
Lying on the plastron, neck raised toward the light, eyes half closed.

FRAME 2:
Hind legs slide backward and stretch out.

FRAME 3:
Fully stretched: hind legs straight back with soles facing up, front legs spread, eyes closed.

FRAME 4:
Relaxed, hind legs still stretched, returning toward Frame 1.

LOOP: Frame 4 must lead naturally back into Frame 1.

The four frames must clearly belong to the SAME continuous movement.

==================================================
2. THREE VIEWS
==================================================

Every column shows the SAME moment from three cameras.

FRONT:
In front of the turtle, camera ABOVE looking DOWN about 45 degrees. Face toward the viewer, symmetric.

SIDE:
Turtle faces RIGHT, camera at roughly eye level. Never draw it facing left.

BACK:
Behind the turtle, camera ABOVE looking DOWN about 45 degrees. Tail toward the viewer, face never visible.
The two stretched hind legs with soles facing up are the clearest part of this view.

==================================================
3. SPRITE SHEET
==================================================

Create exactly ONE raw sprite sheet: 3 rows × 4 columns = 12 cells.

Row 1 = FRONT (45 degrees from above)
Row 2 = SIDE (facing right)
Row 3 = BACK (45 degrees from above)

Column 1–4 = Frame 1–4.

The labels above are INTERNAL ORGANIZATION ONLY.
Do NOT draw labels, numbers, titles, grid lines or borders.

Exactly ONE complete turtle per cell.
Same turtle size in every cell.
Leave clear magenta space between rows.

==================================================
4. ANATOMY
==================================================

Exactly ONE head, ONE neck, ONE long tapered tail and FOUR legs in every cell.
The shell is rigid: never squash, stretch or bend it.
No motion blur, no speed lines, no ghost copies, no chibi deformation.

==================================================
5. BACKGROUND
==================================================

Solid flat magenta, exact RGB 255, 0, 255, one single colour across the whole image.
No water, ground, bubbles, shadows, plants, rocks, props or effects.
The turtle is the ONLY visible object.

==================================================
END OF ACTION 06 — BASK
==================================================
