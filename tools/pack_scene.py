#!/usr/bin/env python3
"""把 ChatGPT 生的場景圖整理成遊戲用的貼圖：接縫處理、縮小、轉成 WebP。

輸入：reference/scene/<場景>/<名稱>.png（ChatGPT 的原圖）
輸出：assets/scene/<場景>/<名稱>.webp（遊戲讀這個）

ChatGPT 的圖左右（或上下）邊緣幾乎都接不起來，直接重複貼會看到明顯的線。
這裡把對邊的一段互相漸層混合，讓貼圖可以無縫重複：
- panorama：只處理左右（一圈重複 6 次）
- soil、grass：左右、上下都處理（在地面、剖面上一直重複）

用法（在專案根目錄）：
  python tools/pack_scene.py            處理所有場景
  python tools/pack_scene.py outdoor    只處理戶外池
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "reference" / "scene"
OUT = ROOT / "assets" / "scene"

# 名稱 → (輸出最大寬, 要無縫的方向, WebP 品質)
SPECS = {
    "panorama": (1536, "x", 82),
    "soil": (512, "xy", 85),
    "grass": (512, "xy", 85),
}
BLEND = 0.12  # 邊緣混合的寬度（佔整張的比例）


def seamless(arr: np.ndarray, axis: int) -> np.ndarray:
    """讓圖在某個方向可以無縫重複：把前後兩端各 BLEND 的部分漸層混合後接起來。

    做法是先把圖「捲」半圈，讓原本的接縫跑到中間，再把中間那段跟原本中間的內容
    交叉混合——等於用一段柔和的過渡取代生硬的接縫。
    """
    n = arr.shape[axis]
    w = max(8, int(n * BLEND))
    rolled = np.roll(arr, n // 2, axis=axis)  # 原本的接縫到了正中間
    mid = n // 2
    a = np.take(rolled, range(mid - w, mid + w), axis=axis).astype(np.float32)
    b = np.take(arr, range(mid - w, mid + w), axis=axis).astype(np.float32)
    t = np.linspace(0, 1, 2 * w, dtype=np.float32)
    t = 0.5 - 0.5 * np.cos(np.pi * t)            # 平滑的 0→1
    t = np.minimum(t, t[::-1]) * 2               # 兩端 0、中間 1：接縫處完全用另一張蓋掉
    shape = [1] * arr.ndim
    shape[axis] = 2 * w
    t = t.reshape(shape)
    mixed = a * (1 - t) + b * t
    out = rolled.astype(np.float32)
    idx = [slice(None)] * arr.ndim
    idx[axis] = slice(mid - w, mid + w)
    out[tuple(idx)] = mixed
    return np.roll(out, -(n // 2), axis=axis).clip(0, 255).astype(np.uint8)


def pack(scene: str) -> None:
    src_dir = SRC / scene
    out_dir = OUT / scene
    if not src_dir.is_dir():
        print(f"[{scene}] 找不到 {src_dir}，略過")
        return
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, (max_w, axes, quality) in SPECS.items():
        src = next((p for ext in ("png", "jpg", "jpeg", "webp") if (p := src_dir / f"{name}.{ext}").exists()), None)
        if not src:
            print(f"[{scene}] {name}：還沒有圖（放 {src_dir / (name + '.png')}），遊戲會用程式畫的替代圖")
            continue
        im = Image.open(src).convert("RGB")
        if im.width > max_w:
            im = im.resize((max_w, round(im.height * max_w / im.width)), Image.Resampling.LANCZOS)
        arr = np.array(im)
        if "x" in axes:
            arr = seamless(arr, axis=1)
        if "y" in axes:
            arr = seamless(arr, axis=0)
        dst = out_dir / f"{name}.webp"
        Image.fromarray(arr).save(dst, "WEBP", quality=quality, method=6)
        print(f"[{scene}] {name}：{src.name} {im.width}×{im.height} → {dst.relative_to(ROOT)}"
              f"（{dst.stat().st_size // 1024} KB）")


def main() -> None:
    scenes = sys.argv[1:] or sorted(p.name for p in SRC.iterdir() if p.is_dir()) if SRC.is_dir() else []
    if not scenes:
        print(f"{SRC} 裡還沒有任何場景圖")
    for scene in scenes:
        pack(scene)


if __name__ == "__main__":
    main()
