# BANGUI TURTLE — MASTER SPRITE GENERATION RULES
# Chinese Stripe-necked Turtle / 斑龜 (Mauremys sinensis)
# Version 3.6 — THREE VIEWS (Front-high / Side / Back-high) + 3 × 4 sheet

> v3.6 的改變（相對 v3.5）：
> 1. 視角從 F / R / B / L 四個改成 **正面 / 側面 / 背面** 三個。
>    - 正面、背面：鏡頭在烏龜前方／後方，**從上往下俯看約 45 度**。
>    - 側面：跟以前一樣，烏龜面向右。左側由程式水平翻轉產生，不用畫。
> 2. 每張圖從 4 × 4（16 格）改成 **3 × 4（12 格）**：3 列視角 × 4 個 Frame。
> 3. 物種名稱更正：斑龜是 *Mauremys sinensis*（Chinese stripe-necked turtle），
>    不是三線閉殼龜，也不是 *Mauremys reevesii*（那是烏龜／草龜）。
> 4. 新增動作情境規則：水上（陸地、曬台）與水下兩類，以及翻身（FLIP）特別規則。




==================================================
0. CRITICAL OUTPUT RULE — RAW GAME SPRITE SHEET
==================================================

THIS IS A RAW GAME SPRITE SHEET.

DO NOT create a presentation board.
DO NOT create a character design sheet.
DO NOT create an animation reference chart.

The final image must contain ONLY 12 turtle sprites.

ABSOLUTELY NO:

- Frame labels
- Frame numbers
- View labels
- F / R / B / L labels
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
- text
- watermark

The 3 × 4 structure must exist ONLY as the spatial
arrangement of the turtle sprites.

DO NOT visually draw the grid.

DO NOT label rows.

DO NOT label columns.

Each cell must contain ONLY:

ONE COMPLETE TURTLE
+
SOLID RGB 255,0,255 BACKGROUND.

==================================================
1. CHARACTER REFERENCE
==================================================

The uploaded image:

character_reference.png

is the PRIMARY and AUTHORITATIVE visual reference
for the turtle character.

The turtle shown in the reference is ONE EXACT
individual turtle.

Every generated sprite must depict this SAME individual.

Do not replace the turtle with a generic turtle.

Do not redesign the turtle.

The reference image defines the turtle's physical identity.

IMPORTANT:
If the reference image and this rules file appear to
conflict, preserve the distinctive identity of the
reference turtle while following the explicit
long-tail requirement defined below.

==================================================
2. SPECIES
==================================================

Species:

Chinese stripe-necked turtle

Chinese name:

斑龜

Scientific name:

Mauremys sinensis

This is a freshwater pond turtle native to Taiwan and southern China.
It is NOT a box turtle. It cannot close its shell.

The turtle must unmistakably look like a young
Chinese stripe-necked turtle, exactly as shown in
character_reference.png.

Do NOT substitute another turtle species.

NOT:

- Chinese stripe-necked turtle (Cuora trifasciata)
- Reeves' turtle / Chinese pond turtle (Mauremys reevesii)
- red-eared slider
- yellow-bellied slider
- painted turtle
- map turtle
- musk turtle
- snapping turtle
- tortoise
- softshell turtle
- sea turtle
- generic green turtle


==================================================
3. CHARACTER IDENTITY
==================================================

The following physical characteristics are LOCKED.

They must remain consistent across:

- every action
- every frame
- every view
- every sprite sheet

Only these may change:

- animation pose
- body orientation
- viewing direction
- frame of motion

--------------------------------------------------
SHELL
--------------------------------------------------

The shell is the dominant visual mass.

Preserve:

- dark blackish-brown coloration
- deep olive-brown coloration
- elongated oval silhouette
- moderately domed shell
- substantial shell volume
- clear individual scutes
- dark scute boundaries
- subtle warm orange-brown / ochre markings
- natural irregular shell markings
- darker outer shell edge

The shell must remain DARK.

Do NOT make the shell:

- bright green
- bright yellow
- bright orange
- highly colorful
- transparent
- plastic-looking

--------------------------------------------------
THREE SHELL KEELS
--------------------------------------------------

The turtle has three clearly visible longitudinal
shell ridges / keels.

They are physical structures of the shell.

There must be:

- one central keel
- one left keel
- one right keel

The three keels follow the natural curvature
of the shell.

They must remain visible whenever the viewing angle
allows them to be seen.

Do NOT turn the keels into painted decorative stripes.

Do NOT flatten the shell.

--------------------------------------------------
SHELL MARKINGS
--------------------------------------------------

Preserve the natural dark shell markings from
the reference character.

Warm orange-brown / ochre markings may appear
inside individual scutes.

These markings must remain:

- subtle
- natural
- irregular
- integrated into the shell

Do NOT turn them into:

- large orange spots
- leopard spots
- bright yellow stripes
- decorative symbols

--------------------------------------------------
HEAD
--------------------------------------------------

The head is relatively small compared with the shell.

Preserve:

- narrow elongated turtle head
- natural rounded snout
- yellow-green / olive-green base color
- small dark eye
- natural turtle eye proportions

Do NOT create:

- oversized head
- anime eyes
- mammal-like face
- cartoon frog face

--------------------------------------------------
FACE AND NECK STRIPES
--------------------------------------------------

The head and neck contain dense dark longitudinal
striping.

This is one of the most important identifying
features of this turtle.

Preserve:

- yellow-green base skin
- numerous narrow dark stripes
- longitudinal direction
- organic irregularity
- continuation of stripes from head to neck

Do NOT simplify the markings into only
two or three large stripes.

Do NOT replace them with spots.

Do NOT remove the stripes.

--------------------------------------------------
LEGS
--------------------------------------------------

The turtle has four short but sturdy legs.

The legs are dark olive-brown / blackish
with narrow yellow-green longitudinal stripes.

Preserve:

- natural turtle limb anatomy
- sturdy front legs
- larger rear legs
- clearly separated toes
- semi-aquatic turtle foot structure

Do NOT create:

- mammal paws
- frog feet
- plain green legs
- plain brown legs

--------------------------------------------------
TAIL — IMPORTANT CHARACTER FEATURE
--------------------------------------------------

The turtle has a clearly visible, relatively long,
naturally tapered turtle tail.

The tail should be noticeably longer than the tail
of a generic cute turtle illustration.

The tail is a CHARACTER IDENTITY feature.

Preserve:

- long tapered natural turtle tail
- gradual narrowing from the tail base to the tip
- relatively narrow tail
- natural pointed tip
- natural connection to the rear of the shell
- consistent tail length and thickness across views
- consistent tail identity across animation frames

The tail should extend clearly beyond the rear shell
when the pose and viewing angle allow it.

Target visual proportion:
approximately 15–25% longer than a short generic
cartoon-turtle tail, while remaining anatomically
believable.

Do NOT shorten the tail merely to make the turtle
look cuter.

Do NOT hide the tail unless the actual pose naturally
causes it to be hidden.

Do NOT create:

- extremely oversized tail
- extremely thick tail
- lizard-like tail
- rat-like tail
- fish-like tail
- crocodile-like tail
- invisible tiny tail

The tail must remain unmistakably a natural turtle tail.

==================================================
4. BODY PROPORTIONS
==================================================

The turtle should remain:

- cute
- believable
- anatomically coherent
- naturally proportioned

The shell is much larger than the head.

The head must NOT become oversized.

The eyes must NOT become oversized.

The body must NOT become chibi.

The tail may be relatively long, but the overall
character must still look like a young Mauremys sinensis.

Do not use exaggerated cartoon proportions.

The turtle should feel like a real young turtle
translated into a children's picture-book character.

==================================================
5. CAMERA — THREE VIEWS
==================================================

The game uses a 2.5D presentation: the player looks
at the tank from slightly above.

Every action is drawn from exactly THREE camera positions.

--------------------------------------------------
FRONT  (row 1)
--------------------------------------------------

The camera is IN FRONT of the turtle and ABOVE it,
looking DOWN at approximately 45 degrees.

The turtle faces the viewer.

Visible:

- the top of the head and the face
- both eyes
- the neck coming toward the viewer
- the front half of the carapace seen from above,
  foreshortened, with the three keels running
  away from the viewer
- both front legs, symmetric left and right
- the rear legs partly visible at the sides

The front view is LEFT-RIGHT SYMMETRIC
(except where the action itself is asymmetric).

NOT a straight-on eye-level front view.
NOT a top-down view from directly above.

--------------------------------------------------
SIDE  (row 2)
--------------------------------------------------

UNCHANGED from previous versions.

The turtle faces RIGHT.

The camera is at the turtle's side at roughly
eye level (a slight elevation is fine).

Visible:

- the full profile of head, neck, shell and tail
- the near-side front and rear legs
- small parts of the far-side legs
- the plastron edge

ALWAYS draw the side view facing RIGHT.
The game creates the left-facing version by
mirroring. Do NOT draw a left-facing turtle.

--------------------------------------------------
BACK  (row 3)
--------------------------------------------------

The camera is BEHIND the turtle and ABOVE it,
looking DOWN at approximately 45 degrees.

The turtle faces AWAY from the viewer.

Visible:

- the rear half of the carapace from above,
  foreshortened, with the three keels running
  away from the viewer
- the tail pointing toward the viewer
- both rear legs, symmetric left and right
- the head and neck may be partly visible beyond
  the front edge of the shell, pointing away

The back view is LEFT-RIGHT SYMMETRIC
(except where the action itself is asymmetric).

The face is NEVER visible in the back view.

--------------------------------------------------
ELEVATION IS THE SAME FOR FRONT AND BACK
--------------------------------------------------

Front and back use the SAME 45-degree downward angle.
They are the same camera, rotated 180 degrees
around the turtle.


==================================================
6. THREE CORE VIEWS
==================================================

The sprite system uses three views:

FRONT = in front, 45 degrees from above
SIDE  = facing right, roughly eye level
BACK  = behind, 45 degrees from above

These are TRUE physical views of the SAME turtle
performing the SAME frame of the SAME action.

For a given column (frame), the three rows must show
the same moment of the movement from three cameras.

Example — WALK, frame 2 (left front leg forward):

FRONT: the turtle's left front leg (viewer's right)
       is forward.
SIDE:  the near front leg is forward.
BACK:  the same leg is forward, seen from behind.

Do not make each row a different action.
Do not make each row a different moment.


==================================================
7. VIEW CONSISTENCY
==================================================

The three views must look like the SAME physical turtle.

Across views, keep IDENTICAL:

- shell size and shell color
- shell markings and the three keels
- head size and face stripes
- leg thickness and stripes
- tail length and thickness
- overall body size

Only the camera changes.

The turtle must NOT look bigger in the front view
than in the side view.

The FRONT and BACK views are both from above:
the carapace dominates the silhouette in both.
The difference is only whether the head (FRONT)
or the tail (BACK) is closest to the viewer.


==================================================
8. ACTION CONSISTENCY
==================================================

Every action uses the SAME character.

Every action must preserve:

- shell
- shell color
- shell markings
- shell keels
- head
- facial stripes
- neck
- eyes
- legs
- toes
- tail
- body proportions
- art style

The action changes the POSE.

The action does NOT redesign the character.

==================================================
9. FRAME CONSISTENCY
==================================================

Every action contains exactly:

4 frames per view.

Frame structure:

Frame 1:
Beginning of movement.

Frame 2:
Movement developing.

Frame 3:
Strongest / most extended part
of the movement.

Frame 4:
Returning toward the starting state.

For looping actions:

Frame 4 must transition naturally
back to Frame 1.

For one-shot actions such as TURN,
Frame 4 may represent the completed state.

Do NOT create four unrelated poses.

The four frames must clearly belong
to the SAME continuous movement.

==================================================
10. ANATOMY RULES
==================================================

Maintain believable turtle anatomy.

Do NOT:

- add limbs
- remove limbs
- add toes
- remove toes
- create impossible joints
- bend limbs unnaturally
- detach body parts
- stretch the shell
- squash the shell
- deform the head
- allow limbs to pass through the shell
- create duplicated limbs
- create duplicated heads
- create duplicated tails

The shell remains physically rigid.

The body, neck, legs and tail provide most
of the visible animation.

==================================================
11. ANIMATION STYLE
==================================================

Motion should be:

- readable
- subtle
- charming
- natural
- suitable for a cozy turtle-raising game

Avoid extreme cartoon deformation.

Do NOT use:

- squash and stretch
- smear frames
- motion blur
- speed lines
- exaggerated deformation
- impossible poses

The movement should come from believable
turtle anatomy.

==================================================
12. ART STYLE
==================================================

Japanese children's picture-book illustration.

Warm traditional Japanese animal
picture-book feeling.

Hand-drawn 2D game character.

Use:

- clean dark-brown organic outlines
- slightly imperfect ink lines
- soft opaque flat-color painting
- subtle hand-painted texture
- warm earthy colors
- muted olive green
- dark olive brown
- warm brown
- yellow-green
- cream
- beige
- simple soft shading
- minimal highlights
- clear readable silhouette
- believable animal anatomy

The final character should feel:

- warm
- charming
- peaceful
- cute
- natural
- handcrafted

==================================================
13. STYLE NEGATIVE
==================================================

Do NOT use:

- watercolor
- watercolor wash
- watercolor bleeding
- photorealism
- wildlife photography
- 3D rendering
- CGI
- realistic 3D
- anime
- manga
- cel shading
- vector art
- SVG style
- sticker style
- glossy plastic
- toy appearance
- excessive realistic scales
- cinematic lighting
- dramatic shadows
- excessive highlights
- chibi proportions

==================================================
14. SPRITE SHEET FORMAT
==================================================

Each generated image contains:

3 rows × 4 columns = 12 cells.

The 4 columns are animation frames:

Column 1 = Frame 1
Column 2 = Frame 2
Column 3 = Frame 3
Column 4 = Frame 4

The 3 rows are views:

Row 1 = FRONT (45 degrees from above)
Row 2 = SIDE  (facing right)
Row 3 = BACK  (45 degrees from above)

Layout:

FRONT-1 | FRONT-2 | FRONT-3 | FRONT-4
SIDE-1  | SIDE-2  | SIDE-3  | SIDE-4
BACK-1  | BACK-2  | BACK-3  | BACK-4

CRITICAL:

The labels above are INTERNAL ORGANIZATION ONLY.

DO NOT DRAW THE LABELS.
DO NOT DRAW THE ROW NAMES.
DO NOT DRAW THE COLUMN NAMES.
DO NOT DRAW THE GRID.

Exactly 12 cells.

Exactly ONE complete turtle per cell.

Leave clear magenta space between rows so that no
part of one turtle (head, tail, legs) reaches into
the cell above or below it.


==================================================
15. RAW SPRITE SHEET — NO PRESENTATION BOARD
==================================================

The output must look like a raw game asset,
NOT like a presentation or reference chart.

The image must contain NO:

- title
- heading
- caption
- frame number
- view name
- Chinese text
- English text
- decorative label
- border
- frame outline
- grid line
- arrows
- diagram
- legend
- annotation

Do NOT create a poster.

Do NOT create an infographic.

Do NOT create a character sheet with labels.

Do NOT create an animation guide.

The entire usable image area should consist
of the 12 sprite cells.

==================================================
16. CELL CONSISTENCY
==================================================

Every cell must use:

- same character scale
- same camera distance
- same visual size
- same art style
- same lighting
- same rendering quality

Keep the turtle approximately centered
inside each cell.

Keep the turtle approximately the same size
in every cell.

The entire turtle must remain inside
its cell.

Do NOT crop:

- head
- shell
- legs
- tail

Because the character has a relatively long tail,
leave sufficient empty space behind the turtle
inside each cell so the tail is not clipped.

Do NOT shorten or hide the tail simply to fit
the cell.

Do NOT allow neighboring cells to overlap.

==================================================
17. BACKGROUND — CRITICAL
==================================================

Every cell must have a completely uniform
solid chroma-key magenta background.

Exact RGB:

255, 0, 255

The background must be PURE SOLID MAGENTA.

NO:

- white
- cream
- beige
- gray
- green
- gradient
- texture
- environment
- floor
- grass
- soil
- rocks
- water
- plants
- scenery
- shadows
- lighting effects

The turtle is the ONLY visible object.

==================================================
18. NO EXTRA OBJECTS
==================================================

The sprite sheet must contain ONLY the turtle.

Do NOT add:

- food
- toys
- rocks
- plants
- water
- dirt
- soil
- grass
- footprints
- dust
- particles
- bubbles
- splash
- speech bubbles
- decorative elements
- icons
- effects
- text
- labels
- numbers
- UI
- watermark

==================================================
19. SPECIAL RULE — EAT
==================================================

The eat animation shows the turtle eating.

NO FOOD OBJECT should appear.

Show only:

- head movement
- neck movement
- mouth movement
- natural eating posture

Do NOT draw:

- food
- food bowl
- plate
- pellets
- insects
- vegetables
- crumbs
- detached objects

The game engine handles the food object separately.

==================================================
20. SPECIAL RULE — POOP
==================================================

The poop animation represents only the turtle's
natural elimination posture.

NO feces object is shown.

Do NOT draw:

- poop
- feces
- fecal particles
- poop pile
- waste object
- dirty-water effect

Suggested motion:

Frame 1:
Turtle settles.

Frame 2:
Rear body rises slightly and tail shifts naturally.

Frame 3:
Turtle holds the posture.

Frame 4:
Turtle relaxes and returns to normal.

The game engine handles water quality separately.

==================================================
21. ACTION CONTEXT — ABOVE WATER / UNDERWATER
==================================================

Every action belongs to ONE of two contexts.
The context is stated at the top of each action file.

--------------------------------------------------
ABOVE WATER (land, basking platform, shallow edge)
--------------------------------------------------

- The turtle stands on an INVISIBLE flat ground.
- All four feet (or the plastron, for resting poses)
  touch that invisible ground line.
- Legs support the body weight: elbows and knees
  bent under the shell.
- Movement is slow and deliberate.

--------------------------------------------------
UNDERWATER
--------------------------------------------------

- The turtle is SUSPENDED in water. Nothing supports it.
- Legs are spread out and paddle; they do NOT stand.
- Toes are spread (webbed feet visible).
- The body may tilt up or down with the movement.
- For bottom actions (bottom_walk, bottom_rest) the
  turtle touches an invisible bottom, but moves
  lightly, with a floaty, buoyant feeling.

--------------------------------------------------
IN BOTH CONTEXTS
--------------------------------------------------

Do NOT draw water, bubbles, splash effects, ripples,
waterlines, ground, sand, rocks, fish, plants or
underwater scenery.

The environment is implied only by the pose.


==================================================
22. SPECIAL RULE — TURN
==================================================

TURN means REAL physical body rotation.

Do NOT:

- rotate only the head
- slide sideways
- rotate only the shell
- deform the shell
- teleport between directions

The shell, body, head, legs and tail
participate naturally.

Example:

Frame 1:
Current direction.

Frame 2:
Rotation begins.

Frame 3:
Between directions.

Frame 4:
New direction.

The shell remains rigid and physically consistent.

The tail follows the rotation naturally.

==================================================
23. CHARACTER / VIEW / ACTION SEPARATION
==================================================

CHARACTER:

What turtle is this?

Fixed by:

character_reference.png
+
these rules.

VIEW:

From which direction is the turtle viewed?

FRONT (45° above) / SIDE (facing right) / BACK (45° above)

ACTION:

What is the turtle doing?

Examples:

walk
turn
eat
swim
float
flip

FRAME:

Where is the turtle in the movement?

1 / 2 / 3 / 4

Changing ACTION must NOT redesign the character.

Changing VIEW must NOT redesign the character.

Changing FRAME must NOT redesign the character.

==================================================
24. OUTPUT NAMING
==================================================

One generated sheet corresponds to ONE action.

Sheet names use the action list in
gpt/actions/bangui_v3/README.md:

action_01_walk.png
action_02_turn.png
...

Extracted sprite names (done by tools/slice_poses_v4.py):

<action>_<view>_<frame>.png

view = F (front), R (side, facing right), B (back).
L (side, facing left) is generated by mirroring R.

Examples:

walk_F_1.png
walk_R_1.png
walk_B_1.png
walk_L_1.png   <- mirrored automatically


==================================================
25. TOTAL ASSET STRUCTURE
==================================================

See gpt/actions/bangui_v3/README.md for the
current action list (above water + underwater).

Each action produces:

ONE 3 × 4 sprite sheet
3 views × 4 frames = 12 cells.


==================================================
26. PYTHON EXTRACTION COMPATIBILITY
==================================================

The generated image must be suitable for
automatic Python sprite extraction.

Priority:

1. clean 3 × 4 arrangement (3 rows, 4 columns)
2. consistent cell dimensions
3. pure magenta background
4. one turtle per cell
5. clear magenta gap between rows and columns
6. no labels
7. no borders
8. no scenery
9. no overlapping sprites

The generated image must be a clean,
regular 3 × 4 arrangement WITHOUT DRAWING GRID LINES.

Do NOT reserve a separate area for labels.
Do NOT reserve a title area.
Do NOT reserve margins for captions.
Do NOT place text outside the cells.

Because the turtle has a longer tail,
the turtle must be scaled so the entire
tail remains safely inside every cell.


==================================================
27. FINAL QUALITY CHECK
==================================================

Before generating:

[ ] Same turtle as character_reference.png
[ ] Correct species: 斑龜 / Mauremys sinensis (NOT a box turtle)
[ ] Dark olive-brown shell, three keels, natural scutes
[ ] Striped head, neck and legs preserved
[ ] Long tapered tail preserved and not clipped
[ ] Exactly 3 rows × 4 columns = 12 cells
[ ] Row 1 FRONT: in front, 45 degrees from above, face visible, symmetric
[ ] Row 2 SIDE: facing RIGHT, roughly eye level
[ ] Row 3 BACK: behind, 45 degrees from above, tail toward viewer, no face
[ ] FRONT and BACK use the same downward angle
[ ] All three rows show the same moment in each column
[ ] Correct context: above water = standing; underwater = suspended, paddling
[ ] Four frames form one continuous action
[ ] Character scale is consistent in every cell
[ ] Pure RGB 255,0,255 background, one flat colour
[ ] No environment, no scenery, no props, no water effects
[ ] No labels, no numbers, no grid lines


==================================================
28. PRIORITY ORDER
==================================================

When generating the sprite sheet,
use this priority order:

1. SAME INDIVIDUAL TURTLE
2. CORRECT SPECIES
3. CHARACTER REFERENCE ACCURACY
4. LONG-TAIL CHARACTER IDENTITY
5. CLEAN 3 × 4 SPRITE LAYOUT
6. PURE MAGENTA BACKGROUND
7. VIEW CONSISTENCY
8. ANIMATION CLARITY
9. ANATOMICAL CONSISTENCY
10. ART STYLE

When style and character identity conflict:

CHARACTER IDENTITY WINS.

When animation and anatomy conflict:

ANATOMICAL CONSISTENCY WINS.

When decoration and sprite extraction conflict:

SPRITE EXTRACTION WINS.

When cell size and tail visibility conflict:

SCALE THE ENTIRE TURTLE DOWN SLIGHTLY.

DO NOT SHORTEN THE TAIL.

The goal is NOT to create a beautiful
presentation board.

The goal is to create a CLEAN GAME SPRITE SHEET.

The goal is ONE EXACT TURTLE character
performing 32 actions,
with 4 views and 4 frames per action.

==================================================
29. SPECIAL RULE — FLIP (UPSIDE DOWN)
==================================================

The FLIP action shows the turtle lying UPSIDE DOWN
on its carapace, trying to turn itself back over.

- The plastron (cream belly shell) faces UP.
- The carapace touches the invisible ground.
- The head and neck stretch out and push against
  the ground to lever the body.
- The legs wave in the air.
- Across the four frames the whole shell ROCKS
  from side to side; in frame 3 the rocking is
  strongest.

In the FRONT and BACK views the plastron and the
waving legs are seen from above at 45 degrees.
In the SIDE view the shell is seen in profile,
upside down, head on the right.

This is a stuck, slightly helpless pose, not a
painful one. Do NOT show injury, blood or distress
marks. Keep the expression calm.

