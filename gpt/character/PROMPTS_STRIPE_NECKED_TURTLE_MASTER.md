# 斑龜全視角姿勢圖：定裝照 26 方向

> 品種 **斑龜** *Mauremys sinensis*。此檔案僅含**定裝照**；動作提示詞已移至共用檔案 [`PROMPTS_ACTIONS_4DIR.md`](../shared/PROMPTS_ACTIONS_4DIR.md)（所有澤龜共用）。

---

## 定裝照 26 方向（Character Reference Turntable）

> **先用此 prompt 生成 26 方向定裝照**，存為 `reference/sheets/bangui/ref_26.png`（3072×2560，6×5 格，每格 512×512，末 4 格留空）。**所有後續 Sheet 只上傳此張作角色參考，不再重寫外觀。**
> 龜體姿勢固定為**中立站姿**（四肢自然支撐、頭頸筆直向前、眼看正前方），只有相機環繞改變視角。

```
Character reference turntable for a young Chinese stripe-necked turtle (Mauremys sinensis), 26 views of the SAME turtle in the SAME neutral standing pose, arranged in a grid of 6 columns x 5 rows = 30 cells of 512x512 (use the first 26 cells in row-major order, leave the last 4 cells empty magenta), no grid lines or borders.

DETAILED APPEARANCE — must be reproduced exactly in every later sheet:
- Carapace: domed, dark olive-brown base, each scute edged with thin golden seams forming a clear net, tiny golden speckles scattered on the dark ground, central vertebral keel faintly ridged, marginal scutes slightly serrated and rimmed in pale yellow
- Plastron: cream-yellow, slightly translucent at the edges, with thin light-brown seams between plastral scutes, visible from below and side angles
- Skin: olive-green ground, covered with DENSE many thin longitudinal yellow-green stripes on the head, the entire neck (dorsal, ventral and sides), all four legs (upper and lower, front and hind) and the short tail; stripes are parallel, crisp, continuous, not spots
- Head: narrow snout, round dark brown eyes with a small white catchlight, no red patch behind either eye, yellow stripe runs from the snout tip through the eye to the neck
- Legs and tail: claws dark horn with pale tips, tail short and striped
- Size: juvenile, carapace length about 45% of a 512 cell, centered in every cell

Neutral pose (identical in every cell, only camera moves): standing on all four legs on an invisible ground, legs slightly apart, neck straight forward, head level, mouth closed, calm eyes. Do NOT change limb positions or expression between cells.

Style: soft hand-painted storybook watercolor, clean dark-brown outlines, gentle shading, no photorealism, no 3D render.
Background: flat solid magenta #FF00FF in every cell, no gradient, shadow, ground, water, text or symbols.

Views in row-major order (left to right, top to bottom):
Row 1: 1) TOP (directly above, looking straight down at carapace) | 2) E (right side) | 3) NE (right-front 45°) | 4) N (front) | 5) NW (left-front 45°) | 6) W (left side)
Row 2: 7) SW (left-back 45°) | 8) S (back) | 9) SE (right-back 45°) | 10) E-UP (right side, camera 45° above eye level) | 11) NE-UP | 12) N-UP
Row 3: 13) NW-UP | 14) W-UP | 15) SW-UP | 16) S-UP | 17) SE-UP | 18) E-DOWN (right side, camera 45° below eye level)
Row 4: 19) NE-DOWN | 20) N-DOWN | 21) NW-DOWN | 22) W-DOWN | 23) SW-DOWN | 24) S-DOWN
Row 5: 25) SE-DOWN | 26) BOTTOM (directly below, looking straight up at plastron) | 27) empty | 28) empty | 29) empty | 30) empty
```

**此張定案後，後續所有動作皆寫**：「*the same turtle as the attached 26-view reference, EXACT same colors, patterns, stripes, eye color, claw color and style — do NOT alter appearance, only change the pose as described in PROMPTS_ACTIONS_4DIR.md*」。

**下一步**：上傳此 `ref_26.png` 至 [`PROMPTS_ACTIONS_4DIR.md`](../shared/PROMPTS_ACTIONS_4DIR.md) 的各 Sheet 提示詞生成動作。
