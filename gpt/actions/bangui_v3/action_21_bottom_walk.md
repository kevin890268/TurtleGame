# Action 21 — bottom_walk（水底走路）

> 情境：**水下**｜循環
> 搭配 `character_reference.png` 與 `gpt/rules/rules_bangui_v3.6.md` 一起使用。
> 產出一張 **3 × 4** 的圖，存成 `reference/sheets/bangui/action_21_bottom_walk.png`。

ACTION_ID:
21

ACTION_NAME:
bottom_walk

CONTEXT:
UNDERWATER — the turtle is suspended in water, nothing supports it. Legs are spread and paddle, toes spread. Do NOT draw water.

DESCRIPTION:
Walking slowly on the bottom of the water. Lighter and floatier than walking on land.

==================================================
1. FRAME SEQUENCE
==================================================

FRAME 1:
Left front leg and right hind leg step forward; tail floats up slightly.

FRAME 2:
Legs passing; body barely touching the bottom.

FRAME 3:
Right front leg and left hind leg step forward.

FRAME 4:
Legs passing again, returning toward Frame 1.

LOOP: Frame 4 must lead naturally back into Frame 1.

The four frames must clearly belong to the SAME continuous movement.

IMPORTANT:
Legs carry less weight than on land: softer bends, toes spread, the shell lifts a little between steps.

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
END OF ACTION 21 — BOTTOM_WALK
==================================================
