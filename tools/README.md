# tools

需要 Python 3 與 numpy、scipy、Pillow。在專案根目錄執行。

| 工具 | 用途 |
|---|---|
| `serve.py` | **本機伺服器**。`python tools/serve.py`，會印出手機要連的網址；叫瀏覽器每次確認檔案有沒有更新，避免手機跑到舊版程式 |
| `slice_poses_v4.py` | **目前使用的切圖工具**。`python tools/slice_poses_v4.py bangui`。認得 v3 的 3 × 4 圖（正面／側面／背面）、舊的 4 × 4 圖、補視角圖（`back_01.png` 等），自動去背、對齊、鏡像補左側，輸出到 `assets/poses/<品種>/` |
| `crop_poses.py` | 裁掉姿勢圖四周的透明部分、把位置記進 poses.json（省記憶體，iPhone 才開得起來）。`slice_poses_v4.py` 切完會自動呼叫；舊品種的圖可以手動跑 `python tools/crop_poses.py` |
| `asset_status.py` | 依切圖結果產生根目錄的 `bangui_asset_status.md`（v3 動作的進度表）。切完圖後跑 |
| `make_actions_v3.py` | 產生斑龜 v3 動作提示詞 `gpt/actions/bangui_v3/`。要增減或修改動作，改這支再執行 |
| `pack_scene.py` | 把 ChatGPT 生的場景圖（`reference/scene/<場景>/`）處理接縫、縮小、轉 WebP，輸出到 `assets/scene/<場景>/` |
| `detect_views.py` | 除錯用：印出每張 sheet 每一列的視角判斷數值 |
| `slice_poses.py` | 舊版切圖工具，其他品種（麝香龜、錦龜…）的舊素材還是用它切的 |
| `archive/` | 更舊的版本，留著參考 |

新增或刪除 v3 動作時，`make_actions_v3.py` 的 `ACTIONS` 和 `slice_poses_v4.py` 的 `STANDARD_V3` 要一起改。
