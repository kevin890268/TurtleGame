#!/usr/bin/env python3
"""把姿勢圖四周的透明部分裁掉，並把裁切位置記進 poses.json。

每張姿勢圖原本都是 560×560，烏龜只佔中間一小塊，其他都是透明。
瀏覽器載入圖片時是照「整張的尺寸」解碼的，透明的地方也吃記憶體：
斑龜 368 張就要約 440 MB，iPhone 的 Safari 超過上限會直接把網頁關掉。
裁掉之後每張只剩烏龜本身的大小，記憶體少掉七、八成。

poses.json 裡每張圖會多一個 offset：[x, y]，是裁切後的圖在原本 560×560 畫布上的左上角，
遊戲畫圖時用它把圖放回原來的位置（錨點不變）。重複執行是安全的：offset 會累加。

用法（在專案根目錄）：
  python tools/crop_poses.py            處理所有品種
  python tools/crop_poses.py bangui     只處理斑龜
slice_poses_v4.py 切完圖會自動呼叫，平常不用自己跑。
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
POSES = ROOT / "assets" / "poses"
MARGIN = 2  # 裁切時四周留幾個像素，避免抗鋸齒的邊被切掉


def crop_dir(folder: Path) -> tuple[int, int, int]:
    """裁切一個品種資料夾，回傳（張數，裁切前總像素，裁切後總像素）。"""
    meta_path = folder / "poses.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    before = after = count = 0
    for key, info in meta["poses"].items():
        path = folder / info["file"]
        if not path.exists():
            continue
        im = Image.open(path).convert("RGBA")
        before += im.width * im.height
        box = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        if not box:
            after += im.width * im.height
            continue
        x0 = max(0, box[0] - MARGIN)
        y0 = max(0, box[1] - MARGIN)
        x1 = min(im.width, box[2] + MARGIN)
        y1 = min(im.height, box[3] + MARGIN)
        if (x0, y0, x1, y1) != (0, 0, im.width, im.height):
            im.crop((x0, y0, x1, y1)).save(path, optimize=True)
            ox, oy = info.get("offset", [0, 0])
            info["offset"] = [ox + x0, oy + y0]
        after += (x1 - x0) * (y1 - y0)
        count += 1
    meta["cropped"] = True
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return count, before, after


def main() -> None:
    names = sys.argv[1:] or sorted(d.name for d in POSES.iterdir() if (d / "poses.json").exists())
    for name in names:
        folder = POSES / name
        if not (folder / "poses.json").exists():
            print(f"[{name}] 沒有 poses.json，略過")
            continue
        n, b, a = crop_dir(folder)
        mb = lambda px: px * 4 / 1048576
        print(f"[{name}] {n} 張：解碼後約 {mb(b):.0f} MB → {mb(a):.0f} MB")


if __name__ == "__main__":
    main()
