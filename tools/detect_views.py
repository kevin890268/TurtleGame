#!/usr/bin/env python3
"""偵測 Sprite Sheet 每一列是哪個視角（R / L / F / B）。

GPT 產生的 4×4 sheet，每張的列順序不一定相同（有的是 R/F/L/B、有的是 L/R/B/L），
寫死順序切出來的視角就會錯。這支程式用影像特徵自動判斷：

  sym      左右翻轉後的重疊度 → 高＝正面或背面，低＝側面
  head_dx  頭（皮膚色）相對於背甲中心的左右位移 → 正＝頭在右（面向右）
  shell_r  背甲面積佔比 → 背面看幾乎只剩殼，佔比最高

用法：
  python tools/detect_views.py                    # 分析 bangui 的所有 action sheet
  python tools/detect_views.py 01 26              # 只分析某幾張
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
import slice_poses_v4 as v4  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SHEETS = ROOT / "reference/sheets/bangui"


def cell_features(cell: np.ndarray) -> dict | None:
    alpha = v4.keep_main_blob(v4.clean_alpha(cell, "magenta"))
    mask = alpha > 0.5
    if mask.sum() < 500:
        return None
    ys, xs = np.nonzero(mask)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    crop = mask[y0:y1 + 1, x0:x1 + 1]
    # 左右對稱度
    sym = float((crop & crop[:, ::-1]).sum() / crop.sum())

    rgb = cell[..., :3].astype(np.float32)
    lum = rgb @ [0.299, 0.587, 0.114]
    shell = v4.find_shell(cell, alpha)
    shell_r = 0.0
    head_dx = 0.0
    if shell:
        cx, _cy, sw = shell
        # 皮膚：亮、偏黃綠（不是深色背甲）
        skin = mask & (lum > 120) & (rgb[..., 1] >= rgb[..., 2])
        # 背甲：暗色區塊
        dark = mask & (lum < 120)
        shell_r = float(dark.sum() / mask.sum())
        if skin.sum() > 200:
            # 只看身體兩端（頭或尾），中間的腹甲不算
            sxs = np.nonzero(skin.any(0))[0]
            span = max(1.0, sw)
            left_tip = cx - sxs.min()
            right_tip = sxs.max() - cx
            head_dx = float((right_tip - left_tip) / span)
    return {"sym": sym, "head_dx": head_dx, "shell_r": shell_r,
            "w": int(x1 - x0), "h": int(y1 - y0)}


def sheet_rows(path: Path) -> list[list[dict | None]]:
    img = np.array(Image.open(path).convert("RGBA"))
    h, w = img.shape[:2]
    ch, cw = h / 4, w / 4
    rows = []
    for r in range(4):
        row = []
        for c in range(4):
            cell = img[round(r * ch):round((r + 1) * ch), round(c * cw):round((c + 1) * cw)]
            row.append(cell_features(cell))
        rows.append(row)
    return rows


def classify_row(feats: list[dict | None]) -> tuple[str, dict]:
    ok = [f for f in feats if f]
    if not ok:
        return "?", {}
    avg = {k: float(np.mean([f[k] for f in ok])) for k in ("sym", "head_dx", "shell_r")}
    if avg["sym"] > 0.82:                      # 左右對稱 → 正面或背面
        view = "B" if avg["shell_r"] > 0.55 else "F"
    else:
        view = "R" if avg["head_dx"] > 0 else "L"
    return view, avg


def main() -> None:
    wanted = sys.argv[1:]
    files = sorted(SHEETS.glob("action_*.png"))
    if wanted:
        files = [f for f in files if any(w in f.name for w in wanted)]
    for f in files:
        rows = sheet_rows(f)
        parts = []
        for i, row in enumerate(rows):
            view, avg = classify_row(row)
            parts.append(f"{i+1}:{view} (sym {avg.get('sym', 0):.2f} dx {avg.get('head_dx', 0):+.2f} "
                         f"shell {avg.get('shell_r', 0):.2f})")
        order = "".join(classify_row(r)[0] for r in rows)
        flag = "" if sorted(order) == ["B", "F", "L", "R"] else "  ← 視角不齊全！"
        print(f"{f.name:32} {order}{flag}")
        for p in parts:
            print(f"    {p}")


if __name__ == "__main__":
    main()
