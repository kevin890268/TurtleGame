#!/usr/bin/env python3
"""開發用伺服器：跟 python -m http.server 一樣，但叫瀏覽器每次都確認檔案有沒有更新。

手機瀏覽器會把 js 暫存很久，程式更新後手機可能還在跑舊的，甚至新舊混在一起
而整個畫面壞掉。這裡對每個檔案加上 Cache-Control: no-cache：瀏覽器每次都會
問伺服器一下，檔案沒變就回 304，不會多花流量，但一改就一定拿到新的。

另外把 .js 的類型固定成 text/javascript：Windows 上 python 有時會從登錄檔讀到
錯的類型（text/plain），瀏覽器就會拒絕載入 ES module。

用法（在專案根目錄）：
  python tools/serve.py          預設 8123 埠，同一個 Wi-Fi 的手機也連得到
  python tools/serve.py 8124     指定埠號
"""
from __future__ import annotations

import functools
import http.server
import socket
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".json": "application/json",
        ".css": "text/css",
        ".webmanifest": "application/manifest+json",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def lan_ip() -> str | None:
    """這台電腦在區網的 IP（手機要連的位址）。"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("192.168.0.1", 80))  # 不會真的送出封包，只是讓系統選出對外的網卡
            return s.getsockname()[0]
    except OSError:
        return None


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    handler = functools.partial(NoCacheHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("0.0.0.0", port), handler)
    print(f"斑龜日記：http://localhost:{port}")
    ip = lan_ip()
    if ip:
        print(f"同一個 Wi-Fi 的手機：http://{ip}:{port}")
    print("手機畫面怪怪的：網址後面加 ?reset=1")
    print("按 Ctrl+C 停止")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
