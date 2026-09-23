# BANGUI — BACK VIEW FILL-IN (B ONLY)
# 斑龜｜只補「背面」的 11 個動作
# 搭配 character_reference.png（bangu_charater.png）與 rules_bangui_v3.5.md 一起使用

> 這 11 個動作的側面（R/L）和正面（F）已經有了，只缺背面（B）。
> 所以**不要再重畫四個視角**，整張圖每一格都是同一個視角：BACK 3/4。
>
> 一張 4×4 的圖 ＝ 4 個動作（列）× 4 個 Frame（欄）。11 個動作分成 3 張圖：
>
> | 檔名 | 列 1 | 列 2 | 列 3 | 列 4 |
> |---|---|---|---|---|
> | `back_01.png` | turn | hide | rest | happy |
> | `back_02.png` | startled | angry | wag | shake |
> | `back_03.png` | dig | poop | dive | （這張只有 3 列，4 欄） |
>
> 一次只做一張。要做哪一張，就只把那一張的「SHEET」段落連同本檔其他段落一起送出。

==================================================
0. CRITICAL OUTPUT RULE — RAW GAME SPRITE SHEET
==================================================

THIS IS A RAW GAME SPRITE SHEET.

DO NOT create a presentation board.
DO NOT create a character design sheet.
DO NOT create an animation reference chart.

ABSOLUTELY NO:

- Frame labels
- Frame numbers
- View labels
- B / BACK labels
- action names
- Chinese labels
- English labels
- titles
- captions
- arrows
- grid lines
- cell borders
- decorative frames
- plants
- grass
- rocks
- soil
- ground
- water
- scenery
- shadows
- props
- UI elements

==================================================
1. VIEW — THIS IS THE WHOLE POINT
==================================================

EVERY SINGLE CELL IN THIS SHEET IS THE **BACK 3/4 VIEW**.

Back 3/4 view means:

- The camera is behind the turtle, slightly above and slightly to one side.
- The carapace (top shell) fills most of the silhouette.
- The TAIL points toward the viewer.
- The HEAD points AWAY from the viewer. The head may be partly visible
  past the front edge of the shell, or not visible at all, depending on
  the action — but it must never be facing the camera.
- The plastron (belly) is NOT visible.

DO NOT draw a side view.
DO NOT draw a front view.
DO NOT vary the camera angle between rows or between frames.

The camera angle is IDENTICAL in all 16 cells. Only the turtle's
action changes.

This is the single most important rule in this file. A cell drawn
from any other angle is unusable.

==================================================
2. LAYOUT
==================================================

Create exactly ONE raw sprite sheet.

Columns (left to right):
Frame 1 | Frame 2 | Frame 3 | Frame 4

Rows (top to bottom):
One ACTION per row, in the order listed in the SHEET section below.

The row/column organization above is INTERNAL ONLY.
DO NOT DRAW any labels, numbers, lines or borders.

Exactly ONE complete turtle per cell.
Every cell is the same size.
The turtle is the same size in every cell.
The turtle is centered in its cell.

Each ROW is one continuous four-frame animation:
F1 → F2 → F3 → F4, and Frame 4 returns naturally toward Frame 1
(except `turn` and `dive`, which end in the completed state).

Rows do NOT continue into each other. Each row is its own action.

==================================================
3. ANATOMY AND MOTION
==================================================

All cells show the SAME ONE turtle from character_reference.png,
following every rule in rules_bangui_v3.5.md.

The shell is rigid. Do NOT squash, stretch or morph it.

Exactly ONE head, ONE neck, ONE long tail, and exactly FOUR legs
in every cell.

Do NOT add or remove limbs.
Do NOT duplicate body parts.
Do NOT create impossible joints.
Do NOT use motion blur.
Do NOT use speed lines.
Do NOT draw ghost or after-image copies.
Do NOT turn the character into a chibi or cartoon deformation.

Because this is the back view, the motion must read through
the SHELL, TAIL and REAR LEGS. If an action is normally shown
by the face, express it with body language instead:

- head lift → the neck rises behind the front edge of the shell
- head retraction → the neck disappears under the shell rim
- tension → rear legs brace, shell angle tilts
- relaxation → body settles lower, legs splay

==================================================
4. SPECIAL ACTION RESTRICTIONS
==================================================

The sprite sheet contains ONLY the turtle.

Do NOT add props or environmental objects.

For DIG: do not draw dirt particles, holes or soil effects.
For POOP: do not draw feces, waste, particles or piles.
For DIVE: do not draw water, bubbles, splash, fish or plants.

==================================================
5. BACKGROUND
==================================================

Every cell must have a completely uniform
solid chroma-key magenta background.

Exact RGB:

255, 0, 255

The magenta must be the SAME flat colour across the whole image.
No gradient, no texture, no vignette, no lighting falloff, no
JPEG-style noise. The background is one single flat colour.

No scenery. No floor. No shadow under the turtle.

The turtle is the ONLY visible object.

==================================================
6. SHEET — back_01.png
==================================================

ROW 1 — turn（轉方向）
F1: Turtle seen from behind, stable, shell aligned with its current direction.
F2: The whole body begins rotating; legs reposition to support the turn.
F3: Clearly mid-turn; shell and body rotated together, tail following the body.
F4: Turn complete; body and shell aligned with the new direction.
（Do NOT rotate only the head. Do NOT slide the turtle sideways.）

ROW 2 — hide（縮進殼裡）
F1: Normal posture; neck and all four legs visible from behind.
F2: Neck and limbs begin drawing inward under the shell rim.
F3: Head and limbs strongly retracted; from behind, almost only the
    carapace and the tail remain visible.
F4: Turtle begins emerging back toward the normal posture.

ROW 3 — rest（趴著休息）
F1: Normal relaxed posture, body low.
F2: Body settles lower; rear legs relax outward.
F3: Deepest resting pose; the shell sits close to the ground.
F4: Small adjustment back toward the initial resting posture.

ROW 4 — happy（開心）
F1: Neutral relaxed posture.
F2: Body lifts slightly; the neck rises behind the shell's front edge.
F3: Most cheerful posture; a small energetic lift of the whole body.
F4: Returns toward the relaxed neutral posture.

==================================================
6. SHEET — back_02.png
==================================================

ROW 1 — startled（驚嚇）
F1: Calm neutral posture.
F2: Sudden reaction; the body tenses and the neck pulls in slightly.
F3: Strongest startled posture; legs brace, shell tilts a little.
F4: Beginning to calm down toward the neutral pose.

ROW 2 — angry（生氣）
F1: Neutral posture.
F2: Body stiffens; the neck extends behind the shell's front edge.
F3: Strongest defensive posture; body firm, legs planted.
F4: Beginning to relax back toward neutral.

ROW 3 — wag（搖尾巴）
F1: Tail centered in its natural resting position.
F2: Tail swings gently to one side.
F3: Tail reaches the opposite side with a clear but natural swing.
F4: Tail returns toward the center.
（The back view is the best angle for this action — keep the tail
clearly visible and unobstructed in all four frames.）

ROW 4 — shake（搖屁屁）
F1: Neutral standing posture.
F2: The rear of the body shifts to one side.
F3: Rear body reaches the strongest side-to-side shake.
F4: Rear body returns toward the starting posture.
（Only the rear moves. The front legs stay planted.）

==================================================
6. SHEET — back_03.png
==================================================

This sheet has **3 rows × 4 columns** (12 cells), not 16.

ROW 1 — dig（挖土）
F1: Front body lowered slightly, front legs ready.
F2: One front leg scrapes backward in a digging motion.
F3: The opposite front leg performs the strongest digging stroke.
F4: Front legs return toward the initial digging posture.
（From behind, the digging reads through the shoulders and the
rocking of the shell. No soil, no hole, no particles.）

ROW 2 — poop（排泄）
F1: Turtle settles into a normal posture.
F2: The rear of the body rises slightly; the tail shifts naturally.
F3: Holds the natural elimination posture.
F4: Relaxes back toward the normal posture.
（Nothing is emitted. Draw only the turtle.）

ROW 3 — dive（下潛）
F1: Horizontal swimming posture seen from behind and slightly above.
F2: The front of the body angles downward; rear rises slightly.
F3: Strongest downward diving angle; all four limbs sweeping.
F4: Stabilized in the downward swimming posture.
（Swimming limb position, not walking. No water, no bubbles.）

==================================================
7. FINAL REQUIREMENT
==================================================

The final image must be a CLEAN GAME SPRITE SHEET, not a
presentation board.

It must show ONE EXACT SAME turtle, from ONE camera angle
(BACK 3/4), performing one action per row.

Prioritize:

1. one single camera angle — BACK 3/4 — in every cell
2. character consistency with character_reference.png
3. species accuracy
4. anatomical correctness
5. action clarity
6. consistent size and centering for clean 4 × 4 extraction
7. flat magenta background
8. Japanese children's picture-book style

==================================================
END OF BACK VIEW FILL-IN
==================================================
