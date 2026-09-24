#!/usr/bin/env python3
"""產生斑龜 v3 動作提示詞：gpt/actions/bangui_v3/

v3 的規則（見 gpt/rules/rules_bangui_v3.6.md）：
- 三個視角：正面（前方、俯看 45 度）／側面（面向右）／背面（後方、俯看 45 度）
- 每個動作一張 3 × 4 的圖（3 列視角 × 4 幀）
- 動作分成「水上」和「水下」兩類

用法：
  python tools/make_actions_v3.py

要改動作內容就改下面的 ACTIONS，再重新執行。
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "gpt" / "actions" / "bangui_v3"

LAND = "ABOVE WATER"
WATER = "UNDERWATER"

# key, 中文, 情境, loop?, 說明, 4 幀, 各視角補充（可省略）
ACTIONS = [
    # ---------------- 水上 ----------------
    dict(key="walk", zh="走路", ctx=LAND, loop=True,
         desc="A slow, calm walk on land. The shell stays level and lifted just above the ground.",
         frames=[
             "Left front leg and right hind leg step forward together; the other two legs push back.",
             "Legs passing under the body; shell level, head looking forward.",
             "Right front leg and left hind leg step forward together; the other two legs push back.",
             "Legs passing under the body again, returning toward Frame 1.",
         ],
         views={
             "FRONT": "The alternating front legs are clearly visible left and right of the head.",
             "BACK": "The alternating hind legs are visible; the tail sways very slightly.",
         }),
    dict(key="turn", zh="轉身", ctx=LAND, loop=False,
         desc="The whole turtle turns about 90 degrees toward its own left, stepping in place.",
         frames=[
             "Standing in the current direction.",
             "Front legs step to the turtle's left; the whole body begins to rotate.",
             "Halfway through the turn; shell, head and tail rotated together.",
             "Turn complete: the turtle now faces 90 degrees to its left, standing still.",
         ],
         views={
             "SIDE": "Starts facing right; at Frame 4 the turtle faces the viewer (seen from the front-right).",
         },
         note="Do NOT rotate only the head. The shell, legs and tail rotate together as one rigid body."),
    dict(key="look", zh="抬頭張望", ctx=LAND, loop=True,
         desc="The turtle stops, lifts its neck and looks around.",
         frames=[
             "Standing still, head level.",
             "Neck extends upward about 45 degrees; eyes open wide.",
             "Head turns to the turtle's right, looking.",
             "Head turns back toward the centre, neck still raised.",
         ]),
    dict(key="sniff", zh="低頭聞聞", ctx=LAND, loop=True,
         desc="The turtle lowers its head and sniffs the ground.",
         frames=[
             "Standing still, head level.",
             "Head lowers toward the ground; neck bends down.",
             "Nose touches the ground; rear of the body slightly higher.",
             "Head lifts a little, about to sniff again.",
         ]),
    dict(key="eat", zh="吃東西（陸上）", ctx=LAND, loop=False,
         desc="The turtle eats something lying on the ground. The food itself is NOT drawn.",
         frames=[
             "Neck stretches forward and down toward the ground.",
             "Mouth opens.",
             "Mouth closes on the (invisible) food; head pulls back slightly.",
             "Mouth closed, swallowing; neck returns toward neutral.",
         ],
         note="Do NOT draw food, pellets, leaves, insects or crumbs."),
    dict(key="bask", zh="曬背", ctx=LAND, loop=True,
         desc="Basking under a lamp: resting on its plastron, neck stretched up toward the light, hind legs stretched backward.",
         frames=[
             "Lying on the plastron, neck raised toward the light, eyes half closed.",
             "Hind legs slide backward and stretch out.",
             "Fully stretched: hind legs straight back with soles facing up, front legs spread, eyes closed.",
             "Relaxed, hind legs still stretched, returning toward Frame 1.",
         ],
         views={
             "BACK": "The two stretched hind legs with soles facing up are the clearest part of this view.",
         }),
    dict(key="sleep", zh="睡覺", ctx=LAND, loop=True,
         desc="Sleeping on land: plastron on the ground, head partly withdrawn, eyes closed. A slow breathing loop.",
         frames=[
             "Lying flat, head half withdrawn, eyes closed, legs tucked in.",
             "Breathing in: the neck extends very slightly.",
             "Most extended breath: head a little further out.",
             "Breathing out: head back toward Frame 1.",
         ]),
    dict(key="yawn", zh="打哈欠", ctx=LAND, loop=False,
         desc="A slow, big yawn.",
         frames=[
             "Standing, head level.",
             "Head tilts up; mouth begins to open.",
             "Mouth wide open, eyes closed, front legs pushing the front of the body up.",
             "Mouth closes; head returns to level.",
         ]),
    dict(key="hide", zh="縮進殼裡", ctx=LAND, loop=False,
         desc="The turtle pulls its head and legs into the shell, then peeks out.",
         frames=[
             "Normal posture: head and all four legs clearly OUT of the shell.",
             "Head and legs halfway withdrawn.",
             "Fully withdrawn: only the shell, the tail and the claw tips are visible.",
             "Peeking out: nose and eyes just visible at the front opening.",
         ],
         views={
             "FRONT": "In Frame 3 the front opening of the shell is visible with the head hidden inside.",
             "BACK": "In Frame 3 only the shell and the tail are visible.",
         },
         note="Frame 1 MUST show the head and legs fully out. The four frames show the movement, not four copies of a hidden turtle."),
    dict(key="startled", zh="嚇一跳", ctx=LAND, loop=False,
         desc="A harmless surprise: the head jerks back, then the turtle calms down.",
         frames=[
             "Calm, standing.",
             "Head jerks back toward the shell; eyes wide.",
             "Head half withdrawn, legs braced, body lowered.",
             "Head slowly comes back out; body relaxes.",
         ]),
    dict(key="happy", zh="開心（搖屁屁）", ctx=LAND, loop=True,
         desc="A happy little wiggle: the rear of the body sways from side to side while the front stays planted.",
         frames=[
             "Standing, head raised, relaxed.",
             "Rear of the body sways to the turtle's left; tail swings.",
             "Rear sways fully to the turtle's right; tail swings the other way.",
             "Rear returns to the centre.",
         ],
         views={
             "BACK": "This is the best view for this action: the swaying rear and swinging tail face the viewer.",
         },
         note="Only the rear moves. The front legs stay planted."),
    dict(key="enter_water", zh="下水", ctx=LAND, loop=False,
         desc="From the edge of land, the turtle slides forward into the water. Water is NOT drawn.",
         frames=[
             "At the edge, head lowered, looking down in front of it.",
             "Front legs step forward and down; the body tilts nose-down.",
             "Front half dipping forward and down, hind legs pushing off.",
             "Body sliding forward nose-down; legs begin to spread for paddling.",
         ]),
    dict(key="flip", zh="翻過來", ctx=LAND, loop=True,
         ctx_text=("ABOVE WATER — the turtle lies UPSIDE DOWN: the CARAPACE rests on an invisible flat ground, "
                   "the plastron faces up, the legs are in the air."),
         desc="The turtle is stuck UPSIDE DOWN on its carapace and tries to turn itself back over.",
         frames=[
             "On its back, plastron facing up, legs waving in the air.",
             "Head and neck stretch out and push against the ground; shell rocks to one side.",
             "Strongest rock: the shell tilts far to one side, legs reaching.",
             "Shell rocks back to the centre; legs waving again.",
         ],
         views={
             "FRONT": "Seen from above and in front: the cream plastron faces the camera, head at the bottom of the cell reaching toward the viewer.",
             "SIDE": "The shell in profile, upside down, head on the RIGHT.",
             "BACK": "Seen from above and behind: the cream plastron faces the camera, tail toward the viewer.",
         },
         note="Follow rules section 29 (FLIP). Calm expression, no injury."),

    # ---------------- 水下 ----------------
    dict(key="swim", zh="游泳", ctx=WATER, loop=True,
         desc="Calm swimming. Body level, neck stretched forward, tail trailing behind.",
         frames=[
             "Front legs reach forward; hind legs push back.",
             "Gliding: legs spread, body level.",
             "Front legs sweep back; hind legs reach forward.",
             "Gliding again, returning toward Frame 1.",
         ]),
    dict(key="swim_turn", zh="水中轉向", ctx=WATER, loop=False,
         desc="While swimming, the turtle banks and turns about 90 degrees toward its own left.",
         frames=[
             "Swimming straight.",
             "Left front leg holds still, right front leg sweeps: the body begins to turn and bank.",
             "Halfway through the turn, body banked.",
             "Turn complete, swimming level in the new direction.",
         ],
         views={
             "SIDE": "Starts facing right; at Frame 4 the turtle faces the viewer (seen from the front-right).",
         }),
    dict(key="hover", zh="水中懸停", ctx=WATER, loop=True,
         desc="Staying in one place in mid-water with small, lazy paddling.",
         frames=[
             "Suspended, legs spread, head forward.",
             "Front legs make a small paddle.",
             "Hind legs make a small paddle.",
             "Legs spread again, returning toward Frame 1.",
         ]),
    dict(key="dive", zh="下潛", ctx=WATER, loop=False,
         desc="From level swimming the turtle points its nose down and dives.",
         frames=[
             "Swimming level.",
             "Head and front of the body tilt down about 20 degrees.",
             "Steep dive about 45 degrees down, strong push from the hind legs.",
             "Holding the downward angle, legs paddling.",
         ],
         views={
             "FRONT": "The top of the shell turns toward the camera as the nose points down.",
             "BACK": "The plastron and hind legs turn toward the camera as the rear rises.",
         }),
    dict(key="surface", zh="上浮換氣", ctx=WATER, loop=False,
         desc="The turtle swims up and pushes its nose out of the water to breathe. The water surface is NOT drawn.",
         frames=[
             "Swimming at an upward angle.",
             "Rising steeply, neck reaching up.",
             "Neck fully stretched up, nostrils at the (invisible) surface, eyes half closed.",
             "Breathing, legs paddling gently to stay in place.",
         ]),
    dict(key="float", zh="水面漂浮", ctx=WATER, loop=True,
         desc="Resting at the surface: body almost level, rear slightly lower, legs relaxed and spread, head up.",
         frames=[
             "Floating, legs spread and relaxed, head up.",
             "One front leg makes a slow, lazy stroke.",
             "Legs drift gently.",
             "Back toward Frame 1.",
         ]),
    dict(key="eat_water", zh="水中吃東西", ctx=WATER, loop=False,
         desc="The turtle bites food in mid-water. The body floats; it is NOT standing. The food itself is NOT drawn.",
         frames=[
             "Hovering, neck stretched forward, legs paddling to hold position.",
             "Mouth opens.",
             "Bites and pulls back; front claws lift toward the mouth to tear the food.",
             "Mouth closed, swallowing, back to hovering.",
         ],
         note="This is the underwater version of EAT. The legs paddle; they do NOT stand on anything."),
    dict(key="bottom_walk", zh="水底走路", ctx=WATER, loop=True,
         desc="Walking slowly on the bottom of the water. Lighter and floatier than walking on land.",
         frames=[
             "Left front leg and right hind leg step forward; tail floats up slightly.",
             "Legs passing; body barely touching the bottom.",
             "Right front leg and left hind leg step forward.",
             "Legs passing again, returning toward Frame 1.",
         ],
         note="Legs carry less weight than on land: softer bends, toes spread, the shell lifts a little between steps."),
    dict(key="bottom_rest", zh="水底休息", ctx=WATER, loop=True,
         desc="Resting (or sleeping) on the bottom of the water. Plastron on the bottom, neck stretched forward, legs relaxed.",
         frames=[
             "Lying on the bottom, neck stretched forward, eyes half closed.",
             "Head lifts very slightly.",
             "Head lifted a little more, as if checking around.",
             "Head settles back down.",
         ]),
    dict(key="climb_out", zh="上岸", ctx=WATER, loop=False,
         desc="From the water the turtle climbs up onto the basking platform. The platform is NOT drawn.",
         frames=[
             "In the water, front legs reaching up and forward onto an invisible edge.",
             "Front legs pull; body tilts nose-up.",
             "Hind legs push; the shell is halfway up.",
             "Standing level on land, water dripping is NOT drawn.",
         ],
         note="Starts underwater (legs paddling) and ends above water (legs standing)."),
]

# 舊 27 動作 → v3 的對照
OLD_TO_V3 = [
    ("walk_a", "walk", "改名"),
    ("run", "—", "刪除：烏龜不該衝，搶食也改成慢慢走（見 docs/backlog.md 第 2 項）"),
    ("turn", "turn", "保留"),
    ("look", "look", "保留"),
    ("sniff", "sniff", "保留"),
    ("bask", "bask", "保留（之前一直沒生成）"),
    ("sleep", "sleep", "保留"),
    ("yawn", "yawn", "保留"),
    ("stretch", "bask", "併入：伸懶腰跟曬背伸腿幾乎一樣"),
    ("hide", "hide", "保留，並規定 Frame 1 一定要是頭腳都伸出來"),
    ("rest", "sleep / bottom_rest", "併入：陸上休息＝睡覺，水裡休息另外做"),
    ("happy", "happy", "改成搖屁屁"),
    ("startled", "startled", "保留"),
    ("angry", "—", "刪除：烏龜生氣看不太出來，改用 startled / hide 表現"),
    ("wag", "happy", "併入：尾巴擺動太小，畫出來幾乎看不出在動"),
    ("shake", "happy", "併入（改名 happy）"),
    ("dig", "—", "刪除：遊戲裡沒有用到的情境"),
    ("eat", "eat", "保留，限定陸上"),
    ("poop", "—", "刪除：之後撈便便用物件表現，不需要動作"),
    ("play", "—", "刪除：太模糊，改由互動請求做"),
    ("enter_water", "enter_water", "保留"),
    ("swim", "swim", "保留"),
    ("swim_fast", "—", "刪除：烏龜不該衝"),
    ("swim_turn", "swim_turn", "保留"),
    ("dive", "dive", "保留"),
    ("float", "float", "保留"),
    ("surface", "surface", "保留"),
]

VIEW_TEXT = {
    "FRONT": "In front of the turtle, camera ABOVE looking DOWN about 45 degrees. Face toward the viewer, symmetric.",
    "SIDE": "Turtle faces RIGHT, camera at roughly eye level. Never draw it facing left.",
    "BACK": "Behind the turtle, camera ABOVE looking DOWN about 45 degrees. Tail toward the viewer, face never visible.",
}

CTX_TEXT = {
    LAND: ("ABOVE WATER — the turtle stands on an invisible flat ground. "
           "Feet (or plastron, for resting poses) touch that ground. Legs support the weight."),
    WATER: ("UNDERWATER — the turtle is suspended in water, nothing supports it. "
            "Legs are spread and paddle, toes spread. Do NOT draw water."),
}


def build_action(i: int, a: dict) -> str:
    bar = "=" * 50
    frames = "\n\n".join(f"FRAME {n}:\n{t}" for n, t in enumerate(a["frames"], 1))
    views = "\n\n".join(
        f"{v}:\n{VIEW_TEXT[v]}" + (f"\n{a.get('views', {})[v]}" if v in a.get("views", {}) else "")
        for v in ("FRONT", "SIDE", "BACK")
    )
    loop = ("LOOP: Frame 4 must lead naturally back into Frame 1."
            if a["loop"] else
            "ONE-SHOT: Frame 4 is the finished state.")
    note = f"\n\nIMPORTANT:\n{a['note']}" if a.get("note") else ""
    return f"""# Action {i:02d} — {a['key']}（{a['zh']}）

> 情境：**{'水上' if a['ctx'] == LAND else '水下'}**｜{'循環' if a['loop'] else '單次'}
> 搭配 `character_reference.png` 與 `gpt/rules/rules_bangui_v3.6.md` 一起使用。
> 產出一張 **3 × 4** 的圖，存成 `reference/sheets/bangui/action_{i:02d}_{a['key']}.png`。

ACTION_ID:
{i:02d}

ACTION_NAME:
{a['key']}

CONTEXT:
{a.get('ctx_text') or CTX_TEXT[a['ctx']]}

DESCRIPTION:
{a['desc']}

{bar}
1. FRAME SEQUENCE
{bar}

{frames}

{loop}

The four frames must clearly belong to the SAME continuous movement.{note}

{bar}
2. THREE VIEWS
{bar}

Every column shows the SAME moment from three cameras.

{views}

{bar}
3. SPRITE SHEET
{bar}

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

{bar}
4. ANATOMY
{bar}

Exactly ONE head, ONE neck, ONE long tapered tail and FOUR legs in every cell.
The shell is rigid: never squash, stretch or bend it.
No motion blur, no speed lines, no ghost copies, no chibi deformation.

{bar}
5. BACKGROUND
{bar}

Solid flat magenta, exact RGB 255, 0, 255, one single colour across the whole image.
No water, ground, bubbles, shadows, plants, rocks, props or effects.
The turtle is the ONLY visible object.

{bar}
END OF ACTION {i:02d} — {a['key'].upper()}
{bar}
"""


def build_readme() -> str:
    land = [(i, a) for i, a in enumerate(ACTIONS, 1) if a["ctx"] == LAND]
    water = [(i, a) for i, a in enumerate(ACTIONS, 1) if a["ctx"] == WATER]

    def table(rows):
        out = ["| # | 動作 | 中文 | 類型 | 內容 |", "|---:|---|---|---|---|"]
        for i, a in rows:
            out.append(f"| {i:02d} | `{a['key']}` | {a['zh']} | {'循環' if a['loop'] else '單次'} | {a['desc']} |")
        return "\n".join(out)

    old = ["| 舊動作（27） | v3 | 說明 |", "|---|---|---|"]
    old += [f"| `{o}` | {('`' + n + '`') if n != '—' and '/' not in n else n} | {why} |" for o, n, why in OLD_TO_V3]

    return f"""# 斑龜動作 v3：水上 {len(land)} ＋ 水下 {len(water)} ＝ {len(ACTIONS)} 個

> 由 `tools/make_actions_v3.py` 產生，要改內容請改那支程式再執行。
> 規則：`gpt/rules/rules_bangui_v3.6.md`（三視角：正面俯看 45°／側面／背面俯看 45°，每張 3 × 4）。

## 怎麼用

1. 上傳 `reference/character/bangui_character.png`（角色參考）
2. 上傳 `gpt/rules/rules_bangui_v3.6.md`（規則）
3. 上傳要做的那一個 `action_NN_xxx.md`
4. 產出的圖存成 `reference/sheets/bangui/action_NN_xxx.png`，跑 `python tools/slice_poses_v4.py bangui`

## 挑選原則

- **動作要簡單、一眼看得出來**：尾巴擺動、生氣這種幅度小或表情型的動作都刪了。
- **水上、水下各自完整**：兩邊都有移動、轉向、進食、休息，以及進出水的過場（下水／上岸）。
- **不要快速動作**：`run`、`swim_fast` 刪除，搶食也用一般速度（配合 docs/backlog.md 第 2 項）。

## 水上（陸地、曬台、淺灘）

{table(land)}

## 水下

{table(water)}

## 跟舊的 27 動作對照

{chr(10).join(old)}

新增：`flip`（翻過來）、`hover`（水中懸停）、`eat_water`（水中吃）、`bottom_walk`（水底走路）、`bottom_rest`（水底休息）、`climb_out`（上岸）。

在新圖生成之前，遊戲會自動用舊的切圖代替（例如 `walk` → `walk_a`、`bottom_rest` → `rest`），不會缺圖。
"""


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("action_*.md"):
        old.unlink()
    for i, a in enumerate(ACTIONS, 1):
        (OUT / f"action_{i:02d}_{a['key']}.md").write_text(build_action(i, a), encoding="utf-8")
    (OUT / "README.md").write_text(build_readme(), encoding="utf-8")
    land = sum(a["ctx"] == LAND for a in ACTIONS)
    print(f"輸出 {len(ACTIONS)} 個動作（水上 {land}、水下 {len(ACTIONS) - land}）→ {OUT}")


if __name__ == "__main__":
    main()
