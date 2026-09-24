#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
slice_poses.py v3.2
=================

將 GPT 產生的 2.5D 澤龜 Sprite Sheet 切成單張 PNG。

v3.2 規格：
    32 actions
    × 4 frames
    × 4 views (F/R/B/L)
    = 512 frames / species

輸入 Sprite Sheet（v3.2 canonical）：
    4 columns × 4 rows = 16 cells = ONE action

推薦檔名：
    action_01_walk_a.png
    action_02_walk_b.png
    ...
    action_32_surface.png

每張 sheet：
    row 1 = F (Front 3/4), frames 1..4
    row 2 = R (Right 3/4), frames 1..4
    row 3 = B (Back 3/4), frames 1..4
    row 4 = L (Left 3/4), frames 1..4

也支援舊版 8×4 grouped sheets，方便舊素材遷移。

主要處理：
    1. 洋紅背景 / alpha 去背
    2. 移除文字、ZZZ、泡泡等 detached objects
    3. 保留烏龜主體
    4. 偵測背甲
    5. 用同一張 sheet 的背甲寬中位數統一尺寸
    6. 以背甲中心對齊固定 anchor
    7. 輸出 560×560 RGBA
    8. 輸出 poses.json
    9. 輸出 contact sheet 預覽

依賴：
    pip install pillow numpy scipy

執行：
    python tools/slice_poses_v3.py
    python tools/slice_poses_v3.py bangui
    python tools/slice_poses_v3.py bangui musk

目錄：
    reference/sheets/<species>/
    assets/poses/<species>/
    reference/previews/
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


# ============================================================
# 0. Project paths / output constants
# ============================================================

ROOT = Path(__file__).resolve().parent.parent
POSES_DIR = ROOT / "assets" / "poses"
PREVIEW_DIR = ROOT / "reference" / "previews"

OUT_SIZE = 560
SHELL_W = 200
# 輸出時每格輪廓面積開根號要接近這個值（配合 SHELL_W，背甲大約 200px 寬）
TARGET_SIZE = 140
ANCHOR = (250, 300)

VIEWS = ("F", "R", "B", "L")
VIEW_NAMES = {
    "F": "Front",
    "R": "Right",
    "B": "Back",
    "L": "Left",
}

# v3 STANDARD_32
STANDARD_32 = [
    ("walk_a", "悠閒散步"),
    ("walk_b", "慢慢爬"),
    ("run", "快速爬行"),
    ("turn", "轉方向"),
    ("look", "停下張望"),
    ("neck_up", "伸長脖子"),
    ("observe", "抬頭觀察"),
    ("sniff", "低頭聞聞"),

    ("bask", "曬太陽"),
    ("sleep", "睡覺"),
    ("yawn", "打哈欠"),
    ("stretch", "伸懶腰"),
    ("hide", "縮進殼裡"),
    ("rest", "趴著休息"),
    ("happy", "開心"),
    ("relax", "放鬆"),

    ("startled", "驚嚇"),
    ("angry", "生氣"),
    ("wag", "搖尾巴"),
    ("shake", "搖屁屁"),
    ("dig", "挖土"),
    ("eat", "吃東西"),
    ("poop", "排泄"),
    ("play", "玩耍"),

    ("enter_water", "進入水中"),
    ("swim", "悠閒游泳"),
    ("swim_fast", "快速游泳"),
    ("swim_turn", "水中轉向"),
    ("dive", "下潛"),
    ("rise", "浮出水面"),
    ("float", "水中漂浮"),
    ("surface", "水面換氣"),
]

# v2 STANDARD_27（目前溝通用的版本）
# 把 32 個裡功能重複的 5 個併掉：
#   walk_b→walk_a、neck_up→look、observe→look、relax→rest、rise→surface
STANDARD_27 = [
    ("walk_a", "地面行走"),
    ("run", "快速爬行"),
    ("turn", "轉方向"),
    ("look", "停下張望／抬頭伸脖"),
    ("sniff", "低頭聞聞"),
    ("bask", "曬太陽"),
    ("sleep", "睡覺"),
    ("yawn", "打哈欠"),
    ("stretch", "伸懶腰"),
    ("hide", "縮進殼裡"),
    ("rest", "趴著休息／放鬆"),
    ("happy", "開心"),
    ("startled", "驚嚇"),
    ("angry", "生氣"),
    ("wag", "搖尾巴"),
    ("shake", "搖屁屁"),
    ("dig", "挖土"),
    ("eat", "吃東西"),
    ("poop", "排泄"),
    ("play", "玩耍"),
    ("enter_water", "進入水中"),
    ("swim", "悠閒游泳"),
    ("swim_fast", "快速游泳"),
    ("swim_turn", "水中轉向"),
    ("dive", "下潛"),
    ("float", "水中漂浮"),
    ("surface", "上浮換氣"),
]

# 舊 32 動作併到新 27 動作的對照（切圖後用來對照素材夠不夠）
MERGED_INTO_27 = {
    "walk_b": "walk_a",
    "neck_up": "look",
    "observe": "look",
    "relax": "rest",
    "rise": "surface",
}

# v3 動作（目前使用中）：水上 13 ＋ 水下 10，三視角、每張 3 × 4
# 清單的來源是 tools/make_actions_v3.py，改動作要兩邊一起改。
STANDARD_V3 = [
    ("walk", "走路"), ("turn", "轉身"), ("look", "抬頭張望"), ("sniff", "低頭聞聞"),
    ("eat", "吃東西（陸上）"), ("bask", "曬背"), ("sleep", "睡覺"), ("yawn", "打哈欠"),
    ("hide", "縮進殼裡"), ("startled", "嚇一跳"), ("happy", "開心（搖屁屁）"),
    ("enter_water", "下水"), ("flip", "翻過來"),
    ("swim", "游泳"), ("swim_turn", "水中轉向"), ("hover", "水中懸停"), ("dive", "下潛"),
    ("surface", "上浮換氣"), ("float", "水面漂浮"), ("eat_water", "水中吃東西"),
    ("bottom_walk", "水底走路"), ("bottom_rest", "水底休息"), ("climb_out", "上岸"),
]
V3_LAND = {"walk", "turn", "look", "sniff", "eat", "bask", "sleep", "yawn", "hide",
           "startled", "happy", "enter_water", "flip"}

# 新圖還沒生成前，v3 動作可以先用哪些舊素材頂著（狀態表用）
V3_SOURCES = {
    "walk": ["walk_a", "walk_b"],
    "sleep": ["rest", "relax"],
    "happy": ["shake", "wag"],
    "bask": ["stretch"],
    "surface": ["rise"],
    "look": ["neck_up", "observe"],
}

ACTION_NAMES = {**dict(STANDARD_32), **dict(STANDARD_27), **dict(STANDARD_V3)}
ACTION_KEYS = set(ACTION_NAMES)


# 補視角用的 sheet：一張圖只有一個視角，每一列是一個動作、每一欄是一幀。
# 用途是把已經有側面、只缺正面或背面的動作補齊（見 bangui_asset_status.md）。
# 對應的提示詞：gpt/back_fill/back_fill_B.md
FILL_SHEETS = {
    "back_01": ("B", ["turn", "hide", "rest", "happy"]),
    "back_02": ("B", ["startled", "angry", "wag", "shake"]),
    "back_03": ("B", ["dig", "poop", "dive"]),
}


# ============================================================
# 1. Input sheet discovery
# ============================================================

# v3.2 NEW / CANONICAL format
# ---------------------------
# ONE action = ONE 4×4 sheet
#
#   column 1  2  3  4
#   frame     1  2  3  4
#
#   row F     F1 F2 F3 F4
#   row R     R1 R2 R3 R4
#   row B     B1 B2 B3 B4
#   row L     L1 L2 L3 L4
#
# Example:
#   action_01_walk_a.png
#   action_02_walk_b.png
#   ...
#   action_32_surface.png
#
# The generator's internal labels MUST NOT be drawn into the image.
#
# v3.2 also keeps backward compatibility with the old grouped 8×4 sheets.


SHEET_GROUPS = (
    ("01_08", STANDARD_32[0:8]),
    ("09_16", STANDARD_32[8:16]),
    ("17_24", STANDARD_32[16:24]),
    ("25_32", STANDARD_32[24:32]),
)


def make_action_sheet_spec(species: str, action_id: int, action_key: str, action_name: str) -> dict:
    """Canonical v3.2: one action in a 4×4 sheet."""
    return {
        "file": f"reference/sheets/{species}/action_{action_id:02d}_{action_key}.png",
        "cols": 4,
        "rows": 4,
        "layout": "4x4_action",
        "bg": "magenta",
        "action_id": action_id,
        "action": action_key,
        "name": action_name,
    }


def discover_v32_action_sheets(species: str) -> list[dict]:
    """
    找出一個動作一張的 4×4 sheet。

    認的是檔名裡的「動作名稱」而不是編號——27 動作版和 32 動作版的編號
    對不起來（例如 action_02 在舊版是 walk_b、新版是 run），只看編號會切錯。

    接受：
        action_01_walk_a.png / 01_walk_a.png / action_01_walk_a_4x4.png
    """
    folder = ROOT / f"reference/sheets/{species}"
    if not folder.is_dir():
        return []

    order = {key: i for i, (key, _) in enumerate(STANDARD_V3)}
    order.update({
        key: len(STANDARD_V3) + i
        for i, (key, _) in enumerate(STANDARD_27)
        if key not in order
    })
    order.update({
        key: len(STANDARD_27) + i
        for i, (key, _) in enumerate(STANDARD_32)
        if key not in order
    })

    found: dict[str, tuple[int, Path, bool]] = {}
    unknown: list[str] = []
    superseded: list[str] = []

    for path in sorted(folder.glob("*.png")):
        m = re.match(r"(?:action_)?(\d{2})_(.+?)(?:_4x4)?$", path.stem)
        if not m:
            continue
        action_id, key = int(m.group(1)), m.group(2)
        if key not in ACTION_KEYS:
            unknown.append(path.name)
            continue
        # 編號和名稱都對上 v3 清單才是 v3 圖（3 × 4）；同一個動作有新舊兩張時用 v3 的
        is_v3 = 1 <= action_id <= len(STANDARD_V3) and STANDARD_V3[action_id - 1][0] == key
        prev = found.get(key)
        if prev is None or (is_v3 and not prev[2]):
            if prev is not None:
                superseded.append(prev[1].name)
            found[key] = (action_id, path, is_v3)
        elif is_v3 == prev[2]:
            pass
        else:
            superseded.append(path.name)

    if unknown:
        print(f"[{species}] 檔名的動作名稱不在清單裡，略過：{unknown}")
    if superseded:
        print(f"[{species}] 已有 v3 新圖，舊圖不再使用：{superseded}")

    specs = []

    for name, (view, actions) in FILL_SHEETS.items():
        path = folder / f"{name}.png"
        if not path.exists():
            continue
        specs.append({
            "file": str(path.relative_to(ROOT)).replace("\\", "/"),
            "cols": 4,
            "rows": len(actions),
            "layout": "fill_view",
            "bg": "magenta",
            "view": view,
            "fillActions": actions,
            "action": name,
            "name": f"{view} 視角補圖",
        })

    for key, (action_id, path, is_v3) in sorted(
        found.items(), key=lambda kv: order.get(kv[0], 999)
    ):
        spec = make_action_sheet_spec(
            species, action_id, key, ACTION_NAMES.get(key, key)
        )
        spec["file"] = str(path.relative_to(ROOT)).replace("\\", "/")
        spec["v3"] = is_v3
        specs.append(spec)

    return specs


def make_legacy_sheet_spec(species: str, group: str, view: str) -> dict:
    """Legacy v3 grouped 8×4 sheet spec."""
    actions = dict(SHEET_GROUPS)[group]
    return {
        "file": f"reference/sheets/{species}/actions_{group}_{view}.png",
        "cols": 8,
        "rows": 4,
        "layout": "legacy_8x4",
        "bg": "magenta",
        "view": view,
        "actions": actions,
    }


def discover_legacy_sheets(species: str) -> list[dict]:
    """Discover old grouped v3 files for backward compatibility."""
    specs = []

    for group, _actions in SHEET_GROUPS:
        for view in VIEWS:
            primary = ROOT / f"reference/sheets/{species}/actions_{group}_{view}.png"
            if primary.exists():
                specs.append(make_legacy_sheet_spec(species, group, view))
                continue

            group_num = {
                "01_08": "01",
                "09_16": "02",
                "17_24": "03",
                "25_32": "04",
            }[group]

            alias = ROOT / f"reference/sheets/{species}/sheet_{group_num}_{view}.png"
            if alias.exists():
                s = make_legacy_sheet_spec(species, group, view)
                s["file"] = str(alias.relative_to(ROOT)).replace("\\", "/")
                specs.append(s)

    return specs


def discover_sheets(species: str) -> list[dict]:
    """
    Prefer canonical v3.2 one-action 4×4 sheets.

    If no v3.2 sheets are found, fall back to the old grouped 8×4 format.
    This prevents accidentally mixing two layouts for the same species.
    """
    v32 = discover_v32_action_sheets(species)
    if v32:
        return v32

    return discover_legacy_sheets(species)


# ============================================================
# 2. Image cleanup
# ============================================================

def clean_alpha(img: np.ndarray, bg: str, bg_color=None) -> np.ndarray:
    """
    Return alpha mask in [0, 1].

    Supports:
        - real alpha
        - solid magenta background
        - anti-aliased magenta edges
    """
    rgb = img[..., :3].astype(np.float32)

    if bg == "alpha":
        return img[..., 3].astype(np.float32) / 255.0

    # 背景色用實際估到的為準：GPT 產的圖經過壓縮，洋紅並不是正好 (255,0,255)，
    # 用固定值算距離會讓整片背景留下半透明的粉紅霧。
    bg_rgb = np.asarray(bg_color if bg_color is not None else (255.0, 0.0, 255.0),
                        dtype=np.float32)
    dist = np.linalg.norm(rgb - bg_rgb, axis=2)

    # 柔邊：保留烏龜邊緣的抗鋸齒。
    alpha = np.clip((dist - 26.0) / 55.0, 0.0, 1.0)

    # Respect an existing alpha channel if it exists.
    if img.shape[-1] == 4:
        alpha *= img[..., 3].astype(np.float32) / 255.0

    return alpha


def estimate_bg_color(img: np.ndarray) -> list[float]:
    """從四邊的邊框像素取中位數當背景色。"""
    rgb = img[..., :3].astype(np.float32)
    band = max(2, min(img.shape[0], img.shape[1]) // 100)
    edges = np.concatenate([
        rgb[:band].reshape(-1, 3),
        rgb[-band:].reshape(-1, 3),
        rgb[:, :band].reshape(-1, 3),
        rgb[:, -band:].reshape(-1, 3),
    ])
    return [float(v) for v in np.median(edges, axis=0)]


def keep_main_blob(alpha: np.ndarray) -> np.ndarray:
    """
    Keep the turtle's main connected component(s).

    GPT may accidentally produce detached tiny artifacts.
    We keep the largest meaningful component and nearby components
    that are large enough to be a legitimate disconnected limb/tail.
    """
    binary = alpha > 0.18
    if not binary.any():
        return np.zeros_like(alpha)

    labels, count = ndimage.label(binary, structure=np.ones((3, 3), dtype=np.uint8))
    if count == 0:
        return np.zeros_like(alpha)

    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    largest = int(np.argmax(sizes))
    largest_size = int(sizes[largest])

    # Keep components >= 2.5% of the main turtle component.
    # This is deliberately more tolerant than the old 25% rule because
    # feet/tail can become disconnected after anti-aliasing.
    keep_ids = np.where(sizes >= max(12, largest_size * 0.025))[0]
    keep_ids = set(int(x) for x in keep_ids if x != 0)

    # 碰到格子邊緣的小塊是隔壁格烏龜被格線切到的一角（例如下一列背面圖的頭），
    # 不是這隻烏龜的一部分。主體本身碰到邊緣則照留。
    edge = np.zeros_like(binary)
    edge[0, :] = edge[-1, :] = edge[:, 0] = edge[:, -1] = True
    touching = set(int(x) for x in np.unique(labels[edge]) if x != 0)
    keep_ids -= touching - {largest}

    mask = np.isin(labels, list(keep_ids))

    # Remove tiny islands left by threshold noise.
    labels2, count2 = ndimage.label(mask, structure=np.ones((3, 3), dtype=np.uint8))
    if count2:
        sizes2 = np.bincount(labels2.ravel())
        sizes2[0] = 0
        valid = sizes2 >= max(8, largest_size * 0.01)
        mask = valid[labels2]

    return alpha * mask.astype(np.float32)


# ============================================================
# 3. Shell detection
# ============================================================

def _bbox_from_mask(mask: np.ndarray):
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def find_shell(img: np.ndarray, alpha: np.ndarray):
    """
    Generic shell finder for olive/brown shells.

    The shell is expected to be:
        - darker than skin
        - relatively low saturation or brown/olive
        - a large central region
    """
    rgb = img[..., :3].astype(np.float32)
    hsv = np.array(Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).convert("HSV"))
    h = hsv[..., 0].astype(np.float32) / 255.0
    s = hsv[..., 1].astype(np.float32) / 255.0
    v = hsv[..., 2].astype(np.float32) / 255.0

    valid = alpha > 0.45

    # Brown/olive/dark shell candidates.
    # Hue is intentionally broad because species vary.
    olive_brown = (
        ((h >= 0.08) & (h <= 0.24)) |
        ((h >= 0.00) & (h <= 0.08) & (s >= 0.12))
    )
    darkish = v < 0.72

    mask = valid & olive_brown & darkish

    # Fill small holes and remove tiny specks.
    mask = ndimage.binary_opening(mask, iterations=1)
    mask = ndimage.binary_closing(mask, iterations=2)

    labels, count = ndimage.label(mask, structure=np.ones((3, 3), dtype=np.uint8))
    if count == 0:
        return None

    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    largest_id = int(np.argmax(sizes))
    largest_size = int(sizes[largest_id])

    # Shell should be a substantial fraction of the turtle.
    turtle_pixels = max(1, int((alpha > 0.45).sum()))
    if largest_size < turtle_pixels * 0.18:
        return None

    shell_mask = labels == largest_id
    bbox = _bbox_from_mask(shell_mask)
    if bbox is None:
        return None

    x0, y0, x1, y1 = bbox

    # Reject implausibly tiny regions.
    width = x1 - x0
    height = y1 - y0
    if width < 20 or height < 15:
        return None

    ys, xs = np.nonzero(shell_mask)
    return (
        float((x0 + x1) / 2),
        float((y0 + y1) / 2),
        float(width),
    )


def find_shell_dark(img: np.ndarray, alpha: np.ndarray):
    """Fallback shell finder for very dark-shell species."""
    rgb = img[..., :3].astype(np.float32)
    lum = (
        0.2126 * rgb[..., 0]
        + 0.7152 * rgb[..., 1]
        + 0.0722 * rgb[..., 2]
    )

    valid = alpha > 0.45
    mask = valid & (lum < 105)

    mask = ndimage.binary_opening(mask, iterations=1)
    mask = ndimage.binary_closing(mask, iterations=2)

    labels, count = ndimage.label(mask, structure=np.ones((3, 3), dtype=np.uint8))
    if count == 0:
        return None

    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    largest_id = int(np.argmax(sizes))
    largest_size = int(sizes[largest_id])

    turtle_pixels = max(1, int((alpha > 0.45).sum()))
    if largest_size < turtle_pixels * 0.18:
        return None

    shell_mask = labels == largest_id
    bbox = _bbox_from_mask(shell_mask)
    if bbox is None:
        return None

    x0, y0, x1, y1 = bbox
    width = x1 - x0
    height = y1 - y0
    if width < 20 or height < 15:
        return None

    ys, xs = np.nonzero(shell_mask)
    return (
        float((x0 + x1) / 2),
        float((y0 + y1) / 2),
        float(width),
    )


# ============================================================
# 4. Cell / action helpers
# ============================================================

def make_entries(actions: Iterable[tuple[str, str]], view: str):
    """
    Legacy grouped-sheet helper.

    Converts 8 actions into 32 frame entries.
    """
    entries = []
    for action, name in actions:
        for frame in range(1, 5):
            key = f"{action}_{view}_{frame}"
            entries.append((key, name, action, frame, view))
    return entries


def make_action_entries(action: str, name: str):
    """
    Canonical v3.2 4×4 helper.

    Rows are views F/R/B/L.
    Columns are frames 1..4.
    """
    entries = []
    for view in VIEWS:
        for frame in range(1, 5):
            key = f"{action}_{view}_{frame}"
            entries.append((key, name, action, frame, view))
    return entries


# ------------------------------------------------------------
# 自動判斷每一列的視角
#
# GPT 產的 4×4 sheet，列順序並不固定（有的 R/F/L/B、有的四列全是側面），
# 寫死 F/R/B/L 會把側面貼成正面，遊戲動作就會亂跳。
# 這裡改成看圖判斷：亮色的頭／脖子偏向哪一邊。
#   facing > 0   頭在右 → R
#   facing < 0   頭在左 → L
#   接近 0       正面或背面，靠 views.json 指定（沒指定就跳過）
# ------------------------------------------------------------

SIDE_THRESHOLD = 0.055
AXIAL_SYMMETRY = 0.85


def cell_facing(cell: np.ndarray, alpha: np.ndarray) -> float | None:
    """回傳頭部相對於身體中心的水平位移，除以身體寬度。"""
    mask = alpha > 0.5
    if mask.sum() < 500:
        return None

    lum = cell[..., :3].astype(np.float32) @ [0.299, 0.587, 0.114]
    xs = np.nonzero(mask)[1]
    body_cx = float(xs.mean())
    width = float(xs.max() - xs.min()) or 1.0

    bright = mask & (lum > np.percentile(lum[mask], 85))
    if bright.sum() < 50:
        return None

    return (float(np.nonzero(bright)[1].mean()) - body_cx) / width


def cell_symmetry(alpha: np.ndarray) -> float | None:
    """輪廓左右翻轉後的重疊度。正面／背面接近 1，側面明顯較低。"""
    mask = alpha > 0.5
    if mask.sum() < 500:
        return None
    ys, xs = np.nonzero(mask)
    crop = mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return float((crop & crop[:, ::-1]).sum() / crop.sum())


def content_bands(mask_axis: np.ndarray, min_len: int = 20) -> list[tuple[int, int]]:
    """把「這一行/這一列有沒有東西」的布林陣列切成連續的區段。"""
    bands = []
    start = None
    for i, filled in enumerate(mask_axis):
        if filled and start is None:
            start = i
        elif not filled and start is not None:
            bands.append((start, i - 1))
            start = None
    if start is not None:
        bands.append((start, len(mask_axis) - 1))
    return [b for b in bands if b[1] - b[0] >= min_len]


def count_rows(img: np.ndarray, spec: dict) -> int:
    """圖上實際有幾列烏龜（v3 是 3 列、舊版是 4 列）。"""
    if "bgColor" not in spec and spec.get("bg", "magenta") != "alpha":
        spec["bgColor"] = estimate_bg_color(img)
    alpha = clean_alpha(img, spec.get("bg", "magenta"), spec.get("bgColor"))
    return len(content_bands((alpha > 0.5).any(1)))


def auto_grid(img: np.ndarray, spec: dict, rows: int, cols: int, report: list[str]):
    """
    依「圖上實際有東西的位置」決定格線，而不是平均切。

    GPT 排版並不精準：back.png 第 4 列的烏龜從 y=761 開始，平均切的格線卻在
    814，直接把頭切掉。找得到剛好 rows/cols 個區段時就用區段之間的中點當格線，
    找不到就退回平均切。
    """
    alpha = clean_alpha(img, spec.get("bg", "magenta"), spec.get("bgColor"))
    mask = alpha > 0.5

    def cuts(axis_any: np.ndarray, want: int, total: int, label: str):
        bands = content_bands(axis_any)
        if len(bands) != want:
            return None
        edges = [0]
        for a, b in zip(bands, bands[1:]):
            edges.append((a[1] + b[0]) // 2)
        edges.append(total)
        return edges

    y = cuts(mask.any(1), rows, img.shape[0], "列")
    x = cuts(mask.any(0), cols, img.shape[1], "欄")

    if y is None or x is None:
        return None

    even_y = [round(i * img.shape[0] / rows) for i in range(rows + 1)]
    shift = max(abs(a - b) for a, b in zip(y, even_y))
    if shift > 8:
        report.append(f"  ℹ 排版沒對齊，改用實際內容切格線（最多差 {shift}px）")
    return y, x


def detect_row_views(img: np.ndarray, spec: dict, report: list[str]):
    """
    判斷 4×4 sheet 每一列的視角。

    回傳 [(view, [flip0..flip3]), ...] 四筆，view 是 'R'/'F'/'B'/'skip'。

    做法是逐格看朝向，不是整列平均——因為像 04_turn、05_look 這種動作，
    同一列裡烏龜本來就會左右轉。側面的列一律正規化成「朝右」，朝左的格子
    標記 flip，之後左側視角直接用鏡像產生，左右才會完全對稱。
    """
    override = spec.get("viewMap") or []
    h, w = img.shape[:2]
    ch, cw = h / 4, w / 4

    rows = []
    for r in range(4):
        facings = []
        syms = []
        for c in range(4):
            cell = img[round(r * ch):round((r + 1) * ch),
                       round(c * cw):round((c + 1) * cw)]
            alpha = _prepare_cell(cell, spec)
            facings.append(cell_facing(cell, alpha))
            sym = cell_symmetry(alpha)
            if sym is not None:
                syms.append(sym)

        sides = [f for f in facings if f is not None and abs(f) > SIDE_THRESHOLD]
        axial = [f for f in facings if f is not None and abs(f) <= SIDE_THRESHOLD]
        flips = [f is not None and f < 0 for f in facings]
        strength = float(np.mean([abs(f) for f in sides])) if sides else 0.0
        rows.append({"sides": len(sides), "axial": len(axial),
                     "flips": flips, "strength": strength,
                     "sym": float(np.mean(syms)) if syms else 0.0})

    labels = ["skip"] * 4

    # 側面列：四格裡至少三格是明確側面。挑朝向最清楚的一列當正式素材，
    # 其餘重複的側面列略過，避免同一個 key 被蓋來蓋去。
    side_rows = [r for r in range(4) if rows[r]["sides"] >= 3]
    if side_rows:
        best = max(side_rows, key=lambda r: rows[r]["strength"])
        labels[best] = "R"

    # 剩下的列＝正面或背面。分不出來，所以先上後下當 F、B。
    # 只接受「整列都朝向鏡頭」的列，混著側面的列寧可跳過，
    # 免得把側面圖塞進正面欄位（那就是動畫看起來很怪的原因）。
    axial = [
        r for r in range(4)
        if labels[r] == "skip" and r not in side_rows
        and rows[r]["axial"] >= 3 and rows[r]["sym"] >= AXIAL_SYMMETRY
    ]
    for i, r in enumerate(axial):
        labels[r] = ("F", "B")[i] if i < 2 else "skip"

    # views.json 可以覆寫（人工確認過的列順序優先）
    for r in range(4):
        if r < len(override) and override[r] in ("F", "B", "R", "L", "skip"):
            labels[r] = override[r]

    report.append(
        "  視角：" + " ".join(
            f"{v}{'↔' if v in ('R', 'L') and any(rows[r]['flips']) else ''}"
            for r, v in enumerate(labels)
        )
    )

    return [
        (labels[r], rows[r]["flips"] if labels[r] in ("R", "L") else [False] * 4)
        for r in range(4)
    ]


def mirror_missing_side(results: dict, out_dir: Path, report: list[str]) -> None:
    """只有一側的動作，用水平翻轉補出另一側（錨點要跟著鏡像回原位）。"""
    made = 0
    # 所有切出來的動作都要補（v3 新增的動作不在舊的 32 個清單裡）
    for action in sorted({v["action"] for v in results.values()}):
        for src_view, dst_view in (("R", "L"), ("L", "R")):
            for frame in range(1, 5):
                src_key = f"{action}_{src_view}_{frame}"
                dst_key = f"{action}_{dst_view}_{frame}"
                if src_key not in results or dst_key in results:
                    continue

                src = Image.open(out_dir / f"{src_key}.png").convert("RGBA")
                flipped = src.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

                # 翻轉後錨點跑到 OUT_SIZE-1-ANCHOR[0]，平移回來。
                shift = ANCHOR[0] - (OUT_SIZE - 1 - ANCHOR[0])
                out = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
                if shift >= 0:
                    out.alpha_composite(flipped.crop((0, 0, OUT_SIZE - shift, OUT_SIZE)), (shift, 0))
                else:
                    out.alpha_composite(flipped.crop((-shift, 0, OUT_SIZE, OUT_SIZE)), (0, 0))
                out.save(out_dir / f"{dst_key}.png", optimize=True)

                meta = dict(results[src_key])
                meta.update({
                    "file": f"{dst_key}.png",
                    "view": dst_view,
                    "mirroredFrom": src_key,
                })
                results[dst_key] = meta
                made += 1

    if made:
        report.append(f"  鏡像補齊 {made} 張（只有單邊側面的動作）")


def parse_view_from_filename(filename: str) -> str | None:
    stem = Path(filename).stem.upper()
    m = re.search(r"(?:_|-)(F|R|B|L)$", stem)
    return m.group(1) if m else None


def validate_raw_4x4_sheet(img: np.ndarray, spec: dict, report: list[str]) -> None:
    """
    Basic validation for the canonical raw sprite sheet.

    We do not reject unusual cell proportions because generated images may
    be 1024×1024, 1536×1024, etc. The slicer only requires a regular 4×4 grid.
    """
    h, w = img.shape[:2]
    if w < 400 or h < 400:
        report.append(
            f"  ⚠ {spec['file']}: 圖片尺寸偏小 {w}×{h}"
        )

    if w % 4 != 0 or h % 4 != 0:
        report.append(
            f"  ⚠ {spec['file']}: 圖片不是 4 的整數倍，使用浮點網格切割 "
            f"{w}×{h}"
        )


# ============================================================
# 5. Sheet processing
# ============================================================

def _prepare_cell(cell: np.ndarray, spec: dict):
    alpha = clean_alpha(cell, spec.get("bg", "magenta"), spec.get("bgColor"))
    alpha = keep_main_blob(alpha)
    return alpha


def _process_one_cell(
    item: dict,
    spec: dict,
    scale: float,
    out_dir: Path,
    results: dict,
    report: list[str],
):
    key = item["key"]
    cell = item["cell"]
    alpha = item["alpha"]
    shell = item["shell"]

    if shell:
        cx, cy = shell[0], shell[1]
    else:
        ys, xs = np.nonzero(alpha > 0.45)
        cx = float((xs.min() + xs.max()) / 2)
        cy = float((ys.min() + ys.max()) / 2)

    rgba = cell.copy()

    # Remove magenta contamination from anti-aliased edges.
    if spec.get("bg") == "magenta":
        a = np.maximum(alpha, 1e-3)[..., None]
        bg_rgb = np.array(spec.get("bgColor") or [255.0, 0.0, 255.0],
                          dtype=np.float32)
        rgb = (
            rgba[..., :3].astype(np.float32)
            - (1.0 - a) * bg_rgb
        ) / a
        rgba[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)

    rgba[..., 3] = np.clip(alpha * 255.0, 0, 255).astype(np.uint8)
    rgba[alpha <= 0] = 0

    src = Image.fromarray(rgba, "RGBA")

    new_w = max(1, round(src.width * scale))
    new_h = max(1, round(src.height * scale))
    src = src.resize((new_w, new_h), Image.Resampling.LANCZOS)

    # The shell anchor is computed in ORIGINAL cell coordinates and then
    # scaled by the same factor. This keeps F/R/B/L stable.
    ox = round(ANCHOR[0] - cx * scale)
    oy = round(ANCHOR[1] - cy * scale)

    out = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))

    src_box = (
        max(0, -ox),
        max(0, -oy),
        min(src.width, OUT_SIZE - ox),
        min(src.height, OUT_SIZE - oy),
    )

    if src_box[2] > src_box[0] and src_box[3] > src_box[1]:
        crop = src.crop(src_box)
        out.alpha_composite(
            crop,
            (max(0, ox), max(0, oy)),
        )

    arr_out = np.array(out)
    alpha_out = arr_out[..., 3]
    rows_used = np.nonzero(alpha_out.max(1) > 128)[0]

    bottom = (
        float((rows_used.max() - ANCHOR[1]) / SHELL_W)
        if len(rows_used)
        else 0.4
    )

    bbox = out.getbbox()
    clipped = False
    if bbox:
        clipped = (
            bbox[0] <= 0
            or bbox[1] <= 0
            or bbox[2] >= OUT_SIZE
            or bbox[3] >= OUT_SIZE
        )

    output_file = out_dir / f"{key}.png"
    out.save(output_file, optimize=True)

    results[key] = {
        "file": f"{key}.png",
        "action": item["action"],
        "name": item["name"],
        "frame": item["frame"],
        "view": item["view"],
        "source": spec["file"],
        "shellFound": bool(shell),
        "bottom": round(bottom, 4),
        "scale": round(scale, 5),
        "clipped": bool(clipped),
    }

    notes = []
    if not shell:
        notes.append("shell fallback")
    if clipped:
        notes.append("超出邊界被裁切")
    if scale > 2.2:
        notes.append(f"放大 {scale:.1f} 倍，可能有點糊")
    elif scale < 0.5:
        notes.append(f"縮小 {scale:.1f} 倍")

    report.append(
        f"  {'⚠' if notes else '✓'} "
        f"{key:24} {item['name']} "
        f"{'、'.join(notes)}"
    )


def process_sheet(spec: dict, results: dict, report: list[str], out_dir: Path):
    path = ROOT / spec["file"]
    if not path.exists():
        return

    img = np.array(Image.open(path).convert("RGBA"))
    h, w = img.shape[:2]

    if spec.get("bg", "magenta") != "alpha" and "bgColor" not in spec:
        spec["bgColor"] = estimate_bg_color(img)

    cols = int(spec["cols"])
    rows = int(spec["rows"])
    layout = spec.get("layout", "legacy_8x4")

    if layout == "fill_view":
        view = spec["view"]
        entries = []
        for act in spec["fillActions"]:
            for c in range(4):
                entries.append((f"{act}_{view}_{c + 1}", ACTION_NAMES.get(act, act),
                                act, c + 1, view, False))

        # 順便檢查：這張圖如果混進側面，代表生成時視角跑掉了
        ch_, cw_ = h / rows, w / cols
        odd = []
        for r in range(rows):
            for c in range(cols):
                cell = img[round(r * ch_):round((r + 1) * ch_),
                           round(c * cw_):round((c + 1) * cw_)]
                f = cell_facing(cell, _prepare_cell(cell, spec))
                if f is not None and abs(f) > SIDE_THRESHOLD:
                    odd.append(f"{spec['fillActions'][r]}#{c + 1}")
        if odd:
            report.append(
                f"  ⚠ 這幾格看起來是側面不是 {view}，建議重生成：{'、'.join(odd)}"
            )

    elif layout == "4x4_action" and spec.get("v3"):
        # v3：3 列固定是 正面 / 側面 / 背面
        rows = spec["rows"] = 3
        cw, ch = w / cols, h / rows
        grid = auto_grid(img, spec, rows, cols, report)
        y_cuts = grid[0] if grid else [round(r * ch) for r in range(rows + 1)]
        x_cuts = grid[1] if grid else [round(c * cw) for c in range(cols + 1)]

        action = spec["action"]
        name = spec["name"]
        entries = []
        for r, view in enumerate(("F", "R", "B")):
            for c in range(4):
                flip = False
                if view == "R":
                    # 側面規定要朝右；畫成朝左的格子鏡像回來
                    cell = img[y_cuts[r]:y_cuts[r + 1], x_cuts[c]:x_cuts[c + 1]]
                    f = cell_facing(cell, _prepare_cell(cell, spec))
                    flip = f is not None and f < -SIDE_THRESHOLD
                entries.append((f"{action}_{view}_{c + 1}", name, action, c + 1, view, flip))
        found_rows = count_rows(img, spec)
        report.append("  視角：F R B（v3 三視角）" + ("" if found_rows == 3 else
                      f"  ⚠ 圖上看起來有 {found_rows} 列，預期 3 列，請確認排版"))

    elif layout == "4x4_action":
        validate_raw_4x4_sheet(img, spec, report)

        if cols != 4 or rows != 4:
            report.append(
                f"  ✗ {spec['file']}: v3.2 action sheet 必須是 4×4，"
                f"實際 {cols}×{rows}"
            )
            return

        action = spec["action"]
        name = spec["name"]

        entries = []
        for view, flips in detect_row_views(img, spec, report):
            for c in range(4):
                if view == "skip":
                    entries.append(None)
                else:
                    entries.append(
                        (f"{action}_{view}_{c + 1}", name, action, c + 1,
                         view, flips[c])
                    )

    else:
        if cols != 8 or rows != 4:
            report.append(
                f"  ⚠ {spec['file']}: 舊格式預期 8×4，實際 {cols}×{rows}"
            )

        view = spec.get("view") or parse_view_from_filename(spec["file"])
        if view not in VIEWS:
            report.append(
                f"  ✗ {spec['file']}: 找不到有效 view (F/R/B/L)"
            )
            return

        actions = spec["actions"]
        if len(actions) != 8:
            report.append(
                f"  ✗ {spec['file']}: 舊格式必須有 8 個 actions"
            )
            return

        entries = make_entries(actions, view)

    cw = w / cols
    ch = h / rows

    grid = auto_grid(img, spec, rows, cols, report)
    y_cuts = grid[0] if grid else [round(r * ch) for r in range(rows + 1)]
    x_cuts = grid[1] if grid else [round(c * cw) for c in range(cols + 1)]

    # --------------------------------------------------------
    # First pass: cleanup + shell detection
    # --------------------------------------------------------
    cells = []

    for idx, entry in enumerate(entries):
        if entry is None:
            continue
        key, name, action, frame, view, *rest = entry
        flip = bool(rest[0]) if rest else False
        r, c = divmod(idx, cols)

        y0, y1 = y_cuts[r], y_cuts[r + 1]
        x0, x1 = x_cuts[c], x_cuts[c + 1]

        cell = img[y0:y1, x0:x1]

        # 側面一律朝右，朝左的格子先鏡像過來
        if flip:
            cell = np.ascontiguousarray(cell[:, ::-1])

        alpha = _prepare_cell(cell, spec)

        if alpha.max() <= 0:
            report.append(f"  ✗ {key}: 空白 cell")
            continue

        finder = (
            find_shell_dark
            if spec.get("shell") == "dark"
            else find_shell
        )
        shell = finder(cell, alpha)

        cells.append(
            {
                "key": key,
                "name": name,
                "action": action,
                "frame": frame,
                "view": view,
                "cell": cell,
                "alpha": alpha,
                "shell": shell,
            }
        )

    if not cells:
        report.append(f"  ✗ {spec['file']}: 沒有可用 cell")
        return

    # --------------------------------------------------------
    # Scale using median shell width.
    #
    # IMPORTANT v3.2:
    # Scale is computed PER ACTION SHEET, across all 16 cells.
    # This is better for the new 4×4 F/R/B/L layout than computing
    # a separate scale for each view.
    # --------------------------------------------------------
    # 用「輪廓面積開根號」當尺寸基準，不要用寬度。
    # 伸長脖子、四肢張開會讓寬度差很多（跨圖 ±13%），面積穩定得多（±6%），
    # 用寬度正規化的結果就是同一隻烏龜在不同動作忽大忽小。
    areas = [
        float(np.sqrt((item["alpha"] > 0.45).sum()))
        for item in cells
    ]
    areas = [a for a in areas if a > 0]

    if not areas:
        report.append(f"  ✗ {spec['file']}: 找不到任何有效 turtle 輪廓")
        return

    scale = TARGET_SIZE / float(np.median(areas))

    scale = float(np.clip(scale, 0.35, 3.0))

    # --------------------------------------------------------
    # Second pass: normalize and output
    # --------------------------------------------------------
    for item in cells:
        _process_one_cell(
            item=item,
            spec=spec,
            scale=scale,
            out_dir=out_dir,
            results=results,
            report=report,
        )




# ============================================================
# 6. Preview
# ============================================================

def contact_sheet(results: dict, path: Path):
    """
    Create an 8-column preview.

    v3 groups by view/action so it is easier to verify:
        F/R/B/L consistency
    """
    keys = sorted(
        results,
        key=lambda k: (
            VIEWS.index(results[k]["view"]),
            list(ACTION_KEYS).index(results[k]["action"])
            if results[k]["action"] in ACTION_KEYS
            else 999,
            results[k]["frame"],
        ),
    )

    cols = 8
    size = 150
    rows = max(1, (len(keys) + cols - 1) // cols)

    sheet = Image.new("RGB", (cols * size, rows * size), (45, 45, 45))
    draw = ImageDraw.Draw(sheet)

    for i, key in enumerate(keys):
        item = results[key]
        im = Image.open(POSES_DIR / CURRENT_SPECIES / item["file"]).convert("RGBA")
        im = im.resize((size, size), Image.Resampling.LANCZOS)

        r, c = divmod(i, cols)

        # Alternate neutral backgrounds; no effect on exported sprites.
        tile_bg = (62, 62, 62) if (r + c) % 2 else (78, 78, 78)
        tile = Image.new("RGB", (size, size), tile_bg)
        tile.paste(im, (0, 0), im)

        # Anchor cross.
        ax = ANCHOR[0] * size // OUT_SIZE
        ay = ANCHOR[1] * size // OUT_SIZE
        for d in range(-3, 4):
            if 0 <= ax + d < size:
                tile.putpixel((ax + d, ay), (255, 90, 90))
            if 0 <= ay + d < size:
                tile.putpixel((ax, ay + d), (255, 90, 90))

        sheet.paste(tile, (c * size, r * size))

        label = f"{item['view']} {item['action']} F{item['frame']}"
        draw.text(
            (c * size + 4, r * size + 4),
            label,
            fill=(255, 255, 255),
        )

    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path)


# ============================================================
# 7. Species processing
# ============================================================

CURRENT_SPECIES = ""


def slice_species(species: str):
    global CURRENT_SPECIES

    CURRENT_SPECIES = species
    out_dir = POSES_DIR / species

    specs = discover_sheets(species)

    if not specs:
        print(f"[{species}] 找不到 v3.2 Sprite Sheet，略過")
        print(
            "請放置：reference/sheets/"
            f"{species}/action_01_walk_a.png ... action_32_surface.png"
        )
        return False

    out_dir.mkdir(parents=True, exist_ok=True)

    results: dict = {}
    report: list[str] = []

    for spec in specs:
        # 新版 4×4（一個動作一張）沒有 view 欄位，舊版 grouped sheet 才有
        tag = spec.get('view') or spec.get('action') or 'sheet'
        report.append(f"[{tag}] {spec['file']}")
        process_sheet(spec, results, report, out_dir)

    mirror_missing_side(results, out_dir, report)

    # Validate duplicates / missing views.
    expected = {
        f"{action}_{view}_{frame}"
        for action, _name in STANDARD_V3
        for view in VIEWS
        for frame in range(1, 5)
    }

    actual = set(results)
    missing = sorted(expected - actual)

    view_counts = {
        view: sum(1 for x in results.values() if x["view"] == view)
        for view in VIEWS
    }

    # 以 v3 動作為準，看每個動作實際有哪些視角（新圖還沒生成時，舊素材一起算）
    coverage = {}
    for key, _name in STANDARD_V3:
        sources = [key] + V3_SOURCES.get(key, [])
        got = {
            v["view"]
            for v in results.values()
            if v["action"] in sources
        }
        drawn = {
            v["view"]
            for v in results.values()
            if v["action"] in sources and not v.get("mirroredFrom")
        }
        coverage[key] = {
            "views": sorted(got),
            "drawn": sorted(drawn),
            "sources": sources,
        }

    meta = {
        "version": "3.2",
        "actionsV3": [
            {"id": i, "key": key, "name": name,
             "context": "land" if key in V3_LAND else "water", **coverage[key]}
            for i, (key, name) in enumerate(STANDARD_V3, start=1)
        ],
        "size": OUT_SIZE,
        "anchor": list(ANCHOR),
        "shellWidth": SHELL_W,
        "views": list(VIEWS),
        "viewNames": VIEW_NAMES,
        "actions": [
            {
                "id": i,
                "key": key,
                "name": name,
            }
            for i, (key, name) in enumerate(STANDARD_32, start=1)
        ],
        "framesPerAction": 4,
        "expectedFrames": len(STANDARD_V3) * 4 * 4,
        "actualFrames": len(results),
        "viewCounts": view_counts,
        "missing": missing,
        "poses": results,
    }

    (out_dir / "poses.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # 裁掉每張圖四周的透明部分（省記憶體，iPhone 才開得起來），裁切位置寫回 poses.json
    from crop_poses import crop_dir
    crop_dir(out_dir)

    # 清掉這次沒有產生的舊圖（換了新圖、刪了動作之後，舊檔不會自己消失）
    keep = {v["file"] for v in results.values()}
    stale = [f for f in out_dir.glob("*.png") if f.name not in keep]
    for f in stale:
        f.unlink()
    if stale:
        report.append(f"  清掉 {len(stale)} 張已不使用的舊圖")

    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    preview = PREVIEW_DIR / f"poses_preview_{species}_v3.png"

    if results:
        contact_sheet(results, preview)

    print(f"\n[{species}] v3.2")
    print("\n".join(report))
    print(
        f"\n輸出：{len(results)} 張（v3 動作 {len(expected & set(results))} / {meta['expectedFrames']}，"
        f"其餘是舊動作的圖，給還沒有 v3 新圖的動作代替用）"
    )
    print(f"資料夾：{out_dir}")
    print(f"poses.json：{out_dir / 'poses.json'}")
    print(f"預覽：{preview}")

    if missing:
        print("\n⚠ 缺少 frames：")
        for key in missing[:80]:
            print(f"  - {key}")
        if len(missing) > 80:
            print(f"  ... 還有 {len(missing) - 80} 個")

    return True


# ============================================================
# 8. Main
# ============================================================

# Known species folders. Add more without changing the slicer.
SPECIES = [
    "bangui",
    "musk",
    "map",
    "slider",
    "painted",
    "european",
    "Striped Mud",
    "Razor-backed Musk",
]


def main():
    wanted = sys.argv[1:] or SPECIES

    unknown = [x for x in wanted if x not in SPECIES]
    if unknown:
        sys.exit(
            "不認識的品種："
            f"{unknown}\n"
            f"可用：{SPECIES}"
        )

    POSES_DIR.mkdir(parents=True, exist_ok=True)

    ready = []
    for species in wanted:
        if slice_species(species):
            ready.append(species)

    # Index only species that have a v3.2 poses.json.
    ready_index = sorted(
        d.name
        for d in POSES_DIR.iterdir()
        if d.is_dir() and (d / "poses.json").exists()
    )

    (POSES_DIR / "index.json").write_text(
        json.dumps(
            {
                "version": "3.2",
                "species": ready_index,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"\n有 v3.2 姿勢圖的品種：{ready_index}")


if __name__ == "__main__":
    main()
