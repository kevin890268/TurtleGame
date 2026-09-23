#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
slice_poses.py v3
=================

將 GPT 產生的 2.5D 澤龜 Sprite Sheet 切成單張 PNG。

v3 規格：
    32 actions
    × 4 frames
    × 4 views (F/R/B/L)
    = 512 frames / species

輸入 Sprite Sheet：
    8 columns × 4 rows = 32 cells

推薦檔名：
    actions_01_08_F.png
    actions_09_16_F.png
    actions_17_24_F.png
    actions_25_32_F.png

    actions_01_08_R.png
    ...
    actions_25_32_L.png

每張 sheet 的 8 個 action 依序各佔一列中的 4 格：

    action_1 frame1 frame2 frame3 frame4
    action_2 frame1 frame2 frame3 frame4
    ...
    action_8 frame1 frame2 frame3 frame4

也支援舊式「一個 action 一列、4 cells」的 sheet，只要
manifest/spec 裡的 poses 順序正確。

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

ACTION_KEYS = {key for key, _ in STANDARD_32}
ACTION_NAMES = dict(STANDARD_32)


# ============================================================
# 1. Input sheet discovery
# ============================================================

# v3 expects these four action ranges.
SHEET_GROUPS = (
    ("01_08", STANDARD_32[0:8]),
    ("09_16", STANDARD_32[8:16]),
    ("17_24", STANDARD_32[16:24]),
    ("25_32", STANDARD_32[24:32]),
)


def make_sheet_spec(species: str, group: str, view: str) -> dict:
    """Create one standard v3 sheet spec."""
    actions = dict(SHEET_GROUPS)[group]
    return {
        "file": f"reference/sheets/{species}/actions_{group}_{view}.png",
        "cols": 8,
        "rows": 4,
        "bg": "magenta",
        "view": view,
        "actions": actions,
    }


def discover_standard_sheets(species: str) -> list[dict]:
    """
    Discover standard v3 files.

    Also accepts sheet_01_F.png ... sheet_04_F.png as aliases.
    """
    specs = []

    for group, _actions in SHEET_GROUPS:
        for view in VIEWS:
            primary = ROOT / f"reference/sheets/{species}/actions_{group}_{view}.png"
            if primary.exists():
                specs.append(make_sheet_spec(species, group, view))
                continue

            # Alias:
            group_num = {
                "01_08": "01",
                "09_16": "02",
                "17_24": "03",
                "25_32": "04",
            }[group]
            alias = ROOT / f"reference/sheets/{species}/sheet_{group_num}_{view}.png"
            if alias.exists():
                s = make_sheet_spec(species, group, view)
                s["file"] = str(alias.relative_to(ROOT)).replace("\\", "/")
                specs.append(s)

    return specs


# ============================================================
# 2. Image cleanup
# ============================================================

def clean_alpha(img: np.ndarray, bg: str) -> np.ndarray:
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

    # Magenta distance.
    magenta = np.array([255.0, 0.0, 255.0], dtype=np.float32)
    dist = np.linalg.norm(rgb - magenta, axis=2)

    # Exact / near-magenta = transparent.
    # The soft threshold preserves anti-aliased turtle edges.
    alpha = np.clip((dist - 8.0) / 55.0, 0.0, 1.0)

    # Respect an existing alpha channel if it exists.
    if img.shape[-1] == 4:
        alpha *= img[..., 3].astype(np.float32) / 255.0

    return alpha


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
    Convert 8 actions into 32 frame entries.

    Cell order:
        action1 f1 f2 f3 f4
        action2 f1 f2 f3 f4
        ...
    """
    entries = []
    for action, name in actions:
        for frame in range(1, 5):
            key = f"{action}_{view}_{frame}"
            entries.append((key, name, action, frame, view))
    return entries


def parse_view_from_filename(filename: str) -> str | None:
    """
    Recognize:
        actions_01_08_F.png
        actions_01_08-F.png
        sheet_01_F.png
    """
    stem = Path(filename).stem.upper()
    m = re.search(r"(?:_|-)(F|R|B|L)$", stem)
    return m.group(1) if m else None


# ============================================================
# 5. Sheet processing
# ============================================================

def process_sheet(spec: dict, results: dict, report: list[str], out_dir: Path):
    path = ROOT / spec["file"]
    if not path.exists():
        return

    img = np.array(Image.open(path).convert("RGBA"))
    h, w = img.shape[:2]

    cols = int(spec["cols"])
    rows = int(spec["rows"])

    if cols != 8 or rows != 4:
        report.append(
            f"  ⚠ {spec['file']}: v3 預期 8×4，實際 {cols}×{rows}"
        )

    cw = w / cols
    ch = h / rows

    view = spec.get("view") or parse_view_from_filename(spec["file"])
    if view not in VIEWS:
        report.append(
            f"  ✗ {spec['file']}: 找不到有效 view (F/R/B/L)"
        )
        return

    actions = spec["actions"]
    if len(actions) != 8:
        report.append(
            f"  ✗ {spec['file']}: 這張 sheet 必須有 8 個 actions"
        )
        return

    entries = make_entries(actions, view)

    # --------------------------------------------------------
    # First pass: cleanup + shell detection
    # --------------------------------------------------------
    cells = []

    for idx, (key, name, action, frame, view) in enumerate(entries):
        r, c = divmod(idx, cols)

        y0 = round(r * ch)
        y1 = round((r + 1) * ch)
        x0 = round(c * cw)
        x1 = round((c + 1) * cw)

        cell = img[y0:y1, x0:x1]

        alpha = clean_alpha(cell, spec.get("bg", "magenta"))
        alpha = keep_main_blob(alpha)

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
    # Scale using the median shell width in THIS view/sheet.
    # --------------------------------------------------------
    widths = [
        item["shell"][2]
        for item in cells
        if item["shell"] is not None
    ]

    if widths:
        scale = SHELL_W / float(np.median(widths))
    else:
        # If shell detection failed everywhere, normalize from the
        # turtle bounding-box width instead of crashing.
        bbox_widths = []
        for item in cells:
            ys, xs = np.nonzero(item["alpha"] > 0.45)
            if len(xs):
                bbox_widths.append(xs.max() - xs.min() + 1)

        if not bbox_widths:
            report.append(f"  ✗ {spec['file']}: 找不到任何有效 turtle bbox")
            return

        scale = SHELL_W / float(np.median(bbox_widths))
        report.append(
            f"  ⚠ {spec['file']}: 背甲全部偵測失敗，改用 turtle bbox 尺寸"
        )

    # Avoid extreme scaling from one bad sheet.
    scale = float(np.clip(scale, 0.35, 3.0))

    # --------------------------------------------------------
    # Second pass: normalize and output
    # --------------------------------------------------------
    for item in cells:
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
            bg_rgb = np.array([255.0, 0.0, 255.0], dtype=np.float32)
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

        # IMPORTANT:
        # Use the same anchor coordinate system for F/R/B/L.
        # This prevents view switching from making the turtle jump.
        ox = round(ANCHOR[0] - cx * scale)
        oy = round(ANCHOR[1] - cy * scale)

        out = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))

        # Paste with clipping support.
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

    specs = discover_standard_sheets(species)

    if not specs:
        print(f"[{species}] 找不到 v3 Sprite Sheet，略過")
        print(
            "請放置：reference/sheets/"
            f"{species}/actions_01_08_F.png ... actions_25_32_L.png"
        )
        return False

    out_dir.mkdir(parents=True, exist_ok=True)

    results: dict = {}
    report: list[str] = []

    for spec in specs:
        report.append(
            f"[{spec['view']}] {spec['file']}"
        )
        process_sheet(spec, results, report, out_dir)

    # Validate duplicates / missing views.
    expected = {
        f"{action}_{view}_{frame}"
        for action, _name in STANDARD_32
        for view in VIEWS
        for frame in range(1, 5)
    }

    actual = set(results)
    missing = sorted(expected - actual)

    view_counts = {
        view: sum(1 for x in results.values() if x["view"] == view)
        for view in VIEWS
    }

    meta = {
        "version": "3.0",
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
        "expectedFrames": len(STANDARD_32) * 4 * 4,
        "actualFrames": len(results),
        "viewCounts": view_counts,
        "missing": missing,
        "poses": results,
    }

    (out_dir / "poses.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    preview = PREVIEW_DIR / f"poses_preview_{species}_v3.png"

    if results:
        contact_sheet(results, preview)

    print(f"\n[{species}] v3")
    print("\n".join(report))
    print(
        f"\n輸出：{len(results)} / {meta['expectedFrames']} frames"
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

    # Index only species that have a v3 poses.json.
    ready_index = sorted(
        d.name
        for d in POSES_DIR.iterdir()
        if d.is_dir() and (d / "poses.json").exists()
    )

    (POSES_DIR / "index.json").write_text(
        json.dumps(
            {
                "version": "3.0",
                "species": ready_index,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"\n有 v3 姿勢圖的品種：{ready_index}")


if __name__ == "__main__":
    main()
