# Action 14 — swim（游泳）

> 情境：**水下**｜循環
> 搭配 `character_reference.png` 與 `gpt/rules/rules_bangui_v3.6.md` 一起使用。
> 產出一張 **3 × 4** 的圖，存成 `reference/sheets/bangui/action_14_swim.png`。

ACTION_ID:
14

ACTION_NAME:
swim

CONTEXT:
UNDERWATER — the turtle is suspended in water, nothing supports it. Legs are spread and paddle, toes spread. Do NOT draw water.

DESCRIPTION:
Calm swimming. Body level, neck stretched forward, tail trailing behind.

==================================================
1. FRAME SEQUENCE
==================================================

FRAME 1:
Front legs reach forward; hind legs push back.

FRAME 2:
Gliding: legs spread, body level.

FRAME 3:
Front legs sweep back; hind legs reach forward.

FRAME 4:
Gliding again, returning toward Frame 1.

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
END OF ACTION 14 — SWIM
==================================================
