# Action 03 — turn

> 原 Action：04｜中文：轉方向

# Action 03 — TURN
# 轉方向 / Body Turn

ACTION_ID:
04

ACTION_NAME:
turn

DESCRIPTION:
The turtle performs a REAL physical directional turn.

The entire turtle rotates as one connected body.

This is NOT a head-only movement.

This is NOT a camera rotation.

This is NOT a sliding movement.

The shell, body, head, legs and tail must participate
naturally in the rotation.

==================================================
1. ANIMATION GOAL
==================================================

Create a four-frame turning movement.

The turn should clearly communicate a change
of direction.

Preferred examples:

F → R
R → B
B → L
L → F

The exact starting and ending direction may depend
on the view being shown.

Each row must represent the SAME physical
turning movement viewed from that camera direction.

==================================================
2. FRAME 1 — CURRENT DIRECTION
==================================================

The turtle begins in its current orientation.

The body is stable.

The shell is aligned with the movement direction.

The head points naturally in the same general
direction as the body.

==================================================
3. FRAME 2 — TURN BEGINS
==================================================

The turtle begins rotating its body.

The head may initiate a small amount of natural
orientation change.

The shell begins rotating with the body.

The near and far legs reposition to support
the turn.

Do not rotate only the head.

==================================================
4. FRAME 3 — MID TURN
==================================================

The turtle is clearly between the starting
and ending directions.

The shell and body are rotated together.

Legs adjust naturally to maintain balance.

The tail follows the body orientation.

The character remains physically connected.

==================================================
5. FRAME 4 — TURN COMPLETE
==================================================

The turtle reaches the new direction.

The entire body and shell are now aligned
with the new orientation.

The turtle is stable and ready to continue moving.

Frame 4 represents the completed turn.

==================================================
6. TURN MECHANICS
==================================================

The shell must rotate as one rigid structure.

The body must remain attached to the shell.

The head and neck may naturally follow
the rotation.

The legs may step or reposition slightly
to create a believable turning motion.

The tail follows the body.

Do NOT:

- rotate only the head
- slide the turtle sideways
- rotate only the shell
- deform the shell
- stretch the body
- detach the limbs
- create a teleporting effect

==================================================
7. IMPORTANT 2.5D RULE
==================================================

The changing orientation must reveal
the turtle's three-dimensional volume.

The shell should visibly change its visible
front/side/rear surfaces during the turn.

The three shell keels must remain physically
consistent during rotation.

Do not redraw the shell as a completely different
shape at each frame.

==================================================
8. FOUR VIEW CONSISTENCY
==================================================

Use the same physical turning behavior
for all four views:

F = Front 3/4
R = Right 3/4
B = Back 3/4
L = Left 3/4

The four rows are different observations
of the same physical turtle.

Do NOT make each row perform a different action.

==================================================
9. SPRITE SHEET
==================================================

Create exactly ONE 4 × 4 sprite sheet.

Columns:
Frame 1 | Frame 2 | Frame 3 | Frame 4

Rows:
F
R
B
L

The labels above are INTERNAL ORGANIZATION ONLY.
DO NOT DRAW THEM.

Exactly 16 cells.

==================================================
10. BACKGROUND
==================================================

Pure solid chroma-key magenta.

RGB 255, 0, 255.

No environment.
No floor.
No water.
No props.
No particles.
No text.
No effects.

==================================================
11. FINAL REQUIREMENT
==================================================

The final sheet must clearly communicate
a real directional turn.

The viewer must be able to see:

Frame 1 = original direction
Frame 2 = beginning rotation
Frame 3 = mid rotation
Frame 4 = new direction

The shell, body, head, legs and tail must
remain one physically consistent turtle.

The turtle must remain visually identical to
character_reference.png and all rules in rules.md.
