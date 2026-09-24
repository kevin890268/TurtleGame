#!/usr/bin/env python3
"""依切圖結果產生 bangui_asset_status.md（專案根目錄）。

先跑 python tools/slice_poses_v4.py bangui，再跑這支。
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
META = ROOT / "assets/poses/bangui/poses.json"
OUT = ROOT / "bangui_asset_status.md"


def main() -> None:
    meta = json.loads(META.read_text(encoding="utf-8"))
    actions = meta["actionsV3"]

    def status(a: dict) -> str:
        if not a["views"]:
            return "**沒有圖**"
        own = a["key"] in a["sources"] and any(
            p["action"] == a["key"] and p["source"].endswith(f"_{a['key']}.png")
            and "/action_" in p["source"]
            for p in meta["poses"].values()
        )
        v3 = any(
            p["action"] == a["key"] and f"action_{a['id']:02d}_{a['key']}.png" in p["source"]
            for p in meta["poses"].values()
        )
        if v3:
            return "✅ v3 新圖"
        lack = [n for v, n in (("F", "正面"), ("B", "背面")) if v not in a["views"]]
        src = "用舊圖 " + "、".join(f"`{s}`" for s in a["sources"] if any(
            p["action"] == s for p in meta["poses"].values()))
        return src + ("，缺" + "／".join(lack) if lack else "")

    lines = [
        "# 斑龜素材狀態（v3 動作）",
        "",
        f"由 `tools/asset_status.py` 產生。目前切出 {meta['actualFrames']} 張。",
        "",
        "v3 規則：三視角（正面俯看 45°／側面朝右／背面俯看 45°），每個動作一張 3 × 4 的圖。",
        "左側由程式鏡像產生，不用畫。動作清單與提示詞：`gpt/actions/bangui_v3/`。",
        "",
        "還沒有 v3 新圖的動作，遊戲會先用舊圖代替（下表「用舊圖」），所以不會缺畫面；",
        "但舊圖的正面／背面是舊的平視角度，跟 v3 的俯看 45° 不一樣，最終都要換成新圖。",
        "",
    ]
    for ctx, title in (("land", "水上"), ("water", "水下")):
        rows = [a for a in actions if a["context"] == ctx]
        lines += [f"## {title}（{len(rows)}）", "",
                  "| # | 動作 | 說明 | 現有視角 | 狀態 |", "|---:|---|---|---|---|"]
        for a in rows:
            lines.append(f"| {a['id']:02d} | `{a['key']}` | {a['name']} | "
                         f"{''.join(a['views']) or '—'} | {status(a)} |")
        lines.append("")
    done = sum(status(a).startswith("✅") for a in actions)
    none = sum(not a["views"] for a in actions)
    lines += [f"**進度：{done} / {len(actions)} 個動作有 v3 新圖；{none} 個完全沒有圖。**", ""]
    todo = [f"{a['id']:02d} `{a['key']}`（{a['name']}）" for a in actions if not status(a).startswith("✅")]
    if todo:
        lines += ["還要生成：" + "、".join(todo), ""]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"寫入 {OUT}（v3 新圖 {done}／{len(actions)}，沒圖 {none}）")


if __name__ == "__main__":
    main()
