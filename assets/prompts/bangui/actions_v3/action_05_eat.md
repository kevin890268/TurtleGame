# Action 05 — eat（吃東西（陸上））

> 情境：**水上**｜單次
> 搭配 `character_reference.png` 與 `docs/spec/rules_bangui_v3.6.md` 一起使用。
> 產出一張 **3 × 4** 的圖，存成 `reference/sheets/bangui/action_05_eat.png`。

ACTION_ID:
05

ACTION_NAME:
eat

CONTEXT:
ABOVE WATER — the turtle stands on an invisible flat ground. Feet (or plastron, for resting poses) touch that ground. Legs support the weight.

DESCRIPTION:
The turtle eats something lying on the ground. The food itself is NOT drawn.

==================================================
1. FRAME SEQUENCE
==================================================

FRAME 1:
Neck stretches forward and down toward the ground.

FRAME 2:
Mouth opens.

FRAME 3:
Mouth closes on the (invisible) food; head pulls back slightly.

FRAME 4:
Mouth closed, swallowing; neck returns toward neutral.

ONE-SHOT: Frame 4 is the finished state.

The four frames must clearly belong to the SAME continuous movement.

IMPORTANT:
Do NOT draw food, pellets, leaves, insects or crumbs.

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
END OF ACTION 05 — EAT
==================================================
